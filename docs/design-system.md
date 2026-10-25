# Musafir design system

**Source of truth:**
- Tokens: `tooling/tailwind.config.js`.
- Component classes: `src/app.css` (`@layer components`).
- Template macros: `src/templates/ui.html` (public) and `src/templates/app/ui.html` (portal and admin).
- The live brand sheet is at `site/en/brand.html`.

## 1. Brand
- **Name:** Musafir / মুসাফির ("traveller").
- **Mark:** a rounded-square tile with an **"M" drawn as two hills with the sun rising between them, over a dotted journey trail**, in teal with an amber sun. It is neutral, with no religious symbolism.
- **Logo files** (`logo/`):

  | File(s) | Use |
  |---|---|
  | `logo.svg` / `logo-dark.svg` | Horizontal, for light and dark backgrounds |
  | `logo-stacked*.svg` | Stacked |
  | `logo-compact*.svg` | Compact |
  | `icon.svg`, `icon-teal.svg`, `icon-white.svg` | Icon only |
  | `png/icon-16…1024.png`, `png/logo-*.png` | PNG exports |
  | `favicon.ico` (16/32/48) | Favicon |

- **Clear space and minimum size:** keep clear space equal to the height of the sun on every side. The icon's minimum size is 24 px (16 px favicon exception); the full logo's minimum width is 96 px.

## 2. Colour

| Token | Hex | Use |
|---|---|---|
| brand-700 | `#0D6B65` | Primary buttons, links, active nav (white text = 6.6:1) |
| brand-500 | `#14A497` | Accents, charts, focus glow |
| brand-50/950 | `#EEFBF8` / `#052B29` | Tinted surfaces (light / dark) |
| accent-500 | `#EE8418` | Sun, deals, CTAs on dark, highlights (use accent-700 for text on white) |
| gold-500 | `#C9A13F` | Loyalty tiers, premium badges |
| ink-900 / ink-950 | `#0B1B2B` / `#07131F` | Text (light mode) / page background (dark mode) |
| ink-500 | `#475569` | Muted text in light mode (dark mode uses ink-300) |
| Semantic | emerald-700 / amber-700 / rose-700 / sky-700 | Success / warning / danger / info text (all ≥ 4.5:1) |

**Dark mode:**
- Implemented with the `class` strategy. The `html.dark` class is set before first paint by an inline script that reads `localStorage['musafir-theme']`, falling back to `prefers-color-scheme`.
- Surfaces are ink-950 (page), ink-900 (cards) and ink-800 (inputs).
- Every text/background pair passes axe colour-contrast in both themes.

## 3. Typography
- **Latin:** Plus Jakarta Sans (200–800, variable).
- **Bangla:** Hind Siliguri (400/500/600/700).
- **Display serif (hero accents):** Fraunces.
- All fonts are self-hosted WOFF2 with `font-display: swap` and unicode-range subsets, so Bangla glyphs load only on Bangla pages.
- `html[lang=bn]` raises the line height (1.75) and drops the negative letter-spacing.
- **Type scale:**
  - Display: `text-4xl`–`text-6xl` extrabold, with `text-balance`
  - Section heading `.h-section`: `text-2xl`–`text-4xl`
  - `.lead`: `text-lg`
  - Body: 16 px
  - Small/meta: `text-sm` / `text-xs` with `.muted`
- **Numerals and money:**
  - `bdt()` formats with South Asian grouping (৳ 1,45,000).
  - `digits()` converts to Bangla numerals on `/bn/`; dates use Bangla month names.
  - The currency switcher (BDT/USD/EUR) is display-only and remembered in `localStorage`.

## 4. Layout and breakpoints
- **Container:** max-width 1320 px; padding 16 px (mobile), 20 px (sm), 32 px (lg).
- **Breakpoints:** xs 400 · sm 640 · md 768 · lg 1024 · xl 1280 · 2xl 1536 · 3xl 1800.
- **Tested widths:** 320, 375, 414, 768, 1024, 1280, 1440, 1920.
- **Spacing:** a 4-px base unit; sections use `py-14 md:py-20` (`.section`).
- **Radius:** inputs and buttons `rounded-xl`; cards `rounded-2xl`; hero panels `rounded-4xl`.
- **Shadows:** `soft` (resting), `lift` (hover or raised) and `glow` (focus ring).
- **Grid safety:** `.card` has `min-w-0` so long content can't blow out grid tracks.

## 5. Components

| Group | Classes / macros |
|---|---|
| Buttons | `.btn` + `.btn-primary`, `.btn-accent`, `.btn-outline`, `.btn-ghost`, `.btn-white`, `.btn-dark`, `.btn-gold`, `.btn-danger`; sizes `.btn-sm` and `.btn-lg`; `.icon-btn` (44 × 44 touch target) |
| Badges and chips | `.badge-{brand,accent,gold,green,red,blue,purple,gray}`; `.chip` / `.chip.is-active` (filters); `cancel_badge()` (free / partial / non-refundable) |
| Forms | `.label`, `.input` (input, select and textarea share it), `.check`, `.switch` (`role=switch` + `aria-checked`), `.is-invalid` + `.field-error` (live validation), `.kbd` |
| Navigation | `.nav-link`, mega-menu, `.side-link` (app sidebar), `.tab` / `.tab-pill` / `.tab-line` (ARIA tabs with arrow keys), `crumbs()`, `pagination()`, `.skip-link` |
| Cards | `tour_card`, `cruise_card`, `activity_card`, `dest_card`, `hotel_card`, `review_card` (+ `wish_btn`, `stars`), `reviews_summary` (score, histogram, category bars) |
| Content | `sec_head`, `page_hero`, `faq_list` (details/summary), `.prose-m`, `.eyebrow` |
| App UI | `page_head`, `kpi`, `status` (booking-status badge map), `kind_chip`, `progress`, `avatar_i`, `rtable` (a table from `md` up, cards below `md`, sortable, check-all + bulk bar), `dt_tools` (search + filter chips + count), `row_menu`, `svg_bars`, Chart.js charts (theme-aware) |
| Overlays | Native `<dialog>` modals (`data-modal`), drawers (`data-drawer`: focus-trapped, Esc and backdrop close), toasts (`#toasts`, `aria-live`), confirm dialog, cookie consent |

## 6. Interaction patterns (`src/js/app.js`, about 52 KB unminified, no framework)
- **Theme and language:**
  - Theme toggle; settings persist in `localStorage`.
  - The language link keeps the same path, switching `/en/` ⇄ `/bn/`.
- **Browsing:**
  - Wishlist and compare (up to 3), persisted, with a header counter.
  - Listing filters, sort and view toggle, with an empty state.
  - Deal countdowns (`data-countdown`).
  - Gallery lightbox.
  - Trip-planner cost engine.
- **Booking:**
  - 4-step checkout with validation, promo codes (`MUSAFIR10`, `CRUISE10`) and the payment-method switch.
  - Summary hydrated from the query string.
- **Admin:**
  - Data tables: search (prefilled from `?q=`), filter chips, sort with `aria-sort`, live count, empty state, check-all and bulk actions, confirm-delete.
  - Kanban "move to next stage".
  - Support chat composer.
  - `/` focuses the admin search.
- **Motion:** respects `prefers-reduced-motion`.

## 7. Accessibility rules
- Target **WCAG 2.2 AA**; the axe-core run is clean on every page in both themes and both languages (see TEST_REPORT.md).
- One `h1` per page and a logical heading order; landmarks are header, nav, main and footer.
- A visible focus ring (`ring-brand-500`), a skip link, and touch targets of at least 44 px.
- Icons are `aria-hidden`, and icon-only buttons have `aria-label`.
- Images have meaningful `alt`; decorative ones use `alt=""`.
- Forms have labels, `aria-invalid` and `aria-describedby` errors, and `autocomplete` tokens.
- Tables use `scope`; sortable headers expose `aria-sort`; the mobile card view repeats column labels.

## 8. Voice and content
- Friendly, clear and practical. Use concrete numbers (৳, nights, hours) and avoid hype.
- The Bangla is written as natural Bangla copy, not a literal translation. Brand and place names follow common Bangladeshi spelling (কক্সবাজার, সাজেক, মালদ্বীপ).
- Imagery: real travel photography of landscapes, cities, beaches, cruises and people enjoying trips. No religious imagery.
