import './only-server';
import type { NextApiRequest, NextApiResponse } from 'next';
import { isAllowedMutationOrigin, getSessionUser } from './auth';
import type { Role } from '../types/auth';

export class HttpError extends Error {
  constructor(public status: number, message: string) { super(message); }
}
export function endpoint(handler: (req: NextApiRequest, res: NextApiResponse) => Promise<void>) {
  return async (req: NextApiRequest, res: NextApiResponse) => {
    res.setHeader('Cache-Control', 'no-store');
    res.setHeader('X-Content-Type-Options', 'nosniff');
    try { await handler(req, res); }
    catch (error) {
      if (error instanceof HttpError) { res.status(error.status).json({ error: error.message }); return; }
      console.error('Error interno en autenticación; revisa la conexión y las migraciones.');
      res.status(500).json({ error: 'No pudimos completar la solicitud. Inténtalo de nuevo.' });
    }
  };
}
export function requireMethod(req: NextApiRequest, res: NextApiResponse, method: string) {
  if (req.method !== method) { res.setHeader('Allow', method); throw new HttpError(405, 'Método no permitido.'); }
}
export function requireMutation(req: NextApiRequest, res: NextApiResponse) {
  requireMethod(req, res, 'POST');
  // Origen configurado o alias de loopback explícito, con el mismo puerto.
  if (!isAllowedMutationOrigin(req.headers.origin) || req.headers['sec-fetch-site'] === 'cross-site') throw new HttpError(403, 'Origen de la solicitud no permitido.');
  if (req.headers['content-type']?.split(';')[0].trim().toLowerCase() !== 'application/json') throw new HttpError(415, 'Usa el formato JSON.');
  if (!req.body || typeof req.body !== 'object' || Array.isArray(req.body)) throw new HttpError(400, 'Solicitud inválida.');
}
export async function requireUser(req: NextApiRequest, role?: Role) {
  const user = await getSessionUser(req);
  if (!user) throw new HttpError(401, 'Inicia sesión para continuar.');
  if (role && user.role !== role) throw new HttpError(403, 'No tienes permisos para acceder.');
  return user;
}
export function emailValue(value: unknown) {
  if (typeof value !== 'string') return null;
  const email = value.trim().toLowerCase();
  return email.length <= 254 && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) ? email : null;
}
