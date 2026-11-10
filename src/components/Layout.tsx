import Head from 'next/head';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { useEffect, useRef, useState, type ReactNode } from 'react';
import { useCart } from './Cart';
import { Motif } from './Motif';
import { useAuthSession } from './AuthSession';

export const BRAND = 'LILAC & TOFFEE';
const navigation = [ ['/website/about', 'Nosotros'], ['/website/shop', 'Tienda'], ['/website/contact', 'Contacto'] ];

export function Layout({ children, page, title, description }: { children: ReactNode; page: string; title: string; description: string }) {
  const [menu, setMenu] = useState(false);
  const router = useRouter();
  const cart = useCart();
  const { user, ready, logout } = useAuthSession();
  const [accountOpen, setAccountOpen] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);
  const [sessionError, setSessionError] = useState('');
  const account = useRef<HTMLDivElement>(null);
  const metaTitle = title === BRAND ? BRAND : `${title} | ${BRAND}`;
  useEffect(() => { setMenu(false); setAccountOpen(false); }, [router.asPath]);
  useEffect(() => {
    const outside = (event: PointerEvent) => { if (!account.current?.contains(event.target as Node)) setAccountOpen(false); };
    document.addEventListener('pointerdown', outside);
    return () => document.removeEventListener('pointerdown', outside);
  }, []);
  useEffect(() => {
    if (router.asPath.endsWith('#cart')) cart.open();
    // El hash heredado permite abrir el carrito desde un enlace guardado.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [router.asPath]);
  return <div className={`site page-${page}`}>
    <Head>
      <title>{metaTitle}</title>
      <meta name="description" content={description} />
      <meta name="viewport" content="width=device-width, initial-scale=1" />
      <meta name="theme-color" content="#B69BC1" />
      <meta property="og:site_name" content={BRAND} />
      <meta property="og:title" content={metaTitle} />
      <meta property="og:description" content={description} />
      <link rel="icon" type="image/png" href="/img/LILAC%26TOFEE_LOGO.png" />
    </Head>
    <a className="skip-link" href="#contenido">Saltar al contenido</a>
    <header className={`header ${menu ? 'is-open' : ''}`} id="site-header" onKeyDown={(event) => { if (event.key === 'Escape') { setMenu(false); document.getElementById('btn-menu')?.focus(); } }}>
      <Link className="header__logo brand" href="/" aria-label={`${BRAND} — Inicio`}>
        <img src="/img/LILAC%26TOFEE_LOGO.png" alt="" width="64" height="64" /><span>{BRAND}</span>
      </Link>
      <nav className="header__nav" id="main-nav" aria-label="Navegación principal">
        {navigation.map(([href, label]) => <Link key={href} href={href} className={router.pathname === href || (href.endsWith('shop') && page === 'product') ? 'is-active' : ''} aria-current={router.pathname === href ? 'page' : undefined} onClick={() => setMenu(false)}>{label}</Link>)}
      </nav>
      <div className="header__actions">
        {user ? <div className="session-account" ref={account} onBlur={(event) => { if (!event.currentTarget.contains(event.relatedTarget)) setAccountOpen(false); }} onKeyDown={(event) => { if (event.key === 'Escape') { setAccountOpen(false); account.current?.querySelector('button')?.focus(); event.stopPropagation(); } }}>
          <button className="session-account__trigger" type="button" aria-expanded={accountOpen} aria-controls="session-menu" onClick={() => { setAccountOpen(!accountOpen); setMenu(false); }} title={user.name}><span>{user.name}</span><span aria-hidden="true">⌄</span></button>
          {accountOpen && <div className="session-account__menu" id="session-menu"><strong>{user.name}</strong><p>{user.role === 'administrador' ? 'Administrador' : 'Cliente'}</p><Link href="/dashboard?section=profile">Ver mi perfil</Link>{user.role === 'administrador' && <Link href="/dashboard?section=catalog">Administrar tienda</Link>}<button type="button" disabled={loggingOut} onClick={async () => { setLoggingOut(true); setSessionError(''); try { await logout(); setAccountOpen(false); } catch (error) { setSessionError((error as Error).message); } finally { setLoggingOut(false); } }}>{loggingOut ? 'Cerrando…' : 'Cerrar sesión'}</button>{sessionError && <p role="alert">{sessionError}</p>}</div>}
        </div> : ready ? <Link className="access-link" href="/login" aria-label="Ingresar"><svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="8" r="4" /><path d="M4 22v-3a8 8 0 0 1 16 0v3" /></svg><span>Ingresar</span></Link> : <span className="session-loading" role="status" aria-label="Cargando sesión">…</span>}
        <button className="bag-button" type="button" aria-label={`Abrir carrito, ${cart.count} artículos`} aria-haspopup="dialog" onClick={() => { setMenu(false); cart.open(); }}>
          <svg viewBox="0 0 28 34" aria-hidden="true"><path d="M9 11V8a5 5 0 0 1 10 0v3M3 11h22l2 20a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2l2-20Z" fill="none" stroke="currentColor" strokeWidth="2" /></svg><span>{cart.count}</span>
        </button>
        <button className="header__toggle" id="btn-menu" type="button" aria-expanded={menu} aria-controls="main-nav" aria-label={menu ? 'Cerrar menú' : 'Abrir menú'} onClick={() => setMenu(!menu)}><span /><span /><span /></button>
      </div>
    </header>
    <main id="contenido">{children}</main>
    <footer className="about-footer" id="contact">
      <div className="about-footer__inner">
        <div className="about-footer__content">
          <Link className="footer-brand" href="/"><img src="/img/LILAC%26TOFEE_LOGO.png" alt="" width="100" height="100" /><span>{BRAND}</span></Link>
          <p>Para cada huella, un poquito de amor.<br />Ideas para acompañar su vida contigo.</p>
          <nav className="about-footer__links" aria-label="Información de la tienda"><Link href="/website/about">Conoce la tienda</Link><Link href="/website/contact">Contacto e información</Link><Link href="/login">Iniciar sesión</Link><Link href="/login/register">Crear cuenta</Link><Link href="/website/contact#shipping">Envíos</Link><Link href="/website/contact#refund">Devoluciones</Link><Link href="/website/contact#privacy">Privacidad</Link><Link href="/website/contact#terms">Términos</Link></nav>
          <p className="footer-copy">{BRAND} <Motif kind="heart" /></p>
        </div>
        <div className="about-footer__photo"><img src="/img/punto10.jpeg" alt="Terrier jugando con una cuerda de algodón" width="1536" height="1024" loading="lazy" /></div>
      </div>
    </footer>
  </div>;
}
