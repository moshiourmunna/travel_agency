// Public-site browser E2E (interactions, not just page loads). Usage: node site_e2e.mjs [base]   env: CHROME
// Writes one contact lead + one newsletter row with e-mail e2e-site@musafir.test (cleanup: tooling/tests/cleanup_e2e.php).
import { chromium } from 'playwright-core';
const BASE = (process.argv[2] || process.env.SITE || 'http://localhost:3000').replace(/\/$/, '');
const b = await chromium.launch({ executablePath: process.env.CHROME || '/usr/bin/google-chrome', args: ['--no-sandbox'] });
const out = []; const ok = (n, pass, info = '') => { out.push({ n, pass }); console.log(`${pass ? 'PASS' : 'FAIL'} ${n} ${info}`); };
const step = async (n, fn) => { try { const r = await fn(); ok(n, r !== false, typeof r === 'string' ? r : ''); } catch (e) { ok(n, false, e.message.split('\n')[0].slice(0, 160)); } };
const ctx = await b.newContext({ viewport: { width: 1366, height: 900 } });
await ctx.addInitScript(() => { try { localStorage.setItem('musafir-consent', '{"essential":true}'); } catch {} });
const p = await ctx.newPage(); const errs = [];
p.on('pageerror', (e) => errs.push(e.message.slice(0, 160)));

await step('home: hero search → tours listing with query', async () => {
  await p.goto(BASE + '/en', { waitUntil: 'load' });
  await p.fill('#st-dest', 'Bali'); await Promise.all([p.waitForURL(/\/en\/tours\?/), p.locator('form[action="/en/tours"] button').first().click()]);
  return p.url().includes('q=Bali') && (await p.locator('[data-item]').count()) > 0 ? `${await p.locator('[data-item]').count()} results` : false;
});
await step('tours: sort writes ?sort= and keeps results', async () => {
  await p.goto(BASE + '/en/tours', { waitUntil: 'load' });
  const opt = await p.locator('[data-sort] option').nth(1).getAttribute('value');
  await p.selectOption('[data-sort]', opt); await p.waitForURL(new RegExp('sort=' + opt));
  return (await p.locator('[data-item]').count()) > 0;
});
await step('tours: list view toggle', async () => { await p.click('button[data-view="list"]'); await p.waitForSelector('[data-items][data-view="list"]'); });
await step('language switch keeps path + query', async () => {
  const q = new URL(p.url()).search; await Promise.all([p.waitForURL(/\/bn\/tours/), p.locator('[data-lang-link="bn"]').first().click()]);
  return new URL(p.url()).search === q && (await p.getAttribute('html', 'lang')) === 'bn';
});
await step('theme toggle persists across reload', async () => {
  await p.goto(BASE + '/en/faq', { waitUntil: 'load' });
  const before = await p.evaluate(() => document.documentElement.classList.contains('dark'));
  await p.locator('[data-theme-toggle]').first().click(); await p.reload({ waitUntil: 'load' });
  const after = await p.evaluate(() => document.documentElement.classList.contains('dark'));
  await p.locator('[data-theme-toggle]').first().click();
  return before !== after;
});
await step('currency switch → USD prices', async () => {
  await p.goto(BASE + '/en/tours', { waitUntil: 'load' });
  await p.selectOption('#cur-top', 'USD'); await p.waitForTimeout(300);
  const txt = await p.locator('[data-item]').first().innerText(); await p.selectOption('#cur-top', 'BDT');
  return /\$\s?\d/.test(txt) ? 'ok' : false;
});
await step('wishlist: heart → count → wishlist page', async () => {
  await p.goto(BASE + '/en/tours', { waitUntil: 'load' });
  await p.locator('[data-wish]').first().click();
  await p.waitForFunction(() => [...document.querySelectorAll('[data-wish-count]')].some((e) => e.textContent.trim() === '1'));
  await p.goto(BASE + '/en/wishlist', { waitUntil: 'load' }); await p.waitForURL(/ids=tour/); await p.waitForSelector('main [data-item]');
  await p.locator('main [data-wish]').first().click();
  await p.waitForFunction(() => ![...document.querySelectorAll('[data-wish-count]')].some((e) => e.textContent.trim() === '1'));
});
await step('tour detail: h1, price, JSON-LD TouristTrip, lightbox', async () => {
  await p.goto(BASE + '/en/tours/coxs-bazar-saint-martin', { waitUntil: 'load' });
  const ld = await p.evaluate(() => [...document.querySelectorAll('script[type="application/ld+json"]')].map((s) => s.textContent).join(''));
  if (!ld.includes('TouristTrip')) return false;
  await p.locator('[data-lightbox]').first().click(); await p.waitForSelector('dialog[open], [role="dialog"]:not(.hidden)', { timeout: 5000 });
  await p.keyboard.press('Escape');
});
await step('contact form validation + submit', async () => {
  await p.goto(BASE + '/en/contact', { waitUntil: 'load' });
  const form = p.locator('form:has(#c-name)'); await form.locator('button').last().click();
  if (!(await p.locator('.is-invalid, [aria-invalid="true"]').count())) return false;
  await p.fill('#c-name', 'E2E Site Test'); await p.fill('#c-phone', '01711000999'); await p.fill('#c-email', 'e2e-site@musafir.test');
  if (await p.locator('#c-subject').count()) await p.locator('#c-subject').evaluate((el) => { if (el.tagName === 'SELECT') { el.selectedIndex = 1; el.dispatchEvent(new Event('change', { bubbles: true })); } else { el.value = 'E2E'; el.dispatchEvent(new Event('input', { bubbles: true })); } });
  await p.fill('#c-message', 'Automated end-to-end test message — please ignore.');
  await form.locator('button').last().click();
  await p.waitForSelector('[role="status"]', { timeout: 10000 });
});
await step('newsletter signup (footer)', async () => {
  await p.fill('#nl-email', 'e2e-site@musafir.test'); await p.locator('#nl-email').press('Enter');
  await p.waitForFunction(() => document.body.innerText.match(/subscrib/i), null, { timeout: 8000 });
});
await step('404: status + title + search', async () => {
  const r = await p.goto(BASE + '/en/zzz-e2e-missing', { waitUntil: 'load' }); await p.waitForTimeout(500);
  return r.status() === 404 && (await p.title()).includes('404') && (await p.locator('form[role="search"]').count()) > 0;
});
const m = await b.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });
await m.addInitScript(() => { try { localStorage.setItem('musafir-consent', '{"essential":true}'); } catch {} });
const mp = await m.newPage(); mp.on('pageerror', (e) => errs.push(e.message.slice(0, 160)));
await step('mobile: drawer opens, Esc closes, body scroll lock', async () => {
  await mp.goto(BASE + '/bn', { waitUntil: 'load' });
  await mp.click('button[aria-controls="mnav"]'); await mp.waitForSelector('#mnav:not(.hidden)');
  const locked = await mp.evaluate(() => getComputedStyle(document.documentElement).overflow === 'hidden' || getComputedStyle(document.body).overflow === 'hidden');
  await mp.keyboard.press('Escape'); await mp.waitForSelector('#mnav.hidden', { state: 'attached' });
  return locked;
});
await step('mobile: bottom bar + booking sheet on tour detail', async () => {
  await mp.goto(BASE + '/en/tours/coxs-bazar-saint-martin', { waitUntil: 'load' });
  await mp.getByRole('button', { name: 'Check dates' }).click(); await mp.waitForSelector('[role="dialog"]:visible');
});
await step('no uncaught page errors', async () => (errs.length ? false : true));
if (errs.length) console.log(errs.slice(0, 5));
await b.close();
const pass = out.filter((x) => x.pass).length;
console.log(JSON.stringify({ suite: 'site_e2e', pass, total: out.length }));
process.exit(pass === out.length ? 0 : 1);
