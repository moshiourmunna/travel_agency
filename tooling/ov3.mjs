import { chromium } from 'playwright';
const b = await chromium.launch({ executablePath: '/usr/bin/google-chrome', args: ['--no-sandbox'] });
const pg = await b.newPage({ viewport: { width: +(process.argv[3]||375), height: 800 } });
await pg.goto('file:///workspace/musafir/site/' + process.argv[2]);
await pg.evaluate(async () => { document.querySelectorAll('img[loading=lazy]').forEach(i => i.loading = 'eager'); await new Promise(r => setTimeout(r, 800)); });
console.log(await pg.evaluate(() => { const out=[document.documentElement.scrollWidth]; document.querySelectorAll('body *').forEach(e => { const r=e.getBoundingClientRect(); if (r.right > innerWidth+1 && r.width>0) { const s=getComputedStyle(e); if (/(auto|scroll|hidden|clip)/.test(s.overflowX) || s.position==='absolute') out.push(e.tagName+'.'+String(e.className.baseVal ?? e.className).slice(0,100)+' r='+Math.round(r.right)+' pos='+s.position+' ox='+s.overflowX); } }); return out.slice(0,10); }));
await b.close();
