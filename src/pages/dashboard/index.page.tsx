import type { GetServerSideProps } from 'next';
import Link from 'next/link';
import { Layout } from '@/components/Layout';
import { getSessionUser } from '@/server/auth';

export const getServerSideProps: GetServerSideProps = async ({ req, res }) => {
  res.setHeader('Cache-Control', 'no-store');
  const user = await getSessionUser(req);
  if (!user) return { redirect: { destination: '/login?next=/dashboard', permanent: false } };
  const allowed = user.role === 'administrador';
  if (!allowed) res.statusCode = 403;
  return { props: { allowed } };
};
export default function Dashboard({ allowed }: { allowed: boolean }) {
  return <Layout page="account" title="Acceso de administrador" description="Acceso protegido de LILAC & TOFFEE - PET SHOP."><section className="account-card"><p className="eyebrow">{allowed ? 'Administrador' : 'Acceso restringido'}</p><h1>{allowed ? 'Tu acceso está verificado' : 'Este espacio requiere permisos de administrador'}</h1><p>{allowed ? 'Tu sesión y tu rol se han validado en el servidor.' : 'Puedes continuar desde tu cuenta o volver a la tienda.'}</p><Link className="btn btn--wine" href="/login/account">Volver a mi cuenta</Link></section></Layout>;
}
