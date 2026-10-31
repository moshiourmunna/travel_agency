#!/usr/bin/env bash
# Run on the server from anywhere: bash scripts/deploy-backend.sh   (no root, no Redis, no supervisor needed)
# Safe to re-run on every deploy. Never touches .env and never drops data (migrate --force only).
set -euo pipefail
cd "$(dirname "$0")/../backend"
PHP=${PHP:-php}
[ -f .env ] || { echo "backend/.env missing — copy .env.example, fill it, then: $PHP artisan key:generate"; exit 1; }
if [ -d vendor ] && [ "${SKIP_COMPOSER:-}" = 1 ]; then echo "• vendor/ kept (SKIP_COMPOSER=1)";
elif [ -n "${COMPOSER_CMD:-}" ]; then $COMPOSER_CMD install --no-dev --optimize-autoloader --no-interaction;
elif command -v composer >/dev/null 2>&1; then composer install --no-dev --optimize-autoloader --no-interaction;
elif [ -f composer.phar ]; then $PHP composer.phar install --no-dev --optimize-autoloader --no-interaction;
else [ -d vendor ] || { echo "composer not found and no vendor/ — upload a release built with scripts/package-release.sh"; exit 1; }; fi
if [ ! -f public/build/manifest.json ]; then
  command -v npm >/dev/null 2>&1 || { echo "public/build missing and no npm — upload a release built with scripts/package-release.sh"; exit 1; }
  npm ci --no-audit --no-fund && npm run build
fi
$PHP artisan down --retry=15 || true
$PHP artisan migrate --force
grep -q '^PUBLIC_DISK_ROOT=.\+' .env || [ -e public/storage ] || $PHP artisan storage:link
$PHP artisan optimize          # config + routes + views + events cache
$PHP artisan queue:restart || true
$PHP artisan up
echo "✓ backend deployed. Cron (once): * * * * * cd $(pwd) && $PHP artisan schedule:run >> /dev/null 2>&1"
