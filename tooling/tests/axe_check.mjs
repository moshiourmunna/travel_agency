// axe-core WCAG 2.1 A/AA scan of key public + portal pages × light/dark × en/bn × desktop/mobile.
// Usage: node axe_check.mjs [base]   env: CHROME, AXE_JS (path to axe.min.js), PAGES
import { chromium } from 'playwright-core';
import fs from 'node:fs'; import { createRequire } from 'node:module';
const base = (process.argv[2] || process.env.SITE || 'http://localhost:3000').replace(/\/$/, '');
const axePath = process.env.AXE_JS || createRequire(import.meta.url).resolve('axe-core/axe.min.js');
const axeSrc = fs.readFileSync(axePath, 'utf8');
const pages = (process.env.PAGES || '/,/tours,/tours/coxs-bazar-saint-martin,/holidays,/cruises,/activities,/destinations,/destinations/bali,/hotels,/hotels/grand-tea-valley,/flights,/visa,/visa/schengen,/offers,/blog,/blog/sajek-travel-guide,/gallery,/about,/contact,/faq,/reviews,/careers,/trip-planner,/compare,/wishlist,/login,/register,/terms,/zzz-404').split(',');
const b = await chromium.launch({ executablePath: process.env.CHROME || '/usr/bin/google-chrome', args: ['--no-sandbox'] });
const agg = {}; let scans = 0, clean = 0;
const jobs = []; for (const theme of ['light', 'dark']) for (const lang of ['en', 'bn']) for (const vp of ['desktop', 'mobile']) jobs.push({ theme, lang, vp });
async function run({ theme, lang, vp }) {
  const ctx = await b.newContext({ viewport: vp === 'mobile' ? { width: 390, height: 844 } : { width: 1366, height: 900 }, isMobile: vp === 'mobile' });
  await ctx.addInitScript((t) => { try { localStorage.setItem('musafir-theme', t); localStorage.setItem('musafir-consent', '{"essential":true}'); } catch {} }, theme);
  for (const path of pages) {
    const p = await ctx.newPage();
    await p.goto(`${base}/${lang}${path === '/' ? '' : path}`, { waitUntil: 'load', timeout: 60000 }).catch(() => {});
    await p.waitForTimeout(400);
    await p.addScriptTag({ content: axeSrc });
    const v = await p.evaluate(async () => (await window.axe.run(document, { runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'] }, resultTypes: ['violations'] })).violations.map((x) => ({ id: x.id, impact: x.impact, n: x.nodes.length, ex: x.nodes[0]?.target?.join(' ') + ' :: ' + (x.nodes[0]?.failureSummary || '').slice(0, 160) })));
    scans++; if (!v.length) clean++;
    for (const x of v) { const k = `${x.id} [${x.impact}]`; (agg[k] ||= { nodes: 0, pages: new Set(), ex: x.ex }).nodes += x.n; agg[k].pages.add(`${theme}/${lang}/${vp}${path}`); }
    await p.close();
  }
  await ctx.close();
}
const q = [...jobs];
await Promise.all(Array.from({ length: 4 }, async () => { while (q.length) await run(q.shift()); }));
await b.close();
const rules = Object.entries(agg).map(([k, a]) => ({ rule: k, nodes: a.nodes, pages: a.pages.size, sample: [...a.pages].slice(0, 3), ex: a.ex }));
console.log(JSON.stringify({ base, scans, clean, violating_scans: scans - clean, rules }, null, 1));
process.exit(scans === clean ? 0 : 1);
