import { endpoint, requireMutation, requireUser, HttpError } from '@/server/api';
import { consumeRateLimit } from '@/server/auth';
import { createOrder, startOrderPayment } from '@/server/orders';
import { requireWompi } from '@/server/wompi';
export const config = { api: { bodyParser: { sizeLimit: '32kb' } } };
export default endpoint(async (req,res)=>{
  requireMutation(req,res); const user = await requireUser(req); requireWompi();
  if (!await consumeRateLimit(`checkout:${user.id}`,20,600)) throw new HttpError(429,'Hay demasiados intentos. Consulta el estado de tus pedidos antes de continuar.');
  const order = await createOrder(user,req.body);
  try { res.status(200).json({ order: await startOrderPayment(user,order.id) }); }
  catch { res.status(200).json({ order, message: 'El pago quedó pendiente de verificación. Consulta el pedido antes de volver a intentarlo.' }); }
});
