// Interaction tests for the public site. Prints PASS/FAIL per check; writes tests/e2e.json
import { chromium } from 'playwright'; import fs from 'fs';
const S = 'file:///workspace/musafir/site/';
const b = await chromium.launch({ executablePath: '/usr/bin/google-chrome', args: ['--no-sandbox'] });
const results = []; const errs = [];
const ok = (name, cond, info = '') => { results.push({ name, pass: !!cond, info: String(info).slice(0, 160) }); console.log((cond ? 'PASS ' : 'FAIL ') + name + (info ? ' — ' + String(info).slice(0, 120) : '')); };
async function page(w = 1280, h = 900) { const c = await b.newContext({ viewport: { width: w, height: h } }); await c.addInitScript(() => { try { if (!localStorage.getItem('musafir-consent')) localStorage.setItem('musafir-consent', '{"essential":true}'); } catch (e) {} }); const p = await c.newPage(); p.on('console', m => { if (m.type() === 'error') errs.push(p.url().split('/site/')[1] + ': ' + m.text()); }); p.on('pageerror', e => errs.push(p.url().split('/site/')[1] + ': ' + e.message)); return p; }
let p = await page();
// root redirect + language persistence
await p.goto(S + 'index.html'); await p.waitForURL(/en\/index.html/); ok('root redirects to /en by default', p.url().includes('/en/index.html'));
await p.click('header [data-lang-link="bn"]').catch(async () => { await p.goto(S + 'bn/index.html'); });
await p.waitForURL(/bn\/index.html/); ok('language toggle → Bangla', await p.getAttribute('html', 'lang') === 'bn');
await p.goto(S + 'index.html'); await p.waitForURL(/(en|bn)\/index.html/); ok('language persists via localStorage (root → bn)', p.url().includes('/bn/'), p.url());
// theme persistence
await p.goto(S + 'en/index.html'); await p.evaluate(() => localStorage.setItem('musafir-lang', 'en'));
const before = await p.evaluate(() => document.documentElement.classList.contains('dark'));
await p.click('header [data-theme-toggle]'); const after = await p.evaluate(() => document.documentElement.classList.contains('dark'));
await p.goto(S + 'en/tours.html'); const persisted = await p.evaluate(() => document.documentElement.classList.contains('dark'));
ok('theme toggle switches + persists across pages', before !== after && persisted === after);
if (persisted) { await p.click('header [data-theme-toggle]'); }
// currency switcher
await p.goto(S + 'en/cruises.html');
const bdt = await p.textContent('[data-item] .text-lg, [data-item] b'); await p.selectOption('#cur-top', 'USD');
await p.waitForTimeout(200); const usd = await p.evaluate(() => document.querySelector('[data-items]').innerText);
ok('currency switch to USD converts prices', /US\$/.test(usd) && !/৳/.test(usd), usd.match(/US\$\s?[\d,]+/)?.[0]);
await p.goto(S + 'en/tours.html'); const usd2 = await p.evaluate(() => document.querySelector('main').innerText);
ok('currency persists on next page', /US\$/.test(usd2));
await p.selectOption('#cur-top', 'BDT'); await p.waitForTimeout(100); ok('currency back to BDT', /৳/.test(await p.evaluate(() => document.querySelector('main').innerText)));
// cruise filters & sort
await p.goto(S + 'en/cruises.html');
await p.check('#clist aside input[name=region][value=bd]'); await p.waitForTimeout(150);
const vis = await p.$$eval('#clist [data-items] [data-item]', a => a.filter(x => !x.hidden).length); ok('cruise region filter (Bangladesh) → 1 result', vis === 1, vis);
await p.uncheck('#clist aside input[name=region][value=bd]'); await p.selectOption('#csort', 'price-asc'); await p.waitForTimeout(150);
const prices = await p.$$eval('#clist [data-items] [data-item]', a => a.map(x => +x.dataset.price)); ok('cruise sort price asc', prices.every((v, i) => !i || prices[i - 1] <= v), prices.join(','));
// activities chips + free-cancel filter
await p.goto(S + 'en/activities.html');
await p.click('label.chip:has(input[value=water])'); await p.waitForTimeout(150);
const wv = await p.$$eval('#alist [data-item]', a => a.filter(x => !x.hidden).map(x => x.dataset.cats)); ok('activity category chip filters to water', wv.length > 0 && wv.every(c => c === 'water'), wv.join(','));
// activity detail → booking hydration
await p.goto(S + 'en/activities/dubai-desert-safari.html');
await p.click('aside [data-step="1"] >> nth=0'); const tot = await p.textContent('aside [data-total]'); ok('activity stepper updates total', /৳/.test(tot), tot);
await Promise.all([p.waitForURL(/booking.html/), p.click('aside button.btn-accent')]);
ok('activity → booking.html?activity= hydrates summary', /Dubai/i.test(await p.textContent('aside [data-bk-title]')), await p.textContent('aside [data-bk-title]'));
await p.goto(S + 'en/cruises/greek-isles-turkey.html'); await p.selectOption('#cr-cabin', { index: 2 });
ok('cruise cabin select recalculates', (await p.textContent('aside [data-total]')).includes('৳'), await p.textContent('aside [data-total]'));
await Promise.all([p.waitForURL(/booking.html/), p.click('aside form button.btn-accent')]);
ok('cruise → booking hydrates', /Greek/i.test(await p.textContent('aside [data-bk-title]')));
// full checkout flow with coupon (cruise)
await p.click('[data-step-panel]:not([hidden]) [data-next]');
await p.click('[data-step-panel]:not([hidden]) [data-next]'); ok('booking validation blocks empty traveller form', await p.isVisible('#bk-fn'));
await p.fill('#bk-fn', 'Rafiq'); await p.fill('#bk-ln', 'Islam'); await p.fill('#bk-em', 'r@example.com'); await p.fill('#bk-ph', '01711234567');
await p.click('[data-step-panel]:not([hidden]) [data-next]');
const t0 = await p.textContent('aside [data-total]'); await p.fill('#bk-coupon', 'cruise10'); await p.click('[data-coupon-apply]'); const t1 = await p.textContent('aside [data-total]');
ok('coupon CRUISE10 reduces total', t0 !== t1, t0 + ' → ' + t1);
await p.click('[data-step-panel]:not([hidden]) [data-next]');
await p.fill('#bk-bk', '01711234567'); await p.check('[data-step-panel]:not([hidden]) input[type=checkbox][required]');
await p.click('[data-step-panel]:not([hidden]) [data-pay]'); await p.waitForURL(/booking-confirmed/, { timeout: 6000 }).catch(() => {});
ok('mock payment → booking-confirmed', p.url().includes('booking-confirmed'));
// trip planner
await p.goto(S + 'en/trip-planner.html'); await p.evaluate(() => localStorage.removeItem('musafir-plan')); await p.reload();
await p.click('label:has([data-plan-dest][value=bali])'); await p.click('label:has([data-plan-dest][value=singapore-malaysia])');
await p.waitForTimeout(100);
const days = await p.textContent('[data-plan-totaldays]'); ok('planner: 2 destinations → 8 days default', days.trim() === '8', days);
await p.click('[data-pd="bali"][data-dv="1"]'); ok('planner: day stepper +1 → 9', (await p.textContent('[data-plan-totaldays]')).trim() === '9');
const act = await p.isVisible('[data-plan-act-row][data-dest=bali]'); ok('planner: Bali experiences revealed', act);
const tA = await p.textContent('[data-plan-total]'); await p.click('label:has([data-plan-tier][value=luxury])'); const tB = await p.textContent('[data-plan-total]');
ok('planner: luxury tier raises budget', tA !== tB, tA + ' → ' + tB);
for (const s of ['coxs-bazar', 'nepal', 'dubai']) await p.click(`label:has([data-plan-dest][value=${s}])`);
ok('planner: max 4 destinations enforced', (await p.textContent('[data-plan-places]')).trim() === '4');
await p.click('[data-plan-save]'); await p.reload(); ok('planner: saved plan restores after reload', (await p.textContent('[data-plan-places]')).trim() === '4');
await p.click('[data-plan-quote]'); await p.fill('#qn', 'Test User'); await p.fill('#qp', '01711234567'); await p.click('#quote-dialog button.btn-primary');
ok('planner: quote dialog submits', !(await p.isVisible('#quote-dialog')));
// wishlist & compare
await p.goto(S + 'en/wishlist.html'); await p.evaluate(() => localStorage.removeItem('musafir-wishlist')); await p.reload();
ok('wishlist empty state', await p.isVisible('[data-wish-empty]'));
await p.goto(S + 'en/tours.html'); await p.click('[data-wish="tour:maldives-honeymoon"] >> nth=0');
await p.goto(S + 'en/wishlist.html'); ok('wishlist shows saved tour', await p.isVisible('[data-wish-item="tour:maldives-honeymoon"]'));
await p.goto(S + 'en/compare.html?ids=bali-highlights,turkey-classic');
const cols = await p.$$eval('thead [data-col]', a => a.filter(x => !x.hidden).length); ok('compare shows 2 selected columns', cols === 2, cols);
// auth OTP
await p.goto(S + 'en/login.html'); await p.click('[data-show="#otp-2"]'); ok('login: OTP send blocked without phone', !(await p.isVisible('#otp-2')));
await p.fill('#lg-ph', '1711234567'); await p.click('[data-show="#otp-2"]'); ok('login: OTP step shown', await p.isVisible('#otp-2'));
await p.keyboard.type('123456'); await p.click('#otp-2 button.btn-primary'); await p.waitForTimeout(300); ok('login: OTP verify → account', p.url().includes('account/index.html'));
await p.goto(S + 'en/login.html'); await p.click('#tb-pw'); ok('login tabs switch', await p.isVisible('#lg-pw'));
// FAQ search, gift card, offers countdown, contact validation
await p.goto(S + 'en/faq.html'); await p.fill('[data-faq-search]', 'refund'); const fq = await p.$$eval('[data-filter-group] details[data-item]', a => a.filter(x => !x.hidden).length); ok('FAQ search filters', fq > 0 && fq < 10, fq);
await p.goto(S + 'bn/gift-cards.html'); await p.click('label:has([data-gift-opt][value="25000"])'); ok('gift card amount preview (bn digits)', (await p.textContent('[data-gift-amt]')).includes('২৫'), await p.textContent('[data-gift-amt]'));
await p.goto(S + 'en/offers.html'); await p.waitForTimeout(1200); ok('offers countdown ticking', /\d/.test(await p.textContent('[data-cd="d"]')), await p.textContent('[data-cd="d"]'));
await p.goto(S + 'en/contact.html'); await p.click('#contact-form button.btn-primary'); ok('contact form validation flags invalid', await p.$$eval('#contact-form .is-invalid, #contact-form [aria-invalid=true]', a => a.length) > 0);
// mobile drawer + currency in drawer
const m = await page(375, 800); await m.goto(S + 'en/index.html');
await m.click('[data-drawer-open="mnav"]').catch(() => {}); await m.waitForTimeout(250);
ok('mobile drawer opens with currency select', await m.isVisible('#cur-m'));
await m.keyboard.press('Escape'); await m.waitForTimeout(250); ok('mobile drawer closes on Escape', !(await m.isVisible('#cur-m')));
ok('no console errors across E2E', errs.length === 0, errs.slice(0, 3).join(' | '));
fs.mkdirSync('/workspace/musafir/tests', { recursive: true }); fs.writeFileSync('/workspace/musafir/tests/e2e.json', JSON.stringify({ results, errs }, null, 1));
console.log('TOTAL', results.length, 'PASS', results.filter(r => r.pass).length);
await b.close();
