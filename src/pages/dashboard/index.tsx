import type { GetServerSideProps } from 'next';
import Head from 'next/head';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { useEffect, useState, type FormEvent, type ReactNode } from 'react';
import { BRAND } from '@/components/Layout';
import { Motif } from '@/components/Motif';
import { useAuthSession } from '@/components/AuthSession';
import { getSessionUser } from '@/server/auth';
import { ownProfile, ownSessions, dashboardStats, accountList } from '@/server/dashboard';
import { adminCatalog, catalogCategories } from '@/server/catalog';
import { googleAvailable } from '@/server/google';
import { productHref, productImage } from '../website/data/products';
import { adminSections, sections, animalOptions, productImages, type Section, type DashboardProps, type CatalogRecord, type CatalogInput, type Profile, type OwnSession, type AccountRecord } from './types';
import styles from './dashboard.module.css';

// Los componentes del panel viven en este archivo para conservar una sola ruta
// con pageExtensions que también admite .tsx. types.ts y el CSS no son páginas.
export const getServerSideProps: GetServerSideProps<DashboardProps> = async ({ req, res, query }) => {
  res.setHeader('Cache-Control', 'private, no-store');
  const user = await getSessionUser(req);
  if (!user) return { redirect: { destination: '/login?next=/dashboard', permanent: false } };
  const section: Section = typeof query.section === 'string' && sections.includes(query.section as Section) ? query.section as Section : 'overview';
  const foreignRecord = Object.keys(query).some((key) => key !== 'section');
  const forbidden = foreignRecord || (adminSections.includes(section) && user.role !== 'administrador');
  if (forbidden) res.statusCode = 403;
  const [profile, sessions] = await Promise.all([ownProfile(user), ownSessions(user, req)]);
  return { props: {
    user, section, forbidden, profile, sessions, googleEnabled: googleAvailable(),
    stats: user.role === 'administrador' && !forbidden ? await dashboardStats(user) : null,
    catalog: section === 'catalog' && !forbidden ? await adminCatalog(user) : [],
    categories: section === 'catalog' && !forbidden ? await catalogCategories() : [],
    accounts: section === 'users' && !forbidden ? await accountList(user) : [],
  } };
};

const labels: Record<Section, string> = { overview: 'Inicio', profile: 'Mi perfil', security: 'Seguridad', catalog: 'Catálogo', users: 'Cuentas' };
const panelHref = (section: Section) => section === 'overview' ? '/dashboard' : `/dashboard?section=${section}`;
const date = (value: string) => new Intl.DateTimeFormat('es-SV', { dateStyle: 'medium', timeZone: 'America/El_Salvador' }).format(new Date(value));
async function post<T>(path: string, body: unknown): Promise<T> {
  const response = await fetch(path, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
  const data = await response.json();
  if (response.status === 401) window.location.assign('/login?next=/dashboard');
  if (!response.ok) throw new Error(data.error ?? 'No pudimos guardar los cambios.');
  return data;
}
function Notice({ children, error = false }: { children: ReactNode; error?: boolean }) {
  return children ? <p className={`${styles.notice} ${error ? styles.error : ''}`} role={error ? 'alert' : 'status'}>{children}</p> : null;
}

function DashboardLayout({ data, children }: { data: DashboardProps; children: ReactNode }) {
  const [menu, setMenu] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const router = useRouter();
  const { refresh } = useAuthSession();
  useEffect(() => { setMenu(false); }, [data.section]);
  const entries = sections.filter((section) => data.user.role === 'administrador' || !adminSections.includes(section));
  return <div className={styles.shell}>
    <Head><title>{`${labels[data.section]} · Mi espacio | ${BRAND}`}</title><meta name="description" content={`Tu espacio en ${BRAND}.`} /><meta name="robots" content="noindex,nofollow" /><meta name="theme-color" content="#B69BC1" /><link rel="icon" href="/img/LILAC%26TOFEE_LOGO.png" /></Head>
    <a className="skip-link" href="#panel-content">Saltar al contenido</a>
    <aside className={styles.sidebar}>
      <Link href="/" className={styles.brand}><img src="/img/LILAC%26TOFEE_LOGO.png" alt="" width="74" height="74" /><span>{BRAND}</span></Link>
      <div className={styles.menuHeader}><p className={styles.eyebrow}>Tu espacio</p><button className={styles.menuToggle} type="button" aria-label={menu ? 'Cerrar menú del panel' : 'Abrir menú del panel'} aria-controls="dashboard-nav" aria-expanded={menu} onClick={() => setMenu(!menu)}>☰</button></div>
      <nav id="dashboard-nav" className={`${styles.nav} ${menu ? styles.navOpen : ''}`} aria-label="Navegación del panel">{entries.map((section) => <Link key={section} href={panelHref(section)} className={data.section === section ? styles.active : ''} aria-current={data.section === section ? 'page' : undefined}><span aria-hidden="true">{section === 'overview' ? '⌂' : section === 'profile' ? '♡' : section === 'security' ? '◈' : section === 'catalog' ? '▦' : '◎'}</span>{labels[section]}</Link>)}</nav>
      <div className={styles.sidebarNote}><Motif kind="heart" /><p>Para cada huella,<br />un poquito de amor.</p><Link href="/website/shop">Volver a la tienda ↗</Link></div>
    </aside>
    <div className={styles.workspace}><header className={styles.topbar}><div><span className={styles.eyebrow}>Mi espacio / {labels[data.section]}</span><p>Bienvenido, {data.user.name.split(' ')[0]}</p></div><div className={styles.topActions}><Link href="/website/shop">Ver tienda ↗</Link><span className={styles.role}>{data.user.role === 'administrador' ? 'Administrador' : 'Usuario'}</span><button type="button" disabled={busy} onClick={async () => {
      setBusy(true); setError('');
      try { await post('/api/auth/logout', {}); await refresh(); await router.replace('/login'); }
      catch (error) { setError((error as Error).message); }
      finally { setBusy(false); }
    }}>{busy ? 'Cerrando…' : 'Cerrar sesión'}</button></div></header>
      <main className={styles.main} id="panel-content"><Notice error>{error}</Notice>{children}</main>
      <footer className={styles.footer}>{BRAND}<span>Hecho para acompañar su mundo.</span></footer>
    </div>
  </div>;
}

function Overview({ data }: { data: DashboardProps }) {
  const admin = data.user.role === 'administrador';
  return <><section className={styles.welcome}><div><p className={styles.eyebrow}>{admin ? 'El cuidado empieza en los detalles' : 'Qué gusto tenerte aquí'}</p><h1>{admin ? 'Tu tienda, de un vistazo' : 'Un espacio para ti y tu compañero'}</h1><p>{admin ? 'Organiza el catálogo y consulta las cuentas de tu tienda desde un mismo lugar.' : 'Actualiza tu perfil y revisa los accesos de tu cuenta, con todo a mano.'}</p><Link className={styles.primary} href={panelHref(admin ? 'catalog' : 'profile')}>{admin ? 'Gestionar catálogo' : 'Ver mi perfil'} ↗</Link></div><div className={styles.welcomeArt}><img src="/img/LILAC%26TOFEE_LOGO.png" alt="Logo de LILAC & TOFFEE - PET SHOP" width="210" height="210" /><Motif /><Motif kind="heart" /></div></section>
    <div className={styles.stats}>{admin && data.stats ? <><Stat label="Productos del catálogo" value={data.stats.products} detail="Registros guardados en la tienda" /><Stat label="Visibles en la tienda" value={data.stats.visible} detail="Incluidos en el catálogo público" /><Stat label="Cuentas registradas" value={data.stats.accounts} detail="Usuarios y administradores" /></> : <><Stat label="Tu cuenta" value="Usuario" detail={`Creada el ${date(data.profile.createdAt)}`} /><Stat label="Sesiones activas" value={data.sessions.length} detail="Solo los accesos de tu cuenta" /><Stat label="Acceso con Google" value={data.profile.googleLinked ? 'Vinculado' : 'Sin vincular'} detail="Consulta tus opciones de seguridad" /></>}</div>
    <div className={styles.sectionTitle}><h2>Todo a tu alcance</h2><p>{admin ? 'Herramientas conectadas con los registros de tu tienda.' : 'Unos pequeños ajustes para sentirte en casa.'}</p></div><div className={styles.shortcuts}>{(admin ? ['catalog', 'users', 'profile', 'security'] as Section[] : ['profile', 'security'] as Section[]).map((section) => <Link className={styles.shortcut} href={panelHref(section)} key={section}><Motif kind={section === 'catalog' ? 'bone' : section === 'profile' ? 'heart' : 'paw'} /><h3>{labels[section]}</h3><p>{section === 'catalog' ? 'Crea, edita y cambia la visibilidad de los productos de ejemplo.' : section === 'users' ? 'Consulta las cuentas registradas y sus tipos de acceso.' : section === 'profile' ? 'Revisa tus datos y actualiza cómo quieres que te llamemos.' : 'Revisa tus sesiones y cierra los demás accesos.'}</p><span>Explorar →</span></Link>)}</div>
    {admin && <p className={styles.small}>El catálogo sigue identificado como ejemplo. No hay ventas, pedidos ni existencias comerciales registrados.</p>}
  </>;
}
function Stat({ label, value, detail }: { label: string; value: ReactNode; detail: string }) {
  return <article className={styles.stat}><p>{label}</p><strong>{value}</strong><span>{detail}</span></article>;
}

function ProfilePanel({ profile }: { profile: Profile }) {
  const [name, setName] = useState(profile.name);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const { refresh } = useAuthSession();
  const router = useRouter();
  return <><PanelHeading eyebrow="Tus datos" title="Mi perfil" text="Un espacio para mantener tu información al día." /><div className={styles.twoColumns}><section className={styles.card}><h2>Cómo te llamamos</h2><form className={styles.form} onSubmit={async (event) => { event.preventDefault(); setBusy(true); setError(''); setMessage(''); try { await post('/api/dashboard/profile', { name }); await refresh(); setMessage('Tu nombre se actualizó correctamente.'); await router.replace(router.asPath); } catch (error) { setError((error as Error).message); } finally { setBusy(false); } }}><label htmlFor="profile-name">Nombre<input id="profile-name" value={name} onChange={(event) => setName(event.target.value)} minLength={2} maxLength={80} autoComplete="name" required /></label><button className={styles.primary} disabled={busy} type="submit">{busy ? 'Guardando…' : 'Guardar mi perfil'}</button><Notice>{message}</Notice><Notice error>{error}</Notice></form></section><section className={styles.card}><h2>Tu cuenta</h2><dl className={styles.details}><div><dt>Correo electrónico</dt><dd>{profile.email}</dd></div><div><dt>Tipo de cuenta</dt><dd>{profile.role === 'administrador' ? 'Administrador' : 'Usuario'}</dd></div><div><dt>Miembro desde</dt><dd>{date(profile.createdAt)}</dd></div><div><dt>Acceso disponible</dt><dd>{profile.hasPassword ? 'Correo y contraseña' : 'Google'}{profile.hasPassword && profile.googleLinked ? ' y Google' : ''}</dd></div></dl><p className={styles.small}>El correo y el tipo de cuenta no se modifican desde este formulario.</p></section></div></>;
}
function SecurityPanel({ sessions, profile, googleEnabled }: { sessions: OwnSession[]; profile: Profile; googleEnabled: boolean }) {
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const router = useRouter();
  return <><PanelHeading eyebrow="Tu tranquilidad" title="Seguridad" text="Revisa los accesos de tu cuenta y mantén el control de tus sesiones." /><div className={styles.twoColumns}><section className={styles.card}><div className={styles.cardHeading}><h2>Sesiones activas</h2><span className={styles.badge}>{sessions.length}</span></div><ul className={styles.sessions}>{sessions.map((session, index) => <li key={`${session.createdAt}-${index}`}><span className={styles.sessionIcon}>◈</span><div><strong>{session.current ? 'Esta sesión' : 'Otra sesión'}</strong><p>Iniciada el {date(session.createdAt)}<br />Vence el {date(session.expiresAt)}</p></div>{session.current && <span className={styles.badge}>Actual</span>}</li>)}</ul><button className={styles.secondary} type="button" disabled={busy || !sessions.some((session) => !session.current)} onClick={async () => { setBusy(true); setMessage(''); setError(''); try { const result = await post<{ removed: number }>('/api/dashboard/sessions', {}); setMessage(`Otras sesiones cerradas: ${result.removed}.`); await router.replace(router.asPath); } catch (error) { setError((error as Error).message); } finally { setBusy(false); } }}>Cerrar otras sesiones</button><Notice>{message}</Notice><Notice error>{error}</Notice></section><section className={styles.card}><Motif kind="heart" /><h2>Tu cuenta de Google</h2><p>{profile.googleLinked ? 'Tu cuenta de Google ya está vinculada.' : 'Puedes vincular una cuenta de Google con el mismo correo de tu perfil.'}</p>{!profile.googleLinked && (googleEnabled ? <a className={styles.secondary} href="/api/auth/google?link=1">Vincular Google</a> : <p className={styles.small}>El acceso con Google estará disponible cuando se complete su configuración.</p>)}</section></div></>;
}
function PanelHeading({ eyebrow, title, text }: { eyebrow: string; title: string; text: string }) { return <div className={styles.heading}><p className={styles.eyebrow}>{eyebrow}</p><h1>{title}</h1><p>{text}</p></div>; }

function toInput(product: CatalogRecord): CatalogInput {
  return { id: product.id, name: product.name, category: product.category, animals: product.animals, image: product.image, description: product.description, colors: product.colors ?? [], active: product.active, version: product.version };
}
function CatalogPanel({ products, categories }: { products: CatalogRecord[]; categories: DashboardProps['categories'] }) {
  const [rows, setRows] = useState(products);
  const [editing, setEditing] = useState<CatalogRecord | null | undefined>(undefined);
  const [busyId, setBusyId] = useState('');
  const [search, setSearch] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  useEffect(() => { setRows(products); }, [products]);
  const replace = (product: CatalogRecord) => setRows((current) => current.some((row) => row.id === product.id) ? current.map((row) => row.id === product.id ? product : row) : [...current, product]);
  return <><PanelHeading eyebrow="Administración" title="Catálogo" text="Gestiona la selección que aparece en la tienda. Los registros siguen siendo productos de ejemplo, sin precios ni existencias confirmados." /><div className={styles.toolbar}><label htmlFor="catalog-search">Buscar en el catálogo<input id="catalog-search" type="search" placeholder="Nombre o identificador" value={search} onChange={(event) => setSearch(event.target.value)} /></label><button className={styles.primary} type="button" onClick={() => { setEditing(null); setError(''); setMessage(''); }}>Nuevo producto</button></div><Notice>{message}</Notice><Notice error>{error}</Notice>
    {editing !== undefined && <ProductEditor key={editing?.id ?? 'new'} product={editing} categories={categories} onCancel={() => setEditing(undefined)} onSaved={(product) => { replace(product); setEditing(undefined); setMessage('Producto guardado correctamente.'); }} />}
    <section className={styles.card} aria-label="Productos del catálogo"><div className={styles.cardHeading}><h2>Tu selección</h2><span className={styles.badge}>{rows.length} registros</span></div><div className={styles.productList}>{rows.filter((row) => `${row.name} ${row.id}`.toLocaleLowerCase('es').includes(search.toLocaleLowerCase('es'))).map((product) => <article className={styles.productRow} key={product.id}><img src={productImage(product.image)} alt={product.name} width="80" height="80" /><div><h3>{product.name}</h3><p>{categories.find((category) => category.id === product.category)?.name} · {product.colors?.length || 0} variantes</p><span className={styles.badge}>{product.active ? 'Visible en tienda' : 'Archivado'}</span><span className={styles.small}> · Ejemplo</span></div><div className={styles.rowActions}><button className={styles.secondary} type="button" onClick={() => { setEditing(product); setMessage(''); setError(''); }} aria-label={`Editar ${product.name}`}>Editar</button><button className={styles.linkButton} disabled={busyId === product.id} type="button" aria-label={`${product.active ? 'Archivar' : 'Mostrar'} ${product.name}`} onClick={async () => {
      setBusyId(product.id); setError(''); setMessage('');
      try { const { id: _id, ...value } = toInput(product); const result = await post<{ product: CatalogRecord }>(`/api/dashboard/catalog/${product.id}`, { ...value, active: !product.active }); replace(result.product); setMessage(product.active ? 'Producto archivado. Ya no aparece en la tienda.' : 'Producto visible en la tienda.'); }
      catch (error) { setError((error as Error).message); }
      finally { setBusyId(''); }
    }}>{product.active ? 'Archivar' : 'Mostrar'}</button>{product.active && <Link href={productHref(product.id)}>Ver en tienda ↗</Link>}</div></article>)}</div>{!rows.some((row) => `${row.name} ${row.id}`.toLocaleLowerCase('es').includes(search.toLocaleLowerCase('es'))) && <p className={styles.empty}>No encontramos productos con esa búsqueda.</p>}</section>
  </>;
}

function ProductEditor({ product, categories, onCancel, onSaved }: { product: CatalogRecord | null; categories: DashboardProps['categories']; onCancel: () => void; onSaved: (product: CatalogRecord) => void }) {
  const [value, setValue] = useState<CatalogInput>(product ? toInput(product) : { id: '', name: '', category: categories[0]?.id ?? 'care-accessories', animals: ['dogs'], image: productImages[0], description: '', colors: [], active: false });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault(); setBusy(true); setError('');
    try { const { id, ...fields } = value; const result = await post<{ product: CatalogRecord }>(product ? `/api/dashboard/catalog/${product.id}` : '/api/dashboard/catalog', product ? fields : { id, ...fields }); onSaved(result.product); }
    catch (error) { setError((error as Error).message); }
    finally { setBusy(false); }
  };
  return <section className={`${styles.card} ${styles.editor}`} aria-labelledby="product-editor-title"><h2 id="product-editor-title">{product ? `Editar ${product.name}` : 'Nuevo producto de ejemplo'}</h2><form className={styles.form} onSubmit={submit}><fieldset disabled={busy} className={styles.formFields}><div className={styles.formGrid}><label htmlFor="product-name">Nombre<input id="product-name" required minLength={2} maxLength={120} value={value.name} onChange={(event) => setValue({ ...value, name: event.target.value })} /></label><label htmlFor="product-id">Identificador<input id="product-id" required pattern="[a-z0-9]+(-[a-z0-9]+)*" maxLength={100} readOnly={Boolean(product)} value={value.id} onChange={(event) => setValue({ ...value, id: event.target.value })} placeholder="ejemplo-producto" /></label><label htmlFor="product-category">Categoría<select id="product-category" value={value.category} onChange={(event) => setValue({ ...value, category: event.target.value })}>{categories.map((category) => <option key={category.id} value={category.id}>{category.name}</option>)}</select></label><label htmlFor="product-image">Imagen<select id="product-image" value={value.image} onChange={(event) => setValue({ ...value, image: event.target.value })}>{productImages.map((image) => <option key={image} value={image}>{image}</option>)}</select></label></div><div className={styles.field}><label htmlFor="product-description">Descripción</label><textarea id="product-description" required minLength={10} maxLength={2000} rows={4} value={value.description} onChange={(event) => setValue({ ...value, description: event.target.value })} /></div><fieldset className={styles.species}><legend>Para quién</legend>{Object.entries(animalOptions).map(([id, label]) => <label key={id}><input type="checkbox" checked={value.animals.includes(id)} onChange={(event) => setValue({ ...value, animals: event.target.checked ? [...value.animals, id] : value.animals.filter((animal) => animal !== id) })} />{label}</label>)}</fieldset><div className={styles.variantHeader}><h3>Variantes</h3><button className={styles.linkButton} type="button" disabled={(value.colors?.length ?? 0) >= 10} onClick={() => setValue({ ...value, colors: [...(value.colors ?? []), { name: '', image: value.image }] })}>Añadir variante</button></div>{(value.colors ?? []).map((variant, index) => <div className={styles.variantRow} key={index}><label htmlFor={`variant-name-${index}`}>Nombre de variante {index + 1}<input id={`variant-name-${index}`} required maxLength={60} value={variant.name} onChange={(event) => setValue({ ...value, colors: value.colors!.map((item, i) => i === index ? { ...item, name: event.target.value } : item) })} /></label><label htmlFor={`variant-image-${index}`}>Imagen de variante {index + 1}<select id={`variant-image-${index}`} value={variant.image} onChange={(event) => setValue({ ...value, colors: value.colors!.map((item, i) => i === index ? { ...item, image: event.target.value } : item) })}>{productImages.map((image) => <option key={image}>{image}</option>)}</select></label><button className={styles.linkButton} type="button" aria-label={`Quitar variante ${index + 1}`} onClick={() => setValue({ ...value, colors: value.colors!.filter((_, i) => i !== index) })}>Quitar</button></div>)}<label className={styles.checkLabel}><input type="checkbox" checked={value.active} onChange={(event) => setValue({ ...value, active: event.target.checked })} />Visible en la tienda como producto de ejemplo</label><p className={styles.small}>El identificador conserva su enlace público. Solo se utilizan las imágenes existentes de la tienda.</p><div className={styles.formActions}><button className={styles.primary} type="submit">{busy ? 'Guardando…' : 'Guardar producto'}</button><button className={styles.secondary} type="button" onClick={onCancel}>Cancelar</button></div></fieldset><Notice error>{error}</Notice></form></section>;
}

function AccountsPanel({ accounts }: { accounts: AccountRecord[] }) {
  const [search, setSearch] = useState('');
  const visible = accounts.filter((account) => `${account.name} ${account.email}`.toLocaleLowerCase('es').includes(search.toLocaleLowerCase('es')));
  return <><PanelHeading eyebrow="Administración" title="Cuentas registradas" text="Consulta las cuentas que existen en la tienda. Esta vista no permite cambiar roles ni contraseñas." /><div className={styles.toolbar}><label htmlFor="account-search">Buscar cuentas<input id="account-search" type="search" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Nombre o correo" /></label></div><section className={styles.card}><div className={styles.cardHeading}><h2>Comunidad de la tienda</h2><span className={styles.badge}>{visible.length} cuentas</span></div><div className={styles.accounts}>{visible.map((account) => <article key={account.id}><div className={styles.avatar}>{account.name.slice(0, 1).toUpperCase()}</div><div><h3>{account.name}</h3><p>{account.email}</p><span className={styles.small}>Desde el {date(account.createdAt)}{account.googleLinked ? ' · Google vinculado' : ''}</span></div><span className={styles.badge}>{account.role === 'administrador' ? 'Administrador' : 'Usuario'}</span></article>)}</div>{!visible.length && <p className={styles.empty}>No encontramos cuentas con esa búsqueda.</p>}</section></>;
}

export default function Dashboard(data: DashboardProps) {
  return <DashboardLayout data={data}>{data.forbidden ? <section className={styles.card}><PanelHeading eyebrow="Acceso restringido" title="Esta función no está disponible para tu cuenta" text="Puedes consultar tus datos desde tu perfil o continuar explorando la tienda." /><Link className={styles.primary} href="/dashboard">Volver al inicio</Link></section> : data.section === 'profile' ? <ProfilePanel profile={data.profile} /> : data.section === 'security' ? <SecurityPanel sessions={data.sessions} profile={data.profile} googleEnabled={data.googleEnabled} /> : data.section === 'catalog' ? <CatalogPanel products={data.catalog} categories={data.categories} /> : data.section === 'users' ? <AccountsPanel accounts={data.accounts} /> : <Overview data={data} />}</DashboardLayout>;
}
