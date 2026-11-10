import { chromium, request, expect } from '@playwright/test';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';

const baseURL = process.env.TEST_BASE_URL ?? 'http://127.0.0.1:3000';
const output = new URL('../artifacts/', import.meta.url);
await mkdir(output, { recursive: true });
const checks = [];
const api = await request.newContext({ baseURL });
const browser = await chromium.launch({ headless: true });
try {
  for (const prefix of ['', '/petshop', '/petshop/petshop']) {
    for (const [old, destination] of [
      ['/index.php', '/'],
      ['/src/pages/website/about.php', '/website/about'],
      ['/src/pages/website/contact.php', '/website/contact'],
      ['/src/pages/website/shop.php?cat=cats', '/website/shop?cat=cats'],
      ['/src/pages/website/product-detail.php?id=blue-bone-chew', '/website/product-detail?id=blue-bone-chew'],
    ]) {
      const response = await api.get(prefix + old, { maxRedirects: 0 });
      expect(response.status()).toBe(308);
      expect(new URL(response.headers().location, baseURL).pathname + new URL(response.headers().location, baseURL).search).toBe(destination);
    }
  }
  checks.push('15 redirecciones PHP: HTTP 308, con cat e id conservados.');
  for (const name of ['about', 'shop', 'product-detail', 'contact']) {
    for (const prefix of ['', '/petshop', '/petshop/petshop']) {
      const response = await api.get(`${prefix}/website/${name}.php`, { maxRedirects: 0 });
      expect(response.status()).toBe(308);
      expect(new URL(response.headers().location, baseURL).pathname).toBe(`/website/${name}`);
    }
  }
  for (const root of ['/website', '/petshop', '/petshop/petshop']) {
    const response = await api.get(root, { maxRedirects: 0 });
    expect(response.status()).toBe(308);
    expect(new URL(response.headers().location, baseURL).pathname).toBe('/');
  }
  checks.push('12 alias PHP y 3 entradas de directorio: redirección permanente al destino correcto.');
  const invalid = await api.get('/website/product-detail?id=no-existe');
  expect(invalid.status()).toBe(404);
  expect((await api.get('/website/product-detail?id=ruff-wheels&id=blue-bone-chew')).status()).toBe(404);
  expect((await api.get('/website/product-detail')).status()).toBe(200);
  expect((await api.get('/website')).status()).toBe(200);
  expect((await api.get('/website/data/products')).status()).toBe(404);
  checks.push('Detalle por defecto válido; IDs desconocidos y arrays devuelven 404; datos sin ruta pública.');
  const logo = await api.get('/img/LILAC%26TOFEE_LOGO.png');
  expect(logo.status()).toBe(200);
  const hash = (buffer) => createHash('sha256').update(buffer).digest('hex');
  expect(hash(await logo.body())).toBe(hash(await readFile(new URL('../img/LILAC&TOFEE_LOGO.png', import.meta.url))));
  expect((await api.get('/src/pages/website/img/products/ruff-wheels.jpg')).status()).toBe(200);
  const legacyCSS = await api.get('/src/pages/website/css/website.css');
  expect(legacyCSS.status()).toBe(200);
  expect(legacyCSS.headers()['content-type']).toContain('text/css');
  checks.push('Logo servido idéntico al original; imágenes y CSS con URL antigua compatibles.');

  for (const [device, width, height] of [['desktop', 1440, 1000], ['mobile', 390, 844], ['small-mobile', 320, 740], ['tablet', 768, 1024]]) {
    const context = await browser.newContext({ viewport: { width, height }, baseURL, reducedMotion: 'reduce' });
    const page = await context.newPage();
    const errors = [];
    const failures = [];
    page.on('pageerror', (error) => errors.push(error.message));
    page.on('console', (message) => { if (message.type() === 'error') errors.push(message.text()); });
    page.on('requestfailed', (r) => failures.push(`${r.url()} ${r.failure()?.errorText}`));
    const routes = ['/', '/website/about', '/website/shop', '/website/contact', '/website/product-detail?id=adjustable-eco-collar'];
    for (const route of routes) {
      const response = await page.goto(route);
      expect(response.status()).toBe(200);
      await page.locator('h1').waitFor();
      await page.evaluate(async () => {
        await document.fonts.ready;
        await Promise.all(Array.from(document.images).map(async (img) => { img.loading = 'eager'; try { await img.decode(); } catch {} }));
      });
      await expect(page.locator('html')).toHaveAttribute('lang', 'es');
      await expect(page).toHaveTitle(/LILAC & TOFFEE/);
      await expect(page.locator('h1')).toHaveCount(1);
      const broken = await page.locator('img').evaluateAll((images) => images.filter((img) => !img.complete || img.naturalWidth === 0).map((img) => img.src));
      expect(broken, `${device} ${route}: imágenes rotas`).toEqual([]);
      const styles = await page.evaluate(() => ({
        display: getComputedStyle(document.querySelector('h1')).fontFamily,
        body: getComputedStyle(document.body).fontFamily,
        overflow: document.documentElement.scrollWidth > window.innerWidth,
        cream: getComputedStyle(document.documentElement).getPropertyValue('--cream').trim(),
      }));
      expect(styles.display).toContain('Playfair Display');
      expect(styles.body).toContain('Montserrat');
      expect(styles.cream.toUpperCase()).toBe('#F7EEE7');
      expect(styles.overflow, `${device} ${route}: desbordamiento horizontal`).toBe(false);
      expect(await page.locator('body').innerText()).not.toMatch(/123 Pet Lane|Terry Francine|info@petshop|Shop Now|Log In|All Products|Your cart/);
      const name = route === '/' ? 'home' : route.split('/').pop().split('?')[0];
      if (device === 'desktop' || device === 'mobile') await page.screenshot({ path: new URL(`${device}-${name}.png`, output).pathname.replace(/^\/([A-Za-z]:)/, '$1'), fullPage: true });
    }
    await page.goto('/');
    if (width < 980) {
      await page.getByRole('button', { name: 'Abrir menú' }).click();
      await expect(page.getByRole('navigation', { name: 'Navegación principal' })).toBeVisible();
      await page.getByRole('navigation', { name: 'Navegación principal' }).getByRole('link', { name: 'Tienda' }).click();
      await expect(page).toHaveURL(/website\/shop/);
      await page.getByRole('button', { name: 'Categorías' }).click();
    } else {
      await page.getByRole('navigation', { name: 'Navegación principal' }).getByRole('link', { name: 'Tienda' }).click();
    }
    await page.getByRole('link', { name: 'Gatos', exact: true }).click();
    await expect(page).toHaveURL(/cat=cats/);
    await expect(page.locator('.catalog__grid .shop-card')).toHaveCount(3);
    await page.getByLabel('Buscar productos').fill('inexistente');
    await expect(page.locator('.catalog__grid .shop-card')).toHaveCount(0);
    await expect(page.locator('.catalog__empty')).toBeVisible();
    await page.getByLabel('Buscar productos').fill('');
    await page.getByLabel('Ordenar por').selectOption('name');
    const names = await page.locator('.shop-card__name').allTextContents();
    expect(names).toEqual([...names].sort((a, b) => a.localeCompare(b, 'es')));

    await page.goto('/website/product-detail?id=adjustable-eco-collar');
    await page.getByRole('radio', { name: 'Rosa', exact: true }).check();
    await expect(page.locator('.gallery__main img')).toHaveAttribute('src', /eco-collar-pink/);
    const currentProducts = (await (await api.get('/api/catalog')).json()).products;
    const collar = currentProducts.find(product => product.id === 'adjustable-eco-collar');
    if (collar.stock > 0 && collar.price !== null) {
      const quantity = Math.min(2, collar.stock);
      await page.locator('#qty-input').fill(String(quantity));
      await page.getByRole('button', { name: 'Añadir al carrito', exact: true }).click();
      await expect(page.getByRole('dialog')).toBeVisible();
      await expect(page.getByRole('dialog')).toContainText(`Cantidad: ${quantity}`);
      await page.keyboard.press('Escape');
      await expect(page.getByRole('dialog')).not.toBeVisible();
      await expect(page.getByRole('button', { name: 'Añadir al carrito', exact: true })).toBeFocused();
      await page.goto('/');
      await page.getByRole('button', { name: `Abrir carrito, ${quantity} artículos` }).click();
      await expect(page.getByRole('dialog')).toContainText('Collar ajustable');
      await page.getByRole('button', { name: 'Quitar Collar ajustable' }).click();
    } else {
      await expect(page.getByRole('button', { name: collar.stock === 0 ? 'Agotado' : 'Añadir al carrito', exact: true })).toBeDisabled();
      await page.getByRole('button', { name: 'Abrir carrito, 0 artículos' }).click();
    }
    await expect(page.getByRole('dialog')).toContainText('Tu carrito está vacío.');
    await page.getByRole('button', { name: 'Cerrar carrito' }).click();

    await page.goto('/website/contact');
    await page.getByLabel('Nombre *', { exact: true }).fill('Ana');
    await page.getByLabel('Correo electrónico *', { exact: true }).fill('ana@example.com');
    await page.getByLabel('Tu consulta *', { exact: true }).fill('Quiero información del catálogo.');
    await page.getByRole('button', { name: 'Preparar consulta', exact: true }).click();
    await expect(page.getByLabel('Texto de tu consulta')).toHaveValue(/Quiero información del catálogo/);
    await expect(page.locator('.contact-form__status')).toHaveText('Tu consulta está preparada. Aún no se ha enviado.');
    await page.getByLabel('Buscar preguntas').fill('¿Se guarda');
    await expect(page.locator('.faq-list details')).toHaveCount(1);
    await page.getByLabel('Buscar preguntas').fill('');
    await page.getByRole('button', { name: 'Atención y entregas' }).click();
    await expect(page.locator('.faq-list details')).toHaveCount(2);
    await page.goto('/website/contact#atencion');
    await expect(page.locator('#atencion')).toHaveAttribute('open', '');
    const stored = await page.evaluate(() => localStorage.getItem('petshop_cart'));
    expect(stored).not.toContain('ana@example.com');
    await page.evaluate(() => localStorage.setItem('petshop_cart', '{roto'));
    await page.reload();
    await expect(page.getByRole('button', { name: 'Abrir carrito, 0 artículos' })).toBeVisible();
    expect(errors, `${device}: errores de navegador`).toEqual([]);
    expect(failures, `${device}: recursos fallidos`).toEqual([]);
    checks.push(`${device} ${width}×${height}: 5 páginas, imágenes, fuentes, menú, categorías, búsqueda, orden, variantes, carrito persistente, teclado, formulario y FAQ correctos.`);
    await context.close();
  }
  await writeFile(new URL('verification.json', output), JSON.stringify({ baseURL, checks }, null, 2));
  console.log(checks.join('\n'));
} finally {
  await browser.close();
  await api.dispose();
}
