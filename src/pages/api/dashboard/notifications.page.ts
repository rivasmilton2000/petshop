import { endpoint, requireUser, requireMethod } from '@/server/api';
import { inventoryNotifications } from '@/server/catalog';

export default endpoint(async (req, res) => {
  const user = await requireUser(req, 'administrador');
  requireMethod(req, res, 'GET');
  res.status(200).json({ notifications: await inventoryNotifications(user) });
});
