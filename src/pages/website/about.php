<?php
/**
 * Petshop – Página About (Quiénes Somos)
 * Estética retro/editorial inspirada en la plantilla "Wagora".
 * Estilos: ./css/website.css (único archivo CSS, sección "Página About").
 * La carpeta conexion/ no se toca en esta página.
 */

/** Escapa texto para imprimirlo de forma segura en HTML. */
function e(string $texto): string
{
    return htmlspecialchars($texto, ENT_QUOTES, 'UTF-8');
}

/* ---------- Datos de la página ---------- */

// Tarjetas de "Our Values & Sourcing"
$valores = [
    ['titulo' => 'Product Curation',       'texto' => 'We hand-select every item in our store, ensuring it meets our rigorous standards for quality and safety. From premium nutrition to artisanal toys, we only carry what we believe in.'],
    ['titulo' => 'Sustainability Promise', 'texto' => 'Our mission is to reduce our environmental footprint. We prioritize eco-friendly packaging and support brands that lead in sustainable pet care and responsible sourcing.'],
    ['titulo' => 'Quality Standards',      'texto' => 'We believe in transparency. Every product we stock undergoes a thorough vetting process to guarantee that your pets receive the best ingredients and care.'],
    ['titulo' => 'Local Partnerships',     'texto' => 'We actively collaborate with ethical local suppliers, cruelty-free workshops, and neighborhood shelters to foster a connected, caring pet community.'],
];

// Enlaces legales del pie de página
$legales = [
    'Accessibility Statement' => '#accessibility',
    'Shipping Policy'         => '#shipping',
    'Refund Policy'           => '#refund',
    'Terms & Conditions'      => '#terms',
    'Privacy Policy'          => '#privacy',
];
?>
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title>About Petshop | The Heart Behind Petshop</title>
    <meta name="description" content="Meet Petshop: a pet-nutrition-minded retailer curating premium, sustainable essentials for every wag, purr and hop. Learn about our values and sourcing.">
    <meta name="theme-color" content="#501726">

    <!-- Tipografías: Fredoka / DynaPuff (títulos bubble) y Quicksand (texto) -->
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <link href="https://fonts.googleapis.com/css2?family=DynaPuff:wght@500;700&family=Fredoka:wght@400;500;600;700&family=Quicksand:wght@500;600;700&display=swap" rel="stylesheet">

    <link rel="stylesheet" href="./css/website.css">
</head>
<body class="page-about">

<a class="skip-link" href="#contenido">Skip to content</a>

<!-- ===== HEADER FLOTANTE TIPO PÍLDORA (idéntico a la portada) ===== -->
<header class="header" id="site-header">
    <a class="header__logo" href="../../../index.php" aria-label="Petshop – home">Petshop</a>

    <nav class="header__nav" id="main-nav" aria-label="Main navigation">
        <a href="./about.php" class="is-active" aria-current="page">About</a>
        <a href="./shop.php">Shop</a>
        <a href="./contact.php">Contact</a>
    </nav>

    <div class="header__actions">
        <a class="header__login" id="btn-login" href="./login.php">
            <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><circle cx="12" cy="12" r="11" fill="currentColor"/><circle cx="12" cy="9.5" r="3.6" fill="#FDF18F"/><path d="M4.8 19.2c1.4-3.3 4-4.9 7.2-4.9s5.8 1.6 7.2 4.9A10.9 10.9 0 0 1 12 23a10.9 10.9 0 0 1-7.2-3.8Z" fill="#FDF18F"/></svg>
            <span>Log In</span>
        </a>
        <a class="header__bag" id="btn-cart" href="./cart.php" aria-label="Shopping bag, 0 items">
            <svg viewBox="0 0 28 34" aria-hidden="true" focusable="false"><path d="M9 11V8a5 5 0 0 1 10 0v3" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"/><path d="M3 11h22l2 20a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2l2-20Z" fill="currentColor"/></svg>
            <span class="header__bag-count">0</span>
        </a>
        <button class="header__toggle" id="btn-menu" type="button" aria-expanded="false" aria-controls="main-nav" aria-label="Open menu">
            <span></span><span></span><span></span>
        </button>
    </div>
</header>

<main id="contenido">

    <!-- ===== HERO: THE HEART BEHIND PETSHOP ===== -->
    <section class="about-hero" id="about" aria-labelledby="about-title">
        <div class="about-hero__inner">
            <div class="about-hero__text">
                <h1 class="about-hero__title" id="about-title">The Heart Behind Petshop</h1>
                <p class="about-hero__lead">We started Petshop with a simple mission: to find the perfect balance between premium nutrition and everyday comfort for our furry friends. As a pet-nutrition-minded retailer, we believe every wag, purr, and hop deserves high-quality essentials that prioritize both health and sustainability. Join us as we curate a neighborhood where every pet feels like home.</p>
            </div>

            <figure class="about-hero__media">
                <img src="./img/about-hero.png" alt="A smiling young couple petting their dachshund wearing a plaid coat" width="1024" height="1024">
            </figure>
        </div>
    </section>

    <!-- ===== OUR VALUES & SOURCING ===== -->
    <section class="about-values" id="values" aria-labelledby="values-title">
        <div class="container about-values__container">
            <h2 class="about-values__title" id="values-title">Our Values &amp; Sourcing</h2>

            <div class="about-values__grid">
                <?php foreach ($valores as $v): ?>
                    <article class="value-card">
                        <span class="value-card__dot" aria-hidden="true"></span>
                        <h3 class="value-card__title"><?= e($v['titulo']) ?></h3>
                        <p class="value-card__text"><?= e($v['texto']) ?></p>
                    </article>
                <?php endforeach; ?>
            </div>
        </div>
    </section>
</main>

<!-- ===== FOOTER ===== -->
<footer class="about-footer" id="contact">
    <div class="about-footer__inner">
        <div class="about-footer__content">
            <a class="about-footer__logo" href="../../../index.php" aria-label="Petshop – home">Petshop</a>

            <nav class="about-footer__links" aria-label="Legal">
                <?php foreach ($legales as $nombre => $enlace): ?>
                    <a href="<?= e($enlace) ?>"><?= e($nombre) ?></a>
                <?php endforeach; ?>
            </nav>

            <address class="about-footer__contact">
                <p>500 Terry Francine Street,<br>San Francisco, CA 94158</p>
                <p><a href="mailto:info@petshop.com">info@petshop.com</a></p>
                <p><a href="tel:+11234567890">123-456-7890</a></p>
            </address>
        </div>

        <div class="about-footer__photo">
            <img src="./img/about-footer-dog.png" alt="A dachshund chewing on its blue and cream rope toy" width="1024" height="1024" loading="lazy">
        </div>
    </div>
</footer>

<script>
    // Menú móvil de la cápsula
    (function () {
        var header = document.getElementById('site-header');
        var toggle = document.getElementById('btn-menu');
        var nav = document.getElementById('main-nav');
        toggle.addEventListener('click', function () {
            var abierto = header.classList.toggle('is-open');
            toggle.setAttribute('aria-expanded', abierto ? 'true' : 'false');
        });
        nav.addEventListener('click', function (ev) {
            if (ev.target.tagName === 'A') {
                header.classList.remove('is-open');
                toggle.setAttribute('aria-expanded', 'false');
            }
        });
    })();
</script>
</body>
</html>
