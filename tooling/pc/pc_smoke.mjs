// PC smoke test: node pc_smoke.mjs  (needs playwright-core; uses installed Chrome or Edge)
import { chromium } from 'playwright-core';
import fs from 'node:fs';
const FE = process.env.FE || 'http://localhost:3000';
const OUT = process.env.OUT || './shots';
fs.mkdirSync(OUT, { recursive: true });
const pages = [
  ['home-en', '/en', 'h1'], ['home-bn', '/bn', 'h1'],
  ['tours-en', '/en/tours', 'h1'], ['tours-bn', '/bn/tours', 'h1'],
  ['tour-en', '/en/tours/coxs-bazar-saint-martin', 'h1'], ['tour-bn', '/bn/tours/coxs-bazar-saint-martin', 'h1'],
  ['destinations', '/en/destinations', 'h1'], ['hotels', '/en/hotels', 'h1'], ['flights', '/en/flights', 'h1'],
  ['visa', '/en/visa', 'h1'], ['blog-bn', '/bn/blog', 'h1'], ['contact', '/en/contact', 'h1'], ['404', '/en/zzz-missing', 'h1'],
];
let channel = process.env.CHANNEL || 'chrome';
let browser;
try { browser = await chromium.launch({ channel }); } catch { channel = 'msedge'; browser = await chromium.launch({ channel }); }
const results = [];
for (const [vpName, vp] of [['desktop', { width: 1440, height: 900 }], ['mobile', { width: 390, height: 844 }]]) {
  const ctx = await browser.newContext({ viewport: vp });
  for (const [name, path, sel] of pages) {
    const p = await ctx.newPage();
    const errors = [];
    p.on('console', m => { if (m.type() === 'error') errors.push(m.text().slice(0, 200)); });
    p.on('pageerror', e => errors.push('pageerror: ' + e.message.slice(0, 200)));
    const t0 = Date.now();
    const resp = await p.goto(FE + path, { waitUntil: 'networkidle', timeout: 60000 }).catch(e => null);
    const status = resp ? resp.status() : 0;
    const h1 = await p.locator(sel).first().textContent({ timeout: 5000 }).catch(() => '');
    const lang = await p.getAttribute('html', 'lang').catch(() => '');
    const overflow = await p.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
    const brokenImgs = await p.evaluate(() => [...document.images].filter(i => i.complete && i.naturalWidth === 0 && i.loading !== 'lazy').length);
    await p.screenshot({ path: `${OUT}/${vpName}-${name}.png` });
    const want404 = name === '404';
    const ok = (want404 ? status === 404 : status === 200) && h1.trim().length > 0 && overflow <= 0 && brokenImgs === 0
      && errors.filter(e => !(want404 && /404/.test(e))).length === 0;
    results.push({ vp: vpName, name, path, status, ms: Date.now() - t0, lang, h1: h1.trim().slice(0, 60), overflow, brokenImgs, errors, ok });
    await p.close();
  }
  await ctx.close();
}
// Theme + language switch behaviour on home
{
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 }, colorScheme: 'dark' });
  const p = await ctx.newPage();
  await p.goto(FE + '/en', { waitUntil: 'networkidle' });
  const dark = await p.evaluate(() => document.documentElement.classList.contains('dark'));
  await p.screenshot({ path: `${OUT}/desktop-home-dark.png` });
  results.push({ vp: 'desktop', name: 'dark-mode', path: '/en', ok: dark, dark });
  await ctx.close();
}
await browser.close();
const pass = results.filter(r => r.ok).length;
fs.writeFileSync(`${OUT}/results.json`, JSON.stringify({ channel, pass, total: results.length, results }, null, 2));
console.log(`browser=${channel} ${pass}/${results.length} passed`);
for (const r of results) console.log((r.ok ? 'PASS' : 'FAIL'), r.vp, r.name, r.status ?? '', r.ms ?? '', r.lang ?? '', JSON.stringify(r.h1 ?? ''), r.overflow ?? '', r.brokenImgs ?? '', (r.errors || []).join(' | '));
