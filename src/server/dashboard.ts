import './only-server';
import type { IncomingMessage } from 'node:http';
import { getDatabase } from './db';
import { digest, getCookie, SESSION_COOKIE } from './auth';
import { assertAdmin } from './catalog';
import type { SessionUser } from '@/types/auth';
import type { AccountRecord, OwnSession, Profile, Stats } from '@/pages/dashboard/types';

export async function ownProfile(user: SessionUser): Promise<Profile> {
  const row = (await getDatabase().query<Profile>(`SELECT u.id,u.name,u.email,u.role,u.created_at::text AS "createdAt",
    u.email_verified AS "emailVerified",u.password_hash IS NOT NULL AS "hasPassword",
    EXISTS(SELECT 1 FROM oauth_accounts a WHERE a.user_id=u.id AND a.provider='google') AS "googleLinked"
    FROM users u WHERE u.id=$1`, [user.id])).rows[0];
  return { ...row, createdAt: new Date(row.createdAt).toISOString() };
}
export async function ownSessions(user: SessionUser, req: Pick<IncomingMessage, 'headers'>): Promise<OwnSession[]> {
  const token = getCookie(req, SESSION_COOKIE);
  return (await getDatabase().query<OwnSession>(`SELECT created_at::text AS "createdAt",expires_at::text AS "expiresAt",token_hash=$2 AS current
    FROM sessions WHERE user_id=$1 AND expires_at>now() ORDER BY created_at DESC`, [user.id, token ? digest(token) : ''])).rows.map((row) => ({ ...row, createdAt: new Date(row.createdAt).toISOString(), expiresAt: new Date(row.expiresAt).toISOString() }));
}
export async function dashboardStats(user: SessionUser): Promise<Stats> {
  assertAdmin(user);
  return (await getDatabase().query<Stats>(`SELECT (SELECT count(*)::int FROM catalog_products) AS products,
    (SELECT count(*)::int FROM catalog_products WHERE active AND archived_at IS NULL) AS visible,(SELECT count(*)::int FROM users) AS accounts,
    (SELECT count(*)::int FROM catalog_products WHERE active AND archived_at IS NULL AND stock=0) AS "outOfStock"`)).rows[0];
}
export async function accountList(user: SessionUser): Promise<AccountRecord[]> {
  assertAdmin(user);
  return (await getDatabase().query<AccountRecord>(`SELECT u.id,u.name,u.email,u.role,u.created_at::text AS "createdAt",
    EXISTS(SELECT 1 FROM oauth_accounts a WHERE a.user_id=u.id AND a.provider='google') AS "googleLinked" FROM users u ORDER BY u.created_at DESC LIMIT 200`)).rows.map((row) => ({ ...row, createdAt: new Date(row.createdAt).toISOString() }));
}
