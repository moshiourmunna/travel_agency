#!/usr/bin/env bash
# Final full test run, sequential (concurrent Chrome crashes). Lighthouse runs against gzserve.py on :8766 (gzip + caching, close to production).
cd "$(dirname "$0")"; L=../tests/run_all.log; : > $L
f(){ echo "=== $* ($(date +%H:%M:%S))" >> $L; "$@" 2>&1 | grep -v "dbus\|^\[pid" | tail -4 >> $L; }
f python3 links.py
f node qa.mjs all
f node qa.mjs matrix
f node qa.mjs appmatrix
f node axe.mjs
AXE_SET=app f node axe.mjs
f node e2e.mjs
f node e2e-app.mjs
mkdir -p ../tests/lh; rm -f ../tests/lh/*.json
for u in en/index.html bn/index.html en/tours/maldives-honeymoon.html bn/cruises/greek-isles-turkey.html en/activities.html en/account/index.html en/admin/index.html; do
  for ff in mobile desktop; do
    o=../tests/lh/${ff}_$(echo $u | tr / _).json
    extra=""; [ $ff = desktop ] && extra="--preset=desktop"
    CHROME_PATH=/usr/bin/google-chrome timeout 180 npx lighthouse http://localhost:8766/$u $extra --quiet --output=json --output-path=$o --chrome-flags="--headless=new --no-sandbox" >/dev/null 2>&1
    python3 -c "import json,sys;d=json.load(open('$o'));a=d['audits'];print('LH','$ff','$u',{k:(round(v['score']*100) if v['score'] is not None else None) for k,v in d['categories'].items()},'LCP',a['largest-contentful-paint'].get('displayValue'),'CLS',a['cumulative-layout-shift'].get('displayValue'))" >> $L 2>&1
  done
done
echo "=== DONE $(date +%H:%M:%S)" >> $L
