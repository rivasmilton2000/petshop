import './env.mjs';
import { randomUUID } from 'node:crypto';
import { getDatabase } from '../../src/server/db';
import { hashPassword, validPassword } from '../../src/server/password';

const pool = getDatabase();
const client = await pool.connect();
try {
  const entries = [
    { role: 'usuario', email: process.env.SEED_USER_EMAIL, password: process.env.SEED_USER_PASSWORD, name: 'Usuario de prueba' },
    { role: 'administrador', email: process.env.SEED_ADMIN_EMAIL, password: process.env.SEED_ADMIN_PASSWORD, name: 'Administrador de prueba' },
  ];
  for (const entry of entries) {
    if (!entry.email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(entry.email) || entry.email.length > 254 || !validPassword(entry.password)) {
      throw new Error('Configura los cuatro valores SEED_* con correos válidos y contraseñas de 12 a 128 caracteres.');
    }
  }
  if (entries[0].email!.trim().toLowerCase() === entries[1].email!.trim().toLowerCase()) throw new Error('Las cuentas de prueba deben tener correos diferentes.');
  await client.query('BEGIN');
  await client.query('SELECT pg_advisory_xact_lock(741803)');
  for (const entry of entries) {
    const email = entry.email!.trim().toLowerCase();
    const existing = await client.query('SELECT id, seed_key FROM users WHERE email = $1 OR seed_key = $2', [email, entry.role]);
    if (existing.rows.some((row) => row.seed_key !== entry.role)) throw new Error('El correo del seed pertenece a otra cuenta. No se cambiarán sus permisos.');
    const hash = await hashPassword(entry.password!);
    const result = await client.query(`INSERT INTO users(id, email, name, password_hash, role, seed_key)
      VALUES ($1, $2, $3, $4, $5, $5)
      ON CONFLICT (seed_key) DO UPDATE SET email = EXCLUDED.email, password_hash = EXCLUDED.password_hash,
        role = EXCLUDED.role, updated_at = now()
      RETURNING id`, [randomUUID(), email, entry.name, hash, entry.role]);
    await client.query('DELETE FROM sessions WHERE user_id = $1', [result.rows[0].id]);
    console.log(`Cuenta de prueba ${entry.role}: preparada; contraseña omitida.`);
  }
  await client.query('COMMIT');
} catch (error) { await client.query('ROLLBACK'); throw error; }
finally { client.release(); await pool.end(); }
