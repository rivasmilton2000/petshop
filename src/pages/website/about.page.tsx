import Link from 'next/link';
import { Layout } from '@/components/Layout';
import { Motif } from '@/components/Motif';

const values = [
  ['paw', 'Cada mascota cuenta', 'Perros, gatos, aves y pequeños compañeros: cada uno tiene su personalidad y su propia forma de alegrarnos el día.'],
  ['heart', 'El cariño nos inspira', 'Nos mueve ese vínculo especial que se construye en los paseos, los juegos y los ratitos en casa.'],
  ['bone', 'Detalles para compartir', 'Queremos ayudarte a encontrar ideas que acompañen sus rutinas y los momentos que disfrutan juntos.'],
  ['heart', 'Elegir con información', 'Creemos en presentar información clara para que puedas elegir con calma y de acuerdo con las necesidades de tu mascota.'],
];

export default function About() {
  return <Layout page="about" title="Nosotros" description="Conoce LILAC & TOFFEE - PET SHOP: un espacio inspirado en el cariño por las mascotas y los momentos que compartimos con ellas.">
    <section className="about-hero" id="about" aria-labelledby="about-title"><div className="about-hero__inner"><div className="about-hero__text"><p className="eyebrow">Nuestra inspiración</p><h1 className="about-hero__title" id="about-title">Un vínculo que deja huella</h1><p className="about-hero__lead">En LILAC &amp; TOFFEE - PET SHOP nos inspira el amor por esos compañeros que convierten cualquier día en uno especial. Queremos crear un espacio para descubrir ideas de alimentación, juego y cuidado, con la calidez de sentirse en casa.</p><Link className="btn btn--wine" href="/website/shop">Conoce la tienda ↗</Link></div><figure className="about-hero__media"><img src="/website/img/about-hero.png" alt="Una pareja acariciando a su perro salchicha" width="1024" height="1024" /></figure></div></section>
    <section className="about-values" id="values" aria-labelledby="values-title"><div className="container about-values__container"><h2 className="about-values__title" id="values-title">Lo que nos mueve</h2><div className="about-values__grid">{values.map(([kind, title, text]) => <article className="value-card" key={title}><Motif kind={kind as 'paw' | 'bone' | 'heart'} /><h3 className="value-card__title">{title}</h3><p className="value-card__text">{text}</p></article>)}</div></div></section>
  </Layout>;
}
