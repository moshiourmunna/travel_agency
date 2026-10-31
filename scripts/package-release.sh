#!/usr/bin/env bash
# Build machine → upload-ready archives for hosts without composer/node build tools (e.g. cPanel shared hosting).
#   dist/musafir-backend-<sha>.tar.gz   backend incl. vendor/ (no-dev) and public/build — upload, add .env, run deploy-backend.sh SKIP_COMPOSER=1
#   dist/musafir-frontend-<sha>.tar.gz  Next standalone server (needs only Node ≥ 20 on the host)
# Reads committed code only (git archive); no .env files are included.
set -euo pipefail
ROOT=$(cd "$(dirname "$0")/.." && pwd); cd "$ROOT"
SHA=$(git rev-parse --short HEAD); OUT="$ROOT/dist"; TMP=$(mktemp -d); mkdir -p "$OUT"
git archive HEAD backend frontend packages | tar -x -C "$TMP"
( cd "$TMP/backend" && composer install --no-dev --optimize-autoloader --no-interaction --quiet && npm ci --no-audit --no-fund --silent && npm run build && rm -rf node_modules tests )
tar -czf "$OUT/musafir-backend-$SHA.tar.gz" -C "$TMP" backend
if [ -f frontend/.env.local ]; then cp frontend/.env.local "$TMP/frontend/.env.local"; fi   # build-time API_URL / site URL
( cd "$TMP/frontend" && npm ci --no-audit --no-fund --silent && NEXT_OUTPUT=standalone npm run build \
  && cp -r public .next/standalone/ && mkdir -p .next/standalone/.next && cp -r .next/static .next/standalone/.next/ && rm -f .next/standalone/.env.local )
tar -czf "$OUT/musafir-frontend-$SHA.tar.gz" -C "$TMP/frontend/.next" standalone
rm -rf "$TMP"; ls -lh "$OUT"/*"$SHA"*
