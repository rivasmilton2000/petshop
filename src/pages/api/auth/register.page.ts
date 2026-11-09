import { randomUUID } from 'node:crypto';
import { getDatabase } from '@/server/db';
import { consumeRateLimit, createSession } from '@/server/auth';
import { endpoint, requireMutation, HttpError, emailValue } from '@/server/api';
import { hashPassword, validPassword } from '@/server/password';

export const config = { api: { bodyParser: { sizeLimit: '16kb' } } };
export default endpoint(async (req, res) => {
  requireMutation(req, res);
  if (Object.keys(req.body).some((key) => !['email', 'password', 'name'].includes(key))) throw new HttpError(400, 'El registro público no permite elegir un rol ni otros permisos.');
  const email = emailValue(req.body.email);
  const name = typeof req.body.name === 'string' ? req.body.name.trim() : '';
  if (!email || name.length < 2 || name.length > 80 || !validPassword(req.body.password)) throw new HttpError(400, 'Usa un nombre de 2 a 80 caracteres, un correo válido y una contraseña de 12 a 128 caracteres.');
  if (!await consumeRateLimit(`register:${req.socket.remoteAddress ?? 'local'}`, 10, 3600)) throw new HttpError(429, 'Demasiados intentos. Inténtalo más tarde.');
  const passwordHash = await hashPassword(req.body.password);
  const result = await getDatabase().query(`INSERT INTO users (id, email, name, password_hash, role)
    VALUES ($1, $2, $3, $4, 'usuario') ON CONFLICT (email) DO NOTHING RETURNING id, email, name, role`, [randomUUID(), email, name, passwordHash]);
  if (!result.rowCount) throw new HttpError(409, 'No se pudo crear la cuenta con ese correo.');
  await createSession(req, res, result.rows[0].id);
  res.status(201).json({ user: result.rows[0] });
});
