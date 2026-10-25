import { chromium } from 'playwright';
import fs from 'fs';
const sites = process.argv.slice(2);
const b = await chromium.launch({ executablePath: '/usr/bin/google-chrome', args:['--no-sandbox','--disable-blink-features=AutomationControlled'] });
const out = {};
for (let i = 0; i < sites.length; i += 4) {
  await Promise.all(sites.slice(i, i + 4).map(async (u) => {
    const ctx = await b.newContext({ viewport: { width: 1440, height: 900 }, userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0 Safari/537.36', locale: 'en-US' });
    const p = await ctx.newPage();
    const name = new URL(u).hostname.replace(/^www\./,'');
    try {
      await p.goto(u, { waitUntil: 'domcontentloaded', timeout: 45000 });
      await p.waitForTimeout(6000);
      for (let y = 0; y < 6; y++) { await p.mouse.wheel(0, 1200); await p.waitForTimeout(400); }
      await p.evaluate(() => window.scrollTo(0, 0));
      await p.screenshot({ path: `../research/shots/${name}.jpg`, quality: 50, type:'jpeg' });
      await p.screenshot({ path: `../research/shots/${name}-full.jpg`, quality: 30, type:'jpeg', fullPage: true }).catch(()=>{});
      out[name] = await p.evaluate(() => ({
        title: document.title,
        desc: (document.querySelector('meta[name=description]')||{}).content || '',
        nav: [...document.querySelectorAll('header a, nav a')].map(a => a.textContent.trim()).filter(Boolean).slice(0, 60),
        heads: [...document.querySelectorAll('h1,h2,h3')].map(h => h.textContent.trim().replace(/\s+/g,' ')).filter(Boolean).slice(0, 70),
        ld: [...document.querySelectorAll('script[type="application/ld+json"]')].map(s => { try { const j = JSON.parse(s.textContent); return [].concat(j).map(x => x['@type'] || (x['@graph']||[]).map(g=>g['@type'])).flat(); } catch(e) { return 'bad'; } }).flat(),
        hreflang: document.querySelectorAll('link[hreflang]').length,
        canonical: !!document.querySelector('link[rel=canonical]'),
        og: !!document.querySelector('meta[property="og:title"]'),
      }));
      console.log('ok', name, out[name].heads.length);
    } catch (e) { console.log('fail', name, e.message.slice(0,80)); }
    await ctx.close();
  }));
}
fs.writeFileSync('../research/extract2.json', JSON.stringify(out, null, 1));
await b.close();
