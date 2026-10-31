# Musafir — deployment checklist

Two apps: **backend** (Laravel 13 API + admin, PHP) and **frontend** (Next.js 16 site, Node). Works on a VPS, cPanel/shared hosting or a PaaS.
No Redis, root or supervisor needed: cache, sessions and queue use the database, and cron drains the queue.

## Requirements
- [ ] PHP ≥ 8.3 with `pdo_mysql mbstring openssl gd|imagick fileinfo zip bcmath curl` (+ `intl` recommended), MySQL 8 / MariaDB 10.6+
- [ ] Node ≥ 20 for the site (cPanel "Setup Node.js App", PaaS or any VPS)
- [ ] Two hostnames, e.g. `musafir.com.bd` → frontend and `api.musafir.com.bd` → backend (the admin can share the API host or use its own `ADMIN_DOMAIN`)
- [ ] HTTPS on both

## Backend
- [ ] Document root = `backend/public`. If the host can't change it, point the docroot at `backend/` and the bundled `backend/.htaccess` forwards everything to `public/`.
- [ ] No composer or node on the host? Build on any machine with `scripts/package-release.sh`, upload `dist/musafir-backend-*.tar.gz`, then run the deploy script with `SKIP_COMPOSER=1`.
- [ ] `cp .env.example .env`, then set:
  - `APP_URL`, `APP_ENV=production`, `APP_DEBUG=false`
  - `DB_*`
  - `FRONTEND_URL`, `REVALIDATE_SECRET` (same value in both apps)
  - `MAIL_*`, SMS/payment keys (`PAYMENT_MODE=live` only once the gateways are configured)
  - `TRUSTED_PROXIES` (`*` behind a PaaS/CDN)
  - `ADMIN_DOMAIN` / `ADMIN_PATH`, `ADMIN_2FA_REQUIRED_ROLES=owner,finance` (recommended)
- [ ] `bash scripts/deploy-backend.sh`. It runs composer, generates `APP_KEY` on the first deploy, builds admin assets if missing, `migrate --force`, `storage:link` and `optimize`.
- [ ] First deploy only: `php artisan db:seed --force` for roles, settings and the demo catalogue. Then change the seeded staff passwords, or delete the demo staff accounts.
- [ ] Cron, once: `* * * * * cd /path/backend && php artisan schedule:run >> /dev/null 2>&1`. The schedule runs the queue as well.
- [ ] Optional, VPS only: a real worker (`php artisan queue:work --tries=3`, via systemd or supervisor), plus `QUEUE_VIA_SCHEDULE=false`.
- [ ] Hosts that block symlinks: set `PUBLIC_DISK_ROOT=/abs/path/backend/public/storage` instead of using `storage:link`.
- [ ] Writable: `storage/`, `bootstrap/cache/`
- [ ] After changing the media variant sizes: `php artisan media-library:regenerate --only-missing`

## Frontend
- [ ] `cp .env.example .env.local`, then set:
  - `API_URL` (the backend URL as the Node server sees it)
  - `NEXT_PUBLIC_SITE_URL`
  - `REVALIDATE_SECRET`
  - `MEDIA_ORIGINS` (only when media is served from another origin or a CDN)
- [ ] With the backend reachable: `bash scripts/build-frontend.sh`. Pages are pre-rendered from the API (if the API can't be reached, the build still passes and pages render on first request), and admin edits refresh them instantly through `/api/revalidate`.
- [ ] Run it:
  - VPS: `npm run start` (`PORT=3000`) behind nginx/Apache, kept alive by pm2 or systemd
  - cPanel/Passenger/PaaS: build with `NEXT_OUTPUT=standalone` and start file `.next/standalone/frontend/server.js`
  - Upload-only hosts: use `dist/musafir-frontend-*.tar.gz` from `scripts/package-release.sh`
- [ ] Rebuild after every frontend code change. Content changes don't need a rebuild.

## Web server notes
- [ ] Apache/LiteSpeed: the shipped `.htaccess` files cover rewrites, static caching and a sandbox CSP on `/storage`.
- [ ] nginx: `try_files $uri $uri/ /index.php?$query_string;`, and on `/build/` add `expires 1y; add_header Cache-Control "public, immutable";`. Proxy the site to `127.0.0.1:3000`.
- [ ] Upload limits: `upload_max_filesize=12M`, `post_max_size=14M` (the media library accepts up to 10 MB).

## Smoke check after deploy
- [ ] `https://<site>/en` and `/bn` return 200, and `/sitemap.xml` and `/robots.txt` list the production host
- [ ] `https://<api>/api/v1/site?lang=en` returns 200, and `/admin` → login (then 2FA for staff who have it)
- [ ] Save a setting in the admin: the site updates within seconds
- [ ] Place a test booking with `PAYMENT_MODE=sandbox`, and check the confirmation e-mail arrives (proves cron and the queue work)
