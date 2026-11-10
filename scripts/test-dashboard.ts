import './database/env.mjs';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { mkdir, writeFile } from 'node:fs/promises';
import { request, chromium, expect, type APIRequestContext } from '@playwright/test';
import { getDatabase } from '../src/server/db';
import { hashPassword } from '../src/server/password';

const baseURL = process.env.TEST_BASE_URL ?? process.env.APP_URL ?? 'http://localhost:3000';
const origin = new URL(baseURL).origin;
const run = randomUUID();
const password = `Dashboard-${randomUUID()}!`;
const users = [
  { id: randomUUID(), email: `panel-user-${run}@example.test`, name: 'Usuario del panel', role: 'usuario' },
  { id: randomUUID(), email: `panel-other-${run}@example.test`, name: 'Cuenta ajena', role: 'usuario' },
  { id: randomUUID(), email: `panel-admin-${run}@example.test`, name: 'Administrador del panel', role: 'administrador' },
];
const slugs = [`panel-api-${run}`, `panel-ui-${run}`];
const pool = getDatabase();
const browser = await chromium.launch({ headless: true });
const contexts: APIRequestContext[] = [];
const checks: string[] = [];
const api = async () => { const context = await request.newContext({ baseURL }); contexts.push(context); return context; };
const post = (context: APIRequestContext, url: string, data: unknown, headers: Record<string, string> = {}) => context.post(url, { data, headers: { Origin: origin, ...headers } });
await mkdir('artifacts', { recursive: true });
try {
  const hash = await hashPassword(password);
  for (const user of users) await pool.query('INSERT INTO users(id,email,name,password_hash,role) VALUES ($1,$2,$3,$4,$5)', [user.id,user.email,user.name,hash,user.role]);
  const anonymous = await api(); const member = await api(); const other = await api(); const admin = await api();
  for (const [context, user] of [[member,users[0]], [other,users[1]], [admin,users[2]]] as const) assert.equal((await post(context,'/api/auth/login',{email:user.email,password})).status(),200);
  assert.equal((await anonymous.get('/dashboard',{maxRedirects:0})).status(),307);
  for (const path of ['/api/dashboard/profile','/api/dashboard/sessions','/api/dashboard/catalog','/api/dashboard/users']) assert.equal((await anonymous.get(path)).status(),401);
  for (const context of [member,admin]) {
    const response = await context.get('/dashboard'); assert.equal(response.status(),200); assert.match(response.headers()['cache-control'],/no-store/);
  }
  for (const section of ['catalog','users']) {
    const forbidden = await member.get(`/dashboard?section=${section}&role=administrador`);
    assert.equal(forbidden.status(),403); assert.equal((await forbidden.text()).includes(users[2].email),false);
    assert.equal((await member.get(`/api/dashboard/${section}`)).status(),403);
    assert.equal((await post(member,`/api/dashboard/${section}`,{role:'administrador'})).status(),403);
  }
  assert.equal((await member.get('/api/dashboard/catalog/ruff-wheels')).status(),403);
  assert.equal((await post(member,'/api/dashboard/catalog/ruff-wheels',{name:'Cambio prohibido'})).status(),403);
  const own = (await (await member.get('/api/dashboard/profile')).json()).profile;
  assert.equal(own.id,users[0].id); assert.equal(own.password_hash,undefined); assert.equal(own.seed_key,undefined);
  assert.equal((await member.get(`/api/dashboard/profile?userId=${users[1].id}`)).status(),403);
  assert.equal((await post(member,'/api/dashboard/profile',{name:'Intento ajeno',userId:users[1].id})).status(),403);
  assert.equal((await post(member,'/api/dashboard/profile',{name:'Intento de rol',role:'administrador'})).status(),403);
  assert.equal((await member.get(`/dashboard?section=profile&userId=${users[1].id}`)).status(),403);
  assert.equal((await member.get(`/api/dashboard/sessions?userId=${users[1].id}`)).status(),403);
  assert.equal((await post(member,'/api/dashboard/sessions',{userId:users[1].id})).status(),403);
  assert.equal((await pool.query('SELECT name FROM users WHERE id=$1',[users[1].id])).rows[0].name,users[1].name);
  const changed = await post(member,'/api/dashboard/profile',{name:'Mi nombre actualizado'});
  assert.equal(changed.status(),200); assert.equal((await changed.json()).profile.name,'Mi nombre actualizado');
  checks.push('Un dashboard para ambos roles; sin sesión redirige al login; administración bloqueada por página y API; perfil y sesiones restringidos a la cuenta activa.');

  const duplicate = await api();
  assert.equal((await post(duplicate,'/api/auth/login',{email:users[0].email,password})).status(),200);
  const sessions = (await (await member.get('/api/dashboard/sessions')).json()).sessions;
  assert.equal(sessions.length,2); assert.equal(sessions.filter((session: {current:boolean})=>session.current).length,1);
  assert.equal(JSON.stringify(sessions).includes('token_hash'),false);
  assert.equal((await post(member,'/api/dashboard/sessions',{})).status(),200);
  assert.equal((await (await duplicate.get('/api/auth/session')).json()).user,null);
  assert.equal((await (await other.get('/api/auth/session')).json()).user.id,users[1].id);
  assert.equal((await (await member.get('/api/auth/session')).json()).user.id,users[0].id);
  checks.push('Edición del nombre persistida en PostgreSQL; cerrar otras sesiones revoca solo las propias y mantiene la sesión actual y las de otra cuenta.');

  const input = { id: slugs[0], price: 9.5, stock: 4, name:'Producto API de prueba', category:'care-accessories', animals:['dogs'], image:'eco-collar-sage.jpg', description:'Descripción de ensayo para verificar la gestión real del catálogo.', active:false, colors:[{name:'Rosa',image:'eco-collar-pink.jpg'},{name:'Verde',image:'eco-collar-sage.jpg'}] };
  const created = await post(admin,'/api/dashboard/catalog',input); assert.equal(created.status(),201);
  let product = (await created.json()).product;
  assert.equal(product.isDemo,false); assert.equal(product.price,9.5); assert.equal(product.colors.length,2);
  assert.equal((await anonymous.get(`/website/product-detail?id=${slugs[0]}`)).status(),404);
  assert.equal((await post(admin,'/api/dashboard/catalog',input)).status(),409);
  const {id:_id,...fields}=input;
  const edited = await post(admin,`/api/dashboard/catalog/${slugs[0]}`,{...fields,name:'Nombre editado en PostgreSQL',active:true,version:product.version});
  assert.equal(edited.status(),200); product=(await edited.json()).product;
  assert.equal((await post(admin,`/api/dashboard/catalog/${slugs[0]}`,{...fields,version:1})).status(),409);
  const published = (await (await anonymous.get('/api/catalog')).json()).products.find((row:{id:string})=>row.id===slugs[0]);
  assert.equal(published.name,'Nombre editado en PostgreSQL'); assert.equal(published.version,undefined); assert.equal(published.colors.length,2);
  const detail=await anonymous.get(`/website/product-detail?id=${slugs[0]}`); assert.equal(detail.status(),200); assert.equal((await detail.text()).includes('Nombre editado en PostgreSQL'),true);
  assert.equal((await post(admin,`/api/dashboard/catalog/${slugs[0]}`,{...fields,version:product.version,image:'../../.env.local'})).status(),400);
  assert.equal((await post(admin,`/api/dashboard/catalog/${slugs[0]}`,{...fields,version:product.version,price:-1})).status(),400);
  assert.equal((await post(admin,`/api/dashboard/catalog/${slugs[0]}`,{...fields,version:product.version},{Origin:'https://otro.example'})).status(),403);
  assert.equal((await post(admin,`/api/dashboard/catalog/${slugs[0]}`,{...fields,version:product.version,active:false})).status(),200);
  assert.equal((await anonymous.get(`/website/product-detail?id=${slugs[0]}`)).status(),404);
  assert.equal((await (await anonymous.get('/api/catalog')).json()).products.some((row:{id:string})=>row.id===slugs[0]),false);
  const adminAccounts = (await (await admin.get('/api/dashboard/users')).json()).accounts;
  assert.equal(adminAccounts.some((row:{id:string})=>row.id===users[1].id),true);
  assert.equal(JSON.stringify(adminAccounts).includes('password_hash'),false);
  await pool.query("UPDATE users SET role='usuario' WHERE id=$1",[users[2].id]);
  assert.equal((await admin.get('/api/dashboard/catalog')).status(),403);
  await pool.query("UPDATE users SET role='administrador' WHERE id=$1",[users[2].id]);
  checks.push('Catálogo PostgreSQL: creación, variantes, edición, publicación y archivo; reflejo público inmediato; duplicados/conflictos de versión/CSRF e imágenes inválidas rechazados. Cuentas administrativas sin hashes. Rol releído en cada petición.');

  for (const width of [1440,390,320]) {
    for (const user of [users[0],users[2]]) {
      const context=await browser.newContext({baseURL,viewport:{width,height:950},reducedMotion:'reduce'});
      const page=await context.newPage(); const errors:string[]=[];
      page.on('pageerror',error=>{ errors.push(error.message); console.error('Dashboard UI:',error.message); });
      await page.goto('/login?next=/dashboard');
      await page.locator('#auth-email').fill(user.email); await page.locator('#auth-password').fill(password);
      await page.getByRole('button',{name:'Entrar',exact:true}).click();
      await expect(page).toHaveURL(`${baseURL}/dashboard`);
      await expect(page).toHaveTitle(/Inicio.*LILAC & TOFFEE$/);
      await page.evaluate(()=>document.fonts.ready);
      const nav=page.getByRole('navigation',{name:'Navegación del panel',includeHidden:true});
      await expect(nav.locator('a')).toHaveCount(user.role==='administrador'?7:3);
      if(user.role==='usuario') {await expect(nav.getByRole('link',{name:'Productos',exact:true})).toHaveCount(0);await expect(nav.getByRole('link',{name:'Cuentas',exact:true})).toHaveCount(0);}
      expect(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth)).toBe(false);
      await page.screenshot({path:`artifacts/dashboard-${user.role}-${width}-overview.png`,fullPage:true});
      const navigate=async(label:string,section:string)=>{
        if(width<=900) await page.getByRole('button',{name:'Abrir menú del panel',exact:true}).click();
        await nav.getByRole('link',{name:label,exact:true}).click();
        await expect(page).toHaveURL(`${baseURL}/dashboard?section=${section}`);
      };
      await navigate('Mi perfil','profile');
      await expect(page.getByRole('heading',{name:'Mi perfil',exact:true})).toBeVisible();
      await expect(page.locator('main')).toContainText(user.email);
      if(user.role==='usuario') expect(await page.locator('main').innerText()).not.toContain(users[1].email);
      if(width===390) {
        await page.getByLabel('Nombre',{exact:true}).fill(`Nombre visual ${user.role}`);
        await page.getByRole('button',{name:'Guardar mi perfil'}).click();
        await expect(page.getByRole('status')).toContainText('Tu nombre se actualizó correctamente.');
        assert.equal((await pool.query('SELECT name FROM users WHERE id=$1',[user.id])).rows[0].name,`Nombre visual ${user.role}`);
      }
      await navigate('Seguridad','security');
      await expect(page.getByRole('heading',{name:'Seguridad',exact:true})).toBeVisible();
      await expect(page.locator('main')).toContainText('Esta sesión');
      if(width===390) {
        const revoke=page.getByRole('button',{name:'Cerrar otras sesiones',exact:true});
        if(await revoke.isEnabled()) {await revoke.click();await expect(page.getByRole('status')).toContainText('Otras sesiones cerradas:');}
      }
      if(user.role==='administrador') {
        await navigate('Productos','catalog');
        await expect(page.getByRole('heading',{name:'Productos',exact:true})).toBeVisible();
        await page.screenshot({path:`artifacts/dashboard-admin-${width}-catalog.png`,fullPage:true});
        if(width===390) {
          await page.getByRole('button',{name:'Nuevo producto',exact:true}).click();
          await page.getByLabel('Nombre',{exact:true}).fill('Producto visual de prueba');
          await page.getByLabel('Identificador',{exact:true}).fill(slugs[1]);
          await page.getByLabel('Precio (USD)',{exact:true}).fill('8.75');
          await page.getByLabel('Stock',{exact:true}).fill('2');
          await page.getByLabel('Descripción',{exact:true}).fill('Producto temporal creado desde el formulario móvil del panel.');
          await page.getByRole('button',{name:'Añadir variante',exact:true}).click();
          await page.getByLabel('Nombre de variante 1',{exact:true}).fill('Presentación de prueba');
          await page.getByRole('button',{name:'Guardar producto',exact:true}).click();
          await expect(page.getByRole('status')).toContainText('Producto guardado correctamente.');
          await page.getByRole('button',{name:'Editar Producto visual de prueba',exact:true}).click();
          await page.screenshot({path:'artifacts/dashboard-mobile-editor.png',fullPage:true});
          await page.getByLabel('Descripción',{exact:true}).fill('Descripción editada desde el formulario del panel móvil.');
          await page.getByRole('button',{name:'Guardar producto',exact:true}).click();
          await expect(page.getByRole('status')).toContainText('Producto guardado correctamente.');
          await page.getByRole('button',{name:'Mostrar Producto visual de prueba',exact:true}).click();
          await expect(page.getByRole('status')).toContainText('Producto visible en la tienda.');
          await page.getByRole('button',{name:'Archivar Producto visual de prueba',exact:true}).click();
          await expect(page.getByRole('status')).toContainText('Producto archivado.');
          const row=(await pool.query('SELECT description,active FROM catalog_products WHERE id=$1',[slugs[1]])).rows[0];
          assert.equal(row.description,'Descripción editada desde el formulario del panel móvil.'); assert.equal(row.active,false);
        }
        await navigate('Cuentas','users');
        await expect(page.getByRole('heading',{name:'Cuentas registradas',exact:true})).toBeVisible();
        await expect(page.locator('main')).toContainText(users[1].email);
      }
      expect(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth)).toBe(false);
      expect(errors).toEqual([]);
      await page.getByRole('button',{name:'Cerrar sesión',exact:true}).click();
      await expect(page).toHaveURL(`${baseURL}/login`);
      await context.close();
    }
  }
  checks.push('UI 1440/390/320 px para ambos roles: redirección al mismo dashboard, menú correspondiente, perfil propio, sesiones, creación/edición/archivo móvil, cuentas del administrador y cierre de sesión; sin errores JS ni desbordamiento.');
  assert.equal((await anonymous.get('/dashboard/types')).status(),404);
  assert.equal((await anonymous.get('/dashboard/DashboardLayout')).status(),404);
  await writeFile('artifacts/dashboard-verification.json',JSON.stringify({baseURL,checks},null,2));
  console.log(checks.join('\n'));
} finally {
  await browser.close(); for(const context of contexts) await context.dispose();
  await pool.query('DELETE FROM inventory_movements WHERE product_id=ANY($1::text[])',[slugs]);
  await pool.query('DELETE FROM catalog_products WHERE id=ANY($1::text[])',[slugs]);
  await pool.query('DELETE FROM users WHERE id=ANY($1::uuid[]) AND seed_key IS NULL',[users.map(user=>user.id)]);
  await pool.end();
}