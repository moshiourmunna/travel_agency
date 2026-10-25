// Musafir QA sweep: node qa.mjs <mode> ; mode=all (every page @375+1440 light, en+bn) | matrix (sample pages × 8 widths × light/dark × en/bn)
import { chromium } from 'playwright';
import fs from 'fs'; import path from 'path';
const SITE = '/workspace/musafir/site';
const mode = process.argv[2] || 'all';
const out = process.argv[3] || '/workspace/musafir/tests/qa-' + mode + '.json';
function walk(d) { return fs.readdirSync(d, { withFileTypes: true }).flatMap(e => e.isDirectory() ? walk(path.join(d, e.name)) : e.name.endsWith('.html') ? [path.join(d, e.name)] : []); }
let pages = [...walk(SITE + '/en'), ...walk(SITE + '/bn')].map(p => path.relative(SITE, p)).sort();
if (process.argv[4]) pages = pages.filter(p => new RegExp(process.argv[4]).test(p));
const SAMPLE = ['index.html', 'tours.html', 'tours/maldives-honeymoon.html', 'holidays.html', 'holidays/family.html', 'cruises.html', 'cruises/singapore-penang-phuket.html', 'activities.html', 'activities/dubai-desert-safari.html', 'trip-planner.html', 'destinations/nepal.html', 'flights.html', 'hotels.html', 'hotels/ocean-pearl-resort.html', 'visa.html', 'visa/schengen.html', 'booking.html', 'offers.html', 'blog/first-cruise-guide.html', 'gallery.html', 'about.html', 'contact.html', 'faq.html', 'reviews.html', 'compare.html', 'login.html', 'brand.html', '404.html'];
const jobs = [];
if (mode === 'all') for (const p of pages) for (const w of [375, 1440]) jobs.push({ p, w, th: 'light' });
else if (mode === 'appmatrix') { for (const p of pages.filter(p => /\/(account|admin)\//.test(p))) for (const w of [320, 375, 414, 768, 1024, 1280, 1440, 1920]) for (const th of ['light', 'dark']) jobs.push({ p, w, th }); }
else for (const l of ['en', 'bn']) for (const s of SAMPLE) for (const w of [320, 375, 414, 768, 1024, 1280, 1440, 1920]) for (const th of ['light', 'dark']) jobs.push({ p: l + '/' + s, w, th });
const b = await chromium.launch({ executablePath: '/usr/bin/google-chrome', args: ['--no-sandbox'] });
const res = []; let i = 0;
async function worker() {
  const ctxs = {};
  while (i < jobs.length) {
    const j = jobs[i++]; const key = j.th;
    if (!ctxs[key]) { ctxs[key] = await b.newContext({ colorScheme: j.th }); await ctxs[key].addInitScript(t => { try { localStorage.setItem('musafir-theme', t); localStorage.setItem('musafir-consent', '{"essential":true}'); } catch (e) {} }, j.th); }
    const pg = await ctxs[key].newPage(); await pg.setViewportSize({ width: j.w, height: 900 });
    const errs = [], failed = [];
    pg.on('console', m => { if (m.type() === 'error') errs.push(m.text().slice(0, 200)); });
    pg.on('pageerror', e => errs.push('PAGEERROR ' + String(e).slice(0, 200)));
    pg.on('requestfailed', r => failed.push(r.url().replace('file://' + SITE, '')));
    try {
      await pg.goto('file://' + SITE + '/' + j.p, { waitUntil: 'load', timeout: 30000 });
      const r = await pg.evaluate(async () => {
        document.querySelectorAll('img[loading=lazy]').forEach(i => i.loading = 'eager');
        await new Promise(r => setTimeout(r, 250));
        await Promise.all([...document.images].map(im => im.complete ? 0 : new Promise(r => { im.onload = im.onerror = r; setTimeout(r, 3000); })));
        const ov = document.documentElement.scrollWidth - window.innerWidth;
        const wide = ov > 0 ? [...document.querySelectorAll('body *')].filter(e => { const b = e.getBoundingClientRect(); return b.right > window.innerWidth + 1 && b.width > 0 && getComputedStyle(e).position !== 'fixed' && !e.closest('[class*=overflow-x-auto],[class*=overflow-hidden],.no-scrollbar'); }).slice(0, 3).map(e => e.tagName + '.' + (e.className.baseVal ?? e.className).toString().slice(0, 60)) : [];
        const broken = [...document.images].filter(im => im.complete && im.naturalWidth === 0 && im.getAttribute('src')).map(im => im.getAttribute('src'));
        const noalt = [...document.images].filter(im => !im.hasAttribute('alt')).length;
        const h1 = document.querySelectorAll('h1').length;
        let ldbad = 0; document.querySelectorAll('script[type="application/ld+json"]').forEach(s => { try { JSON.parse(s.textContent); } catch (e) { ldbad++; } });
        const ld = document.querySelectorAll('script[type="application/ld+json"]').length;
        const title = document.title, desc = (document.querySelector('meta[name=description]') || {}).content || '';
        const canon = !!document.querySelector('link[rel=canonical]'), hre = document.querySelectorAll('link[hreflang]').length;
        const lang = document.documentElement.lang;
        return { ov, wide, broken, noalt, h1, ldbad, ld, title, desc: desc.length, canon, hre, lang };
      });
      res.push({ ...j, ...r, errs, failed: failed.filter(f => !/^https?:/.test(f)) });
    } catch (e) { res.push({ ...j, fatal: String(e).slice(0, 200) }); }
    await pg.close();
  }
}
await Promise.all([worker(), worker(), worker(), worker()]);
await b.close();
fs.mkdirSync(path.dirname(out), { recursive: true }); fs.writeFileSync(out, JSON.stringify(res, null, 1));
const bad = res.filter(r => r.fatal || r.ov > 0 || r.errs?.length || r.failed?.length || r.broken?.length || r.noalt || r.h1 !== 1 || r.ldbad || !r.title || !r.desc || !r.canon);
console.log('loads', res.length, 'pages', new Set(res.map(r => r.p)).size, 'issues', bad.length);
for (const r of bad.slice(0, 40)) console.log(JSON.stringify({ p: r.p, w: r.w, th: r.th, ov: r.ov, wide: r.wide, errs: r.errs, failed: r.failed, broken: r.broken, noalt: r.noalt, h1: r.h1, ldbad: r.ldbad, fatal: r.fatal, desc: r.desc, canon: r.canon }));
