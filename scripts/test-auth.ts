import './database/env.mjs';
import assert from 'node:assert/strict';
import { promisify } from 'node:util';
import { execFile as execFileCallback } from 'node:child_process';
import { randomUUID } from 'node:crypto';
import { mkdir, writeFile, readdir, readFile } from 'node:fs/promises';
import { request, chromium, expect } from '@playwright/test';
import { SignJWT, generateKeyPair, exportJWK, createLocalJWKSet } from 'jose';
import { getDatabase } from '../src/server/db';
import { verifyPassword } from '../src/server/password';
import { digest, consumeRateLimit } from '../src/server/auth';
import { googleUser, verifyGoogleToken, startGoogleFlow, consumeGoogleFlow } from '../src/server/google';
import type { NextApiRequest } from 'next';

const execFile = promisify(execFileCallback);
const baseURL = process.env.TEST_BASE_URL ?? process.env.APP_URL ?? 'http://localhost:3000';
const origin = new URL(process.env.APP_URL!).origin;
const pool = getDatabase();
const run = randomUUID();
const password = `Prueba-${randomUUID()}!`;
const emails = [`e2e-${run}@example.test`, `google-${run}@example.test`, `ui-${run}@example.test`];
const flows: string[] = [];
const checks: string[] = [];
const contexts: Awaited<ReturnType<typeof request.newContext>>[] = [];
const browser = await chromium.launch({ headless: true });
await mkdir('artifacts', { recursive: true });
const context = async () => { const api = await request.newContext({ baseURL }); contexts.push(api); return api; };
const post = (api: Awaited<ReturnType<typeof context>>, route: string, data: unknown, headers: Record<string, string> = {}) => api.post(route, { data, headers: { Origin: origin, ...headers } });
try {
  assert.equal((await pool.query('SELECT current_database() AS name')).rows[0].name, 'petshop');
  const seedBefore = (await pool.query('SELECT id, role, seed_key FROM users WHERE seed_key IS NOT NULL ORDER BY seed_key')).rows;
  for (let index = 0; index < 2; index++) {
    await execFile(process.execPath, ['scripts/database/migrate.mjs']);
    await execFile(process.execPath, ['--import', 'tsx', 'scripts/database/seed.ts']);
  }
  assert.deepEqual((await pool.query('SELECT id, role, seed_key FROM users WHERE seed_key IS NOT NULL ORDER BY seed_key')).rows, seedBefore);
  assert.equal(seedBefore.length, 2);
  assert.equal((await pool.query('SELECT count(*)::int AS n FROM schema_migrations')).rows[0].n, 2);
  assert.equal((await pool.query(`SELECT count(*)::int AS n FROM users u LEFT JOIN roles r ON r.name=u.role WHERE r.name IS NULL`)).rows[0].n, 0);
  await assert.rejects(pool.query("INSERT INTO oauth_accounts(provider, subject, user_id) VALUES ('google', $1, $2)", [`missing-${run}`, randomUUID()]), (error: unknown) => (error as { code: string }).code === '23503');
  checks.push('Conexión petshop; migración y seed ejecutados dos veces sin duplicar usuarios ni cambiar IDs; claves foráneas validadas.');

  const anonymous = await context();
  assert.equal((await anonymous.get('/api/auth/admin')).status(), 401);
  assert.equal((await anonymous.get('/login/account', { maxRedirects: 0 })).status(), 307);
  assert.equal((await anonymous.get('/dashboard', { maxRedirects: 0 })).status(), 307);
  assert.equal((await anonymous.get('/api/auth/logout')).status(), 405);
  assert.equal((await anonymous.post('/api/auth/register', { data: {} })).status(), 403);
  assert.equal((await post(anonymous, '/api/auth/register', {}, { Origin: 'https://otro.example' })).status(), 403);
  const malicious = await post(anonymous, '/api/auth/register', { name: 'Prueba pública', email: emails[0], password, role: 'administrador' });
  assert.equal(malicious.status(), 400);
  assert.equal((await pool.query('SELECT count(*)::int AS n FROM users WHERE email=$1', [emails[0]])).rows[0].n, 0);
  assert.equal((await post(anonymous, '/api/auth/register', { name: 'Prueba', email: emails[0], password: 'corta' })).status(), 400);
  const registered = await post(anonymous, '/api/auth/register', { name: 'Prueba pública', email: emails[0].toUpperCase(), password });
  assert.equal(registered.status(), 201);
  const publicUser = (await registered.json()).user;
  assert.equal(publicUser.role, 'usuario');
  assert.equal(publicUser.email, emails[0]);
  assert.equal(publicUser.password_hash, undefined);
  const account = (await pool.query('SELECT password_hash, role FROM users WHERE id=$1', [publicUser.id])).rows[0];
  assert.match(account.password_hash, /^\$argon2id\$/);
  assert.equal(await verifyPassword(account.password_hash, password), true);
  assert.equal(await verifyPassword(account.password_hash, 'contraseña-incorrecta'), false);
  const cookie = (await anonymous.storageState()).cookies.find((item) => item.name === 'petshop_session')!;
  assert.equal(cookie.httpOnly, true);
  assert.equal(cookie.sameSite, 'Lax');
  assert.equal(cookie.secure, origin.startsWith('https:'));
  assert.equal((await pool.query('SELECT count(*)::int AS n FROM sessions WHERE token_hash=$1', [digest(cookie.value)])).rows[0].n, 1);
  assert.equal((await pool.query('SELECT count(*)::int AS n FROM sessions WHERE token_hash=$1', [cookie.value])).rows[0].n, 0);
  assert.equal((await anonymous.get('/api/auth/admin', { headers: { Cookie: `petshop_session=${cookie.value}; role=administrador` } })).status(), 403);
  assert.equal((await anonymous.get('/dashboard')).status(), 200);
  assert.equal((await anonymous.get('/dashboard?section=catalog')).status(), 403);
  assert.equal((await post(anonymous, '/api/auth/register', { name: 'Duplicado', email: emails[0], password })).status(), 409);
  checks.push('Registro público, normalización de correo, duplicados y Argon2id; rol administrador rechazado; cookie HttpOnly/SameSite y token almacenado solo como hash.');

  assert.equal((await post(anonymous, '/api/auth/login', { email: emails[0], password: 'contraseña-incorrecta' })).status(), 401);
  const logged = await post(anonymous, '/api/auth/login', { email: emails[0], password, role: 'administrador' });
  assert.equal(logged.status(), 200);
  assert.equal((await logged.json()).user.role, 'usuario');
  const cookie2 = (await anonymous.storageState()).cookies.find((item) => item.name === 'petshop_session')!;
  assert.notEqual(cookie2.value, cookie.value);
  const replay = await context();
  assert.equal((await (await replay.get('/api/auth/session', { headers: { Cookie: `petshop_session=${cookie.value}` } })).json()).user, null);
  // La autorización relee PostgreSQL en cada petición, incluso con la misma cookie.
  await pool.query("UPDATE users SET role='administrador' WHERE id=$1", [publicUser.id]);
  assert.equal((await anonymous.get('/api/auth/admin')).status(), 200);
  await pool.query("UPDATE users SET role='usuario' WHERE id=$1", [publicUser.id]);
  assert.equal((await anonymous.get('/api/auth/admin')).status(), 403);
  assert.equal((await post(anonymous, '/api/auth/logout', {})).status(), 200);
  assert.equal((await (await anonymous.get('/api/auth/session')).json()).user, null);
  assert.equal((await (await replay.get('/api/auth/session', { headers: { Cookie: `petshop_session=${cookie2.value}` } })).json()).user, null);
  const expires = await context();
  assert.equal((await post(expires, '/api/auth/login', { email: emails[0], password })).status(), 200);
  const expiryCookie = (await expires.storageState()).cookies.find((item) => item.name === 'petshop_session')!;
  await pool.query("UPDATE sessions SET created_at=now()-interval '2 days', expires_at=now()-interval '1 day' WHERE token_hash=$1", [digest(expiryCookie.value)]);
  assert.equal((await (await expires.get('/api/auth/session')).json()).user, null);
  assert.equal((await expires.get('/api/auth/admin')).status(), 401);
  checks.push('Inicio y cierre de sesión; rotación, revocación, caducidad y rechazo de cookies antiguas; autorización con el rol actual de PostgreSQL.');

  for (const [role, email, secret] of [
    ['usuario', process.env.SEED_USER_EMAIL!, process.env.SEED_USER_PASSWORD!],
    ['administrador', process.env.SEED_ADMIN_EMAIL!, process.env.SEED_ADMIN_PASSWORD!],
  ]) {
    const seeded = await context();
    const result = await post(seeded, '/api/auth/login', { email, password: secret });
    assert.equal(result.status(), 200);
    assert.equal((await result.json()).user.role, role);
    assert.equal((await seeded.get('/api/auth/admin')).status(), role === 'administrador' ? 200 : 403);
    assert.equal((await seeded.get('/dashboard')).status(), 200);
    assert.equal((await seeded.get('/dashboard?section=catalog')).status(), role === 'administrador' ? 200 : 403);
    assert.equal((await post(seeded, '/api/auth/logout', {})).status(), 200);
  }
  const limitKey = `test-limit:${run}`;
  assert.equal(await consumeRateLimit(limitKey, 2, 60), true);
  assert.equal(await consumeRateLimit(limitKey, 2, 60), true);
  assert.equal(await consumeRateLimit(limitKey, 2, 60), false);
  await pool.query('DELETE FROM auth_rate_limits WHERE key_hash=$1', [digest(limitKey)]);
  checks.push('Cuentas seed usuario y administrador probadas; usuario recibe 403 en página y API administrativas; límite de intentos compartido en PostgreSQL.');

  const identity = { subject: `test-google-${run}`, email: emails[1], name: 'Prueba Google' };
  const google = await googleUser(identity, null);
  assert.equal(google.role, 'usuario');
  assert.equal((await googleUser(identity, null)).id, google.id);
  await pool.query("UPDATE users SET role='administrador' WHERE id=$1", [google.id]);
  assert.equal((await googleUser(identity, null)).role, 'administrador');
  const localIdentity = { subject: `test-link-${run}`, email: emails[0], name: 'Cuenta existente' };
  await assert.rejects(googleUser(localIdentity, null));
  assert.equal((await googleUser(localIdentity, publicUser.id)).id, publicUser.id);
  assert.equal((await googleUser(localIdentity, publicUser.id)).role, 'usuario');
  await assert.rejects(googleUser(identity, publicUser.id));
  checks.push('Servicio Google probado con identidades de ensayo: altas siempre usuario; acceso repetido conserva ID/rol; vinculación por correo exige sesión de la cuenta existente.');

  const { privateKey, publicKey } = await generateKeyPair('RS256');
  const jwk = await exportJWK(publicKey); jwk.kid = 'local-test';
  const keys = createLocalJWKSet({ keys: [jwk] });
  const makeToken = (claims: Record<string, unknown> = {}, issuer = 'https://accounts.google.com', audience = 'local-client', expiry = '2m') => new SignJWT({ sub: identity.subject, email: identity.email, email_verified: true, name: identity.name, nonce: 'nonce-local', role: 'administrador', ...claims })
    .setProtectedHeader({ alg: 'RS256', kid: 'local-test' }).setIssuer(issuer).setAudience(audience).setIssuedAt().setExpirationTime(expiry).sign(privateKey);
  const token = await makeToken();
  assert.equal((await verifyGoogleToken(token, 'nonce-local', 'local-client', keys)).email, identity.email);
  await assert.rejects(verifyGoogleToken(token, 'nonce-incorrecto', 'local-client', keys));
  await assert.rejects(verifyGoogleToken(token, 'nonce-local', 'otro-cliente', keys));
  await assert.rejects(verifyGoogleToken(await makeToken({ email_verified: false }), 'nonce-local', 'local-client', keys));
  await assert.rejects(verifyGoogleToken(await makeToken({}, 'https://falso.example'), 'nonce-local', 'local-client', keys));
  await assert.rejects(verifyGoogleToken(await makeToken({}, undefined, undefined, '-1m'), 'nonce-local', 'local-client', keys));
  const other = await generateKeyPair('RS256'); const otherJwk = await exportJWK(other.publicKey); otherJwk.kid = 'local-test';
  await assert.rejects(verifyGoogleToken(token, 'nonce-local', 'local-client', createLocalJWKSet({ keys: [otherJwk] })));
  checks.push('ID tokens de ensayo: firma RS256, emisor, audiencia, expiración, nonce y correo verificado; casos inválidos rechazados. No es una prueba con Google real.');

  const configuredGoogle = Boolean(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET);
  const savedId = process.env.GOOGLE_CLIENT_ID; const savedSecret = process.env.GOOGLE_CLIENT_SECRET;
  process.env.GOOGLE_CLIENT_ID = 'local-client'; process.env.GOOGLE_CLIENT_SECRET = 'local-test-only';
  try {
    const flow = await startGoogleFlow(null);
    const url = new URL(flow.url); const state = url.searchParams.get('state')!; flows.push(digest(state));
    assert.equal(url.origin, 'https://accounts.google.com');
    assert.equal(url.searchParams.get('redirect_uri'), `${origin}/api/auth/google/callback`);
    assert.equal(url.searchParams.get('code_challenge_method'), 'S256');
    const wrongReq = { query: { state }, headers: { cookie: `petshop_oauth=${'x'.repeat(43)}` } } as unknown as NextApiRequest;
    await assert.rejects(consumeGoogleFlow(wrongReq));
    const rightReq = { query: { state }, headers: { cookie: `petshop_oauth=${flow.browser}` } } as unknown as NextApiRequest;
    assert.equal((await consumeGoogleFlow(rightReq)).nonce, url.searchParams.get('nonce'));
    await assert.rejects(consumeGoogleFlow(rightReq));
    const expired = await startGoogleFlow(null); const expiredState = new URL(expired.url).searchParams.get('state')!; flows.push(digest(expiredState));
    await pool.query("UPDATE oauth_flows SET expires_at=now()-interval '1 minute' WHERE state_hash=$1", [digest(expiredState)]);
    await assert.rejects(consumeGoogleFlow({ query: { state: expiredState }, headers: { cookie: `petshop_oauth=${expired.browser}` } } as unknown as NextApiRequest));
  } finally {
    if (savedId === undefined) delete process.env.GOOGLE_CLIENT_ID; else process.env.GOOGLE_CLIENT_ID = savedId;
    if (savedSecret === undefined) delete process.env.GOOGLE_CLIENT_SECRET; else process.env.GOOGLE_CLIENT_SECRET = savedSecret;
  }
  const callback = await anonymous.get(`/api/auth/google/callback?state=${'x'.repeat(43)}&code=falso`, { maxRedirects: 0 });
  assert.equal(callback.status(), 303);
  assert.match(callback.headers().location, /google_invalid/);
  if (!configuredGoogle) {
    const start = await anonymous.get('/api/auth/google', { maxRedirects: 0 });
    assert.equal(start.status(), 303); assert.match(start.headers().location, /google_unavailable/);
  }
  checks.push('State vinculado al navegador y de un solo uso, caducidad y PKCE; callback falsificado rechazado.');

  for (const width of [1440, 390, 320]) {
    const browserContext = await browser.newContext({ viewport: { width, height: 900 }, baseURL, reducedMotion: 'reduce' });
    const page = await browserContext.newPage();
    const errors: string[] = [];
    page.on('pageerror', (error) => errors.push(error.message));
    for (const route of ['/login', '/login/register']) {
      assert.equal((await page.goto(route))!.status(), 200);
      await page.evaluate(() => document.fonts.ready);
      await expect(page.locator('h1')).toBeVisible();
      await expect(page.getByRole('link', { name: route === '/login' ? 'Iniciar sesión con Google' : 'Registrarse con Google', exact: true })).toHaveAttribute('href', '/api/auth/google');
      assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false);
      const broken = await page.locator('img').evaluateAll((images) => images.filter((img) => !img.complete || !img.naturalWidth).length);
      assert.equal(broken, 0);
      await page.screenshot({ path: `artifacts/auth-${width}-${route.endsWith('register') ? 'register' : 'login'}.png`, fullPage: true });
    }
    if (width === 390) {
      await page.getByLabel('Nombre', { exact: true }).fill('Prueba visual');
      await page.getByLabel('Correo electrónico', { exact: true }).fill(emails[2]);
      await page.getByLabel('Contraseña', { exact: true }).fill(password);
      await page.getByLabel('Confirmar contraseña', { exact: true }).fill(`${password}otro`);
      await page.getByRole('button', { name: 'Crear mi cuenta', exact: true }).click();
      await expect(page.locator('.auth-card [role="alert"]')).toHaveText('Las contraseñas no coinciden.');
      await page.getByLabel('Confirmar contraseña', { exact: true }).fill(password);
      await page.getByRole('button', { name: 'Crear mi cuenta', exact: true }).click();
      await expect(page).toHaveURL(/\/dashboard$/);
      await expect(page.locator('header')).toContainText('Usuario');
      await page.getByRole('button', { name: 'Cerrar sesión', exact: true }).click();
      await expect(page).toHaveURL(/\/login$/);
      assert.equal(await page.evaluate(() => document.cookie.includes('petshop_session')), false);
    }
    const admin = width === 1440;
    await page.goto('/login');
    await page.getByLabel('Correo electrónico', { exact: true }).fill(admin ? process.env.SEED_ADMIN_EMAIL! : process.env.SEED_USER_EMAIL!);
    await page.getByLabel('Contraseña', { exact: true }).fill(admin ? process.env.SEED_ADMIN_PASSWORD! : process.env.SEED_USER_PASSWORD!);
    await page.getByRole('button', { name: 'Entrar', exact: true }).click();
    await expect(page).toHaveURL(/\/dashboard$/);
    await expect(page.locator('header')).toContainText(admin ? 'Administrador' : 'Usuario');
    await page.getByRole('button', { name: 'Cerrar sesión', exact: true }).click();
    await expect(page).toHaveURL(/\/login$/);
    assert.deepEqual(errors, []);
    await browserContext.close();
  }
  checks.push('UI 1440/390/320 px: inicio y registro con marca, enlaces Google compartidos, registro real, validación de confirmación, ambos roles y cierre de sesión sin errores JS.');

  const chunks = await readdir('.next/static/chunks', { recursive: true });
  const secrets = [process.env.DATABASE_URL!, process.env.SEED_USER_PASSWORD!, process.env.SEED_ADMIN_PASSWORD!, process.env.GOOGLE_CLIENT_SECRET].filter(Boolean) as string[];
  for (const file of chunks.filter((file) => String(file).endsWith('.js'))) {
    const content = await readFile(`.next/static/chunks/${file}`, 'utf8');
    for (const secret of secrets) assert.equal(content.includes(secret), false, 'Un secreto apareció en el bundle público.');
    assert.equal(content.includes('password_hash'), false, 'Código de credenciales apareció en el bundle público.');
  }
  checks.push('Bundles públicos revisados: sin credenciales de base de datos, seed, secretos Google ni código de hashes.');
  const pending = configuredGoogle ? 'Completar prueba manual con una cuenta real de Google y su consentimiento.' : 'Faltan GOOGLE_CLIENT_ID y GOOGLE_CLIENT_SECRET: no se verificó consentimiento, intercambio ni callback contra Google real.';
  await writeFile('artifacts/auth-verification.json', JSON.stringify({ checks, pending }, null, 2));
  console.log(checks.join('\n'));
  console.log(`Pendiente: ${pending}`);
} finally {
  await browser.close();
  for (const api of contexts) await api.dispose();
  await pool.query('DELETE FROM users WHERE email = ANY($1::text[]) AND seed_key IS NULL', [emails]);
  await pool.query('DELETE FROM oauth_flows WHERE state_hash = ANY($1::text[])', [flows]);
  await pool.end();
}
