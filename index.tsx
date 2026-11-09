import Link from 'next/link';
import { useRef } from 'react';
import { Layout, BRAND } from '@/components/Layout';
import { Motif } from '@/components/Motif';
import { ProductCard } from '@/components/ProductCard';
import { products } from '@/pages/website/data/products';

const heroPhotos = [
  ['hero-1.jpg', 'Cachorro de pastor australiano'], ['hero-2.jpg', 'Beagle con la lengua fuera'], ['hero-3.jpg', 'Golden retriever al aire libre'], ['hero-4.jpg', 'Corgi sobre un fondo naranja'], ['hero-5.jpg', 'Perro de pelaje blanco y negro'], ['hero-6.jpg', 'Cachorro golden retriever'], ['hero-7.jpg', 'Bulldog francés descansando'],
];
const animalCategories = [
  ['dogs', 'Perros', 'cream', 'category-dogs.jpg', 'Un husky mirando a la cámara'],
  ['cats', 'Gatos', 'pink', 'category-cats.jpg', 'Un gato de pelaje naranja'],
  ['small-pets', 'Pequeñas mascotas', 'wine', 'category-small-pets.jpg', 'Un pequeño hámster'],
  ['birds', 'Aves', 'ivory', 'category-birds.jpg', 'Un periquito en una rama'],
];

export default function Home() {
  const track = useRef<HTMLDivElement>(null);
  return <Layout page="home" title={BRAND} description="Bienvenido a LILAC & TOFFEE - PET SHOP. Explora ideas de alimentación, juguetes y accesorios para compartir una vida llena de cariño con tu mascota.">
    <section className="hero" aria-labelledby="hero-title"><div className="hero__collage">
      {heroPhotos.map(([src, alt], index) => <figure className={`hero__photo hero__photo--${index + 1}`} key={src}><img src={`/website/img/home/${src}`} alt={alt} width="700" height="700" loading={index > 2 ? 'lazy' : 'eager'} /></figure>)}
      <Motif className="hero-motif hero-motif--paw" /><Motif kind="heart" className="hero-motif hero-motif--heart" />
      <div className="hero__card"><p className="eyebrow">Bienvenido a tu pet shop</p><h1 className="hero__title" id="hero-title">Amor en cada huella.</h1><p className="hero__subtitle">Un mundo de ideas para quien alegra tus días.</p><Link className="hero__cta" href="/website/shop">Explorar<br />la tienda <span aria-hidden="true">↗</span></Link></div>
    </div></section>
    <section className="categories" id="shop" aria-labelledby="cat-title"><div className="brand-ribbon" aria-hidden="true"><Motif kind="bone" /><span>Pequeños compañeros. Grandes momentos.</span><Motif kind="heart" /></div><div className="container">
      <p className="eyebrow center">Para cada compañero</p><h2 className="section-title" id="cat-title">Su mundo, a su medida</h2>
      <div className="categories__grid">{animalCategories.map(([slug, name, color, image, alt]) => <Link className={`cat-card cat-card--${color}`} key={slug} href={`/website/shop?cat=${slug}`}><span className="cat-card__photo"><img src={`/website/img/home/${image}`} alt={alt} width="480" height="480" loading="lazy" /></span><span className="cat-card__name">{name}</span><span className="cat-card__hint">Explorar <span aria-hidden="true">↗</span></span></Link>)}</div>
    </div></section>
    <section className="bestsellers" id="best-sellers" aria-labelledby="ideas-title"><div className="container">
      <p className="eyebrow center">Momentos que se disfrutan juntos</p><h2 className="section-title" id="ideas-title">Ideas para consentirlos</h2><p className="section-lead">Del paseo al juego y de vuelta a casa: descubre la selección de ejemplo de nuestra tienda.</p>
      <div className="bestsellers__top"><article className="feature-card"><img src="/website/img/home/hero-2.jpg" alt="Beagle disfrutando al aire libre" width="700" height="700" loading="lazy" /><div className="feature-card__caption"><span className="pill pill--cream">Tiempo de jugar</span><h3>Más juegos.<br />Más momentos juntos.</h3><Link className="btn btn--wine" href="/website/shop?cat=eco-toys">Explorar juguetes ↗</Link></div></article><ProductCard product={products[1]} /></div>
      <div className="carousel"><div className="carousel__controls"><button className="carousel__btn" type="button" aria-label="Ver productos anteriores" onClick={() => track.current?.scrollBy({ left: -600, behavior: 'smooth' })}>←</button><button className="carousel__btn" type="button" aria-label="Ver productos siguientes" onClick={() => track.current?.scrollBy({ left: 600, behavior: 'smooth' })}>→</button></div><div className="carousel__track" ref={track} tabIndex={0} role="region" aria-label="Ideas de productos">{[products[0], products[3], products[4], products[7]].map((product) => <ProductCard key={product.id} product={product} />)}</div></div>
      <p className="demo-note center">Catálogo de ejemplo. Precios y disponibilidad pendientes de confirmación.</p>
    </div></section>
    <section className="seasonal" id="seasonal"><div className="container seasonal__grid"><article className="seasonal__promo"><Motif kind="heart" /><p className="eyebrow">En casa o de paseo</p><h2>El cariño está en los detalles</h2><p>Accesorios para acompañar sus pequeñas aventuras y disfrutar de cada día a su lado.</p><Link className="btn btn--wine" href="/website/shop?cat=care-accessories">Ver accesorios ↗</Link></article>{[products[6], products[3]].map((product) => <ProductCard key={product.id} product={product} />)}</div></section>
    <section className="how" id="how-it-works"><div className="container"><h2 className="section-title">Encuentra su próximo favorito</h2><p className="section-lead">Empieza por lo que más le gusta y descubre nuevas ideas para compartir.</p><div className="how__grid">{[
      ['paw', 'Conoce su mundo', 'Explora las categorías para perros, gatos, aves y pequeñas mascotas.'],
      ['bone', 'Elige un detalle', 'Descubre ideas de juguetes, alimentación y accesorios para su día a día.'],
      ['heart', 'Guarda tus favoritos', 'Arma una selección de ejemplo mientras preparamos el catálogo de la tienda.'],
    ].map(([kind, title, text]) => <article className="how-card" key={title}><div className="how-card__icon"><Motif kind={kind as 'paw' | 'bone' | 'heart'} /></div><h3>{title}</h3><p>{text}</p></article>)}</div></div></section>
    <div className="brand-strip"><Motif /><span>Para cada huella, un poquito de amor.</span><Motif kind="heart" /></div>
  </Layout>;
}
