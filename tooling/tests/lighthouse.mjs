// Lighthouse (mobile, simulated throttling) on key public pages. Usage: node lighthouse.mjs [siteBase] [preset=mobile|desktop]
// Prints perf/a11y/best-practices/SEO per page and the top failing audits; writes lighthouse-summary.json.
import lighthouse from 'lighthouse';
import * as chromeLauncher from 'chrome-launcher';
import fs from 'node:fs';
const BASE = process.argv[2] || 'http://localhost:3000';
const preset = process.argv[3] || 'mobile';
const PAGES = (process.env.LH_PAGES || '/en,/bn,/en/tours,/en/tours/coxs-bazar-saint-martin,/en/destinations,/en/visa,/en/blog,/en/contact,/en/faq,/en/hotels').split(',');
const chrome = await chromeLauncher.launch({ chromePath: process.env.CHROME || '/usr/bin/google-chrome', chromeFlags: ['--headless=new', '--no-sandbox'] });
const out = [];
for (const p of PAGES) {
  await fetch(BASE + p).catch(() => {}); // warm ISR
  const cfg = preset === 'desktop' ? (await import('lighthouse/core/config/desktop-config.js')).default : undefined;
  const r = await lighthouse(BASE + p, { port: chrome.port, output: 'json', logLevel: 'error', onlyCategories: ['performance', 'accessibility', 'best-practices', 'seo'] }, cfg);
  const c = r.lhr.categories; const s = (k) => Math.round((c[k]?.score ?? 0) * 100);
  const fails = Object.values(r.lhr.audits).filter((a) => a.score !== null && a.score < 0.9 && a.scoreDisplayMode !== 'informative' && a.scoreDisplayMode !== 'manual' && a.scoreDisplayMode !== 'notApplicable')
    .map((a) => `${a.id}${a.displayValue ? ` (${a.displayValue})` : ''}`).slice(0, 8);
  const row = { page: p, perf: s('performance'), a11y: s('accessibility'), bp: s('best-practices'), seo: s('seo'), lcp: r.lhr.audits['largest-contentful-paint']?.displayValue, cls: r.lhr.audits['cumulative-layout-shift']?.displayValue, tbt: r.lhr.audits['total-blocking-time']?.displayValue, fails };
  out.push(row);
  console.log(`${p.padEnd(40)} perf ${row.perf} a11y ${row.a11y} bp ${row.bp} seo ${row.seo} | LCP ${row.lcp} CLS ${row.cls} TBT ${row.tbt}\n   ${fails.join(', ')}`);
}
await chrome.kill();
fs.writeFileSync(new URL('../lighthouse-summary.json', import.meta.url), JSON.stringify({ preset, at: new Date().toISOString(), pages: out }, null, 2));
