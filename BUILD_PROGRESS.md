# Musafir build log (M0 → M9)

The plan is `docs/IMPLEMENTATION_PLAN.md`. It was approved on 26 Oct 2026 with these decisions:
- Database: MySQL 8.4.
- Frontend: Next.js.
- Hosting: VPS as the primary target, plus a non-VPS guide.
- Admin domain: set by an env variable.
- Local run on the user's PC comes first.
- Traveller portal: in Next.js.
- Login: email + password, and phone OTP (logged locally).
- Payment gateways: sandbox drivers plus a mock gateway.
- Git: a local repository.

## How to resume

**Box environment:**
- PHP 8.4.27 CLI and composer 2.10 are at `/usr/local/bin/composer`.
- The code must stay compatible with PHP 8.3, because the PC runs 8.3.30. `composer.json` enforces this through `config.platform.php = 8.3.30`.
- MySQL 8.4.11 is at `/opt/box/mysql`, with data in `/opt/box/mysql-data`.
  - Start it: `(nohup /opt/box/mysql/bin/mysqld --defaults-file=/opt/box/my.cnf >/dev/null 2>&1 &)`
  - Client: `/opt/box/mysql/bin/mysql --defaults-file=/opt/box/my.cnf -uroot`
  - Databases: `musafir`, `musafir_e2e` (root user, no password, socket `/tmp/mysql.sock`, port 3306)
- Node on the box is 20.19; the PC has Node 22.

**Folders:**
- `backend/` is the Laravel 13 app.
- `frontend/` is the Next.js 16 app.
- `packages/ui-tokens/` holds the shared design tokens.
- `e2e/` holds the Playwright tests.

## Log
- 26 Oct 02:19 — M0 started. The box had no PHP or MySQL: installed php8.4-cli + extensions and composer, and MySQL 8.4.11 (generic tarball in /opt/box). Created the musafir and musafir_e2e databases.

## M0 — DONE (2026-10-26 02:25 BDT box time)
- Git repo at /workspace/musafir (branch main), root .gitignore.
- backend: .env → MySQL `musafir` (127.0.0.1:3306 root/no pw); config/musafir.php (FRONTEND_URL, ADMIN_DOMAIN, ADMIN_PATH, REVALIDATE_SECRET, PAYMENT_MODE, SMS_DRIVER);
  admin routes in routes/admin.php mounted from bootstrap/app.php under domain and/or prefix; GET /api/v1/health, /admin/health (Inertia).
  Admin JS: resources/js/admin/app.tsx (vite 8, @vitejs/plugin-react, Inertia React 3.9, Tailwind 3.4.19 + ../packages/ui-tokens preset), `npm run build` OK.
- frontend: Tailwind 3.4.19 via postcss (tailwind.config.js uses ui-tokens preset), globals.css imports musafir.css, fonts in public/fonts,
  next.config.ts without cacheComponents (classic fetch cache + tags). `npm run build` OK; page fetches API health.
- Run: `cd backend && php artisan serve --port=8000`; `cd frontend && npm run dev`.

## M1 — DONE (schema, models, seeders)  2026-10-26 ~03:00 BDT
- 121 tables (migrations 2026_10_26_0001..0004 + framework/spatie). Round-trip rollback/migrate OK. CHECK constraints + FULLTEXT ngram on MySQL only.
- 99 Eloquent models generated from tooling/gen/models.py (spec; re-run regenerates all except User/MediaAsset). Traits: HasTr (spatie translatable, EN fallback),
  Publishable (status scopes, image/gallery from media_assets, seo morphOne, search_text), HasPublicUlid.
- Central media library: media_assets (+ spatie media, webp conversions thumb 480/card 800/hero 1600, nonQueued). Content references assets by id; gallery = json ids.
- Seed data: tooling/export_seed.py -> database/seeders/data/{public,app}.json ; tooling/export_pages.py -> pages.json (meta + derived ctx of all 153 mockup pages).
  Photos bundled in database/seeders/media (38 jpg + credits.json).
- Seeders: Foundation, User, Catalogue, Content, Cms (EMPTY placeholder — home sections/menus/translations to do in M3), Commerce, Crm, Seo. `migrate:fresh --seed` ≈ 19 s.
- Demo logins (password "password"): admin@ sales@ reservations@ visa@ support@ accounts@ content@ musafir.test; farhana@example.com; agent@example.com.
- Tests: Pest on MySQL `musafir_test` (phpunit.xml), MEDIA_DISK=testing_public. `unset APP_ENV; ./vendor/bin/pest` → 6 passed.
- APP timezone Asia/Dhaka (config/app.php env APP_TIMEZONE).

## M2 — DONE (public REST API v1)  2026-10-26 ~03:20 BDT
- 44 routes under /api/v1 (routes/api.php). Middleware: `api.locale` (?lang / Accept-Language → Content-Language + Vary), `public.cache` (weak ETag, 304, Cache-Control public),
  throttles `public` 240/min, `search` 60/min, `forms` 6/min + 60/day per IP; SSR calls from Next carry `X-Musafir-Ssr: <REVALIDATE_SECRET>` → unthrottled.
- Controllers Api/V1: Content (site, translations, redirects, sitemap, seo?path, home, pages/{slug}, faqs, testimonials, reviews, team, gallery, careers, posts),
  Catalog (tours + filters/sort/facets, tour detail + departures, destinations, themes, cruises, activities + slots?date, hotels, visas, offers, insurance-plans, gift-card-designs),
  Search (search?q across 7 types, airports, flights/search with pax/cabin pricing), Planner (config, estimate = mockup calculator, quote → inquiry+lead), Form (inquiries w/ honeypot, newsletter).
- Presenters: app/Http/Presenters/Catalog.php (cards/details), Sections.php (CMS page sections: localised data, image refs `*_image_id(s)`, dynamic `source` blocks).
- Publishable::scopePublished now also hides scheduled items (published_at in future). Settings cache busts on Setting save; translations version busts on Translation save.
- Model::preventLazyLoading in non-prod (caught 3 N+1s, fixed). trustProxies via TRUSTED_PROXIES env.
- Activity categories moved into settings `catalog.activity_categories` (admin-editable).
- Tests: tests/Feature/Api/* → total 55 passed / 375 assertions (incl. 304/ETag, locale, draft/scheduled/deleted hiding, filters/sorts, planner maths, validation, honeypot, XSS-as-data, SQLi-safe search, rate limiting).
  Sweep: all 218 detail endpoints (every slug × en/bn) return 200.

## M8 requirement (from owner, recorded 26 Oct 02:45) — testing campaign scope
Run on the box AND in real browsers: backend unit/feature (API, admin CRUD, auth/RBAC, validation, payments mock, seeders); frontend unit; Playwright E2E of all public,
portal and admin flows against the real API+DB (admin edit → public page updates, search/filters, booking → payment → voucher, login/OTP); responsive matrix 320–1920 ×
light/dark × bn/en; axe a11y; Lighthouse; SEO checks (metadata, hreflang, JSON-LD validity, sitemap/robots, SSR HTML content); visual diff vs mockup; broken links;
console errors; security checks. Then repeat key browser E2E on the user's PC (c81f2d4f) with local Chrome/Edge. Fix → re-run until clean; document in TEST_REPORT.md.
