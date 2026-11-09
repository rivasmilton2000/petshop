import type { GetServerSideProps } from 'next';
import Link from 'next/link';
import { useState } from 'react';
import { useRouter } from 'next/router';
import { Layout } from '@/components/Layout';
import { useAuthSession } from '@/components/AuthSession';
import { getSessionUser } from '@/server/auth';
import { getDatabase } from '@/server/db';
import { googleAvailable } from '@/server/google';
import type { SessionUser } from '@/types/auth';

type Props = { user: SessionUser; googleLinked: boolean; googleEnabled: boolean };
export const getServerSideProps: GetServerSideProps<Props> = async ({ req, res }) => {
  res.setHeader('Cache-Control', 'no-store');
  const user = await getSessionUser(req);
  if (!user) return { redirect: { destination: '/login', permanent: false } };
  const linked = await getDatabase().query("SELECT 1 FROM oauth_accounts WHERE user_id = $1 AND provider = 'google'", [user.id]);
  return { props: { user, googleLinked: Boolean(linked.rowCount), googleEnabled: googleAvailable() } };
};
export default function Account({ user, googleLinked, googleEnabled }: Props) {
  const { refresh } = useAuthSession();
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  return <Layout page="account" title="Mi cuenta" description="Tu cuenta en LILAC & TOFFEE - PET SHOP."><section className="account-card"><p className="eyebrow">Mi cuenta</p><h1>Hola, {user.name}</h1><p>Qué gusto tenerte por aquí.</p><dl><div><dt>Correo electrónico</dt><dd>{user.email}</dd></div><div><dt>Tipo de cuenta</dt><dd>{user.role === 'administrador' ? 'Administrador' : 'Usuario'}</dd></div><div><dt>Google</dt><dd>{googleLinked ? 'Cuenta vinculada' : 'Sin vincular'}</dd></div></dl>{!googleLinked && <><a className="google-button" href="/api/auth/google?link=1">Vincular Google</a>{!googleEnabled && <p className="auth-help">El acceso con Google estará disponible pronto.</p>}</>}
    <div className="account-actions"><Link className="btn btn--wine" href="/website/shop">Explorar la tienda</Link>{user.role === 'administrador' && <Link className="btn btn--wine" href="/dashboard">Acceso de administrador</Link>}<button className="text-button" type="button" disabled={busy} onClick={async () => {
      setBusy(true); setError('');
      try { const response = await fetch('/api/auth/logout', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{}' }); if (!response.ok) throw new Error(); await refresh(); await router.replace('/login'); }
      catch { setError('No pudimos cerrar tu sesión. Inténtalo de nuevo.'); }
      finally { setBusy(false); }
    }}>{busy ? 'Cerrando sesión…' : 'Cerrar sesión'}</button></div>{error && <p className="form-error" role="alert">{error}</p>}
  </section></Layout>;
}
