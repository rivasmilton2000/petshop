import './only-server';
import { HttpError } from './api';
import { validHmac, amountToCents, wompi, type PaymentGateway } from './wompi';
import { refreshOrderPayment, isUUID } from './orders';
import { getDatabase } from './db';

export async function processWompiNotification(raw: Buffer, signature: unknown, gateway: PaymentGateway = wompi) {
  if (!validHmac(raw,signature)) throw new HttpError(401,'Firma de notificación inválida.');
  let body;
  try { body=JSON.parse(raw.toString('utf8')); } catch { throw new HttpError(400,'Notificación inválida.'); }
  const id=body?.EnlacePago?.IdentificadorEnlaceComercio;
  if (!isUUID(id) || !Number.isInteger(body?.EnlacePago?.Id) || typeof body?.IdTransaccion!=='string' || !/^[a-zA-Z0-9-]{1,100}$/.test(body.IdTransaccion)) throw new HttpError(400,'Notificación inválida.');
  const order=(await getDatabase().query<{ total_cents:string; payment_mode:string; payment_link_id:number|null }>('SELECT total_cents,payment_mode,payment_link_id FROM shop_orders WHERE id=$1',[id])).rows[0];
  if (!order) throw new HttpError(404,'Pedido no encontrado.');
  if (amountToCents(body.Monto)!==Number(order.total_cents) || body.EsProductiva!==(order.payment_mode==='live') || (order.payment_link_id!==null && body.EnlacePago.Id!==order.payment_link_id)) throw new HttpError(409,'La notificación no corresponde al importe o entorno del pedido.');
  await refreshOrderPayment(id,gateway,undefined,body.EnlacePago.Id,body.IdTransaccion);
}
