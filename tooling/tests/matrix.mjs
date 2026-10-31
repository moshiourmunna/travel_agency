// Responsive × theme × language matrix for key public pages.
// Per load: HTTP 200, <html lang>, no horizontal overflow, header + footer + h1 visible, no console/page errors, dark class applied.
// Usage: node matrix.mjs [base]   env: CHROME, WIDTHS=320,375,...  PAGES=/tours,...
import { chromium } from 'playwright-core';
const base = (process.argv[2] || process.env.SITE || 'http://localhost:3000').replace(/\/$/, '');
const widths = (process.env.WIDTHS || '320,375,768,1024,1440,1920').split(',').map(Number);
const pages = (process.env.PAGES || '/,/tours,/tours/coxs-bazar-saint-martin,/destinations/bali,/hotels,/flights,/visa/schengen,/cruises,/blog,/contact,/login').split(',');
const b = await chromium.launch({ executablePath: process.env.CHROME || '/usr/bin/google-chrome', args: ['--no-sandbox'] });
const jobs = []; for (const lang of ['en', 'bn']) for (const theme of ['light', 'dark']) for (const w of widths) jobs.push({ lang, theme, w });
let pass = 0, fail = 0; const fails = [];
async function run({ lang, theme, w }) {
  const ctx = await b.newContext({ viewport: { width: w, height: w < 768 ? 800 : 900 }, isMobile: w < 768, hasTouch: w < 768 });
  await ctx.addInitScript((t) => { try { localStorage.setItem('musafir-theme', t); localStorage.setItem('musafir-consent', '{"essential":true}'); } catch {} }, theme);
  for (const path of pages) {
    const p = await ctx.newPage(); const errs = [];
    p.on('console', (m) => { if (m.type() === 'error' && !/favicon|Failed to load resource.*(404|net::ERR_ABORTED)/.test(m.text())) errs.push(m.text().slice(0, 160)); });
    p.on('pageerror', (e) => errs.push('pageerror ' + e.message.slice(0, 160)));
    const url = `${base}/${lang}${path === '/' ? '' : path}`;
    const r = await p.goto(url, { waitUntil: 'load', timeout: 60000 }).catch((e) => null);
    await p.waitForTimeout(300);
    const st = await p.evaluate(() => ({
      lang: document.documentElement.lang, dark: document.documentElement.classList.contains('dark'),
      over: document.documentElement.scrollWidth - window.innerWidth,
      h1: !!document.querySelector('h1') && document.querySelector('h1').getBoundingClientRect().height > 0,
      header: !!document.querySelector('header'), footer: !!document.querySelector('footer'),
      wide: [...document.querySelectorAll('body *')].filter((e) => { const r = e.getBoundingClientRect(); return r.right > window.innerWidth + 1 && r.width > 0 && getComputedStyle(e).position !== 'fixed' && !e.closest('[class*="overflow-x-auto"],[class*="overflow-hidden"],.no-scrollbar,[aria-hidden="true"]'); }).slice(0, 2).map((e) => e.tagName + '.' + String(e.className).slice(0, 50)),
    })).catch(() => null);
    const bad = [];
    if (!r || r.status() !== 200) bad.push('status ' + (r?.status() ?? 'none'));
    if (!st) bad.push('eval'); else {
      if (st.lang !== lang) bad.push('lang ' + st.lang);
      if (st.dark !== (theme === 'dark')) bad.push('theme');
      if (st.over > 1) bad.push(`overflow ${st.over}px ${st.wide.join(' ')}`);
      if (!st.h1) bad.push('h1'); if (!st.header) bad.push('header'); if (!st.footer && !path.startsWith('/login')) bad.push('footer');
    }
    if (errs.length) bad.push('console: ' + errs.slice(0, 2).join(' | '));
    if (bad.length) { fail++; fails.push(`${lang} ${theme} ${w} ${path}: ${bad.join('; ')}`); } else pass++;
    await p.close();
  }
  await ctx.close();
}
const q = [...jobs];
await Promise.all(Array.from({ length: Number(process.env.CONC || 4) }, async () => { while (q.length) await run(q.shift()); }));
await b.close();
console.log(JSON.stringify({ base, widths, pages: pages.length, loads: pass + fail, pass, fail }));
fails.slice(0, 60).forEach((f) => console.log('  ✗', f));
process.exit(fail ? 1 : 0);
