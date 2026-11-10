import './only-server';
import { getDatabase } from './db';
import type { PoolClient } from 'pg';

/** All order transitions lock the order first, then product IDs in stable order. */
export async function releaseReservation(orderId: string, reason: 'expired' | 'failed') {
  const client = await getDatabase().connect();
  try {
    await client.query('BEGIN');
    const released=await releaseLockedReservation(client,orderId,reason);
    await client.query('COMMIT'); return released;
  } catch (error) { await client.query('ROLLBACK'); throw error; }
  finally { client.release(); }
}
/** Payment result and stock release can be committed in the same transaction. */
export async function releaseLockedReservation(client: PoolClient, orderId: string, reason: 'expired' | 'failed') {
    const result = await client.query<{ stock_state: string; status: string; expired: boolean }>('SELECT stock_state,status,expires_at<=now() AS expired FROM shop_orders WHERE id=$1 FOR UPDATE', [orderId]);
    const order = result.rows[0];
    if (!order || order.status !== 'pending' || order.stock_state !== 'reserved' || (reason === 'expired' && !order.expired)) return false;
    const quantities = (await client.query<{ id: string; qty: number }>('SELECT product_id AS id,sum(quantity)::int AS qty FROM shop_order_items WHERE order_id=$1 GROUP BY product_id ORDER BY product_id', [orderId])).rows;
    await client.query('SELECT id FROM catalog_products WHERE id=ANY($1::text[]) ORDER BY id FOR UPDATE', [quantities.map(row=>row.id)]);
    for (const row of quantities) {
      const updated = await client.query('UPDATE catalog_products SET reserved_stock=reserved_stock-$2,version=version+1,updated_at=now() WHERE id=$1 AND reserved_stock >= $2', [row.id,row.qty]);
      if (updated.rowCount !== 1) throw new Error('Reservation invariant violated');
    }
    await client.query('UPDATE shop_orders SET status=$2,stock_state=\'released\',updated_at=now() WHERE id=$1', [orderId,reason]);
    return true;
}
export async function releaseExpiredReservations(limit = 100) {
  const ids = (await getDatabase().query<{ id: string }>(`SELECT id FROM shop_orders WHERE status='pending' AND stock_state='reserved' AND expires_at<=now() ORDER BY expires_at LIMIT $1`, [limit])).rows;
  let released = 0;
  for (const row of ids) if (await releaseReservation(row.id,'expired')) released++;
  return released;
}
