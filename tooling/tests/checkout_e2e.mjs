// Browser E2E of the 4-step checkout → simulated gateway → confirmation page. Usage: node checkout_e2e.mjs [baseUrl]
import { chromium } from 'playwright-core';
const BASE = process.argv[2] || 'http://localhost:3000';
const exe = process.env.CHROME || '/usr/bin/google-chrome';
const out = []; const ok = (name, pass, info = '') => { out.push({ name, pass, info }); console.log(`${pass ? 'PASS' : 'FAIL'} ${name} ${info}`); };
const browser = await chromium.launch({ executablePath: exe, args: ['--no-sandbox'] });

async function flow(name, url, { coupon, plan, gw = 'bkash', result = 'success', width = 1440, lang = 'en', passport } = {}) {
  const ctx = await browser.newContext({ viewport: { width, height: 900 } });
  const page = await ctx.newPage(); const errors = [];
  page.on('pageerror', (e) => errors.push(e.message));
  try {
    await page.goto(BASE + url, { waitUntil: 'networkidle' });
    await page.getByRole('button', { name: /^(Accept all|সব গ্রহণ)/ }).click({ timeout: 3000 }).catch(() => {});
    const total0 = await page.locator('[data-ck-total]').first().textContent().catch(() => null);
    ok(`${name}: step 1 renders`, await page.locator('#ck-h0').isVisible(), total0 ?? '');
    await page.locator('[data-step-panel]:visible button.btn-primary').first().click();
    await page.locator('#ck-h1').waitFor({ state: 'visible' });
    // validation: continuing empty must show errors
    await page.locator('[data-step-panel]:visible button.btn-primary').first().click();
    ok(`${name}: step 2 validation`, (await page.locator('[data-step-panel]:visible .is-invalid').count()) >= 3);
    await page.fill('#ck-first_name', 'Rafiq'); await page.fill('#ck-last_name', 'Islam');
    await page.fill('#ck-email', `e2e.${Date.now()}@example.com`); await page.fill('#ck-phone', '01711234567');
    if (passport) await page.fill('#ck-passport', passport);
    for (const el of await page.locator('[data-step-panel]:visible input[id^="ck-t"]').all()) if (/^ck-t\d+$/.test((await el.getAttribute('id')) ?? '')) await el.fill('Companion Traveller');
    await page.locator('[data-step-panel]:visible button.btn-primary').first().click();
    await page.locator('#ck-h2').waitFor({ state: 'visible' });
    if (coupon) {
      await page.fill('#ck-coupon', coupon); await page.locator('#ck-coupon ~ button, #ck-coupon + button').first().click().catch(async () => page.getByRole('button', { name: /apply|প্রয়োগ/i }).click());
      await page.waitForTimeout(1200);
      const msg = await page.locator('#ck-coupon-m').textContent();
      ok(`${name}: coupon ${coupon}`, !(await page.locator('#ck-coupon-m.text-rose-600').count()), msg?.trim() ?? '');
    }
    await page.locator('[data-step-panel]:visible button.btn-primary').first().click();
    await page.locator('#ck-h3').waitFor({ state: 'visible' });
    const plans = await page.locator('input[name="plan"]').evaluateAll((els) => els.map((e) => e.value));
    if (plan) { ok(`${name}: plan ${plan} offered`, plans.includes(plan), plans.join(',')); if (plans.includes(plan)) await page.check(`input[name="plan"][value="${plan}"]`); }
    await page.locator(`input[name="ck-method"][value="${gw}"]`).check({ force: true });
    if (gw === 'bank_transfer') await page.fill('#ck-slip', `CBL-TT-${Date.now()}`);
    // pay without agreeing → error
    await page.locator('[data-ck-pay]').click();
    ok(`${name}: terms required`, (await page.locator('[data-step-panel]:visible .is-invalid').count()) >= 1);
    await page.locator('[data-step-panel]:visible input[type=checkbox]').last().check();
    await Promise.all([page.waitForURL(/pay\/mock|booking-confirmed|booking\?ref/, { timeout: 20000 }), page.locator('[data-ck-pay]').click()]);
    if (page.url().includes('/pay/mock')) {
      ok(`${name}: gateway page`, true, (await page.locator('h1').first().textContent())?.trim());
      await Promise.all([page.waitForURL(/booking/, { timeout: 20000 }), page.click(`button[value="${result}"]`)]);
    }
    const u = page.url();
    if (result === 'success' && gw !== 'bank_transfer') {
      const h = await page.locator('h1').first().textContent();
      const ref = await page.locator('[data-booking-ref]').textContent();
      ok(`${name}: confirmed`, u.includes('booking-confirmed') && /confirmed|নিশ্চিত/i.test(h ?? ''), `${ref?.trim()} ${(await page.locator('[data-pay-status]').textContent())?.trim()} paid ${(await page.locator('[data-paid]').textContent().catch(() => '-'))}`);
      const inv = await page.locator('[data-doc="invoice"]').getAttribute('href');
      const r = await ctx.request.get(BASE + inv); ok(`${name}: invoice pdf`, r.status() === 200 && (r.headers()['content-type'] ?? '').includes('pdf'), `${(await r.body()).length} bytes`);
      await page.screenshot({ path: `/tmp/e2e_${name.replace(/\W+/g, '_')}.png`, fullPage: true });
    } else if (gw === 'bank_transfer') {
      ok(`${name}: bank pending page`, u.includes('booking-confirmed') && /received|পাওয়া/i.test((await page.locator('h1').first().textContent()) ?? ''), u);
    } else {
      ok(`${name}: back to checkout with ${result}`, u.includes(`payment=${result}`) && (await page.locator('[role=alert], .alert').count()) >= 0, u.replace(BASE, ''));
      ok(`${name}: resume shows payment step`, await page.locator('#ck-h3').isVisible().catch(() => false));
      await page.locator('[data-step-panel]:visible input[type=checkbox]').last().check();
      await Promise.all([page.waitForURL(/pay\/mock/, { timeout: 20000 }), page.locator('[data-ck-pay]').click()]);
      await Promise.all([page.waitForURL(/booking-confirmed/, { timeout: 20000 }), page.click('button[value="success"]')]);
      ok(`${name}: retry after failure succeeds`, /confirmed/i.test((await page.locator('h1').first().textContent()) ?? ''), (await page.locator('[data-booking-ref]').textContent())?.trim());
    }
    ok(`${name}: no JS errors`, errors.length === 0, errors.join(' | '));
  } catch (e) { ok(`${name}: flow`, false, e.message.split('\n')[0]); await page.screenshot({ path: `/tmp/e2e_fail_${name.replace(/\W+/g, '_')}.png`, fullPage: true }); }
  await ctx.close();
}

const API = process.env.API || 'http://127.0.0.1:8000';
const tq = await fetch(`${API}/api/v1/checkout/quote?lang=en`, { method: 'POST', headers: { 'Content-Type': 'application/json', Accept: 'application/json' }, body: JSON.stringify({ kind: 'tour', slug: 'maldives-honeymoon', adults: 2 }) }).then((r) => r.json());
const far = (tq.data?.choices?.dates ?? []).filter((d) => d.seats_left >= 2 && new Date(d.date) > new Date(Date.now() + 30 * 864e5)).pop();
await flow('tour deposit + coupon', `/en/booking?tour=maldives-honeymoon&date=${far?.date ?? ''}&adults=2&addons[]=insurance`, { coupon: 'MUSAFIR10', plan: 'deposit', passport: 'A01234567' });
await flow('cruise full (bn, mobile)', '/bn/booking?cruise=singapore-penang-phuket&adults=2', { plan: 'full', width: 390, lang: 'bn', gw: 'nagad', passport: 'B07654321' });
await flow('activity card', '/en/booking?activity=old-dhaka-food-walk&adults=2', { gw: 'sslcommerz' });
await flow('hotel failed payment', '/en/booking?hotel=ocean-pearl-resort&rooms=1', { result: 'failed' });
await flow('hotel bank transfer', '/en/booking?hotel=ocean-pearl-resort&rooms=1', { gw: 'bank_transfer' });
// Visa: entry from the visa page's "Apply & pay online" button
{
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 } }); const page = await ctx.newPage();
  await page.goto(BASE + '/en/visa/thailand', { waitUntil: 'networkidle' });
  const href = await page.locator('[data-visa-pay]').getAttribute('href').catch(() => null);
  ok('visa: pay-online link on visa page', !!href && href.includes('/booking?visa='), href ?? '');
  await ctx.close();
  if (href) await flow('visa 2 applicants', href.replace('adults=1', 'adults=2'), { gw: 'mock', passport: 'A11223344' });
}
await flow('gift card', '/en/booking?gift=classic&amount=5000&to=Nadia&email=nadia@example.com', { gw: 'bkash' });
await browser.close();
const fails = out.filter((x) => !x.pass); console.log(`\n${out.length - fails.length}/${out.length} passed`); process.exit(fails.length ? 1 : 0);
