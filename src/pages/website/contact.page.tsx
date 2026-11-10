import { useEffect, useState, type FormEvent } from 'react';
import { Layout } from '@/components/Layout';
import { Motif } from '@/components/Motif';

const faqs = [
  { id: 'catalogo', category: 'general', question: '¿Puedo comprar desde la tienda?', answer: 'Puedes explorar el catálogo, consultar precios y stock, añadir productos al carrito y preparar tu selección con una cuenta. El pago y la confirmación final estarán disponibles en la siguiente etapa.' },
  { id: 'mascotas', category: 'general', question: '¿Cómo encuentro ideas para mi mascota?', answer: 'En la tienda puedes explorar por especie o por categoría: alimentación, juguetes y cuidado y accesorios. También puedes buscar por nombre.' },
  { id: 'carrito', category: 'general', question: '¿Se guarda mi selección?', answer: 'El carrito se guarda en este navegador cuando el almacenamiento local está disponible. Comprobamos el precio y el stock al modificarlo y preparar tu pedido. El carrito no reserva inventario.' },
  { id: 'envios', category: 'store', question: '¿Dónde puedo consultar los envíos?', answer: 'Las zonas, los costos y los tiempos de entrega aún están pendientes de confirmación. No se han publicado condiciones de envío.' },
  { id: 'atencion', category: 'store', question: '¿Cuáles son los canales de atención?', answer: 'El teléfono, el correo, la dirección y los horarios de atención están pendientes de confirmación.' },
];

export default function Contact() {
  const [category, setCategory] = useState('general');
  const [search, setSearch] = useState('');
  const [draft, setDraft] = useState('');
  const [feedback, setFeedback] = useState('');
  const [copied, setCopied] = useState('');
  const [linkedFaq, setLinkedFaq] = useState('');
  useEffect(() => {
    const openHash = () => {
      const id = window.location.hash.slice(1);
      const faq = faqs.find((item) => item.id === id);
      if (faq) { setCategory(faq.category); setSearch(''); setLinkedFaq(id); }
    };
    openHash(); window.addEventListener('hashchange', openHash);
    return () => window.removeEventListener('hashchange', openHash);
  }, []);
  useEffect(() => {
    const item = document.getElementById(linkedFaq);
    if (item instanceof HTMLDetailsElement) { item.open = true; item.scrollIntoView({ block: 'start' }); }
  }, [category, linkedFaq]);
  const prepare = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    const name = String(data.get('name') ?? '').trim();
    const message = String(data.get('message') ?? '').trim();
    if (!name || !message) { setFeedback('Escribe tu nombre y tu consulta.'); return; }
    setDraft(`Nombre: ${name}\nCorreo: ${String(data.get('email')).trim()}\n\n${message}`);
    setFeedback('Tu consulta está preparada. Aún no se ha enviado.'); setCopied('');
  };
  const visible = faqs.filter((faq) => faq.category === category && `${faq.question} ${faq.answer}`.toLocaleLowerCase('es').includes(search.toLocaleLowerCase('es')));
  return <Layout page="contact" title="Contacto" description="Consulta la información disponible y las preguntas frecuentes de LILAC & TOFFEE - PET SHOP.">
    <section className="contact-hero" aria-labelledby="contact-title"><p className="eyebrow">Estamos preparando nuevos encuentros</p><h1 id="contact-title">Hablemos de tu compañero</h1></section>
    <div className="contact-layout"><section className="contact-form-card" aria-labelledby="get-in-touch"><div className="contact-form-card__inner"><h2 className="contact-heading" id="get-in-touch">Prepara tu consulta</h2><p className="contact-intro" id="contact-form-note">Nuestros canales de atención están pendientes de confirmación. Puedes preparar aquí un texto para copiarlo; este formulario no envía ni guarda tus datos.</p><form className="contact-form" aria-describedby="contact-form-note" onSubmit={prepare}>
      <div className="contact-form__fields"><label className="contact-field" htmlFor="contact-name"><span>Nombre *</span><input id="contact-name" name="name" autoComplete="given-name" maxLength={80} required /></label><label className="contact-field" htmlFor="contact-email"><span>Correo electrónico *</span><input id="contact-email" name="email" type="email" autoComplete="email" maxLength={254} required /></label><label className="contact-field contact-field--message" htmlFor="contact-message"><span>Tu consulta *</span><textarea id="contact-message" name="message" rows={4} maxLength={4000} required /></label></div><button className="contact-submit" type="submit">Preparar consulta</button><p className="contact-form__status" role="status" aria-live="polite">{feedback}</p>
      {draft && <div className="draft-preview"><label htmlFor="draft-text">Texto de tu consulta</label><textarea id="draft-text" readOnly value={draft} rows={6} /><button className="text-button" type="button" onClick={async () => { try { await navigator.clipboard.writeText(draft); setCopied('Consulta copiada.'); } catch { setCopied('Selecciona el texto para copiarlo manualmente.'); } }}>Copiar consulta</button><p role="status">{copied}</p></div>}
    </form></div></section><section className="contact-store" aria-labelledby="store-title"><Motif /><h2 className="contact-heading" id="store-title">Información de la tienda</h2><dl className="contact-store__details"><div><dt>Contacto</dt><dd>Teléfono y correo pendientes de confirmación.</dd></div><div><dt>Visítanos</dt><dd>Dirección y horarios pendientes de confirmación.</dd></div><div><dt>Entregas</dt><dd>Envíos y retiro en tienda pendientes de confirmación.</dd></div></dl></section><figure className="contact-photo"><img src="/website/img/contact-dog-walk.png" alt="Una persona paseando a cuatro perros con correas de colores" width="1254" height="1254" loading="lazy" /></figure><section className="contact-location-note"><Motif kind="heart" /><h2 className="contact-heading">Un espacio para compartir</h2><p>Nos encantará acompañarte a descubrir ideas para tu mascota. Publicaremos aquí los datos de la tienda cuando estén confirmados.</p></section></div>
    <section className="contact-faq" aria-labelledby="faq-title"><h2 className="contact-heading" id="faq-title">Preguntas frecuentes</h2><div className="contact-faq__toolbar"><div className="contact-faq__tabs" role="group" aria-label="Categorías de preguntas">{[['general', 'La tienda en línea'], ['store', 'Atención y entregas']].map(([id, label]) => <button key={id} type="button" aria-pressed={category === id} onClick={() => setCategory(id)}>{label}</button>)}</div><label className="faq-search" htmlFor="faq-search">Buscar preguntas<input id="faq-search" type="search" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="¿Qué quieres saber?" /></label></div><div className="faq-list">{visible.map((faq) => <details key={faq.id} id={faq.id}><summary>{faq.question}</summary><p>{faq.answer}</p><a href={`#${faq.id}`} onClick={async () => { try { await navigator.clipboard.writeText(`${window.location.origin}/website/contact#${faq.id}`); setCopied('Enlace copiado.'); } catch { setCopied('Puedes copiar el enlace desde la barra de direcciones.'); } }}>Copiar enlace a esta respuesta ↗</a></details>)}</div>{visible.length === 0 && <p role="status">No encontramos preguntas. Prueba otra búsqueda o categoría.</p>}<p role="status" aria-live="polite">{copied}</p></section>
    <section className="store-policies container" aria-labelledby="policies-title"><h2 id="policies-title">Información comercial</h2><p>Los siguientes datos están pendientes de confirmación por la tienda.</p><div>{[['shipping', 'Envíos', 'Zonas, costos, plazos y opciones de retiro pendientes de confirmación.'], ['refund', 'Cambios y devoluciones', 'Condiciones y procedimiento pendientes de confirmación.'], ['privacy', 'Privacidad', 'Política comercial de privacidad pendiente de publicación. El carrito de ejemplo usa almacenamiento local; el formulario no envía ni guarda información.'], ['terms', 'Términos', 'Condiciones de compra pendientes de confirmación. En esta versión no se procesan compras.']].map(([id, title, text]) => <article id={id} key={id}><h3>{title}</h3><p>{text}</p></article>)}</div></section>
  </Layout>;
}