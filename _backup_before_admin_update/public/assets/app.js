/* Blessing Hajj Agency – front-end runtime (vanilla JS, no build step).
   window.SITE is rendered by Blade from the admin settings (same payload as GET /api/v1/config). */
const SITE = window.SITE || {modules: {}, languages: [], hajjDate: null};
const $ = (s, r = document) => r.querySelector(s), $$ = (s, r = document) => [...r.querySelectorAll(s)];
const money = n => '৳ ' + Math.round(n || 0).toLocaleString('en-IN');
const fmtDate = d => new Date(d + 'T00:00:00').toLocaleDateString('en-GB', {day: '2-digit', month: 'short', year: 'numeric'});

function countdown() {
  const el = $('#countdown'); if (!el || !SITE.hajjDate) return;
  const t = new Date(SITE.hajjDate), tick = () => {
    let d = Math.max(0, t - new Date()); const u = [864e5, 36e5, 6e4, 1e3];
    $$('b', el).forEach((b, i) => { b.textContent = String(Math.floor(d / u[i])).padStart(2, '0'); d %= u[i]; });
  }; tick(); setInterval(tick, 1000);
}

/* Chips: client-side category filter (packages, hotels, tours, FAQ, gallery, guide) */
function chips() {
  $$('.chips').forEach(c => c.addEventListener('click', e => {
    const b = e.target.closest('.chip[data-cat]'); if (!b) return;
    $$('.chip', c).forEach(x => x.classList.toggle('on', x === b));
    const f = b.dataset.cat, scope = c.parentElement;
    $$('[data-cat-item]', scope).forEach(i => i.hidden = f !== 'all' && i.dataset.catItem !== f);
  }));
}

/* Live filters for listing pages: reads checkboxes/radios/range in #filters and data-* on cards */
function liveFilters() {
  const box = $('#filters'); if (!box) return;
  const grid = $(box.dataset.filterTarget); if (!grid) return;
  const items = () => [...grid.children].filter(c => c.dataset && (c.dataset.price !== undefined));
  const checked = n => $$(`input[name="${n}"]`, box).filter(i => i.checked).map(i => i.value);
  const inBucket = (days, b) => { const [a, z] = b === '40+' ? [41, 999] : b.split('-').map(Number); return days >= a && days <= z; };
  const apply = () => {
    const cls = checked('class'), dur = checked('duration'), air = checked('airline'), stops = checked('stops'), time = checked('time');
    const dist = (checked('dist')[0] || ''), max = +($('#range', box)?.value || 0);
    let shown = 0;
    items().forEach(c => {
      const d = c.dataset; let ok = true;
      if ($$('input[name="class"]', box).length) ok &&= cls.includes(d.class);
      if (dur.length) ok &&= dur.some(b => inBucket(+d.duration, b));
      if (dist && dist !== '99999') ok &&= +d.dist <= +dist;
      if (dist === '99999') ok &&= +d.dist > 1000;
      if (max) ok &&= +d.price <= max;
      if ($$('input[name="airline"]', box).length && d.airline) ok &&= air.includes(d.airline);
      if ($$('input[name="stops"]', box).length) ok &&= stops.includes(d.stops);
      if ($$('input[name="time"]', box).length) ok &&= time.includes(d.time);
      c.hidden = !ok; if (ok) shown++;
    });
    $$('[data-filter-count]').forEach(e => e.textContent = shown);
    $$('[data-filter-empty]').forEach(e => e.hidden = shown > 0);
  };
  box.addEventListener('input', apply); box.addEventListener('change', apply);
  $('[data-filter-reset]', box)?.addEventListener('click', () => {
    $$('input[type=checkbox][name=class],input[type=checkbox][name=airline]', box).forEach(i => i.checked = true);
    $$('input[name=duration]', box).forEach(i => i.checked = false);
    const any = $('input[name=dist][value=""]', box); if (any) any.checked = true;
    const r = $('#range', box); if (r) { r.value = r.max; r.dispatchEvent(new Event('input')); }
    apply();
  });
  const r = $('#range', box); r?.addEventListener('input', () => $('#range-v').textContent = money(r.value));
  apply();
}
function sorters() {
  const sortGrid = (grid, key) => {
    const cards = [...grid.children].filter(c => c.dataset.price !== undefined);
    if (!key) return;
    const val = c => key === 'date' ? (c.dataset.date || '9999') : +(c.dataset[key] || 0);
    cards.sort((a, b) => val(a) > val(b) ? 1 : val(a) < val(b) ? -1 : 0).forEach(c => grid.appendChild(c));
  };
  $$('[data-sort]').forEach(s => s.addEventListener('change', () => sortGrid($(s.dataset.sort), s.value)));
  $$('[data-sort-chips]').forEach(c => c.addEventListener('click', e => {
    const b = e.target.closest('[data-sort-key]'); if (!b) return;
    $$('.chip', c).forEach(x => x.classList.toggle('on', x === b)); sortGrid($(c.dataset.sortChips), b.dataset.sortKey);
  }));
}

/* Package page: room choice + travellers → live total, deposit and installment schedule from the server quote */
function packageCalculator() {
  const box = $('#calc'); if (!box) return;
  const run = async () => {
    const room = $('input[name=room]:checked', box)?.value, pax = Math.max(1, +$('#pax').value || 1);
    $$('.room', box).forEach(r => r.classList.toggle('on', $('input', r).checked));
    try {
      const q = await (await fetch(box.dataset.quoteUrl + '?' + new URLSearchParams({room_type: room, adults: pax}), {headers: {Accept: 'application/json'}})).json();
      $$('.js-total').forEach(t => t.textContent = money(q.total));
      $('.js-deposit', box) && ($('.js-deposit', box).textContent = money(q.deposit));
      $('.js-discount', box).textContent = q.discount ? '− ' + money(q.discount) : money(0);
      const tb = $('#plan-table tbody');
      if (tb) tb.innerHTML = q.schedule.map(r => `<tr><td>${r.label}</td><td>${r.seq ? fmtDate(r.due_date) : '—'}</td><td><b>${money(r.amount)}</b></td></tr>`).join('');
    } catch (e) { /* keep server-rendered values */ }
  };
  box.addEventListener('change', run); $('#pax')?.addEventListener('input', run);
}

/* Booking wizard */
function bookingWizard() {
  const form = $('#booking-form'); if (!form || !window.BOOKING) return;
  const B = window.BOOKING, steps = $$('.fstep', form), dots = $$('.stepper>div', form);
  const pkgSel = $('#bk-package'), roomSel = $('#bk-room'), adults = $('#bk-adults'), children = $('#bk-children');
  let cur = 0, quote = null;
  const go = i => {
    cur = Math.max(0, Math.min(steps.length - 1, i));
    steps.forEach((s, k) => s.classList.toggle('on', k === cur));
    dots.forEach((d, k) => { d.classList.toggle('on', k === cur); d.classList.toggle('done', k < cur); });
    $('[data-prev]', form).style.visibility = cur ? 'visible' : 'hidden';
    $('[data-next]', form).hidden = cur === steps.length - 1;
    if (cur === steps.length - 1) review();
    window.scrollTo({top: form.offsetTop - 90, behavior: 'smooth'});
  };
  const fillRooms = () => {
    const p = B.packages[pkgSel.value], want = roomSel.value || roomSel.dataset.old;
    roomSel.innerHTML = p.rooms.map(r => `<option value="${r.v}">${r.l} – ${money(r.p)}</option>`).join('');
    if (p.rooms.some(r => r.v === want)) roomSel.value = want;
    $('#bk-date').value = p.date || '—';
    $('#sum-img').style.backgroundImage = `url(${p.img})`; $('#sum-title').textContent = p.title;
  };
  // traveller cards follow adults + children
  const tpl = $('#trav-tpl'), list = $('#trav-list'), old = JSON.parse($('#trav-old').textContent || '[]');
  const syncTravellers = () => {
    const n = Math.max(1, (+adults.value || 1) + (+children.value || 0));
    while (list.children.length < n) {
      const i = list.children.length, node = tpl.content.firstElementChild.cloneNode(true);
      $('[data-n]', node).textContent = (i + 1) + (i === 0 ? ' ' + B.labels.lead : '');
      $$('[data-f]', node).forEach(inp => { inp.name = `travellers[${i}][${inp.dataset.f}]`; if (old[i] && old[i][inp.dataset.f]) inp.value = old[i][inp.dataset.f]; if (inp.dataset.f !== 'full_name') inp.required = false; });
      list.appendChild(node);
    }
    while (list.children.length > n) list.lastElementChild.remove();
  };
  const mode = () => $('input[name=payment_mode]:checked', form)?.value || 'full';
  const method = () => $('input[name=payment_method]:checked', form)?.value;
  const refresh = async () => {
    const p = B.packages[pkgSel.value];
    const addons = $$('input[name="addons[]"]:checked', form).map(i => i.value);
    const qs = new URLSearchParams({room_type: roomSel.value, adults: adults.value || 1, children: children.value || 0});
    addons.forEach(a => qs.append('addons[]', a));
    try { quote = await (await fetch(p.quote + '?' + qs, {headers: {Accept: 'application/json'}})).json(); } catch (e) { return; }
    $('#sum-sub').textContent = `${p.days} days · ${roomSel.options[roomSel.selectedIndex]?.text.split(' – ')[0] || ''}${p.date ? ' · ' + p.date : ''}`;
    $('#sum-lines').innerHTML = quote.lines.map(l => `<div class="trow"><span>${l.label}</span><b>${money(l.amount)}</b></div>`).join('');
    $('#sum-disc-row').hidden = !quote.discount; $('#sum-disc').textContent = '− ' + money(quote.discount);
    $('#sum-total').textContent = money(quote.total);
    const due = mode() === 'full' ? quote.total : mode() === 'installment' ? quote.deposit : 0;
    $('#sum-due').textContent = money(due);
    $('#plan-rows').innerHTML = quote.schedule.map(r => `<tr><td>${r.seq ? r.label : B.labels.deposit}</td><td>${r.seq ? fmtDate(r.due_date) : B.labels.onBooking}</td><td><b>${money(r.amount)}</b></td></tr>`).join('');
    $('#plan-box').hidden = mode() !== 'installment';
    $('#later-box').hidden = mode() !== 'pay_later';
    $('#pay-methods').hidden = mode() === 'pay_later';
    $('#bank-box').hidden = method() !== 'bank' || mode() === 'pay_later';
  };
  const review = () => {
    const names = $$('[data-f=full_name]', list).map(i => i.value).filter(Boolean);
    $('#review').innerHTML = `<div class="trow"><span>Package</span><b>${B.packages[pkgSel.value].title}</b></div>
      <div class="trow"><span>Room</span><b>${roomSel.options[roomSel.selectedIndex].text}</b></div>
      <div class="trow"><span>Travellers</span><b>${names.join(', ')}</b></div>
      <div class="trow"><span>Payment</span><b>${$('input[name=payment_mode]:checked', form).parentElement.textContent.trim()}${mode() !== 'pay_later' ? ' · ' + $('input[name=payment_method]:checked', form).parentElement.textContent.trim() : ''}</b></div>
      <div class="trow"><span>Total</span><b>${money(quote?.total)}</b></div>`;
  };
  const validStep = () => {
    if (cur === 1) {
      const empty = $$('[data-f=full_name]', list).find(i => !i.value.trim());
      if (empty) { empty.classList.add('is-err'); empty.focus(); alert(B.labels.required); return false; }
    }
    return true;
  };
  $('[data-next]', form).onclick = () => validStep() && go(cur + 1);
  $('[data-prev]', form).onclick = () => go(cur - 1);
  form.addEventListener('submit', e => { if (!$('#agree').checked) { e.preventDefault(); alert(B.labels.agree); } else $('#bk-submit').disabled = true; });
  pkgSel.addEventListener('change', () => { fillRooms(); refresh(); });
  [roomSel].forEach(el => el.addEventListener('change', refresh));
  [adults, children].forEach(el => el.addEventListener('input', () => { syncTravellers(); refresh(); }));
  form.addEventListener('change', e => { if (e.target.name === 'payment_mode' || e.target.name === 'payment_method' || e.target.name === 'addons[]') refresh(); });
  fillRooms(); syncTravellers(); refresh();
  // jump to the travellers step when the server returned traveller errors
  go($('.panel[style*="FDECEC"]', form) && old.length ? 1 : 0);
}

function ui() {
  $('.burger')?.addEventListener('click', () => $('nav.menu').classList.toggle('open'));
  // home search tabs switch the form action
  const hs = $('#home-search');
  hs && $('.tabs', hs).addEventListener('click', e => {
    const b = e.target.closest('button'); if (!b) return;
    $$('button', hs).forEach(x => x.classList.toggle('on', x === b)); hs.action = b.dataset.action;
  });
  // tabs inside detail pages / dashboards
  $$('[data-pane]').forEach(a => a.addEventListener('click', e => {
    e.preventDefault(); const id = a.dataset.pane;
    $$('[data-pane]').forEach(x => x.classList.toggle('on', x.dataset.pane === id));
    $$('[data-pane-id]').forEach(p => p.hidden = p.dataset.paneId !== id);
    history.replaceState(null, '', '#' + id);
  }));
  const hash = location.hash.slice(1); if (hash && $(`[data-pane="${hash}"]`)) $(`[data-pane="${hash}"]`).click();
  // visa "Apply" buttons preselect the type
  $$('[data-pick-visa]').forEach(a => a.addEventListener('click', () => { const s = $('#visa-type'); if (s) s.value = a.dataset.pickVisa; }));
  // packing checklist remembers ticks
  const cl = $('#checklist');
  if (cl) {
    const saved = JSON.parse(localStorage.getItem('bha_check') || '[]'), cnt = () => $('[data-check-count]').textContent = `(${$$('[data-check]:checked', cl).length}/${$$('[data-check]', cl).length})`;
    $$('[data-check]', cl).forEach(i => { i.checked = saved.includes(i.dataset.check); i.onchange = () => { localStorage.setItem('bha_check', JSON.stringify($$('[data-check]:checked', cl).map(x => x.dataset.check))); cnt(); }; }); cnt();
  }
  // agent portal: room list follows package
  const ap = $('[data-agent-pkg]'), ar = $('[data-agent-room]');
  ap && ap.addEventListener('change', () => { const rooms = JSON.parse(ap.selectedOptions[0].dataset.rooms || '[]'); ar.innerHTML = rooms.map(r => `<option value="${r}">${r[0].toUpperCase() + r.slice(1)}</option>`).join(''); });
  ap && ap.dispatchEvent(new Event('change'));
}
document.addEventListener('DOMContentLoaded', () => { countdown(); chips(); liveFilters(); sorters(); packageCalculator(); bookingWizard(); ui(); });
