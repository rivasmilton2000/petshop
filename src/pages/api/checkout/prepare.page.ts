import { endpoint, requireMutation, requireUser, HttpError } from '@/server/api';
import { prepareCheckout } from '@/server/cart';

export const config = { api: { bodyParser: { sizeLimit: '32kb' } } };
export default endpoint(async (req, res) => {
  requireMutation(req, res);
  const user = await requireUser(req);
  if (Object.keys(req.body).some(key => !['items','idempotencyKey'].includes(key))) throw new HttpError(400, 'No envíes precios o totales desde el navegador.');
  res.status(200).json({ preparation: await prepareCheckout(user, req.body.items, req.body.idempotencyKey) });
});
