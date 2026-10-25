// usage: node tooling/overflow.mjs [width] — horizontal-overflow + console-error check over key pages (en+bn)
import { chromium } from 'playwright';
const w = +(process.argv[2] || 360);
const paths = ['/', '/tours', '/tours/turkey-classic', '/destinations', '/destinations/bali', '/holidays', '/holidays/honeymoon', '/cruises', '/cruises/greek-isles-turkey', '/activities', '/activities/dubai-desert-safari',
  '/hotels', '/hotels/ocean-pearl-resort', '/flights?from=DAC&to=DXB', '/visa', '/visa/thailand', '/offers', '/insurance', '/gift-cards', '/group-tours', '/custom-tour', '/trip-planner', '/compare', '/wishlist',
  '/blog', '/blog/sajek-travel-guide', '/about', '/team', '/careers', '/gallery', '/reviews', '/faq', '/contact', '/terms', '/sitemap', '/credits', '/brand', '/login', '/register', '/forgot-password', '/booking?tour=turkey-classic', '/nope'];
const b = await chromium.launch({ executablePath: '/usr/bin/google-chrome', args: ['--no-sandbox'] });
const ctx = await b.newContext({ viewport: { width: w, height: 800 } });
const out = [];
for (const l of ['en', 'bn']) for (const p of paths) {
  const pg = await ctx.newPage(); const errs = [];
  pg.on('console', (m) => m.type() === 'error' && !/404|Failed to load resource/.test(m.text()) && errs.push(m.text().slice(0, 120)));
  pg.on('pageerror', (e) => errs.push('PAGEERROR ' + e.message.slice(0, 120)));
  await pg.goto(`http://localhost:3000/${l}${p === '/' ? '' : p}`, { waitUntil: 'load', timeout: 60000 });
  const r = await pg.evaluate(() => { const W = document.documentElement.clientWidth; const off = [...document.querySelectorAll('body *')].filter((e) => { const b = e.getBoundingClientRect(); return b.width && b.right > W + 1 && !e.closest('[class*="overflow-x-auto"],[class*="overflow-hidden"],[class*="snap-x"],[aria-hidden="true"],.sr-only,[hidden]'); }).slice(0, 3).map((e) => e.tagName + '.' + String(e.className).slice(0, 60)); return { sw: document.documentElement.scrollWidth, W, off }; });
  if (r.sw > r.W || errs.length) out.push({ p: `/${l}${p}`, ...r, errs });
  await pg.close();
}
console.log(JSON.stringify(out, null, 1) || '[]');
await b.close();
