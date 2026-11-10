import { timingSafeEqual } from 'node:crypto';
import { endpoint, requireMethod, HttpError } from '@/server/api';
import { reconcileOrders } from '@/server/orders';
export default endpoint(async (req,res)=>{
  requireMethod(req,res,'POST');
  const secret=process.env.CHECKOUT_JOB_SECRET;
  const provided=req.headers.authorization;
  if (!secret || secret.length<32 || typeof provided!=='string' || Buffer.byteLength(provided)!==Buffer.byteLength(`Bearer ${secret}`) || !timingSafeEqual(Buffer.from(provided),Buffer.from(`Bearer ${secret}`))) throw new HttpError(401,'Acceso no autorizado.');
  res.status(200).json(await reconcileOrders());
});
