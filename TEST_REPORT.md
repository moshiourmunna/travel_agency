# Musafir — test report (M8)

- **Box run:** 1 Nov 2026, 05:40–06:05 (Asia/Dhaka, UTC+6), Ubuntu box, PHP 8.4, MySQL 8, Node 22, headless Chrome.
  Fresh demo seed. Commit `25b0b04` and later. Raw outputs are in `tests/reports/`.
- **Re-run everything:** `/workspace/m8_run.sh` (box), or run the suites one at a time (commands below). E2E data cleanup: `php artisan musafir:e2e-cleanup`.
- The pre-build static mock-up report (26 Oct) is still in git history (`git show bd2734e:TEST_REPORT.md`).

## Box results: all green

| Suite | Scope | Result |
|---|---|---|
| Pest (`backend: ./vendor/bin/pest`) | API, checkout and payments, portal, admin RBAC and CRUD, 2FA, security headers, uploads, queue, seeds | **162/162 tests**, 3,067 assertions |
| Site E2E (`tooling/tests/site_e2e.mjs`) | search → listing, sort/view, language switch keeps query, theme persists, currency, wishlist, tour detail and lightbox, contact form (validation + submit), newsletter, 404, mobile drawer, booking sheet, no page errors | **14/14** |
| Portal E2E (`portal_e2e.mjs`) | sign-in, OTP two-step, every /account page and its writes | **78/78** |
| Checkout E2E (`checkout_e2e.mjs`) | 4-step checkout for tour/hotel/visa/flight/gift card × bKash/Nagad/SSLCommerz/card/bank slip, coupons, confirmation | **52/52** |
| Admin E2E (`admin_e2e.mjs`) | each staff role makes a real change → visible on site/portal via revalidation, then restored; 2FA set-up/challenge/recovery | **30/30** |
| Admin crawl, all 7 staff roles (`admin_crawl.mjs <email>`) | every nav page + first edit + create page; owner 169, editor 116, manager 106, support 22, agent 22, finance 17, visa 8 | **460 pages, 0 errors**; RBAC-hidden pages were not reachable |
| Responsive matrix (`matrix.mjs`) | 11 key pages × 320/375/768/1024/1440/1920 × light/dark × en/bn: status, lang, theme, overflow, header/h1/footer, console errors | **264/264 loads** |
| Accessibility (`axe_check.mjs`, axe-core WCAG 2.1 A/AA) | 29 pages × light/dark × en/bn × desktop/mobile | **232/232 scans, 0 violations** |
| Broken links (`links_check.mjs`) | 214 pages → every internal link, image (all srcset variants), CSS and JS | **754 URLs, 0 broken** (12 external origins not fetched) |
| SEO (`seo_check.mjs`) | every sitemap URL: 200, title, description, canonical = loc, hreflang en/bn/x-default, html lang, one h1, og:image, valid JSON-LD, no noindex | **208/208**. 12 warnings: short meta descriptions, which are content and editable in Admin → SEO |
| Lighthouse mobile (`lighthouse.mjs … mobile`) | 10 key pages, simulated slow 4G | perf: /en 91, /en/tours 93, tour detail 93, destinations 95, visa 95, blog 93, contact 94, faq 98, hotels 94, **/bn 85** · a11y / best practices / SEO **100 on all** |
| Lighthouse desktop | same 10 pages | perf **98–100**; a11y / best practices / SEO **100** |

Notes
- /bn mobile performance is 85 because the Bengali webfont (2 × 70 KB, preloaded, `font-display: optional`) competes with the hero image on simulated slow 4G. Desktop scores 99.
- Lighthouse scores vary by ±3 between runs on the box. The first run gave /en 88 and /bn 71, with the box busy; a re-run on an idle box gave the numbers above. A single desktop /en/hotels run failed to load and scored 99 on re-run.
- Fixed during M8: home scrollers were not keyboard-focusable; the About stats had low contrast; the 404 page lost its `<title>` after hydration; and slugs created after the build returned 404 (`dynamicParams`).

## PC results (DESKTOP-JL5D1F4, Windows, Laragon PHP 8.3 / MySQL 8.4, Chrome)
_Filled in after the final sync — see below._

## How to run
```bash
# servers (box/PC): backend :8000, frontend :3000
cd backend && php -d upload_max_filesize=12M -d post_max_size=14M artisan serve --host=127.0.0.1 --port=8000
cd frontend && npm run build && npm run start
# tests
cd backend && ./vendor/bin/pest                       # uses DB musafir_test
cd tooling && node tests/site_e2e.mjs && node tests/portal_e2e.mjs && node tests/checkout_e2e.mjs
node tests/admin_e2e.mjs && node tests/admin_crawl.mjs admin@musafir.test
node tests/matrix.mjs && node tests/axe_check.mjs && node tests/links_check.mjs && node tests/seo_check.mjs
node tests/lighthouse.mjs http://localhost:3000 mobile
cd backend && php artisan musafir:e2e-cleanup          # remove rows the E2E suites created
```
`CHROME=<path to chrome.exe>` on Windows. `portal_e2e` expects the demo seed state (run it on a fresh seed).
