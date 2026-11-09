import { destroySession } from '@/server/auth';
import { endpoint, requireMutation } from '@/server/api';

export const config = { api: { bodyParser: { sizeLimit: '16kb' } } };
export default endpoint(async (req, res) => {
  requireMutation(req, res);
  await destroySession(req, res);
  res.status(200).json({ ok: true });
});
