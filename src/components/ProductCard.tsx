import Link from 'next/link';
import { productHref, productImage, formatPrice, type Product } from '@/pages/website/data/products';

export function ProductCard({ product, priority = false }: { product: Product; priority?: boolean }) {
  return <article className="shop-card"><Link className="shop-card__link" href={productHref(product.id)}>
    <span className="shop-card__media"><img src={productImage(product.image)} alt={product.name} width="800" height="800" loading={priority ? 'eager' : 'lazy'} />{product.stock === 0 && <span className="stock-badge">Agotado</span>}<span className="card-arrow" aria-hidden="true">↗</span></span>
    <h3 className="shop-card__name">{product.name}</h3><p className="shop-card__price">{formatPrice(product.price)} <span aria-hidden="true">→</span></p>
  </Link></article>;
}
