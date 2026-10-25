import { chromium } from 'playwright';
const b = await chromium.launch({ executablePath: '/usr/bin/google-chrome', args: ['--no-sandbox'] });
const p = await b.newPage({ viewport: { width: 412, height: 823 } });
await p.addInitScript(() => { window.__l = []; new PerformanceObserver(l => l.getEntries().forEach(e => window.__l.push([e.entryType, e.name, e.startTime|0, e.size]))).observe({ entryTypes: ['largest-contentful-paint','paint','layout-shift','first-input','event'] }); });
await p.goto('http://localhost:8765/' + process.argv[2], { waitUntil: 'load' }); await p.waitForTimeout(2000);
console.log(JSON.stringify(await p.evaluate(() => [document.visibilityState, window.__l])));
await b.close();
