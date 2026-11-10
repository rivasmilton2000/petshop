import type { GetServerSideProps } from 'next';
import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/router';
import { Layout } from '@/components/Layout';
import { useCart } from '@/components/Cart';
import { getSessionUser } from '@/server/auth';
import { getOrder, isUUID } from '@/server/orders';
import { HttpError } from '@/server/api';
import { getDatabase } from '@/server/db';
import { formatPrice, productImage } from './data/products';
import type { OrderView } from '@/types/checkout';

export const getServerSideProps: GetServerSideProps = async({req,res,query})=>{
  res.setHeader('Cache-Control','private, no-store');
  if(!isUUID(query.id))return{notFound:true};
  const user=await getSessionUser(req);
  if(!user)return{redirect:{destination:`/login?next=${encodeURIComponent(`/website/order?id=${query.id}`)}`,permanent:false}};
  try{
    const initialOrder=await getOrder(user,query.id);
    const canClearCart=user.role!=='administrador' || Boolean((await getDatabase().query('SELECT 1 FROM shop_orders WHERE id=$1 AND user_id=$2',[query.id,user.id])).rowCount);
    return{props:{initialOrder,canClearCart}};
  }
  catch(error){if(error instanceof HttpError&&error.status===404)return{notFound:true};throw error;}
};
const states={pending:['Pago pendiente','Estamos esperando la confirmación de Wompi. Volver a esta página no confirma el pago.'],paid:['Pago aprobado','El servidor verificó el pago. Tu pedido está confirmado.'],failed:['Pago fallido','El pago no se completó y liberamos las unidades reservadas. Puedes revisar tu selección e iniciar un pedido nuevo.'],expired:['Intento vencido','La reserva venció y se liberaron las unidades. Si ya pagaste, actualiza el estado: comprobaremos la confirmación con Wompi.'],paid_review:['Pago aprobado · Entrega en revisión','Wompi confirmó el pago, pero el pedido necesita revisión de la tienda antes de preparar la entrega. No vuelvas a pagarlo.']} as const;
export default function Order({initialOrder,canClearCart}:{initialOrder:OrderView;canClearCart:boolean}){
  const [order,setOrder]=useState(initialOrder);const [message,setMessage]=useState('');const [busy,setBusy]=useState(false);
  const cart=useCart();const router=useRouter();const attempts=useRef(0);const refreshing=useRef(false);
  const refresh=async(useRedirect=false)=>{
    if(refreshing.current)return;refreshing.current=true;setBusy(true);
    const keys=['identificadorEnlaceComercio','idTransaccion','idEnlace','monto','hash'];
    const proof=useRedirect&&keys.every(key=>typeof router.query[key]==='string')?Object.fromEntries(keys.map(key=>[key,router.query[key]])):undefined;
    try{const response=await fetch(`/api/checkout/orders/${order.id}`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(proof?{redirect:proof}:{})});const result=await response.json();if(!response.ok)throw new Error(result.error ?? 'No pudimos actualizar el estado.');setOrder(result.order);setMessage(result.message ?? 'Estado actualizado desde el servidor.');}
    catch(error){setMessage((error as Error).message);}finally{setBusy(false);refreshing.current=false;}
  };
  useEffect(()=>{if(!['paid','paid_review'].includes(order.status))void refresh(true);},[]);
  useEffect(()=>{
    if(order.status!=='pending')return;
    const timer=setInterval(()=>{if(!document.hidden&&attempts.current++<12)void refresh();},10000);
    return()=>clearInterval(timer);
  },[order.id,order.status]);
  useEffect(()=>{if(canClearCart&&cart.ready&&['paid','paid_review'].includes(order.status))cart.completeOrder(order.id,order.items);},[order.id,order.status,cart.ready,canClearCart]);
  const [title,description]=states[order.status];
  return <Layout page="order" title={title} description="Consulta el estado verificado de tu pedido de LILAC & TOFFEE."><div className="checkout-page container"><p className="eyebrow">Tu pedido</p><section className={`checkout-card order-state order-state--${order.status}`} aria-labelledby="order-title"><h1 id="order-title">{title}</h1><p>{description}</p><p className="demo-note">Referencia: {order.id}</p>{order.status==='pending'&&<p className="demo-note">La reserva vence el {new Intl.DateTimeFormat('es-SV',{dateStyle:'medium',timeStyle:'short',timeZone:'America/El_Salvador'}).format(new Date(order.expiresAt))}.</p>}
    {order.paymentMode==='test'&&<p className="checkout-location-message">Modo de prueba de Wompi. Este pedido no representa un cobro real.</p>}
    <div className="checkout-actions"><button className="checkout-secondary" type="button" disabled={busy} onClick={()=>void refresh()}>{busy?'Verificando…':'Actualizar estado'}</button>{order.status==='pending'&&order.paymentUrl&&<a className="btn btn--wine" href={order.paymentUrl}>Continuar pago en Wompi</a>}{['failed','expired'].includes(order.status)&&<Link className="btn btn--wine" href="/website/checkout">Revisar selección</Link>}<Link className="text-button" href="/dashboard?section=orders">Ver mis pedidos</Link></div><p role="status">{message}</p>{order.status==='pending'&&order.paymentInitialization==='uncertain'&&<p className="form-error">Estamos verificando si se creó el enlace. No inicies otro pago para este pedido; consulta su estado o espera al vencimiento de la reserva.</p>}</section>
    <div className="checkout-grid"><section className="checkout-card"><h2>{order.fulfillment==='pickup'?'Recogida en tienda':'Dirección de entrega'}</h2><p>{order.recipientName}</p>{order.phone&&<p>{order.phone}</p>}{order.address?<><p>{order.address.department} · {order.address.municipality} · {order.address.district}</p><p>{order.address.exactAddress}</p>{order.address.reference&&<p>Referencia: {order.address.reference}</p>}</>:<p>{order.pickupInstructions}</p>}</section><section className="checkout-card"><h2>Resumen</h2><ul className="checkout-items">{order.items.map(item=><li key={JSON.stringify([item.id,item.color])}><img src={productImage(item.image)} alt="" width="64" height="64" /><div><strong>{item.name}</strong><p>{item.color&&`${item.color} · `}Cantidad: {item.qty} · {formatPrice(item.unitPriceCents/100)}</p></div></li>)}</ul><dl className="checkout-totals"><div><dt>Productos</dt><dd>{formatPrice(order.subtotalCents/100)}</dd></div><div><dt>Entrega</dt><dd>{formatPrice(order.shippingCents/100)}</dd></div><div><dt>Total (USD)</dt><dd>{formatPrice(order.totalCents/100)}</dd></div></dl></section></div></div></Layout>;
}
