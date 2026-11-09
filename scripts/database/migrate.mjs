import { readdir, readFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { databaseClient } from './env.mjs';

const client = databaseClient();
try {
  await client.connect();
  await client.query('SELECT pg_advisory_lock(741802)');
  await client.query(`CREATE TABLE IF NOT EXISTS schema_migrations (
    name text PRIMARY KEY, checksum char(64) NOT NULL, applied_at timestamptz NOT NULL DEFAULT now()
  )`);
  const directory = new URL('../../database/migrations/', import.meta.url);
  const files = (await readdir(directory)).filter((file) => /^\d+_[a-z0-9_]+\.sql$/.test(file)).sort();
  for (const file of files) {
    const sql = await readFile(new URL(file, directory), 'utf8');
    const checksum = createHash('sha256').update(sql).digest('hex');
    const applied = await client.query('SELECT checksum FROM schema_migrations WHERE name = $1', [file]);
    if (applied.rowCount) {
      if (applied.rows[0].checksum !== checksum) throw new Error(`La migración aplicada ${file} cambió. Crea una nueva migración.`);
      console.log(`${file}: ya aplicada.`);
      continue;
    }
    await client.query('BEGIN');
    try {
      await client.query(sql);
      await client.query('INSERT INTO schema_migrations(name, checksum) VALUES ($1, $2)', [file, checksum]);
      await client.query('COMMIT');
      console.log(`${file}: aplicada.`);
    } catch (error) { await client.query('ROLLBACK'); throw error; }
  }
} finally {
  await client.query('SELECT pg_advisory_unlock(741802)').catch(() => {});
  await client.end();
}
