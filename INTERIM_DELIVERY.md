# Musafir (মুসাফির) — Interim delivery 1: public website

Delivered: 25 Oct 2026, ~20:35 (Asia/Dhaka). This is a static, clickable design mock with no backend.

## How to open it
Open `site/index.html` (or `site/en/index.html` / `site/bn/index.html`) in Chrome or Edge, directly from disk. No server is needed.

## What is in this delivery
- **Scope:** a general tour & travel agency. All Hajj/Umrah content and religious imagery have been removed.
- **Logo:** a neutral "M + sun" mark with the tagline "HOLIDAYS · CRUISES · VISA".
  - Files: `logo/*.svg`, `logo/png/*`, `logo/favicon.ico`.
  - Brand sheet: `site/en/brand.html`.
- **Public site:** 232 HTML pages, 116 in English and 116 in Bangla.
  - Home, tours (list + detail), destinations, holidays + 6 themes, cruises + 6, activities + 12, trip planner, flights, hotels, visa, booking and checkout, confirmation/invoice.
  - Offers with live countdowns, blog + 6 posts, gallery, about, team, contact, FAQ (searchable), reviews, careers, terms/privacy/refund, custom tour, insurance, group tours, gift cards, compare, wishlist, login/register/forgot (OTP demo), credits, HTML sitemap, 404.
- **Working features:**
  - Bangla/English toggle, persistent light/dark mode, currency switcher (BDT/USD/EUR; the rates are demo values).
  - Filters and sorting, wishlist, compare, trip planner (saved locally), countdowns, cancellation badges, reviews summary.
- **SEO:**
  - Canonical and hreflang tags, Open Graph, JSON-LD (TravelAgency, Product/TouristTrip, FAQPage, BlogPosting, JobPosting, BreadcrumbList).
  - `sitemap.xml`, `robots.txt`, web manifest.

## Tests run on this build (results in `tests/`)
- **Internal links and images:** 0 missing.
- **Every page** at 375 px and 1440 px in EN and BN (464 page loads): 0 issues (no horizontal overflow, console errors or broken images).
- **Responsive matrix:** 28 key pages × 8 widths (320–1920) × light/dark × EN/BN = 896 loads, 0 issues.
- **Interaction tests:** 38 of 38 passed (language, theme and currency persistence, filters, wishlist, compare, planner, OTP, forms, drawer, tabs, lightbox).
- **Accessibility (axe-core):** 33 pages × EN/BN × light/dark = 132 scans, 0 violations after fixes.
- **Lighthouse** (local server, mobile throttling): Accessibility 99–100, Best Practices 100, SEO 100, Performance 70–74.
  - Performance is low only because the local test server sends files uncompressed. Production hosting with compression and a CDN will lift it.

## Still to come (delivery 2)
User portal (currently a placeholder page), admin portal, docs (architecture, PostgreSQL ERD, page inventory, design system), the rewritten research.md, the full TEST_REPORT.md, and the remaining screenshots.
