<?php
/**
 * Petshop – Catálogo Shop con filtros laterales.
 * Estética retro/editorial inspirada en la plantilla "Wagora".
 * Estilos: ./css/website.css (secciones "Catálogo Shop y Filtros" y "Carrito Lateral").
 * Datos: ./data/productos.php. La carpeta conexion/ no se toca en esta página.
 */

require __DIR__ . '/data/productos.php';

/** Escapa texto para imprimirlo de forma segura en HTML. */
function e(string $texto): string
{
    return htmlspecialchars($texto, ENT_QUOTES, 'UTF-8');
}

/** Formatea un precio como $0.00. */
function precio(float $valor): string
{
    return '$' . number_format($valor, 2);
}

// Enlaces legales del pie de página
$legales = [
    'Accessibility Statement' => '#accessibility',
    'Shipping Policy'         => '#shipping',
    'Refund Policy'           => '#refund',
    'Terms & Conditions'      => '#terms',
    'Privacy Policy'          => '#privacy',
];

// Secciones colapsables del filtro (solo presentación visual)
$filtrosExtra = [
    'Color'  => ['Pink', 'Sage', 'Blue', 'Burgundy'],
    'Count'  => ['1 pack', '3 pack', '6 pack'],
    'Flavor' => ['Salmon', 'Chicken', 'Turkey'],
];

$precioMin = 3;
$precioMax = 60;
?>
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title>Shop All Products | Petshop</title>
    <meta name="description" content="Browse every Petshop essential: eco toys, pet food and care accessories for dogs, cats, birds and small pets. Filter by price and category.">
    <meta name="theme-color" content="#501726">

    <!-- Tipografías: Fredoka / DynaPuff (títulos bubble) y Quicksand (texto) -->
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <link href="https://fonts.googleapis.com/css2?family=DynaPuff:wght@500;700&family=Fredoka:wght@400;500;600;700&family=Quicksand:wght@500;600;700&display=swap" rel="stylesheet">

    <link rel="stylesheet" href="./css/website.css">
</head>
<body class="page-shop">

<a class="skip-link" href="#contenido">Skip to content</a>

<!-- ===== HEADER FLOTANTE TIPO PÍLDORA ===== -->
<header class="header" id="site-header">
    <a class="header__logo" href="../../../index.php" aria-label="Petshop – home">Petshop</a>

    <nav class="header__nav" id="main-nav" aria-label="Main navigation">
        <a href="./about.php">About</a>
        <a href="./shop.php" class="is-active" aria-current="page">Shop</a>
        <a href="./contact.php">Contact</a>
    </nav>

    <div class="header__actions">
        <a class="header__login" id="btn-login" href="./login.php">
            <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><circle cx="12" cy="12" r="11" fill="currentColor"/><circle cx="12" cy="9.5" r="3.6" fill="#FDF18F"/><path d="M4.8 19.2c1.4-3.3 4-4.9 7.2-4.9s5.8 1.6 7.2 4.9A10.9 10.9 0 0 1 12 23a10.9 10.9 0 0 1-7.2-3.8Z" fill="#FDF18F"/></svg>
            <span>Log In</span>
        </a>
        <a class="header__bag" id="btn-cart" href="#cart" role="button" aria-haspopup="dialog" aria-controls="cart-drawer" aria-label="Open shopping bag, 0 items">
            <svg viewBox="0 0 28 34" aria-hidden="true" focusable="false"><path d="M9 11V8a5 5 0 0 1 10 0v3" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"/><path d="M3 11h22l2 20a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2l2-20Z" fill="currentColor"/></svg>
            <span class="header__bag-count" id="cart-badge">0</span>
        </a>
        <button class="header__toggle" id="btn-menu" type="button" aria-expanded="false" aria-controls="main-nav" aria-label="Open menu">
            <span></span><span></span><span></span>
        </button>
    </div>
</header>

<main id="contenido" class="shop">
    <div class="shop__wrap">

        <!-- Breadcrumbs -->
        <nav class="breadcrumbs" aria-label="Breadcrumb">
            <ol>
                <li><a href="../../../index.php">Home</a></li>
                <li aria-current="page" id="crumb-current">All Products</li>
            </ol>
        </nav>

        <!-- Botón de filtros (solo móvil) -->
        <button class="shop__filters-btn" id="btn-filters" type="button" aria-expanded="false" aria-controls="shop-sidebar">
            <span>Filters</span>
            <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="M4 7h16M7 12h10M10 17h4" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"/></svg>
        </button>

        <div class="shop__layout">

            <!-- ===== SIDEBAR DE FILTROS ===== -->
            <aside class="sidebar" id="shop-sidebar" aria-label="Product filters">
                <section class="sidebar__block" aria-labelledby="browse-title">
                    <h2 class="sidebar__title" id="browse-title">Browse by</h2>
                    <ul class="sidebar__list" id="browse-list">
                        <?php foreach ($categoriasShop as $slug => $nombre): ?>
                            <li>
                                <a href="./shop.php?cat=<?= e($slug) ?>" data-cat="<?= e($slug) ?>" data-name="<?= e($nombre) ?>"<?= $slug === 'all' ? ' class="is-active" aria-current="true"' : '' ?>><?= e($nombre) ?></a>
                            </li>
                        <?php endforeach; ?>
                    </ul>
                </section>

                <section class="sidebar__block" aria-labelledby="filter-title">
                    <h2 class="sidebar__title" id="filter-title">Filter by</h2>

                    <!-- Precio: slider doble -->
                    <div class="acc acc--filter is-open">
                        <button class="acc__btn" type="button" aria-expanded="true" aria-controls="panel-price" id="btn-acc-price">
                            <span>Price</span><span class="acc__icon" aria-hidden="true"></span>
                        </button>
                        <div class="acc__panel" id="panel-price" role="region" aria-labelledby="btn-acc-price">
                            <div class="acc__inner">
                                <div class="range" id="price-range" style="--lo:0%;--hi:100%">
                                    <div class="range__track"></div>
                                    <input type="range" id="price-min" min="<?= $precioMin ?>" max="<?= $precioMax ?>" step="1" value="<?= $precioMin ?>" aria-label="Minimum price">
                                    <input type="range" id="price-max" min="<?= $precioMin ?>" max="<?= $precioMax ?>" step="1" value="<?= $precioMax ?>" aria-label="Maximum price">
                                </div>
                                <div class="range__values">
                                    <span id="price-min-label">$<?= $precioMin ?></span>
                                    <span id="price-max-label">$<?= $precioMax ?></span>
                                </div>
                            </div>
                        </div>
                    </div>

                    <?php foreach ($filtrosExtra as $titulo => $opciones): $idf = strtolower($titulo); ?>
                        <div class="acc acc--filter">
                            <button class="acc__btn" type="button" aria-expanded="false" aria-controls="panel-<?= e($idf) ?>" id="btn-acc-<?= e($idf) ?>">
                                <span><?= e($titulo) ?></span><span class="acc__icon" aria-hidden="true"></span>
                            </button>
                            <div class="acc__panel" id="panel-<?= e($idf) ?>" role="region" aria-labelledby="btn-acc-<?= e($idf) ?>">
                                <div class="acc__inner">
                                    <ul class="checks">
                                        <?php foreach ($opciones as $op): ?>
                                            <li><label><input type="checkbox" name="<?= e($idf) ?>[]" value="<?= e($op) ?>"><span><?= e($op) ?></span></label></li>
                                        <?php endforeach; ?>
                                    </ul>
                                </div>
                            </div>
                        </div>
                    <?php endforeach; ?>
                </section>
            </aside>

            <!-- ===== LISTADO DE PRODUCTOS ===== -->
            <section class="catalog" aria-labelledby="catalog-title">
                <h1 class="catalog__title" id="catalog-title">All Products</h1>

                <div class="catalog__bar">
                    <p class="catalog__count" id="product-count" role="status" aria-live="polite"><?= count($productos) ?> products</p>

                    <label class="sort">
                        <span class="sort__label">Sort by:</span>
                        <select class="sort__select" id="sort-select">
                            <option value="recommended">Recommended</option>
                            <option value="price-asc">Price (low to high)</option>
                            <option value="price-desc">Price (high to low)</option>
                            <option value="name">Name (A–Z)</option>
                        </select>
                        <svg class="sort__chev" viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="m6 9 6 6 6-6" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>
                    </label>
                </div>

                <div class="catalog__grid" id="product-grid">
                    <?php foreach ($productos as $i => $p): ?>
                        <article class="shop-card"
                                 data-index="<?= $i ?>"
                                 data-price="<?= e((string) $p['precio']) ?>"
                                 data-name="<?= e($p['nombre']) ?>"
                                 data-tags="<?= e($p['categoria'] . ' ' . implode(' ', $p['animales'])) ?>">
                            <a class="shop-card__link" href="./product-detail.php?id=<?= e($p['id']) ?>">
                                <span class="shop-card__media">
                                    <?php if ($p['badge'] !== ''): ?>
                                        <span class="badge"><?= e($p['badge']) ?></span>
                                    <?php endif; ?>
                                    <img src="./img/products/<?= e($p['img']) ?>" alt="<?= e($p['nombre']) ?>" width="800" height="800"<?= $i > 2 ? ' loading="lazy"' : '' ?>>
                                </span>
                                <h3 class="shop-card__name"><?= e($p['nombre']) ?></h3>
                                <p class="shop-card__price"><?= e(precio($p['precio'])) ?></p>
                            </a>
                        </article>
                    <?php endforeach; ?>
                </div>

                <p class="catalog__empty" id="catalog-empty" hidden>No products match your filters. Try widening the price range or choosing another category.</p>
            </section>
        </div>
    </div>
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

<!-- ===== CARRITO LATERAL (DRAWER) ===== -->
<div class="cart-overlay" id="cart-overlay" aria-hidden="true"></div>
<aside class="cart-drawer" id="cart-drawer" role="dialog" aria-modal="true" aria-labelledby="cart-title" aria-hidden="true">
    <div class="cart-drawer__head">
        <h2 class="cart-drawer__title" id="cart-title">Cart <span id="cart-label">(0 items)</span></h2>
        <button class="cart-drawer__close" id="btn-cart-close" type="button" aria-label="Close cart">
            <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="M5 5l14 14M19 5 5 19" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/></svg>
        </button>
    </div>
    <div class="cart-drawer__body">
        <p class="cart-drawer__empty" id="cart-empty">Your cart is empty.</p>
        <ul class="cart-list" id="cart-list"></ul>
    </div>
    <div class="cart-drawer__foot" id="cart-foot" hidden>
        <div class="cart-subtotal"><span>Subtotal</span><strong id="cart-subtotal">$0.00</strong></div>
        <a class="cart-checkout" id="btn-checkout" href="#checkout">Checkout</a>
        <button class="cart-clear" id="btn-cart-clear" type="button">Clear cart</button>
    </div>
</aside>

<script>
(function () {
    'use strict';

    /* ---------- Menú móvil de la cápsula ---------- */
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

    /* ---------- Carrito lateral (guardado en localStorage) ---------- */
    var KEY = 'petshop_cart';
    var drawer = document.getElementById('cart-drawer');
    var overlay = document.getElementById('cart-overlay');
    var list = document.getElementById('cart-list');
    var empty = document.getElementById('cart-empty');
    var foot = document.getElementById('cart-foot');
    var lastFocus = null;

    function cargar() {
        try { return JSON.parse(localStorage.getItem(KEY)) || []; } catch (err) { return []; }
    }
    function guardar(items) {
        try { localStorage.setItem(KEY, JSON.stringify(items)); } catch (err) { /* sin almacenamiento */ }
    }
    function dinero(n) { return '$' + n.toFixed(2); }

    function pintarCarrito() {
        var items = cargar();
        var total = 0, unidades = 0;
        list.innerHTML = '';
        items.forEach(function (it, idx) {
            total += it.price * it.qty;
            unidades += it.qty;
            var li = document.createElement('li');
            li.className = 'cart-item';
            var img = document.createElement('img');
            img.src = it.img; img.alt = ''; img.width = 64; img.height = 64;
            var info = document.createElement('div');
            info.className = 'cart-item__info';
            var nombre = document.createElement('p');
            nombre.className = 'cart-item__name'; nombre.textContent = it.name;
            var meta = document.createElement('p');
            meta.className = 'cart-item__meta';
            meta.textContent = (it.color ? it.color + ' · ' : '') + 'Qty ' + it.qty + ' · ' + dinero(it.price * it.qty);
            var quitar = document.createElement('button');
            quitar.type = 'button'; quitar.className = 'cart-item__remove';
            quitar.textContent = 'Remove'; quitar.setAttribute('data-remove', idx);
            info.appendChild(nombre); info.appendChild(meta); info.appendChild(quitar);
            li.appendChild(img); li.appendChild(info);
            list.appendChild(li);
        });
        empty.hidden = items.length > 0;
        foot.hidden = items.length === 0;
        document.getElementById('cart-subtotal').textContent = dinero(total);
        document.getElementById('cart-label').textContent = '(' + unidades + (unidades === 1 ? ' item)' : ' items)');
        document.getElementById('cart-badge').textContent = unidades;
        document.getElementById('btn-cart').setAttribute('aria-label', 'Open shopping bag, ' + unidades + (unidades === 1 ? ' item' : ' items'));
    }

    function abrirCarrito() {
        lastFocus = document.activeElement;
        drawer.classList.add('is-open');
        overlay.classList.add('is-open');
        drawer.setAttribute('aria-hidden', 'false');
        overlay.setAttribute('aria-hidden', 'false');
        document.body.classList.add('cart-open');
        document.getElementById('btn-cart-close').focus();
    }
    function cerrarCarrito() {
        drawer.classList.remove('is-open');
        overlay.classList.remove('is-open');
        drawer.setAttribute('aria-hidden', 'true');
        overlay.setAttribute('aria-hidden', 'true');
        document.body.classList.remove('cart-open');
        if (lastFocus && lastFocus.focus) { lastFocus.focus(); }
    }

    document.getElementById('btn-cart').addEventListener('click', function (ev) { ev.preventDefault(); abrirCarrito(); });
    document.getElementById('btn-cart-close').addEventListener('click', cerrarCarrito);
    overlay.addEventListener('click', cerrarCarrito);
    document.addEventListener('keydown', function (ev) { if (ev.key === 'Escape' && drawer.classList.contains('is-open')) { cerrarCarrito(); } });
    document.getElementById('btn-cart-clear').addEventListener('click', function () { guardar([]); pintarCarrito(); });
    document.getElementById('btn-checkout').addEventListener('click', function (ev) { ev.preventDefault(); });
    list.addEventListener('click', function (ev) {
        var idx = ev.target.getAttribute('data-remove');
        if (idx === null) { return; }
        var items = cargar();
        items.splice(parseInt(idx, 10), 1);
        guardar(items);
        pintarCarrito();
    });
    pintarCarrito();

    /* ---------- Acordeones de filtros ---------- */
    document.querySelectorAll('.acc__btn').forEach(function (btn) {
        btn.addEventListener('click', function () {
            var acc = btn.closest('.acc');
            var abierto = acc.classList.toggle('is-open');
            btn.setAttribute('aria-expanded', abierto ? 'true' : 'false');
        });
    });

    /* ---------- Botón de filtros (móvil) ---------- */
    var sidebar = document.getElementById('shop-sidebar');
    var btnFiltros = document.getElementById('btn-filters');
    btnFiltros.addEventListener('click', function () {
        var abierto = sidebar.classList.toggle('is-open');
        btnFiltros.setAttribute('aria-expanded', abierto ? 'true' : 'false');
    });

    /* ---------- Filtrado, orden y contador ---------- */
    var grid = document.getElementById('product-grid');
    var cards = Array.prototype.slice.call(grid.querySelectorAll('.shop-card'));
    var count = document.getElementById('product-count');
    var vacio = document.getElementById('catalog-empty');
    var titulo = document.getElementById('catalog-title');
    var crumb = document.getElementById('crumb-current');
    var links = Array.prototype.slice.call(document.querySelectorAll('#browse-list a'));
    var minInput = document.getElementById('price-min');
    var maxInput = document.getElementById('price-max');
    var rango = document.getElementById('price-range');
    var sortSel = document.getElementById('sort-select');
    var estado = { cat: 'all' };

    function aplicar() {
        var min = Math.min(+minInput.value, +maxInput.value);
        var max = Math.max(+minInput.value, +maxInput.value);
        var lo = +minInput.min, hi = +minInput.max;
        rango.style.setProperty('--lo', ((min - lo) / (hi - lo) * 100) + '%');
        rango.style.setProperty('--hi', ((max - lo) / (hi - lo) * 100) + '%');
        document.getElementById('price-min-label').textContent = '$' + min;
        document.getElementById('price-max-label').textContent = '$' + max;

        var visibles = cards.filter(function (c) {
            var precio = parseFloat(c.getAttribute('data-price'));
            var tags = ' ' + c.getAttribute('data-tags') + ' ';
            var okCat = estado.cat === 'all' || tags.indexOf(' ' + estado.cat + ' ') !== -1;
            var ok = okCat && precio >= min && precio <= max;
            c.hidden = !ok;
            return ok;
        });

        var modo = sortSel.value;
        visibles.sort(function (a, b) {
            if (modo === 'price-asc')  { return a.getAttribute('data-price') - b.getAttribute('data-price'); }
            if (modo === 'price-desc') { return b.getAttribute('data-price') - a.getAttribute('data-price'); }
            if (modo === 'name')       { return a.getAttribute('data-name').localeCompare(b.getAttribute('data-name')); }
            return a.getAttribute('data-index') - b.getAttribute('data-index');
        });
        visibles.forEach(function (c) { grid.appendChild(c); });

        count.textContent = visibles.length + (visibles.length === 1 ? ' product' : ' products');
        vacio.hidden = visibles.length > 0;
    }

    function elegirCategoria(slug, pushUrl) {
        var activo = links.filter(function (a) { return a.getAttribute('data-cat') === slug; })[0] || links[0];
        estado.cat = activo.getAttribute('data-cat');
        links.forEach(function (a) {
            var on = a === activo;
            a.classList.toggle('is-active', on);
            if (on) { a.setAttribute('aria-current', 'true'); } else { a.removeAttribute('aria-current'); }
        });
        titulo.textContent = activo.getAttribute('data-name');
        crumb.textContent = activo.getAttribute('data-name');
        if (pushUrl && window.history && history.replaceState) { history.replaceState(null, '', activo.getAttribute('href')); }
        aplicar();
    }

    links.forEach(function (a) {
        a.addEventListener('click', function (ev) {
            ev.preventDefault();
            elegirCategoria(a.getAttribute('data-cat'), true);
        });
    });
    minInput.addEventListener('input', aplicar);
    maxInput.addEventListener('input', aplicar);
    sortSel.addEventListener('change', aplicar);

    var inicial = new URLSearchParams(window.location.search).get('cat') || 'all';
    elegirCategoria(inicial, false);
})();
</script>
</body>
</html>
