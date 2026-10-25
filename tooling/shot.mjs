// usage: node tooling/shot.mjs <url> <out.png> [width] [dark] — full-page screenshot with Chrome
import { chromium } from 'playwright';
const [url, out, w = '1440', dark] = process.argv.slice(2);
const b = await chromium.launch({ executablePath: '/usr/bin/google-chrome', args: ['--no-sandbox'] });
const p = await b.newPage({ viewport: { width: +w, height: 900 }, colorScheme: dark ? 'dark' : 'light' });
const errs = [];
p.on('console', (m) => m.type() === 'error' && errs.push(m.text()));
p.on('pageerror', (e) => errs.push('PAGEERROR ' + e.message));
await p.addInitScript(() => { try { localStorage.setItem('musafir-consent', JSON.stringify({ analytics: false, marketing: false, at: 1 })); } catch {} });
await p.goto(url, { waitUntil: 'load', timeout: 60000 });
await p.evaluate(async () => { for (let y = 0; y < document.body.scrollHeight; y += 600) { window.scrollTo(0, y); await new Promise((r) => setTimeout(r, 40)); } window.scrollTo(0, 0); });
await p.waitForTimeout(1500);
await p.screenshot({ path: out, fullPage: true });
console.log(JSON.stringify({ url, height: await p.evaluate(() => document.body.scrollHeight), errors: errs }));
await b.close();
