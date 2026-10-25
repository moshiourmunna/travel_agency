# Musafir (মুসাফির): tour and travel mock design

A high-fidelity, clickable frontend mock for **Musafir**, a Bangladesh-based tour and travel agency. It covers the public website, the traveller portal and the admin console. The whole site is bilingual (English/Bangla), with light and dark themes, and is responsive from 320 px to 1920 px+. This is the **design stage only**: there is no backend, and all data is dummy data in BDT.

## Open it
- **No server needed:** open `site/index.html` (or `site/en/index.html` / `site/bn/index.html`) in Chrome, Edge or Firefox.
- **Optional local server:** run `cd site && python -m http.server 8080`, then open http://localhost:8080/en/.
- **Portal and admin entry points:**
  - Traveller portal: `site/en/account/index.html` (or "Sign in" → any details).
  - Admin console: `site/en/admin/login.html` → "Sign in" (the fields are prefilled).

## What's inside

| Path | Contents |
|---|---|
| `site/` | The built static site: 153 pages × 2 languages = 306 pages + root index/404, assets, `sitemap.xml`, `robots.txt`, `manifest.webmanifest` |
| `logo/` | Logo SVGs (horizontal, stacked, compact, icon, light/dark), PNG exports, `favicon.ico`; brand sheet at `site/en/brand.html` |
| `research.md` | Competitive research (27 sites crawled), feature matrix, decisions, open questions |
| `research/` | Raw crawl data (`extract2.json`) and screenshots of the reference sites |
| `docs/architecture.md` | Target system architecture (Next.js App Router, PostgreSQL, Redis, payments, suppliers, SEO, security) |
| `docs/database.md` | PostgreSQL schema with a Mermaid ER diagram |
| `docs/sitemap.md` | Full page inventory |
| `docs/design-system.md` | Tokens, typography, components, interaction and accessibility rules |
| `TEST_REPORT.md` | Results of the automated test suite |
| `tests/` | Raw JSON test outputs + Lighthouse reports |
| `screenshots/` | Key screens (desktop/mobile, light/dark, EN/BN) |
| `src/` | Source: Jinja2 templates, data (`data_public.py`, `data_app.py`), CSS, JS, page builders |
| `tooling/` | Tailwind config, Playwright/axe/Lighthouse test scripts, image and logo scripts |
| `PROGRESS.md`, `INTERIM_DELIVERY.md` | Work log and the first (public-site) delivery note |

## Rebuild (developers)
Requirements: Python 3.11+ with Jinja2, and Node 18+.

```bash
cd tooling && npm install        # tailwindcss, playwright, axe-core, lighthouse, chart.js
cd .. && ./build.sh              # templates -> site/, CSS -> site/assets/css/app.css
```

Run the tests from `tooling/` (they need Chrome):

| Command | What it checks |
|---|---|
| `python3 links.py` | Every internal link and asset |
| `node qa.mjs all` / `node qa.mjs matrix` / `node qa.mjs appmatrix` | Overflow, console errors, images, meta |
| `node axe.mjs` / `AXE_SET=app node axe.mjs` | Accessibility |
| `node e2e.mjs` / `node e2e-app.mjs` | Interactions and persistence |
| `./run_all.sh` (with `python3 gzserve.py 8766 ../site &` running) | The whole suite + Lighthouse; see TEST_REPORT.md |

## Next step
Port to Next.js following `docs/architecture.md`. The templates map to React components, and the data files map to Prisma seed scripts.
