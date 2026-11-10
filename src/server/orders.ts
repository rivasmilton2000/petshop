import './only-server';
import { createHash, randomUUID } from 'node:crypto';
import type { PoolClient } from 'pg';
import { getDatabase } from './db';
import { HttpError } from './api';
import { parseItems, quote, validateCart } from './cart';
import { checkoutInput, shippingQuote } from './shipping';
import { findTerritory } from '@/data/el-salvador';
import { releaseExpiredReservations, releaseReservation, releaseLockedReservation } from './stock';
import { wompi, wompiAvailability, validRedirect, PaymentLinkNotCreatedError, type PaymentGateway, type PaymentMode, type RedirectProof, type PaymentInspection } from './wompi';
import type { SessionUser } from '@/types/auth';
import type { CheckoutQuote, OrderView, OrderStatus, OrderSummary } from '@/types/checkout';

export const isUUID = (value: unknown): value is string => typeof value === 'string' && /^[a-f0-9]{8}-[a-f0-9]{4}-4[a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/i.test(value);
type StoredOrder = {
  id: string; user_id: string | null; fingerprint: string; status: OrderStatus; stock_state: OrderView['stockState']; fulfillment: OrderView['fulfillment'];
  recipient_name: string; email: string; phone: string; address: OrderView['address']; pickup_instructions: string | null;
  subtotal_cents: string; shipping_cents: string; total_cents: string; currency: 'USD'; payment_mode: PaymentMode;
  payment_initialization: string; payment_link_id: number | null; payment_url: string | null; payment_transaction_id: string | null; payment_issue: string | null;
  expires_at: Date; created_at: Date;
};
async function lockedOrder(client: PoolClient, id: string) {
  const result = await client.query<StoredOrder>('SELECT * FROM shop_orders WHERE id=$1 FOR UPDATE',[id]);
  if (!result.rows[0]) throw new HttpError(404, 'No encontramos ese pedido.');
  return result.rows[0];
}
async function orderQuantities(client: PoolClient, id: string) {
  const rows = (await client.query<{ id: string; qty: number }>('SELECT product_id AS id,sum(quantity)::int AS qty FROM shop_order_items WHERE order_id=$1 GROUP BY product_id ORDER BY product_id',[id])).rows;
  const products = (await client.query<{ id: string; stock: number; reserved_stock: number; active: boolean; archived_at: Date | null }>('SELECT id,stock,reserved_stock,active,archived_at FROM catalog_products WHERE id=ANY($1::text[]) ORDER BY id FOR UPDATE',[rows.map(row=>row.id)])).rows;
  return rows.map(row=>({ ...row, product: products.find(product=>product.id===row.id)! }));
}
export async function checkoutQuote(body: Record<string,unknown>): Promise<CheckoutQuote> {
  const input = checkoutInput(body);
  const items = parseItems(input.items);
  if (!items.length) throw new HttpError(400, 'Tu carrito está vacío.');
  const cart = await validateCart(items);
  const shipping = shippingQuote(input);
  const payment = wompiAvailability();
  const total = shipping.feeCents === null ? null : cart.totalCents + shipping.feeCents;
  if (total !== null && (!Number.isSafeInteger(total) || total < 1)) throw new HttpError(400, 'El total debe ser al menos USD 0.01.');
  return { cart, shipping, totalCents: total, wompiReady: payment.ready, paymentMessage: payment.message };
}

/** Reserve before contacting Wompi. A retry of the same checkout returns its original order. */
export async function createOrder(user: SessionUser, body: Record<string,unknown>, mode: PaymentMode = wompi.mode) {
  await releaseExpiredReservations();
  const input = checkoutInput(body);
  const items = parseItems(input.items);
  if (!items.length) throw new HttpError(400, 'Tu carrito está vacío.');
  if (!isUUID(body.idempotencyKey)) throw new HttpError(400, 'Falta una clave válida para identificar el pedido.');
  const fingerprint = createHash('sha256').update(JSON.stringify({ ...input, items, mode })).digest('hex');
  const client = await getDatabase().connect();
  let id: string;
  try {
    await client.query('BEGIN');
    await client.query('SELECT pg_advisory_xact_lock(hashtextextended($1,0))',[`order:${user.id}:${body.idempotencyKey}`]);
    const previous = await client.query<StoredOrder>('SELECT * FROM shop_orders WHERE user_id=$1 AND idempotency_key=$2 FOR UPDATE',[user.id,body.idempotencyKey]);
    if (previous.rowCount) {
      if (previous.rows[0].fingerprint !== fingerprint) throw new HttpError(409, 'Esta referencia ya se usó para otra selección o dirección.');
      id = previous.rows[0].id;
    } else {
      const shipping = shippingQuote(input);
      if (!shipping.available || shipping.feeCents === null) throw new HttpError(409, shipping.message);
      const cart = await quote(client,items,true);
      const total = cart.totalCents + shipping.feeCents;
      if (!Number.isSafeInteger(total) || total < 1) throw new HttpError(400, 'El total debe ser al menos USD 0.01.');
      const minutes = Number(process.env.CHECKOUT_RESERVATION_MINUTES || 15);
      if (!Number.isInteger(minutes) || minutes < 5 || minutes > 60) throw new HttpError(503, 'La duración de reserva necesita configuración.');
      const territory = input.address ? findTerritory(input.address.departmentId,input.address.municipalityId,input.address.districtId)! : null;
      const address = input.address && territory ? { ...input.address, department: territory.department.name, municipality: territory.municipality.name, district: territory.district.name } : null;
      id = randomUUID();
      await client.query(`INSERT INTO shop_orders(id,user_id,idempotency_key,fingerprint,fulfillment,recipient_name,email,phone,address,pickup_instructions,subtotal_cents,shipping_cents,total_cents,payment_mode,expires_at)
        VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,now()+$15*interval '1 minute')`, [id,user.id,body.idempotencyKey,fingerprint,input.fulfillment,input.recipientName,user.email,input.phone,address ? JSON.stringify(address) : null,shipping.instructions,cart.totalCents,shipping.feeCents,total,mode,minutes]);
      const totals = new Map<string,number>();
      for (const line of cart.lines) {
        totals.set(line.id,(totals.get(line.id) ?? 0)+line.qty);
        const product = cart.products.find(product=>product.id===line.id)!;
        const image = product.colors?.find(color=>color.name===line.color)?.image ?? product.image;
        await client.query('INSERT INTO shop_order_items(order_id,product_id,color,name,image,quantity,unit_price_cents) VALUES ($1,$2,$3,$4,$5,$6,$7)',[id,line.id,line.color,product.name,image,line.qty,line.unitPriceCents]);
      }
      for (const [productId,qty] of totals) {
        const changed = await client.query('UPDATE catalog_products SET reserved_stock=reserved_stock+$2,version=version+1,updated_at=now() WHERE id=$1 AND stock-reserved_stock >= $2',[productId,qty]);
        if (changed.rowCount !== 1) throw new HttpError(409, 'Una unidad acaba de reservarse en otro pedido. Revisa el carrito.');
      }
    }
    await client.query('COMMIT');
  } catch (error) { await client.query('ROLLBACK'); throw error; }
  finally { client.release(); }
  return getOrder(user,id!);
}

export async function getOrder(user: SessionUser, id: string): Promise<OrderView> {
  if (!isUUID(id)) throw new HttpError(404, 'Pedido no encontrado.');
  await releaseReservation(id,'expired');
  const result = await getDatabase().query<StoredOrder>('SELECT * FROM shop_orders WHERE id=$1 AND (user_id=$2 OR $3)',[id,user.id,user.role==='administrador']);
  const row = result.rows[0];
  if (!row) throw new HttpError(404, 'Pedido no encontrado.');
  const items = (await getDatabase().query<OrderView['items'][number]>('SELECT product_id AS id,name,image,color,quantity AS qty,unit_price_cents::float8 AS "unitPriceCents" FROM shop_order_items WHERE order_id=$1 ORDER BY product_id,color',[id])).rows;
  return { id: row.id, status: row.status, stockState: row.stock_state, fulfillment: row.fulfillment, recipientName: row.recipient_name, email: row.email, phone: row.phone, address: row.address, pickupInstructions: row.pickup_instructions, subtotalCents: Number(row.subtotal_cents), shippingCents: Number(row.shipping_cents), totalCents: Number(row.total_cents), currency: row.currency, expiresAt: row.expires_at.toISOString(), createdAt: row.created_at.toISOString(), paymentUrl: row.status==='pending' && row.payment_initialization==='ready' ? row.payment_url : null, paymentInitialization: row.payment_initialization, paymentIssue: row.payment_issue, paymentMode: row.payment_mode, items };
}

export async function startOrderPayment(user: SessionUser, id: string, gateway: PaymentGateway = wompi) {
  const view = await getOrder(user,id);
  if (view.status !== 'pending') return view;
  const client = await getDatabase().connect();
  try {
    // Session advisory lock covers the external request across processes. Persist
    // 'creating' first: a timeout/crash must never automatically create a second link.
    await client.query('SELECT pg_advisory_lock(hashtextextended($1,0))',[`payment:${id}`]);
    const order = (await client.query<StoredOrder>('SELECT * FROM shop_orders WHERE id=$1',[id])).rows[0];
    if (order.status !== 'pending' || order.payment_initialization === 'ready') return getOrder(user,id);
    if (order.payment_initialization !== 'not_started') throw new HttpError(409, 'El enlace de este pedido está pendiente de verificación. Consulta su estado antes de volver a intentar pagar.');
    if (gateway.mode !== order.payment_mode) throw new HttpError(409, 'El entorno del pago no coincide con el pedido.');
    await client.query("UPDATE shop_orders SET payment_initialization='creating',updated_at=now() WHERE id=$1",[id]);
    try {
      const link = await gateway.createLink({ id, totalCents: Number(order.total_cents), expiresAt: order.expires_at.toISOString() });
      const changed = await client.query("UPDATE shop_orders SET payment_link_id=$2,payment_url=$3,payment_initialization='ready',updated_at=now() WHERE id=$1 AND status='pending'",[id,link.id,link.url]);
      if (changed.rowCount !== 1) await gateway.deactivateLink(link.id);
    } catch (error) {
      if (error instanceof PaymentLinkNotCreatedError) {
        await client.query('BEGIN');
        try {
          await client.query("UPDATE shop_orders SET payment_initialization='failed',payment_issue='payment_not_started',updated_at=now() WHERE id=$1 AND status='pending'",[id]);
          await releaseLockedReservation(client,id,'failed');
          await client.query('COMMIT');
        } catch (failure) { await client.query('ROLLBACK'); throw failure; }
      } else await client.query("UPDATE shop_orders SET payment_initialization='uncertain',payment_issue='initialization_unconfirmed',updated_at=now() WHERE id=$1 AND status='pending'",[id]);
      // The provider may have received the request. Preserve the reservation until
      // expiry/reconciliation rather than create another payable link on retry.
    }
  } finally {
    await client.query('SELECT pg_advisory_unlock(hashtextextended($1,0))',[`payment:${id}`]).catch(()=>{});
    client.release();
  }
  return getOrder(user,id);
}

/** Only call with a result fetched and authenticated by the payment adapter. */
export async function applyVerifiedPayment(id: string, inspection: PaymentInspection) {
  const client = await getDatabase().connect();
  try {
    await client.query('BEGIN');
    const order = await lockedOrder(client,id);
    if (inspection.reference !== order.id || inspection.mode !== order.payment_mode || inspection.amountCents !== Number(order.total_cents) || (order.payment_link_id !== null && inspection.id !== order.payment_link_id)) throw new HttpError(409, 'La referencia o el importe del pago no corresponden al pedido.');
    const payment = inspection.transaction;
    if (!payment) { if (inspection.failed) await releaseLockedReservation(client,id,'failed'); await client.query('COMMIT'); return; }
    if (payment.currency !== 'USD' || payment.amountCents !== Number(order.total_cents) || payment.real !== (order.payment_mode === 'live')) throw new HttpError(409, 'El importe, moneda o entorno de la transacción no coinciden.');
    const previous = await client.query<{ order_id: string; approved: boolean }>('SELECT order_id,approved FROM shop_payment_events WHERE transaction_id=$1',[payment.id]);
    if (previous.rowCount) {
      if (previous.rows[0].order_id !== id) throw new HttpError(409, 'La transacción ya está vinculada a otro pedido.');
      if (previous.rows[0].approved || !payment.approved) {
        if (!payment.approved) await releaseLockedReservation(client,id,'failed');
        await client.query('COMMIT'); return;
      }
      // The provider may finalize a previously unapproved attempt later. Allow
      // this authenticated false→true transition without inserting a second event.
      await client.query('UPDATE shop_payment_events SET approved=true,received_at=now() WHERE transaction_id=$1',[payment.id]);
    } else {
      await client.query('INSERT INTO shop_payment_events(transaction_id,order_id,approved,real_payment,amount_cents,currency) VALUES ($1,$2,$3,$4,$5,$6)',[payment.id,id,payment.approved,payment.real,payment.amountCents,payment.currency]);
    }
    await client.query('UPDATE shop_orders SET payment_link_id=COALESCE(payment_link_id,$2),updated_at=now() WHERE id=$1',[id,inspection.id]);
    if (!payment.approved) {
      await releaseLockedReservation(client,id,'failed');
      await client.query('COMMIT');
      return;
    }
    if (order.payment_transaction_id) {
      // A second, different approved charge is a reconciliation issue, never a
      // second sale or second inventory deduction.
      await client.query("UPDATE shop_orders SET status='paid_review',payment_issue='additional_approved_transaction',updated_at=now() WHERE id=$1",[id]);
      await client.query('COMMIT'); return;
    }
    const quantities = await orderQuantities(client,id);
    const held = order.stock_state === 'reserved';
    const canFulfill = held || quantities.every(row=>row.product.active && !row.product.archived_at && row.product.stock-row.product.reserved_stock >= row.qty);
    if (canFulfill) {
      for (const row of quantities) {
        const updated = await client.query(`UPDATE catalog_products SET stock=stock-$2,reserved_stock=reserved_stock-$3,version=version+1,updated_at=now() WHERE id=$1 AND stock >= $2 AND reserved_stock >= $3`,[row.id,row.qty,held ? row.qty : 0]);
        if (updated.rowCount !== 1) throw new Error('Stock invariant violated');
        await client.query("INSERT INTO inventory_movements(id,product_id,previous_stock,new_stock,reason) VALUES ($1,$2,$3,$4,'sold')",[randomUUID(),row.id,row.product.stock,row.product.stock-row.qty]);
      }
    }
    await client.query(`UPDATE shop_orders SET status=$2,stock_state=$3,payment_transaction_id=$4,paid_at=now(),payment_issue=$5,updated_at=now() WHERE id=$1`,[id,canFulfill ? 'paid' : 'paid_review',canFulfill ? 'consumed' : 'released',payment.id,canFulfill ? null : 'late_payment_stock_unavailable']);
    await client.query('COMMIT');
  } catch (error) { await client.query('ROLLBACK'); throw error; }
  finally { client.release(); }
}

export async function refreshOrderPayment(id: string, gateway: PaymentGateway = wompi, proof?: RedirectProof, candidateLinkId?: number, notificationTransactionId?: string) {
  const result = await getDatabase().query<StoredOrder>('SELECT * FROM shop_orders WHERE id=$1',[id]);
  const order = result.rows[0];
  if (!order) throw new HttpError(404, 'Pedido no encontrado.');
  const linkId = order.payment_link_id ?? candidateLinkId ?? (proof && validRedirect(proof) && proof.identificadorEnlaceComercio===id ? Number(proof.idEnlace) : undefined);
  if (linkId) {
    const inspection = await gateway.inspectLink(linkId,proof,notificationTransactionId);
    await applyVerifiedPayment(id,inspection);
  }
  await releaseReservation(id,'expired');
  const state=(await getDatabase().query<{status:string}>('SELECT status FROM shop_orders WHERE id=$1',[id])).rows[0];
  if(linkId&&state&&['failed','expired'].includes(state.status)){
    try{await gateway.deactivateLink(linkId);}catch{/* Expiry is also enforced by the hosted link's vigencia; the job retries. */}
  }
}

export async function reconcileOrders(gateway: PaymentGateway = wompi) {
  const rows = (await getDatabase().query<{ id: string; payment_link_id: number | null }>(`SELECT id,payment_link_id FROM shop_orders WHERE status IN ('pending','expired','failed') AND created_at>now()-interval '7 days' ORDER BY updated_at LIMIT 100`)).rows;
  let checked = 0; let unavailable = 0;
  for (const row of rows) {
    try { if (row.payment_link_id) { await refreshOrderPayment(row.id,gateway); checked++; } }
    catch { unavailable++; }
    await releaseReservation(row.id,'expired');
    await getDatabase().query('UPDATE shop_orders SET updated_at=now() WHERE id=$1',[row.id]);
  }
  const released = await releaseExpiredReservations();
  return { checked, unavailable, released };
}

export async function paymentReviews() {
  return (await getDatabase().query<{ id: string; totalCents: number; createdAt: string }>(`SELECT id,total_cents::float8 AS "totalCents",created_at::text AS "createdAt" FROM shop_orders WHERE status='paid_review' ORDER BY created_at DESC`)).rows;
}
export async function listOrders(user: SessionUser): Promise<OrderSummary[]> {
  return (await getDatabase().query<OrderSummary>(`SELECT id,status,total_cents::float8 AS "totalCents",created_at::text AS "createdAt" FROM shop_orders WHERE user_id=$1 OR $2 ORDER BY created_at DESC LIMIT 100`,[user.id,user.role==='administrador'])).rows;
}
