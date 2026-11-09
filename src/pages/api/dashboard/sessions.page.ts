import { endpoint, requireUser, requireMutation, HttpError } from '@/server/api';
import { ownSessions } from '@/server/dashboard';
import { digest, getCookie, SESSION_COOKIE } from '@/server/auth';
import { getDatabase } from '@/server/db';

export const config = { api: { bodyParser: { sizeLimit: '16kb' } } };
export default endpoint(async (req, res) => {
  const user = await requireUser(req);
  if (Object.keys(req.query).length) throw new HttpError(403, 'Solo puedes administrar tus propias sesiones.');
  if (req.method === 'GET') { res.status(200).json({ sessions: await ownSessions(user, req) }); return; }
  requireMutation(req, res);
  if (Object.keys(req.body).length) throw new HttpError(403, 'No se permite elegir otra cuenta o sesión.');
  const token = getCookie(req, SESSION_COOKIE)!;
  const result = await getDatabase().query('DELETE FROM sessions WHERE user_id=$1 AND token_hash<>$2', [user.id,digest(token)]);
  res.status(200).json({ removed: result.rowCount });
});
