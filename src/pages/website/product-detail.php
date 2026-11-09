<?php
/**
 * Petshop – Detalle de producto.
 * Estética retro/editorial inspirada en la plantilla "Wagora".
 * Estilos: ./css/website.css (secciones "Detalle de Producto" y "Carrito Lateral").
 * Uso: product-detail.php?id=adjustable-eco-collar (por defecto, el collar ecológico).
 * La carpeta conexion/ no se toca en esta página.
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

// Producto solicitado (si el id no existe se muestra el collar ecológico)
$idPedido = isset($_GET['id']) ? (string) $_GET['id'] : 'adjustable-eco-collar';
$producto = buscarProducto($productos, $idPedido) ?? buscarProducto($productos, 'adjustable-eco-collar');

$colores    = $producto['colores'] ?? [];
$categoria  = $categoriaNombres[$producto['categoria']] ?? 'All Products';
$miniaturas = $colores
    ? array_map(fn ($c) => ['img' => $c['img'], 'alt' => $producto['nombre'] . ' – ' . $c['nombre']], array_reverse($colores))
    : [['img' => $producto['img'], 'alt' => $producto['nombre']]];

// Acordeones informativos
$acordeones = [
    ['id' => 'info',     'titulo' => 'Product Info',
     'texto' => 'Made from recycled materials with a durable, nickel-free buckle. Spot clean with mild soap and air dry. Designed to be lightweight, soft on the neck and built to last season after season.'],
    ['id' => 'returns',  'titulo' => 'Return & Refund Policy',
     'texto' => 'Not the right fit? Return unused items within 30 days of delivery for a full refund or exchange. Items must be in their original packaging. Contact us at info@petshop.com to start a return.'],
    ['id' => 'shipping', 'titulo' => 'Shipping Info',
     'texto' => 'Orders ship within 1–2 business days in plastic-free, recycled packaging. Standard delivery takes 3–5 business days. Free local pickup is available at our neighborhood shop.'],
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
    <title><?= e($producto['nombre']) ?> | Petshop</title>
    <meta name="description" content="<?= e($producto['descripcion']) ?>">
    <meta name="theme-color" content="#501726">

    <!-- Tipografías: Fredoka / DynaPuff (títulos bubble) y Quicksand (texto) -->
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <link href="https://fonts.googleapis.com/css2?family=DynaPuff:wght@500;700&family=Fredoka:wght@400;500;600;700&family=Quicksand:wght@500;600;700&display=swap" rel="stylesheet">

    <link rel="stylesheet" href="./css/website.css">
</head>
<body class="page-product">

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

<main id="contenido" class="product-page">
    <div class="product-page__wrap">

        <!-- Breadcrumbs -->
        <nav class="breadcrumbs" aria-label="Breadcrumb">
            <ol>
                <li><a href="../../../index.php">Home</a></li>
                <li><a href="./shop.php?cat=<?= e($producto['categoria']) ?>"><?= e($categoria) ?></a></li>
                <li aria-current="page"><?= e($producto['nombre']) ?></li>
            </ol>
        </nav>

        <div class="product-layout">

            <!-- ===== GALERÍA ===== -->
            <div class="gallery">
                <?php if (count($miniaturas) > 1): ?>
                    <ul class="gallery__thumbs" aria-label="Product images">
                        <?php foreach ($miniaturas as $k => $m): ?>
                            <li>
                                <button class="gallery__thumb<?= $k === 0 ? ' is-active' : '' ?>" type="button" data-img="./img/products/<?= e($m['img']) ?>" data-alt="<?= e($m['alt']) ?>" aria-label="View image <?= $k + 1 ?>" aria-pressed="<?= $k === 0 ? 'true' : 'false' ?>">
                                    <img src="./img/products/<?= e($m['img']) ?>" alt="" width="120" height="120">
                                </button>
                            </li>
                        <?php endforeach; ?>
                    </ul>
                <?php endif; ?>

                <figure class="gallery__main">
                    <?php if ($producto['badge'] !== ''): ?>
                        <span class="badge"><?= e($producto['badge']) ?></span>
                    <?php endif; ?>
                    <img id="main-image" src="./img/products/<?= e($producto['img']) ?>" alt="<?= e($producto['nombre']) ?>" width="800" height="800">
                </figure>
            </div>

            <!-- ===== PANEL DE COMPRA ===== -->
            <div class="buybox">
                <h1 class="buybox__title"><?= e($producto['nombre']) ?></h1>
                <p class="buybox__price" id="product-price"><?= e(precio($producto['precio'])) ?></p>

                <form class="buybox__form" id="buy-form" novalidate>
                    <?php if ($colores): ?>
                        <fieldset class="field">
                            <legend class="field__label">Color <span aria-hidden="true">*</span></legend>
                            <div class="swatches" role="radiogroup" aria-label="Color">
                                <?php foreach ($colores as $c): ?>
                                    <label class="swatch" title="<?= e($c['nombre']) ?>">
                                        <input type="radio" name="color" value="<?= e($c['nombre']) ?>" data-img="./img/products/<?= e($c['img']) ?>" required>
                                        <span class="swatch__dot" style="background:<?= e($c['hex']) ?>"></span>
                                        <span class="visually-hidden"><?= e($c['nombre']) ?></span>
                                    </label>
                                <?php endforeach; ?>
                            </div>
                            <p class="field__selected" id="color-name" aria-live="polite"></p>
                        </fieldset>
                    <?php endif; ?>

                    <div class="field">
                        <label class="field__label" for="qty-input">Quantity <span aria-hidden="true">*</span></label>
                        <div class="qty">
                            <button class="qty__btn" id="qty-minus" type="button" aria-label="Decrease quantity">&minus;</button>
                            <input class="qty__input" id="qty-input" type="number" min="1" max="99" value="1" inputmode="numeric">
                            <button class="qty__btn" id="qty-plus" type="button" aria-label="Increase quantity">+</button>
                        </div>
                    </div>

                    <p class="buybox__msg" id="form-msg" role="alert" hidden></p>

                    <div class="buybox__actions">
                        <button class="btn-outline" id="btn-add-cart" type="button">Add to Cart</button>
                        <button class="btn-solid" id="btn-buy-now" type="button">Buy Now</button>
                    </div>
                </form>

                <p class="buybox__desc"><?= e($producto['descripcion']) ?></p>

                <div class="accordion">
                    <?php foreach ($acordeones as $a): ?>
                        <div class="acc acc--product">
                            <h2 class="acc__heading">
                                <button class="acc__btn" type="button" aria-expanded="false" aria-controls="acc-<?= e($a['id']) ?>" id="btn-acc-<?= e($a['id']) ?>">
                                    <span><?= e($a['titulo']) ?></span><span class="acc__icon" aria-hidden="true"></span>
                                </button>
                            </h2>
                            <div class="acc__panel" id="acc-<?= e($a['id']) ?>" role="region" aria-labelledby="btn-acc-<?= e($a['id']) ?>">
                                <div class="acc__inner"><p><?= e($a['texto']) ?></p></div>
                            </div>
                        </div>
                    <?php endforeach; ?>
                </div>
            </div>
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

    /* ---------- Datos del producto (para el carrito) ---------- */
    var PRODUCTO = <?= json_encode([
        'id'    => $producto['id'],
        'name'  => $producto['nombre'],
        'price' => $producto['precio'],
        'img'   => './img/products/' . $producto['img'],
    ], JSON_UNESCAPED_UNICODE | JSON_HEX_TAG | JSON_HEX_AMP | JSON_HEX_APOS | JSON_HEX_QUOT) ?>;
    var REQUIERE_COLOR = <?= $colores ? 'true' : 'false' ?>;

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

    /* ---------- Acordeones (Product Info, Returns, Shipping) ---------- */
    document.querySelectorAll('.acc__btn').forEach(function (btn) {
        btn.addEventListener('click', function () {
            var acc = btn.closest('.acc');
            var abierto = acc.classList.toggle('is-open');
            btn.setAttribute('aria-expanded', abierto ? 'true' : 'false');
        });
    });

    /* ---------- Galería: miniaturas y muestras de color ---------- */
    var main = document.getElementById('main-image');
    var thumbs = Array.prototype.slice.call(document.querySelectorAll('.gallery__thumb'));

    function mostrarImagen(src, alt) {
        main.src = src;
        if (alt) { main.alt = alt; }
        thumbs.forEach(function (t) {
            var on = t.getAttribute('data-img') === src;
            t.classList.toggle('is-active', on);
            t.setAttribute('aria-pressed', on ? 'true' : 'false');
        });
    }
    thumbs.forEach(function (t) {
        t.addEventListener('click', function () { mostrarImagen(t.getAttribute('data-img'), t.getAttribute('data-alt')); });
    });

    var msg = document.getElementById('form-msg');
    var colorName = document.getElementById('color-name');
    document.querySelectorAll('input[name="color"]').forEach(function (r) {
        r.addEventListener('change', function () {
            mostrarImagen(r.getAttribute('data-img'));
            if (colorName) { colorName.textContent = r.value; }
            msg.hidden = true;
        });
    });

    /* ---------- Selector de cantidad [- 1 +] ---------- */
    var qty = document.getElementById('qty-input');
    function cantidad() {
        var n = parseInt(qty.value, 10);
        if (isNaN(n) || n < 1) { n = 1; }
        if (n > 99) { n = 99; }
        return n;
    }
    document.getElementById('qty-minus').addEventListener('click', function () { qty.value = Math.max(1, cantidad() - 1); });
    document.getElementById('qty-plus').addEventListener('click', function () { qty.value = Math.min(99, cantidad() + 1); });
    qty.addEventListener('change', function () { qty.value = cantidad(); });

    /* ---------- Add to Cart / Buy Now ---------- */
    function agregar() {
        var elegido = document.querySelector('input[name="color"]:checked');
        if (REQUIERE_COLOR && !elegido) {
            msg.textContent = 'Please choose a color.';
            msg.hidden = false;
            return false;
        }
        msg.hidden = true;
        var color = elegido ? elegido.value : '';
        var items = cargar();
        var existente = items.filter(function (it) { return it.id === PRODUCTO.id && it.color === color; })[0];
        if (existente) {
            existente.qty = Math.min(99, existente.qty + cantidad());
        } else {
            items.push({ id: PRODUCTO.id, name: PRODUCTO.name, price: PRODUCTO.price, img: elegido ? elegido.getAttribute('data-img') : PRODUCTO.img, color: color, qty: cantidad() });
        }
        guardar(items);
        pintarCarrito();
        abrirCarrito();
        return true;
    }
    document.getElementById('btn-add-cart').addEventListener('click', agregar);
    document.getElementById('btn-buy-now').addEventListener('click', agregar);
    document.getElementById('buy-form').addEventListener('submit', function (ev) { ev.preventDefault(); });
})();
</script>
</body>
</html>
