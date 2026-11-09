import { getDatabase } from '@/server/db';
import { consumeRateLimit, createSession } from '@/server/auth';
import { endpoint, requireMutation, HttpError, emailValue } from '@/server/api';
import { hashPassword, verifyPassword, validPassword } from '@/server/password';

let dummyHash: Promise<string> | undefined;
export const config = { api: { bodyParser: { sizeLimit: '16kb' } } };
export default endpoint(async (req, res) => {
  requireMutation(req, res);
  const email = emailValue(req.body.email);
  if (!email || !validPassword(req.body.password)) throw new HttpError(401, 'Correo o contraseña incorrectos.');
  const address = req.socket.remoteAddress ?? 'local';
  if (!await consumeRateLimit(`login-ip:${address}`, 100, 900) || !await consumeRateLimit(`login-email:${email}`, 10, 900)) throw new HttpError(429, 'Demasiados intentos. Inténtalo más tarde.');
  const result = await getDatabase().query('SELECT id, email, name, role, password_hash FROM users WHERE email = $1', [email]);
  const account = result.rows[0];
  dummyHash ??= hashPassword('comparacion-interna-sin-cuenta');
  const correct = await verifyPassword(account?.password_hash ?? await dummyHash, req.body.password);
  if (!account?.password_hash || !correct) throw new HttpError(401, 'Correo o contraseña incorrectos.');
  await createSession(req, res, account.id);
  const { password_hash: _hash, ...user } = account;
  res.status(200).json({ user });
});
