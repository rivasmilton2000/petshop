import { chromium, expect } from '@playwright/test';
import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const baseURL = process.env.TEST_BASE_URL ?? 'http://127.0.0.1:3000';
const output = fileURLToPath(new URL('../artifacts/public-design/', import.meta.url));
await mkdir(output, { recursive: true });
const browser = await chromium.launch({ headless: true });
const checks = [];
try {
  for (const [name, width, height] of [['desktop', 1440, 1000], ['mobile', 390, 844], ['small-mobile', 320, 740], ['tablet', 768, 1024]]) {
    const page = await browser.newPage({ baseURL, viewport: { width, height }, reducedMotion: 'reduce' });
    const errors = [];
    page.on('pageerror', error => errors.push(error.message));
    await page.goto('/');
    await page.evaluate(async () => {
      await document.fonts.ready;
      await Promise.all(Array.from(document.images, async image => { image.loading = 'eager'; await image.decode(); }));
    });
    await expect(page.locator('.header__logo span')).toHaveText('LILAC & TOFFEE');
    await expect(page.locator('.home-hero img')).toHaveCount(1);
    await expect(page.locator('#hero-title')).toHaveText('Happy Tails Start Here');
    await expect(page.locator('.home-hero__content > p')).toHaveText('curated essentials for every wag, purr and hop');
    await expect(page.locator('#cat-title')).toHaveText('Happy Tails Start Here');
    await expect(page.locator('#how-title')).toHaveText('Cómo funciona');
    await expect(page.locator('.how-card')).toHaveCount(3);
    await expect(page.locator('.brand-strip, .brand-ribbon, .cat-card__hint, .hero__photo')).toHaveCount(0);
    await expect(page.locator('.about-footer__photo img')).toHaveAttribute('src', '/img/punto10.jpeg');
    expect(await page.locator('img').evaluateAll(images => images.filter(image => !image.complete || !image.naturalWidth).map(image => image.src))).toEqual([]);
    expect(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth)).toBe(false);
    const tops = await page.locator('.how-card').evaluateAll(cards => cards.map(card => Math.round(card.getBoundingClientRect().top)));
    expect(new Set(tops).size).toBe(width > 900 ? 1 : 3);
    for (const slug of ['dogs', 'cats', 'small-pets', 'birds']) {
      const category = page.locator(`.cat-card[href="/website/shop?cat=${slug}"]`);
      await expect(category).toHaveAccessibleName(/Ver productos para/);
      expect(await category.innerText()).not.toContain('Explorar');
      await category.click();
      await expect(page).toHaveURL(new RegExp(`cat=${slug}`));
      await expect(page.locator('h1')).toBeVisible();
      await page.goto('/');
    }
    await page.getByRole('link', { name: 'Comprar ahora' }).click();
    await expect(page).toHaveURL(/\/website\/shop$/);
    await page.goto('/');
    await page.evaluate(() => document.fonts.ready);
    await page.screenshot({ path: path.join(output, `${name}-hero.png`) });
    const sectionStyle = '.header, .skip-link, nextjs-portal { visibility: hidden !important; }';
    await page.locator('#how-it-works').screenshot({ path: path.join(output, `${name}-how.png`), style: sectionStyle });
    await page.locator('.about-footer').screenshot({ path: path.join(output, `${name}-footer.png`), style: sectionStyle });
    const closed = await page.locator('.collar-scene__half').evaluateAll(halves => halves.map(half => ({ transform: getComputedStyle(half).transform, animation: getComputedStyle(half).animationName })));
    expect(closed).toEqual([{ transform: 'none', animation: 'none' }, { transform: 'none', animation: 'none' }]);
    expect(errors).toEqual([]);
    checks.push(`${name} ${width}x${height}: copy, 5 catalog links, responsive cards, images, no overflow, closed reduced-motion collar.`);
    await page.close();
  }

  for (const width of [1440, 390]) {
    const page = await browser.newPage({ baseURL, viewport: { width, height: 600 }, reducedMotion: 'no-preference' });
    await page.goto('/');
    const collar = page.locator('.collar-scene');
    await expect(collar).toHaveAttribute('data-motion', 'true');
    await expect(collar).toHaveAttribute('data-fastened', 'false');
    await collar.scrollIntoViewIfNeeded();
    await expect(collar).toHaveAttribute('data-fastened', 'true');
    const positions = await page.locator('.collar-scene__drawing').evaluate(svg => {
      const animations = svg.getAnimations({ subtree: true });
      if (animations.length !== 2) throw new Error('Expected two simultaneous fastening animations');
      const delta = Math.abs(animations[0].startTime - animations[1].startTime);
      const at = time => {
        animations.forEach(animation => { animation.pause(); animation.currentTime = time; });
        return Array.from(svg.querySelectorAll('.collar-scene__half'), half => new DOMMatrix(getComputedStyle(half).transform).m41);
      };
      return { delta, entry: at(0), approach: at(1054), snap: at(1360), settle: at(1513), closed: at(1700) };
    });
    expect(positions.delta).toBeLessThan(20);
    expect(positions.entry[0]).toBeLessThan(0);
    expect(positions.entry[1]).toBeGreaterThan(0);
    expect(Math.abs(positions.approach[0])).toBeLessThan(Math.abs(positions.entry[0]));
    expect(positions.snap).toEqual([0, 0]);
    expect(positions.settle[0]).toBeLessThan(0);
    expect(positions.settle[1]).toBeGreaterThan(0);
    expect(positions.closed).toEqual([0, 0]);
    await page.locator('.collar-scene__drawing').evaluate(svg => svg.getAnimations({ subtree: true }).forEach(animation => { animation.currentTime = 1054; }));
    await collar.screenshot({ path: path.join(output, `collar-approach-${width}.png`) });
    await page.locator('.collar-scene__drawing').evaluate(svg => svg.getAnimations({ subtree: true }).forEach(animation => { animation.currentTime = 1700; }));
    await collar.screenshot({ path: path.join(output, `collar-closed-${width}.png`) });
    await page.locator('#hero-title').scrollIntoViewIfNeeded();
    await collar.scrollIntoViewIfNeeded();
    await expect(collar).toHaveAttribute('data-fastened', 'true');
    const card = page.locator('.cat-card').first();
    await card.hover();
    await expect.poll(() => card.evaluate(element => new DOMMatrix(getComputedStyle(element).transform).m42)).toBeLessThan(-6);
    await expect(card).toHaveAttribute('href', '/website/shop?cat=dogs');
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await expect(collar).toHaveAttribute('data-motion', 'false');
    expect(await page.locator('.collar-scene__half').evaluateAll(halves => halves.every(half => getComputedStyle(half).transform === 'none'))).toBe(true);
    checks.push(`Collar ${width}px: viewport trigger, synchronized entry, alignment, snap, small settling movement, persistent closed state and live reduced-motion preference.`);
    await page.close();
  }
  await writeFile(path.join(output, 'verification.json'), JSON.stringify({ baseURL, checks }, null, 2));
  console.log(checks.join('\n'));
} finally {
  await browser.close();
}
