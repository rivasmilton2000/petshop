import { getSessionUser } from '@/server/auth';
import { endpoint, requireMethod } from '@/server/api';

export default endpoint(async (req, res) => {
  requireMethod(req, res, 'GET');
  res.status(200).json({ user: await getSessionUser(req) });
});
