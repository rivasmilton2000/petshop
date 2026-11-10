import type { GetServerSideProps, InferGetServerSidePropsType } from 'next';
import Link from 'next/link';
import { useState } from 'react';
import { Layout } from '@/components/Layout';
import { useCart } from '@/components/Cart';
import { categories, productImage, formatPrice, type Product } from './data/products';
import { publicProductById } from '@/server/catalog';

export const getServerSideProps: GetServerSideProps<{ product: Product }> = async ({ query, res }) => {
  res.setHeader('Cache-Control', 'no-store');
  const id = query.id === undefined ? 'adjustable-eco-collar' : query.id;
  const product = typeof id === 'string' ? await publicProductById(id) : null;
  return product ? { props: { product } } : { notFound: true };
};

export default function ProductDetail({ product }: InferGetServerSidePropsType<typeof getServerSideProps>) {
  // Una nueva ruta de producto monta un formulario independiente.
  return <ProductView key={product.id} product={product} />;
}

function ProductView({ product: initialProduct }: { product: Product }) {
  const [product, setProduct] = useState(initialProduct);
  const [retired, setRetired] = useState(false);
  const [busy, setBusy] = useState(false);
  const cart = useCart();
  const [color, setColor] = useState('');
  const [image, setImage] = useState(product.image);
  const [qty, setQty] = useState(1);
  const [error, setError] = useState('');
  const limit = Math.max(1, Math.min(99, product.stock));
  const unavailable = retired || product.stock === 0 || product.price === null;
  const clamp = (n: number) => Math.max(1, Math.min(limit, n));
  return <Layout page="product" title={product.name} description={`${product.name}. Descubre el catálogo de LILAC & TOFFEE.`}>
    <div className="product-page"><div className="product-page__wrap"><nav className="breadcrumbs" aria-label="Ruta de navegación"><ol><li><Link href="/">Inicio</Link></li><li><Link href={`/website/shop?cat=${product.category}`}>{categories[product.category]}</Link></li><li aria-current="page">{product.name}</li></ol></nav>
      <div className="product-layout"><div className="gallery">{product.colors && <ul className="gallery__thumbs" aria-label="Imágenes del producto">{product.colors.map((variant) => <li key={variant.name}><button className={`gallery__thumb ${image === variant.image ? 'is-active' : ''}`} type="button" aria-pressed={image === variant.image} aria-label={`Ver ${product.name.toLocaleLowerCase('es')} en ${variant.name.toLocaleLowerCase('es')}`} onClick={() => { setImage(variant.image); setColor(variant.name); setError(''); }}><img src={productImage(variant.image)} alt="" width="120" height="120" /></button></li>)}</ul>}<figure className="gallery__main"><img src={productImage(image)} alt={`${product.name}${color ? ` — ${color}` : ''}`} width="800" height="800" /></figure></div>
        <div className="buybox"><p className="eyebrow">Para su día a día</p><h1 className="buybox__title">{product.name}</h1><p className="product-price">{formatPrice(product.price)}</p><p className="catalog-note" role="status">{retired ? 'Producto retirado' : product.stock === 0 ? 'Agotado' : `${product.stock} unidades disponibles`}</p><p className="buybox__desc">{product.description}</p>
          <form className="buybox__form" onSubmit={async (event) => {
            event.preventDefault(); if (unavailable || busy) return;
            if (product.colors?.length && !color) { setError('Elige un color para continuar.'); return; }
            if (!Number.isInteger(qty) || qty < 1 || qty > limit) { setError('Indica una cantidad entera dentro del stock disponible.'); return; }
            setError(''); setBusy(true);
            try { await cart.add({ id: product.id, color, qty }, product); }
            catch (error) {
              setError((error as Error).message);
              try { const response = await fetch('/api/catalog', { cache: 'no-store' }); if (response.ok) { const data = await response.json(); const updated = data.products.find((row: Product) => row.id === product.id); if (updated) setProduct(updated); else setRetired(true); } } catch { /* Keep the stock validation error visible. */ }
            } finally { setBusy(false); }
          }}>
            {product.colors && <fieldset className="variant-field"><legend>Color</legend><div className="variant-options">{product.colors.map((variant) => <label key={variant.name}><input type="radio" name="color" value={variant.name} checked={color === variant.name} onChange={() => { setColor(variant.name); setImage(variant.image); setError(''); }} />{variant.name}</label>)}</div></fieldset>}
            <div className="field"><label className="field__label" htmlFor="qty-input">Cantidad</label><div className="qty"><button className="qty__btn" type="button" aria-label="Disminuir cantidad" disabled={unavailable || busy} onClick={() => setQty(clamp(qty - 1))}>−</button><input className="qty__input" id="qty-input" type="number" min="1" max={limit} step="1" disabled={unavailable || busy} value={Number.isNaN(qty) ? '' : qty} onChange={(event) => setQty(event.target.valueAsNumber)} inputMode="numeric" /><button className="qty__btn" type="button" aria-label="Aumentar cantidad" disabled={unavailable || busy} onClick={() => setQty(clamp(qty + 1))}>+</button></div></div>
            {error && <p className="form-error" role="alert">{error}</p>}<button className="btn btn--wine" type="submit" disabled={!cart.ready || unavailable || busy}>{busy ? 'Comprobando…' : retired ? 'Producto retirado' : product.stock === 0 ? 'Agotado' : 'Añadir al carrito'}</button><p className="demo-note">El stock y el precio se verifican de nuevo en el servidor. El carrito no reserva productos.</p>
          </form>
          <div className="product-information"><details><summary>Información del producto</summary><p>Las imágenes proceden de la plantilla. Las especificaciones, tallas y materiales se publicarán con el catálogo confirmado.</p></details><details id="returns"><summary>Devoluciones</summary><p>Las condiciones de cambios y devoluciones están pendientes de confirmación.</p></details><details id="shipping"><summary>Información de envíos</summary><p>El costo de envío se calcula en el checkout según el destino y las tarifas confirmadas. Si no existe una tarifa para tu destino, no se habilita el pago.</p></details></div>
        </div></div>
    </div></div>
  </Layout>;
}
