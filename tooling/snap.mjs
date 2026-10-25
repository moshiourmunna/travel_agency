// usage: node snap.mjs <path-under-site> <width> <light|dark> <out.jpg> [full]
import { chromium } from 'playwright';
const [p, w, theme, out, full] = process.argv.slice(2);
const b = await chromium.launch({ executablePath: '/usr/bin/google-chrome', args: ['--no-sandbox'] });
const ctx = await b.newContext({ viewport: { width: +w, height: +w < 800 ? 800 : 900 }, deviceScaleFactor: 1, colorScheme: theme === 'dark' ? 'dark' : 'light' });
await ctx.addInitScript(t => { try { localStorage.setItem('musafir-theme', t); localStorage.setItem('musafir-consent', '{"essential":true}'); } catch (e) {} }, theme);
const pg = await ctx.newPage();
const errs = [];
pg.on('console', m => { if (m.type() === 'error') errs.push(m.text()); });
pg.on('pageerror', e => errs.push(String(e)));
await pg.goto('file:///workspace/musafir/site/' + p, { waitUntil: 'load' });
await pg.evaluate(async()=>{for(let y=0;y<document.body.scrollHeight;y+=600){window.scrollTo(0,y);await new Promise(r=>setTimeout(r,60));}window.scrollTo(0,0);});
await pg.waitForTimeout(700);
await pg.screenshot({ path: out, fullPage: !!full, type: 'jpeg', quality: 60 });
const ov = await pg.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
console.log('overflow', ov, 'errors', errs.length, errs.slice(0, 5).join(' | '));
await b.close();
