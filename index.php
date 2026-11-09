<?php
/**
 * Petshop – Página de inicio (Landing / Home)
 * Estética retro/editorial inspirada en la plantilla "Wagora".
 * Estilos: ./src/pages/website/css/website.css (único archivo CSS).
 * La carpeta conexion/ no se toca en esta página.
 */

/** Escapa texto para imprimirlo de forma segura en HTML. */
function e(string $texto): string
{
    return htmlspecialchars($texto, ENT_QUOTES, 'UTF-8');
}

/** Construye la URL de una foto de Unsplash recortada al tamaño pedido. */
function foto(string $id, int $ancho, int $alto): string
{
    return "https://images.unsplash.com/photo-{$id}?auto=format&fit=crop&w={$ancho}&h={$alto}&q=80";
}

/* ---------- Datos de la página ---------- */

// Collage del hero (7 fotos de perros alrededor de la tarjeta central)
$heroFotos = [
    ['id' => '1601979031925-424e53b6caaa', 'alt' => 'Australian shepherd puppy smiling at the camera'],
    ['id' => '1543466835-00a7907e9de1',    'alt' => 'Happy beagle with its tongue out'],
    ['id' => '1558788353-f76d92427f16',    'alt' => 'Golden retriever looking happy'],
    ['id' => '1537151625747-768eb6cf92b2', 'alt' => 'Corgi puppy on an orange background'],
    ['id' => '1587300003388-59208cc962cb', 'alt' => 'Border collie mix posing outdoors'],
    ['id' => '1576201836106-db1758fd1c97', 'alt' => 'Golden puppy trotting in warm light'],
    ['id' => '1583512603805-3cc6b41f3edb', 'alt' => 'French bulldog lying on a yellow backdrop'],
];

// Categorías (clase de color = modificador CSS de la tarjeta)
$categorias = [
    ['nombre' => 'Dogs',       'clase' => 'cream', 'id' => '1568572933382-74d440642117', 'alt' => 'Siberian husky portrait'],
    ['nombre' => 'Cats',       'clase' => 'pink',  'id' => '1573865526739-10659fec78a5', 'alt' => 'Ginger cat looking up'],
    ['nombre' => 'Small pets', 'clase' => 'wine',  'id' => '1425082661705-1834bfd09dca', 'alt' => 'Hamster standing on its hind legs'],
    ['nombre' => 'Birds',      'clase' => 'ivory', 'id' => '1552728089-57bdde30beb3',    'alt' => 'Green parakeet on a branch'],
];

// Producto destacado (tarjeta vino junto a la foto grande)
$destacado = [
    'nombre' => 'Bone Biscuit Treats', 'precio' => '$14.00', 'antes' => '$19.00',
    'id' => '1568640347023-a616a30bc3bd', 'alt' => 'Bone-shaped dog biscuits on a pink background',
];

// Carrusel de productos más vendidos
$productos = [
    ['nombre' => 'Organic Kibble Bowl Set', 'precio' => '$32.00', 'antes' => '$40.00', 'tono' => 'cream', 'id' => '1589924691995-400dc9ecc119', 'alt' => 'Bowl of dry dog food on a wooden floor'],
    ['nombre' => 'Sunny Hoodie',            'precio' => '$26.00', 'antes' => '',        'tono' => 'wine',  'id' => '1583337130417-3346a1be7dee', 'alt' => 'French bulldog wearing a yellow hoodie'],
    ['nombre' => 'Cat Nap Essentials',      'precio' => '$21.00', 'antes' => '$28.00', 'tono' => 'cream', 'id' => '1596854407944-bf87f6fdd49e', 'alt' => 'Orange cat stretching on a yellow background'],
    ['nombre' => 'Bone Biscuit Treats',     'precio' => '$14.00', 'antes' => '$19.00', 'tono' => 'wine',  'id' => '1568640347023-a616a30bc3bd', 'alt' => 'Bone-shaped dog biscuits'],
];

// Cómo funciona (los iconos SVG se definen en el HTML)
$pasos = [
    ['titulo' => 'Local Pickup',           'texto' => 'Order online and collect your goodies at our neighborhood shop, bagged and ready to go.', 'icono' => 'caja'],
    ['titulo' => 'Curated Delivery',       'texto' => 'Hand-picked essentials delivered to your door in plastic-free, recycled packaging.',       'icono' => 'camion'],
    ['titulo' => 'Subscription Benefits',  'texto' => 'Never run out of treats. Save on every refill and get first dibs on seasonal drops.',      'icono' => 'campana'],
];

// Testimonios
$testimonios = [
    ['clase' => 'pink',  'id' => '1517849845537-4d257902454a', 'alt' => 'Pug avatar',      'texto' => 'Biscuit goes bananas every time the Petshop box arrives. The quality is unreal and the packaging is adorable.', 'nombre' => 'Marina & Biscuit'],
    ['clase' => 'cream', 'id' => '1518791841217-8f162f1e1131', 'alt' => 'Tabby cat avatar', 'texto' => 'Finally a shop that actually curates. Everything I have bought for Olive has survived her very picky standards.', 'nombre' => 'Daniel & Olive'],
    ['clase' => 'ivory', 'id' => '1560807707-8cc77767d783',    'alt' => 'Cavalier King Charles avatar', 'texto' => 'The subscription saves me so much time, and Mochi loves the treats. Earth-first and tail-wag approved!', 'nombre' => 'Camila & Mochi'],
];

// Texto de la marquesina
$marquesina = ['Recycled Materials', 'Hand-Selected', 'Earth-First'];

// Enlaces legales del pie de página
$legales = ['Accessibility', 'Shipping', 'Refund', 'Terms', 'Privacy'];
?>
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title>Petshop | Curated essentials for every wag, purr and hop</title>
    <meta name="description" content="Petshop is a pet store with hand-selected, earth-first essentials for dogs, cats, small pets and birds. Shop best sellers, seasonal gear and subscriptions.">
    <meta name="theme-color" content="#501726">

    <!-- Tipografías: Fredoka / DynaPuff (títulos bubble) y Quicksand (texto) -->
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <link href="https://fonts.googleapis.com/css2?family=DynaPuff:wght@500;700&family=Fredoka:wght@400;500;600;700&family=Quicksand:wght@500;600;700&display=swap" rel="stylesheet">

    <link rel="stylesheet" href="./src/pages/website/css/website.css">
</head>
<body>

<a class="skip-link" href="#contenido">Skip to content</a>

<!-- ===== HEADER FLOTANTE TIPO PÍLDORA ===== -->
<header class="header" id="site-header">
    <a class="header__logo" href="./index.php" aria-label="Petshop – home">Petshop</a>

    <nav class="header__nav" id="main-nav" aria-label="Main navigation">
        <a href="./src/pages/website/about.php">About</a>
        <a href="#shop">Shop</a>
        <a href="#contact">Contact</a>
    </nav>

    <div class="header__actions">
        <a class="header__login" id="btn-login" href="#login">
            <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><circle cx="12" cy="12" r="11" fill="currentColor"/><circle cx="12" cy="9.5" r="3.6" fill="#FDF18F"/><path d="M4.8 19.2c1.4-3.3 4-4.9 7.2-4.9s5.8 1.6 7.2 4.9A10.9 10.9 0 0 1 12 23a10.9 10.9 0 0 1-7.2-3.8Z" fill="#FDF18F"/></svg>
            <span>Log In</span>
        </a>
        <a class="header__bag" id="btn-cart" href="#cart" aria-label="Shopping bag, 0 items">
            <svg viewBox="0 0 28 34" aria-hidden="true" focusable="false"><path d="M9 11V8a5 5 0 0 1 10 0v3" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"/><path d="M3 11h22l2 20a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2l2-20Z" fill="currentColor"/></svg>
            <span class="header__bag-count">0</span>
        </a>
        <button class="header__toggle" id="btn-menu" type="button" aria-expanded="false" aria-controls="main-nav" aria-label="Open menu">
            <span></span><span></span><span></span>
        </button>
    </div>
</header>

<main id="contenido">

    <!-- ===== HERO ===== -->
    <section class="hero" id="about" aria-labelledby="hero-title">
        <div class="hero__collage">
            <?php foreach ($heroFotos as $i => $f): ?>
                <figure class="hero__photo hero__photo--<?= $i + 1 ?>">
                    <img src="<?= e(foto($f['id'], 700, 700)) ?>" alt="<?= e($f['alt']) ?>" width="700" height="700"<?= $i > 1 ? ' loading="lazy"' : '' ?>>
                </figure>
            <?php endforeach; ?>

            <!-- Accesorios decorativos (pelota y frisbee) -->
            <span class="hero__ball" aria-hidden="true"></span>
            <span class="hero__frisbee" aria-hidden="true"></span>

            <div class="hero__card">
                <h1 class="hero__title" id="hero-title">Happy Tails Start Here</h1>
                <p class="hero__subtitle">Curated essentials for every wag, purr and hop</p>
                <a class="hero__cta" id="btn-hero-shop" href="#shop">Shop<br>Now</a>
            </div>
        </div>
    </section>

    <!-- ===== CATEGORÍAS ===== -->
    <section class="categories" id="shop" aria-labelledby="cat-title">
        <!-- Collar decorativo que une el hero con la sección -->
        <div class="collar" aria-hidden="true">
            <div class="collar__hardware">
                <svg class="collar__ring" viewBox="0 0 70 76" focusable="false">
                    <path d="M24 12H38a26 26 0 0 1 0 52H24" fill="none" stroke="#C9C66A" stroke-width="16" stroke-linecap="round"/>
                    <path d="M24 12H38a26 26 0 0 1 0 52H24" fill="none" stroke="#F0EE97" stroke-width="10" stroke-linecap="round"/>
                </svg>
                <svg class="collar__buckle" viewBox="0 0 150 90" focusable="false">
                    <rect x="4" y="6" width="142" height="78" rx="16" fill="#F0EE97" stroke="#C9C66A" stroke-width="3"/>
                    <rect x="20" y="22" width="34" height="46" rx="8" fill="#D9D67A"/>
                    <rect x="62" y="18" width="70" height="54" rx="10" fill="#F4F2A4" stroke="#C9C66A" stroke-width="3"/>
                    <rect x="74" y="34" width="46" height="22" rx="6" fill="#E3E086"/>
                    <rect x="54" y="42" width="14" height="6" rx="3" fill="#C9C66A"/>
                </svg>
            </div>
        </div>

        <div class="container">
            <h2 class="section-title" id="cat-title">Happy Tails Start Here</h2>

            <div class="categories__grid">
                <?php foreach ($categorias as $c): ?>
                    <a class="cat-card cat-card--<?= e($c['clase']) ?>" href="#shop-<?= e(strtolower(str_replace(' ', '-', $c['nombre']))) ?>">
                        <span class="cat-card__photo">
                            <img src="<?= e(foto($c['id'], 480, 480)) ?>" alt="<?= e($c['alt']) ?>" width="480" height="480" loading="lazy">
                        </span>
                        <span class="cat-card__name"><?= e($c['nombre']) ?></span>
                    </a>
                <?php endforeach; ?>
            </div>
        </div>
    </section>

    <!-- ===== BEST SELLERS ===== -->
    <section class="bestsellers" id="best-sellers" aria-labelledby="bs-title">
        <div class="container">
            <h2 class="section-title" id="bs-title">Best Sellers</h2>

            <div class="bestsellers__top">
                <article class="feature-card">
                    <img src="<?= e(foto('1543466835-00a7907e9de1', 1100, 900)) ?>" alt="Happy beagle posing for the camera" width="1100" height="900" loading="lazy">
                    <div class="feature-card__caption">
                        <span class="pill pill--cream">Fan favorite</span>
                        <h3>Fetch &amp; Play Collection</h3>
                    </div>
                </article>

                <article class="product product--wine">
                    <div class="product__media">
                        <span class="pill pill--wine">Sale</span>
                        <img src="<?= e(foto($destacado['id'], 600, 600)) ?>" alt="<?= e($destacado['alt']) ?>" width="600" height="600" loading="lazy">
                        <a class="product__arrow" href="#best-sellers" aria-label="View <?= e($destacado['nombre']) ?>">&rsaquo;</a>
                    </div>
                    <div class="product__info">
                        <h3><?= e($destacado['nombre']) ?></h3>
                        <p class="product__price"><s><?= e($destacado['antes']) ?></s> <?= e($destacado['precio']) ?></p>
                    </div>
                </article>
            </div>

            <div class="carousel" aria-label="More best sellers">
                <div class="carousel__controls">
                    <button class="carousel__btn" id="btn-prev" type="button" aria-label="Previous products">&lsaquo;</button>
                    <button class="carousel__btn" id="btn-next" type="button" aria-label="Next products">&rsaquo;</button>
                </div>
                <div class="carousel__track" id="carousel-track" tabindex="0">
                    <?php foreach ($productos as $p): ?>
                        <article class="product product--<?= e($p['tono']) ?>">
                            <div class="product__media">
                                <?php if ($p['antes'] !== ''): ?><span class="pill pill--wine">Sale</span><?php endif; ?>
                                <img src="<?= e(foto($p['id'], 520, 520)) ?>" alt="<?= e($p['alt']) ?>" width="520" height="520" loading="lazy">
                                <a class="product__arrow" href="#best-sellers" aria-label="View <?= e($p['nombre']) ?>">&rsaquo;</a>
                            </div>
                            <div class="product__info">
                                <h3><?= e($p['nombre']) ?></h3>
                                <p class="product__price"><?php if ($p['antes'] !== ''): ?><s><?= e($p['antes']) ?></s> <?php endif; ?><?= e($p['precio']) ?></p>
                            </div>
                        </article>
                    <?php endforeach; ?>
                </div>
            </div>
        </div>
    </section>

    <!-- ===== SEASONAL GEAR ===== -->
    <section class="seasonal" id="seasonal" aria-labelledby="seasonal-title">
        <div class="container seasonal__grid">
            <article class="seasonal__promo">
                <h2 id="seasonal-title">Seasonal Gear</h2>
                <p>Cozy layers, festive toys and weather-ready essentials, for the coldest walks and the warmest cuddles.</p>
                <a class="btn btn--wine" id="btn-seasonal-shop" href="#shop">Shop Now</a>
            </article>

            <article class="seasonal__item">
                <div class="seasonal__img">
                    <img src="<?= e(foto('1583511666372-62fc211f8377', 600, 700)) ?>" alt="French bulldog in cozy pajamas" width="600" height="700" loading="lazy">
                </div>
                <h3>Cozy Pajama Set</h3>
                <p>$29.00</p>
            </article>

            <article class="seasonal__item">
                <div class="seasonal__img">
                    <img src="<?= e(foto('1591769225440-811ad7d6eab3', 600, 700)) ?>" alt="Schnauzer wearing round glasses" width="600" height="700" loading="lazy">
                </div>
                <h3>Winter Walk Bundle</h3>
                <p>$38.00</p>
            </article>
        </div>
    </section>

    <!-- ===== HOW IT WORKS ===== -->
    <section class="how" id="how-it-works" aria-labelledby="how-title">
        <div class="container">
            <h2 class="section-title" id="how-title">How It Works</h2>
            <p class="section-lead">Shopping for your best friend should feel as good as a belly rub. Here is how we make it easy.</p>

            <div class="how__grid">
                <?php foreach ($pasos as $p): ?>
                    <article class="how-card">
                        <div class="how-card__icon" aria-hidden="true">
                            <?php if ($p['icono'] === 'caja'): ?>
                                <svg viewBox="0 0 64 64" fill="none" stroke="currentColor" stroke-width="3.5" stroke-linejoin="round" stroke-linecap="round"><path d="M8 20 32 8l24 12v26L32 58 8 46V20Z"/><path d="M8 20l24 12 24-12M32 32v26"/><path d="M20 14l24 12"/></svg>
                            <?php elseif ($p['icono'] === 'camion'): ?>
                                <svg viewBox="0 0 64 64" fill="none" stroke="currentColor" stroke-width="3.5" stroke-linejoin="round" stroke-linecap="round"><path d="M4 16h34v28H4zM38 24h12l10 10v10H38"/><circle cx="16" cy="48" r="6" fill="#3D4836"/><circle cx="48" cy="48" r="6" fill="#3D4836"/></svg>
                            <?php else: ?>
                                <svg viewBox="0 0 64 64" fill="none" stroke="currentColor" stroke-width="3.5" stroke-linejoin="round" stroke-linecap="round"><path d="M32 8v5M14 46h36c-4-4-6-9-6-17a12 12 0 0 0-24 0c0 8-2 13-6 17Z"/><path d="M26 52a6 6 0 0 0 12 0"/></svg>
                            <?php endif; ?>
                        </div>
                        <h3><?= e($p['titulo']) ?></h3>
                        <p><?= e($p['texto']) ?></p>
                    </article>
                <?php endforeach; ?>
            </div>
        </div>
    </section>

    <!-- ===== TESTIMONIOS ===== -->
    <section class="voices" id="contact" aria-labelledby="voices-title">
        <div class="container">
            <h2 class="section-title" id="voices-title">Voices of the Petshop Community</h2>

            <div class="voices__grid">
                <?php foreach ($testimonios as $t): ?>
                    <figure class="voice voice--<?= e($t['clase']) ?>">
                        <img class="voice__avatar" src="<?= e(foto($t['id'], 240, 240)) ?>" alt="<?= e($t['alt']) ?>" width="120" height="120" loading="lazy">
                        <blockquote>&ldquo;<?= e($t['texto']) ?>&rdquo;</blockquote>
                        <figcaption><?= e($t['nombre']) ?></figcaption>
                    </figure>
                <?php endforeach; ?>
            </div>
        </div>
    </section>

    <!-- ===== MARQUESINA ===== -->
    <div class="marquee" aria-label="Our values: Recycled Materials, Hand-Selected, Earth-First">
        <div class="marquee__track" aria-hidden="true">
            <?php for ($copia = 0; $copia < 2; $copia++): ?>
                <div class="marquee__group">
                    <?php for ($r = 0; $r < 3; $r++): foreach ($marquesina as $palabra): ?>
                        <span><?= e($palabra) ?></span><span class="marquee__dot">&bull;</span>
                    <?php endforeach; endfor; ?>
                </div>
            <?php endfor; ?>
        </div>
    </div>
</main>

<!-- ===== FOOTER ===== -->
<footer class="footer" id="login">
    <div class="footer__inner">
        <div class="footer__content">
            <a class="footer__logo" href="./index.php">Petshop</a>
            <p class="footer__tagline">Curated essentials for every wag, purr and hop.</p>
            <nav class="footer__links" aria-label="Legal">
                <?php foreach ($legales as $l): ?>
                    <a href="#<?= e(strtolower($l)) ?>"><?= e($l) ?></a>
                <?php endforeach; ?>
            </nav>
            <p class="footer__copy">&copy; <?= date('Y') ?> Petshop. All rights reserved.</p>
        </div>
        <div class="footer__photo">
            <img src="<?= e(foto('1583511655857-d19b40a7a54e', 700, 700)) ?>" alt="French bulldog in a yellow sweater on a blue background" width="700" height="700" loading="lazy">
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

        // Flechas del carrusel de productos
        var track = document.getElementById('carousel-track');
        function mover(dir) {
            track.scrollBy({ left: dir * track.clientWidth * 0.8, behavior: 'smooth' });
        }
        document.getElementById('btn-prev').addEventListener('click', function () { mover(-1); });
        document.getElementById('btn-next').addEventListener('click', function () { mover(1); });
    })();
</script>
</body>
</html>
