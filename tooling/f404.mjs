import { chromium } from 'playwright';
const b = await chromium.launch({ executablePath: '/usr/bin/google-chrome', args: ['--no-sandbox'] }); const p = await b.newPage({ viewport: { width: 1440, height: 900 } });
p.on('response', (r) => r.status() >= 400 && !r.url().includes('_rsc') && console.log(r.status(), r.url()));
await p.goto(process.argv[2], { waitUntil: 'load' });
await p.evaluate(async () => { for (let y = 0; y < document.body.scrollHeight; y += 600) { scrollTo(0, y); await new Promise((r) => setTimeout(r, 120)); } });
await p.waitForTimeout(800);
console.log(await p.evaluate(() => [...document.images].filter((i) => !i.complete || !i.naturalWidth).map((i) => i.currentSrc || i.src)));
await b.close();
