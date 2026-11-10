import type { GetServerSideProps } from 'next';
import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/router';
import { Layout } from '@/components/Layout';
import { useCart } from '@/components/Cart';
import { territories } from '@/data/el-salvador';
import { getSessionUser } from '@/server/auth';
import { wompiAvailability } from '@/server/wompi';
import { formatPrice, productImage } from './data/products';
import type { SessionUser } from '@/types/auth';
import type { CheckoutInput, CheckoutQuote, DeliveryAddress, LocationSuggestion, OrderView } from '@/types/checkout';

export const getServerSideProps: GetServerSideProps = async ({ req,res })=>{
  res.setHeader('Cache-Control','private, no-store');
  const user=await getSessionUser(req);
  if (!user) return {redirect:{destination:'/login?next=/website/checkout',permanent:false}};
  return {props:{user,paymentReady:wompiAvailability().ready}};
};
const blankAddress: DeliveryAddress={departmentId:'',municipalityId:'',districtId:'',exactAddress:'',reference:''};
async function post<T>(path:string,body:unknown):Promise<T> {
  const response=await fetch(path,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)});
  const data=await response.json(); if(!response.ok) throw new Error(data.error ?? 'No pudimos completar la solicitud.'); return data;
}
export default function Checkout({user,paymentReady}:{user:SessionUser;paymentReady:boolean}) {
  const cart=useCart(); const router=useRouter();
  const [fulfillment,setFulfillment]=useState<'delivery'|'pickup'>('delivery');
  const [name,setName]=useState(user.name); const [phone,setPhone]=useState('');
  const [address,setAddress]=useState<DeliveryAddress>(blankAddress);
  const [estimate,setEstimate]=useState<CheckoutQuote|null>(null);
  const [busy,setBusy]=useState(false); const [error,setError]=useState('');
  const [locating,setLocating]=useState(false); const [locationMessage,setLocationMessage]=useState('');
  const [suggestion,setSuggestion]=useState<{fields:LocationSuggestion;coordinates:DeliveryAddress['location']}|null>(null);
  const key=useRef<string|null>(null); const generation=useRef(0); const geoGeneration=useRef(0);
  const department=territories.find(department=>department.id===address.departmentId);
  const municipality=department?.municipalities.find(municipality=>municipality.id===address.municipalityId);
  const payload: CheckoutInput={items:cart.items,fulfillment,recipientName:name,phone,address:fulfillment==='delivery'?address:null};
  const invalidate=()=>{++generation.current;key.current=null;setEstimate(null);setError('');};
  useEffect(()=>{invalidate();},[JSON.stringify(cart.items)]);
  const editAddress=(change:Partial<DeliveryAddress>)=>{
    ++geoGeneration.current;setSuggestion(null);setLocating(false);setAddress(current=>({...current,...change,...(Object.keys(change).some(key=>key!=='reference')?{location:undefined}:{})}));invalidate();
  };
  const locate=()=>{
    if(!window.isSecureContext || !navigator.geolocation){setLocationMessage('La ubicación necesita HTTPS o localhost y un navegador compatible. Puedes completar la dirección manualmente.');return;}
    const current=++geoGeneration.current;setLocating(true);setSuggestion(null);setLocationMessage('Solicitando ubicación. Solo se usará después de que la confirmes.');
    navigator.geolocation.getCurrentPosition(async position=>{
      if(current!==geoGeneration.current)return;
      const {latitude,longitude,accuracy}=position.coords;
      try {
        const result=await post<{suggestion:LocationSuggestion}>('/api/checkout/location',{latitude,longitude,accuracy});
        if(current!==geoGeneration.current)return;
        setSuggestion({fields:result.suggestion,coordinates:{latitude,longitude,accuracy,confirmed:true}});setLocationMessage(result.suggestion.message);
      } catch(error){if(current===geoGeneration.current)setLocationMessage((error as Error).message);}
      finally{if(current===geoGeneration.current)setLocating(false);}
    },failure=>{
      if(current!==geoGeneration.current)return;setLocating(false);
      setLocationMessage(failure.code===1?'No se concedió permiso de ubicación. Completa la dirección manualmente.':failure.code===3?'La ubicación tardó demasiado. Puedes intentarlo otra vez o completar la dirección manualmente.':'No pudimos obtener una ubicación precisa. El formulario manual sigue disponible.');
    },{enableHighAccuracy:true,timeout:15000,maximumAge:0});
  };
  const calculate=async()=>{
    const current=++generation.current;setBusy(true);setError('');setEstimate(null);
    try {const quote=await post<CheckoutQuote>('/api/checkout/quote',payload);if(current===generation.current)setEstimate(quote);}
    catch(error){if(current===generation.current)setError((error as Error).message);}
    finally{setBusy(false);}
  };
  const pay=async()=>{
    if(busy || !estimate?.shipping.available || !estimate.wompiReady)return;
    setBusy(true);setError('');key.current ??= crypto.randomUUID();
    try {
      const result=await post<{order:OrderView}>('/api/checkout/pay',{...payload,idempotencyKey:key.current});
      if(result.order.paymentUrl) window.location.assign(result.order.paymentUrl);
      else await router.push(`/website/order?id=${result.order.id}`);
    } catch(error){setError((error as Error).message);}
    finally{setBusy(false);}
  };
  return <Layout page="checkout" title="Finalizar compra" description="Elige cómo recibir tu pedido y paga de forma segura con Wompi de Banco Agrícola.">
    <div className="checkout-page container"><nav className="breadcrumbs" aria-label="Ruta de navegación"><ol><li><Link href="/website/shop">Tienda</Link></li><li aria-current="page">Finalizar compra</li></ol></nav>
      <p className="eyebrow">Un paso más cerca de sus favoritos</p><h1>Finalizar compra</h1>
      <div className="checkout-grid"><form className="checkout-card checkout-form" id="checkout-form" onSubmit={event=>{event.preventDefault();void calculate();}}>
        <h2>Cómo quieres recibirlo</h2><fieldset className="checkout-options" disabled={busy}><legend>Entrega</legend><label><input type="radio" name="fulfillment" checked={fulfillment==='delivery'} onChange={()=>{setFulfillment('delivery');invalidate();}} />Entrega a domicilio</label><label><input type="radio" name="fulfillment" checked={fulfillment==='pickup'} onChange={()=>{setFulfillment('pickup');invalidate();++geoGeneration.current;setSuggestion(null);setLocating(false);}} />Recogida en tienda</label></fieldset>
        <fieldset disabled={busy} className="checkout-fields"><legend>Datos de contacto</legend><label htmlFor="recipient-name">Nombre de quien recibe<input id="recipient-name" autoComplete="name" required minLength={2} maxLength={80} value={name} onChange={event=>{setName(event.target.value);invalidate();}} /></label><label htmlFor="recipient-phone">Teléfono de contacto (opcional)<input id="recipient-phone" type="tel" autoComplete="tel" maxLength={25} value={phone} onChange={event=>{setPhone(event.target.value);invalidate();}} /></label><p className="demo-note">La confirmación se asociará a tu cuenta: {user.email}.</p></fieldset>
        {fulfillment==='delivery'?<fieldset disabled={busy} className="checkout-fields"><legend>Dirección de envío</legend>
          <p className="demo-note">Selecciona tu departamento, municipio y distrito. La ubicación es opcional.</p>
          <button className="checkout-secondary" type="button" disabled={locating} onClick={locate}>{locating?'Buscando ubicación…':'Obtener mi ubicación'}</button>
          {locationMessage&&<p className="checkout-location-message" role="status">{locationMessage}</p>}
          {suggestion&&<div className="location-suggestion" aria-label="Sugerencia de ubicación"><h3>Revisa antes de usarla</h3><p>{territories.find(d=>d.id===suggestion.fields.departmentId)?.name ?? 'Departamento por confirmar'} · {territories.flatMap(d=>d.municipalities).find(m=>m.id===suggestion.fields.municipalityId)?.name ?? 'Municipio por confirmar'} · {territories.flatMap(d=>d.municipalities.flatMap(m=>m.districts)).find(d=>d.id===suggestion.fields.districtId)?.name ?? 'Distrito por confirmar'}</p>{suggestion.fields.exactAddress&&<p>{suggestion.fields.exactAddress}</p>}<p className="demo-note">Precisión aproximada: {Math.round(suggestion.coordinates?.accuracy ?? 0)} m. Podrás editar todos los campos.</p><div className="checkout-actions"><button type="button" className="checkout-secondary" onClick={()=>{
            const fields=suggestion.fields;
            setAddress(current=>{
              const departmentId=fields.departmentId ?? current.departmentId;
              const parent=territories.find(d=>d.id===departmentId);
              const municipalityId=fields.municipalityId ?? (parent?.municipalities.some(m=>m.id===current.municipalityId)?current.municipalityId:'');
              const districtId=fields.districtId ?? (parent?.municipalities.find(m=>m.id===municipalityId)?.districts.some(d=>d.id===current.districtId)?current.districtId:'');
              return {...current,departmentId,municipalityId,districtId,...(fields.exactAddress?{exactAddress:fields.exactAddress}:{}),location:suggestion.coordinates};
            });invalidate();setSuggestion(null);setLocationMessage('Sugerencia confirmada. Revisa los datos y completa cualquier detalle que falte.');
          }}>Confirmar y usar sugerencia</button><button type="button" className="text-button" onClick={()=>{setSuggestion(null);setLocationMessage('Sugerencia descartada. Puedes continuar manualmente.');}}>Descartar</button></div><p className="maps-attribution" translate="no">Google Maps</p></div>}
          <div className="checkout-field"><label htmlFor="shipping-department">Departamento</label><select id="shipping-department" required value={address.departmentId} onChange={event=>editAddress({departmentId:event.target.value,municipalityId:'',districtId:''})}><option value="">Selecciona un departamento</option>{territories.map(department=><option key={department.id} value={department.id}>{department.name}</option>)}</select></div>
          <div className="checkout-field"><label htmlFor="shipping-municipality">Municipio</label><select id="shipping-municipality" required disabled={!department || busy} value={address.municipalityId} onChange={event=>editAddress({municipalityId:event.target.value,districtId:''})}><option value="">Selecciona un municipio</option>{department?.municipalities.map(municipality=><option key={municipality.id} value={municipality.id}>{municipality.name}</option>)}</select></div>
          <div className="checkout-field"><label htmlFor="shipping-district">Distrito</label><select id="shipping-district" required disabled={!municipality || busy} value={address.districtId} onChange={event=>editAddress({districtId:event.target.value})}><option value="">Selecciona un distrito</option>{municipality?.districts.map(district=><option key={district.id} value={district.id}>{district.name}</option>)}</select></div>
          <div className="checkout-field"><label htmlFor="shipping-address">Dirección exacta</label><textarea id="shipping-address" required minLength={10} maxLength={500} rows={3} autoComplete="street-address" value={address.exactAddress} onChange={event=>editAddress({exactAddress:event.target.value})} placeholder="Colonia, calle, número de casa o apartamento" /></div><label htmlFor="shipping-reference">Punto de referencia (opcional)<input id="shipping-reference" maxLength={300} value={address.reference} onChange={event=>editAddress({reference:event.target.value})} /></label>
          {address.location&&<div><p className="demo-note">Ubicación confirmada incluida como referencia opcional. La dirección escrita determina la entrega.</p><p className="maps-attribution" translate="no">Google Maps</p></div>}
        </fieldset>:<p className="checkout-location-message">No necesitas dirección para recoger en tienda. Las instrucciones y la tarifa confirmadas aparecerán en el resumen.</p>}
        <button className="btn btn--wine" type="submit" disabled={busy || !cart.ready || !cart.items.length}>{busy?'Comprobando…':'Calcular entrega y total'}</button>
      </form>
      <aside className="checkout-card checkout-summary" aria-labelledby="checkout-summary-title"><h2 id="checkout-summary-title">Tu pedido</h2>{!cart.items.length?<p>Tu carrito está vacío. <Link href="/website/shop">Volver a la tienda</Link></p>:<ul className="checkout-items">{cart.items.map(item=>{const product=estimate?.cart.products.find(product=>product.id===item.id) ?? cart.products.find(product=>product.id===item.id);return <li key={JSON.stringify([item.id,item.color])}>{product&&<img src={productImage(product.image)} alt="" width="64" height="64" />}<div><strong>{product?.name ?? item.id}</strong><p>{item.color&&`${item.color} · `}Cantidad: {item.qty}</p>{product&&<p>{formatPrice(product.price)}</p>}</div></li>;})}</ul>}
        {error&&<p className="form-error" role="alert">{error}</p>}
        {estimate&&<><dl className="checkout-totals"><div><dt>Productos</dt><dd>{formatPrice(estimate.cart.totalCents/100)}</dd></div><div><dt>{fulfillment==='delivery'?'Envío':'Recogida'}</dt><dd>{estimate.shipping.feeCents===null?'Por confirmar':formatPrice(estimate.shipping.feeCents/100)}</dd></div><div><dt>Total (USD)</dt><dd>{estimate.totalCents===null?'Por confirmar':formatPrice(estimate.totalCents/100)}</dd></div></dl><p className={estimate.shipping.available?'demo-note':'form-error'} role="status">{estimate.shipping.message}</p>{estimate.shipping.instructions&&<p>{estimate.shipping.instructions}</p>}</>}
        {!paymentReady&&<p className="checkout-location-message">El pago con Wompi todavía no está habilitado. Puedes revisar tu selección y completar la dirección.</p>}
        {estimate?.wompiReady&&<p className="demo-note">{estimate.paymentMessage}</p>}
        <button className="btn btn--wine" type="button" onClick={()=>{if(document.getElementById('checkout-form') instanceof HTMLFormElement && !(document.getElementById('checkout-form') as HTMLFormElement).reportValidity())return;void pay();}} disabled={busy || !estimate?.shipping.available || !estimate?.wompiReady || !cart.items.length}>Pagar con Wompi</button>
        <p className="demo-note">Al continuar reservaremos las unidades temporalmente. Ingresarás los datos de tu tarjeta únicamente en la página segura de Wompi. El pedido se confirma después de verificar el pago en el servidor.</p><Link className="text-button" href="/dashboard?section=orders">Consultar mis pedidos y pagos pendientes</Link><Link className="text-button" href="/website/shop">Seguir comprando</Link>
      </aside></div>
    </div>
  </Layout>;
}
