// Admin crawl: sign in as a role, open every nav page, the first record's edit/detail page and the create page; report JS errors / 4xx-5xx.
// Usage: node admin_crawl.mjs [email] [adminBase]
import { chromium } from 'playwright-core';
const EMAIL = process.argv[2] || 'admin@musafir.test';
const BASE = process.argv[3] || 'http://127.0.0.1:8000/admin';
const browser = await chromium.launch({ executablePath: process.env.CHROME || '/usr/bin/google-chrome', args: ['--no-sandbox'] });
const page = await (await browser.newContext({ viewport: { width: 1400, height: 900 } })).newPage();
let errs = []; let fails = 0;
page.on('pageerror', (e) => errs.push('pageerror: ' + e.message));
page.on('console', (m) => { if (m.type() === 'error') errs.push('console: ' + m.text().slice(0, 300)); });
page.on('response', (r) => { if (r.status() >= 400 && !r.url().includes('favicon')) errs.push(`HTTP ${r.status()} ${r.url()}`); });
await page.goto(BASE + '/login');
await page.fill('#email', EMAIL); await page.fill('#password', 'password');
await Promise.all([page.waitForURL((u) => !u.pathname.endsWith('/login')), page.click('button[type=submit]')]);
const links = await page.$$eval('[data-nav]', (as) => [...new Set(as.map((a) => a.getAttribute('href')))]);
console.log(EMAIL, 'nav links', links.length);
const visit = async (href, label) => {
  errs = [];
  await page.goto(new URL(href, BASE).href, { waitUntil: 'networkidle' }).catch((e) => errs.push('goto ' + e.message));
  await page.waitForTimeout(150);
  const h1 = (await page.locator('h1').count()) ? (await page.locator('h1').first().textContent()).trim().slice(0, 50) : '';
  if (errs.length || !h1) { fails++; console.log('FAIL', label, href, h1, '\n   ' + errs.join('\n   ')); } else console.log('ok  ', label, href, '|', h1);
};
for (const l of links) {
  await visit(l, 'index');
  const edit = (await page.locator('[data-row-edit]').count()) ? await page.locator('[data-row-edit]').first().getAttribute('href') : null;
  const create = (await page.locator('[data-create]').count()) ? await page.locator('[data-create]').first().getAttribute('href') : null;
  if (edit) await visit(edit, ' edit');
  if (create) await visit(create, ' new ');
}
const navPaths = links.map((l) => new URL(l, BASE).pathname);
for (const p of ['/profile', '/settings?group=payments', '/media']) {
  const path = new URL(BASE + p).pathname;
  if (p === '/profile' || navPaths.includes(path)) { await visit(BASE + p, 'extra'); continue; }
  // not in this role's nav -> must be denied (403), never a 500 or a silently-open page
  const r = await page.goto(BASE + p, { waitUntil: 'networkidle' }).catch(() => null);
  if (r && r.status() === 403) console.log('ok   denied', p, 403); else { fails++; console.log('FAIL not denied', p, r && r.status()); }
}
console.log('FAILS', fails);
await browser.close();
process.exit(fails ? 1 : 0);
