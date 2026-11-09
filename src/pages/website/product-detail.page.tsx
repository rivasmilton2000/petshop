import type { GetServerSideProps, InferGetServerSidePropsType } from 'next';
import Link from 'next/link';
import { useState } from 'react';
import { Layout } from '@/components/Layout';
import { useCart } from '@/components/Cart';
import { categories, products, productImage, type Product } from './data/products';

export const getServerSideProps: GetServerSideProps<{ product: Product }> = async ({ query }) => {
  const id = query.id === undefined ? 'adjustable-eco-collar' : query.id;
  const product = typeof id === 'string' ? products.find((p) => p.id === id) : undefined;
  return product ? { props: { product } } : { notFound: true };
};

export default function ProductDetail({ product }: InferGetServerSidePropsType<typeof getServerSideProps>) {
  // Una nueva ruta de producto monta un formulario independiente.
  return <ProductView key={product.id} product={product} />;
}

function ProductView({ product }: { product: Product }) {
  const cart = useCart();
  const [color, setColor] = useState('');
  const [image, setImage] = useState(product.image);
  const [qty, setQty] = useState(1);
  const [error, setError] = useState('');
  const clamp = (n: number) => Math.max(1, Math.min(99, Number.isFinite(n) ? Math.floor(n) : 1));
  return <Layout page="product" title={product.name} description={`${product.name}. Explora esta idea del catálogo de ejemplo de LILAC & TOFFEE - PET SHOP.`}>
    <div className="product-page"><div className="product-page__wrap"><nav className="breadcrumbs" aria-label="Ruta de navegación"><ol><li><Link href="/">Inicio</Link></li><li><Link href={`/website/shop?cat=${product.category}`}>{categories[product.category]}</Link></li><li aria-current="page">{product.name}</li></ol></nav>
      <div className="product-layout"><div className="gallery">{product.colors && <ul className="gallery__thumbs" aria-label="Imágenes del producto">{product.colors.map((variant) => <li key={variant.name}><button className={`gallery__thumb ${image === variant.image ? 'is-active' : ''}`} type="button" aria-pressed={image === variant.image} aria-label={`Ver ${product.name.toLocaleLowerCase('es')} en ${variant.name.toLocaleLowerCase('es')}`} onClick={() => { setImage(variant.image); setColor(variant.name); setError(''); }}><img src={productImage(variant.image)} alt="" width="120" height="120" /></button></li>)}</ul>}<figure className="gallery__main"><img src={productImage(image)} alt={`${product.name}${color ? ` — ${color}` : ''}`} width="800" height="800" /></figure></div>
        <div className="buybox"><p className="eyebrow">Selección de ejemplo</p><h1 className="buybox__title">{product.name}</h1><p className="catalog-note">Precio y disponibilidad pendientes de confirmación.</p><p className="buybox__desc">{product.description}</p>
          <form className="buybox__form" onSubmit={(event) => { event.preventDefault(); if (product.colors && !color) { setError('Elige un color para continuar.'); return; } setError(''); cart.add({ id: product.id, color, qty: clamp(qty) }); }}>
            {product.colors && <fieldset className="variant-field"><legend>Color</legend><div className="variant-options">{product.colors.map((variant) => <label key={variant.name}><input type="radio" name="color" value={variant.name} checked={color === variant.name} onChange={() => { setColor(variant.name); setImage(variant.image); setError(''); }} />{variant.name}</label>)}</div></fieldset>}
            <div className="field"><label className="field__label" htmlFor="qty-input">Cantidad</label><div className="qty"><button className="qty__btn" type="button" aria-label="Disminuir cantidad" onClick={() => setQty(clamp(qty - 1))}>−</button><input className="qty__input" id="qty-input" type="number" min="1" max="99" value={qty} onChange={(event) => setQty(clamp(event.target.valueAsNumber))} inputMode="numeric" /><button className="qty__btn" type="button" aria-label="Aumentar cantidad" onClick={() => setQty(clamp(qty + 1))}>+</button></div></div>
            {error && <p className="form-error" role="alert">{error}</p>}<button className="btn btn--wine" type="submit">Añadir al carrito de ejemplo</button><p className="demo-note">Esta selección no crea un pedido ni reserva productos.</p>
          </form>
          <div className="product-information"><details><summary>Información del producto</summary><p>Las imágenes proceden de la plantilla. Las especificaciones, tallas y materiales se publicarán con el catálogo confirmado.</p></details><details id="returns"><summary>Devoluciones</summary><p>Las condiciones de cambios y devoluciones están pendientes de confirmación.</p></details><details id="shipping"><summary>Información de envíos</summary><p>Las zonas, los costos y los tiempos de entrega están pendientes de confirmación.</p></details></div>
        </div></div>
    </div></div>
  </Layout>;
}
