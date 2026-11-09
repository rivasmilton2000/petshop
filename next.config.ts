import type { NextConfig } from 'next';

const legacyPages = ['about', 'shop', 'product-detail', 'contact'];
const config: NextConfig = {
  reactStrictMode: true,
  // El puente index.tsx convive con las páginas y API existentes de sufijo .page.
  // No se admite .ts a secas: website/data/products.ts continúa fuera de las rutas.
  pageExtensions: ['page.tsx', 'page.ts', 'tsx'],
  async redirects() {
    const prefixes = ['', '/petshop', '/petshop/petshop'];
    return prefixes.flatMap((prefix) => [
      { source: `${prefix}/index.php`, destination: '/', permanent: true },
      ...legacyPages.flatMap((name) => [
        { source: `${prefix}/src/pages/website/${name}.php`, destination: `/website/${name}`, permanent: true },
        { source: `${prefix}/website/${name}.php`, destination: `/website/${name}`, permanent: true },
      ]),
    ]).concat([
      { source: '/website', destination: '/', permanent: true },
      { source: '/petshop', destination: '/', permanent: true },
      { source: '/petshop/petshop', destination: '/', permanent: true },
    ]);
  },
  async rewrites() {
    return ['', '/petshop', '/petshop/petshop'].flatMap((prefix) => [
      { source: `${prefix}/src/pages/website/img/:path*`, destination: '/website/img/:path*' },
      { source: `${prefix}/src/pages/website/css/:path*`, destination: '/website/css/:path*' },
      ...(prefix ? [{ source: `${prefix}/img/:path*`, destination: '/img/:path*' }] : []),
    ]);
  },
};
export default config;
