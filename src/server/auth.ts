import './only-server';
import { createHash, randomBytes } from 'node:crypto';
import type { IncomingMessage, ServerResponse } from 'node:http';
import { getDatabase } from './db';
import type { SessionUser } from '../types/auth';

export const SESSION_COOKIE = 'petshop_session';
export const OAUTH_COOKIE = 'petshop_oauth';
const SESSION_SECONDS = 60 * 60 * 24 * 7;
export const digest = (value: string) => createHash('sha256').update(value).digest('hex');
export const randomToken = () => randomBytes(32).toString('base64url');

export function appOrigin() {
  if (!process.env.APP_URL) throw new Error('Falta APP_URL en el servidor.');
  const url = new URL(process.env.APP_URL);
  if (!['http:', 'https:'].includes(url.protocol) || url.username || url.password || url.pathname !== '/' || url.search || url.hash) throw new Error('APP_URL debe ser un origen HTTP o HTTPS sin ruta.');
  if (url.protocol !== 'https:' && !['localhost', '127.0.0.1', '[::1]'].includes(url.hostname)) throw new Error('Usa HTTPS fuera del entorno local.');
  return url.origin;
}
export function isAllowedMutationOrigin(origin: unknown): origin is string {
  const canonical = new URL(appOrigin());
  const allowed = new Set([canonical.origin]);
  const loopbackHosts = ['localhost', '127.0.0.1', '[::1]'];
  // Los alias locales comparten protocolo y puerto. No confiar en Host ni en
  // X-Forwarded-Host, ni admitir otros puertos, subdominios o direcciones de red.
  if (loopbackHosts.includes(canonical.hostname)) {
    for (const hostname of loopbackHosts) {
      const alias = new URL(canonical);
      alias.hostname = hostname;
      allowed.add(alias.origin);
    }
  }
  return typeof origin === 'string' && allowed.has(origin);
}
export function getCookie(req: Pick<IncomingMessage, 'headers'>, name: string) {
  const value = (req.headers.cookie ?? '').split(';').map((part) => part.trim()).find((part) => part.startsWith(`${name}=`))?.slice(name.length + 1);
  return value && /^[A-Za-z0-9_-]{43}$/.test(value) ? value : null;
}
export function setCookie(res: ServerResponse, name: string, value: string, maxAge: number, path = '/') {
  const secure = appOrigin().startsWith('https:') ? '; Secure' : '';
  const cookie = `${name}=${value}; HttpOnly; SameSite=Lax; Path=${path}; Max-Age=${maxAge}${secure}`;
  const existing = res.getHeader('Set-Cookie');
  res.setHeader('Set-Cookie', [...(Array.isArray(existing) ? existing : existing ? [String(existing)] : []), cookie]);
}
export async function getSessionUser(req: Pick<IncomingMessage, 'headers'>): Promise<SessionUser | null> {
  const token = getCookie(req, SESSION_COOKIE);
  if (!token) return null;
  const result = await getDatabase().query<SessionUser>(`SELECT u.id, u.email, u.name, u.role FROM sessions s
    JOIN users u ON u.id = s.user_id WHERE s.token_hash = $1 AND s.expires_at > now()`, [digest(token)]);
  return result.rows[0] ?? null;
}
export async function createSession(req: Pick<IncomingMessage, 'headers'>, res: ServerResponse, userId: string) {
  const token = randomToken();
  const previous = getCookie(req, SESSION_COOKIE);
  const client = await getDatabase().connect();
  try {
    await client.query('BEGIN');
    await client.query('DELETE FROM sessions WHERE expires_at <= now() OR token_hash = $1', [previous ? digest(previous) : '']);
    await client.query(`INSERT INTO sessions(token_hash, user_id, expires_at) VALUES ($1, $2, now() + interval '7 days')`, [digest(token), userId]);
    await client.query('COMMIT');
  } catch (error) { await client.query('ROLLBACK'); throw error; }
  finally { client.release(); }
  setCookie(res, SESSION_COOKIE, token, SESSION_SECONDS);
}
export async function destroySession(req: Pick<IncomingMessage, 'headers'>, res: ServerResponse) {
  const token = getCookie(req, SESSION_COOKIE);
  if (token) await getDatabase().query('DELETE FROM sessions WHERE token_hash = $1', [digest(token)]);
  setCookie(res, SESSION_COOKIE, '', 0);
}
export async function consumeRateLimit(key: string, limit: number, seconds: number) {
  const result = await getDatabase().query<{ attempts: number }>(`INSERT INTO auth_rate_limits(key_hash, attempts, expires_at)
    VALUES ($1, 1, now() + $2 * interval '1 second')
    ON CONFLICT (key_hash) DO UPDATE SET
      attempts = CASE WHEN auth_rate_limits.expires_at <= now() THEN 1 ELSE auth_rate_limits.attempts + 1 END,
      expires_at = CASE WHEN auth_rate_limits.expires_at <= now() THEN EXCLUDED.expires_at ELSE auth_rate_limits.expires_at END
    RETURNING attempts`, [digest(key), seconds]);
  return result.rows[0].attempts <= limit;
}
