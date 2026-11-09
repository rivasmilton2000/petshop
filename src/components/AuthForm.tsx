import Link from 'next/link';
import { useRouter } from 'next/router';
import { useState, type FormEvent } from 'react';
import { Layout } from './Layout';
import { Motif } from './Motif';
import { useAuthSession } from './AuthSession';

const googleErrors: Record<string, string> = {
  google_unavailable: 'El acceso con Google aún no está disponible. Puedes usar tu correo y contraseña.',
  google_cancelled: 'Se canceló el acceso con Google. Puedes intentarlo de nuevo.',
  google_invalid: 'No pudimos validar el acceso con Google. Vuelve a intentarlo desde esta página.',
  google_link_required: 'Ya tienes una cuenta con ese correo. Inicia sesión con tu contraseña y vincula Google desde Mi cuenta.',
};
export function AuthForm({ mode, googleEnabled }: { mode: 'login' | 'register'; googleEnabled: boolean }) {
  const register = mode === 'register';
  const router = useRouter();
  const { refresh } = useAuthSession();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const title = register ? 'Crea tu cuenta' : 'Qué gusto verte de nuevo';
  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault(); setError('');
    const form = new FormData(event.currentTarget);
    const password = String(form.get('password') ?? '');
    if (register && password !== form.get('confirm')) { setError('Las contraseñas no coinciden.'); return; }
    setBusy(true);
    try {
      const response = await fetch(`/api/auth/${mode}`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email: form.get('email'), password, ...(register ? { name: form.get('name') } : {}) }) });
      const data = await response.json();
      if (!response.ok) { setError(data.error ?? 'No pudimos completar la solicitud.'); return; }
      await refresh();
      await router.replace('/dashboard');
    } catch { setError('No pudimos conectar. Inténtalo de nuevo.'); }
    finally { setBusy(false); }
  };
  const queryError = typeof router.query.error === 'string' ? googleErrors[router.query.error] : '';
  return <Layout page="auth" title={register ? 'Crear cuenta' : 'Iniciar sesión'} description={`${register ? 'Crea tu cuenta' : 'Inicia sesión'} en LILAC & TOFFEE - PET SHOP.`}>
    <div className="auth-shell"><section className="auth-welcome"><img src="/img/LILAC%26TOFEE_LOGO.png" alt="Logo de LILAC & TOFFEE - PET SHOP" width="240" height="240" /><p className="eyebrow">Un vínculo que deja huella</p><h2>Un lugar para ti y tu compañero.</h2><p>Comparte el cariño por las pequeñas cosas que hacen grande su mundo.</p><div className="auth-motifs"><Motif /><Motif kind="bone" /><Motif kind="heart" /></div></section>
      <section className="auth-card" aria-labelledby="auth-title"><nav className="auth-tabs" aria-label="Acceso a tu cuenta"><Link href="/login" aria-current={!register ? 'page' : undefined}>Iniciar sesión</Link><Link href="/login/register" aria-current={register ? 'page' : undefined}>Crear cuenta</Link></nav><h1 id="auth-title">{title}</h1><p>{register ? 'Regístrate con tu correo o tu cuenta de Google.' : 'Entra con tu correo y contraseña o con Google.'}</p>
        {(error || queryError) && <p role="alert" className="form-error">{error || queryError}</p>}
        <form className="auth-form" onSubmit={submit}>
          {register && <label htmlFor="auth-name">Nombre<input id="auth-name" name="name" autoComplete="name" minLength={2} maxLength={80} required /></label>}
          <label htmlFor="auth-email">Correo electrónico<input id="auth-email" name="email" type="email" autoComplete="email" maxLength={254} required /></label>
          <label htmlFor="auth-password">Contraseña<input id="auth-password" name="password" type="password" autoComplete={register ? 'new-password' : 'current-password'} minLength={12} maxLength={128} required aria-describedby={register ? 'password-help' : undefined} /></label>
          {register && <><p className="auth-help" id="password-help">Usa entre 12 y 128 caracteres.</p><label htmlFor="auth-confirm">Confirmar contraseña<input id="auth-confirm" name="confirm" type="password" autoComplete="new-password" minLength={12} maxLength={128} required /></label></>}
          <button type="submit" className="btn btn--wine" disabled={busy}>{busy ? 'Un momento…' : register ? 'Crear mi cuenta' : 'Entrar'}</button>
        </form><div className="auth-divider"><span>o continúa con</span></div><a className="google-button" href="/api/auth/google"><span className="google-letter" aria-hidden="true">G</span>{register ? 'Registrarse con Google' : 'Iniciar sesión con Google'}</a>{!googleEnabled && <p className="auth-help">El acceso con Google estará disponible pronto.</p>}<p className="auth-switch">{register ? '¿Ya tienes una cuenta?' : '¿Es tu primera visita?'} <Link href={register ? '/login' : '/login/register'}>{register ? 'Inicia sesión' : 'Crea tu cuenta'}</Link></p>
      </section></div>
  </Layout>;
}
