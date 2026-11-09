import pg from 'pg';
import { databaseURL } from './env.mjs';

const url = databaseURL();
url.pathname = '/postgres';
const client = new pg.Client({ connectionString: url.toString(), connectionTimeoutMillis: 5000 });
try {
  await client.connect();
  const existing = await client.query("SELECT 1 FROM pg_database WHERE datname = 'petshop'");
  if (!existing.rowCount) {
    await client.query('CREATE DATABASE petshop');
    console.log('Base petshop creada con el usuario configurado.');
  } else console.log('La base petshop ya existe; no se modifica.');
} finally { await client.end(); }
