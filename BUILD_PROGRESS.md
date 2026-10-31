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

## M3 — IN PROGRESS (Next.js public site)
- Done (commits 683bf96, 9229d38 + next): layout/header/footer, home (18 CMS sections), tours listing (URL filters/sort/view/pagination/compare) + tour detail,
  static page heroes from `pages` table (data/static_pages.json), case-sensitive translation keys (utf8mb4_bin).
- 2026-10-26 03:40 BDT: destinations list/detail (pads thin destinations with "More tours in <country>"), holidays list/theme, cruises list/detail (cabins, sailings,
  add-ons from setting `commerce.cruise_addons`, CruiseBook), activities list/detail (filters, slot picker via /api/slots → /api/v1/activities/{slug}/slots, now
  outside `public.cache` = never cached), InquiryForm (validation, 422 mapping, honeypot, reference). Reviews block `variant="card"` matches mockup for cruise/activity.
  Icon generator also picks lucide names quoted on lines mentioning "icon" (ternaries/maps) → 198 icons. /api/v1/seo?path falls back to the Page record's SEO.
- Visual check 1440: destinations/holidays/holidays-theme/cruises/activities = mockup height exactly; details differ only by extra data-driven sections.
- Gotcha: Next data cache survives rebuilds → after reseeding run cache:clear + POST /api/revalidate {"tags":["all"]} (Content-Type JSON) and hit the page twice.
- Tests: Pest 55 passed / 375 assertions.
- Next: hotels, flights, visa, offers, insurance, gift cards, group/custom tour, planner, compare, wishlist, blog, about/team/careers/gallery/reviews/faq/contact,
  legal, sitemap page, credits, brand, 404/error, booking stub, auth placeholders; /api/reviews BFF (401 until M5).
- 2026-10-26 04:30 BDT (log catch-up — these were committed but not logged before an interruption):
  - c2c21c1 hotels list/detail · ea8b424 flights search · 9b0d168 visa list/detail · d36b116 offers, insurance, gift cards
  - ea3b7eb group tours, custom tour, trip planner, compare, wishlist (?slugs= API filter)
  - 7cdd850 blog + post (TOC/CTA/share/JSON-LD), about, team, careers (+CV apply → private disk), gallery albums, reviews page, FAQ, contact
  - 3b18802 legal pages (terms/privacy/refund, numbered TOC), human sitemap, credits (GET /api/v1/credits), brand sheet (noindex), localised 404 ([...missing] catch-all
    + proxy header x-musafir-lang) and error boundary, auth UI (login OTP/password, register, reset — submit shows "accounts opening soon" until M5),
    /booking interim = booking-request form (inquiry type quote, CRM lead) → replaced by the 4-step checkout in M4.
  - Visual parity at 1440 vs mockup: same height on nearly all pages (about ±8 px, reviews taller = 8 DB reviews, credits = 36 library assets vs 38 mockup files).
  - Uncommitted: /account/* → /login?next= redirect (until M5), tooling/sweep.py (route + internal-link sweep), tests/Feature/Api/M3PagesApiTest.php.
  - Sweep: 222 pages (en+bn) all 200; only broken internal links were /account* → fixed by the redirect.
- 04:55 BDT: FIX — `headers()` in [lang]/not-found.tsx had made EVERY page dynamic (no SSG). 404 now renders both languages' copy from the
  dictionary and picks by pathname on the client (NotFoundView); proxy no longer injects x-musafir-lang. Build: 74 SSG paths ●, only
  searchParams listings/booking/compare/wishlist are ƒ. Sweep 222/222 OK; overflow check 320/360/390/768 en+bn clean.
- frontend/.env.example now tracked (frontend/.gitignore ignored it). backend/.env.example rewritten for Musafir/MySQL. docs/LOCAL_SETUP.md written.
- PC sync #1 (M3): 14×4 MB chunks (bigger CopyFromBox transfers fail; send sequentially), sha256 verified, robocopy /E merge (no deletes, .env skipped).
  PC: composer install (5.8 min), migrate --seed 105 s, storage:link, npm ci, next build 222 s with `artisan serve` single-threaded.

## M3 — DONE + verified on PC (2026-10-26 05:35 BDT)
- PC (c81f2d4f): servers already running from the previous worker were reused, then stopped (php serve ×2, npm/next start). Laragon mysqld and an unrelated
  codex node daemon (PID 3328) were left alone.
- HTTP smoke OK. Headless Chrome via playwright-core installed in %LOCALAPPDATA%\musafir-smoke (outside the project) running tooling/pc/pc_smoke.mjs:
  27/27 (13 pages × 1440/390 + dark). Screenshots are at %LOCALAPPDATA%\musafir-smoke\shots on the PC.
- Content edit → public: tinker title edit + cache:clear + POST /api/revalidate → visible after about 6 s (SWR 'max' profile; the first hit is stale). Reverted.
  TODO M6: admin save hook should call revalidate with `{ expire: 0 }` (or poll-warm) for immediate preview.
- Fixes: PC lacked backend/public/build (gitignored) → `npm ci && npm run build` in backend (admin/health 200). tests/Unit missing (empty dir) → .gitkeep.
  PC `php artisan test` → 64 passed / 553 assertions. LOCAL_SETUP.md updated; M3_REPORT.md written; both copied to the PC (sha256 verified).
- Gotcha: CopyFromBox only writes under C:\Users\m (the local-exec root). Copy there, then Move-Item into F:\projects\tour_travel.
- Gotcha: in PowerShell scripts, don't name a function `rv` (it's the alias for Remove-Variable).
- NEXT: M4 checkout + payments (4-step booking, coupons, deposit/instalments, mock + SSLCommerz/bKash/Nagad sandbox drivers, IPN, confirmation, mail/SMS log, PDFs).

## M4 — IN PROGRESS (checkout + payments)  started 05:30 BDT
- 05:45 backend done (commit above): app/Services/Checkout/{Pricer,FlightFare,CouponService,BookingService}, app/Services/Payments/* (Gateway interface,
  GatewayManager: enabled in settings `payments.gateways`; sandbox + no credentials → MockGateway branded as that gateway; live → only configured drivers),
  SslCommerz (init v4 + validation API), bKash tokenized (grant/create/execute/status/refund), Nagad (RSA init/complete/verify), BankTransfer (pending, admin verifies).
  API: POST checkout/quote, coupons/validate, bookings, bookings/{ref}/pay; GET bookings/{ref}?key=, bookings/{ref}/{invoice|voucher}.pdf; POST payments/{gw}/ipn.
  Web: /pay/{gw}/return/{payment} (GET|POST), /pay/mock/{payment} (signed). Laravel 13 CSRF middleware is PreventRequestForgery → except pay/*.
  Guest access key = booking ULID (hash_equals). Settle is idempotent (row lock). Hold: seats_held/booked incremented under lockForUpdate; `bookings:expire-holds` every minute.
  Data migration 2026_10_26_001000 inserts new settings/add-ons only if missing (PC data safe). PDFs English-only (dompdf has no Bangla shaping).
- Smoke: Maldives deposit 84,000 via simulated bKash → partial/partial, instalment 1 paid, 2 due, docs created, email+SMS logged; tampered signature 403; replay idempotent.
- 06:10 frontend done. /[lang]/booking = 4-step <Checkout> (Trip → Travellers → Extras → Payment), server-side first quote, re-quote on every change,
  query → selection for tour/cruise/activity/hotel/flight/visa/gift; missing date → first open departure/slot; error card on 422; resume mode
  (?ref&key&payment=failed|cancelled) opens straight on Payment. /[lang]/booking-confirmed (noindex): invoice like the mockup, badge, balance, next steps,
  invoice/e-voucher PDF links (BFF /api/bookings/{ref}/{doc}), PNR + gift code. BFF: /api/checkout/{quote,book}, /api/bookings/{ref}/pay (forward() now
  sends the httpOnly session token when present — lib/session.ts, used by M5). Visa page: "Apply & pay online" → /booking?visa=.
  Fixes found by E2E: JSON room id (int) rejected → normalised to string; duplicate bank slip → 422 not 500 (unique per gateway); dompdf font subsetting.
- Tests: Pest tests/Feature/Checkout (20 tests: pricing for all kinds, client-price tampering ignored, coupons scope/min/validity/limits/case, plan rules,
  validation + honeypot, holds/oversell/expiry, deposit→balance lifecycle, idempotent replay, signed simulator tampering, key checks, PDFs,
  failed/cancelled → retry, coupon redeemed only on payment, bank slip, flight PNR/tickets, gift code, live mode hides simulator; Http::fake drivers:
  SSLCommerz validation-only confirm + amount tamper + IPN-only settle + outage 502, bKash grant/create/execute→status fallback + paymentID mismatch,
  Nagad RSA sign/encrypt round-trip + ref mismatch). Full suite 84 passed / 737 assertions.
  Browser E2E tooling/tests/checkout_e2e.mjs (playwright-core + Chrome): tour deposit+coupon, cruise bn 390px Nagad, activity card, hotel failed→retry,
  hotel bank transfer, visa from visa page, gift card → 52/52 checks, no JS errors.
## M4 — DONE 06:10 BDT. NEXT: M5 traveller portal (Sanctum auth API + BFF cookie + /account pages).

## M5 — IN PROGRESS (traveller portal)  resumed 06:21 BDT by a new worker
- Found uncommitted M5 work from an interrupted worker (06:08–06:19): AuthController (register/login/OTP send+verify/reset/logout/me), Services/Auth/Otp,
  EnsureTraveller middleware (alias `traveller`), Presenters/Account, MeController (~684 lines, routes /api/v1/me/*), wallet payment in CheckoutController,
  throttles `auth`/`me`, OTP_DEBUG env; frontend: (site) route group, BFF app/api/auth/[action] + app/api/me/[...path], lib/session.ts (setSession/clearSession/sameOrigin),
  proxy.ts guard for /account, components/account/{ui,client}.tsx, lib/account.ts. Reviewing + finishing now.
- 06:55 backend M5 additions: booking detail now returns `policy` (cancellation windows with dates + refund estimate, fee setting `commerce.cancellation_fee` default 2000),
  `agent`, `nights`, `miles_earn`; cancel request accepts `refund_to`. Dashboard next trip = soonest real trip (not visa/gift), to-do items are data (`type` + params, worded by
  the portal). Wallet top-up (POST /me/wallet/topup → gateway; Payment.purpose `wallet_topup`, booking_id null; settle credits wallet; return → /account/wallet?topup=…;
  mock simulator handles no booking). Avatar upload/delete (/me/avatar, public disk), ticket attachments (reply multipart `file`, GET /me/tickets/{ref}/files/{msg}/{i}, private disk).
  Migrations 2026_10_26_002000 (wishlists.saved_price → "price dropped" note) and 002010 (travellers.frequent_flyer) — additive, guarded with hasColumn.
  Seed fixes: flight booking MSF-26-48377 → new offer BS 341 DAC→MLE 09:15–12:35 with PNR K7Q2ZM, seats 14A/14B, tickets 179-2468013579/80; traveller relation codes
  (Self/Spouse/Child) + FF number; Farhana wishlist (4 tours, Turkey saved ৳4,500 higher); visa events dated from ETA.
- Box tooling: /tmp/login.sh writes a Farhana token to /tmp/tok (re-run after any reseed).
- 07:03 frontend portal pages ALL written (app/[lang]/account/*): dashboard, bookings, bookings/[ref] (tabs, change/cancel modals → tickets, PayDue),
  bookings/[ref]/ticket (server QR), visa (checklist + upload), trips (plans + wishlist), wallet (top-up/redeem), payments, referrals, travellers (add/edit/delete),
  notifications (filter, mark read), support (list, ?t=TKT-…, chat + attachments, new request), reviews (star radios, scores), profile (avatar, completeness hint),
  settings (password modal, two-step switch, sessions, recent sign-ins, language/currency, notification switches, JSON export, delete account).
  Legacy /account/booking and /account/e-ticket redirect to the real booking / ticket. Helpers: components/account/page.tsx (accountMetadata/AccountHead/ago…).
- Backend additions this session: referral system (friend discount in Pricer + `discount:referral` line, ReferralService reward, `bookings:complete-past` daily 00:20),
  ReviewService (publish → Miles once via setting commerce.review_miles=250, incremental rating/reviews_count fold — keeps imported aggregates),
  REAL two-step sign-in (preferences.otp_login): POST auth/login returns {two_factor, challenge(encrypted 10-min), to}; POST auth/login/verify + auth/login/resend;
  BFF actions login-verify/login-resend; AuthForm shows the code step. Turning it on needs a verified phone. Newsletter switch mirrors newsletter_subscribers.
  Notification switch merge keeps other values. Currency validated against active currencies. Profile completeness = 10 checks + `missing[]`.
  Delete account erases travellers/wishlist/plans/avatar, unsubscribes. Review status 'review' (was wrongly 'pending'). User::initials() bug on new users fixed.
  New settings rows (code defaults apply if missing): commerce.referral_friend_discount/referral_min_total/referral_reward/review_miles/cancellation_fee — M6 settings UI must expose.
- KNOWN: php.ini upload_max_filesize=2M/post_max_size=8M by default but visa upload allows 10 MB → run scripts/docs must set upload_max_filesize=12M, post_max_size=14M.
- Tests: tests/Feature/Account/{AuthApiTest (10), MeApiTest (21)} → full suite 115 passed. Shared helpers farhana()/asTraveller()/newTraveller() in tests/Pest.php.
- NEXT: portal browser E2E (tooling/tests/portal_e2e.mjs), npm run build, then M6 admin.

## M5 — DONE + verified on PC (2026-10-26 ~08:05 BDT). PAUSED (owner's weekly usage limit nearly used up).
- Box: Pest 115 passed; portal browser E2E tooling/tests/portal_e2e.mjs 78/78; checkout E2E 52/52; `next build` OK (07:14).
- PC sync #2 (07:29): 14×4 MB chunks via C:\Users\m → F:\projects\tour_travel (robocopy merge, .env untouched). PC file hashes = box HEAD 8ac8395
  (spot-checked routes/api.php, proxy.ts, LOCAL_SETUP.md, composer.lock, package-lock.json). `migrate --force` (not fresh): all migrations through
  2026_10_26_002010 Ran. optimize:clear; next build 07:46. NOTE: PC DB was NOT reseeded, so M5 seed-fidelity fixes (flight booking BS 341/PNR K7Q2ZM, FF numbers,
  wishlist saved price) only appear after `php artisan migrate:fresh --seed` on the PC — optional, it wipes local data.
- PC smoke (%LOCALAPPDATA%\musafir-smoke\pc_portal_smoke.mjs, headless Chrome): 15/15 — login, 10 account pages, bn account, activity checkout via
  simulated bKash → booking-confirmed MSF-26-22630, no JS errors. Servers stopped afterwards (php serve, next start); Laragon MySQL and codex node PID 3328 left alone.
- docs/LOCAL_SETUP.md already covers php.ini upload limits (upload_max_filesize=12M, post_max_size=14M) and the portal login.

## M6 — DONE + verified on PC (admin panel)  started 2026-11-01 BDT
Design: declarative resource engine (backend/app/Admin: Field, Col, Filter, Action, Resource, Registry) + generic Inertia pages
(Resource/Index, Resource/Form) + custom pages (Dashboard, Media, Settings, Translations, Menus, Roles, Bookings/Show, Tickets/Show, Profile).
- [x] Engine + 58 resources (app/Admin/Resources/*, slugs in Registry::RESOURCES; nav groups Sales/Catalog/Visa desk/Content/Organisation).
- [x] Controllers: Resource (CRUD, bulk, actions, reorder, CSV export, activity log diff), Auth, Dashboard (+global search), Media (upload/replace/
      usage-checked soft delete/folders), Settings (+"refresh website" purge), Translations (+CSV import/export), Menus (2-level tree), Roles (matrix),
      Booking desk (status/assign/note/offline payment/refund/notify), Tickets (reply/internal note/status/assignee), private files.
- [x] Revalidation: CacheTags::for(model) → Revalidator (collected per request by FlushRevalidation middleware) → POST {frontend}/api/revalidate
      {tags, expire:0}. Frontend route now honours `expire` (revalidateTag(t,{expire:0})) with timing-safe secret check.
- [x] Frontend [...missing]: admin Redirects (301/302) + admin-created pages at /{slug} rendered with the article (Legal) layout.
- [x] React admin UI part 1 (be71398): layout, fields (tr/trtext/trhtml rich text, trlist, list, checks, image/gallery media picker, JSON editor w/ section templates, repeater/children drag reorder, seo w/ Google preview, slug, icon picker = site SVGs), Resource Index/Form, Dashboard (chart.js), Media, Settings, Profile, Login
- [x] React admin UI part 2: Translations, Menus, Roles, Bookings/Show, Tickets/Show + npm run build (tsc clean)
- [x] Browser crawl per role (tooling/tests/admin_crawl.mjs): every nav page + first edit + create page, non-nav areas must 403
- Box rebuilt 2026-11-01 ~02:40 BDT (workspace restored, /opt/box lost): reinstalled static PHP 8.4.23 (/opt/box/php → /usr/local/bin/php, static-php-cli bulk),
  MySQL 8.4.9 minimal (/opt/box/mysql, data /opt/box/data, config /opt/box/my.cnf, client wrapper /opt/box/mysqlc), composer.phar in /opt/box; apt mirrors unusable from root.
  Demo DB reseeded (migrate --seed); Pest 115/115.
- [x] Pest admin tests (tests/Feature/Admin: access per role, every resource index/create/edit, form round-trip of every editable resource,
  FAQ CRUD + revalidation + activity log, settings, media, booking desk, bank-transfer verify, tickets, translations, menus, roles) — suite 148/148
- [x] Browser E2E per role (tooling/tests/admin_e2e.mjs) 25/25: owner setting→footer, editor FAQ + UI translation→site, manager tour title→detail+listing,
  agent traveller-visible note→portal, finance bank-transfer verify→portal paid amount, visa stage→portal tracker, support reply→portal inbox (all restored after)
- Bugs found+fixed by the tests: model-event closures returning false halted the revalidation hook (translations/settings never purged the site);
  resources without explicit search columns ignored `q`; tour price-tier codes didn't match the Pricer (twin/triple/single); team card colours didn't
  match stored gradients; portal booking activity exposed internal staff notes; React effect returning scrollIntoView's Promise crashed ticket reply;
  media nav hidden for catalogue staff; portal visa 'verified'/'rejected' labels.
- [x] docs/LOCAL_SETUP.md admin section (URL, logins/roles, revalidation, ADMIN_DOMAIN)
- Box regression after M6 (03:5x BDT): Pest 148/148; admin crawl 7 roles 0 fails (nav links: owner 64, manager 38, editor 41, agent 8, support 8, finance 7, visa 3);
  admin_e2e 25/25; portal_e2e 78/78; checkout_e2e 52/52.
- [x] PC sync #3 (2026-11-01 03:43–04:35 BDT) → DESKTOP-JL5D1F4 (c81f2d4f) F:\projects\tour_travel: git archive 20ca0d8 (55 MB) → 14×4 MB chunks
  sequentially via C:\Users\m\msfm6, every chunk + merged tar sha256 OK, robocopy /E merge (no deletes, .env/.env.local excluded, backend .env hash unchanged);
  later admin_e2e.mjs copied so the tree = 5c8873f. Laragon MySQL 8.4.3 was stopped → started mysqld (InnoDB recovery ~50 s). composer install (lock unchanged),
  `migrate --force` (nothing to migrate), optimize:clear, backend npm ci + build, artisan serve (must run BEFORE next build — SSG fetches the API), next build 297 s, next start.
  PC smoke: admin_e2e 25/25 (all 7 roles, admin change → public site / portal), admin crawl owner 0 fails (64 nav) + editor 0 fails (41 nav), pc_smoke 27/27,
  pc_portal_smoke 15/15. Servers left running (php artisan serve :8000, next start :3000).
- DESKTOP-JIBO2KJ (6cbf210c, E:\projects\tour_travel_full) OFFLINE at 03:4x and 04:18 BDT → not synced; sync it the same way when it is online.
  E:\projects\tour_travel not touched.
Checks: `php artisan tinker /tmp/chk.php`-style smoke (every resource: columns/filters/sections/hydrate/detail) passes; Pest 115/115 still green.

## RESUME HERE (when owner says "continue")
1. M6 — DONE (only open item: sync PC #2 DESKTOP-JIBO2KJ when it is online). Original scope: Admin panel (Laravel + React, admin.<domain> configurable): RBAC roles from seeded staff logins, CRUD for every CMS/catalogue/commerce/CRM table,
   settings UI (incl. commerce.referral_*, review_miles, cancellation_fee, payments.gateways), media library, bookings/payments ops (bank-slip verify, refunds),
   tickets, reviews moderation, translations, menus/home sections, SEO/redirects. Admin save → POST frontend /api/revalidate with `{ expire: 0 }` for instant updates.
2. M7 — security + performance hardening (headers/CSP, rate limits review, queues, caching, image optimisation).
3. M8 — full test campaign (scope recorded above) on box + PC, TEST_REPORT.md.
4. M9 — deployability (scope changed by owner 2026-11-01): make sure the project deploys on any hosting (VPS, shared/cPanel, PaaS) — production build works, env-driven config, no hardcoded hosts/paths, runs without Redis/root; plus a short DEPLOYMENT.md checklist only (no step-by-step guides).
- PC transfer rules: 4 MB chunks, sequential, CopyFromBox into C:\Users\m then move into F:\projects\tour_travel; never overwrite .env; sha256 verify.
- Run on PC: backend `php -d upload_max_filesize=12M -d post_max_size=14M artisan serve --host=127.0.0.1 --port=8000`; frontend `npm run start` → http://localhost:3000

## PC #2 delivery — DESKTOP-JIBO2KJ (6cbf210c), E:\projects\tour_travel_full (2026-10-26 15:52–16:20 BDT)
- Old mockup copy E:\projects\tour_travel left untouched. Package = `git archive HEAD` (bd2734e, 55 MB tar.gz, 1228 files) → 14×4 MB chunks
  into C:\Users\m\msfchunks (parallel CopyFromBox worked here), merged, sha256 d7f39ad3… matched, extracted with bsdtar.
- PC: Laragon PHP 8.4.25 (all needed exts present), MySQL 8.4.3 already running, Node 22.16. .env from .env.example (database cache/queue/session, no Redis).
  Setup script C:\Users\m\msf_setup.ps1 (log msf_setup.log): composer install 4.3 min, key:generate, CREATE DB musafir, migrate --seed, storage:link,
  backend npm ci+build, artisan serve, frontend .env.local from .env.example, npm ci, next build 2.5 min, next start.
- Smoke (%LOCALAPPDATA%\musafir-smoke, headless Chrome): pc_smoke 27/27, pc_portal_smoke 15/15 (checkout MSF-26-45535). HTTP health/admin/en/bn/tours/sitemap 200.
- Pest on PC (DB musafir_test): 114/115; the Nagad RSA test fails only because Windows PHP lacks OPENSSL_CONF for openssl_pkey_new in the test's key
  generation. With OPENSSL_CONF=C:\laragon\bin\php\php-8.4.25-Win32-vs17-x64\extras\ssl\openssl.cnf GatewaysTest 6/6 passes. Not a code bug.
- Servers left RUNNING on this PC (php artisan serve :8000, next start :3000).
