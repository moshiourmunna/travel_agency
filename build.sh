#!/usr/bin/env bash
# Rebuild the Musafir mock: HTML (Jinja) -> site/, CSS (Tailwind) -> site/assets/css/app.css
set -e
cd "$(dirname "$0")"
python3 src/build.py
cp src/js/app.js site/assets/js/app.js
mkdir -p site/assets/vendor && cp tooling/node_modules/chart.js/dist/chart.umd.min.js site/assets/vendor/
cd tooling && npx tailwindcss -c tailwind.config.js -i ../src/app.css -o ../site/assets/css/app.css --minify 2>&1 | grep -v "^$" | tail -2
