import { chromium } from 'playwright';
const sites = process.argv.slice(2);
const b = await chromium.launch({ executablePath: '/usr/bin/google-chrome', args:['--no-sandbox'] });
await Promise.all(sites.map(async (u) => {
  const p = await b.newPage({ viewport: { width: 1440, height: 900 } });
  const name = new URL(u).hostname.replace(/^www\./,'');
  try {
    await p.goto(u, { waitUntil: 'domcontentloaded', timeout: 45000 });
    await p.waitForTimeout(5000);
    await p.screenshot({ path: `../research/shots/${name}.jpg`, quality: 50, type:'jpeg' });
    await p.screenshot({ path: `../research/shots/${name}-full.jpg`, quality: 35, type:'jpeg', fullPage: true });
    console.log('ok', name);
  } catch (e) { console.log('fail', name, e.message.slice(0,80)); }
}));
await b.close();
