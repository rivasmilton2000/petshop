import { endpoint, requireUser, requireMethod } from '@/server/api';
import { inventoryNotifications } from '@/server/catalog';
import { paymentReviews } from '@/server/orders';

export default endpoint(async (req, res) => {
  const user = await requireUser(req, 'administrador');
  requireMethod(req, res, 'GET');
  res.status(200).json({ notifications: await inventoryNotifications(user), paymentReviews: await paymentReviews() });
});
