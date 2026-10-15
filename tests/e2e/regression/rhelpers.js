// Helpers for the public/user-facing regression suite.
const { test, expect, checkLinks, login, uniq } = require('../specs/helpers');
const { execFileSync } = require('child_process');
const path = require('path');
const fs = require('fs');
const root = path.resolve(__dirname, '../../..');

/** Dynamic bits that legitimately change between runs (countdown, random refs) are masked in screenshots. */
const MASK = ['#countdown', '.count', 'video', 'iframe', '[data-random]'];

/** Normalise text so random refs / timestamps don't create false diffs in behaviour snapshots. */
const norm = (s) => (s || '').replace(/\s+/g, ' ').trim()
  .replace(/\bBHA-[A-Z0-9]+-\d+\b/g, 'BHA-<REF>')
  .replace(/\/payment\/\d+/g, '/payment/<ID>')
  .replace(/\b(?=[A-Z0-9]*\d)(?=[A-Z0-9]*[A-Z])[A-Z0-9]{8,}\b/g, '<ID>')
  .replace(/\b(VA|PR)-\d{2}-[A-Z0-9]{4,6}\b/g, '$1-<REF>')
  .replace(/\d{1,2}:\d{2}( ?[AP]M)?/gi, '<TIME>');

/** Structural fingerprint of a page: what a user sees and can do (headings, nav, forms, buttons). */
async function fingerprint(page) {
  const fp = await page.evaluate(() => {
    const vis = (el) => !!(el.offsetWidth || el.offsetHeight || el.getClientRects().length);
    const txt = (el) => (el.innerText || el.textContent || '').trim();
    const o = location.origin;
    return {
      path: location.pathname, lang: document.documentElement.lang, dir: document.documentElement.dir, title: document.title,
      headings: [...document.querySelectorAll('h1,h2,h3')].filter(vis).map((h) => h.tagName + ':' + txt(h)).slice(0, 40),
      nav: [...document.querySelectorAll('header a[href], nav a[href], .dside a[href]')].map((a) => a.href.replace(o, '')).filter((v, i, s) => s.indexOf(v) === i).slice(0, 80),
      forms: [...document.querySelectorAll('form')].map((f) => (f.getAttribute('method') || 'get').toLowerCase() + ' ' + (f.getAttribute('action') || '').replace(o, '') + ' [' + [...new Set([...f.elements].map((e) => e.name).filter(Boolean))].sort().join(',') + ']'),
      buttons: [...document.querySelectorAll('button, .btn, input[type=submit]')].filter(vis).map(txt).filter(Boolean).slice(0, 60),
      images: document.querySelectorAll('img').length,
    };
  });
  fp.path = norm(fp.path); fp.title = norm(fp.title);
  fp.headings = fp.headings.map(norm); fp.buttons = fp.buttons.map(norm);
  fp.forms = fp.forms.map(norm); fp.nav = fp.nav.map(norm);
  return fp;
}

/** Full audit vs baseline: no overflow, behaviour fingerprint + full-page screenshot match baseline. */
async function rcheck(page, name, info) {
  await page.waitForLoadState('networkidle').catch(() => {});
  await page.evaluate(() => document.fonts && document.fonts.ready).catch(() => {});
  const ov = await page.evaluate(() => ({ sw: document.documentElement.scrollWidth, w: document.documentElement.clientWidth }));
  expect.soft(ov.sw, `horizontal overflow on ${name}`).toBeLessThanOrEqual(ov.w + 1); // containers with overflow-x:auto are allowed via document scrollWidth
  if (!page.links) page.links = new Set();
  const origin = new URL(page.url()).origin;
  (await page.$$eval('a[href]', (as) => as.map((a) => a.href))).filter((h) => h.startsWith(origin) && !/\/logout|\/lang\/|\/export|\/file$|\/slip$/.test(h)).forEach((h) => page.links.add(h.split('#')[0]));
  const fp = await fingerprint(page);
  expect.soft(JSON.stringify(fp, null, 1), `behaviour fingerprint changed: ${name}`).toMatchSnapshot(`${name}.json`);
  const dir = path.join(__dirname, '..', 'screenshots-regression', info.project.name);
  fs.mkdirSync(dir, { recursive: true });
  await page.screenshot({ path: path.join(dir, `${name}.png`), fullPage: true, animations: 'disabled', mask: MASK.map((m) => page.locator(m)) });
  await expect.soft(page, `visual change: ${name}`).toHaveScreenshot(`${name}.png`, { fullPage: true, mask: MASK.map((m) => page.locator(m)) });
}

/** Run PHP against the e2e DB (module/language toggles without going through the admin UI). */
function php(code) {
  return execFileSync('php', ['artisan', 'tinker', '--env=e2e', '--execute', code + ' App\\Support\\SiteConfig::flush();'], { cwd: root, encoding: 'utf8' });
}
const setModule = (key, on) => php(`App\\Models\\Module::where('key','${key}')->update(['enabled'=>${on ? 'true' : 'false'}]);`);
const setLanguage = (code, on) => php(`App\\Models\\Language::where('code','${code}')->update(['enabled'=>${on ? 'true' : 'false'}]);`);

function reseed() {
  execFileSync('php', ['artisan', 'migrate:fresh', '--seed', '--force', '--env=e2e'], { cwd: root, stdio: 'ignore' });
  execFileSync('php', ['artisan', 'optimize:clear', '--env=e2e'], { cwd: root, stdio: 'ignore' });
}
module.exports = { test, expect, rcheck, fingerprint, checkLinks, login, uniq, setModule, setLanguage, norm, reseed };
