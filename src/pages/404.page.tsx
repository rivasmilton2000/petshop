import Link from 'next/link';
import { Layout } from '@/components/Layout';

export default function NotFound() {
  return <Layout page="not-found" title="Página no encontrada" description="No encontramos esta página de LILAC & TOFFEE - PET SHOP."><section className="not-found container"><p className="eyebrow">404</p><h1>Esta huella no lleva a ninguna página</h1><p>Vuelve a la tienda para seguir explorando.</p><Link className="btn btn--wine" href="/website/shop">Ir a la tienda</Link></section></Layout>;
}
