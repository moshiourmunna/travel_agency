# Musafir: test report

- **Final run:** 26 Oct 2026, 00:33–00:59 (Asia/Dhaka / Bishkek, UTC+6), using `tooling/run_all.sh`. The full log is in `tests/run_all.log`.
- **Environment:** Playwright 1.64.1 + Google Chrome 156 (headless); axe-core 4.13.0 via @axe-core/playwright; Lighthouse 12.8.2.
- **How pages are loaded:**
  - Pages load from **file://**, exactly as you will open them on your PC.
  - Lighthouse runs over HTTP, against `tooling/gzserve.py` (a static server with gzip and caching that approximates production hosting).

## Summary: all green

| Suite | Scope | Result |
|---|---|---|
| Internal links & assets (`links.py`) | Every `href`/`src` in all 306 pages + root pages | **0 missing targets** |
| Page sweep (`qa.mjs all`) | All **306 pages** (153 EN + 153 BN) at 375 px and 1440 px = 612 loads | **0 issues** |
| Responsive matrix (`qa.mjs matrix`) | 28 key public pages × EN/BN × **8 widths** (320/375/414/768/1024/1280/1440/1920) × light/dark = 896 loads | **0 issues** |
| App matrix (`qa.mjs appmatrix`) | All 80 portal + admin pages (EN/BN) × 8 widths × light/dark = 1,280 loads | **0 issues** |
| Accessibility, public (`axe.mjs`) | 33 public templates × EN/BN × light/dark = 132 scans, WCAG 2.0/2.1 A + AA | **0 violations** |
| Accessibility, app (`AXE_SET=app axe.mjs`) | 40 portal/admin pages × EN/BN × light/dark = 160 scans | **0 violations** |
| E2E, public (`e2e.mjs`) | 38 interaction & persistence tests | **38 / 38 pass** |
| E2E, portal + admin (`e2e-app.mjs`) | 26 tests | **26 / 26 pass** |
| Lighthouse | 7 pages × mobile + desktop = 14 audits | A11y **100** ×14 · Best practices **100** ×14 · SEO **100** on all public pages |

**What every page load checks:**
- no horizontal overflow (document scrollWidth ≤ viewport)
- no console errors or page errors
- no failed local requests
- no broken images
- every `<img>` has `alt`
- exactly one `<h1>`
- valid JSON-LD
- `<title>`, meta description and canonical present

## E2E coverage
**Public site (38 tests):**
- Language and preferences:
  - Root redirects to /en
  - EN→BN toggle, and the language persists (root → bn)
  - Theme toggle, persisted across pages
  - Currency switch to USD converts prices, persists on the next page, and switches back to BDT
- Listings:
  - Cruise region filter and price sort
  - Activity category chip filter
- Booking flow:
  - Activity guest stepper updates the total
  - Activity → booking hydrates the summary; cruise cabin select recalculates; cruise → booking hydrates the summary
  - Checkout validation blocks an empty traveller form; the coupon `CRUISE10` reduces the total; mock payment → confirmation
- Trip planner:
  - Days default, day stepper, and experiences revealed for a destination
  - The luxury tier raises the budget; a maximum of 4 destinations is enforced
  - A saved plan restores after reload; the quote dialog submits
- Wishlist and compare: wishlist empty and filled states; compare shows 2 selected columns.
- Login: OTP send is blocked without a phone number; the OTP step is shown; verify → account; tabs switch.
- Other pages:
  - FAQ search
  - Gift-card preview with Bangla digits
  - Offers countdown ticks
  - Contact form validation
- Mobile and errors: the mobile drawer opens and closes on Escape; zero console errors across the run.

**Portal + admin (26 tests):**
- Admin:
  - Admin login → dashboard; 3 Chart.js charts render and re-render on theme toggle
  - Bookings: status filter, search, header search `?q=` prefilter, sort with `aria-sort`, select-all + bulk bar, delete with confirm dialog
  - Mobile: the sidebar becomes a drawer (Escape closes it); the bookings table becomes cards
  - Leads kanban: move a card to the next stage
  - Switches toggle `aria-checked`; the language switch keeps the page
- Portal:
  - Booking tabs; cancel dialog with refund estimate; trip countdown
  - Bookings filter; notifications filter
  - Support chat; profile validation; wallet top-up dialog; copy referral code
- Cross-cutting: the theme persists from the portal to admin; `/` focuses the admin search; zero console errors.

## Lighthouse (gzip server; mobile = simulated slow 4G + 4× CPU)

| Page | Mobile perf | Desktop perf | A11y | BP | SEO | Mobile LCP / CLS |
|---|---|---|---|---|---|---|
| en/index (home) | 88 | 100 | 100 | 100 | 100 | 3.5 s / 0 |
| bn/index (home) | 87 | 100 | 100 | 100 | 100 | 3.8 s / 0.001 |
| en/tours/maldives-honeymoon | 86 | 99 | 100 | 100 | 100 | 4.1 s / 0 |
| bn/cruises/greek-isles-turkey | 73 | 99 | 100 | 100 | 100 | 5.3 s / 0 |
| en/activities | 82 | 98 | 100 | 100 | 100 | 4.7 s / 0 |
| en/account/index (portal) | 80 | 99 | 100 | 100 | 69* | 5.0 s / 0 |
| en/admin/index | 95 | 100 | 100 | 100 | 69* | 2.9 s / 0 |

\* The portal and admin are `noindex` **on purpose** (private areas), and Lighthouse's SEO score penalises that. This is expected, not a defect.

**Notes on mobile performance:**
- The remaining mobile cost is large hero photos (Wikimedia JPEGs) plus the Tailwind CSS bundle.
- In production (Next.js), expect higher scores from: Next/Image (AVIF/WebP, responsive `srcset`), CSS splitting, HTTP/2 and a CDN.
- On the plain, uncompressed `python -m http.server`, mobile home scores were 69 (EN) / 55 (BN); that difference is the effect of hosting alone.

## Issues found by testing and fixed (whole project)

| # | Found by | Issue | Fix |
|---|---|---|---|
| 1 | axe | Colour contrast: emerald-600, rose-600, dark-mode ink-400/500, active chip brand-600 (4.44:1) | Moved to 700 shades / lighter dark tones; all ≥ 4.5:1 |
| 2 | axe | `aria-label` on a plain div (hotel stars); visa `dl` structure invalid | `role="img"`; `dl` → `ul` |
| 3 | QA matrix | Portal visa/wallet overflow at 375 px (grid blowout) | `.card { min-width: 0 }` |
| 4 | QA appmatrix | Admin leads: 500 px document overflow (sr-only spans escaping the kanban scroller) | `relative` on scrollers and table wrappers |
| 5 | QA appmatrix | Admin payments: 7 px overflow at 320 px (big KPI money values) | `overflow-wrap:anywhere` + smaller KPI type on mobile |
| 6 | Visual review | Desktop admin bookings table too wide; filter chips cut off | Low-priority columns hidden below xl/2xl; toolbar stacks until 2xl |
| 7 | E2E | Data-table result count included the mobile card duplicates | Count only rows outside the card list |
| 8 | E2E app | The mobile drawer didn't close on Escape until focus had moved inside it | Global Escape handler for open drawers |
| 9 | Lighthouse | **Mobile home: NO_LCP** (performance unmeasurable). The deals carousel (`snap-mandatory` + `scroll-smooth` + `px-4` without scroll-padding) triggered an automatic snap-scroll on load, which ends LCP recording | `scroll-px-4` on all snap carousels (home ×4, tour gallery, admin kanban); hero copy no longer fades in |
| 10 | Lighthouse | Heading order h1 → h3 on the activities/tours/hotels/cruises listings | Visually hidden `h2` before each results grid |
| 11 | Lighthouse | Footer app-store links: aria-label didn't match the visible text | Removed the redundant aria-labels |
| 12 | Lighthouse | **CLS 0.163 on Bangla home** (Hind Siliguri font swap) | Preload the Bangla (400/700) and Latin fonts: CLS 0.001 |
| 13 | QA all / E2E (regression from #12) | `<link rel=preload crossorigin>` is blocked by CORS under **file://**, causing console errors | Preloads are injected by a tiny inline script only over http(s). file:// is clean and hosted pages keep the CLS fix |
| 14 | Content audit | Leftover religious wording (a Hajj-group line in the BN app promo, "prayer breaks", "halal-friendly travel", etc.) | Rewritten to neutral travel copy. The "Halal" airline-meal option is kept, per your decision |

**One transient result, not a defect:** in run #2, a single matrix load (`bn/flights.html`, 1440 px, dark) hit the 30 s navigation timeout while the box was under load. It passed on the immediate re-run and again in the final run.

## Re-running
```bash
cd tooling
python3 gzserve.py 8766 ../site &     # for Lighthouse
./run_all.sh                          # about 25 minutes; writes tests/*.json and tests/run_all.log
```

**Raw results:**
- `tests/qa-all.json`, `qa-matrix.json`, `qa-appmatrix.json`
- `tests/axe.json`, `axe-app.json`
- `tests/e2e.json`, `e2e-app.json`
- `tests/lh/*.json` (open them in https://googlechrome.github.io/lighthouse/viewer/)
