#!/usr/bin/env bash
# Post-fix verification after the font-preload change (head.html), sequential.
cd "$(dirname "$0")"; L=../tests/run_post.log; : > $L
f(){ echo "=== $* ($(date +%H:%M:%S))" >> $L; "$@" 2>&1 | grep -v "dbus\|^\[pid" | tail -4 >> $L; }
f python3 links.py
f node qa.mjs all
f node qa.mjs matrix
f node axe.mjs
AXE_SET=app f node axe.mjs
f node e2e.mjs
f node e2e-app.mjs
mkdir -p ../tests/lh-gzip; rm -f ../tests/lh-gzip/*.json
for u in en/index.html bn/index.html en/tours/maldives-honeymoon.html bn/cruises/greek-isles-turkey.html en/activities.html en/account/index.html en/admin/index.html; do
  for ff in mobile desktop; do
    o=../tests/lh-gzip/${ff}_$(echo $u | tr / _).json; extra=""; [ $ff = desktop ] && extra="--preset=desktop"
    CHROME_PATH=/usr/bin/google-chrome timeout 180 npx lighthouse http://localhost:8766/$u $extra --quiet --output=json --output-path=$o --chrome-flags="--headless=new --no-sandbox" >/dev/null 2>&1
    python3 -c "import json;d=json.load(open('$o'));a=d['audits'];print('LHgz','$ff','$u',{k:round(v['score']*100) for k,v in d['categories'].items()},'LCP',a['largest-contentful-paint']['displayValue'],'CLS',a['cumulative-layout-shift']['displayValue'])" >> $L 2>&1
  done
done
echo "=== DONE $(date +%H:%M:%S)" >> $L
