import type { GetServerSideProps } from 'next';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { useState } from 'react';
import { Layout } from '@/components/Layout';
import { ProductCard } from '@/components/ProductCard';
import { categories, products } from './data/products';

export const getServerSideProps: GetServerSideProps = async ({ query }) => ({ props: { initialCategory: typeof query.cat === 'string' && categories[query.cat] ? query.cat : 'all' } });

export default function Shop({ initialCategory }: { initialCategory: string }) {
  const router = useRouter();
  const [filters, setFilters] = useState(false);
  const [search, setSearch] = useState('');
  const [sort, setSort] = useState('recommended');
  const category = typeof router.query.cat === 'string' && categories[router.query.cat] ? router.query.cat : initialCategory;
  const visible = products.filter((p) => (category === 'all' || p.category === category || p.animals.includes(category)) && p.name.toLocaleLowerCase('es').includes(search.toLocaleLowerCase('es')));
  if (sort === 'name') visible.sort((a, b) => a.name.localeCompare(b.name, 'es'));
  return <Layout page="shop" title="Tienda" description="Explora el catálogo de ejemplo de LILAC & TOFFEE - PET SHOP: alimentación, juguetes y accesorios para mascotas.">
    <div className="shop"><div className="shop__wrap"><nav className="breadcrumbs" aria-label="Ruta de navegación"><ol><li><Link href="/">Inicio</Link></li><li aria-current="page">Tienda</li></ol></nav>
      <button className="shop__filters-btn" type="button" aria-expanded={filters} aria-controls="shop-sidebar" onClick={() => setFilters(!filters)}>Categorías {filters ? '−' : '+'}</button>
      <div className="shop__layout"><aside className={`sidebar ${filters ? 'is-open' : ''}`} id="shop-sidebar" aria-label="Categorías de productos"><section className="sidebar__block"><h2 className="sidebar__title">Explorar por</h2><ul className="sidebar__list">{Object.entries(categories).map(([slug, name]) => <li key={slug}><Link href={`/website/shop?cat=${slug}`} shallow className={category === slug ? 'is-active' : ''} aria-current={category === slug ? 'true' : undefined} onClick={() => setFilters(false)}>{name}</Link></li>)}</ul></section><p className="demo-note">La información comercial se publicará cuando esté confirmada.</p></aside>
        <section className="catalog" aria-labelledby="catalog-title"><p className="eyebrow">Un detalle para su día a día</p><h1 className="catalog__title" id="catalog-title">{categories[category]}</h1><p className="catalog-note">Selección de ejemplo. Precios y disponibilidad pendientes de confirmación; las compras aún no están habilitadas.</p>
          <div className="catalog-tools"><label htmlFor="product-search">Buscar productos<input type="search" id="product-search" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="¿Qué estás buscando?" /></label><label className="sort" htmlFor="sort-select"><span>Ordenar por</span><select id="sort-select" value={sort} onChange={(event) => setSort(event.target.value)}><option value="recommended">Orden de la selección</option><option value="name">Nombre (A–Z)</option></select></label></div>
          <p className="catalog__count" role="status" aria-live="polite">{visible.length} {visible.length === 1 ? 'producto de ejemplo' : 'productos de ejemplo'}</p>
          <div className="catalog__grid">{visible.map((product, index) => <ProductCard key={product.id} product={product} priority={index < 3} />)}</div>{visible.length === 0 && <p className="catalog__empty">No encontramos productos con esta búsqueda. Prueba otra palabra o categoría.</p>}
        </section></div>
    </div></div>
  </Layout>;
}
