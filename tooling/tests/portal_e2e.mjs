// Browser E2E of the traveller portal (sign-in → every /account page → the writes each page makes). Usage: node portal_e2e.mjs [baseUrl]
// Needs a fresh demo seed (Farhana / password) and OTP_DEBUG=true for the two-step check.
import { chromium } from 'playwright-core';
import fs from 'node:fs';
const BASE = process.argv[2] || 'http://localhost:3000';
const exe = process.env.CHROME || '/usr/bin/google-chrome';
const out = []; const ok = (name, pass, info = '') => { out.push({ name, pass, info }); console.log(`${pass ? 'PASS' : 'FAIL'} ${name} ${info}`); };
const browser = await chromium.launch({ executablePath: exe, args: ['--no-sandbox'] });
const PAGES = ['', '/bookings', '/bookings/MSF-26-48213', '/bookings/MSF-26-48377/ticket', '/visa', '/trips', '/wallet', '/payments', '/referrals', '/travellers',
  '/notifications', '/support', '/reviews', '/profile', '/settings'];

async function signIn(page, lang = 'en') {
  await page.goto(`${BASE}/${lang}/login?next=/${lang}/account`, { waitUntil: 'networkidle' });
  await page.getByRole('button', { name: /^(Accept all|সব গ্রহণ)/ }).click({ timeout: 2500 }).catch(() => {});
  await page.click('#tb-pw');
  await page.fill('#lg-em', 'farhana@example.com'); await page.fill('#lg-pass', 'password');
  const [res] = await Promise.all([page.waitForResponse((r) => r.url().includes('/api/auth/login'), { timeout: 30000 }), page.locator('#lg-pw button.btn-primary').click()]);
  if (res.ok() && !(await res.json().catch(() => ({})))?.data?.two_factor) await page.waitForURL((u) => new URL(u).pathname === `/${lang}/account`, { timeout: 60000 });
}
const toast = (page) => page.locator('[data-toast], [role=status]').last().textContent({ timeout: 6000 }).catch(() => '');

async function run(lang, width, dark) {
  const tag = `${lang}-${width}${dark ? '-dark' : ''}`;
  const ctx = await browser.newContext({ viewport: { width, height: 900 } });
  if (dark) await ctx.addCookies([{ name: 'musafir-theme', value: 'dark', url: BASE }]);
  const page = await ctx.newPage(); const errors = [];
  page.on('pageerror', (e) => errors.push(e.message));
  page.on('console', (m) => { if (m.type() === 'error' && !/favicon|404|net::ERR/.test(m.text())) errors.push(m.text()); });
  // guard: signed out → login
  await page.goto(`${BASE}/${lang}/account/wallet`, { waitUntil: 'domcontentloaded' });
  ok(`${tag}: signed-out redirect`, /\/login\?next=/.test(page.url()), page.url().replace(BASE, ''));
  await signIn(page, lang);
  ok(`${tag}: password sign-in`, new URL(page.url()).pathname === `/${lang}/account`, page.url().replace(BASE, ''));
  for (const p of PAGES) {
    const r = await page.goto(`${BASE}/${lang}/account${p}`, { waitUntil: 'networkidle' });
    const h1 = (await page.locator('main h1, h1').first().textContent().catch(() => ''))?.trim();
    const over = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
    const robots = await page.locator('meta[name=robots]').getAttribute('content').catch(() => '');
    const where = new URL(page.url()).pathname;
    const h1s = await page.locator('h1').count();
    ok(`${tag}: ${p || '/'} renders`, r.status() === 200 && where === `/${lang}/account${p}` && !!h1 && h1s === 1 && over <= 1 && /noindex/.test(robots ?? ''), `${h1?.slice(0, 40)} h1s=${h1s} overflow=${over}`);
    if (width === 1440 && !dark) await page.screenshot({ path: `/tmp/portal_${lang}${p.replace(/\W+/g, '_') || '_dash'}.png`, fullPage: true });
  }
  ok(`${tag}: no JS errors`, errors.length === 0, errors.slice(0, 3).join(' | '));
  await ctx.close();
}

async function writes() {
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 }, acceptDownloads: true });
  const page = await ctx.newPage(); const errors = [];
  page.on('pageerror', (e) => errors.push(e.message));
  page.on('dialog', (d) => d.accept());
  await signIn(page);
  const go = (p) => page.goto(`${BASE}/en/account${p}`, { waitUntil: 'networkidle' });

  // notifications: mark one, then all
  await go('/notifications');
  const unread0 = await page.locator('[data-unread="1"]').count();
  await page.locator('[data-unread="1"] button').first().click(); await page.waitForTimeout(1200);
  const unread1 = await page.locator('[data-unread="1"]').count();
  await page.getByRole('button', { name: /Mark all read/ }).click(); await page.waitForTimeout(1200);
  ok('notifications: mark read', unread1 === unread0 - 1 && (await page.locator('[data-unread="1"]').count()) === 0, `${unread0}→${unread1}→0`);
  await page.getByRole('button', { name: /^Visa/ }).first().click().catch(() => {});
  const vis = await page.locator('[data-row]:visible').evaluateAll((els) => els.map((e) => e.getAttribute('data-cat')));
  ok('notifications: filter chips', vis.length > 0 && vis.every((c) => c === 'visa'), vis.join(','));

  // profile: emergency contact → completeness 90%
  await go('/profile');
  await page.fill('#ec-n', 'Kamal Rahman'); await page.fill('#ec-p', '01811111111');
  await page.getByRole('button', { name: 'Save changes' }).click(); await page.waitForTimeout(1500);
  ok('profile: save + completeness', /90%/.test(await page.locator('main').textContent()) && /photo/.test(await page.locator('[data-profile-hint]').textContent()), (await page.locator('[data-profile-hint]').textContent())?.trim());
  await page.fill('#pf-nid', '123'); await page.getByRole('button', { name: 'Save changes' }).click(); await page.waitForTimeout(800);
  ok('profile: NID validation', (await page.locator('#pf-nid:invalid, #pf-nid.is-invalid').count()) === 1);
  await page.fill('#pf-nid', '');
  // avatar upload
  fs.writeFileSync('/tmp/av.png', Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAGAAAABgCAIAAABt+uBvAAAAPklEQVR42u3BAQ0AAADCoPdPbQ8HFAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAPwZYAABF/5Q+AAAAABJRU5ErkJggg==', 'base64'));
  await page.setInputFiles('[data-avatar-input]', '/tmp/av.png'); await page.waitForTimeout(2000);
  ok('profile: avatar upload', (await page.locator('main img[src*="avatars"]').count()) >= 1);

  // settings: switch persists, password validation, export
  await go('/settings');
  const sw = page.locator('[data-switch="deals"]'); const before = await sw.getAttribute('aria-checked');
  await sw.click(); await page.waitForTimeout(1200); await page.reload({ waitUntil: 'networkidle' });
  ok('settings: switch persists', (await page.locator('[data-switch="deals"]').getAttribute('aria-checked')) !== before);
  ok('settings: alerts locked', (await page.locator('[data-switch="alerts"]').isDisabled()));
  await page.locator('[data-modal-open="pw-dlg"]').click();
  await page.fill('#pw-c', 'wrong-one'); await page.fill('#pw-n', 'travel2027'); await page.fill('#pw-r', 'travel2027');
  await page.locator('#pw-dlg button.btn-primary').click(); await page.waitForTimeout(1200);
  ok('settings: wrong current password', (await page.locator('#pw-dlg [data-err], #pw-dlg .field-error').count()) >= 1, (await page.locator('#pw-dlg .field-error').first().textContent().catch(() => ''))?.trim());
  await page.locator('#pw-dlg [aria-label="Close"]').click();
  const [dl] = await Promise.all([page.waitForEvent('download', { timeout: 10000 }).catch(() => null), page.locator('[data-export]').click()]);
  const j = dl ? JSON.parse(fs.readFileSync(await dl.path(), 'utf8')) : {};
  ok('settings: data export', !!j.profile && Array.isArray(j.bookings), dl?.suggestedFilename() ?? 'no download');

  // travellers: add then delete
  await go('/travellers');
  const n0 = await page.locator('[data-traveller]').count();
  await page.locator('[data-modal-open="add-trav"]').click();
  await page.fill('#new-g', 'Ayaan'); await page.fill('#new-s', 'Rahman'); await page.fill('#new-d', '2016-05-02');
  await page.selectOption('#new-r', 'Child').catch(() => {}); await page.fill('#new-p', 'B1234567'); await page.fill('#new-e', '2030-01-01');
  await page.locator('#add-trav button.btn-primary').click(); await page.waitForTimeout(1800);
  const n1 = await page.locator('[data-traveller]').count();
  ok('travellers: add', n1 === n0 + 1, `${n0}→${n1}`);
  ok('travellers: passport masked', !(await page.content()).includes('B1234567'));
  await page.getByRole('button', { name: 'Remove Ayaan Rahman' }).click(); await page.waitForTimeout(1500);
  ok('travellers: delete', (await page.locator('[data-traveller]').count()) === n0);

  // support: new request, reply with file
  await go('/support');
  await page.locator('[data-modal-open="new-tkt"]').click();
  await page.selectOption('#nt-t', 'special'); await page.fill('#nt-m', 'Could we get a sea-view room for the anniversary night?');
  await page.locator('#new-tkt button.btn-primary').click(); await page.waitForTimeout(1800);
  const openSubj = await page.locator('#ch-h').textContent();
  ok('support: new request opens', /Special request/.test(openSubj ?? ''), openSubj?.trim());
  fs.writeFileSync('/tmp/slip.pdf', '%PDF-1.4\n1 0 obj<<>>endobj\ntrailer<<>>\n%%EOF');
  await page.locator('#chat textarea').fill('Attaching our marriage certificate.');
  await page.setInputFiles('#chat input[type=file]', '/tmp/slip.pdf');
  await page.locator('#chat form button[type=submit], #chat form button.btn-primary').last().click(); await page.waitForTimeout(2000);
  ok('support: reply + attachment', (await page.locator('#chat [data-attachment]').count()) >= 1 && /marriage certificate/.test(await page.locator('#chat').textContent()));
  const href = await page.locator('#chat [data-attachment]').last().getAttribute('href');
  const fr = await ctx.request.get(BASE + href); ok('support: attachment download', fr.status() === 200, `${fr.status()}`);

  // reviews: submit the pending Bali review
  await go('/reviews');
  await page.locator('label[for="rv0-r4"]').click();
  await page.fill('#rv0-body', 'Ubud villas were lovely and our guide knew every rice terrace by name.');
  await page.getByRole('button', { name: 'Publish review' }).click(); await page.waitForTimeout(1800);
  ok('reviews: submitted to moderation', (await page.locator('[data-review="review"]').count()) === 1);

  // wallet: invalid gift code, top-up → simulator → back
  await go('/wallet');
  await page.locator('[data-modal-open="redeem"]').click().catch(() => page.getByRole('button', { name: /Redeem/ }).first().click());
  await page.locator('dialog[open] input').first().fill('GC-NOPE'); await page.locator('dialog[open] button.btn-primary').click(); await page.waitForTimeout(1200);
  ok('wallet: bad gift code error', (await page.locator('dialog[open] .field-error, dialog[open] [data-err]').count()) >= 1);
  await page.keyboard.press('Escape');
  await page.locator('[data-modal-open="topup"]').click().catch(() => page.getByRole('button', { name: /Top up|Add money/ }).first().click());
  await page.locator('dialog[open] input[type=number], dialog[open] input[name=amount]').first().fill('2000');
  await page.locator('dialog[open] input[value="mock"], dialog[open] input[value="bkash"]').first().check({ force: true }).catch(() => {});
  await Promise.all([page.waitForURL(/pay\/mock/, { timeout: 15000 }).catch(() => {}), page.locator('dialog[open] button.btn-primary').click()]);
  if (page.url().includes('/pay/mock')) {
    await Promise.all([page.waitForURL(/account\/wallet/, { timeout: 15000 }), page.click('button[value="success"]')]);
    await page.waitForTimeout(1500);
    ok('wallet: top-up credited', /8,800|৳\s*8,800/.test(await page.locator('main').textContent()), page.url().replace(BASE, ''));
  } else ok('wallet: top-up redirect', false, page.url());

  // payments: pay the due instalment through the simulator
  await go('/payments');
  const pay = page.locator('form[data-pay-due]').first();
  await pay.locator('input[value="bkash"]').check({ force: true }).catch(() => {});
  await Promise.all([page.waitForURL(/pay\/mock/, { timeout: 15000 }).catch(() => {}), pay.locator('button').last().click()]);
  if (page.url().includes('/pay/mock')) {
    await Promise.all([page.waitForURL(/booking|account/, { timeout: 15000 }), page.click('button[value="success"]')]);
    ok('payments: instalment paid', /booking-confirmed|account/.test(page.url()), page.url().replace(BASE, ''));
  } else ok('payments: pay redirect', false, page.url());

  // trips: remove a wishlist item
  await go('/trips');
  const w0 = await page.locator('[data-wish-item]').count();
  await page.locator('[data-wish-item] button').first().click(); await page.waitForTimeout(1500);
  ok('trips: wishlist remove', (await page.locator('[data-wish-item]').count()) === w0 - 1, `${w0}`);

  // two-step sign-in: on → sign out → password → SMS code → in; then off
  await go('/settings');
  await page.locator('[data-switch="two_factor"]').click(); await page.waitForTimeout(1500);
  const on2 = await page.locator('[data-switch="two_factor"]').getAttribute('aria-checked');
  await page.locator('[data-sign-out]:visible').first().click(); await page.waitForURL((u) => !new URL(u).pathname.includes('/account'), { timeout: 15000 }).catch(() => {});
  console.log('2fa switch', on2, 'after sign-out', page.url());
  await signIn(page).catch(() => {});
  await page.locator('[data-two-step]').waitFor({ timeout: 8000 }).catch(() => {});
  const code = await page.locator('[data-dev-code]').getAttribute('data-dev-code').catch(() => null);
  ok('two-step: code step shown', !!code, `${code ?? ''} ${page.url()}`);
  if (code) {
    await page.locator('[data-two-step] input').first().focus();
    await page.keyboard.type(code);
    await page.locator('[data-two-step] button.btn-primary').click();
    await page.waitForURL((u) => new URL(u).pathname === '/en/account', { timeout: 60000 }).catch(() => {});
    ok('two-step: signed in with code', new URL(page.url()).pathname === '/en/account');
    await go('/settings'); await page.locator('[data-switch="two_factor"]').click(); await page.waitForTimeout(1000);
  }
  // legacy URLs
  await page.goto(`${BASE}/en/account/e-ticket`, { waitUntil: 'domcontentloaded' });
  ok('legacy /account/e-ticket', /bookings\/MSF-26-48377\/ticket/.test(page.url()), page.url());
  ok('writes: no JS errors', errors.length === 0, errors.slice(0, 3).join(' | '));
  await ctx.close();
}

await run('en', 1440, false);
await run('bn', 390, false);
await run('en', 390, true);
await writes();
await browser.close();
const fail = out.filter((o) => !o.pass);
console.log(`\n${out.length - fail.length}/${out.length} checks passed`);
fs.writeFileSync('/tmp/portal_e2e.json', JSON.stringify(out, null, 1));
process.exit(fail.length ? 1 : 0);
