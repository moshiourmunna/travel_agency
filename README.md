# Blessing Hajj Agency — Laravel 12

Laravel 12.70 / PHP 8.3 conversion of the Blessing Hajj Agency mockup.

## Features
- Public site in EN, BN and AR, with RTL for Arabic. The switcher shows only the languages enabled in Admin → Settings.
- 12 module toggles in Admin → Settings → Modules. A disabled module's routes return 404 and its menu items are hidden.
- Licence badges (Hajj/Umrah/IATA/etc.) render only when filled in.
- Booking and pre-registration flows with full, installment or pay-later payment modes, plus an installment calculator.
- Customer dashboard (/dashboard), agent portal (/agent) and admin panel (/admin) with CRUD and settings.
- Stub integration drivers for Nusuk, the BD Hajj portal, GDS, hotel suppliers and payment gateways (app/Integrations). Every call is logged to integration_logs.

## Logins (password for all: `password`)
| Role | Email |
|---|---|
| Admin | admin@blessinghajj.com |
| Customer (demo) | rahim@example.com (booking BHA-27-00342) |
| Agent | agent@blessinghajj.com |
| Staff | visa@blessinghajj.com |

## Windows setup — Laragon (recommended)
1. Install Laragon Full (PHP 8.3+). Unzip this folder into `C:\laragon\www\hajj_agency_laravel`.
2. Open the Laragon terminal in that folder:
   ```
   composer install
   copy .env.example .env
   php artisan key:generate
   ```
3. Create a MySQL database named `hajj_agency` (Laragon → Database). In `.env` set:
   `DB_CONNECTION=mysql`, `DB_DATABASE=hajj_agency`, `DB_USERNAME=root`, `DB_PASSWORD=`
4. Run:
   ```
   php artisan migrate --seed
   php artisan storage:link
   ```
5. Visit http://hajj_agency_laravel.test, or run `php artisan serve` and open http://127.0.0.1:8000.

## Windows setup — XAMPP
1. Install XAMPP with PHP 8.3+ and install Composer. Put the folder in `C:\xampp\htdocs\hajj_agency_laravel`.
2. Start Apache and MySQL. Create the `hajj_agency` database in phpMyAdmin (utf8mb4_unicode_ci).
3. Do steps 2–4 above in cmd.
4. Run `php artisan serve` and open http://127.0.0.1:8000. Alternatively, point an Apache vhost at `public/`.

## Quick test without MySQL (SQLite)
Set `DB_CONNECTION=sqlite` and create an empty `database/database.sqlite`. Then run:
```
php artisan migrate --seed
php artisan serve
```
To run the tests: `php artisan test` (31 tests).


## Admin back-office (v2)
- **Bookings:** You can list bookings with search (by ref, customer, phone, email or pilgrim) and filter them by status, package, payment status (unpaid, partly paid, fully paid, overdue), payment plan, type, agent and date range. Lists are paginated and can be exported to CSV.
- **Create a booking:** pick an existing customer or create a new one, then choose the package, room type and pilgrims (passport, NID, mahram relation, blood group, medical notes, wheelchair). Choose a payment plan (full, installment or pay later), plus an extra discount, an agent, notes and an optional payment received now.
- **Booking page:** summary, pilgrims with document upload/verify/reject, visa status (Nusuk submit), payment schedule, payments and refunds, ledger, commission, a timeline/activity log, and a printable invoice and travel voucher.
- **Booking actions:** edit pilgrims, room type and discount (the booking is re-priced), change status with history (cancelling releases seats), record payments (cash/bank/bKash, optional slip), generate or regenerate the installment schedule, assign an agent, and add notes.
- **Delete and restore:** deleting a booking moves it to trash and needs a confirmation. Bookings can be restored from trash.
- **Customers:** full create/view/edit with soft delete and restore, plus CSV export. **Pilgrims:** a register with filters for expiring or missing passports and missing mahram, edit pages, and a manifest CSV.
- **Payments:** filters, overdue installments, recent refunds and CSV export. **Pre-registrations:** status and government tracking number, with **convert to booking**.
- **Commissions:** agent totals, approve / mark paid / void, and an agent statement. **Audit log:** a filterable record of admin changes. The dashboard shows a "Needs attention" panel.
- **Roles:** staff can do everything above **except** deleting/restoring, refunds, commission payout and the audit log, which are admin only.
- **Modules and languages:** the module toggles apply to the admin as well (pre-registration, agents, installments, visa). The admin UI is translated in `lang/bn.json` and `lang/ar.json`, and Arabic is shown RTL.

### Upgrading an existing install
Copy the changed files, then run:
```
php artisan migrate        # adds booking_activities + a few columns; existing data is kept
php artisan optimize:clear
```

## Tests
- `php artisan test`: PHPUnit feature tests (in-memory SQLite, does not touch your DB).
- **Browser tests (Playwright, headless Chrome)**, which cover the 360/768/1280/1920 widths, console errors, horizontal overflow, broken links and screenshots:
  ```
  cd tests/e2e
  npm install
  npx playwright test          # uses installed Chrome; or: npx playwright install chromium
  ```
  These use their own `database/e2e.sqlite` and `.env.e2e`, both created automatically, and serve the app with `php artisan serve --env=e2e --port=8091`. Screenshots go to `tests/e2e/screenshots/<width>/`.

## Limitations
- All integrations are stubs. Payments go through a simulated gateway page (no real bKash/SSLCommerz).
- OTP login and social login are not implemented. Email and password only.
- Roles use a `role` column (admin/agent/staff/customer) rather than spatie/permission.
- Translations are stored as JSON columns `{en,bn,ar}` instead of the separate translation tables in docs/database.md.
- Images, prices, licence numbers and people are placeholder data.

## Admin panel (React + Inertia)

The `/admin` area is a React 19 + Inertia 3 + TypeScript + Vite + Tailwind SPA. Public site, customer dashboard and agent portal remain Blade.

```bash
composer install
npm install
npm run build          # writes public/build (committed; app runs without Node)
# or for local HMR:
npm run dev
```

### Tests

```bash
unset APP_ENV           # important: shell APP_ENV=local breaks CSRF in phpunit
php artisan test        # Feature + Unit (Inertia assertions for admin)
npm test                # Vitest + React Testing Library
cd tests/e2e && npm install && npx playwright test                  # admin + public at 360/768/1280/1920
cd tests/e2e && npx playwright test -c playwright.regression.config.js  # public regression vs baseline
```

Notes:
- PHP tests run on a frozen clock (`Tests\TestCase::FROZEN_NOW`), so date-based snapshots never drift.
- Browser suites only ever touch `database/e2e.sqlite` via `.env.e2e`. `tests/e2e/e2e-env.js` forces `APP_ENV=e2e`,
  refuses to start when `DB_*` variables are set in the OS environment, and verifies the resolved DB before any `migrate:fresh`.
- Each regression test starts from a freshly seeded e2e DB.
- Pixel baselines are Linux-Chrome renders. On Windows/macOS run with `REGRESSION_VISUAL=0`: this skips only the pixel diff,
  while behaviour fingerprints, links, console and overflow checks still run.
- Tailwind scans only `resources/js` and `resources/views/admin` (`source(none)`), so `npm run build` is reproducible and
  never picks up class names from the committed `public/build`.
