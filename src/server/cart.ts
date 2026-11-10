import './only-server';
import { createHash, randomUUID } from 'node:crypto';
import type { PoolClient } from 'pg';
import { getDatabase } from './db';
import { HttpError } from './api';
import { validSlug } from './catalog';
import type { Product } from '@/pages/website/data/products';
import type { CartItem, CartQuote, PreparedCheckout } from '@/types/cart';
import type { SessionUser } from '@/types/auth';

function parseItems(raw: unknown): CartItem[] {
  if (!Array.isArray(raw) || raw.length > 100) throw new HttpError(400, 'El carrito admite hasta 100 líneas.');
  const merged = new Map<string, CartItem>();
  for (const entry of raw) {
    if (!entry || typeof entry !== 'object' || Array.isArray(entry) || Object.keys(entry).some(key => !['id','qty','color'].includes(key)) || !validSlug(entry.id) || typeof entry.qty !== 'number' || !Number.isInteger(entry.qty) || entry.qty < 1 || entry.qty > 99 || typeof entry.color !== 'string' || entry.color.length > 60) throw new HttpError(400, 'Cada cantidad debe ser un entero entre 1 y 99 y tener una variante válida.');
    const key = JSON.stringify([entry.id,entry.color]);
    const qty = (merged.get(key)?.qty ?? 0) + entry.qty;
    if (qty > 99) throw new HttpError(400, 'La cantidad acumulada por variante no puede superar 99.');
    merged.set(key, { id: entry.id, color: entry.color, qty });
  }
  return [...merged.values()].sort((a,b) => a.id.localeCompare(b.id) || a.color.localeCompare(b.color));
}

async function quote(client: PoolClient, items: CartItem[]): Promise<CartQuote> {
  const ids = [...new Set(items.map(item => item.id))].sort();
  // Stable locking order; admin stock/price changes wait until validation finishes.
  await client.query('SELECT id FROM catalog_products WHERE id=ANY($1::text[]) ORDER BY id FOR SHARE', [ids]);
  // Read variants in a fresh statement after acquiring the product locks, so a
  // concurrent product edit cannot mix the new stock with an older variant list.
  const result = await client.query<Product & { active: boolean; archived: boolean }>(`SELECT p.id,p.name,p.category,p.animals,p.image,p.description,p.price::float8 AS price,p.stock,p.active,p.archived_at IS NOT NULL AS archived,
    COALESCE((SELECT json_agg(json_build_object('name',v.name,'image',v.image) ORDER BY v.position) FROM catalog_variants v WHERE v.product_id=p.id),'[]') AS colors
    FROM catalog_products p WHERE p.id=ANY($1::text[]) ORDER BY p.id`, [ids]);
  const products = result.rows.map(({ active: _active, archived: _archived, ...product }) => ({ ...product, ...(product.colors?.length ? {} : { colors: undefined }) }));
  const quantities = new Map<string, number>();
  let totalCents = 0;
  const lines = items.map(item => {
    const product = result.rows.find(row => row.id === item.id);
    if (!product || !product.active || product.archived) throw new HttpError(409, 'Un producto del carrito ya no está disponible. Retíralo para continuar.');
    if (product.stock === 0) throw new HttpError(409, `${product.name}: Agotado. Retíralo del carrito o espera a que vuelva a estar disponible.`);
    const totalQty = (quantities.get(item.id) ?? 0) + item.qty;
    quantities.set(item.id, totalQty);
    if (totalQty > product.stock) throw new HttpError(409, `${product.name}: solo hay ${product.stock} unidades disponibles entre todas sus variantes.`);
    if (product.colors?.length ? !product.colors.some(color => color.name === item.color) : item.color !== '') throw new HttpError(400, `${product.name}: elige una variante válida.`);
    if (product.price === null) throw new HttpError(409, `${product.name}: el precio todavía no está confirmado.`);
    const unitPriceCents = Math.round(product.price * 100);
    const lineTotal = unitPriceCents * item.qty;
    totalCents += lineTotal;
    if (!Number.isSafeInteger(totalCents)) throw new HttpError(400, 'El importe del carrito supera el límite permitido.');
    return { ...item, unitPriceCents, totalCents: lineTotal };
  });
  return { items, products, lines, totalCents, currency: 'USD' };
}

export async function validateCart(raw: unknown): Promise<CartQuote> {
  const items = parseItems(raw);
  const client = await getDatabase().connect();
  try {
    await client.query('BEGIN');
    const result = await quote(client, items);
    await client.query('COMMIT');
    return result;
  } catch (error) { await client.query('ROLLBACK'); throw error; }
  finally { client.release(); }
}

export async function prepareCheckout(user: SessionUser, raw: unknown, key: unknown): Promise<PreparedCheckout> {
  const items = parseItems(raw);
  if (!items.length) throw new HttpError(400, 'Añade productos al carrito antes de preparar el pedido.');
  if (typeof key !== 'string' || !/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(key)) throw new HttpError(400, 'Falta una clave válida de preparación.');
  const client = await getDatabase().connect();
  try {
    await client.query('BEGIN');
    await client.query('SELECT pg_advisory_xact_lock(hashtextextended($1,0))', [`${user.id}:${key}`]);
    // Always revalidate, including retries of an older preparation.
    const cart = await quote(client, items);
    const fingerprint = createHash('sha256').update(JSON.stringify(cart.lines)).digest('hex');
    const existing = await client.query<{ id: string; fingerprint: string; totalCents: string; expiresAt: string; expired: boolean }>(`SELECT id,fingerprint,total_cents AS "totalCents",expires_at::text AS "expiresAt",expires_at<=now() AS expired FROM checkout_preparations WHERE user_id=$1 AND idempotency_key=$2`, [user.id,key]);
    if (existing.rowCount) {
      const row = existing.rows[0];
      if (row.fingerprint !== fingerprint || Number(row.totalCents) !== cart.totalCents || row.expired) throw new HttpError(409, 'La preparación cambió o venció. Prepara el pedido de nuevo.');
      await client.query('COMMIT');
      return { id: row.id, expiresAt: new Date(row.expiresAt).toISOString(), totalCents: cart.totalCents, currency: 'USD', reserved: false };
    }
    const id = randomUUID();
    const saved = await client.query<{ expiresAt: string }>(`INSERT INTO checkout_preparations(id,user_id,idempotency_key,fingerprint,total_cents) VALUES ($1,$2,$3,$4,$5) RETURNING expires_at::text AS "expiresAt"`, [id,user.id,key,fingerprint,cart.totalCents]);
    for (const line of cart.lines) {
      const product = cart.products.find(product => product.id === line.id)!;
      const image = product.colors?.find(color => color.name === line.color)?.image ?? product.image;
      await client.query(`INSERT INTO checkout_preparation_items(preparation_id,product_id,color,name,image,quantity,unit_price_cents) VALUES ($1,$2,$3,$4,$5,$6,$7)`, [id,line.id,line.color,product.name,image,line.qty,line.unitPriceCents]);
    }
    await client.query('COMMIT');
    return { id, expiresAt: new Date(saved.rows[0].expiresAt).toISOString(), totalCents: cart.totalCents, currency: 'USD', reserved: false };
  } catch (error) { await client.query('ROLLBACK'); throw error; }
  finally { client.release(); }
}
