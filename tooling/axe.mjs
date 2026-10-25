import { chromium } from 'playwright'; import AxeBuilder from '@axe-core/playwright'; import fs from 'fs';
const S = 'file:///workspace/musafir/site/';
let P = ['index.html', 'tours.html', 'tours/maldives-honeymoon.html', 'holidays.html', 'cruises.html', 'cruises/greek-isles-turkey.html', 'activities.html', 'activities/pokhara-paragliding.html', 'trip-planner.html', 'destinations/bali.html', 'flights.html', 'hotels/ocean-pearl-resort.html', 'visa/schengen.html', 'booking.html', 'offers.html', 'blog/sajek-travel-guide.html', 'gallery.html', 'about.html', 'contact.html', 'faq.html', 'reviews.html', 'careers.html', 'terms.html', 'custom-tour.html', 'insurance.html', 'gift-cards.html', 'compare.html', 'wishlist.html', 'login.html', 'register.html', 'sitemap.html', 'brand.html', '404.html'];
import path from 'path';
const APP = process.env.AXE_SET === 'app';
if (APP) { P.length = 0; for (const d of ['account', 'admin']) fs.readdirSync('/workspace/musafir/site/en/' + d).filter(f => f.endsWith('.html')).sort().forEach(f => P.push(d + '/' + f)); }
const b = await chromium.launch({ executablePath: '/usr/bin/google-chrome', args: ['--no-sandbox'] });
const out = []; const agg = {};
for (const th of ['light', 'dark']) { const c = await b.newContext({ viewport: { width: 1280, height: 900 } }); await c.addInitScript(t => { localStorage.setItem('musafir-theme', t); localStorage.setItem('musafir-consent', '{"essential":true}'); }, th);
  for (const l of ['en', 'bn']) for (const p of P) { const pg = await c.newPage(); await pg.goto(S + l + '/' + p); await pg.waitForTimeout(150);
    const r = await new AxeBuilder({ page: pg }).withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa']).analyze();
    const v = r.violations.map(v => ({ id: v.id, impact: v.impact, n: v.nodes.length, ex: v.nodes[0].target.join(' ') + ' :: ' + (v.nodes[0].failureSummary || '').slice(0, 140) }));
    v.forEach(x => { const k = x.id + ' [' + x.impact + ']'; agg[k] = agg[k] || { count: 0, pages: new Set(), ex: x.ex }; agg[k].count += x.n; agg[k].pages.add(th + ':' + l + '/' + p); });
    out.push({ p: l + '/' + p, th, violations: v }); await pg.close(); } }
await b.close();
fs.writeFileSync(APP ? '/workspace/musafir/tests/axe-app.json' : '/workspace/musafir/tests/axe.json', JSON.stringify(out, null, 1));
console.log('scans', out.length, 'with violations', out.filter(o => o.violations.length).length);
for (const [k, v] of Object.entries(agg)) console.log(k, 'nodes', v.count, 'pages', v.pages.size, [...v.pages].slice(0, 3).join(','), '\n   ', v.ex);
