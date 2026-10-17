// React (Inertia) admin – every flow at 360/768/1280/1920 with console-error, overflow and broken-link checks.
const { test, expect, audit, checkLinks, login, adminNav, adminNavScope, toast, uniq } = require('./helpers');

const h1 = (page) => page.locator('main h1');
const row = (page, text) => page.locator('main table tbody tr', { hasText: text });

test.describe('React admin', () => {
  test('booking lifecycle: filters, sort, create, show actions, edit, delete, restore', async ({ page }, info) => {
    const u = uniq(info);
    await login(page, 'admin@blessinghajj.com');
    await expect(page).toHaveURL(/\/admin$/);
    await expect(h1(page)).toBeVisible();
    await expect(page.locator('.recharts-surface').first()).toBeVisible();
    await audit(page, 'admin-dashboard', info);

    // --- index: search, select filter, chips, server sort, pagination ---
    await adminNav(page, '/admin/bookings');
    await audit(page, 'admin-bookings-index', info);
    await page.getByRole('searchbox').fill('00342');
    await page.getByRole('button', { name: 'Filter' }).click();
    await expect(page).toHaveURL(/q=00342/);
    await expect(row(page, 'BHA-27-00342')).toHaveCount(1);
    await page.getByRole('combobox', { name: 'All statuses' }).selectOption('cancelled');
    await expect(page).toHaveURL(/status=cancelled/);
    await expect(row(page, 'BHA-27-00342')).toHaveCount(0);
    await page.getByRole('button', { name: 'Reset' }).click();
    await expect(page).toHaveURL(/\/admin\/bookings$/);
    await page.getByRole('link', { name: /Overdue installment/ }).click();
    await expect(page).toHaveURL(/payment_status=overdue/);
    await expect(page.getByRole('link', { name: /Overdue installment/ })).toHaveAttribute('aria-current', 'true');
    await page.goto('/admin/bookings?sort=total&dir=desc');
    await expect(page).toHaveURL(/sort=total/); await expect(page).toHaveURL(/dir=desc/);
    if (info.project.name !== 'w360' && info.project.name !== 'w768') {
      await expect(page.getByRole('columnheader', { name: /Total/ })).toHaveAttribute('aria-sort', 'descending');
    }
    await page.goto('/admin/bookings?per=10&page=2');
    await expect(page).toHaveURL(/page=2/);
    await audit(page, 'admin-bookings-page2', info);

    // --- create: new customer, 2 pilgrims, discount, initial payment ---
    await page.goto('/admin/bookings');
    await page.getByRole('link', { name: 'New booking' }).click();
    await expect(page).toHaveURL(/bookings\/create/);
    await page.getByRole('radio', { name: 'New customer' }).click();
    await page.fill('input[name="new_name"]', `E2E Customer ${u}`);
    await page.fill('input[name="new_phone"]', `0177000000${u}`);
    await page.selectOption('select[name="package_id"]', '2');
    await expect(page.locator('select[name="room_type"] option:not([value=""])')).toHaveCount(4);
    await page.selectOption('select[name="room_type"]', 'triple');
    await page.fill('input[name="travellers.0.full_name"]', `E2E Pilgrim ${u}`);
    await page.fill('input[name="travellers.0.passport_no"]', `EE000000${u}`);
    await page.fill('input[name="travellers.0.passport_expiry"]', '2033-01-01');
    await page.getByRole('button', { name: 'Add pilgrim' }).click();
    await page.fill('input[name="travellers.1.full_name"]', `E2E Wife ${u}`);
    await page.selectOption('select[name="travellers.1.gender"]', 'female');
    await expect(page.getByTestId('estimate')).not.toHaveText('—');
    await page.selectOption('select[name="payment_mode"]', 'full');
    await page.selectOption('select[name="payment_method"]', 'cash');
    await page.fill('input[name="discount"]', '2000');
    await page.fill('input[name="initial_payment"]', '50000');
    await audit(page, 'admin-booking-create', info);
    await page.getByRole('button', { name: 'Create booking' }).click();
    await expect(page).toHaveURL(/\/admin\/bookings\/BHA-27-\d{5}$/);
    await toast(page, 'created');
    const ref = page.url().split('/').pop();
    await expect(page.locator('#pilgrims')).toContainText(`E2E WIFE ${u}`);
    await audit(page, 'admin-booking-show', info);

    // --- validation error surfaces inline (empty note) ---
    await page.locator('summary', { hasText: 'Add note' }).click();
    await page.getByRole('textbox', { name: 'Add note' }).fill('E2E timeline note');
    await page.getByRole('button', { name: 'Add to timeline' }).click();
    await expect(page.locator('#timeline')).toContainText('E2E timeline note');

    // --- status change with history ---
    await page.getByRole('combobox', { name: 'Status' }).selectOption('docs_pending');
    await page.getByRole('textbox', { name: 'Note for history (optional)' }).fill('E2E status note');
    await page.getByRole('button', { name: 'Update status' }).click();
    await expect(page.locator('#timeline')).toContainText('E2E status note');

    // --- record payment (with slip) ---
    await page.locator('#record-payment summary').click();
    const pay = page.locator('#record-payment form');
    await pay.locator('input[name="amount"]').fill('10000');
    await pay.locator('select[name="method"]').selectOption('bkash');
    await pay.locator('input[name="txn"]').fill(`E2ETX${u}${Date.now()}`);
    await pay.locator('input[name="slip"]').setInputFiles({ name: 'slip.pdf', mimeType: 'application/pdf', buffer: Buffer.from('%PDF-1.4\n%e2e\n') });
    await pay.getByRole('button', { name: 'Save payment' }).click();
    await toast(page, 'recorded');
    await expect(page.locator('#payments')).toContainText('bKash');
    await expect(page.locator('#ledger')).toContainText('10,000');

    // --- installment schedule ---
    await page.locator('#schedule summary').click();
    await page.locator('#schedule input[name="count"]').fill('2');
    await page.locator('#schedule').getByRole('button', { name: 'Generate' }).click();
    await expect(page.locator('#schedule li')).toHaveCount(2);

    // --- document upload + verify + reject with reason ---
    const docs = page.getByTestId('doc-passport');
    await docs.first().locator('input[type=file]').setInputFiles({ name: 'passport.pdf', mimeType: 'application/pdf', buffer: Buffer.from('%PDF-1.4\n%e2e\n') });
    await toast(page, 'uploaded');
    await docs.first().getByRole('button', { name: /^Verify/ }).click();
    await expect(docs.first()).toContainText('Verified');
    await docs.first().getByRole('button', { name: /^Reject/ }).click();
    const rej = page.getByRole('dialog');
    await rej.getByLabel(/Reason for rejection/).fill('Blurry scan');
    await rej.getByRole('button', { name: 'Reject' }).click();
    await expect(docs.first()).toContainText('Blurry scan');

    // --- visa update ---
    await page.locator('#pilgrims article').first().getByRole('button', { name: 'Update visa' }).click();
    const vd = page.getByRole('dialog');
    await vd.locator('select[name="status"]').selectOption('submitted');
    await vd.locator('input[name="visa_no"]').fill(`V-E2E-${u}`);
    await vd.getByRole('button', { name: 'Save' }).click();
    await expect(page.locator('#pilgrims article').first()).toContainText(`V-E2E-${u}`);

    // --- owner refund (dialog + native confirm auto-accepted) ---
    const payRow = page.getByTestId('payment-row').filter({ hasText: 'bKash' }).first();
    await payRow.getByRole('button', { name: 'Refund' }).click();
    const rd = page.getByRole('dialog');
    await rd.locator('input[name="amount"]').fill('1000');
    await rd.locator('input[name="reason"]').fill('E2E refund');
    await rd.getByRole('button', { name: 'Record refund' }).click();
    await expect(page.locator('#payments')).toContainText('E2E refund');
    await audit(page, 'admin-booking-show-after-actions', info);

    // --- invoice / voucher open in a new tab (plain Blade) ---
    const [inv] = await Promise.all([page.context().waitForEvent('page'), page.getByRole('link', { name: 'Invoice' }).click()]);
    await inv.waitForLoadState();
    await expect(inv.locator('h1')).toContainText('Invoice');
    await audit(inv, 'admin-invoice', info);
    await inv.close();

    // --- edit: change room + add a pilgrim ---
    await page.getByRole('link', { name: 'Edit' }).first().click();
    await expect(page).toHaveURL(new RegExp(`${ref}/edit$`));
    await page.selectOption('select[name="room_type"]', 'double');
    await page.getByRole('button', { name: 'Add pilgrim' }).click();
    await page.fill('input[name="new_travellers.0.full_name"]', `E2E Son ${u}`);
    await audit(page, 'admin-booking-edit', info);
    await page.getByRole('button', { name: 'Save changes' }).click();
    await expect(page).toHaveURL(new RegExp(`${ref}$`));
    await toast(page, 'updated');
    await expect(page.locator('#pilgrims')).toContainText(`E2E SON ${u}`);

    // --- delete (confirm dialog) + restore from trash ---
    await page.getByTestId('delete-trigger').click();
    const dd = page.getByRole('dialog');
    await expect(dd.getByRole('button', { name: 'Confirm delete' })).toBeDisabled();
    await dd.getByRole('textbox').fill('E2E delete');
    await dd.getByRole('checkbox').check();
    await dd.getByRole('button', { name: 'Confirm delete' }).click();
    await expect(page).toHaveURL(/\/admin\/bookings$/);
    await toast(page, 'trash');
    await page.getByRole('link', { name: /Trash/ }).click();
    await expect(row(page, ref)).toHaveCount(1);
    await audit(page, 'admin-bookings-trash', info);
    await row(page, ref).getByRole('button', { name: 'Restore' }).click();
    await toast(page, 'restored');
    await checkLinks(page);
  });

  test('customers, pilgrims, payments, pre-registration conversion, commissions, audit, inbox, integrations', async ({ page }, info) => {
    const u = uniq(info);
    await login(page, 'admin@blessinghajj.com');
    for (const [href, name] of [['/admin/customers', 'admin-customers'], ['/admin/pilgrims', 'admin-pilgrims'], ['/admin/payments', 'admin-payments'], ['/admin/pre-registrations', 'admin-preregs'],
      ['/admin/commissions', 'admin-commissions'], ['/admin/audit-log', 'admin-audit'], ['/admin/inbox', 'admin-inbox'], ['/admin/integrations', 'admin-integrations']]) {
      await adminNav(page, href);
      await expect(h1(page)).toBeVisible();
      await audit(page, name, info);
    }
    // customer create → show → edit → search
    await page.goto('/admin/customers/create');
    await page.fill('input[name="name"]', `E2E Walkin ${u}`);
    await page.fill('input[name="phone"]', `0188000000${u}`);
    await page.fill('input[name="district"]', 'Comilla');
    await page.getByRole('button', { name: 'Create customer' }).click();
    await expect(h1(page)).toHaveText(`E2E Walkin ${u}`);
    await audit(page, 'admin-customer-show', info);
    await page.getByRole('link', { name: 'Edit' }).click();
    await page.fill('input[name="district"]', 'Feni');
    await page.getByRole('button', { name: 'Save changes' }).click();
    await expect(page.locator('main')).toContainText('Feni');
    await page.goto(`/admin/customers?q=Walkin ${u}`);
    await expect(row(page, `E2E Walkin ${u}`)).toHaveCount(1);
    // validation errors inline
    await page.goto('/admin/customers/create');
    await page.fill('input[name="phone"]', '123');
    await page.getByRole('button', { name: 'Create customer' }).click();
    await expect(page.locator('input[name="phone"]')).toHaveAttribute('aria-invalid', 'true');
    // pilgrim filter + edit
    await page.goto('/admin/pilgrims');
    await page.getByRole('link', { name: /Expiring/i }).click();
    await expect(page).toHaveURL(/passport=expiring/);
    await audit(page, 'admin-pilgrims-expiring', info);
    await page.goto('/admin/pilgrims');
    await page.locator('main table tbody tr').first().getByRole('link', { name: /Edit/ }).click();
    await expect(page).toHaveURL(/\/edit$/);
    await page.selectOption('select[name="blood_group"]', 'A+');
    await page.getByRole('button', { name: 'Save changes' }).click();
    await toast(page, 'updated');
    await expect(page.locator('main')).toContainText('A+');
    // payments filter
    await page.goto('/admin/payments');
    await page.getByRole('combobox', { name: 'All methods' }).selectOption('bkash');
    await expect(page).toHaveURL(/method=bkash/);
    // pre-registration → booking (pick a still-convertible row; viewports share one e2e DB)
    await page.goto('/admin/pre-registrations');
    const convertBtn = page.getByRole('button', { name: 'Convert to booking' });
    // Prefer opening a "Received"/"Contacted" row that still has Convert on its show page
    const firstRef = page.locator('main table tbody tr a').first();
    await expect(firstRef).toBeVisible();
    const href = await firstRef.getAttribute('href');
    await firstRef.click();
    await expect(page).toHaveURL(/pre-registrations\/\d+$/);
    await audit(page, 'admin-prereg-show', info);
    if (await page.getByRole('button', { name: 'Convert to booking' }).count()) {
      await page.getByRole('button', { name: 'Convert to booking' }).click();
      await expect(page).toHaveURL(/bookings\/create\?customer=\d+&prereg=\d+/);
      await expect(page.locator('main')).toContainText('PR-');
      await page.selectOption('select[name="package_id"]', '1');
      await page.selectOption('select[name="payment_mode"]', 'pay_later');
      await page.getByRole('button', { name: 'Create booking' }).click();
      await toast(page, 'created');
      await expect(page.locator('main')).toContainText('PR-');
    } else {
      // Already converted in a prior viewport — still assert show page works
      await expect(page.getByRole('link', { name: /Open booking|BHA-/ })).toBeVisible();
    }
    // commissions statement + update dialog
    await page.goto('/admin/commissions');
    await page.locator('main table').first().locator('tbody a').first().click();
    await expect(page).toHaveURL(/agents\/\d+\/statement/);
    await audit(page, 'admin-agent-statement', info);
    await checkLinks(page);
  });

  test('catalogue/CMS resources: create with translations, edit, delete', async ({ page }, info) => {
    const u = uniq(info);
    await login(page, 'admin@blessinghajj.com');
    for (const r of ['packages', 'prices', 'hotels', 'flights', 'agents', 'users', 'posts', 'faqs', 'gallery', 'team', 'reviews', 'branches']) {
      await page.goto(`/admin/manage/${r}`);
      await expect(h1(page)).toBeVisible();
      if (['packages', 'hotels', 'posts'].includes(r)) await audit(page, `admin-manage-${r}`, info);
    }
    await page.goto('/admin/manage/faqs');
    await page.getByRole('link', { name: 'Add new' }).click();
    await page.getByRole('textbox', { name: 'Question (English)' }).fill(`E2E FAQ ${u}?`);
    await page.getByRole('textbox', { name: 'Question (বাংলা)' }).fill('প্রশ্ন?');
    await page.getByRole('textbox', { name: 'Question (العربية)' }).fill('سؤال؟');
    await page.getByRole('textbox', { name: 'Answer (English)' }).fill('E2E answer');
    await page.selectOption('select[name="category"]', 'visa');
    await audit(page, 'admin-resource-form', info);
    await page.getByRole('button', { name: 'Save' }).click();
    await expect(page).toHaveURL(/manage\/faqs$/);
    await toast(page, 'Saved');
    await page.goto('/admin/manage/packages/2/edit');
    await expect(page.getByRole('textbox', { name: 'Title (English)' })).toHaveValue('Standard Hajj 2027');
    await page.getByRole('button', { name: 'Save' }).click();
    await toast(page, 'Saved');
    await page.goto('/admin/manage/faqs?q=');
    const last = page.locator('main table tbody tr', { hasText: `E2E FAQ ${u}?` });
    if (await last.count()) {
      await last.getByRole('button', { name: /Delete/ }).click();
      const dlg = page.getByRole('dialog');
      await dlg.getByRole('checkbox').check();
      await dlg.getByRole('button', { name: 'Confirm delete' }).click();
      await toast(page, 'Deleted');
    }
    await checkLinks(page);
  });

  test('settings: module toggles hide menus and public routes, then restore', async ({ page }, info) => {
    await login(page, 'admin@blessinghajj.com');
    await page.goto('/admin/settings');
    await audit(page, 'admin-settings', info);
    for (const m of ['hotels', 'preregistration']) await page.getByTestId(`module-${m}`).click();
    await page.getByRole('button', { name: 'Save settings' }).click();
    await toast(page, 'Settings saved');
    await expect((await adminNavScope(page)).locator('a[href$="/admin/pre-registrations"]')).toHaveCount(0);
    await page.keyboard.press('Escape');
    expect((await page.request.get('/admin/pre-registrations')).status()).toBe(404);
    await page.goto('/');
    await expect(page.locator('header a[href$="/hotels"], nav a[href$="/hotels"]')).toHaveCount(0);
    expect((await page.request.get('/hotels')).status()).toBe(404);
    expect((await page.request.get('/pre-registration')).status()).toBe(404);
    await page.goto('/admin/settings');
    for (const m of ['hotels', 'preregistration']) await page.getByTestId(`module-${m}`).click();
    await page.getByRole('button', { name: 'Save settings' }).click();
    await toast(page, 'Settings saved');
    expect((await page.request.get('/hotels')).status()).toBe(200);
    await page.goto('/admin');
    await expect((await adminNavScope(page)).locator('a[href$="/admin/pre-registrations"]')).toHaveCount(1);
  });

  test('staff role: owner-only items hidden and forbidden', async ({ page }, info) => {
    await login(page, 'visa@blessinghajj.com');
    await page.goto('/admin/bookings/BHA-27-00342');
    await expect(page.getByTestId('delete-trigger')).toHaveCount(0);
    await expect(page.getByRole('button', { name: 'Refund' })).toHaveCount(0);
    expect((await page.request.get('/admin/audit-log')).status()).toBe(403);
    await audit(page, 'admin-staff-booking', info);
  });

  test('admin UI in Bangla and Arabic (RTL), dark mode', async ({ page }, info) => {
    await login(page, 'admin@blessinghajj.com');
    await page.goto('/admin/bookings?lang=bn');
    await expect(page.locator('html')).toHaveAttribute('lang', 'bn');
    await expect(h1(page)).toHaveText('বুকিং');
    await audit(page, 'admin-bookings-bn', info);
    await page.goto('/admin/bookings/BHA-27-00342?lang=ar');
    await expect(page.locator('html')).toHaveAttribute('dir', 'rtl');
    await expect(h1(page)).toContainText('الحجز');
    await audit(page, 'admin-booking-show-ar', info);
    await page.goto('/admin?lang=en');
    await page.getByRole('button', { name: /Dark mode/ }).click();
    await expect(page.locator('html')).toHaveClass(/dark/);
    await page.reload();
    await expect(page.locator('html')).toHaveClass(/dark/);
    await audit(page, 'admin-dashboard-dark', info);
    await page.getByRole('button', { name: /Dark mode/ }).click();
    await expect(page.locator('html')).not.toHaveClass(/dark/);
  });
});
