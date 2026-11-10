import { endpoint, requireMutation, HttpError } from '@/server/api';
import { validateCart } from '@/server/cart';

export const config = { api: { bodyParser: { sizeLimit: '32kb' } } };
export default endpoint(async (req, res) => {
  requireMutation(req, res);
  if (Object.keys(req.body).some(key => key !== 'items')) throw new HttpError(400, 'El carrito solo admite productos, variantes y cantidades.');
  res.status(200).json(await validateCart(req.body.items));
});
