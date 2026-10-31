# Musafir — local setup (Windows + Laragon)

Three parts run side by side:

| Part | Folder | URL |
|---|---|---|
| API + admin (Laravel 13, PHP 8.3+) | `backend/` | http://127.0.0.1:8000 (admin: http://127.0.0.1:8000/admin from M6) |
| Public website (Next.js 16) | `frontend/` | http://localhost:3000 |
| Database (MySQL 8.4) | Laragon | 127.0.0.1:3306, user `root`, no password |

The approved static mockup stays in `site/` (reference only).

## 1. Prerequisites
- **Laragon** with PHP 8.3 and MySQL 8.4. The PHP extensions `pdo_mysql`, `intl`, `gd`, `zip`, `fileinfo`, `exif`, `mbstring`, `bcmath`, `curl` and `openssl` are all on by default in Laragon.
- **Composer 2** and **Node.js 22+** with npm 10+.
- In Laragon, click **Start All** (or at least MySQL).

## 2. Database
Create the database with utf8mb4. HeidiSQL works, or run this from Laragon's terminal:
```
mysql -uroot -e "CREATE DATABASE IF NOT EXISTS musafir CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci; CREATE DATABASE IF NOT EXISTS musafir_test CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;"
```
`musafir_test` is only used by the automated tests.

## 3. Backend (Laravel)
```
cd backend
copy .env.example .env        (first time only — never overwrite an existing .env)
composer install
php artisan key:generate      (first time only)
php artisan migrate --seed    (or: migrate:fresh --seed to rebuild all demo data, ~20–40 s)
php artisan storage:link
npm ci                        (admin panel assets; first time and after updates)
npm run build                 (builds backend/public/build — without it /admin pages return 500 "Vite manifest not found")
php artisan serve --host=127.0.0.1 --port=8000
```
Run the scheduler too (seat-hold expiry every minute, completing past trips + referral rewards daily) — in a second window:
`php artisan schedule:work`

### PHP upload limits (visa documents up to 10 MB)
PHP's defaults (`upload_max_filesize=2M`, `post_max_size=8M`) reject large visa documents and ticket attachments. In Laragon:
**Menu → PHP → php.ini**, set the following, save, then restart `php artisan serve` (and Laragon's Apache/Nginx if you use a vhost):
```
upload_max_filesize = 12M
post_max_size = 14M
```
Or for a one-off run without editing php.ini:
`php -d upload_max_filesize=12M -d post_max_size=14M artisan serve --host=127.0.0.1 --port=8000`
Check with `php -i | findstr upload_max_filesize`.
Check it works: http://127.0.0.1:8000/api/v1/health should return `{"status":"ok"...}`.

Keep this window open: the website build and the running website both need the API.

> **Windows note:** `php artisan serve` handles one request at a time on Windows, because `PHP_CLI_SERVER_WORKERS` is ignored there.
> It is fine for trying the site. For snappier pages, and for `npm run build`, which fetches every page, a Laragon virtual host is better:
> 1. Point Laragon's document root at `backend\public`, or add a vhost such as `musafir-api.test` there.
> 2. Set `APP_URL=http://musafir-api.test` in `backend/.env`.
> 3. Set `API_URL=http://musafir-api.test` in `frontend/.env.local`.

## 4. Frontend (Next.js)
```
cd frontend
copy .env.example .env.local  (first time only)
npm ci                        (or npm install)
npm run build                 (the API must be running — pages are pre-rendered from it)
npm run start                 (http://localhost:3000)
```
For development with hot reload, use `npm run dev` instead of build + start.

`REVALIDATE_SECRET` must match in `backend/.env` and `frontend/.env.local`. It is used for:
- on-demand page refresh after admin edits
- unthrottled server-side API calls

## 5. Demo logins (password: `password`)
- **Staff:** admin@, sales@, reservations@, visa@, support@, accounts@, content@ — all `@musafir.test`
- **Traveller:** farhana@example.com
- **B2B agent:** agent@example.com

**Traveller portal (M5):** sign in at http://localhost:3000/en/login (Email tab → farhana@example.com / `password`), or with mobile OTP `01712345678`.
OTP codes are written to `backend/storage/logs/laravel.log`; with `OTP_DEBUG=true` (local only) they are also shown on the page.
The portal is at `/en/account` (or `/bn/account`): bookings, e-ticket, visa tracker, trips & wishlist, wallet & Miles, payments, referrals, travellers,
notifications, support chat, reviews, profile and settings (password, two-step sign-in, sessions, data export, delete account).
Payments use the built-in **test gateway** in sandbox mode (pick bKash/Nagad/card → simulator page → Success).

**Admin panel (M6):** http://127.0.0.1:8000/admin — sign in with any staff login above (password `password`).
Each login has a role that limits what it sees:

| Login | Role | Can do |
|---|---|---|
| admin@musafir.test | owner | everything, including roles & permissions and all settings |
| sales@musafir.test | manager | catalogue (tours, cruises, hotels, activities, flights, visas, offers), bookings, customers, reports |
| reservations@musafir.test | agent | bookings desk (status, notes, offline payments), enquiries, customers |
| visa@musafir.test | visa | visa applications and visa products |
| support@musafir.test | support | support tickets, enquiries, review moderation |
| accounts@musafir.test | finance | payments, bank-transfer verification, refunds, payment settings |
| content@musafir.test | editor | pages, home sections, menus, blog, FAQs, media, translations, SEO & redirects |

- English and Bangla are edited side by side on every form. Saving anything that shows on the website refreshes the affected pages at once
  (the admin calls `POST {FRONTEND_URL}/api/revalidate` with the changed cache tags and `expire: 0`), so the change is visible on the next page load.
- Put the admin on its own host by setting `ADMIN_DOMAIN=admin.example.com` (and optionally `ADMIN_PATH=`) in `backend/.env`.
- Every save, delete and status change is recorded under **System → Activity log**.

## 6. Everyday tasks
- **Reset demo data:**
  1. In `backend`, run `php artisan migrate:fresh --seed` and then `php artisan cache:clear`.
  2. Refresh the website cache. Restarting `npm run start` is enough, or:
     ```
     curl -X POST -H "content-type: application/json" -H "x-revalidate-secret: <secret>" -d "{\"tags\":[\"all\"]}" http://localhost:3000/api/revalidate
     ```
- **Run the backend tests:** `cd backend && php artisan test` (needs the `musafir_test` database from step 2; Laragon's client is `C:\laragon\bin\mysql\mysql-8.4.3-winx64\bin\mysql.exe` if `mysql` is not on PATH). This uses the `musafir_test` database; the demo seed runs once per run.
- **Read e-mails, SMS and OTP codes:** they are written to `backend/storage/logs/laravel.log` (`MAIL_MAILER=log`, `SMS_DRIVER=log`).
- **Uploaded CVs, visa documents, ticket attachments:** private, stored under `backend/storage/app/private/` and never publicly reachable (served only to the owner).
- **Browser end-to-end tests** (optional, needs `npm i` in `tooling` and Chrome): with a fresh seed and both servers running,
  `node tooling/tests/checkout_e2e.mjs http://localhost:3000` and `node tooling/tests/portal_e2e.mjs http://localhost:3000`.
  Set `ME_RATE_PER_MIN=2000` in `backend/.env` for the portal run (it clicks faster than any person; default limit 240/min).

## 7. Troubleshooting
| Symptom | Fix |
|---|---|
| `SQLSTATE[HY000] [2002]` | MySQL is not running. Start it in Laragon. |
| Images missing on the site | Run `php artisan storage:link`, and check that `APP_URL` matches the address you use for the API. |
| Website shows old content after a reseed | Run `php artisan cache:clear`, then restart `npm run start` or call `/api/revalidate` as shown above. |
| `npm run build` fails with fetch errors | The API is not reachable at `API_URL`. Start `php artisan serve` first. |
| `/admin` shows a 500 "Vite manifest not found" | Run `npm ci` and `npm run build` inside `backend`. |
| Edited content is not on the page yet | Pages refresh in the background: the first visit after a change can still show the old version, and the next visit (a few seconds later) shows the new one. |
| `php artisan test` says `tests/Unit not found` | Create an empty `backend\tests\Unit` folder (fixed in later deliveries). |
| Visa upload fails with "The file failed to upload" | Raise the PHP upload limits (section 3). |
| Payment return lands on the login page | `FRONTEND_URL` in `backend/.env` must be the address you browse the site on (e.g. http://localhost:3000). |
| Port 3000 or 8000 is busy | Use `php artisan serve --port=8001` and `npm run start -- -p 3001`, then update `API_URL`, `APP_URL`, `FRONTEND_URL` and `NEXT_PUBLIC_SITE_URL`. |
