# Musafir: implementation plan (mockup → production system)

| | |
|---|---|
| Status | **PLAN ONLY**. Nothing is built yet. Written 26 Oct 2026 (UTC+6). |
| Inputs | The mockup in this repo:<br>• `site/` (306 pages)<br>• `src/data_public.py`, `src/data_app.py`<br>• `docs/architecture.md`, `docs/database.md`, `docs/design-system.md`<br>Lessons from the Hajj agency project (`/workspace/hajj_agency_laravel`, Laravel 12 + Inertia 3 + React 19) |
| Target machine | DESKTOP-JL5D1F4, at `F:\projects\tour_travel` |

## 0. Goals and non-goals

**Goals**
1. **Public website (Next.js).**
   - Must look the same as the mockup, pixel for pixel, in EN/BN and light/dark, from 320 px to 1920 px.
   - Fully dynamic: no content is hardcoded.
   - Best-in-class SEO.
2. **Backend (Laravel), with two parts:**
   - A versioned REST API (`/api/v1`) used by Next.js, the traveller portal, and later mobile apps and B2B partners.
   - A **React admin panel (Inertia)** that manages *everything*: catalogue, CMS, menus, home sections, banners, FAQs, testimonials, SEO per page, settings, translations, media, bookings, payments, CRM, staff and roles.
3. **Setup and data.**
   - Proper migrations, plus seeders that load *all* the mockup's dummy data in both languages.
   - A step-by-step guide for running it locally on Windows (Laragon, which is already installed).
   - A production deployment guide.
4. **Quality.** Tests at the same depth as the mockup: unit, feature, E2E, responsive matrix, axe and Lighthouse.

**Non-goals for v1** (adapters and stubs are planned for each):
- live GDS/NDC flight booking, hotel bed-bank booking, cruise-line APIs
- real money movement: payments run on **sandbox/mock** adapters until you provide merchant credentials
- native mobile apps (the API is ready for them)

## 1. What is installed on your PC (DESKTOP-JL5D1F4)

Checked on 26 Oct 2026 with read-only commands.

| Tool | Found | Needed | Status |
|---|---|---|---|
| Windows | 10 (build 19045), 7.9 GB RAM | | OK. RAM is enough for MySQL + Laravel + Next dev; avoid running Docker as well |
| Laragon | **Installed** at `C:\laragon` and running (mysqld process active) | | OK |
| PHP | **8.3.30** (Laragon, ZTS x64) | ≥ 8.3 for Laravel 13 | OK |
| PHP extensions | bcmath, curl, exif, fileinfo, gd, intl, mbstring, openssl, pdo_mysql, pdo_sqlite, sodium, zip | | OK. `php_pdo_pgsql.dll` exists but is disabled. `php_redis` is missing, so we use `predis` |
| Composer | 2.9.5 | 2.x | OK |
| Node.js / npm | **22.16.0** (nvm4w) / 10.9.2 | Next 16 needs ≥ 20.9 | OK. pnpm is not installed; npm is fine |
| Git | 2.53.0 | | OK |
| MySQL | **8.4.3** (Laragon bundle; not on PATH, so use the Laragon terminal) | 8.0+ | OK |
| PostgreSQL | Not installed | | Only needed if you choose PostgreSQL |
| Redis | 5.0.14 (Laragon's old Windows build) | Optional locally | Usable through predis; locally we default to the database queue/cache |
| Nginx / Apache | nginx 1.28.2, Apache 2.4.66 (Laragon) | | OK (optional vhost) |
| Mailpit | Included with Laragon | | Ideal for local email testing |
| Docker / WSL | Not installed | | Not needed |

**Conclusion:** nothing new needs to be installed for local development.

## 2. Key decisions

Each decision has a recommended default. Items marked ❓ need your confirmation; the full list is in §22.

| # | Decision | Recommendation | Why |
|---|---|---|---|
| D1 ❓ | Database | **MySQL 8.4** (PostgreSQL stays possible) | Already running in Laragon; standard on BD VPS and cPanel hosting; Laravel supports it fully. `docs/database.md` was written for PostgreSQL, and §5 adapts it: `json` instead of `jsonb`, `char(26)` ULIDs, FULLTEXT with ngram |
| D2 ❓ | Hosting | **One Linux VPS**: Ubuntu 24.04, 2 vCPU / 4 GB, Singapore or Mumbai region, running Nginx + PHP-FPM + Node (PM2) + MySQL + Redis | Next.js SSR/ISR needs a long-running Node process. Typical cPanel shared hosting cannot run it reliably. Alternatives are in §20 |
| D3 ❓ | Where the traveller portal lives | **In Next.js** (`/[lang]/account/*`), authenticated by Laravel **Sanctum tokens** held in an httpOnly cookie by a small Next.js backend-for-frontend (BFF) | Same layout, header, fonts and theme as the public site, so it matches the mockup with no duplicated design. One customer-facing app; the admin stays in Laravel for staff only. The portal reads the same `/api/v1` that mobile apps will use. Details in §8 |
| D4 | Laravel version | **Laravel 13.x** (13.38 as of 20 Oct 2026) with PHP ^8.3 | Current major; security fixes until March 2028; runs on your PHP 8.3.30 |
| D5 | Translations | JSON columns `{ "en": …, "bn": … }` via `spatie/laravel-translatable` 6.14 (6.15 needs PHP 8.4) | Worked well in the Hajj project and is far simpler than separate translation tables. Adding a 3rd language later is just a settings change |
| D6 | Admin stack | Inertia 3 + React 19 + TypeScript + Vite + Tailwind 4, plus a **schema-driven resource engine** (the `AdminResources` pattern from the Hajj project, upgraded) | Proven in the Hajj project. About 60% of the modules become configuration instead of hand-written CRUD |
| D7 | Styling fidelity | Port `tooling/tailwind.config.js` and `src/app.css` once into a shared `packages/ui-tokens`, used by both Next.js and the admin. Run Tailwind 4 with `@config` plus a v3-compatibility base layer | Copies the mockup's tokens and components exactly. A **pixel-diff gate against mockup screenshots** (§16) proves fidelity. Fallback: pin Tailwind 3.4 if the diff can't be closed |
| D8 | Repository layout | **One Git monorepo** at `F:\projects\tour_travel`. The mockup stays where it is, as the design reference; `backend/`, `frontend/` and `e2e/` are added alongside it | Nothing existing is moved or deleted |

## 3. Architecture

```
                         Cloudflare (DNS, CDN, WAF, TLS)  [optional but recommended]
                                         │
                         ┌───────────────┴────────────────┐
                    musafir.com.bd                api.musafir.com.bd  /  admin.musafir.com.bd
                         │                                 │
                 Nginx ──┤ proxy :3000                     ├── Nginx → PHP-FPM 8.3/8.4
                         │                                 │
             ┌───────────▼───────────┐          ┌──────────▼───────────────────────────┐
             │ Next.js 16 (Node, PM2)│  REST    │ Laravel 13                           │
             │  • /en/* /bn/* public │ ───────▶ │  • /api/v1/*  (Sanctum, JSON)        │
             │  • /[lang]/account/*  │  JSON    │  • /admin/*   (Inertia + React 19)   │
             │  • BFF route handlers │ ◀─────── │  • webhooks: SSLCommerz/bKash/Nagad  │
             │  • /api/revalidate    │ revalidate│  • queues: mail, SMS, PDFs, ISR     │
             └───────────────────────┘  (tags)  └───────┬────────────┬─────────────────┘
                                                        │            │
                                                 MySQL 8.4      Redis 7 (cache, queue, rate limit)
                                                        │
                                          storage/app/public (media) → S3/R2 later
```

**Content flow:**
1. An admin edits content (for example a tour).
2. Laravel saves it, and a model observer dispatches `RevalidateFrontend` with tags such as `tour:maldives-honeymoon`, `tours` and `home`.
3. Next.js `POST /api/revalidate` (protected by an HMAC secret) calls `revalidateTag()`.
4. The next visitor gets fresh HTML. Pages stay static and fast between edits.

**Repository layout** (proposed, inside `F:\projects\tour_travel`):

```
tour_travel/
├─ site/ src/ tooling/ logo/ docs/ research/ …   ← existing mockup (kept as the design reference)
├─ backend/                 Laravel 13 (API + admin)
│  ├─ app/{Models,Http/Controllers/{Api/V1,Admin},Http/Resources,Services,Payments,Sms,Support,Observers,Jobs,Policies}
│  ├─ database/{migrations,seeders,seeders/data/*.json,factories}
│  ├─ resources/js/admin/   React + Inertia admin (pages, components, resource engine)
│  ├─ routes/{api.php,admin.php,web.php}
│  └─ tests/{Feature,Unit}  Pest
├─ frontend/                Next.js 16 App Router (public site + traveller portal)
│  ├─ app/[lang]/(site)/…   public routes        app/[lang]/account/…  portal
│  ├─ app/api/{revalidate,auth,…}/route.ts       BFF + revalidation
│  ├─ components/ lib/{api,seo,i18n,format}/ styles/
│  └─ tests/ (Vitest)
├─ packages/ui-tokens/      shared Tailwind preset + app.css components (from the mockup)
├─ e2e/                     Playwright: E2E, responsive matrix, axe, visual diff, Lighthouse CI
└─ deploy/                  nginx, PM2, supervisor, systemd, GitHub Actions, backup scripts
```

## 4. Technology versions (checked 26 Oct 2026)

| Layer | Package | Version |
|---|---|---|
| Backend | PHP | 8.3 (local) / 8.3 or 8.4 (server) |
| | laravel/framework | ^13.38 |
| | laravel/sanctum | ^4.3 |
| | inertiajs/inertia-laravel | ^3.5 |
| | spatie/laravel-permission | ^8.3 (roles and permissions matrix) |
| | spatie/laravel-medialibrary | ^11.23 (uploads, WebP/AVIF conversions, responsive images) |
| | spatie/laravel-translatable | ^6.14 |
| | spatie/laravel-activitylog | (audit log) |
| | spatie/laravel-sitemap | optional; Next.js generates the sitemaps |
| | predis/predis | |
| | barryvdh/laravel-dompdf | (vouchers, invoices, e-tickets) |
| | maatwebsite/excel or a plain CSV writer | (exports) |
| | Tests | pestphp/pest ^4.7 (Pest 5 needs PHP 8.4), larastan, pint |
| Admin UI | react / react-dom | 19.3 |
| | @inertiajs/react | 3.9 |
| | vite | 8.x |
| | tailwindcss | 4.3 |
| | typescript | 5.x/7.x (matches the Hajj project) |
| | Libraries | TanStack Table, React Hook Form + Zod, Tiptap (rich text), dnd-kit (menus, home sections, itinerary ordering), Recharts or Chart.js (the mockup uses Chart.js; keep it for pixel parity), sonner, lucide-react |
| Frontend | next | **16.4.x** (Active LTS; 16.4.3 released 23 Oct 2026) |
| | react | 19.3 |
| | TypeScript | |
| | tailwindcss | 4.3 + the shared preset |
| | Libraries | zod, `server-only` |
| | Tests | Vitest + Testing Library |
| | Fonts | Self-hosted Plus Jakarta Sans, Hind Siliguri, Fraunces via `next/font/local` (the same WOFF2 files as the mockup) |
| Testing | E2E and checks | Playwright 1.64, @axe-core/playwright 4.13, Lighthouse CI 12 |
| Infra | Server software | Ubuntu 24.04 LTS, Nginx 1.26+, PHP-FPM, Node 22 LTS, PM2, MySQL 8.4 LTS, Redis 7, Supervisor, Certbot |

## 5. Database schema (MySQL 8.4, utf8mb4_unicode_ci)

**Conventions:**
- Keys:
  - Primary keys are `bigIncrements`.
  - Public-facing records also get a `ulid` (`char(26)`), so URLs and APIs never expose sequential IDs.
  - Bookings also get a human-readable `ref` (`MSF-26-48213`).
- Bilingual fields are `json` (`{"en": "...", "bn": "..."}`), for example `title`, `summary`, `body`, `meta_title`.
- Data types and naming:
  - Money is `decimal(12,2)` in BDT.
  - Every table has timestamps; soft deletes are used on catalogue, CMS, users and bookings.
  - Enums are stored as `string` columns and validated in PHP enums. This keeps migrations easy.
- Every public entity has `status` (draft/published/archived), `sort`, `published_at`, and a morph-one `seo` record.
- Search uses FULLTEXT indexes (ngram parser) on the generated `search_text` columns (EN + BN). Laravel Scout + Meilisearch is an upgrade path.

### 5.1 Migration list (in order; about 85 tables)

**A. Core and auth**
1. `users`: name, email, phone (unique), password, locale, theme_pref, avatar, tier_id, miles, wallet_balance, referral_code, referred_by, dob, gender, nid_enc, status, last_login_at, 2FA columns.
2. `password_reset_tokens`, `sessions`, `personal_access_tokens` (Sanctum), `otp_codes` (phone/email, hashed code, purpose, expires_at, attempts).
3. spatie-permission tables: `roles`, `permissions`, `model_has_roles`, `model_has_permissions`, `role_has_permissions`.
4. `cache`, `cache_locks`, `jobs`, `job_batches`, `failed_jobs`.
5. `activity_log` (audit log), `login_activities` (ip, user agent, success, at).

**B. Settings, i18n, CMS**

6. `settings`: group, key, value json, is_public. Groups:
   - company: name, address, hotline, WhatsApp, email, hours, licences, branches, social links
   - SEO defaults
   - currency and tax
   - payments: enabled gateways and mode
   - email/SMS
   - modules on/off
   - analytics IDs
   - home countdown, cookie text
7. `languages`: code, name, native, dir, is_default, is_active.
8. `translations`: group, key, value json. These are the **UI strings** (header, footer, buttons, form labels, validation messages), editable in admin and exported to Next.js.
9. `pages`: CMS pages such as About, Terms, Privacy, Refund policy, Insurance, Gift cards, Group tours and Custom tour. Columns: slug, template, title, body json (blocks), status.
10. `page_sections`: page_id, type, sort, is_active, data json.
   - Section types follow the mockup's 18 home sections: hero, trust-strip, category-chips, featured-destinations, flash-deals, popular-tours, themes, cruise-band, activities, trust-safety, services, why-us, steps, testimonials, stats, blog, app-promo, faq.
   - Each type has its own data schema (titles, selected IDs, limits, CTA, background image).
11. `menus` (header, mega, footer-1..4, mobile), `menu_items` (menu_id, parent_id, label json, url or linkable morph, icon, badge, sort, is_active).
12. `banners`: placement, title json, subtitle json, image, link, starts_at, ends_at.
13. `faq_categories`, `faqs`: question json, answer json, category, sort, show_on (morph or tag).
14. `testimonials`: name, city, trip, rating, text json, avatar, is_featured.
15. `team_members`, `stats` (number, suffix, label json), `partners` (airline and hotel logos).
16. `blog_categories`, `blog_posts`: author_id, category_id, title, excerpt, body json, reading_mins, published_at. Also `tags`, `taggables`.
17. `seo_meta` (morph): meta_title, meta_description, canonical, robots, og_image, og_title, json_ld_override, keywords, and sitemap priority/changefreq. Every page, product and post has one.
18. `redirects`: from_path, to_path, code (301/302), hits. Next.js middleware reads this table through the API.
19. `media` (spatie medialibrary), `media_folders`.

**C. Catalogue**

20. `regions` (bd / intl / europe…), `countries` (iso2, name json, flag, currency, visa_note).
21. `destinations`: slug, country_id, region, name, tagline, description, best_time, visa_info, currency, flight_time, things_to_do json, lat/lng, is_featured.
22. `themes`: slug, category, icon, name, tagline, perks json. `categories` (beach, hills, heritage…) and the polymorphic `categorizables`.
23. `cancellation_policies`: code (free24, free72, free7, free30, partial, none), name json, rules json (days-before → refund %). This table drives both badges and refund estimates.
24. `tours`, with these columns:
   - slug, destination_id, title, summary, description, highlights json, inclusions json, exclusions json
   - days, nights, group_size, price_from, price_was, badge json
   - includes_flight, includes_visa, cancellation_policy_id
   - rating, reviews_count, status, is_featured
25. `tour_itinerary_days` (day_no, title, body, meals json, stay), `tour_departures` (date, seats_total, seats_held, price, status), `tour_price_tiers` (twin/single/child), `tour_addons`.
26. `cruise_lines`, `ships`, `cruises` (slug, ship_id, region, nights, depart_port, route json, price_from/was, highlights), `cruise_sailings`, `cruise_cabins` (tier, price, capacity), `cruise_ports_of_call`.
27. `activities`, with these columns:
   - slug, destination_id, category, title, duration_min, languages json, meeting_point, pickup
   - instant_confirm, price/was, cancellation_policy_id, highlights
   Also `activity_options` and `activity_slots` (starts_at, capacity, booked).
28. `hotels` (slug, destination_id, kind, stars, address, distance_text, amenities json, refundable, breakfast, guest_score, supplier, supplier_code), `hotel_room_types`, `hotel_rates` (date ranges), `amenities`.
29. Flight data, used for mock inventory now and for a supplier adapter later:
   - `airlines`, `airports`
   - `flight_offers` (route, carrier, flight_no, dep/arr, duration, stops, cabin, fare, baggage, refundable, seats)
30. `visa_products` (country_id, type, processing, fee, validity, stay, entry, doc_set), `visa_document_sets` (general/job/business/student), and `visa_requirements` (item json, required).
31. `insurance_plans`, `gift_card_designs`, `gift_cards` (code, amount, balance, buyer, recipient, expires_at).
32. `offers`: code, title json, discount_text, image, ends_at, tag, link. These drive the countdowns.
    Also `coupons` (code, type, value, min_spend, max_uses, used, scope json, valid_from/to) and `coupon_redemptions`.
33. `planner_costs`: destination_id, cost_per_day_standard, cost_per_day_premium, flight_estimate. This replaces `PLAN_COST` in the mockup.
34. `currencies` (code, symbol, rate_to_bdt, is_active, updated_at). Display only; settlement is always in BDT.

**D. Commerce**

35. `travellers`: user_id, name, relation, dob, gender, nationality, passport_no_enc, passport_expiry, meal_pref, seat_pref.
36. `bookings`, with these columns:
   - ref, user_id, agent_id, owner_staff_id, coupon_id, kind, status, payment_status, channel
   - contact json, travel_start, travel_end, pax json
   - subtotal, discount, tax, total, paid, cost, currency, notes, cancelled_at, cancel_reason
37. `booking_items`: booking_id, bookable morph (tour departure, cruise sailing, activity slot, hotel rate, flight offer, visa product, insurance), label, qty, unit_price, cost, meta json.
    Also `booking_travellers` (pivot, ticket_no), `booking_activities` (timeline/notes, internal flag), and `booking_documents` (vouchers, e-tickets as PDFs).
38. `instalments` (seq, due_date, amount, status, payment_id).
    Also `payments`:
    - booking_id, gateway, method, amount, fee
    - status, gateway_txn (unique), val_id, raw json, paid_at
39. `refunds` (payment_id, amount, reason, status, approved_by), `payment_gateway_logs` (request/response; IPN payloads).
40. `saved_payment_methods` (gateway token references only; card numbers are never stored).
41. `wallet_transactions`, `miles_transactions`, `loyalty_tiers` (name json, min_miles, perks json), `referrals`.
42. `wishlists` (user_id, wishable morph), `trip_plans` (user_id, data json, estimate, share_token).
43. `reviews`: reviewable morph, user_id, booking_id, rating, category_scores json, title, body, status, reply, replied_by.
44. `visa_applications` (ref, visa_product_id, traveller_id, booking_id, stage, eta, assignee_id) and `visa_application_events`.
    Also `documents` (owner morph, kind, media, status, rejected_reason).

**E. CRM, support, B2B**

45. `leads` (name, phone, email, need, source, value, stage, owner_id, trip_plan_id, meta json) and `lead_activities`.
46. `inquiries`: type (contact, custom-tour, group-tour, insurance, careers, quote), payload json, status. Every public form posts here.
47. `newsletter_subscribers`.
48. `support_tickets` (ref, user_id, booking_id, subject, priority, status, assignee_id) and `ticket_messages` (author morph, body, attachments).
49. `agents` (company, licence_no, commission_pct, credit_limit, balance, status), `agent_users`, `commissions`.
50. `api_clients` (B2B keys, scopes, rate limit), `integration_logs`.
51. `notification_templates` (key, channel email/sms/whatsapp/push, subject json, body json, variables).
    Also `notifications` (Laravel database notifications), `campaigns`, `campaign_recipients`, and `sms_logs`.
52. `job_posts` (careers), `job_applications`.
53. `gallery_albums`, `gallery_items`.

The ER diagram in `docs/database.md` will be regenerated from the real migrations (Mermaid output from a small artisan command), so the docs never drift from the code.

### 5.2 Indexes and constraints

| Table(s) | Indexes and constraints |
|---|---|
| All slugged tables | `unique(slug)` |
| `bookings` | `unique(ref)`; `(status, travel_start)`; `(user_id, created_at)` |
| `payments` | `unique(gateway, gateway_txn)` (idempotent webhooks) |
| Catalogue tables | FULLTEXT `(search_text)` with the ngram parser |
| `tour_departures` | `(tour_id, date)` |
| `activity_slots` | `(activity_id, starts_at)` |
| Data rules | Foreign keys with `restrict` on money tables. CHECK `paid <= total`, `rating BETWEEN 1 AND 5`, `seats_held <= seats_total` (MySQL 8 enforces CHECK) |

## 6. Seeders (rich dummy data from the mockup)

**How the mockup data gets in:**
- A one-off exporter (`tooling/export_seed.py`) dumps `src/data_public.py` and `src/data_app.py` to `backend/database/seeders/data/*.json`, preserving every EN/BN string.
- The PHP seeders read those JSON files, so the seeded site shows **exactly** the mockup's content.
- Images from `site/assets/img/` are imported into the media library with their credits (`credits.json`).

| Seeder | Source in the mockup | Rows (approx.) |
|---|---|---|
| `LanguageSeeder`, `SettingsSeeder` | COMPANY, licences, branches, hours, socials, SEO defaults, modules | 2 languages + about 60 settings |
| `TranslationSeeder` | every `t('…','…')` UI string, extracted from the templates by script | about 900 keys |
| `RolePermissionSeeder` | `A.ROLES`, `A.PERMS` (Super admin, Admin, Sales, Visa desk, Content, Accounts, Support, Agent) | 8 roles × about 60 permissions |
| `UserSeeder` | `A.USER` (Farhana Rahman, Gold), `A.STAFF`, `A.CUSTOMERS` | 1 demo traveller + 7 staff + 24 customers |
| `GeoSeeder` | countries, regions, airports, airlines (`AIRLINES`) | about 30 + 40 + 10 |
| `DestinationSeeder`, `ThemeSeeder`, `CategorySeeder` | DESTINATIONS (12), THEMES (6), CATEGORIES (9) | |
| `CancellationPolicySeeder` | CANCEL (6 policies) | |
| `TourSeeder` | TOURS (16) with itineraries, galleries, departures (generated for the next 12 months) | 16 tours, about 250 departures |
| `CruiseSeeder` | CRUISES (6), ships, cabins, sailings | |
| `ActivitySeeder` | ACTIVITIES (12) with slots for the next 60 days | |
| `HotelSeeder` | HOTELS (8), room types, rates | |
| `FlightOfferSeeder` | FLIGHTS (6), expanded to the popular routes | about 60 |
| `VisaSeeder` | VISAS (10), VISA_DOCS sets | |
| `OfferCouponSeeder` | OFFERS (6), COUPONS (7, incl. MUSAFIR10, CRUISE10, MONSOON26) | |
| `PlannerCostSeeder`, `CurrencySeeder` | PLAN_COST; BDT/USD 122/EUR 132 | |
| `CmsSeeder` | home sections (18), pages (about, terms, privacy, refund, insurance, gift cards, group/custom tour), menus (NAV_TOURS + footer), FAQS (10), REVIEWS→testimonials, TEAM (8), STATS, BLOG (6), CAREERS (5), gallery | |
| `SeoSeeder` | the title/description of every mockup page (taken from `site/en|bn/*.html`) | about 150 |
| `BookingSeeder` | `A.MY_BOOKINGS` (10, incl. MSF-26-48213 Maldives part-paid), `A.ADMIN_BOOKINGS` (36), INSTALMENTS, PAYMENTS (27), refunds | |
| `LoyaltySeeder` | TIERS, MILES_TX, WALLET_TX, REFERRALS, SAVED_TRIPS | |
| `VisaApplicationSeeder` | VISA_APPS, VISA_QUEUE, VISA_STAGES | |
| `CrmSeeder` | LEADS (15), inquiries, newsletter | |
| `SupportSeeder` | TICKETS, ADMIN_TICKETS, CHAT | |
| `ReviewSeeder` | product reviews (REVIEWS, ADMIN_REVIEWS, MY_REVIEWS) with category scores | |
| `AgentSeeder` | AGENTS (5), commissions | |
| `NotificationSeeder` | templates (booking confirmed, payment received, instalment due, visa stage, OTP…) + NOTIFS | |
| `AuditLogSeeder` | LOGS | |
| `MediaSeeder` | 39 photos × 2 sizes + logo files | |

**Commands:**
- `php artisan migrate:fresh --seed` builds everything, in about 30–60 s.
- `php artisan db:seed --class=DemoContentSeeder` reloads content only.

**Demo logins** (password `password`; local and seed data only):

| Role | Email |
|---|---|
| Super admin | admin@musafir.test |
| Sales | sales@musafir.test |
| Visa desk | visa@musafir.test |
| Content | content@musafir.test |
| Traveller | farhana@example.com |
| Agent | agent@example.com |

## 7. Admin panel (Laravel + Inertia + React)

The design reproduces the 24 mockup admin pages plus the login page: the same sidebar groups, top bar, KPI cards, tables that become cards on mobile, drawers, dialogs, light/dark mode and EN/BN.

**Resource engine** (learned from the Hajj project's `AdminResources`):
- Each module declares its columns, filters, sorts, form fields and permissions once, in `app/Admin/Resources/*.php`.
- Field types:
  - basic: text, textarea, number, money, select, multiselect, date, datetime, switch
  - bilingual: `tr`, `trtext`, `trrich` (Tiptap), `trlines`
  - media: image, gallery
  - structured: repeater (itinerary days, FAQs), relation, json-schema
  - SEO: a `seo` panel
- One generic React `ResourceIndex` / `ResourceForm` renders them: server-side pagination, search, filter chips, sort, bulk actions, CSV export, soft-delete/restore, and a confirm dialog.
- Complex screens get custom pages.

| Group | Module (mockup page) | Operations |
|---|---|---|
| Overview | Dashboard (`admin/index`) | KPIs, revenue line, mix doughnut, latest bookings, needs-attention, top destinations, departures (live queries, cached 5 min) |
| | Reports (`reports`) | P&L, sales by product/channel/agent, date range, CSV/PDF export |
| Sales | Bookings list + detail (`bookings`, `booking`) | Create manual booking, edit travellers/items, status changes with history, record payment, refund, instalment schedule, assign owner/agent, notes/timeline, vouchers/e-ticket PDF, email/SMS customer |
| | Leads pipeline (`leads`) | Kanban drag between stages, convert to booking, activities |
| | Customers + 360 view (`customers`, `customer`) | CRUD, tier/miles/wallet adjustments (audited), bookings, tickets, notes, export |
| | Payments & refunds (`payments`) | List/filter, reconcile bank transfers, approve refunds, gateway logs |
| | Coupons & offers (`coupons`) | CRUD, usage stats, countdown offers |
| Catalogue | Holiday packages (`tours`, `tour-edit`) | Tabs: basic, itinerary repeater (drag), pricing tiers + departures calendar, gallery, inclusions, policy, **SEO**, publish/feature switches, preview link |
| | Cruises (`cruises`) | Ships, sailings, cabins, ports |
| | Activities (`activities`) | Options, slots generator, languages, meeting point |
| | Hotels, flights (mock inventory), insurance, gift cards | CRUD (new admin pages in the same design language) |
| | Themes & destinations (`themes`) | CRUD + ordering, featured flags, things to do |
| | Visa desk (`visa`) | Products and document sets; application queue with stages, document verification, ETA, SMS on stage change |
| Content | Reviews moderation (`reviews`) | Approve/hide/reply |
| | Pages, blog & banners (`cms`) | Page builder (sections: add, reorder, toggle, edit per schema), blog posts, categories, banners, FAQs, testimonials, team, stats, careers, gallery |
| | Menus (new) | Drag-and-drop tree for header, mega-menu, footer and mobile |
| | SEO manager (new) | Per-page meta table, redirects, robots, sitemap preview, JSON-LD override |
| | Translations (new) | UI strings grid EN/BN with missing-translation filter; import/export JSON |
| | Media library (`media`) | Upload (drag-drop, multi), folders, alt text EN/BN, credit, crop focal point, usage |
| Partners | B2B agents (`agents`) | CRUD, commission, credit limit, statements, API keys |
| Team | Staff + permissions (`staff`) | Users, roles, the permission matrix as in the mockup |
| | Support tickets (`tickets`) | Inbox, assign, reply, internal notes, SLA badges |
| | Notifications (`notifications`) | Templates EN/BN per channel, campaigns (segment, schedule, send test) |
| Settings | Settings (`settings`) | Company, licences, contact, socials, SEO defaults, currencies/rates, payments (gateway credentials, sandbox/live), email/SMS, modules on/off, analytics, cookie banner, maintenance |
| | Audit log (`logs`) | Filter by user, entity and action; diff viewer |

## 8. Traveller portal: in Next.js (D3)

**Why Next.js:**
1. The portal pages share the public header, footer, fonts and theme.
2. A single customer app means one design system and one deploy.
3. The admin is staff-only and benefits from Inertia's server-driven forms.
4. The portal consumes the same API a future mobile app will, which proves the API early.

**Authentication: a backend-for-frontend (BFF) with Sanctum tokens.** These are robust with SSR and avoid cross-site cookie and CSRF issues.
1. `POST /[lang]/api/auth/login` (a Next.js route handler) calls Laravel `POST /api/v1/auth/login` (password) or `/auth/otp/verify` (SMS OTP).
2. Laravel returns a Sanctum token with scopes and a 30-day expiry.
3. Next.js stores it in an `httpOnly; Secure; SameSite=Lax` cookie. Browser JavaScript never sees the token.
4. Server components and server actions call Laravel with `Authorization: Bearer`. `proxy.ts` (Next 16 middleware) guards `/[lang]/account/*`.
5. Logout revokes the token. A session list in Settings shows active tokens, and each can be revoked.
6. **Alternative:** Sanctum SPA cookie mode on a shared parent domain. It works, but is more fragile across localhost ports and SSR.

**Portal pages (15):** dashboard, bookings, booking detail (tabs, cancel with refund estimate), e-ticket/voucher, visa tracker + uploads, trips (saved plans), wallet, payments/instalments (pay now), referrals, travellers, notifications, support (tickets + chat), reviews, profile, settings.

## 9. REST API (`/api/v1`)

Conventions:
- JSON, with Laravel API Resources and the envelope `{ data, meta, links }`.
- `?lang=en|bn` (or the `Accept-Language` header) returns localised fields; `?all_locales=1` is for admin and mobile.
- Cursor and page pagination; filters as `filter[x]=`; `sort=-price`.
- ETag and `Cache-Control` on public GETs.
- Rate limits: 120/min per IP for public endpoints, 10/min for auth and OTP.
- The OpenAPI 3.1 spec is generated (Scribe), published at `/docs/api`, and versioned with the code.

| Area | Endpoints |
|---|---|
| Bootstrap | `GET /site` (settings, menus, languages, currencies, translations hash), `GET /translations/{lang}`, `GET /redirects` |
| CMS | `GET /pages/{slug}` (with sections), `GET /home`, `GET /faqs?category=`, `GET /testimonials`, `GET /team`, `GET /stats`, `GET /banners?placement=`, `GET /gallery`, `GET /careers`, `GET /careers/{slug}` |
| Blog | `GET /posts`, `GET /posts/{slug}`, `GET /blog-categories` |
| Catalogue | `GET /destinations`, `/destinations/{slug}`, `/themes`, `/themes/{slug}`, `/tours` (filters: region, destination, theme, category, price, days, rating, cancellation; sort), `/tours/{slug}`, `/tours/{slug}/departures`, `/cruises`, `/cruises/{slug}`, `/activities`, `/activities/{slug}`, `/activities/{slug}/slots?date=`, `/hotels`, `/hotels/{slug}`, `/visas`, `/visas/{slug}`, `/offers`, `/insurance-plans`, `/gift-card-designs` |
| Search | `GET /search?q=` (typeahead across products), `GET /flights/search` (mock supplier adapter), `GET /hotels/search` |
| Reviews | `GET /{type}/{slug}/reviews` (summary histogram + categories + list) |
| Planner | `GET /planner/config`, `POST /planner/estimate`, `POST /planner/quote` (creates a lead) |
| Checkout | `POST /cart/quote` (re-prices server-side), `POST /coupons/validate`, `POST /bookings` (creates a pending booking), `POST /bookings/{ref}/pay` (returns the gateway redirect), `GET /bookings/{ref}/status` |
| Payment callbacks | `POST /payments/{gateway}/ipn`, `GET /payments/{gateway}/return` (verifies the signature, idempotent) |
| Forms | `POST /inquiries` (contact/custom/group/insurance/careers), `POST /newsletter` (CAPTCHA: Cloudflare Turnstile) |
| Auth | `POST /auth/register`, `/auth/login`, `/auth/otp/send`, `/auth/otp/verify`, `/auth/forgot`, `/auth/reset`, `/auth/logout`, `GET /auth/me` |
| Me (portal) | `GET/PATCH /me`, `/me/bookings`, `/me/bookings/{ref}`, `POST /me/bookings/{ref}/cancel` (refund estimate preview + confirm), `/me/bookings/{ref}/documents`, `/me/travellers` CRUD, `/me/visa-applications` (+ document upload), `/me/wallet` (+ top-up), `/me/miles`, `/me/payments`, `/me/instalments/{id}/pay`, `/me/referrals`, `/me/notifications` (+ mark read), `/me/tickets` CRUD + messages, `/me/reviews` CRUD, `/me/wishlist` CRUD, `/me/trip-plans` CRUD, `/me/sessions` (list/revoke), `/me/settings` |
| B2B (phase 2) | `/b2b/*` with API-client keys: catalogue with net prices, create booking on credit, statements |

## 10. Auth and RBAC

| Area | Approach |
|---|---|
| Staff | Laravel session auth on `/admin` (separate guard). **2FA (TOTP) required** for admin roles, login throttling, optional IP allow-list |
| Permissions | spatie/laravel-permission with names like `bookings.view`, `bookings.refund`, `tours.publish`, `settings.payments`. Enforced in Policies, the admin sidebar and the API. The mockup's permission matrix becomes the real editor |
| Travellers | Email+password or phone+OTP (SMS) through the API. Optional Google sign-in later |
| Agents | Agent role + `agent_users`. B2B API through `api_clients` with scoped tokens |
| Auditing | All admin writes go to `activity_log` with a diff. Money actions (refund, wallet or miles adjust) need a permission and a reason |

## 11. Internationalisation (bn/en)

| Area | Approach |
|---|---|
| URLs | `/en/...` and `/bn/...`; `/` detects the language (cookie, then Accept-Language, then default `en`), exactly as the mockup does. Slugs are shared across languages (Latin slugs, as in the mockup) so hreflang pairs are 1:1 |
| Content | Bilingual JSON columns. The admin form shows EN and BN inputs side by side, with a "missing BN" indicator and a filter |
| UI strings | The `translations` table is exported to Next.js as JSON per language and cached with the tag `translations` |
| Formatting | Bangla digits, South Asian grouping (৳ 1,45,000), Bangla month names. The mockup's helpers are ported to `lib/format.ts` and `app/Support/Format.php`, with unit tests |
| Fonts | `next/font/local`; Bangla font loaded on `bn` routes only (as in the mockup) |
| Admin | The admin itself is bilingual (EN/BN), as in the mockup |

## 12. Media and uploads

| Area | Approach |
|---|---|
| Upload pipeline | spatie/laravel-medialibrary. Uploads are validated (MIME sniffing, max 10 MB images and 5 MB documents, image dimensions) |
| Image versions | Conversions generated on the queue: `thumb 400`, `card 800`, `hero 1600`, `og 1200x630`, in WebP + AVIF + JPEG fallback, with a responsive srcset |
| Next.js images | Uses a **custom `next/image` loader** that points to the pre-generated conversions, so there is no double optimisation and no Node image CPU on the VPS |
| Storage | `public` disk locally and on the VPS. Switching to S3/Cloudflare R2 is a `.env` change |
| Private documents | Passports and visa documents go on a **private** disk and are served through short-lived signed URLs, never publicly |
| Metadata | Alt text EN/BN, credit and a focal point for each image. The mockup's Wikimedia credits are imported |

## 13. Payments, email and SMS

**Payment gateway interface:** `initiate(Booking, amount) → redirect URL`, `handleIpn(Request)`, `verify(txn)`, `refund(Payment, amount)`.

| Driver | Local / test | Production |
|---|---|---|
| `mock` | A simulated gateway page (success / fail / cancel buttons), as in the Hajj project | Disabled |
| `sslcommerz` | **Sandbox** (sandbox.sslcommerz.com) with test store credentials; validates `val_id` through the Validation API | Live store ID/password from you |
| `bkash` | Tokenized Checkout **sandbox** (grant token, create, execute, query, refund) | Merchant app key/secret |
| `nagad` | Sandbox (RSA-signed init/complete) | Merchant ID + keys |
| `bank_transfer` | Manual: upload slip; admin reconciles | Same |
| `wallet` / `miles` | Internal ledgers | Same |

**Payment rules:**
- Amounts are always recomputed server-side.
- IPNs are idempotent (`unique(gateway, gateway_txn)`) and every request/response is logged.
- Deposits (30%) and instalments come from settings.
- Refunds follow the cancellation policy rules.
- Credentials live in encrypted settings or `.env` and are never sent to the frontend.

**Email:**
- Laravel Mail: Mailpit locally (already in Laragon); SMTP, SES or Postmark in production.
- Messages are queued and bilingual, using templates from `notification_templates`.
- Booking confirmations, vouchers and invoices go out as PDF attachments.

**SMS:** an `SmsGateway` interface with drivers `log` (local), `bulksmsbd`, `ssl_wireless` and `twilio`. OTPs are hashed and expire after 5 minutes, with a maximum of 5 attempts.

**WhatsApp:** a click-to-chat link now; the WhatsApp Business API is phase 2.

## 14. Caching and on-demand revalidation

| Area | Approach |
|---|---|
| Next.js fetch | Every API call goes through `lib/api.ts` → `fetch(url, { next: { tags: [...] , revalidate: 3600 } })` (or the Next 16 `"use cache"` + `cacheTag()` + `cacheLife()`) |
| Tags | `site`, `menus`, `translations`, `home`, `page:{slug}`, `tours`, `tour:{slug}`, `destination:{slug}`, `cruises`, `activities`, `hotels`, `visas`, `offers`, `posts`, `post:{slug}`, `reviews:{type}:{slug}`, `redirects` |
| Admin save | A model observer queues `RevalidateFrontend(tags)`, which POSTs to `FRONTEND_URL/api/revalidate` with an HMAC signature. Next.js calls `revalidateTag(tag, 'max')`. Related tags fire too: saving a tour also revalidates `tours`, `home` and its destination. A "Purge all" button in Settings handles emergencies |
| Rendering | Catalogue detail pages are statically generated via `generateStaticParams` and revalidated by tag. Listing filters run as dynamic search params backed by cached API calls. Prices and availability on detail pages are a small client island fetched live, so prices are never stale |
| Laravel | Redis cache for `GET /site`, menus, translations, home and dashboards, flushed by the same observers. HTTP ETag on public endpoints |
| CDN | Cloudflare caches `/_next/static`, media and fonts with immutable caching; HTML is honoured per `Cache-Control` |

## 15. SEO strategy (Next.js)

**Metadata and indexing**
- `generateMetadata` per route, from `seo_meta`, with fallbacks to the entity fields and then the settings defaults.
- Every page gets: title template, description, canonical, `alternates.languages` (en, bn, x-default), Open Graph and Twitter tags, and robots.
- Portal, checkout, search and auth pages are `noindex`. The mockup's rules carry over.

**Structured data:** JSON-LD from server components:
- Organization/TravelAgency (from settings) and WebSite + SearchAction
- BreadcrumbList
- TouristTrip/Product + Offer + AggregateRating for tours, cruises and activities
- Hotel, FAQPage, BlogPosting, JobPosting, ItemList on listings

**Sitemaps**
- `app/sitemap.ts` produces a sitemap index split by type and language, with `xhtml:link` alternates and `lastmod` from `updated_at`.
- `robots.ts` comes from settings, and an image sitemap is included.

**Redirects and URL hygiene**
- Redirects come from the `redirects` table, managed in admin and applied in `proxy.ts`.
- Old mockup `.html` URLs are 301-redirected to clean URLs. For example, `/en/tours/maldives-honeymoon.html` goes to `/en/tours/maldives-honeymoon`.

**Core Web Vitals targets** (mobile, field data): LCP < 2.5 s, CLS < 0.05, INP < 200 ms.
- Server components by default, with minimal client JS.
- `next/font` with preload (the mockup's CLS fix), and a priority hero image with correct `sizes`.
- AVIF/WebP images.
- The mockup's lesson is kept: carousels have `scroll-padding`, so no auto-scroll ends LCP recording.
- **Lighthouse CI budgets:** Performance ≥ 90 mobile on home, tour and listing pages; SEO, A11y and BP = 100.

**Content quality**
- Unique bilingual titles and descriptions, required in the admin with length counters and a live Google-snippet preview.
- Image alt text is required.
- An internal-links block feeds related tours and destinations.
- A Google Search Console verification field, plus GA4/GTM IDs, in settings.
- Analytics are loaded only after cookie consent.

## 16. Testing strategy (same depth as the mockup)

| Layer | Tool | What it covers | Gate |
|---|---|---|---|
| Backend unit + feature | **Pest 4** (+ PHPUnit 12), in-memory SQLite + MySQL CI job | Models, pricing, coupons, cancellation refund maths, instalments, payment drivers (mock + recorded sandbox fixtures), IPN idempotency, OTP, policies/permissions per role, every API endpoint (shape snapshots), admin Inertia props, observers dispatching revalidation | 100% of endpoints; ≥ 80% services coverage |
| Static analysis | Larastan level 6, Pint, ESLint, `tsc --noEmit` | | 0 errors |
| Frontend unit | **Vitest** + Testing Library | Format helpers (Bangla digits, ৳ grouping), i18n, SEO builders (metadata/JSON-LD), components, BFF auth handlers | |
| Admin unit | Vitest | Resource engine, forms, tables | |
| E2E | **Playwright** against seeded e2e stack (Laravel `--env=e2e` with its own DB + Next prod build) | Port of the mockup's 38 + 26 E2E tests, plus: real checkout → mock gateway → confirmed; sandbox SSLCommerz flow (manual/CI-optional); admin edits a tour → public page updates after revalidation; translations edit; menu reorder; media upload; RBAC (sales can't refund) | All pass |
| Responsive matrix | Playwright | All public + portal + admin routes × 320/375/414/768/1024/1280/1440/1920 × light/dark × en/bn: overflow, console errors, failed requests, broken images, one h1, meta/canonical/hreflang, JSON-LD validity | 0 issues |
| **Visual fidelity** | Playwright screenshot diff **Next.js vs mockup** (same viewport, seeded data = mockup data) | Key pages at 375/1440, both themes | ≤ 0.5% pixel diff per page (documented exceptions only) |
| Accessibility | @axe-core/playwright | WCAG 2.2 A/AA on all page types, both themes and languages | 0 violations |
| Performance/SEO | Lighthouse CI | Home, listing, tour, cruise, activity, blog post, portal, admin | Budgets in §15 |
| Security | `composer audit`, `npm audit`, OWASP ZAP baseline scan on staging | | No high/critical findings |

**Safety rules carried over from the Hajj project:**
- E2E runs only on `database/e2e.sqlite` or a dedicated `musafir_e2e` DB, and the runner refuses to start if `DB_*` OS variables are set.
- Tests run on a frozen clock.
- Unset `APP_ENV` before `php artisan test` (a CSRF gotcha).
- Tailwind runs with `source(none)` and explicit sources, so builds are reproducible.

CI on GitHub Actions runs PHP tests, JS tests, a build, E2E on Linux Chrome, and Lighthouse CI on each PR.

## 17. Security

The backend follows the **OWASP ASVS L2** baseline:
- validation via FormRequests
- mass-assignment guards
- policies on every model
- rate limits
- CSRF on admin
- a strict CORS allow-list (frontend origin only)
- Sanctum token scopes and expiry

**Data protection**
- Passport and NID fields are encrypted (Laravel encrypted casts), and documents sit on a private disk.
- PII is masked in logs.
- Card data is never stored; hosted gateway pages keep PCI scope out of the system.

**Headers and input handling**
- Nginx sends HSTS, CSP (nonce-based in Next.js), X-Frame-Options, Referrer-Policy and Permissions-Policy.
- Uploads are scanned by type and served with `Content-Disposition` for documents.
- HTML from the rich-text editor is sanitized (HTMLPurifier).

**Admin protection:** 2FA, login alerts, session timeout, an optional IP allow-list, and an audit log on all writes.

**Operations**
- Secrets live in `.env` with 600 permissions; payment credentials are encrypted at rest.
- Daily encrypted DB and media backups go off-site, with a monthly restore test.
- Dependency updates arrive via Dependabot, and Next.js security releases are applied within 48 h. The Next.js team shipped several out-of-band security releases in Aug–Oct 2026, so this matters.

## 18. Milestones and honest estimates

These estimates are in **focused build days** (about 6–8 h of hands-on agent work each). Calendar time is longer because of your reviews and sandbox credentials. Each milestone ends with tests passing and a delivery to `F:\projects\tour_travel` that you can run.

| # | Milestone | Deliverable | Estimate |
|---|---|---|---|
| M0 | Scaffolding | Monorepo; Laravel 13 + Sanctum + Inertia/React admin shell; Next 16 app; shared tokens package; lint/test/CI skeleton; local run verified on your PC | 1 day |
| M1 | Database + seeders | All migrations (§5), models, enums, factories; exporter from the mockup data; all seeders (§6); `migrate:fresh --seed` < 60 s; ERD regenerated | 2–3 days |
| M2 | API v1 | Public + auth + me + checkout endpoints, resources, filters, rate limits, OpenAPI docs, Pest tests | 3 days |
| M3 | Next.js public site | Layout/header/mega-menu/footer from the menus API, home page builder sections, all listing/detail pages (tours, destinations, themes, cruises, activities, hotels, flights, visas, offers, blog, CMS pages, team, careers, gallery, FAQ, reviews, contact, planner, compare, wishlist), i18n, SEO (metadata, JSON-LD, sitemaps), revalidation endpoint; visual diff vs mockup ≤ 0.5% | 5–6 days |
| M4 | Checkout + payments | Booking flow (4 steps), coupons, deposit/instalments, mock + SSLCommerz/bKash/Nagad sandbox drivers, IPN, confirmation, emails/SMS (Mailpit/log), PDFs | 2–3 days |
| M5 | Traveller portal | BFF auth (password + OTP), all 15 portal pages wired to the API | 3 days |
| M6 | Admin panel | Resource engine + all modules in §7 (bookings, leads, customers, payments, coupons, catalogue editors, visa desk, reviews, CMS/page builder, menus, SEO manager, translations, media, agents, staff/permissions, tickets, notifications/campaigns, settings, audit log, dashboard, reports), each with revalidation hooks | 6–8 days |
| M7 | Hardening | Security headers, 2FA, backups, performance tuning to Lighthouse budgets, accessibility fixes, content-editing QA | 2 days |
| M8 | Full test campaign | E2E (≥ 100 tests), responsive matrix, axe, visual diff, Lighthouse CI; `TEST_REPORT.md` | 2–3 days |
| M9 | Deployment kit | Nginx/PHP-FPM/PM2/Supervisor configs, deploy script (zero-downtime symlink releases), GitHub Actions deploy, runbook; staging deploy if you provide a VPS | 1–2 days |
| | **Total** | | **≈ 27–34 build days** (realistically **6–8 calendar weeks** with reviews) |

**Suggested delivery checkpoints:**
- After **M3**: a dynamic public site running on your PC with seeded data.
- After **M6**: the full system.
- After **M8/M9**: ready for production.

## 19. Local run roadmap (Windows + Laragon, on your PC)

**One-time setup**
1. Start Laragon, then click **Start All** (MySQL, and optionally Redis and Mailpit).
2. Create the database. Open Laragon, then **Database** (HeidiSQL), and create:
   - `musafir` (utf8mb4_unicode_ci), plus `musafir_e2e` for tests.
   - Or, in the Laragon terminal, run: `mysql -u root -e "CREATE DATABASE musafir CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci"`.
3. Set up the backend:
   ```
   cd /d F:\projects\tour_travel\backend
   composer install
   copy .env.example .env
   php artisan key:generate
   ```
   Then edit `.env`:
   - `DB_CONNECTION=mysql`, `DB_DATABASE=musafir`, `DB_USERNAME=root`, `DB_PASSWORD=`
   - `APP_URL=http://127.0.0.1:8000`, `FRONTEND_URL=http://localhost:3000`
   - `REVALIDATE_SECRET=<random>`, `MAIL_HOST=127.0.0.1`, `MAIL_PORT=1025` (Mailpit)
   - `QUEUE_CONNECTION=database`, `CACHE_STORE=database` (or `redis` with `REDIS_CLIENT=predis`)

   Then run:
   ```
   php artisan migrate:fresh --seed
   php artisan storage:link
   npm install && npm run build
   ```
4. Set up the frontend:
   ```
   cd /d F:\projects\tour_travel\frontend
   npm install
   copy .env.example .env.local
   ```
   In `.env.local`, set `API_URL=http://127.0.0.1:8000/api/v1`, `REVALIDATE_SECRET=<same value>` and `NEXT_PUBLIC_SITE_URL=http://localhost:3000`.

**Daily run** (three terminals, or `npm run dev:all` at the repo root using `concurrently`):

| Terminal | Command |
|---|---|
| A | `cd backend && php artisan serve` (API + admin at http://127.0.0.1:8000/admin) |
| B | `cd backend && php artisan queue:work` (emails, SMS log, image conversions, revalidation) |
| C | `cd frontend && npm run dev` (http://localhost:3000/en) |

- Admin hot reload is optional: `cd backend && npm run dev`.
- Production-like check: `cd frontend && npm run build && npm start`.

**Optional pretty domains:**
- Add Laragon nginx vhosts `api.musafir.test` (pointing at `backend\public`) and `musafir.test` (proxy to `:3000`) in `C:\laragon\etc\nginx\sites-enabled\`.
- Laragon's "auto virtual hosts" only covers `C:\laragon\www`, so a manual vhost file is needed for F:.

**Tests**
```
cd backend && php artisan test
cd frontend && npm test
cd e2e && npm install && npx playwright install chromium && npx playwright test
```

**Reset demo data:** `php artisan migrate:fresh --seed`.

## 20. Production deployment plan

### Recommended: one VPS (D2)

**Provision**
- Ubuntu 24.04, 2 vCPU / 4 GB RAM / 80 GB SSD (about US$12–24/month), for example DigitalOcean/Vultr Singapore, Hetzner, AWS Lightsail Mumbai, or a BD data centre.
- Point DNS for `musafir.com.bd`, `www`, `api` and `admin` at it, ideally through Cloudflare.

**Base packages**
- nginx, `php8.3-fpm` (or 8.4 from the ondrej PPA) with the mysql, mbstring, intl, gd, imagick, zip, bcmath, redis and curl extensions
- composer, Node 22 LTS + PM2, mysql-server 8.4, redis-server 7, supervisor, certbot, ufw, fail2ban, unattended-upgrades

**Users and directories**
- A `deploy` user.
- Code layout: `/var/www/musafir/{releases/<ts>, shared/{backend/.env, storage, frontend/.env.production}, current → releases/<ts>}`.

**Nginx**

| Host | Routing |
|---|---|
| `api.` and `admin.` (or `musafir.com.bd/admin`) | PHP-FPM, root `backend/public` |
| `musafir.com.bd` | Proxy to `127.0.0.1:3000` (Next.js); `/_next/static` and `/media` served directly with immutable caching |

- Gzip/Brotli and HTTP/2 enabled; security headers.
- TLS via certbot with auto-renewal, or Cloudflare origin certificates.

**Processes**
- PM2 runs `next start` (cluster of 2) and starts on boot (`pm2 startup`).
- Supervisor runs `php artisan queue:work redis --tries=3 --max-time=3600` (×2). Horizon is optional, since this is Linux.
- Cron: `* * * * * php artisan schedule:run`. This covers instalment reminders, FX rate refresh, sitemap pings, backups and pruning.

**Deploy script** (`deploy/deploy.sh`, or GitHub Actions over SSH), zero downtime:
1. Clone into a new release directory.
2. `composer install --no-dev -o`, `npm ci && npm run build` (admin), `php artisan migrate --force`, `config:cache route:cache view:cache event:cache`.
3. Build the frontend: `npm ci && npm run build`.
4. Switch the `current` symlink.
5. Run `php artisan queue:restart` and `pm2 reload musafir-web`.
6. Health checks.
7. Keep the last 5 releases for instant rollback.

**First go-live**
- `php artisan migrate --force` and `db:seed --class=ProductionSeeder`: roles, settings, languages, CMS skeleton. No demo bookings or users.
- Optionally import demo content.
- Create the first super admin with `php artisan musafir:admin`.

**Backups and monitoring**
- Nightly `mysqldump` plus a media sync to off-site storage (Backblaze B2 or R2), kept for 30 days.
- UptimeRobot, Sentry (Laravel + Next.js), log rotation, and a disk alert.

**Go-live checklist**
- Real licence numbers and contacts entered in Settings.
- Live gateway credentials, after a sandbox → live smoke test with a ৳10 transaction.
- SMTP/SMS credentials.
- Search Console + sitemap submitted, GA4.
- 301 map from any old site.
- Robots allowed on production only; staging stays `noindex` with basic auth.

### Alternatives

| Option | How it works | Trade-offs |
|---|---|---|
| **B. Split hosting** | Next.js on **Vercel** (ISR and CDN built in); Laravel on cPanel or a small VPS | Very easy frontend ops and great performance. Costs more as traffic grows (Vercel Pro about US$20/month); data leaves BD; two vendors |
| **C. cPanel shared hosting only** | Laravel admin + API run fine (the `public_html` → `public` trick; cron for the queue). Next.js only if the host offers "Setup Node.js App" (Passenger), and even then ISR, memory and long-running processes are unreliable | Not recommended for an SEO-critical SSR site. Possible fallback: Next.js `output: 'export'` (fully static, rebuilt on publish), which loses on-demand ISR and live prices on pages |
| **D. Docker** | Docker Compose (nginx, php-fpm, node, mysql, redis, worker) on any VPS | Reproducible, but needs more RAM, and your PC has no Docker |

## 21. Risks and mitigations

| Risk | Impact | Mitigation |
|---|---|---|
| Pixel fidelity drift when porting Tailwind 3 → 4 | Design differs from the approved mockup | Shared tokens + v3-compat base layer; **automated visual diff vs mockup**; Tailwind 3.4 fallback |
| Scope size (about 40 public templates, 15 portal pages, 30 admin modules) | Schedule slip | Schema-driven admin resources; milestone deliveries; build the most valuable modules first (catalogue, CMS, bookings, payments) |
| Payment gateway onboarding (merchant KYC can take weeks) | Can't take real money at launch | Sandbox drivers from day 1; bank transfer + manual confirmation as a fallback; start merchant applications now |
| SMS and email deliverability in BD | OTP failures | Two SMS drivers with fallback; email OTP alternative; SPF/DKIM/DMARC |
| No live supplier APIs (flights, hotels) | Flight and hotel search is mock or curated inventory only | Adapter interfaces + inquiry/quote flow; choose a GDS/bed-bank in phase 2 |
| Bangla full-text search quality in MySQL | Weak search results | ngram FULLTEXT + LIKE fallback; Meilisearch via Scout when needed |
| Next.js security cadence (frequent out-of-band releases) | Exposure | Dependabot + 48 h patch SLA; WAF |
| Your PC's 7.9 GB RAM when running everything plus Playwright | Slow local tests | Run E2E with 2 workers locally; heavy suites in CI |
| Shared-hosting choice (if picked) | No SSR/ISR | Recommend a VPS (D2); a static-export fallback is documented |
| Content entry workload (real photos, licences, prices) | Launch delay | All mockup content pre-seeded so you only edit; CSV import for tours/hotels |

## 22. Decisions that need you

Each has a recommended default.

1. **Database:** MySQL 8.4 (already on your PC; standard hosting) or PostgreSQL. *Default: MySQL 8.4.*
2. **Hosting target:** a VPS (Nginx + PHP-FPM + Node/PM2 + MySQL + Redis), Vercel + VPS/cPanel, or cPanel only. *Default: a single Ubuntu VPS.* If you already have a cPanel plan, tell me its provider and whether it offers "Setup Node.js App".
3. **Traveller portal location:** in Next.js (Sanctum token BFF) or in Laravel (Inertia). *Default: Next.js.*
4. **Admin URL:** `admin.musafir.com.bd` (subdomain) or `musafir.com.bd/admin`. *Default: `admin.` subdomain* (cleaner isolation and cookies).
5. **Customer login methods for v1:** email+password and phone OTP via SMS (needs an SMS provider; logged locally until then). Google sign-in in v1? *Default: email/password + phone OTP; Google later.*
6. **Payment gateways at launch:** SSLCommerz + bKash + Nagad (all sandbox until you have merchant accounts). *Default: all three + bank transfer.*
7. **Repo location:** keep the mockup at the root of `F:\projects\tour_travel` and add `backend/`, `frontend/` and `e2e/` beside it. *Default: yes.* Should I also initialise Git and push to a GitHub repo? *Default: local Git only until you give me a repo.*
