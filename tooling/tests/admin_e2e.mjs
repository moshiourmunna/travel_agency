// Admin → public site E2E: each staff role makes a real change through the admin UI and we check it shows up on
// the public site / traveller portal (ISR revalidation with expire:0), then put the original value back.
// Usage: node admin_e2e.mjs [adminBase=http://127.0.0.1:8000/admin] [siteBase=http://localhost:3000]
// Needs the demo seed (staff logins, Farhana / password) and php on PATH (used once to stage a pending bank transfer).
import { chromium } from 'playwright-core';
import { execFileSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const ADMIN = process.argv[2] || 'http://127.0.0.1:8000/admin';
const SITE = process.argv[3] || 'http://localhost:3000';
const BACKEND = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../backend');
const stamp = Date.now().toString(36);
const browser = await chromium.launch({ executablePath: process.env.CHROME || '/usr/bin/google-chrome', args: ['--no-sandbox'] });
let fails = 0; const ok = (name, pass, info = '') => { if (!pass) fails++; console.log(`${pass ? 'PASS' : 'FAIL'} ${name} ${info}`); };
const tinker = (code) => execFileSync('php', ['artisan', 'tinker', '--execute', code], { cwd: BACKEND, encoding: 'utf8' }).trim();

async function staff(login) {
  const ctx = await browser.newContext({ viewport: { width: 1360, height: 900 } });
  const page = await ctx.newPage();
  page.on('pageerror', (e) => ok(`${login}: no JS error`, false, e.message));
  await page.goto(`${ADMIN}/login`);
  await page.fill('#email', `${login}@musafir.test`); await page.fill('#password', 'password');
  await Promise.all([page.waitForURL((u) => !u.pathname.endsWith('/login')), page.click('button[type=submit]')]);
  return page;
}
const toastOk = (page) => page.locator('[data-toast=success]').last().waitFor({ timeout: 10000 }).then(() => true, () => false);
// public pages are ISR: poll until the change is visible (should be the first hit after expire:0)
async function publicHas(url, text, tries = 12) {
  for (let i = 0; i < tries; i++) {
    const html = await fetch(SITE + url, { headers: { 'cache-control': 'no-cache' } }).then((r) => r.text()).catch(() => '');
    if (html.includes(text)) return i + 1;
    await new Promise((r) => setTimeout(r, 1000));
  }
  return 0;
}
async function editTr(page, url, field, value) { // set the English half of a bilingual field on a resource form and save
  await page.goto(ADMIN + url, { waitUntil: 'networkidle' });
  const input = page.locator(`[data-field="${field}"] [lang=en]`).first();
  const old = await input.inputValue();
  await input.fill(value);
  await page.click('[data-save]');
  return { old, saved: await toastOk(page) };
}

// owner: a site setting (footer e-mail)
{
  const page = await staff('admin');
  await page.goto(`${ADMIN}/settings?group=company`, { waitUntil: 'networkidle' });
  const input = page.locator('[data-setting=email] input').first();
  const old = await input.inputValue(); const val = `e2e-${stamp}@musafir.com.bd`;
  await input.fill(val); await page.click('[data-settings-form] [data-save]');
  ok('owner: settings saved', await toastOk(page));
  const n = await publicHas('/en', val); ok('owner: footer shows new e-mail', n > 0, `after ${n} hit(s)`);
  await input.fill(old); await page.click('[data-settings-form] [data-save]'); await toastOk(page);
  ok('owner: setting restored on site', (await publicHas('/en', old)) > 0);
  await page.context().close();
}

// content (editor): FAQ question + a UI translation
{
  const page = await staff('content');
  const val = `How do I book a tour (e2e ${stamp})?`;
  const { old, saved } = await editTr(page, '/faqs/1/edit', 'question', val);
  ok('content: FAQ saved', saved);
  const n = await publicHas('/en/faq', val.replace('(', '(')); ok('content: /en/faq shows edited question', n > 0, `after ${n} hit(s)`);
  await editTr(page, '/faqs/1/edit', 'question', old);
  ok('content: FAQ restored on site', (await publicHas('/en/faq', old.replace("'", '&#x27;'))) > 0 || (await publicHas('/en/faq', old)) > 0);

  await page.goto(`${ADMIN}/translations?q=${encodeURIComponent('Get travel deals before')}`, { waitUntil: 'networkidle' });
  const row = page.locator('[data-tr-row]').filter({ hasText: '' }).first();
  const en = row.locator('textarea[lang=en]');
  const oldT = await en.inputValue(); const valT = `Get travel deals first ${stamp}`;
  await en.fill(valT); await en.blur();
  ok('content: translation saved inline', await row.locator('[data-tr-saved]').waitFor({ timeout: 10000 }).then(() => true, () => false));
  const m = await publicHas('/en', valT); ok('content: home page shows edited UI text', m > 0, `after ${m} hit(s)`);
  await en.fill(oldT); await en.blur(); await row.locator('[data-tr-saved]').waitFor({ timeout: 10000 }).catch(() => {});
  ok('content: translation restored on site', (await publicHas('/en', oldT)) > 0);
  await page.goto(`${ADMIN}/bookings`); ok('content: bookings forbidden', (await page.locator('text=403').count()) > 0 || (await page.title()).includes('403') || !(await page.locator('[data-row-edit]').count()));
  await page.context().close();
}

// sales: a tour title on its detail page
{
  const page = await staff('sales');
  const val = `Cox's Bazar Escape e2e ${stamp}`;
  const { old, saved } = await editTr(page, '/tours/1/edit', 'title', val);
  ok('sales: tour saved', saved);
  const n = await publicHas('/en/tours/coxs-bazar-saint-martin', `Escape e2e ${stamp}`); ok('sales: tour page shows new title', n > 0, `after ${n} hit(s)`);
  const l = await publicHas('/en/tours', `Escape e2e ${stamp}`); ok('sales: tours listing shows new title', l > 0);
  await editTr(page, '/tours/1/edit', 'title', old);
  ok('sales: title restored on site', (await publicHas('/en/tours/coxs-bazar-saint-martin', 'Saint Martin Island Escape')) > 0);
  await page.context().close();
}

// traveller portal session (Farhana) for the ops checks
const tctx = await browser.newContext(); const tp = await tctx.newPage();
await tp.goto(`${SITE}/en/login?next=/en/account`, { waitUntil: 'networkidle' });
await tp.getByRole('button', { name: /^(Accept all|সব গ্রহণ)/ }).click({ timeout: 2500 }).catch(() => {});
await tp.click('#tb-pw'); await tp.fill('#lg-em', 'farhana@example.com'); await tp.fill('#lg-pass', 'password');
await Promise.all([tp.waitForURL((u) => new URL(u).pathname === '/en/account', { timeout: 60000 }), tp.locator('#lg-pw button.btn-primary').click()]);
const portal = async (p) => { await tp.goto(SITE + p, { waitUntil: 'networkidle' }); return ((await tp.locator('main').textContent()) || '').replace(/\s+/g, ' '); };

// reservations: a traveller-visible note on a booking
{
  const page = await staff('reservations');
  const ref = 'MSF-26-49102';
  const id = tinker(`echo App\\Models\\Booking::where('ref','${ref}')->value('id');`);
  await page.goto(`${ADMIN}/bookings/${id}`, { waitUntil: 'networkidle' });
  const note = `Pickup confirmed for 7:00 (e2e ${stamp})`;
  const form = page.locator('form:has([data-add-note])');
  await form.locator('textarea').fill(note);
  const sw = form.locator('[role=switch]').first(); if ((await sw.getAttribute('aria-checked')) !== 'true') await sw.click();
  await form.locator('[data-add-note]').click();
  ok('reservations: note added', await toastOk(page));
  ok('reservations: note in timeline', (await page.locator('[data-timeline]').innerText()).includes(note));
  ok('reservations: traveller sees the note in the portal', (await portal(`/en/account/bookings/${ref}`)).includes(note));
  await page.context().close();
}

// accounts: verify a bank transfer → booking paid amount rises for the traveller
{
  const ref = 'MSF-26-49102';
  const pid = tinker(`$b=App\\Models\\Booking::where('ref','${ref}')->first(); $p=App\\Models\\Payment::create(['ulid'=>(string) Illuminate\\Support\\Str::ulid(),'booking_id'=>$b->id,'user_id'=>$b->user_id,'purpose'=>'booking','gateway'=>'bank_transfer','method'=>'Bank transfer','amount'=>1000,'status'=>'pending','gateway_txn'=>'E2E-${stamp}']); echo $p->id;`);
  const paidBefore = Number(tinker(`echo App\\Models\\Booking::where('ref','${ref}')->value('paid');`));
  const page = await staff('accounts');
  const id = tinker(`echo App\\Models\\Booking::where('ref','${ref}')->value('id');`);
  await page.goto(`${ADMIN}/bookings/${id}`, { waitUntil: 'networkidle' });
  await page.click(`[data-verify="${pid}"]`);
  await page.locator('[role=dialog] input').first().fill(`E2E bank ref ${stamp}`).catch(() => {});
  await page.click('[data-action-submit]');
  ok('accounts: transfer verified', await toastOk(page));
  const paidAfter = Number(tinker(`echo App\\Models\\Booking::where('ref','${ref}')->value('paid');`));
  ok('accounts: booking paid +1000', paidAfter === paidBefore + 1000, `${paidBefore} → ${paidAfter}`);
  const fmt = new Intl.NumberFormat('en-IN').format(paidAfter); const fmt2 = new Intl.NumberFormat('en-US').format(paidAfter);
  const txt = await portal(`/en/account/bookings/${ref}`);
  ok('accounts: traveller portal shows the new paid amount', txt.includes(fmt) || txt.includes(fmt2), fmt2);
  await page.context().close();
}

// visa: move an application to the next stage → the traveller's visa tracker follows
{
  const page = await staff('visa');
  const vid = tinker(`echo App\\Models\\VisaApplication::where('ref','VSA-26-1183')->value('id');`);
  await page.goto(`${ADMIN}/visa-applications/${vid}/edit`, { waitUntil: 'networkidle' });
  const sel = page.locator('[data-field=stage] select');
  const old = await sel.inputValue(); const next = old === 'verified' ? 'docs' : 'verified';
  await sel.selectOption(next); await page.click('[data-save]');
  ok('visa: stage saved', await toastOk(page));
  const card = async () => { await portal('/en/account/visa'); return tp.locator('li, article, section, div').filter({ hasText: 'VSA-26-1183' }).last().innerText().catch(() => ''); };
  const label = next === 'verified' ? /Documents verified|verified/i : /Documents needed|upload/i;
  ok('visa: traveller tracker shows the new stage', label.test(await card()));
  await sel.selectOption(old); await page.click('[data-save]'); await toastOk(page);
  await page.context().close();
}

// support: reply to a traveller ticket → visible in their support inbox
{
  const page = await staff('support');
  await page.goto(`${ADMIN}/tickets/1`, { waitUntil: 'networkidle' });
  const reply = `We have moved you to the sunset villa (e2e ${stamp}).`;
  await page.fill('[data-reply]', reply); await page.click('[data-send]');
  ok('support: reply sent', await toastOk(page));
  ok('support: reply in thread', (await page.locator('[data-thread]').innerText()).includes(reply));
  let seen = (await portal('/en/account/support')).includes(reply);
  if (!seen) { const t = tp.locator('a, button').filter({ hasText: 'Maldives' }).first(); if (await t.count()) { await t.click(); await tp.waitForTimeout(1200); seen = (await tp.locator('main').innerText()).includes(reply); } }
  ok('support: traveller sees the reply', seen);
  await page.context().close();
}
await tctx.close();
console.log(fails ? `FAILS ${fails}` : 'ALL PASS');
await browser.close();
process.exit(fails ? 1 : 0);
