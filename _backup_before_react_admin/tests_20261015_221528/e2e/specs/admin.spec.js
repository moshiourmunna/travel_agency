const { test, expect, audit, checkLinks, login, adminNav, uniq } = require('./helpers');

test.describe('Admin back-office', () => {
  test('booking lifecycle: filters, create, show, status, payment, edit, delete, restore', async ({ page }, info) => {
    const u = uniq(info);
    await login(page, 'admin@blessinghajj.com');
    await expect(page).toHaveURL(/\/admin/);
    await audit(page, 'admin-dashboard', info);

    // --- index: search + filters ---
    await adminNav(page, '/admin/bookings');
    await audit(page, 'admin-bookings-index', info);
    await page.fill('input[name="q"]', '00342');
    await Promise.all([page.waitForNavigation(), page.click('form.tb button.btn-em')]);
    await expect(page.locator('table.tbl')).toContainText('BHA-27-00342');
    await page.selectOption('select[name="status"]', 'cancelled');
    await Promise.all([page.waitForNavigation(), page.click('form.tb button.btn-em')]);
    await expect(page.locator('table.tbl')).not.toContainText('BHA-27-00342');
    await page.goto('/admin/bookings?payment_status=overdue');
    await expect(page.locator('.chips a.on')).toBeVisible();
    await page.goto('/admin/bookings?package_id=2&payment_mode=installment');
    await audit(page, 'admin-bookings-filtered', info);

    // --- create (new customer, 2 pilgrims, discount, initial payment) ---
    await page.goto('/admin/bookings');
    await Promise.all([page.waitForNavigation(), page.click('a[href$="/admin/bookings/create"]')]);
    await page.check('input[name="customer_mode"][value="new"]');
    await page.fill('input[name="new_name"]', `E2E Customer ${u}`);
    await page.fill('input[name="new_phone"]', `0177000000${u}`);
    await page.selectOption('select[name="package_id"]', '2');
    await expect(page.locator('select[name="room_type"] option')).toHaveCount(4);
    await page.selectOption('select[name="room_type"]', 'triple');
    await page.fill('input[name="travellers[0][full_name]"]', `E2E Pilgrim ${u}`);
    await page.fill('input[name="travellers[0][passport_no]"]', `EE000000${u}`);
    await page.fill('input[name="travellers[0][passport_expiry]"]', '2033-01-01');
    await page.click('#addp');
    const second = page.locator('#plist .trow-p').nth(1);
    await second.locator('input[name$="[full_name]"]').fill(`E2E Wife ${u}`);
    await second.locator('select[name$="[gender]"]').selectOption('female');
    await expect(page.locator('#est')).not.toHaveText('—');
    await page.selectOption('select[name="payment_mode"]', 'full');
    await page.selectOption('select[name="payment_method"]', 'cash');
    await page.fill('input[name="discount"]', '2000');
    await page.fill('input[name="initial_payment"]', '50000');
    await audit(page, 'admin-booking-create', info);
    await Promise.all([page.waitForNavigation(), page.click('#bkform button.btn-gold')]);
    await expect(page.locator('.flash')).toContainText('created');
    const ref = (await page.locator('.dtop h2').innerText()).split(' ').pop();
    expect(ref).toMatch(/^BHA-27-\d{5}$/);
    await expect(page.locator('#pilgrims')).toContainText(`E2E WIFE ${u}`);
    await audit(page, 'admin-booking-show', info);

    // --- status change with history ---
    await page.locator('form[action$="/status"] select[name="status"]').selectOption('docs_pending');
    await page.fill('form[action$="/status"] input[name="note"]', 'E2E status note');
    await Promise.all([page.waitForNavigation(), page.click('form[action$="/status"] button')]);
    await expect(page.locator('#timeline')).toContainText('E2E status note');

    // --- record payment ---
    await page.click('summary:has-text("Record payment")');
    await page.fill('form[action$="/payments"] input[name="amount"]', '10000');
    await page.selectOption('form[action$="/payments"] select[name="method"]', 'bkash');
    await page.fill('form[action$="/payments"] input[name="txn"]', `E2ETX${u}${Date.now()}`);
    await Promise.all([page.waitForNavigation(), page.click('form[action$="/payments"] button.btn-gold')]);
    await expect(page.locator('.flash')).toContainText('recorded');
    await expect(page.locator('#payments')).toContainText('bKash');
    await expect(page.locator('#ledger')).toContainText('10,000');

    // --- document upload + verify ---
    await Promise.all([page.waitForNavigation(), page.locator('.upl input[type=file]').first().setInputFiles({ name: 'passport.pdf', mimeType: 'application/pdf', buffer: Buffer.from('%PDF-1.4\n%e2e\n') })]);
    await expect(page.locator('.flash')).toContainText('uploaded');
    await Promise.all([page.waitForNavigation(), page.locator('.drow button[value="verified"]').first().click()]);
    await expect(page.locator('.drow').first()).toContainText('Verified');

    // --- invoice / voucher ---
    const inv = await page.context().newPage();
    await inv.goto(`/admin/bookings/${ref}/invoice`);
    await expect(inv.locator('h1')).toContainText('Invoice');
    await audit(inv, 'admin-invoice', info);
    await inv.close();

    // --- edit: change room + add a pilgrim ---
    await Promise.all([page.waitForNavigation(), page.click(`a[href$="/admin/bookings/${ref}/edit"]`)]);
    await page.selectOption('select[name="room_type"]', 'double');
    await page.click('#addp');
    await page.locator('#plist .trow-p').last().locator('input[name$="[full_name]"]').fill(`E2E Son ${u}`);
    await audit(page, 'admin-booking-edit', info);
    await Promise.all([page.waitForNavigation(), page.click('#bkform button.btn-gold')]);
    await expect(page.locator('.flash')).toContainText('updated');
    await expect(page.locator('#pilgrims')).toContainText(`E2E SON ${u}`);
    await expect(page.locator('.kv').last()).toContainText(/Double/i);

    // --- delete (confirm) + restore ---
    await page.click('details.pop > summary:has-text("Delete")');
    await page.fill('details.pop[open] input[name="reason"]', 'E2E delete');
    await page.check('details.pop[open] input[name="confirm"]');
    await Promise.all([page.waitForNavigation(), page.click('details.pop[open] button.btn-red')]);
    await expect(page).toHaveURL(/\/admin\/bookings$/);
    await expect(page.locator('.flash')).toContainText('trash');
    await page.click('.chips a:has-text("Trash")');
    await expect(page.locator('table.tbl')).toContainText(ref);
    await audit(page, 'admin-bookings-trash', info);
    await Promise.all([page.waitForNavigation(), page.locator('tr', { hasText: ref }).locator('button:has-text("Restore")').click()]);
    await expect(page.locator('.flash')).toContainText('restored');
    await checkLinks(page);
  });

  test('customers, pilgrims, payments, pre-registration conversion, commissions, audit', async ({ page }, info) => {
    const u = uniq(info);
    await login(page, 'admin@blessinghajj.com');
    for (const [href, name] of [['/admin/customers', 'admin-customers'], ['/admin/pilgrims', 'admin-pilgrims'], ['/admin/payments', 'admin-payments'], ['/admin/pre-registrations', 'admin-preregs'], ['/admin/commissions', 'admin-commissions'], ['/admin/audit-log', 'admin-audit']]) {
      await adminNav(page, href);
      await expect(page.locator('.dtop h2')).toBeVisible();
      await audit(page, name, info);
    }
    // customer create → show → edit
    await page.goto('/admin/customers/create');
    await page.fill('input[name="name"]', `E2E Walkin ${u}`);
    await page.fill('input[name="phone"]', `0188000000${u}`);
    await page.fill('input[name="district"]', 'Comilla');
    await Promise.all([page.waitForNavigation(), page.click('form button.btn-gold')]);
    await expect(page.locator('.dtop h2')).toHaveText(`E2E Walkin ${u}`);
    await audit(page, 'admin-customer-show', info);
    await page.goto(`/admin/customers?q=Walkin ${u}`);
    await expect(page.locator('table.tbl')).toContainText(`E2E Walkin ${u}`);
    // pilgrim filter + edit
    await page.goto('/admin/pilgrims?passport=expiring');
    await audit(page, 'admin-pilgrims-expiring', info);
    await page.goto('/admin/pilgrims');
    await page.locator('table.tbl a.btn-out').first().click();
    await page.waitForURL(/\/edit$/);
    await page.selectOption('select[name="blood_group"]', 'A+');
    await Promise.all([page.waitForNavigation(), page.click('form button.btn-gold')]);
    await expect(page.locator('.flash')).toContainText('updated');
    // pre-registration → booking
    await page.goto('/admin/pre-registrations?status=received');
    const row = page.locator('table.tbl tr', { has: page.locator('button:has-text("Booking")') }).first();
    await Promise.all([page.waitForNavigation(), row.locator('button').click()]);
    await expect(page).toHaveURL(/bookings\/create\?customer=\d+&prereg=\d+/);
    await expect(page.locator('.warn')).toContainText('PR-');
    await page.selectOption('select[name="package_id"]', '1');
    await page.selectOption('select[name="payment_mode"]', 'pay_later');
    await Promise.all([page.waitForNavigation(), page.click('#bkform button.btn-gold')]);
    await expect(page.locator('.flash')).toContainText('created');
    await expect(page.locator('.kv').last()).toContainText('PR-');
    // commissions statement
    await page.goto('/admin/commissions');
    await Promise.all([page.waitForNavigation(), page.locator('a:has-text("Statement")').first().click()]);
    await audit(page, 'admin-agent-statement', info);
    await checkLinks(page);
  });

  test('module toggles hide menus and routes, then restore', async ({ page }, info) => {
    await login(page, 'admin@blessinghajj.com');
    await page.goto('/admin/settings');
    for (const m of ['hotels', 'preregistration']) await page.locator(`input[type=checkbox][name="modules[${m}]"]`).evaluate((el) => { el.checked = false; });
    await Promise.all([page.waitForNavigation(), page.click('button:has-text("Save settings")')]);
    await expect(page.locator(`.dside a[href$="/admin/pre-registrations"]`)).toHaveCount(0);
    expect((await page.request.get('/admin/pre-registrations')).status()).toBe(404);
    await page.goto('/');
    await expect(page.locator('header a[href$="/hotels"], nav a[href$="/hotels"]')).toHaveCount(0);
    expect((await page.request.get('/hotels')).status()).toBe(404);
    expect((await page.request.get('/pre-registration')).status()).toBe(404);
    await audit(page, 'home-modules-off', info);
    await page.goto('/admin/settings');
    for (const m of ['hotels', 'preregistration']) await page.locator(`input[type=checkbox][name="modules[${m}]"]`).evaluate((el) => { el.checked = true; });
    await Promise.all([page.waitForNavigation(), page.click('button:has-text("Save settings")')]);
    expect((await page.request.get('/hotels')).status()).toBe(200);
    await expect(page.locator(`.dside a[href$="/admin/pre-registrations"]`)).toHaveCount(1);
  });

  test('admin UI in Bangla and Arabic (RTL)', async ({ page }, info) => {
    await login(page, 'admin@blessinghajj.com');
    await page.goto('/admin/bookings?lang=bn');
    await expect(page.locator('html')).toHaveAttribute('lang', 'bn');
    await expect(page.locator('.dtop h2')).toHaveText('বুকিং');
    await audit(page, 'admin-bookings-bn', info);
    await page.goto('/admin/bookings/BHA-27-00342?lang=ar');
    await expect(page.locator('html')).toHaveAttribute('dir', 'rtl');
    await expect(page.locator('.dtop h2')).toContainText('الحجز');
    await audit(page, 'admin-booking-show-ar', info);
    await page.goto('/admin?lang=en');
  });
});
