// PC smoke: portal sign-in + account pages + one checkout through the test gateway. node pc_portal_smoke.mjs
import { chromium } from 'playwright-core';
const FE = process.env.FE || 'http://localhost:3000';
let browser;
try { browser = await chromium.launch({ channel: 'chrome' }); } catch { browser = await chromium.launch({ channel: 'msedge' }); }
const res = []; const ok = (n, p, i = '') => { res.push(p); console.log(`${p ? 'PASS' : 'FAIL'} ${n} ${i}`); };
const ctx = await browser.newContext({ viewport: { width: 1366, height: 900 } });
const page = await ctx.newPage(); const errors = [];
page.on('pageerror', (e) => errors.push(e.message));
await page.goto(`${FE}/en/login?next=/en/account`, { waitUntil: 'networkidle', timeout: 120000 });
await page.getByRole('button', { name: /^Accept all/ }).click({ timeout: 3000 }).catch(() => {});
await page.click('#tb-pw'); await page.fill('#lg-em', 'farhana@example.com'); await page.fill('#lg-pass', 'password');
await page.locator('#lg-pw button.btn-primary').click();
await page.waitForURL((u) => new URL(u).pathname === '/en/account', { timeout: 120000 }).catch(() => {});
ok('login', new URL(page.url()).pathname === '/en/account', page.url());
for (const p of ['', '/bookings', '/bookings/MSF-26-48213', '/bookings/MSF-26-48377/ticket', '/visa', '/wallet', '/payments', '/support', '/profile', '/settings']) {
  const r = await page.goto(`${FE}/en/account${p}`, { waitUntil: 'networkidle', timeout: 120000 });
  ok(`account${p || '/'}`, r.status() === 200 && new URL(page.url()).pathname === `/en/account${p}` && (await page.locator('h1').count()) === 1, (await page.locator('h1').first().textContent())?.trim().slice(0, 40));
}
await page.goto(`${FE}/bn/account`, { waitUntil: 'networkidle', timeout: 120000 });
ok('account bn', /স্বাগতম/.test(await page.locator('main').textContent()));
// checkout: activity, test gateway, success
await page.goto(`${FE}/en/booking?activity=old-dhaka-food-walk&adults=2`, { waitUntil: 'networkidle', timeout: 120000 });
const hasCk = await page.locator('#ck-h0').isVisible().catch(() => false);
ok('checkout step 1', hasCk);
if (hasCk) {
  await page.locator('[data-step-panel]:visible button.btn-primary').first().click();
  await page.locator('#ck-h1').waitFor();
  for (const [id, v] of [['#ck-first_name', 'Rafiq'], ['#ck-last_name', 'Islam'], ['#ck-email', `pc.${Date.now()}@example.com`], ['#ck-phone', '01711234567']]) if (!(await page.inputValue(id))) await page.fill(id, v);
  for (const el of await page.locator('[data-step-panel]:visible input[id^="ck-t"]').all()) if (/^ck-t\d+$/.test((await el.getAttribute('id')) ?? '') && !(await el.inputValue())) await el.fill('Companion Traveller');
  await page.locator('[data-step-panel]:visible button.btn-primary').first().click(); await page.locator('#ck-h2').waitFor();
  await page.locator('[data-step-panel]:visible button.btn-primary').first().click(); await page.locator('#ck-h3').waitFor();
  await page.locator('input[name="ck-method"][value="bkash"]').check({ force: true });
  await page.locator('[data-step-panel]:visible input[type=checkbox]').last().check();
  await Promise.all([page.waitForURL(/pay\/mock/, { timeout: 60000 }), page.locator('[data-ck-pay]').click()]);
  await Promise.all([page.waitForURL(/booking-confirmed/, { timeout: 60000 }), page.click('button[value="success"]')]);
  ok('checkout confirmed', /confirmed/i.test((await page.locator('h1').first().textContent()) ?? ''), (await page.locator('[data-booking-ref]').textContent())?.trim());
}
ok('no JS errors', errors.length === 0, errors.slice(0, 2).join(' | '));
await browser.close();
console.log(`${res.filter(Boolean).length}/${res.length} passed`);
