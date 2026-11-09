import './env.mjs';
import { randomUUID } from 'node:crypto';
import { getDatabase } from '../../src/server/db';
import { products } from '../../src/pages/website/data/products';

// Importación inicial explícita: nueve ejemplos heredados, nunca inventario confirmado.
// No se sobrescriben cambios del administrador al repetir el comando.
const pool = getDatabase();
const client = await pool.connect();
try {
  await client.query('BEGIN');
  await client.query('SELECT pg_advisory_xact_lock(741804)');
  let inserted = 0;
  for (const [position, product] of products.entries()) {
    const result = await client.query(`INSERT INTO catalog_products(id,name,category,animals,image,description,price,active,is_demo,position)
      VALUES ($1,$2,$3,$4,$5,$6,NULL,true,true,$7) ON CONFLICT(id) DO NOTHING RETURNING id`,
    [product.id, product.name, product.category, product.animals, product.image, product.description, position]);
    if (!result.rowCount) continue;
    inserted++;
    for (const [index, color] of (product.colors ?? []).entries()) {
      await client.query('INSERT INTO catalog_variants(id,product_id,name,image,position) VALUES ($1,$2,$3,$4,$5)', [randomUUID(), product.id, color.name, color.image, index]);
    }
  }
  await client.query('COMMIT');
  console.log(`${inserted} ejemplos importados. Los registros existentes y sus variantes no se modificaron.`);
} catch (error) { await client.query('ROLLBACK'); throw error; }
finally { client.release(); await pool.end(); }
