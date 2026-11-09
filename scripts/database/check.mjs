import { databaseClient } from './env.mjs';

const client = databaseClient();
try {
  await client.connect();
  const result = await client.query('SELECT current_database() AS database, current_user AS username, inet_server_addr() AS host, inet_server_port() AS port');
  console.log(result.rows[0]);
  const tables = await client.query("SELECT tablename FROM pg_tables WHERE schemaname = 'public' ORDER BY tablename");
  console.log('Tablas:', tables.rows.map((row) => row.tablename).join(', ') || '(ninguna)');
  const relations = await client.query("SELECT conname FROM pg_constraint WHERE contype = 'f' AND connamespace = 'public'::regnamespace ORDER BY conname");
  console.log('Relaciones:', relations.rows.map((row) => row.conname).join(', ') || '(ninguna)');
} finally { await client.end(); }
