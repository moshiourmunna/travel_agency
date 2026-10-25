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
