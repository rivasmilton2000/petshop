import { writeFile } from 'node:fs/promises';
import { randomBytes } from 'node:crypto';

if (!process.env.PGPASSWORD) throw new Error('Define PGPASSWORD antes de configurar el entorno local.');
const url = new URL('postgresql://localhost/petshop');
url.hostname = process.env.PGHOST || 'localhost';
url.port = process.env.PGPORT || '5432';
url.username = process.env.PGUSER || 'postgres';
url.password = process.env.PGPASSWORD;
const text = [
  '# Configuración local privada. No compartir ni añadir a Git.',
  `DATABASE_URL=${url.toString()}`,
  'APP_URL=http://localhost:3000',
  'SEED_USER_EMAIL=usuario@petshop.test',
  `SEED_USER_PASSWORD=${randomBytes(24).toString('base64url')}`,
  'SEED_ADMIN_EMAIL=administrador@petshop.test',
  `SEED_ADMIN_PASSWORD=${randomBytes(24).toString('base64url')}`,
  'GOOGLE_CLIENT_ID=',
  'GOOGLE_CLIENT_SECRET=',
  '',
].join('\n');
try {
  await writeFile('.env.local', text, { flag: 'wx', mode: 0o600 });
  console.log('.env.local creado con la conexión local y contraseñas aleatorias para el seed. Valores omitidos.');
} catch (error) {
  if (error.code === 'EEXIST') throw new Error('.env.local ya existe; edítalo sin sobrescribir tus credenciales.');
  throw error;
}
