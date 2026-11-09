import type { GetServerSideProps } from 'next';

// Compatibilidad con enlaces de la etapa 2; el perfil ahora vive en el panel.
export const getServerSideProps: GetServerSideProps = async ({ res }) => {
  res.setHeader('Cache-Control', 'no-store');
  return { redirect: { destination: '/dashboard?section=profile', permanent: false } };
};
export default function AccountRedirect() { return null; }
