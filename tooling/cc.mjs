import { chromium } from 'playwright'; import AxeBuilder from '@axe-core/playwright';
const b = await chromium.launch({ executablePath: '/usr/bin/google-chrome', args: ['--no-sandbox'] });
const g = {};
for (const th of ['light','dark']) { const c = await b.newContext({ viewport: { width: 1280, height: 900 } }); await c.addInitScript(t => { localStorage.setItem('musafir-theme', t); localStorage.setItem('musafir-consent', '{"essential":true}'); }, th);
for (const p of ['en/index.html','en/tours/maldives-honeymoon.html','en/cruises.html','en/activities/pokhara-paragliding.html','bn/trip-planner.html','en/offers.html']) { const pg = await c.newPage(); await pg.goto('file:///workspace/musafir/site/' + p);
 const r = await new AxeBuilder({ page: pg }).withRules(['color-contrast']).analyze();
 r.violations.forEach(v => v.nodes.forEach(n => { const m = n.failureSummary.match(/foreground color: (#\w+), background color: (#\w+)/); const k = th+' '+(m ? m[1] + ' on ' + m[2] : '?'); g[k] = g[k] || { n: 0, ex: n.target.join(' ') + ' | ' + n.html.slice(0, 110) }; g[k].n++; })); await pg.close(); } }
Object.entries(g).sort((a, b) => b[1].n - a[1].n).slice(0, 25).forEach(([k, v]) => console.log(v.n, k, '\n   ', v.ex));
await b.close();
