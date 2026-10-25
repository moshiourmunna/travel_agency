import { chromium } from 'playwright';
const b = await chromium.launch({ executablePath: '/usr/bin/google-chrome', args: ['--no-sandbox'] });
const pg = await b.newPage({ viewport: { width: +(process.argv[3]||375), height: 800 } });
await pg.goto('file:///workspace/musafir/site/' + process.argv[2]);
console.log(await pg.evaluate(() => [...document.querySelectorAll('body *')].filter(e => e.getBoundingClientRect().right > innerWidth + 1).slice(0, 8).map(e => e.tagName + '.' + String(e.className.baseVal ?? e.className).slice(0, 90) + ' w=' + Math.round(e.getBoundingClientRect().width))));
await b.close();
