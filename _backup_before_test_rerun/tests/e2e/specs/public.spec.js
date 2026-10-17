const { test, expect, audit, checkLinks, login, uniq } = require('./helpers');

test.describe('Public site & portals', () => {
  test('public pages + language switch incl. Arabic RTL', async ({ page }, info) => {
    await page.goto('/');
    await expect(page.locator('html')).toHaveAttribute('dir', 'ltr');
    await audit(page, 'home-en', info);
    for (const [p, n] of [['/hajj', 'hajj'], ['/umrah', 'umrah'], ['/tours', 'tours'], ['/flights', 'flights'], ['/hotels', 'hotels'], ['/visa', 'visa'], ['/faq', 'faq'], ['/contact', 'contact']]) {
      const r = await page.goto(p); expect(r.status(), p).toBe(200); await audit(page, `pub-${n}`, info);
    }
    await page.goto('/');
    const sw = page.locator('.langsw a[hreflang="bn"]').first();
    if (!(await sw.isVisible())) await page.locator('.burger, .menu-btn, [data-menu]').first().click().catch(() => {});
    await Promise.all([page.waitForNavigation(), page.locator('.langsw a[hreflang="bn"]').first().click({ force: true })]);
    await expect(page.locator('html')).toHaveAttribute('lang', 'bn');
    await audit(page, 'home-bn', info);
    await Promise.all([page.waitForNavigation(), page.locator('.langsw a[hreflang="ar"]').first().click({ force: true })]);
    await expect(page.locator('html')).toHaveAttribute('dir', 'rtl');
    await audit(page, 'home-ar', info);
    await page.goto('/hajj');
    await expect(page.locator('html')).toHaveAttribute('dir', 'rtl');
    await audit(page, 'hajj-ar', info);
    await Promise.all([page.waitForNavigation(), page.locator('.langsw a[hreflang="en"]').first().click({ force: true })]);
    await expect(page.locator('html')).toHaveAttribute('dir', 'ltr');
    await checkLinks(page);
  });

  test('pre-registration form', async ({ page }, info) => {
    const u = uniq(info);
    await page.goto('/pre-registration');
    await page.fill('#pr-name', `E2E Applicant ${u}`);
    await page.fill('#pr-nid', `199012345678${u}`);
    await page.fill('#pr-dob', '1965-04-04');
    await page.fill('#pr-phone', `0199000000${u}`);
    await page.selectOption('select[name="district"]', { index: 1 });
    await page.check('input[name="agree"]', { force: true });
    await audit(page, 'prereg-form', info);
    await Promise.all([page.waitForNavigation(), page.locator('form button.btn-gold').click()]);
    await expect(page.locator('body')).toContainText('PR-');
  });

  test('customer: dashboard + frontend booking (pay later)', async ({ page }, info) => {
    await login(page, 'rahim@example.com');
    await page.goto('/dashboard');
    await expect(page.locator('body')).toContainText('BHA-27-00342');
    await audit(page, 'customer-dashboard', info);
    await page.goto('/booking?package=7-days-express-umrah');
    await audit(page, 'booking-step1', info);
    await page.click('[data-next]');
    await page.locator('#trav-list [data-f="full_name"]').first().fill('E2E FRONT PILGRIM');
    await page.locator('#trav-list [data-f="passport_no"]').first().fill('FP1234567');
    await audit(page, 'booking-step2', info);
    await page.click('[data-next]');
    await page.click('[data-next]');
    await page.check('input[name="payment_mode"][value="pay_later"]', { force: true });
    await audit(page, 'booking-step4', info);
    await page.click('[data-next]');
    await page.check('#agree', { force: true });
    await Promise.all([page.waitForNavigation(), page.click('#bk-submit')]);
    await expect(page).toHaveURL(/\/booking\/.+\/done/);
    await audit(page, 'booking-done', info);
    await page.goto('/dashboard');
    await checkLinks(page);
  });

  test('agent portal', async ({ page }, info) => {
    await login(page, 'agent@blessinghajj.com');
    await page.goto('/agent');
    await expect(page.locator('body')).toContainText('AG-0142');
    await audit(page, 'agent-portal', info);
    await checkLinks(page);
  });
});
