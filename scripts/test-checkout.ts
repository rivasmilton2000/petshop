import './database/env.mjs';
import assert from 'node:assert/strict';
import { createHmac, randomUUID } from 'node:crypto';
import { mkdir, writeFile } from 'node:fs/promises';
import { chromium, request, expect } from '@playwright/test';
import { getDatabase } from '../src/server/db';
import { hashPassword } from '../src/server/password';
import { saveProduct, publicCatalog, replenishStock } from '../src/server/catalog';
import { createOrder, getOrder, startOrderPayment, refreshOrderPayment, applyVerifiedPayment, checkoutQuote } from '../src/server/orders';
import { releaseExpiredReservations } from '../src/server/stock';
import { processWompiNotification } from '../src/server/wompi-notifications';
import { WompiGateway, PaymentLinkNotCreatedError, validHmac, validRedirect, type PaymentGateway, type PaymentInspection } from '../src/server/wompi';
import { territories, findTerritory } from '../src/data/el-salvador';
import { suggestTerritory } from '../src/server/geolocation';
import { checkoutInput, shippingQuote } from '../src/server/shipping';
import { HttpError } from '../src/server/api';
import type { SessionUser } from '../src/types/auth';
import type { CheckoutInput, OrderView } from '../src/types/checkout';

const baseURL=process.env.TEST_BASE_URL ?? 'http://localhost:3001';
const origin=new URL(baseURL).origin;
const run=randomUUID();const password=`Checkout-${randomUUID()}!`;
const pool=getDatabase();const browser=await chromium.launch({headless:true});
const users:SessionUser[]=[{id:randomUUID(),email:`checkout-client-${run}@example.test`,name:'Cliente Checkout',role:'usuario'},{id:randomUUID(),email:`checkout-other-${run}@example.test`,name:'Otra cuenta Checkout',role:'usuario'},{id:randomUUID(),email:`checkout-admin-${run}@example.test`,name:'Administrador Checkout',role:'administrador'}];
const ids:string[]=[];const checks:string[]=[];
const originalEnv={APP_URL:process.env.APP_URL,SHIPPING_RATES_JSON:process.env.SHIPPING_RATES_JSON,PICKUP_FEE_CENTS:process.env.PICKUP_FEE_CENTS,PICKUP_INSTRUCTIONS:process.env.PICKUP_INSTRUCTIONS,WOMPI_CLIENT_SECRET:process.env.WOMPI_CLIENT_SECRET,WOMPI_CLIENT_ID:process.env.WOMPI_CLIENT_ID,WOMPI_MODE:process.env.WOMPI_MODE};
const address={departmentId:'san-salvador',municipalityId:'san-salvador-centro',districtId:'san-salvador-centro--san-salvador',exactAddress:'Dirección sintética de prueba, casa 12, colonia de ensayo.',reference:'Referencia sintética de prueba'};
const fail=(status:number)=>(error:unknown)=>error instanceof HttpError&&error.status===status;
const makeProduct=async(label:string,stock=1)=>{const id=`checkout-${label}-${run}`;ids.push(id);await saveProduct(users[2],{id,name:`Producto checkout ${label}`,price:8.75,stock,category:'eco-toys',animals:['dogs'],image:'ruff-wheels.jpg',description:'Producto sintético de prueba para checkout, sin cobros reales.',active:true,colors:[]});return id;};
const input=(id:string,key=randomUUID())=>({items:[{id,color:'',qty:1}],fulfillment:'delivery',recipientName:users[0].name,phone:'',address:{...address},idempotencyKey:key});
const getStock=async(id:string)=>(await pool.query<{stock:number;reserved_stock:number;version:number}>('SELECT stock,reserved_stock,version FROM catalog_products WHERE id=$1',[id])).rows[0];
class FakeGateway implements PaymentGateway {
  mode='test' as const; creates=0; sequence=1800000000+Math.floor(Math.random()*1000000); links=new Map<number,PaymentInspection>();
  async createLink(order:{id:string;totalCents:number;expiresAt:string}){this.creates++;const id=++this.sequence;this.links.set(id,{id,reference:order.id,mode:'test',amountCents:order.totalCents,transaction:null,failed:false});return{id,url:`https://lk.wompi.sv/local-test-${id}`};}
  async inspectLink(id:number){const link=this.links.get(id);if(!link)throw new Error('Fixture not found');return structuredClone(link);}
  async deactivateLink(_id:number){}
  outcome(id:number,approved:boolean,transactionId=randomUUID()){const link=this.links.get(id)!;link.transaction={id:transactionId,approved,real:false,amountCents:link.amountCents,currency:'USD'};return link;}
}
const gateway=new FakeGateway();
await mkdir('artifacts/checkout',{recursive:true});
try {
  const baseline=(await pool.query('SELECT id,name,price,stock,reserved_stock FROM catalog_products ORDER BY id')).rows;
  const hash=await hashPassword(password);
  for(const user of users)await pool.query('INSERT INTO users(id,email,name,password_hash,role) VALUES ($1,$2,$3,$4,$5)',[user.id,user.email,user.name,hash,user.role]);
  assert.equal(territories.length,14);assert.equal(territories.flatMap(d=>d.municipalities).length,44);
  const districts=territories.flatMap(d=>d.municipalities.flatMap(m=>m.districts));assert.equal(districts.length,262);assert.equal(new Set(districts.map(d=>d.id)).size,262);
  assert.ok(findTerritory(address.departmentId,address.municipalityId,address.districtId));assert.equal(findTerritory('ahuachapan',address.municipalityId,address.districtId),null);
  const uiId=await makeProduct('formulario',5);
  process.env.SHIPPING_RATES_JSON='{}';delete process.env.PICKUP_FEE_CENTS;delete process.env.PICKUP_INSTRUCTIONS;
  assert.equal(shippingQuote(checkoutInput(input(uiId))).available,false);
  assert.equal(shippingQuote({fulfillment:'pickup',address:null}).available,false);
  await assert.rejects(createOrder(users[0],input(uiId)),fail(409));
  process.env.SHIPPING_RATES_JSON=JSON.stringify({departments:{'san-salvador':500},municipalities:{'san-salvador-centro':400},districts:{[address.districtId]:350}});
  process.env.PICKUP_FEE_CENTS='0';process.env.PICKUP_INSTRUCTIONS='Ubicación sintética de recogida para pruebas locales.';
  assert.equal(shippingQuote(checkoutInput(input(uiId))).feeCents,350);
  assert.equal((await checkoutQuote(input(uiId))).totalCents,1225);
  assert.throws(()=>checkoutInput({...input(uiId),address:{...address,municipalityId:'la-libertad-este'}}),fail(400));
  assert.throws(()=>checkoutInput({...input(uiId),address:{...address,location:{latitude:13.69,longitude:-89.21,accuracy:20,confirmed:false}}}),fail(400));
  assert.throws(()=>checkoutInput({...input(uiId),totalCents:1}),fail(400));
  const pickup=await createOrder(users[0],{...input(uiId),fulfillment:'pickup',address:null});assert.equal(pickup.shippingCents,0);assert.equal(pickup.address,null);
  await pool.query("UPDATE shop_orders SET expires_at=now()-interval '1 second' WHERE id=$1",[pickup.id]);await releaseExpiredReservations();
  checks.push('Catálogo local 14/44/262, IDs únicos, relaciones servidor, tarifas por prioridad distrito/municipio/departamento, recogida sin dirección y bloqueo sin tarifa.');

  const lastId=await makeProduct('ultima-unidad');
  const attempts=await Promise.allSettled([createOrder(users[0],input(lastId)),createOrder(users[1],{...input(lastId),recipientName:users[1].name})]);
  assert.equal(attempts.filter(result=>result.status==='fulfilled').length,1);assert.equal(attempts.filter(result=>result.status==='rejected').length,1);
  const held=(attempts.find(result=>result.status==='fulfilled') as PromiseFulfilledResult<OrderView>).value;
  const owner=users.find(user=>user.name===held.recipientName)!;
  assert.deepEqual([...(Object.values(await getStock(lastId))).slice(0,2)],[1,1]);
  assert.equal((await publicCatalog()).find(product=>product.id===lastId)?.stock,0);
  const before=await getStock(lastId);await assert.rejects(replenishStock(users[2],{id:lastId,stock:0,version:before.version}),fail(409));
  const orderBody=input(lastId);orderBody.recipientName=owner.name;
  // Separate fixture for repeated checkout/link creation; the last unit stays held.
  const idemId=await makeProduct('idempotencia',2);const idemInput=input(idemId);
  const same=await Promise.all([createOrder(users[0],idemInput),createOrder(users[0],idemInput)]);assert.equal(same[0].id,same[1].id);assert.equal((await getStock(idemId)).reserved_stock,1);
  await assert.rejects(createOrder(users[0],{...idemInput,address:{...address,exactAddress:'Otra dirección sintética de prueba 42'}}),fail(409));
  await Promise.all([startOrderPayment(users[0],same[0].id,gateway),startOrderPayment(users[0],same[0].id,gateway)]);assert.equal(gateway.creates,1);
  const ready=await getOrder(users[0],same[0].id);const linkId=(await pool.query('SELECT payment_link_id FROM shop_orders WHERE id=$1',[ready.id])).rows[0].payment_link_id;
  process.env.WOMPI_CLIENT_SECRET=`local-test-${randomUUID()}`;
  const approved=gateway.outcome(linkId,true);
  const raw=Buffer.from(JSON.stringify({Monto:approved.amountCents/100,EsProductiva:false,IdTransaccion:approved.transaction!.id,EnlacePago:{Id:linkId,IdentificadorEnlaceComercio:ready.id}}));
  const signature=createHmac('sha256',process.env.WOMPI_CLIENT_SECRET).update(raw).digest('hex');
  assert.equal(validHmac(raw,signature),true);assert.equal(validHmac(Buffer.concat([raw,Buffer.from('\n')]),signature),false);
  await assert.rejects(processWompiNotification(raw,'0'.repeat(64),gateway),fail(401));
  await Promise.all([processWompiNotification(raw,signature,gateway),processWompiNotification(raw,signature,gateway)]);
  assert.equal((await getOrder(users[0],ready.id)).status,'paid');assert.equal((await getStock(idemId)).stock,1);assert.equal((await getStock(idemId)).reserved_stock,0);
  assert.equal((await pool.query("SELECT count(*)::int AS n FROM inventory_movements WHERE product_id=$1 AND reason='sold'",[idemId])).rows[0].n,1);
  assert.equal((await pool.query('SELECT count(*)::int AS n FROM shop_payment_events WHERE order_id=$1',[ready.id])).rows[0].n,1);
  await assert.rejects(getOrder(users[1],ready.id),fail(404));
  const mismatch={...approved,reference:held.id,amountCents:held.totalCents+1};await assert.rejects(applyVerifiedPayment(held.id,mismatch),fail(409));
  await assert.rejects(applyVerifiedPayment(held.id,{...approved,id:123456,reference:held.id,transaction:{...approved.transaction!,real:true}}),fail(409));
  checks.push('Última unidad: dos compradores simultáneos, una sola reserva; stock público disponible, protección frente a ajuste administrativo, pedidos/enlaces idempotentes, HMAC raw, notificaciones concurrentes duplicadas y un único descuento. Monto, referencia y entorno inválidos rechazados; pedido privado.');

  const failedId=await makeProduct('fallido');const failed=await createOrder(users[0],input(failedId));await startOrderPayment(users[0],failed.id,gateway);
  const failedLink=(await pool.query('SELECT payment_link_id FROM shop_orders WHERE id=$1',[failed.id])).rows[0].payment_link_id;
  gateway.outcome(failedLink,false);await refreshOrderPayment(failed.id,gateway);assert.equal((await getOrder(users[0],failed.id)).status,'failed');assert.equal((await getStock(failedId)).reserved_stock,0);assert.equal((await getStock(failedId)).stock,1);
  const failedTransaction=gateway.links.get(failedLink)!.transaction!.id;
  gateway.outcome(failedLink,true,failedTransaction);await refreshOrderPayment(failed.id,gateway);assert.equal((await getOrder(users[0],failed.id)).status,'paid');assert.equal((await getStock(failedId)).stock,0);
  const noLinkId=await makeProduct('inicio-fallido');const noLink=await createOrder(users[0],input(noLinkId));
  const noLinkGateway:PaymentGateway={mode:'test',createLink:async()=>{throw new PaymentLinkNotCreatedError();},inspectLink:gateway.inspectLink.bind(gateway),deactivateLink:async()=>{}};
  await startOrderPayment(users[0],noLink.id,noLinkGateway);assert.equal((await getOrder(users[0],noLink.id)).status,'failed');assert.equal((await getStock(noLinkId)).reserved_stock,0);
  const lateId=await makeProduct('tardio-disponible');const late=await createOrder(users[0],input(lateId));await startOrderPayment(users[0],late.id,gateway);
  const lateLink=(await pool.query('SELECT payment_link_id FROM shop_orders WHERE id=$1',[late.id])).rows[0].payment_link_id;
  await pool.query("UPDATE shop_orders SET expires_at=now()-interval '1 second' WHERE id=$1",[late.id]);await releaseExpiredReservations();assert.equal((await getStock(lateId)).reserved_stock,0);
  gateway.outcome(lateLink,true);await refreshOrderPayment(late.id,gateway);assert.equal((await getOrder(users[0],late.id)).status,'paid');assert.equal((await getStock(lateId)).stock,0);
  const reviewId=await makeProduct('tardio-revision');const review=await createOrder(users[0],input(reviewId));await startOrderPayment(users[0],review.id,gateway);
  const reviewLink=(await pool.query('SELECT payment_link_id FROM shop_orders WHERE id=$1',[review.id])).rows[0].payment_link_id;
  await pool.query("UPDATE shop_orders SET expires_at=now()-interval '1 second' WHERE id=$1",[review.id]);await releaseExpiredReservations();
  const laterBuyer=await createOrder(users[1],{...input(reviewId),recipientName:users[1].name});
  gateway.outcome(reviewLink,true);await refreshOrderPayment(review.id,gateway);assert.equal((await getOrder(users[0],review.id)).status,'paid_review');assert.equal((await getStock(reviewId)).reserved_stock,1);assert.equal((await getStock(reviewId)).stock,1);
  assert.equal((await getOrder(users[1],laterBuyer.id)).status,'pending');
  const duplicateCharge=gateway.outcome(reviewLink,true);await refreshOrderPayment(review.id,gateway);assert.equal((await getStock(reviewId)).reserved_stock,1);assert.equal((await getOrder(users[0],review.id)).status,'paid_review');
  const timeoutId=await makeProduct('timeout');const uncertain=await createOrder(users[0],input(timeoutId));let externalCalls=0;
  const timeoutGateway:PaymentGateway={...gateway,mode:'test',createLink:async()=>{externalCalls++;throw new Error('Simulated timeout after provider received request');},inspectLink:gateway.inspectLink.bind(gateway),deactivateLink:async()=>{}};
  await startOrderPayment(users[0],uncertain.id,timeoutGateway);await assert.rejects(startOrderPayment(users[0],uncertain.id,timeoutGateway),fail(409));assert.equal(externalCalls,1);assert.equal((await getOrder(users[0],uncertain.id)).paymentInitialization,'uncertain');
  checks.push('Adaptador local: pago fallido libera; vencimiento libera; confirmación tardía consume si hay disponibilidad y marca paid_review sin tocar otra reserva si no hay; timeout incierto nunca crea un segundo enlace. Sin llamadas ni cobros reales.');

  const google=(name:string,type:string)=>({long_name:name,short_name:name,types:[type]});
  const geoResult={address_components:[{long_name:'El Salvador',short_name:'SV',types:['country']},google('San Salvador','administrative_area_level_1'),google('San Salvador Centro','administrative_area_level_2'),google('San Salvador','locality')],formatted_address:address.exactAddress,types:['street_address'],geometry:{location_type:'ROOFTOP'}};
  const full=suggestTerritory([geoResult],20);assert.equal(full.districtId,address.districtId);assert.equal(full.exactAddress,address.exactAddress);
  const coarse=suggestTerritory([geoResult],2000);assert.equal(coarse.departmentId,'san-salvador');assert.equal(coarse.districtId,undefined);assert.equal(coarse.exactAddress,undefined);
  const ambiguous=suggestTerritory([{address_components:[{long_name:'El Salvador',short_name:'SV',types:['country']},google('San Lorenzo','locality')]}],20);assert.equal(ambiguous.districtId,undefined);assert.equal(ambiguous.municipalityId,undefined);
  assert.equal(suggestTerritory([{address_components:[{long_name:'Guatemala',short_name:'GT',types:['country']}]}],20).departmentId,undefined);

  // Exercise the actual SV OAuth/link/inspection adapter against an in-process
  // HTTP-transport double, with the shapes from the official OpenAPI. Never use
  // a real card or a real external request in this local suite.
  const originalFetch=globalThis.fetch;process.env.APP_URL='https://checkout.example.test';process.env.WOMPI_CLIENT_ID='local-app';process.env.WOMPI_MODE='test';
  const requests:{url:string;method:string;body?:unknown}[]=[];
  globalThis.fetch=(async(url:Parameters<typeof fetch>[0],options?:RequestInit)=>{
    const target=String(url);requests.push({url:target,method:options?.method??'GET',...(typeof options?.body==='string'?{body:JSON.parse(options.body)}:{})});
    if(target.endsWith('/desactivar'))return new Response(null,{status:200});
    const result=target.includes('/connect/token')?{access_token:'local-token',expires_in:3600}:target.endsWith('/Aplicativo')?{idAplicativo:'local-app',estaProductivo:false}:target.endsWith('/EnlacePago')?{idEnlace:777,urlEnlace:'https://lk.wompi.sv/local',estaProductivo:false}:target.includes('/EnlacePago/777')?{idEnlace:777,idAplicativo:'local-app',nombreEnlace:ready.id,monto:12.25,estaProductivo:false,usable:false,cantidadIntentoPagoFallidos:0,transacciones:[{idTransaccion:'local-transaction',esAprobada:true}]}:{idTransaccion:'local-transaction',esAprobada:true,esReal:false,monto:12.25};
    return new Response(JSON.stringify(result),{status:200,headers:{'Content-Type':'application/json'}});
  }) as typeof fetch;
  try {
    const adapter=new WompiGateway();await adapter.createLink({id:ready.id,totalCents:1225,expiresAt:new Date(Date.now()+900000).toISOString()});const inspected=await adapter.inspectLink(777);assert.equal(inspected.transaction?.amountCents,1225);
    await adapter.deactivateLink(777);assert.ok(requests.some(request=>request.url==='https://api.wompi.sv/EnlacePago/777/desactivar'&&request.method==='PUT'));
    const posted=requests.find(request=>request.url==='https://api.wompi.sv/EnlacePago')!.body as {configuracion:{esMontoEditable:boolean;esCantidadEditable:boolean;cantidadPorDefecto:number};limitesDeUso:{cantidadMaximaPagosExitosos:number}};
    assert.equal(posted.configuracion.esMontoEditable,false);assert.equal(posted.configuracion.esCantidadEditable,false);assert.equal(posted.configuracion.cantidadPorDefecto,1);assert.equal(posted.limitesDeUso.cantidadMaximaPagosExitosos,1);
    assert.ok(requests.some(request=>request.url==='https://id.wompi.sv/connect/token'));assert.ok(requests.some(request=>request.url==='https://api.wompi.sv/TransaccionCompra/local-transaction'));
    const proof={identificadorEnlaceComercio:ready.id,idTransaccion:'local-transaction',idEnlace:'777',monto:'12.25',hash:''};proof.hash=createHmac('sha256',process.env.WOMPI_CLIENT_SECRET!).update(proof.identificadorEnlaceComercio+proof.idTransaccion+proof.idEnlace+proof.monto).digest('hex');assert.equal(validRedirect(proof),true);assert.equal(validRedirect({...proof,monto:'0.01'}),false);
  } finally {globalThis.fetch=originalFetch;process.env.APP_URL=originalEnv.APP_URL;}
  checks.push('Contrato Wompi SV probado con transporte simulado: OAuth client_credentials, endpoints SV, monto y cantidad inmutables, enlace de un uso, consulta autenticada y hash del retorno. Geocodificación: coincidencia única, baja precisión, ambigüedad y país distinto.');

  for(const width of [1440,390,320]) {
    const context=await browser.newContext({baseURL,viewport:{width,height:950},reducedMotion:'reduce',geolocation:{latitude:13.6929,longitude:-89.2182,accuracy:20}});
    const page=await context.newPage();const errors:string[]=[];page.on('pageerror',error=>errors.push(error.message));
    await page.goto('/website/checkout');await expect(page).toHaveURL(/\/login\?next=/);
    await page.locator('#auth-email').fill(users[0].email);await page.locator('#auth-password').fill(password);await page.getByRole('button',{name:'Entrar',exact:true}).click();await expect(page).toHaveURL(/\/website\/checkout$/);
    await expect(page.getByLabel('Nombre de quien recibe')).toHaveValue(users[0].name);
    await expect(page.locator('#shipping-department option')).toHaveCount(15);await expect(page.getByRole('combobox',{name:'Municipio',exact:true})).toBeDisabled();await expect(page.getByRole('combobox',{name:'Distrito',exact:true})).toBeDisabled();
    if(width===1440)for(const d of territories){await page.getByRole('combobox',{name:'Departamento',exact:true}).selectOption(d.id);expect(await page.locator('#shipping-municipality option').allTextContents()).toEqual(['Selecciona un municipio',...d.municipalities.map(m=>m.name)]);for(const m of d.municipalities){await page.getByRole('combobox',{name:'Municipio',exact:true}).selectOption(m.id);expect(await page.locator('#shipping-district option').allTextContents()).toEqual(['Selecciona un distrito',...m.districts.map(d=>d.name)]);}}
    await page.getByRole('combobox',{name:'Departamento',exact:true}).selectOption('san-salvador');await page.getByRole('combobox',{name:'Municipio',exact:true}).selectOption('san-salvador-centro');await page.getByRole('combobox',{name:'Distrito',exact:true}).selectOption(address.districtId);
    await page.getByRole('combobox',{name:'Departamento',exact:true}).selectOption('la-libertad');await expect(page.getByRole('combobox',{name:'Municipio',exact:true})).toHaveValue('');await expect(page.getByRole('combobox',{name:'Distrito',exact:true})).toHaveValue('');
    await page.getByRole('combobox',{name:'Municipio',exact:true}).selectOption('la-libertad-este');await page.getByRole('combobox',{name:'Distrito',exact:true}).selectOption('la-libertad-este--antiguo-cuscatlan');await page.getByRole('combobox',{name:'Municipio',exact:true}).selectOption('la-libertad-sur');await expect(page.getByRole('combobox',{name:'Distrito',exact:true})).toHaveValue('');
    await page.evaluate(id=>localStorage.setItem('petshop_cart',JSON.stringify([{id,color:'',qty:1}])),uiId);await page.reload();
    await page.getByRole('combobox',{name:'Departamento',exact:true}).selectOption('san-salvador');await page.getByRole('combobox',{name:'Municipio',exact:true}).selectOption('san-salvador-centro');await page.getByRole('combobox',{name:'Distrito',exact:true}).selectOption(address.districtId);await page.getByLabel('Dirección exacta',{exact:true}).fill(address.exactAddress);
    await page.getByRole('button',{name:'Calcular entrega y total',exact:true}).click();await expect(page.getByRole('status').filter({hasText:'tarifa de envío'})).toBeVisible();await expect(page.getByRole('button',{name:'Pagar con Wompi',exact:true})).toBeDisabled();
    const session=await context.newCDPSession(page);await session.send('Browser.setPermission',{permission:{name:'geolocation'},setting:'denied',origin});
    await page.getByRole('button',{name:'Obtener mi ubicación',exact:true}).click();await expect(page.getByRole('status').filter({hasText:'No se concedió permiso'})).toBeVisible();await expect(page.getByLabel('Dirección exacta',{exact:true})).toHaveValue(address.exactAddress);
    await context.grantPermissions(['geolocation'],{origin});
    await page.route('**/api/checkout/location',route=>route.fulfill({status:503,contentType:'application/json',body:JSON.stringify({error:'Mapa no disponible. Completa la dirección manualmente.'})}));
    await page.getByRole('button',{name:'Obtener mi ubicación',exact:true}).click();await expect(page.getByRole('status').filter({hasText:'Mapa no disponible'})).toBeVisible();await expect(page.getByLabel('Dirección exacta',{exact:true})).toHaveValue(address.exactAddress);
    await page.unroute('**/api/checkout/location');await page.route('**/api/checkout/location',route=>route.fulfill({status:200,contentType:'application/json',body:JSON.stringify({suggestion:full})}));
    await page.getByRole('combobox',{name:'Departamento',exact:true}).selectOption('');await page.getByLabel('Dirección exacta',{exact:true}).fill('Dirección manual que se conserva hasta confirmar.');
    await page.getByRole('button',{name:'Obtener mi ubicación',exact:true}).click();await expect(page.getByRole('button',{name:'Confirmar y usar sugerencia',exact:true})).toBeVisible();await expect(page.getByRole('combobox',{name:'Departamento',exact:true})).toHaveValue('');await expect(page.getByLabel('Dirección exacta',{exact:true})).toHaveValue('Dirección manual que se conserva hasta confirmar.');
    await page.getByRole('button',{name:'Confirmar y usar sugerencia',exact:true}).click();await expect(page.getByRole('combobox',{name:'Departamento',exact:true})).toHaveValue('san-salvador');await expect(page.getByRole('combobox',{name:'Distrito',exact:true})).toHaveValue(address.districtId);await expect(page.getByLabel('Dirección exacta',{exact:true})).toHaveValue(address.exactAddress);
    await page.getByLabel('Punto de referencia (opcional)',{exact:true}).fill('Referencia editable de prueba');
    await page.getByRole('radio',{name:'Recogida en tienda',exact:true}).check();await expect(page.getByLabel('Dirección exacta',{exact:true})).toHaveCount(0);await page.getByRole('button',{name:'Calcular entrega y total',exact:true}).click();await expect(page.getByRole('status').filter({hasText:'recogida está disponible'})).toBeVisible();
    await page.getByRole('radio',{name:'Entrega a domicilio',exact:true}).check();await page.getByRole('button',{name:'Calcular entrega y total',exact:true}).click();
    await page.evaluate(()=>{(document.activeElement as HTMLElement)?.blur();window.scrollTo({top:0,behavior:'instant'});});await page.screenshot({path:`artifacts/checkout/form-${width}.png`,fullPage:true});expect(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth)).toBe(false);
    await page.goto(`/website/order?id=${uncertain.id}&esAprobada=true`);await expect(page.getByRole('heading',{name:'Pago pendiente',exact:true})).toBeVisible();assert.equal((await getOrder(users[0],uncertain.id)).status,'pending');
    if(width===1440){
      await page.goto(`/website/order?id=${noLink.id}`);await expect(page.getByRole('heading',{name:'Pago fallido',exact:true})).toBeVisible();
      await page.goto(`/website/order?id=${pickup.id}`);await expect(page.getByRole('heading',{name:'Intento vencido',exact:true})).toBeVisible();
      await page.goto(`/website/order?id=${review.id}`);await expect(page.getByRole('heading',{name:'Pago aprobado · Entrega en revisión',exact:true})).toBeVisible();
      await page.screenshot({path:'artifacts/checkout/late-payment-review.png',fullPage:true});
    }
    await page.goto(`/website/order?id=${held.id}&esAprobada=true`);
    if(owner.id===users[0].id){await expect(page.getByRole('heading',{name:'Pago pendiente',exact:true})).toBeVisible();assert.equal((await getOrder(owner,held.id)).status,'pending');}
    else assert.equal((await page.request.get(`/api/checkout/orders/${held.id}`)).status(),404);
    await page.goto(`/website/order?id=${ready.id}`);await expect(page.getByRole('heading',{name:'Pago aprobado',exact:true})).toBeVisible();await page.screenshot({path:`artifacts/checkout/approved-${width}.png`,fullPage:true});
    expect(errors).toEqual([]);await context.close();
    checks.push(`UI ${width}px: login devuelve al checkout, formulario manual, listas dependientes y limpieza, tarifas ausentes bloquean, permiso denegado y mapa caído conservan datos, geolocalización requiere confirmación, edición posterior, recogida sin dirección y estado de pedido privado/aprobado.`);
  }
  const api=await request.newContext({baseURL});
  try {
    await api.post('/api/auth/login',{data:{email:users[0].email,password},headers:{Origin:origin}});
    const invalid=await api.post('/api/checkout/quote',{data:{...input(uiId),address:{...address,departmentId:'ahuachapan'}},headers:{Origin:origin}});assert.equal(invalid.status(),400);
    assert.equal((await api.post('/api/checkout/pay',{data:input(uiId),headers:{Origin:origin}})).status(),503);
    assert.equal((await api.post('/api/wompi/webhook',{data:'{}',headers:{wompi_hash:'0'.repeat(64),'Content-Type':'application/json'}})).status(),401);
  } finally {await api.dispose();}
  assert.equal((await pool.query('SELECT count(*)::int AS n FROM catalog_products WHERE stock<0 OR reserved_stock<0 OR reserved_stock>stock')).rows[0].n,0);
  assert.deepEqual((await pool.query('SELECT id,name,price,stock,reserved_stock FROM catalog_products WHERE NOT (id=ANY($1::text[])) ORDER BY id',[ids])).rows,baseline);
  await writeFile('artifacts/checkout/verification.json',JSON.stringify({baseURL,checks,externalPaymentTested:false,missing:['WOMPI_CLIENT_ID','WOMPI_CLIENT_SECRET','negocio Wompi en desarrollo','tarifas e instrucciones de recogida confirmadas','URL pública HTTPS','GOOGLE_MAPS_API_KEY (opcional)']},null,2));console.log(checks.join('\n'));
} finally {
  await browser.close();
  const orders=(await pool.query<{id:string}>('SELECT id FROM shop_orders WHERE user_id=ANY($1::uuid[])',[users.map(user=>user.id)])).rows.map(row=>row.id);
  await pool.query('DELETE FROM shop_payment_events WHERE order_id=ANY($1::uuid[])',[orders]);await pool.query('DELETE FROM shop_order_items WHERE order_id=ANY($1::uuid[])',[orders]);await pool.query('DELETE FROM shop_orders WHERE id=ANY($1::uuid[])',[orders]);
  await pool.query('UPDATE catalog_products SET reserved_stock=0 WHERE id=ANY($1::text[])',[ids]);await pool.query('DELETE FROM inventory_movements WHERE product_id=ANY($1::text[])',[ids]);await pool.query('DELETE FROM catalog_products WHERE id=ANY($1::text[])',[ids]);await pool.query('DELETE FROM users WHERE id=ANY($1::uuid[])',[users.map(user=>user.id)]);
  for(const[key,value]of Object.entries(originalEnv)){if(value===undefined)delete process.env[key];else process.env[key]=value;}await pool.end();
}
