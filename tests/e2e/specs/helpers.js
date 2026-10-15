const base = require('@playwright/test');
const path = require('path');
const fs = require('fs');

const checkedLinks = new Map(); // url -> status (shared per worker)
const SKIP = [/\/logout/, /^mailto:/, /^tel:/, /wa\.me/, /^javascript:/, /\/lang\//, /\/export(\?|$)/, /\/file$/, /\/slip$/];

/** Page fixture that fails on console errors / uncaught exceptions and offers audit helpers. */
const test = base.test.extend({
  page: async ({ page }, use, info) => {
    const errors = [];
    page.on('console', (m) => { if (m.type() === 'error' && !/favicon/.test(m.text()) && !(/status of 404/.test(m.text()) && /no-such-page/.test(page.url()))) errors.push(`console: ${m.text()} @ ${page.url()}`); });
    page.on('pageerror', (e) => errors.push(`pageerror: ${e.message} @ ${page.url()}`));
    page.on('response', (r) => { if (r.status() >= 500) errors.push(`HTTP ${r.status()} ${r.url()}`); });
    page.on('dialog', (d) => d.accept());
    page.links = new Set();
    await use(page);
    base.expect(errors, errors.join('\n')).toEqual([]);
  },
});

/** Assert no horizontal overflow, collect same-origin links, take a full-page screenshot. */
async function audit(page, name, info) {
  await page.waitForLoadState('networkidle').catch(() => {});
  if (!page.links) page.links = new Set();
  const ov = await page.evaluate(() => {
    const d = document.documentElement, w = d.clientWidth;
    if (d.scrollWidth <= w + 1) return { sw: d.scrollWidth, w, bad: [] };
    const bad = [...document.querySelectorAll('body *')].filter((el) => {
      const r = el.getBoundingClientRect(); if (!r.width || getComputedStyle(el).position === 'fixed') return false;
      let p = el.parentElement; while (p) { const o = getComputedStyle(p).overflowX; if (o === 'auto' || o === 'scroll' || o === 'hidden' || o === 'clip') return false; p = p.parentElement; }
      return r.right > w + 1 || r.left < -1;
    }).slice(0, 3).map((el) => el.tagName + '.' + el.className + ' ' + Math.round(el.getBoundingClientRect().right));
    return { sw: d.scrollWidth, w, bad };
  });
  base.expect(ov.sw, `horizontal overflow on ${name} (${page.url()}): ${JSON.stringify(ov)}`).toBeLessThanOrEqual(ov.w + 1);
  const origin = new URL(page.url()).origin;
  const hrefs = await page.$$eval('a[href]', (as) => as.map((a) => a.href));
  hrefs.filter((h) => h.startsWith(origin) && !SKIP.some((r) => r.test(h))).forEach((h) => page.links.add(h.split('#')[0]));
  const dir = path.join(__dirname, '..', 'screenshots', info.project.name);
  fs.mkdirSync(dir, { recursive: true });
  await page.screenshot({ path: path.join(dir, `${name}.png`), fullPage: true });
}

/** Request every collected link once (with the page's session) and assert none is broken. */
async function checkLinks(page) {
  const broken = [];
  for (const url of page.links) {
    if (checkedLinks.has(url)) continue;
    const r = await page.request.get(url, { maxRedirects: 5 });
    checkedLinks.set(url, r.status());
    if (r.status() >= 400 && r.status() !== 403) broken.push(`${r.status()} ${url}`);
  }
  base.expect(broken, 'broken links:\n' + broken.join('\n')).toEqual([]);
}

async function login(page, login, password = 'password') {
  await page.goto('/login');
  const f = page.locator('form', { has: page.locator('input[name="login"]') });
  await f.locator('input[name="login"]').fill(login);
  await f.locator('input[name="password"]').fill(password);
  await Promise.all([page.waitForNavigation(), f.locator('button').click()]);
}

async function logout(page) {
  await page.context().clearCookies();
}

/** React admin: open the mobile drawer if the sidebar is hidden, then click the nav link (Inertia visit). */
async function adminNav(page, href) {
  const tog = page.getByTestId('menu-toggle');
  const scope = (await tog.isVisible()) ? (await tog.click(), page.getByRole('dialog')) : page.locator('aside');
  await scope.locator(`a[href$="${href}"]`).first().click();
  await page.waitForURL((u) => u.pathname.endsWith(href));
  await page.waitForLoadState('networkidle').catch(() => {});
}

/** Wait for a sonner toast containing text. */
async function toast(page, text) {
  await base.expect(page.locator('[data-sonner-toast]').filter({ hasText: text }).first()).toBeVisible();
}

const uniq = (info) => ({ w360: '1', w768: '2', w1280: '3', w1920: '4' }[info.project.name] || '9');

module.exports = { test, expect: base.expect, audit, checkLinks, login, logout, adminNav, toast, uniq };
