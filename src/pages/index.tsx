import Home from '../../index';
import type { GetServerSideProps } from 'next';
import type { Product } from './website/data/products';
import { publicCatalog } from '@/server/catalog';

export default Home;

// La consulta se queda en la ruta para que Next la excluya del bundle público.
export const getServerSideProps: GetServerSideProps<{ products: Product[] }> = async ({ res }) => {
  res.setHeader('Cache-Control', 'no-store');
  return { props: { products: await publicCatalog() } };
};
