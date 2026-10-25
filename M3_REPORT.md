# M3 report: the dynamic Next.js public site

Checked on 26 Oct 2026 at about 05:15–05:35 (Asia/Dhaka, UTC+6), on your PC DESKTOP-JL5D1F4 at `F:\projects\tour_travel`.

## Status
**M3 works on your PC.** The public website (Next.js 16) is built and runs against the Laravel 13 API and your Laragon MySQL `musafir` database. Every page is filled from the database: 111 pages per language, English and Bangla.

## What works
- **Every public page from the mockup**, in English (`/en`) and Bangla (`/bn`), filled with data from the database:
  - home (18 CMS sections)
  - tours: listing with filters, sort, view, paging and compare; tour detail
  - destinations, holidays and themes, cruises, activities (with a live slot picker), hotels, flights search, visa
  - offers, insurance, gift cards, group tours, custom tour, trip planner (live estimate and quote), compare, wishlist
  - blog and posts, about, team, careers (CV upload), gallery, reviews, FAQ, contact
  - legal pages, HTML sitemap, image credits, brand sheet, a localised 404 page, and the login, register and reset screens
- **SEO:** each page has its own title, description, canonical and hreflang. JSON-LD covers tours, posts and FAQs. `sitemap.xml` and `robots.txt` come from the database. Pages are pre-rendered (SSG), except the listings that depend on URL filters.
- **Forms** go to the database as inquiries and CRM leads: contact, visa, planner quote, booking request, newsletter and careers. Each has validation, a honeypot and rate limits.
- **Light and dark mode** follow the system setting or the toggle. The site works from 320 to 1920 px.
- **Edits show on the site:** changing a tour in the database and then calling `/api/revalidate` puts the change on the live page within about 6 s.

## How to run it (as verified on the PC)
Start Laragon (MySQL), then use two terminals:
```
cd F:\projects\tour_travel\backend
php artisan serve --host=127.0.0.1 --port=8000
```
```
cd F:\projects\tour_travel\frontend
npm run start
```
- Website: http://localhost:3000 (redirects to http://localhost:3000/en), Bangla at http://localhost:3000/bn
- API health: http://127.0.0.1:8000/api/v1/health
- XML sitemap: http://localhost:3000/sitemap.xml

These one-time steps are already done on your PC: `composer install`, `migrate --seed`, `storage:link`, `npm ci`, the frontend `npm run build`, and now the admin assets (`npm ci && npm run build` in `backend`). If you reseed, or change frontend code, run `npm run build` in `frontend` again while the API is running. The full guide is `docs/LOCAL_SETUP.md`.

## Logins (password `password`)
- **Staff:** admin@musafir.test, sales@, reservations@, visa@, support@, accounts@, content@ (all `@musafir.test`)
- **Traveller:** farhana@example.com
- **B2B agent:** agent@example.com

These accounts are seeded, but there is nothing to sign in to yet. The admin panel arrives in M6. Traveller sign-in arrives in M5; until then the login page shows "accounts opening soon".

## Test results
| Check | Where | Result |
|---|---|---|
| Backend tests (Pest: API, seeders, M3 page APIs) | PC, PHP 8.3.30 + MySQL 8.4.3 | **64 passed, 553 assertions** (126 s) |
| Backend tests | box | 64 passed |
| HTTP smoke: health, /, /en, /bn, tours, hotels, flights, visa, blog, contact, sitemap, robots, 404 | PC | all return the expected status (200, 307 for `/`, 404 for the missing page) |
| Headless Chrome on the PC (`tooling/pc/pc_smoke.mjs`): 13 pages × desktop 1440 and mobile 390, plus dark mode. Checks status, h1, `lang`, horizontal overflow, broken images, console errors | PC, Chrome | **27/27 passed**. No overflow, no broken images, no JS errors. The only console message is the expected 404 on the 404 page |
| Content edit → public page (tour title changed in the DB, revalidated, then reverted) | PC | change visible after about 6 s; revert visible too |
| Route and internal-link sweep (222 pages, en + bn) | box | 222/222 return 200, no broken internal links |
| Overflow check at 320/360/390/768, en + bn | box | clean |
| Visual parity vs mockup at 1440 | box | same page height on nearly all pages (about ±8 px). Reviews and credits differ only because the database has more items |

Fixed during this check:
- `backend/public/build` (admin assets) was missing on the PC, so `/admin/health` returned 500. Built it there and added the step to LOCAL_SETUP.md.
- `backend/tests/Unit` was missing on the PC (an empty folder is not copied), so `php artisan test` stopped. Created it and added `.gitkeep`.
- LOCAL_SETUP.md now covers: keeping the API window open, using `npm ci`, the path to Laragon's mysql client, and the delay before an edit shows up.

All test servers on the PC were stopped afterwards. Laragon's MySQL was left running as it was.

## Known gaps (planned for later milestones)
- No admin panel yet (M6). Saving content does not trigger a page refresh automatically yet; M6 adds that hook on every admin save. For now a refresh needs `cache:clear` plus a `POST /api/revalidate`.
- No booking checkout or payments yet. `/booking` is an interim booking-request form (M4).
- No traveller sign-in or portal yet. `/account/*` redirects to the login page (M5).
- Pixel-diff ≤ 0.5% vs mockup, Lighthouse, axe and the full responsive matrix are run in M8. M3 checked page height, overflow and screenshots only.
- `php artisan serve` handles one request at a time on Windows. Pages refresh in the background, so after an edit the first visitor can see the old page for a few seconds. A Laragon vhost makes it faster (see LOCAL_SETUP.md).
