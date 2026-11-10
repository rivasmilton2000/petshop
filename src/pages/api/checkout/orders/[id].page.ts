import { endpoint, requireMutation, requireUser, HttpError } from '@/server/api';
import { getOrder, refreshOrderPayment, isUUID } from '@/server/orders';
import { validRedirect, type RedirectProof } from '@/server/wompi';
export default endpoint(async (req,res)=>{
  const user = await requireUser(req);
  if (!isUUID(req.query.id)) throw new HttpError(404,'Pedido no encontrado.');
  const order = await getOrder(user,req.query.id);
  if (req.method === 'GET') { res.status(200).json({ order }); return; }
  requireMutation(req,res);
  if (Object.keys(req.body).some(key=>key!=='redirect')) throw new HttpError(400,'Solicitud inválida.');
  const proof = req.body.redirect as RedirectProof | undefined;
  if (proof && (typeof proof !== 'object' || Array.isArray(proof) || !validRedirect(proof) || proof.identificadorEnlaceComercio !== order.id)) throw new HttpError(400,'No se pudo verificar el regreso del pago. Usa Actualizar estado para consultar el servidor.');
  if (['paid','paid_review'].includes(order.status)) { res.status(200).json({ order, message:'Este pago ya está verificado en el servidor.' }); return; }
  try { await refreshOrderPayment(order.id,undefined,proof); }
  catch (error) { if (error instanceof HttpError && error.status===409) throw error; res.status(200).json({ order: await getOrder(user,order.id), message: 'La verificación con Wompi no está disponible por ahora. El estado mostrado no confirma un pago nuevo.' }); return; }
  res.status(200).json({ order: await getOrder(user,order.id) });
});
