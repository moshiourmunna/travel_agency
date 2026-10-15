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

## Limitations
- All integrations are stubs. Payments go through a simulated gateway page (no real bKash/SSLCommerz).
- OTP login and social login are not implemented. Email and password only.
- Roles use a `role` column (admin/agent/staff/customer) rather than spatie/permission.
- Translations are stored as JSON columns `{en,bn,ar}` instead of the separate translation tables in docs/database.md.
- Images, prices, licence numbers and people are placeholder data.


You can log in as the admin with [admin@blessinghajj.com](mailto:admin@blessinghajj.com), as a customer with [rahim@example.com](mailto:rahim@example.com), or as an agent with [agent@blessinghajj.com](mailto:agent@blessinghajj.com). The password for all three is password.

Payments and the connections to Nusuk, the Hajj portal and the flight and hotel systems are simulated for now; they'll work once real accounts are added. Login is by email and password only, with no OTP yet.