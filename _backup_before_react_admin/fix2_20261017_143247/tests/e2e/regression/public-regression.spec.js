// Public & user-facing regression suite: every public page, auth, booking, pre-registration, visa, contact,
// customer dashboard, agent portal, language switching (BN, AR/RTL) and module/language toggles.
// Every page is compared against the baseline recorded before the React admin rewrite.
const { test, expect, rcheck, reseed, checkLinks, login, uniq, setModule, setLanguage } = require('./rhelpers');

const PAGES = [
  ['/', 'home'], ['/about', 'about'], ['/guide', 'guide'], ['/faq', 'faq'], ['/contact', 'contact'],
  ['/hajj', 'hajj'], ['/umrah', 'umrah'], ['/tours', 'tours'],
  ['/packages/vip-hajj-clock-tower', 'pkg-hajj'], ['/packages/vip-umrah-5-haram-view', 'pkg-umrah'], ['/packages/taif-day-trip', 'pkg-ziyarah'],
  ['/flights', 'flights'], ['/flights?from=DAC&to=JED', 'flights-search'], ['/hotels', 'hotels'], ['/hotels?city=makkah', 'hotels-makkah'],
  ['/visa', 'visa'], ['/pre-registration', 'prereg'], ['/blog', 'blog'], ['/blog/hajj-2027-registration-deadlines-and-fees', 'post'],
  ['/gallery', 'gallery'], ['/login', 'login'], ['/no-such-page-xyz', '404', 404],
];


test.beforeAll(() => { reseed(); });

test.describe('Public regression', () => {
  test('R01 every public page (EN) matches baseline', async ({ page }, info) => {
    for (const [p, n, code = 200] of PAGES) {
      const r = await page.goto(p);
      expect(r.status(), p).toBe(code);
      await expect(page.locator('html')).toHaveAttribute('dir', 'ltr');
      await rcheck(page, `en-${n}`, info);
    }
    await checkLinks(page);
  });

  test('R02 Bangla + Arabic (RTL) via language switcher', async ({ page }, info) => {
    for (const [code, dir] of [['bn', 'ltr'], ['ar', 'rtl']]) {
      await page.goto('/');
      await page.locator(`.langsw a[hreflang="${code}"]`).first().evaluate((a) => a.click());
      await page.waitForURL(/.*/); await page.waitForLoadState('load');
      await expect(page.locator('html')).toHaveAttribute('lang', code);
      await expect(page.locator('html')).toHaveAttribute('dir', dir);
      for (const [p, n] of [['/', 'home'], ['/hajj', 'hajj'], ['/packages/vip-hajj-clock-tower', 'pkg-hajj'], ['/pre-registration', 'prereg'], ['/visa', 'visa'], ['/faq', 'faq'], ['/contact', 'contact'], ['/login', 'login']]) {
        expect((await page.goto(p)).status()).toBe(200);
        await expect(page.locator('html')).toHaveAttribute('dir', dir);
        await rcheck(page, `${code}-${n}`, info);
      }
    }
    await page.goto('/lang/en');
    await expect(page.locator('html')).toHaveAttribute('dir', 'ltr');
    await checkLinks(page);
  });

  test('R03 login errors, register, logout, login', async ({ page }, info) => {
    const u = uniq(info);
    await page.goto('/login');
    const pw = page.locator('form[data-pane-id="pw"]');
    await pw.locator('[name=login]').fill('rahim@example.com');
    await pw.locator('[name=password]').fill('wrong-password');
    await Promise.all([page.waitForNavigation(), pw.locator('button').click()]);
    await expect(page).toHaveURL(/\/login/);
    await rcheck(page, 'auth-login-error', info);
    await page.locator('[data-pane="reg"]').click();
    const reg = page.locator('form[data-pane-id="reg"]');
    await reg.locator('[name=name]').fill(`Regression User ${u}`);
    await reg.locator('[name=phone]').fill(`0181234560${u}`);
    await reg.locator('[name=email]').fill(`reg${u}@example.com`);
    await reg.locator('[name=password]').fill('password123');
    await reg.locator('[name=password_confirmation]').fill('password123');
    await Promise.all([page.waitForNavigation(), reg.locator('button').click()]);
    await expect(page).toHaveURL(/\/dashboard/);
    await rcheck(page, 'auth-registered-dashboard', info);
    await page.context().clearCookies();
    await login(page, `reg${u}@example.com`, 'password123');
    await expect(page).toHaveURL(/\/dashboard/);
    // guests are sent to login from protected pages; customers can't open admin/agent
    await page.context().clearCookies();
    await page.goto('/dashboard'); await expect(page).toHaveURL(/\/login/);
    await login(page, 'rahim@example.com');
    expect((await page.request.get('/admin')).status()).toBe(403);
    expect((await page.request.get('/agent')).status()).toBe(403);
  });

  test('R04 contact, visa apply + track, pre-registration', async ({ page }, info) => {
    const u = uniq(info);
    await page.goto('/contact');
    const cf = page.locator('form[action$="/contact"]');
    await cf.locator('[name=name]').fill('Regression Contact');
    await cf.locator('[name=phone]').fill(`0171111111${u}`);
    await cf.locator('[name=message]').fill('Please call me about Hajj 2027.');
    await Promise.all([page.waitForNavigation(), cf.locator('button[type=submit], button').last().click()]);
    await rcheck(page, 'contact-sent', info);

    await page.goto('/visa');
    const vf = page.locator('form[action$="/visa/apply"]');
    await vf.locator('[name=name]').fill('REGRESSION VISA');
    await vf.locator('[name=phone]').fill(`0172222222${u}`);
    await vf.locator('[name=passport]').fill(`RV12345${u}`).catch(() => {});
    await Promise.all([page.waitForNavigation(), vf.locator('button').last().click()]);
    await expect(page.locator('body')).toContainText('VA-');
    const ref = (await page.locator('body').innerText()).match(/VA-\d{2}-[A-Z0-9]{5}/)[0];
    await rcheck(page, 'visa-applied', info);
    await page.goto('/visa/track?ref=' + ref);
    await expect(page.locator('body')).toContainText(ref);

    await page.goto('/pre-registration');
    await page.fill('#pr-name', `Regression Applicant ${u}`);
    await page.fill('#pr-nid', `199012345679${u}`);
    await page.fill('#pr-dob', '1966-05-05');
    await page.fill('#pr-phone', `0198000000${u}`);
    await page.selectOption('select[name="district"]', { index: 1 });
    await page.check('input[name="agree"]', { force: true });
    await Promise.all([page.waitForNavigation(), page.locator('form button.btn-gold').click()]);
    await expect(page.locator('body')).toContainText('PR-');
    await rcheck(page, 'prereg-done', info);
    // validation: empty submit stays on page with errors, no 500
    await page.goto('/pre-registration');
    await page.locator('form[action$="/pre-registration"]').evaluate((f) => { f.noValidate = true; });
    await Promise.all([page.waitForNavigation(), page.locator('form button.btn-gold').click()]);
    await expect(page).toHaveURL(/pre-registration/);
  });

  test('R05 package quote API + booking wizard (bKash full payment, simulated gateway)', async ({ page }, info) => {
    const q = await page.request.get('/packages/vip-umrah-5-haram-view/quote?room_type=quad&adults=2');
    expect(q.status()).toBe(200);
    expect(Object.keys(await q.json()).sort().join(',')).toMatchSnapshot('quote-keys.txt');
    await login(page, 'rahim@example.com');
    await page.goto('/booking?package=7-days-express-umrah');
    await rcheck(page, 'booking-step1', info);
    await page.click('[data-next]');
    await page.locator('#trav-list [data-f="full_name"]').first().fill('REGRESSION PILGRIM');
    await page.locator('#trav-list [data-f="passport_no"]').first().fill('RP1234567');
    await rcheck(page, 'booking-step2', info);
    await page.click('[data-next]');
    await rcheck(page, 'booking-step3', info);
    await page.click('[data-next]');
    await page.check('input[name="payment_mode"][value="full"]', { force: true });
    await page.check('input[name="payment_method"][value="bkash"]', { force: true });
    await rcheck(page, 'booking-step4', info);
    await page.click('[data-next]');
    await page.check('#agree', { force: true });
    await Promise.all([page.waitForNavigation(), page.click('#bk-submit')]);
    await expect(page).toHaveURL(/simulate|done/);
    if (/simulate/.test(page.url())) {
      await rcheck(page, 'payment-simulate', info);
      await Promise.all([page.waitForNavigation(), page.locator('button[value=success]').click()]);
    }
    await expect(page).toHaveURL(/\/booking\/.+\/done/);
    await rcheck(page, 'booking-done-paid', info);
  });

  test('R06 booking wizard pay-later + customer dashboard actions', async ({ page }, info) => {
    await login(page, 'rahim@example.com');
    await page.goto('/booking?package=7-days-express-umrah');
    await page.click('[data-next]');
    await page.locator('#trav-list [data-f="full_name"]').first().fill('REGRESSION LATER');
    await page.click('[data-next]'); await page.click('[data-next]');
    await page.check('input[name="payment_mode"][value="pay_later"]', { force: true });
    await page.click('[data-next]');
    await page.check('#agree', { force: true });
    await Promise.all([page.waitForNavigation(), page.click('#bk-submit')]);
    await expect(page).toHaveURL(/\/booking\/.+\/done/);
    await page.goto('/dashboard');
    await expect(page.locator('body')).toContainText('BHA-27-00342');
    await rcheck(page, 'dashboard', info);
    const tab = async (k) => { await page.locator(`[data-pane="${k}"]`).first().evaluate((a) => a.click()); };
    for (const k of ['bk', 'in', 'dc']) { if (await page.locator(`[data-pane="${k}"]`).count()) { await tab(k); await rcheck(page, `dashboard-tab-${k}`, info); } }
    // profile update
    await tab('pf');
    const pf = page.locator('form[action$="/dashboard/profile"]');
    await pf.locator('[name=district]').fill('Dhaka');
    await Promise.all([page.waitForNavigation(), pf.locator('button').last().click()]);
    await expect(page.locator('body')).toContainText(/saved|updated|হালনাগাদ|সংরক্ষ/i);
    // document upload (first open slot)
    await tab('dc');
    const up = page.locator('form[action*="/dashboard/documents/"] input[type=file]').first();
    if (await up.count()) {
      await up.setInputFiles({ name: 'passport.pdf', mimeType: 'application/pdf', buffer: Buffer.from('%PDF-1.4 regression') });
      const f = page.locator('form[action*="/dashboard/documents/"]').first();
      await Promise.all([page.waitForNavigation(), f.evaluate((x) => x.requestSubmit ? x.requestSubmit() : x.submit())]);
      expect(page.url()).toMatch(/dashboard/);
    }
    // pay an installment / balance through the simulated gateway
    await tab('in');
    const payf = page.locator('form[action*="/dashboard/bookings/"][action$="/pay"]').first();
    if (await payf.count()) {
      await Promise.all([page.waitForNavigation(), payf.evaluate((x) => x.requestSubmit())]);
      expect(page.url()).toMatch(/simulate|dashboard/);
    }
    await page.goto('/dashboard');
    await rcheck(page, 'dashboard-after', info);
    await checkLinks(page);
  });

  test('R07 agent portal: view + book for a client', async ({ page }, info) => {
    const u = uniq(info);
    await login(page, 'agent@blessinghajj.com');
    await page.goto('/agent');
    await expect(page.locator('body')).toContainText('AG-0142');
    await rcheck(page, 'agent', info);
    const bf = page.locator('form#book');
    await bf.locator('[name=name]').fill(`AGENT CLIENT ${u}`);
    await bf.locator('[name=phone]').fill(`0161234567${u}`);
    await bf.locator('[name=passport_no]').fill(`AC12345${u}`).catch(() => {});
    await Promise.all([page.waitForNavigation(), bf.locator('button').last().click()]);
    await expect(page).toHaveURL(/\/agent/);
    await rcheck(page, 'agent-booked', info);
    await checkLinks(page);
  });

  test('R08 module + language toggles hide menus and 404 routes', async ({ page }, info) => {
    try {
      setModule('hajj', false); setModule('blog', false); setModule('visa', false);
      for (const p of ['/hajj', '/blog', '/visa']) expect((await page.request.get(p)).status(), p).toBe(404);
      await page.goto('/');
      for (const p of ['/hajj', '/blog', '/visa']) expect(await page.locator(`header a[href$="${p}"]`).count(), p).toBe(0);
      await rcheck(page, 'modules-off-home', info);
      setLanguage('ar', false);
      await page.goto('/');
      expect(await page.locator('.langsw a[hreflang="ar"]').count()).toBe(0);
      expect([302, 404]).toContain((await page.request.get('/lang/ar', { maxRedirects: 0 })).status()); await page.goto('/?lang=ar');
      await expect(page.locator('html')).toHaveAttribute('dir', 'ltr');
    } finally {
      setModule('hajj', true); setModule('blog', true); setModule('visa', true); setLanguage('ar', true);
    }
    expect((await page.goto('/hajj')).status()).toBe(200);
  });
});
