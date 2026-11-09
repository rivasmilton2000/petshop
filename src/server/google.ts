import './only-server';
import { randomUUID, createHash } from 'node:crypto';
import { createRemoteJWKSet, jwtVerify, type JWTVerifyGetKey } from 'jose';
import { getDatabase } from './db';
import { appOrigin, digest, randomToken, getCookie, OAUTH_COOKIE } from './auth';
import { emailValue, HttpError } from './api';
import type { SessionUser } from '../types/auth';
import type { NextApiRequest } from 'next';

const googleKeys = createRemoteJWKSet(new URL('https://www.googleapis.com/oauth2/v3/certs'));
export const googleAvailable = () => Boolean(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET);
export function googleConfig() {
  if (!googleAvailable()) throw new HttpError(503, 'Google todavía no está configurado.');
  return { clientId: process.env.GOOGLE_CLIENT_ID!, clientSecret: process.env.GOOGLE_CLIENT_SECRET!, callback: `${appOrigin()}/api/auth/google/callback` };
}
export async function startGoogleFlow(userId: string | null) {
  const config = googleConfig();
  const state = randomToken();
  const browser = randomToken();
  const nonce = randomToken();
  const verifier = randomToken();
  await getDatabase().query('DELETE FROM oauth_flows WHERE expires_at <= now()');
  await getDatabase().query(`INSERT INTO oauth_flows(state_hash, browser_hash, nonce, code_verifier, user_id, expires_at)
    VALUES ($1, $2, $3, $4, $5, now() + interval '10 minutes')`, [digest(state), digest(browser), nonce, verifier, userId]);
  const url = new URL('https://accounts.google.com/o/oauth2/v2/auth');
  url.search = new URLSearchParams({
    client_id: config.clientId, redirect_uri: config.callback, response_type: 'code', scope: 'openid email profile',
    state, nonce, code_challenge: createHash('sha256').update(verifier).digest('base64url'), code_challenge_method: 'S256', prompt: 'select_account',
  }).toString();
  return { url: url.toString(), browser };
}
export async function consumeGoogleFlow(req: NextApiRequest) {
  const state = typeof req.query.state === 'string' && /^[A-Za-z0-9_-]{43}$/.test(req.query.state) ? req.query.state : null;
  const browser = getCookie(req, OAUTH_COOKIE);
  if (!state || !browser) throw new HttpError(400, 'Flujo de Google inválido o vencido.');
  const result = await getDatabase().query<{ nonce: string; code_verifier: string; user_id: string | null }>(`DELETE FROM oauth_flows
    WHERE state_hash = $1 AND browser_hash = $2 AND expires_at > now() RETURNING nonce, code_verifier, user_id`, [digest(state), digest(browser)]);
  if (!result.rowCount) throw new HttpError(400, 'Flujo de Google inválido o vencido.');
  return result.rows[0];
}
export type GoogleIdentity = { subject: string; email: string; name: string };
export async function verifyGoogleToken(token: string, nonce: string, audience: string, keys: JWTVerifyGetKey = googleKeys): Promise<GoogleIdentity> {
  const { payload } = await jwtVerify(token, keys, {
    issuer: ['https://accounts.google.com', 'accounts.google.com'], audience, algorithms: ['RS256'], maxTokenAge: '1h', clockTolerance: 5, requiredClaims: ['exp', 'iat', 'sub', 'nonce', 'email', 'email_verified'],
  });
  const email = emailValue(payload.email);
  if (payload.nonce !== nonce || payload.email_verified !== true || !email || !payload.sub || payload.sub.length > 255 || (payload.azp !== undefined && payload.azp !== audience) || (Array.isArray(payload.aud) && payload.aud.length > 1 && payload.azp !== audience)) throw new HttpError(400, 'La identidad de Google no es válida.');
  const rawName = typeof payload.name === 'string' ? payload.name.trim().slice(0, 80) : '';
  return { subject: payload.sub, email, name: rawName.length >= 2 ? rawName : 'Mi cuenta' };
}
export async function exchangeGoogleCode(code: string, verifier: string, nonce: string) {
  const config = googleConfig();
  const response = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ code, client_id: config.clientId, client_secret: config.clientSecret, redirect_uri: config.callback, grant_type: 'authorization_code', code_verifier: verifier }),
    signal: AbortSignal.timeout(10000),
  });
  if (!response.ok) throw new HttpError(400, 'No se pudo verificar la respuesta de Google.');
  const data: unknown = await response.json();
  if (!data || typeof data !== 'object' || !('id_token' in data) || typeof data.id_token !== 'string') throw new HttpError(400, 'Respuesta de Google inválida.');
  return verifyGoogleToken(data.id_token, nonce, config.clientId);
}
export async function googleUser(identity: GoogleIdentity, linkUserId: string | null): Promise<SessionUser> {
  const client = await getDatabase().connect();
  try {
    await client.query('BEGIN');
    // Serializa creaciones/vinculaciones del mismo correo sin alterar su rol.
    await client.query('SELECT pg_advisory_xact_lock(hashtextextended($1, 0))', [identity.email]);
    const linked = await client.query<SessionUser>(`SELECT u.id, u.email, u.name, u.role FROM oauth_accounts a JOIN users u ON u.id = a.user_id
      WHERE a.provider = 'google' AND a.subject = $1`, [identity.subject]);
    if (linked.rowCount) {
      if (linkUserId && linked.rows[0].id !== linkUserId) throw new HttpError(409, 'Esa cuenta de Google ya está vinculada a otra cuenta.');
      await client.query('COMMIT'); return linked.rows[0];
    }
    const existing = await client.query<SessionUser>('SELECT id, email, name, role FROM users WHERE email = $1', [identity.email]);
    let user = existing.rows[0];
    if (linkUserId && (!user || user.id !== linkUserId)) throw new HttpError(409, 'Usa una cuenta de Google con el mismo correo de tu cuenta.');
    if (user && user.id !== linkUserId) throw new HttpError(409, 'Inicia sesión con tu contraseña y vincula Google desde Mi cuenta.');
    if (!user) {
      const created = await client.query<SessionUser>(`INSERT INTO users (id, email, name, role, email_verified)
        VALUES ($1, $2, $3, 'usuario', true) RETURNING id, email, name, role`, [randomUUID(), identity.email, identity.name]);
      user = created.rows[0];
    }
    await client.query("INSERT INTO oauth_accounts(provider, subject, user_id) VALUES ('google', $1, $2)", [identity.subject, user.id]);
    await client.query('UPDATE users SET email_verified = true, updated_at = now() WHERE id = $1', [user.id]);
    await client.query('COMMIT');
    return user;
  } catch (error) { await client.query('ROLLBACK'); throw error; }
  finally { client.release(); }
}
