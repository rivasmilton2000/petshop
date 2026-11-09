import { endpoint, requireMethod, requireUser } from '@/server/api';

export default endpoint(async (req, res) => {
  requireMethod(req, res, 'GET');
  const user = await requireUser(req, 'administrador');
  res.status(200).json({ message: 'Acceso de administrador verificado.', user });
});
