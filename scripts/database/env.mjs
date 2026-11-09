import nextEnv from '@next/env';
import pg from 'pg';

nextEnv.loadEnvConfig(process.cwd());
export function databaseURL() {
  if (!process.env.DATABASE_URL) throw new Error('Configura DATABASE_URL en .env.local.');
  const url = new URL(process.env.DATABASE_URL);
  if (!['postgres:', 'postgresql:'].includes(url.protocol) || url.pathname !== '/petshop') {
    throw new Error('DATABASE_URL debe apuntar a una base PostgreSQL llamada petshop.');
  }
  return url;
}
export function databaseClient() {
  return new pg.Client({ connectionString: databaseURL().toString(), connectionTimeoutMillis: 5000 });
}
