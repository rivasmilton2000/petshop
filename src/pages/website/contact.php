<?php
/** Contact: presentación independiente, sin cambios en conexion/. */
function e(string $text): string
{
    return htmlspecialchars($text, ENT_QUOTES, 'UTF-8');
}

$faqs = [
    ['id' => 'what-is-an-faq', 'category' => 'general', 'question' => 'What is an FAQ section?', 'answer' => 'An FAQ section can be used to quickly answer common questions about your business like “Where do you ship to?”, “What are your opening hours?”, or “How can I book a service?”.'],
    ['id' => 'why-faqs-matter', 'category' => 'general', 'question' => 'Why do FAQs matter?', 'answer' => 'FAQs help visitors find the information they need quickly and easily. They make it simpler to learn about your business, feel confident about a purchase, and get answers without waiting for a reply.'],
    ['id' => 'where-to-add-faqs', 'category' => 'general', 'question' => 'Where can I add my FAQs?', 'answer' => 'You can add FAQs to your contact page, product pages, or a dedicated help page. Place them wherever your visitors are most likely to have questions, so useful answers are always close at hand.'],
    ['id' => 'add-a-question', 'category' => 'setup', 'question' => 'How do I add a new question?', 'answer' => 'Start with a question your customers often ask, then write a clear, helpful answer. Group related questions together and keep the most useful information near the top.'],
    ['id' => 'organize-faqs', 'category' => 'setup', 'question' => 'How should I organize my FAQs?', 'answer' => 'Use simple categories such as orders, shipping, returns, and product care. Give each question a descriptive title so visitors can browse or search for the answer they need.'],
    ['id' => 'update-faqs', 'category' => 'setup', 'question' => 'Can I update my answers later?', 'answer' => 'Yes. Review your answers whenever your store hours, services, or policies change. Keeping your FAQs up to date helps your customers find reliable information.'],
];
$legales = [
    'Accessibility Statement' => '#accessibility',
    'Shipping Policy' => '#shipping',
    'Refund Policy' => '#refund',
    'Terms & Conditions' => '#terms',
    'Privacy Policy' => '#privacy',
];
?>
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title>Contact | Petshop</title>
    <meta name="description" content="Get in touch with Petshop, explore store hours and local pickup, and find answers to common questions.">
    <meta name="theme-color" content="#3D4836">
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <link href="https://fonts.googleapis.com/css2?family=DynaPuff:wght@500;700&family=Fredoka:wght@400;500;600;700&family=Quicksand:wght@500;600;700&display=swap" rel="stylesheet">
    <link rel="stylesheet" href="./css/website.css">
</head>
<body class="page-contact">
<a class="skip-link" href="#contenido">Skip to content</a>

<header class="header" id="site-header">
    <a class="header__logo" href="../../../index.php" aria-label="Petshop – home">Petshop</a>
    <nav class="header__nav" id="main-nav" aria-label="Main navigation">
        <a href="./about.php">About</a>
        <a href="./shop.php">Shop</a>
        <a href="./contact.php" class="is-active" aria-current="page">Contact</a>
    </nav>
    <div class="header__actions">
        <a class="header__login" href="./login.php">
            <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><circle cx="12" cy="12" r="11" fill="currentColor"/><circle cx="12" cy="9.5" r="3.6" fill="#FDF18F"/><path d="M4.8 19.2c1.4-3.3 4-4.9 7.2-4.9s5.8 1.6 7.2 4.9A10.9 10.9 0 0 1 12 23a10.9 10.9 0 0 1-7.2-3.8Z" fill="#FDF18F"/></svg>
            <span>Log In</span>
        </a>
        <a class="header__bag" id="contact-bag" href="./shop.php#cart" aria-label="Shopping bag, 0 items – view in Shop">
            <svg viewBox="0 0 28 34" aria-hidden="true" focusable="false"><path d="M9 11V8a5 5 0 0 1 10 0v3" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"/><path d="M3 11h22l2 20a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2l2-20Z" fill="currentColor"/></svg>
            <span class="header__bag-count" id="contact-bag-count">0</span>
        </a>
        <button class="header__toggle" id="btn-menu" type="button" aria-expanded="false" aria-controls="main-nav" aria-label="Open menu">
            <span></span><span></span><span></span>
        </button>
    </div>
</header>

<main id="contenido">
    <section class="contact-hero" aria-labelledby="contact-title">
        <h1 id="contact-title">Contact</h1>
    </section>

    <div class="contact-layout">
        <section class="contact-form-card" aria-labelledby="get-in-touch">
            <div class="contact-form-card__inner">
                <h2 class="contact-heading" id="get-in-touch">Get in Touch</h2>
                <!-- Frontend: Submit prepara un borrador; no afirma enviar ni guardar datos. -->
                <form class="contact-form" id="contact-form" action="mailto:info@petshop.com" method="post" enctype="text/plain" aria-describedby="contact-form-note">
                    <div class="contact-form__fields">
                        <label class="contact-field" for="first-name">
                            <span>First name <span aria-hidden="true">*</span></span>
                            <input id="first-name" name="First name" autocomplete="given-name" maxlength="80" required>
                        </label>
                        <label class="contact-field" for="last-name">
                            <span>Last name <span aria-hidden="true">*</span></span>
                            <input id="last-name" name="Last name" autocomplete="family-name" maxlength="80" required>
                        </label>
                        <label class="contact-field" for="contact-email">
                            <span>Email <span aria-hidden="true">*</span></span>
                            <input id="contact-email" name="Email" type="email" autocomplete="email" maxlength="254" required>
                        </label>
                        <div class="contact-field">
                            <label for="contact-phone">Phone</label>
                            <div class="contact-phone">
                                <select id="phone-country" name="Country code" aria-label="Phone country code">
                                    <option value="+503">🇸🇻 +503</option>
                                    <option value="+1">🇺🇸 +1</option>
                                    <option value="+52">🇲🇽 +52</option>
                                    <option value="+502">🇬🇹 +502</option>
                                    <option value="+504">🇭🇳 +504</option>
                                    <option value="+506">🇨🇷 +506</option>
                                    <option value="+34">🇪🇸 +34</option>
                                </select>
                                <input id="contact-phone" name="Phone" type="tel" autocomplete="tel-national" maxlength="30">
                            </div>
                        </div>
                        <label class="contact-field contact-field--message" for="contact-message">
                            <span>Write a message</span>
                            <textarea id="contact-message" name="Message" rows="4" maxlength="4000"></textarea>
                        </label>
                    </div>
                    <button class="contact-submit" type="submit">Submit</button>
                    <p class="contact-form__note" id="contact-form-note">Submitting opens a draft in your email app.</p>
                    <p class="contact-form__status" id="contact-form-status" role="status" aria-live="polite"></p>
                </form>
            </div>
        </section>

        <section class="contact-store" aria-labelledby="store-title">
            <h2 class="contact-heading" id="store-title">Store<br>Hours &amp; Pickup</h2>
            <dl class="contact-store__details">
                <div>
                    <dt>Local <br>Pickup</dt>
                    <dd>We offer a warm, tactile experience for our community. Simply visit our boutique for a curated selection of premium essentials.</dd>
                </div>
                <div>
                    <dt>Store <br>Hours</dt>
                    <dd>Mon – Fri: 10:00 AM – 6:00 PM<br>Sat: 10:00 AM – 4:00 PM<br>Sun: Closed</dd>
                </div>
                <div>
                    <dt>Visit Us</dt>
                    <dd><address>123 Pet Lane<br>Curated City, ST 12345</address></dd>
                </div>
            </dl>
        </section>

        <figure class="contact-photo">
            <img src="./img/contact-dog-walk.png" alt="A person holding colorful leashes with a dachshund, a French bulldog, a golden retriever and a collie against a sky-blue backdrop" width="1254" height="1254" loading="lazy">
        </figure>

        <section class="contact-map" aria-label="Illustrative store location map">
            <div class="contact-map__canvas">
                <div class="contact-map__controls" role="group" aria-label="Map view">
                    <button type="button" data-map-type="m" aria-pressed="true">Map</button>
                    <button type="button" data-map-type="k" aria-pressed="false">Satellite</button>
                </div>
                <iframe id="contact-map-frame" title="Interactive map of San Francisco — illustrative location" src="https://maps.google.com/maps?q=Mission%20Bay%2C%20San%20Francisco&amp;t=m&amp;z=14&amp;output=embed" width="800" height="700" loading="lazy" referrerpolicy="no-referrer-when-downgrade" allowfullscreen></iframe>
            </div>
            <p class="contact-map__note">Illustrative location · San Francisco <a href="https://www.google.com/maps/search/?api=1&amp;query=Mission+Bay+San+Francisco" target="_blank" rel="noopener noreferrer">Open map ↗</a></p>
        </section>
    </div>

    <section class="contact-faq" aria-labelledby="faq-title">
        <h2 class="contact-heading" id="faq-title">Common Questions</h2>
        <div class="contact-faq__toolbar">
            <div class="contact-faq__tabs" role="group" aria-label="FAQ categories">
                <button type="button" data-category="general" aria-pressed="true">General</button>
                <button type="button" data-category="setup" aria-pressed="false">Setting up FAQs</button>
            </div>
            <label class="contact-faq__search" for="faq-search">
                <span class="contact-sr-only">Search questions and answers</span>
                <input id="faq-search" type="search" placeholder="Looking for something?" aria-controls="faq-list">
                <svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="10" cy="10" r="7"/><path d="m15 15 6 6"/></svg>
            </label>
        </div>
        <div class="contact-faq__list" id="faq-list">
            <?php foreach ($faqs as $index => $faq): ?>
            <article class="contact-faq-item<?= $index === 0 ? ' is-open' : '' ?>" id="<?= e($faq['id']) ?>" data-faq-category="<?= e($faq['category']) ?>">
                <h3>
                    <button class="contact-faq-item__trigger" id="question-<?= e($faq['id']) ?>" type="button" aria-expanded="<?= $index === 0 ? 'true' : 'false' ?>" aria-controls="answer-<?= e($faq['id']) ?>">
                        <span><?= e($faq['question']) ?></span><span class="contact-faq-item__arrow" aria-hidden="true"></span>
                    </button>
                </h3>
                <div class="contact-faq-item__panel" id="answer-<?= e($faq['id']) ?>" role="region" aria-labelledby="question-<?= e($faq['id']) ?>">
                    <div class="contact-faq-item__clip">
                        <div class="contact-faq-item__answer">
                            <p><?= e($faq['answer']) ?></p>
                            <div class="contact-faq-item__share" role="group" aria-label="Share this answer">
                                <a data-share="facebook" href="https://www.facebook.com/" target="_blank" rel="noopener noreferrer" aria-label="Share on Facebook"><svg viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M22 12a10 10 0 1 0-11.6 9.9v-7H8V12h2.4V9.8c0-2.5 1.5-3.9 3.7-3.9 1.1 0 2.2.2 2.2.2v2.5h-1.2c-1.2 0-1.5.7-1.5 1.5V12h2.6l-.4 2.9h-2.2v7A10 10 0 0 0 22 12Z"/></svg></a>
                                <a data-share="x" href="https://x.com/" target="_blank" rel="noopener noreferrer" aria-label="Share on X"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="m3 2 18 20h-5L3 2h5l13 20M21 2 3 22" fill="none" stroke="currentColor" stroke-width="1.4"/></svg></a>
                                <a data-share="linkedin" href="https://www.linkedin.com/" target="_blank" rel="noopener noreferrer" aria-label="Share on LinkedIn"><svg viewBox="0 0 24 24" aria-hidden="true"><rect x="2" y="2" width="20" height="20" rx="1" fill="currentColor"/><path d="M7 10v8m4-8v8m0-4c0-5 6-5 6 0v4" fill="none" stroke="var(--contact-faq-row)" stroke-width="2.3"/><circle cx="7" cy="6.5" r="1.4" fill="var(--contact-faq-row)"/></svg></a>
                                <button type="button" data-copy-link aria-label="Copy link to this answer"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="m9 15 6-6m-7 3-3 3a4 4 0 0 0 6 6l3-3m-4-12 3-3a4 4 0 0 1 6 6l-3 3" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/></svg></button>
                            </div>
                        </div>
                    </div>
                </div>
            </article>
            <?php endforeach; ?>
        </div>
        <p class="contact-faq__empty" id="faq-empty" role="status" hidden>No questions found. Try another search or category.</p>
        <p class="contact-faq__feedback" id="faq-feedback" role="status" aria-live="polite"></p>
    </section>
</main>

<footer class="about-footer">
    <div class="about-footer__inner">
        <div class="about-footer__content">
            <a class="about-footer__logo" href="../../../index.php" aria-label="Petshop – home">Petshop</a>
            <nav class="about-footer__links" aria-label="Legal">
                <?php foreach ($legales as $name => $link): ?>
                <a href="<?= e($link) ?>"><?= e($name) ?></a>
                <?php endforeach; ?>
            </nav>
            <address class="about-footer__contact">
                <p>123 Pet Lane,<br>Curated City, ST 12345</p>
                <p><a href="mailto:info@petshop.com">info@petshop.com</a></p>
            </address>
        </div>
        <div class="about-footer__photo">
            <img src="./img/about-footer-dog.png" alt="A dachshund playing with a blue and cream rope toy" width="1024" height="1024" loading="lazy">
        </div>
    </div>
</footer>

<script>
(function () {
    'use strict';
    var header = document.getElementById('site-header');
    var toggle = document.getElementById('btn-menu');
    function closeMenu() {
        header.classList.remove('is-open');
        toggle.setAttribute('aria-expanded', 'false');
        toggle.setAttribute('aria-label', 'Open menu');
    }
    toggle.addEventListener('click', function () {
        var open = header.classList.toggle('is-open');
        toggle.setAttribute('aria-expanded', String(open));
        toggle.setAttribute('aria-label', open ? 'Close menu' : 'Open menu');
    });
    document.getElementById('main-nav').addEventListener('click', closeMenu);
    document.addEventListener('keydown', function (event) {
        if (event.key === 'Escape' && header.classList.contains('is-open')) {
            closeMenu();
            toggle.focus();
        }
    });
    document.addEventListener('click', function (event) {
        if (!header.contains(event.target)) { closeMenu(); }
    });

    // Mantener el contador del carrito existente sin almacenar datos del formulario.
    function updateBag() {
        try {
            var cart = JSON.parse(localStorage.getItem('petshop_cart'));
            var count = Array.isArray(cart) ? cart.reduce(function (sum, item) {
                var qty = Number(item && item.qty);
                return sum + (Number.isInteger(qty) && qty > 0 ? qty : 0);
            }, 0) : 0;
            document.getElementById('contact-bag-count').textContent = count;
            document.getElementById('contact-bag').setAttribute('aria-label', 'Shopping bag, ' + count + ' items – view in Shop');
        } catch (error) { /* El contador inicial funciona sin localStorage. */ }
    }
    updateBag();
    window.addEventListener('storage', updateBag);

    document.getElementById('contact-form').addEventListener('submit', function (event) {
        event.preventDefault();
        var firstName = document.getElementById('first-name');
        var lastName = document.getElementById('last-name');
        [firstName, lastName].forEach(function (input) {
            input.setCustomValidity(input.value.trim() ? '' : 'Please enter your name.');
        });
        if (!this.reportValidity()) { return; }
        var phone = document.getElementById('contact-phone').value.trim();
        var body = 'Name: ' + firstName.value.trim() + ' ' + lastName.value.trim()
            + '\r\nEmail: ' + document.getElementById('contact-email').value.trim()
            + '\r\nPhone: ' + (phone ? document.getElementById('phone-country').value + ' ' + phone : 'Not provided')
            + '\r\n\r\n' + document.getElementById('contact-message').value.trim();
        var draft = 'mailto:info@petshop.com?subject=' + encodeURIComponent('Petshop contact — ' + firstName.value.trim()) + '&body=' + encodeURIComponent(body);
        var status = document.getElementById('contact-form-status');
        status.textContent = 'Your email draft is ready. Send it from your email app. ';
        var retry = document.createElement('a');
        retry.href = draft;
        retry.textContent = 'Open draft again';
        status.appendChild(retry);
        window.location.href = draft;
    });
    ['first-name', 'last-name'].forEach(function (id) {
        document.getElementById(id).addEventListener('input', function () { this.setCustomValidity(''); });
    });

    document.querySelectorAll('[data-map-type]').forEach(function (button) {
        button.addEventListener('click', function () {
            if (button.getAttribute('aria-pressed') === 'true') { return; }
            document.querySelectorAll('[data-map-type]').forEach(function (other) {
                other.setAttribute('aria-pressed', String(other === button));
            });
            var frame = document.getElementById('contact-map-frame');
            var url = new URL(frame.src);
            url.searchParams.set('t', button.dataset.mapType);
            frame.src = url.href;
        });
    });

    var faq = document.querySelector('.contact-faq');
    var items = Array.from(document.querySelectorAll('.contact-faq-item'));
    var categories = Array.from(document.querySelectorAll('[data-category]'));
    var search = document.getElementById('faq-search');
    var currentCategory = 'general';
    faq.classList.add('has-js');
    function setOpen(item, open) {
        item.classList.toggle('is-open', open);
        item.querySelector('.contact-faq-item__trigger').setAttribute('aria-expanded', String(open));
        var panel = item.querySelector('.contact-faq-item__panel');
        panel.setAttribute('aria-hidden', String(!open));
        panel.inert = !open;
    }
    function filterFaqs() {
        var query = search.value.trim().toLocaleLowerCase();
        var count = 0;
        items.forEach(function (item) {
            var match = item.dataset.faqCategory === currentCategory && item.querySelector('.contact-faq-item__trigger').textContent.concat(' ', item.querySelector('.contact-faq-item__answer p').textContent).toLocaleLowerCase().includes(query);
            item.hidden = !match;
            if (match) { count++; }
        });
        document.getElementById('faq-empty').hidden = count !== 0;
        categories.forEach(function (button) {
            button.setAttribute('aria-pressed', String(button.dataset.category === currentCategory));
        });
    }
    items.forEach(function (item) {
        setOpen(item, item.classList.contains('is-open'));
        item.querySelector('.contact-faq-item__trigger').addEventListener('click', function () {
            setOpen(item, !item.classList.contains('is-open'));
        });
        var url = new URL(window.location.href);
        url.hash = item.id;
        var encoded = encodeURIComponent(url.href);
        item.querySelector('[data-share="facebook"]').href = 'https://www.facebook.com/sharer/sharer.php?u=' + encoded;
        item.querySelector('[data-share="x"]').href = 'https://x.com/intent/tweet?url=' + encoded;
        item.querySelector('[data-share="linkedin"]').href = 'https://www.linkedin.com/sharing/share-offsite/?url=' + encoded;
        item.querySelector('[data-copy-link]').addEventListener('click', async function () {
            var feedback = document.getElementById('faq-feedback');
            try {
                await navigator.clipboard.writeText(url.href);
                feedback.textContent = 'Link copied.';
            } catch (error) {
                feedback.textContent = 'Copy this link: ' + url.href;
            }
        });
    });
    categories.forEach(function (button) {
        button.addEventListener('click', function () {
            currentCategory = button.dataset.category;
            filterFaqs();
        });
    });
    search.addEventListener('input', filterFaqs);
    function openLinkedAnswer() {
        var linked = items.find(function (item) { return '#' + item.id === window.location.hash; });
        if (!linked) { return; }
        currentCategory = linked.dataset.faqCategory;
        search.value = '';
        filterFaqs();
        setOpen(linked, true);
        linked.scrollIntoView({ block: 'start' });
    }
    filterFaqs();
    openLinkedAnswer();
    window.addEventListener('hashchange', openLinkedAnswer);
})();
</script>
</body>
</html>
