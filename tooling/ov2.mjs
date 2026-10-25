import { chromium } from 'playwright';
const b = await chromium.launch({ executablePath: '/usr/bin/google-chrome', args: ['--no-sandbox'] });
const pg = await b.newPage({ viewport: { width: +(process.argv[3]||375), height: 800 } });
await pg.goto('file:///workspace/musafir/site/' + process.argv[2]);
console.log(await pg.evaluate(() => { const sc = e => { for (let p = e.parentElement; p; p = p.parentElement) { const s = getComputedStyle(p); if (/(auto|scroll|hidden|clip)/.test(s.overflowX)) return true; } return false; };
  return [...document.querySelectorAll('body *')].filter(e => e.getBoundingClientRect().right > innerWidth + 1 && !sc(e)).slice(0, 8).map(e => e.tagName + '.' + String(e.className.baseVal ?? e.className).slice(0, 120) + ' r=' + Math.round(e.getBoundingClientRect().right) + ' ' + (e.textContent||'').slice(0,40)); }));
await b.close();
