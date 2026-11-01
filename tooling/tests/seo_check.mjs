// SEO crawl of every sitemap URL: status, <title>, description, canonical, hreflang (en/bn/x-default), <html lang>,
// one <h1>, og:image, valid JSON-LD (+ @type list), no accidental noindex. Usage: node seo_check.mjs [base]
const base = (process.argv[2] || process.env.SITE || 'http://localhost:3000').replace(/\/$/, '');
const xml = await (await fetch(`${base}/sitemap.xml`)).text();
const locs = [...xml.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1]);
const robots = await (await fetch(`${base}/robots.txt`)).text();
const problems = []; const warnings = []; const types = {}; let ok = 0;
const attr = (html, re) => (html.match(re) || [])[1];
const q = [...locs];
async function one(loc) {
  const url = loc.replace(/^https?:\/\/[^/]+/, base);
  const r = await fetch(url, { redirect: 'manual' });
  const p = [];
  if (r.status !== 200) { problems.push([loc, `status ${r.status}`]); return; }
  const h = await r.text();
  const lang = new URL(url).pathname.split('/')[1];
  if (!/<title>[^<]{5,}<\/title>/.test(h)) p.push('title');
  const desc = attr(h, /<meta name="description" content="([^"]*)"/); if (!desc) p.push('description'); else if (desc.length < 50) warnings.push([loc, `short description (${desc.length} chars)`]);
  const canon = attr(h, /<link rel="canonical" href="([^"]+)"/); if (canon !== loc) p.push(`canonical ${canon}`);
  for (const hl of ['en', 'bn', 'x-default']) if (!new RegExp(`<link rel="alternate" hrefLang="${hl}"`, 'i').test(h)) p.push(`hreflang ${hl}`);
  if (!h.includes(`<html lang="${lang}"`)) p.push('html lang');
  const h1 = (h.match(/<h1[\s>]/g) || []).length; if (h1 !== 1) p.push(`h1 x${h1}`);
  if (!/<meta property="og:image" content="/.test(h)) p.push('og:image');
  if (/<meta name="robots" content="[^"]*noindex/.test(h)) p.push('noindex');
  for (const m of h.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)) {
    try { const j = JSON.parse(m[1]); for (const n of [j, ...(j['@graph'] || [])]) for (const t of [].concat(n['@type'] || [])) types[t] = (types[t] || 0) + 1; } catch { p.push('json-ld parse'); }
  }
  if (p.length) problems.push([loc, p.join(', ')]); else ok++;
}
await Promise.all(Array.from({ length: 6 }, async () => { while (q.length) await one(q.shift()); }));
console.log(JSON.stringify({ base, sitemap_urls: locs.length, ok, problems: problems.length, warnings: warnings.length, robots_sitemap: /Sitemap: /.test(robots), jsonld_types: types }, null, 1));
for (const [l, p] of problems.slice(0, 40)) console.log('  ✗', l, '→', p);
for (const [l, p] of warnings.slice(0, 20)) console.log('  ! ', l, '→', p);
process.exit(problems.length ? 1 : 0);
