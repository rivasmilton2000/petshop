import './only-server';
import { Pool } from 'pg';

const shared = globalThis as typeof globalThis & { petshopPool?: Pool };

// Un pool por proceso, también durante las recargas de desarrollo.
export function getDatabase(): Pool {
  if (!process.env.DATABASE_URL) {
    throw new Error('Falta DATABASE_URL en la configuración del servidor.');
  }
  if (!shared.petshopPool) {
    shared.petshopPool = new Pool({
      connectionString: process.env.DATABASE_URL,
      max: 5,
      connectionTimeoutMillis: 5000,
      idleTimeoutMillis: 30000,
    });
    shared.petshopPool.on('error', () => console.error('Se cerró una conexión inactiva de PostgreSQL.'));
  }
  return shared.petshopPool;
}
