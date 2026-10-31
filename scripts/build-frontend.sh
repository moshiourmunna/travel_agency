#!/usr/bin/env bash
# Build the Next.js site. The Laravel API (API_URL in frontend/.env.local) should be reachable so pages are pre-rendered;
# if it is not, the build still succeeds and pages render on first request (ISR).
# NEXT_OUTPUT=standalone → also assembles .next/standalone (run: node .next/standalone/server.js, PORT/HOSTNAME env).
set -euo pipefail
cd "$(dirname "$0")/../frontend"
[ -f .env.local ] || [ -f .env.production ] || [ -n "${API_URL:-}" ] || { echo "frontend/.env.local missing — copy .env.example and fill it"; exit 1; }
npm ci --no-audit --no-fund
npm run build
if [ "${NEXT_OUTPUT:-$(grep -s '^NEXT_OUTPUT=' .env.local | cut -d= -f2)}" = standalone ]; then
  cp -r public .next/standalone/ && mkdir -p .next/standalone/.next && cp -r .next/static .next/standalone/.next/
  echo "✓ standalone server: node .next/standalone/server.js"
else echo "✓ built — start with: npm run start   (PORT=3000 default)"; fi
