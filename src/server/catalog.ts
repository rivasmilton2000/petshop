import './only-server';
import { randomUUID } from 'node:crypto';
import { getDatabase } from './db';
import { HttpError } from './api';
import type { SessionUser } from '@/types/auth';
import { animalOptions, productImages, type CatalogInput, type CatalogRecord } from '@/pages/dashboard/types';
import type { Product } from '@/pages/website/data/products';
import { releaseExpiredReservations } from './stock';

const select = `SELECT p.id,p.name,p.category,p.animals,p.image,p.description,p.price::float8 AS price,
  p.stock,p.reserved_stock AS "reservedStock",p.active,p.archived_at::text AS "archivedAt",p.is_demo AS "isDemo",p.version,p.updated_at::text AS "updatedAt",
  COALESCE((SELECT json_agg(json_build_object('name',v.name,'image',v.image) ORDER BY v.position)
    FROM catalog_variants v WHERE v.product_id=p.id),'[]') AS colors FROM catalog_products p`;
export const publicProduct = (row: CatalogRecord): Product => ({ id: row.id, name: row.name, category: row.category, animals: row.animals, image: row.image, description: row.description, price: row.price, stock: row.stock - row.reservedStock, ...(row.colors?.length ? { colors: row.colors } : {}) });
export const assertAdmin = (user: SessionUser) => { if (user.role !== 'administrador') throw new HttpError(403, 'Esta función requiere permisos de administrador.'); };
export const validSlug = (id: unknown): id is string => typeof id === 'string' && id.length <= 100 && /^[a-z0-9]+(-[a-z0-9]+)*$/.test(id);
export async function publicCatalog(): Promise<Product[]> {
  await releaseExpiredReservations();
  const result = await getDatabase().query<CatalogRecord>(`${select} WHERE p.active AND p.archived_at IS NULL ORDER BY p.position,p.id`);
  return result.rows.map(publicProduct);
}
export async function publicProductById(id: string): Promise<Product | null> {
  await releaseExpiredReservations();
  const result = await getDatabase().query<CatalogRecord>(`${select} WHERE p.active AND p.archived_at IS NULL AND p.id=$1`, [id]);
  return result.rows[0] ? publicProduct(result.rows[0]) : null;
}
export async function catalogCategories() { return (await getDatabase().query<{ id: string; name: string }>('SELECT id,name FROM catalog_categories ORDER BY name')).rows; }
export async function adminCatalog(user: SessionUser): Promise<CatalogRecord[]> {
  assertAdmin(user);
  await releaseExpiredReservations();
  return (await getDatabase().query<CatalogRecord>(`${select} WHERE p.archived_at IS NULL ORDER BY p.position,p.id`)).rows;
}
export async function adminProduct(user: SessionUser, id: string) {
  assertAdmin(user);
  const result = await getDatabase().query<CatalogRecord>(`${select} WHERE p.id=$1`, [id]);
  if (!result.rowCount) throw new HttpError(404, 'No encontramos ese producto.');
  return result.rows[0];
}
function input(body: Record<string, unknown>, creating: boolean): CatalogInput {
  const allowed = ['name','price','stock','category','animals','image','description','colors','active', ...(creating ? ['id'] : ['version'])];
  if (Object.keys(body).some((key) => !allowed.includes(key))) throw new HttpError(400, 'El producto contiene campos no admitidos.');
  const name = typeof body.name === 'string' ? body.name.trim() : '';
  const description = typeof body.description === 'string' ? body.description.trim() : '';
  if (name.length < 2 || name.length > 120 || description.length < 10 || description.length > 2000) throw new HttpError(400, 'Revisa el nombre (2–120 caracteres) y la descripción (10–2000).');
  if (typeof body.category !== 'string' || !['pet-food','eco-toys','care-accessories'].includes(body.category)) throw new HttpError(400, 'Selecciona una categoría válida.');
  if (!Array.isArray(body.animals) || !body.animals.length || body.animals.some((animal) => typeof animal !== 'string' || !Object.hasOwn(animalOptions, animal))) throw new HttpError(400, 'Selecciona al menos una especie válida.');
  if (typeof body.image !== 'string' || !productImages.includes(body.image) || typeof body.active !== 'boolean') throw new HttpError(400, 'Revisa la imagen y la visibilidad.');
  if (!(body.price === null && !creating) && (typeof body.price !== 'number' || !Number.isFinite(body.price) || body.price < 0 || body.price > 9999999999.99 || !/^\d+(?:\.\d{1,2})?$/.test(String(body.price)))) throw new HttpError(400, 'Indica un precio válido con un máximo de dos decimales.');
  validateStock(body.stock);
  if (creating && !validSlug(body.id)) throw new HttpError(400, 'Usa un identificador con letras minúsculas, números y guiones.');
  if (!creating && (!Number.isInteger(body.version) || Number(body.version) < 1)) throw new HttpError(400, 'Falta la versión del producto.');
  const colors: { name: string; image: string }[] = [];
  if (body.colors !== undefined) {
    if (!Array.isArray(body.colors) || body.colors.length > 10) throw new HttpError(400, 'Se admiten hasta diez variantes.');
    for (const color of body.colors) {
      if (!color || typeof color !== 'object' || Object.keys(color).some((key) => !['name','image'].includes(key)) || typeof color.name !== 'string' || !color.name.trim() || color.name.trim().length > 60 || !productImages.includes(color.image)) throw new HttpError(400, 'Revisa el nombre y la imagen de cada variante.');
      if (colors.some((item) => item.name.toLocaleLowerCase('es') === color.name.trim().toLocaleLowerCase('es'))) throw new HttpError(400, 'Las variantes deben tener nombres diferentes.');
      colors.push({ name: color.name.trim(), image: color.image });
    }
  }
  return { id: creating ? String(body.id) : '', name, description, price: body.price as number | null, stock: body.stock as number, category: body.category, animals: [...new Set(body.animals)] as string[], image: body.image, active: body.active, colors, ...(!creating ? { version: Number(body.version) } : {}) };
}
export function validateStock(stock: unknown): asserts stock is number {
  if (typeof stock !== 'number' || !Number.isInteger(stock) || stock < 0 || stock > 1000000) throw new HttpError(400, 'El stock debe ser un entero entre 0 y 1000000.');
}
function validateVersion(version: unknown): asserts version is number {
  if (typeof version !== 'number' || !Number.isInteger(version) || version < 1) throw new HttpError(400, 'Falta una versión válida del producto.');
}
export async function saveProduct(user: SessionUser, body: Record<string, unknown>, id?: string) {
  assertAdmin(user);
  const value = input(body, !id);
  const productId = id ?? value.id;
  if (!validSlug(productId)) throw new HttpError(400, 'Identificador inválido.');
  const client = await getDatabase().connect();
  try {
    await client.query('BEGIN');
    let previousStock = 0;
    if (id) {
      const previous = await client.query<{ stock: number; reserved_stock: number; archived_at: string | null }>('SELECT stock,reserved_stock,archived_at FROM catalog_products WHERE id=$1 FOR UPDATE', [id]);
      if (!previous.rowCount) throw new HttpError(404, 'No encontramos ese producto.');
      if (previous.rows[0].archived_at) throw new HttpError(410, 'El producto fue retirado del catálogo.');
      previousStock = previous.rows[0].stock;
      if (value.stock < previous.rows[0].reserved_stock) throw new HttpError(409, 'No puedes reducir el stock por debajo de las unidades reservadas para pagos pendientes.');
      const changed = await client.query(`UPDATE catalog_products SET name=$2,category=$3,animals=$4,image=$5,description=$6,
        active=$7,version=version+1,updated_by=$8,updated_at=now(),price=$10,stock=$11,is_demo=false WHERE id=$1 AND version=$9 RETURNING id`,
      [id,value.name,value.category,value.animals,value.image,value.description,value.active,user.id,value.version,value.price,value.stock]);
      if (!changed.rowCount) {
        const exists = await client.query('SELECT 1 FROM catalog_products WHERE id=$1', [id]);
        throw new HttpError(exists.rowCount ? 409 : 404, exists.rowCount ? 'El producto cambió. Recarga la lista antes de guardar.' : 'No encontramos ese producto.');
      }
      await client.query('DELETE FROM catalog_variants WHERE product_id=$1', [id]);
    } else {
      const created = await client.query(`INSERT INTO catalog_products(id,name,category,animals,image,description,active,updated_by,price,stock,is_demo,position)
        VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,false,(SELECT COALESCE(max(position),0)+1 FROM catalog_products)) ON CONFLICT(id) DO NOTHING RETURNING id`,
      [productId,value.name,value.category,value.animals,value.image,value.description,value.active,user.id,value.price,value.stock]);
      if (!created.rowCount) throw new HttpError(409, 'Ya existe un producto con ese identificador.');
    }
    for (const [position, variant] of (value.colors ?? []).entries()) await client.query('INSERT INTO catalog_variants(id,product_id,name,image,position) VALUES ($1,$2,$3,$4,$5)', [randomUUID(),productId,variant.name,variant.image,position]);
    if (previousStock !== value.stock) await client.query('INSERT INTO inventory_movements(id,product_id,previous_stock,new_stock,changed_by,reason) VALUES ($1,$2,$3,$4,$5,$6)', [randomUUID(),productId,previousStock,value.stock,user.id,id ? 'edited' : 'created']);
    await client.query('COMMIT');
  } catch (error) { await client.query('ROLLBACK'); throw error; }
  finally { client.release(); }
  return adminProduct(user, productId);
}

export async function inventoryNotifications(user: SessionUser) {
  assertAdmin(user);
  // One row per product; never insert notification records on reload.
  await releaseExpiredReservations();
  return (await getDatabase().query<CatalogRecord>(`${select} WHERE p.active AND p.archived_at IS NULL AND p.stock-p.reserved_stock=0 ORDER BY p.name,p.id`)).rows;
}

export async function replenishStock(user: SessionUser, body: Record<string, unknown>) {
  assertAdmin(user);
  if (Object.keys(body).some(key => !['id','stock','version'].includes(key)) || !validSlug(body.id)) throw new HttpError(400, 'Solicitud de inventario inválida.');
  validateStock(body.stock); validateVersion(body.version);
  const client = await getDatabase().connect();
  try {
    await client.query('BEGIN');
    const result = await client.query<{ stock: number; reserved_stock: number; version: number; archived_at: string | null }>('SELECT stock,reserved_stock,version,archived_at FROM catalog_products WHERE id=$1 FOR UPDATE', [body.id]);
    const row = result.rows[0];
    if (!row) throw new HttpError(404, 'No encontramos ese producto.');
    if (row.archived_at) throw new HttpError(410, 'El producto fue retirado.');
    if (row.version !== body.version) throw new HttpError(409, 'El inventario cambió. Actualiza la lista antes de reponer.');
    if (body.stock < row.reserved_stock) throw new HttpError(409, 'Hay unidades reservadas para pagos pendientes. El stock total no puede ser menor que la reserva.');
    await client.query('UPDATE catalog_products SET stock=$2,version=version+1,updated_by=$3,updated_at=now() WHERE id=$1', [body.id,body.stock,user.id]);
    if (row.stock !== body.stock) await client.query('INSERT INTO inventory_movements(id,product_id,previous_stock,new_stock,changed_by,reason) VALUES ($1,$2,$3,$4,$5,$6)', [randomUUID(),body.id,row.stock,body.stock,user.id,'replenished']);
    await client.query('COMMIT');
  } catch (error) { await client.query('ROLLBACK'); throw error; }
  finally { client.release(); }
  return adminProduct(user, body.id);
}

export async function removeProduct(user: SessionUser, id: string, body: Record<string, unknown>) {
  assertAdmin(user);
  if (Object.keys(body).some(key => key !== 'version')) throw new HttpError(400, 'Solicitud de eliminación inválida.');
  validateVersion(body.version);
  // Logical deletion preserves all present/future order references and inventory history.
  const result = await getDatabase().query(`UPDATE catalog_products SET active=false,archived_at=now(),version=version+1,updated_by=$3,updated_at=now()
    WHERE id=$1 AND version=$2 AND archived_at IS NULL RETURNING id`, [id,body.version,user.id]);
  if (!result.rowCount) throw new HttpError(409, 'El producto cambió o ya fue retirado. Actualiza la lista.');
  return { id, archived: true };
}
