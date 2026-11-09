import { endpoint, requireUser, requireMutation, requireMethod, HttpError } from '@/server/api';
import { ownProfile } from '@/server/dashboard';
import { getDatabase } from '@/server/db';

export const config = { api: { bodyParser: { sizeLimit: '16kb' } } };
export default endpoint(async (req, res) => {
  const user = await requireUser(req);
  if (Object.keys(req.query).length) throw new HttpError(403, 'Solo puedes consultar tu propio perfil.');
  if (req.method === 'GET') { res.status(200).json({ profile: await ownProfile(user) }); return; }
  requireMethod(req, res, 'POST'); requireMutation(req, res);
  if (Object.keys(req.body).some((key) => key !== 'name')) throw new HttpError(403, 'Solo puedes actualizar el nombre de tu propia cuenta.');
  const name = typeof req.body.name === 'string' ? req.body.name.trim() : '';
  if (name.length < 2 || name.length > 80) throw new HttpError(400, 'El nombre debe tener entre 2 y 80 caracteres.');
  await getDatabase().query('UPDATE users SET name=$1,updated_at=now() WHERE id=$2', [name, user.id]);
  res.status(200).json({ profile: await ownProfile(user) });
});
