// Broken-link check: every sitemap page (+ portal/auth/404 pages) → every internal <a href>, <img src/srcset>, <link href>, <script src>;
// each unique URL fetched once (GET, redirects followed); anything ≥400 is reported with the page that references it.
// External links are only counted (not fetched). Usage: node links_check.mjs [base]
const base = (process.argv[2] || process.env.SITE || 'http://localhost:3000').replace(/\/$/, '');
const xml = await (await fetch(`${base}/sitemap.xml`)).text();
const pages = [...new Set([...xml.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => new URL(m[1]).pathname))];
for (const p of ['/en/login', '/bn/login', '/en/register', '/en/booking', '/en/wishlist', '/en/compare']) if (!pages.includes(p)) pages.push(p);
const seen = new Map(); const ext = new Set(); const refs = new Map();
const dec = (s) => s.replace(/&amp;/g, '&').replace(/\\u0026/g, '&');
function collect(page, html) {
  const add = (u) => {
    u = dec(u.trim()); if (!u || /^(#|mailto:|tel:|javascript:|data:|blob:|whatsapp:|sms:)/.test(u)) return;
    let abs; try { abs = new URL(u, base + page); } catch { return; }
    if (!['http:', 'https:'].includes(abs.protocol)) return;
    abs.hash = '';
    const internal = abs.origin === new URL(base).origin || /^(127\.0\.0\.1|localhost)(:\d+)?$/.test(abs.host);
    if (!internal) { ext.add(abs.origin); return; }
    if (!refs.has(abs.href)) refs.set(abs.href, page);
  };
  for (const m of html.matchAll(/<a\b[^>]*\shref="([^"]+)"/g)) add(m[1]);
  for (const m of html.matchAll(/<(?:img|source)\b[^>]*\s(?:src|srcSet|srcset)="([^"]+)"/g)) m[1].split(',').forEach((x) => add(x.trim().split(/\s+/)[0]));
  for (const m of html.matchAll(/<link\b[^>]*\shref="([^"]+)"/g)) add(m[1]);
  for (const m of html.matchAll(/<script\b[^>]*\ssrc="([^"]+)"/g)) add(m[1]);
}
const q = [...pages]; let crawled = 0;
await Promise.all(Array.from({ length: 6 }, async () => { while (q.length) { const p = q.shift(); const r = await fetch(base + p, { signal: AbortSignal.timeout(120000) }); crawled++; seen.set(base + p, r.status); collect(p, await r.text()); } }));
const todo = [...refs.keys()].filter((u) => !seen.has(u));
await Promise.all(Array.from({ length: 8 }, async () => {
  while (todo.length) { const u = todo.shift(); try { const r = await fetch(u, { redirect: 'follow', signal: AbortSignal.timeout(60000) }); seen.set(u, r.status); await r.arrayBuffer(); } catch (e) { seen.set(u, 0); } }
}));
const broken = [...seen].filter(([, s]) => s >= 400 || s === 0).map(([u, s]) => ({ url: u, status: s, from: refs.get(u) || '(page)' }));
console.log(JSON.stringify({ base, pages_crawled: crawled, unique_internal_urls: seen.size, external_origins: ext.size, broken: broken.length }, null, 1));
broken.slice(0, 50).forEach((b) => console.log('  ✗', b.status, b.url, '← ', b.from));
process.exit(broken.length ? 1 : 0);
