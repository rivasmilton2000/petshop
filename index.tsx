import Link from 'next/link';
import { useRef } from 'react';
import { Layout, BRAND } from '@/components/Layout';
import { Motif } from '@/components/Motif';
import { ProductCard } from '@/components/ProductCard';
import { Collar } from '@/components/Collar';
import { ServiceIcon } from '@/components/ServiceIcon';
import type { Product } from '@/pages/website/data/products';

const animalCategories = [
  ['dogs', 'Perros', 'cream', '/img/punto2.jpeg', 'Varios perros acompañados de sus juguetes'],
  ['cats', 'Gatos', 'pink', '/website/img/home/category-cats.jpg', 'Un gato de pelaje naranja'],
  ['small-pets', 'Pequeñas mascotas', 'wine', '/website/img/home/category-small-pets.jpg', 'Un pequeño hámster'],
  ['birds', 'Aves', 'ivory', '/website/img/home/category-birds.jpg', 'Un periquito en una rama'],
];

export default function Home({ products }: { products: Product[] }) {
  const track = useRef<HTMLDivElement>(null);
  return <Layout page="home" title={BRAND} description="LILAC & TOFFEE. Descubre alimentos, juguetes y accesorios para compartir una vida llena de cariño con tu mascota.">
    <section className="home-hero" aria-labelledby="hero-title">
      <img className="home-hero__background" src="/img/punto2.jpeg" alt="" width="1448" height="1086" fetchPriority="high" />
      <div className="home-hero__content"><h1 id="hero-title">Happy Tails Start Here</h1><p>curated essentials for every wag, purr and hop</p><Link className="btn btn--wine home-hero__cta" href="/website/shop">Comprar ahora <span aria-hidden="true">↗</span></Link></div>
    </section>
    <section className="categories" id="shop" aria-labelledby="cat-title"><Collar /><div className="container">
      <p className="eyebrow center">Para cada compañero</p><h2 className="section-title" id="cat-title">Happy Tails Start Here</h2>
      <div className="categories__grid">{animalCategories.map(([slug, name, color, image, alt]) => <Link className={`cat-card cat-card--${color}`} key={slug} href={`/website/shop?cat=${slug}`} aria-label={`Ver productos para ${name.toLocaleLowerCase('es')}`}><span className="cat-card__photo"><img src={image} alt={alt} width="480" height="480" loading="lazy" /></span><span className="cat-card__name">{name}</span></Link>)}</div>
    </div></section>
    <section className="bestsellers" id="best-sellers" aria-labelledby="ideas-title"><div className="container">
      <p className="eyebrow center">Momentos que se disfrutan juntos</p><h2 className="section-title" id="ideas-title">Ideas para consentirlos</h2><p className="section-lead">Del paseo al juego y de vuelta a casa: descubre la selección de nuestra tienda.</p>
      <div className="bestsellers__top"><article className="feature-card"><img src="/img/punto10.jpeg" alt="Terrier jugando con un juguete de cuerda" width="1536" height="1024" loading="lazy" /><div className="feature-card__caption"><span className="pill pill--cream">Tiempo de jugar</span><h3>Más juegos.<br />Más momentos juntos.</h3><Link className="btn btn--wine" href="/website/shop?cat=eco-toys">Explorar juguetes ↗</Link></div></article>{products[1] && <ProductCard product={products[1]} />}</div>
      <div className="carousel"><div className="carousel__controls"><button className="carousel__btn" type="button" aria-label="Ver productos anteriores" onClick={() => track.current?.scrollBy({ left: -600, behavior: 'smooth' })}>←</button><button className="carousel__btn" type="button" aria-label="Ver productos siguientes" onClick={() => track.current?.scrollBy({ left: 600, behavior: 'smooth' })}>→</button></div><div className="carousel__track" ref={track} tabIndex={0} role="region" aria-label="Ideas de productos">{[products[0], products[3], products[4], products[7]].filter(Boolean).map((product) => <ProductCard key={product.id} product={product} />)}</div></div>
      <p className="demo-note center">Consulta el precio y la disponibilidad en cada producto. El stock se verifica al preparar tu selección.</p>
    </div></section>
    <section className="seasonal" id="seasonal"><div className="container seasonal__grid"><article className="seasonal__promo"><Motif kind="heart" /><p className="eyebrow">En casa o de paseo</p><h2>El cariño está en los detalles</h2><p>Accesorios para acompañar sus pequeñas aventuras y disfrutar de cada día a su lado.</p><Link className="btn btn--wine" href="/website/shop?cat=care-accessories">Ver accesorios ↗</Link></article>{[products[6], products[3]].filter(Boolean).map((product) => <ProductCard key={product.id} product={product} />)}</div></section>
    <section className="how" id="how-it-works" aria-labelledby="how-title"><div className="container"><h2 className="section-title" id="how-title">Cómo funciona</h2><div className="how__grid">{[
      ['store', 'Recogida en tienda', 'Visita nuestra tienda física y descubre una selección cuidadosamente elegida de productos esenciales de alta calidad y juguetes ecológicos para tus mascotas.'],
      ['delivery', 'Entregas a domicilio', 'Nos encargamos de toda la logística para que tú solo te preocupes por disfrutar de tu mascota. Ofrecemos envíos seguros y sostenibles para tus compañeros peludos.'],
      ['subscription', 'Beneficios de suscripción', 'Recibe mensualmente nuestros alimentos más vendidos y accesorios inteligentes para el cuidado de tus mascotas, con opciones de recogida local gratuita.'],
    ].map(([kind, title, text]) => <article className="how-card" key={title}><div className="how-card__icon"><ServiceIcon kind={kind as 'store' | 'delivery' | 'subscription'} /></div><h3>{title}</h3><p>{text}</p></article>)}</div></div></section>
  </Layout>;
}