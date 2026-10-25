/*! Musafir mock — vanilla JS interactions (no framework). Each block maps to a future React component/hook. */
(function () {
  'use strict';
  var M = window.MUSAFIR || { lang: 'en', i18n: {} };
  var T = function (k) { return (M.i18n && M.i18n[k]) || k; };
  var $ = function (s, r) { return (r || document).querySelector(s); };
  var $$ = function (s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); };
  var on = function (el, ev, fn, opt) { if (el) el.addEventListener(ev, fn, opt); };
  var store = {
    get: function (k, d) { try { var v = localStorage.getItem(k); return v === null ? d : JSON.parse(v); } catch (e) { return d; } },
    set: function (k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) {} }
  };
  var BN = '০১২৩৪৫৬৭৮৯';
  function digits(s) { s = String(s); return M.lang === 'bn' ? s.replace(/\d/g, function (d) { return BN[d]; }) : s; }
  function lakh(n) { n = Math.round(n); var s = String(Math.abs(n)); if (s.length > 3) { var h = s.slice(0, -3), t = s.slice(-3); h = h.replace(/\B(?=(\d{2})+(?!\d))/g, ','); s = h + ',' + t; } return (n < 0 ? '-' : '') + s; }
  function money(n) { return '৳\u00a0' + digits(lakh(n)); }
  M.money = money; M.digits = digits;

  /* ---------- toast ---------- */
  function toast(msg, type) {
    var box = $('#toasts'); if (!box) return;
    var el = document.createElement('div');
    el.className = 'pointer-events-auto flex max-w-md items-center gap-3 rounded-2xl px-4 py-3 text-sm font-semibold shadow-lift animate-fadeUp ' + (type === 'error' ? 'bg-rose-600 text-white' : 'bg-ink-900 text-white dark:bg-white dark:text-ink-900');
    el.setAttribute('role', 'status'); el.textContent = msg; box.appendChild(el);
    setTimeout(function () { el.style.transition = 'opacity .3s'; el.style.opacity = '0'; setTimeout(function () { el.remove(); }, 320); }, 2800);
  }
  M.toast = toast;

  /* ---------- theme ---------- */
  $$('[data-theme-toggle]').forEach(function (b) {
    on(b, 'click', function () {
      var d = document.documentElement.classList.toggle('dark');
      store.set('musafir-theme', d ? 'dark' : 'light'); try { localStorage.setItem('musafir-theme', d ? 'dark' : 'light'); } catch (e) {}
      document.dispatchEvent(new CustomEvent('themechange'));
    });
  });

  /* ---------- language switch: keep query + hash ---------- */
  $$('[data-lang-link]').forEach(function (a) {
    on(a, 'click', function () {
      try { localStorage.setItem('musafir-lang', a.getAttribute('data-lang-link')); } catch (e) {}
      if (location.search || location.hash) a.href = a.getAttribute('href').split(/[?#]/)[0] + location.search + location.hash;
    });
  });

  /* ---------- header shadow ---------- */
  var hdr = $('#site-header');
  if (hdr) { var sh = function () { hdr.classList.toggle('shadow-soft', window.scrollY > 8); }; on(window, 'scroll', sh, { passive: true }); sh(); }

  /* ---------- dropdowns ---------- */
  function closeAllDd(except) { $$('[data-dd]').forEach(function (d) { if (d !== except) { var p = $('[data-dd-panel]', d), b = $('button', d); if (p) p.hidden = true; if (b) b.setAttribute('aria-expanded', 'false'); } }); }
  $$('[data-dd]').forEach(function (dd) {
    var btn = $('button', dd), panel = $('[data-dd-panel]', dd), tmr;
    if (!btn || !panel) return;
    var open = function () { closeAllDd(dd); panel.hidden = false; btn.setAttribute('aria-expanded', 'true'); };
    var close = function () { panel.hidden = true; btn.setAttribute('aria-expanded', 'false'); };
    on(btn, 'click', function (e) { e.stopPropagation(); panel.hidden ? open() : close(); });
    if (window.matchMedia('(hover: hover)').matches && !dd.hasAttribute('data-dd-click')) {
      on(dd, 'mouseenter', function () { clearTimeout(tmr); open(); });
      on(dd, 'mouseleave', function () { tmr = setTimeout(close, 160); });
    }
    on(dd, 'keydown', function (e) { if (e.key === 'Escape') { close(); btn.focus(); } });
  });
  on(document, 'click', function (e) { if (!e.target.closest('[data-dd]')) closeAllDd(); });

  /* ---------- drawers (mobile nav, filters, admin sidebar) ---------- */
  var lastFocus;
  function openDrawer(id) {
    var d = document.getElementById(id); if (!d) return;
    lastFocus = document.activeElement; d.classList.remove('hidden'); d.hidden = false; document.body.style.overflow = 'hidden';
    $$('[data-drawer-open="' + id + '"]').forEach(function (b) { b.setAttribute('aria-expanded', 'true'); });
    var f = $('a,button,input,select,textarea', $('[data-drawer-panel]', d) || d); if (f) setTimeout(function () { f.focus(); }, 30);
  }
  function closeDrawer(d) {
    if (!d) return; d.classList.add('hidden'); document.body.style.overflow = '';
    $$('[data-drawer-open="' + d.id + '"]').forEach(function (b) { b.setAttribute('aria-expanded', 'false'); });
    if (lastFocus && lastFocus.focus) lastFocus.focus();
  }
  M.openDrawer = openDrawer;
  $$('[data-drawer-open]').forEach(function (b) { on(b, 'click', function () { openDrawer(b.getAttribute('data-drawer-open')); }); });
  $$('[data-drawer]').forEach(function (d) {
    $$('[data-drawer-close]', d).forEach(function (c) { on(c, 'click', function () { closeDrawer(d); }); });
    on(d, 'keydown', function (e) {
      if (e.key === 'Escape') closeDrawer(d);
      if (e.key === 'Tab') { var f = $$('a[href],button:not([disabled]),input,select,textarea', d).filter(function (x) { return x.offsetParent !== null; }); if (!f.length) return; var a = f[0], z = f[f.length - 1]; if (e.shiftKey && document.activeElement === a) { e.preventDefault(); z.focus(); } else if (!e.shiftKey && document.activeElement === z) { e.preventDefault(); a.focus(); } }
    });
  });
  on(document, 'keydown', function (e) { if (e.key === 'Escape') $$('[data-drawer]').forEach(function (d) { if (!d.classList.contains('hidden') && !d.contains(document.activeElement)) closeDrawer(d); }); });
  on(window, 'resize', function () { if (window.innerWidth >= 1024) $$('[data-drawer].lg\\:hidden').forEach(function (d) { if (!d.classList.contains('hidden')) closeDrawer(d); }); });

  /* ---------- tabs (ARIA) ---------- */
  $$('[data-tabs]').forEach(function (wrap) {
    var tabs = $$('[data-tab]', wrap).filter(function (t) { return t.closest('[data-tabs]') === wrap; });
    function sel(tab, focus) {
      tabs.forEach(function (t) { var on_ = t === tab; t.setAttribute('aria-selected', on_ ? 'true' : 'false'); t.tabIndex = on_ ? 0 : -1; var p = document.getElementById(t.getAttribute('data-tab')); if (p) p.hidden = !on_; });
      if (focus) tab.focus();
      if (wrap.hasAttribute('data-tabs-hash')) history.replaceState(null, '', '#' + tab.getAttribute('data-tab'));
    }
    tabs.forEach(function (t, i) {
      on(t, 'click', function () { sel(t); });
      on(t, 'keydown', function (e) { var k = e.key, n = null; if (k === 'ArrowRight') n = tabs[(i + 1) % tabs.length]; if (k === 'ArrowLeft') n = tabs[(i - 1 + tabs.length) % tabs.length]; if (k === 'Home') n = tabs[0]; if (k === 'End') n = tabs[tabs.length - 1]; if (n) { e.preventDefault(); sel(n, true); } });
    });
    if (wrap.hasAttribute('data-tabs-hash') && location.hash) { var h = tabs.filter(function (t) { return '#' + t.getAttribute('data-tab') === location.hash; })[0]; if (h) sel(h); }
  });

  /* ---------- swap inputs ---------- */
  $$('[data-swap]').forEach(function (b) { on(b, 'click', function () { var s = b.getAttribute('data-swap').split(','), a = $(s[0]), c = $(s[1]); if (a && c) { var v = a.value; a.value = c.value; c.value = v; } }); });

  /* ---------- horizontal carousels ---------- */
  $$('[data-scroll]').forEach(function (b) { on(b, 'click', function () { var el = $(b.getAttribute('data-scroll')); if (el) el.scrollBy({ left: (+b.getAttribute('data-dir')) * el.clientWidth * 0.8, behavior: 'smooth' }); }); });

  /* ---------- countdowns ---------- */
  function pad(n) { return (n < 10 ? '0' : '') + n; }
  var cds = $$('[data-countdown]');
  function tick() {
    cds.forEach(function (el) {
      var diff = Math.max(0, new Date(el.getAttribute('data-countdown')).getTime() - Date.now());
      var d = Math.floor(diff / 864e5), h = Math.floor(diff / 36e5) % 24, m = Math.floor(diff / 6e4) % 60, s = Math.floor(diff / 1e3) % 60;
      if (el.hasAttribute('data-cd-grid')) { var map = { d: d, h: pad(h), m: pad(m), s: pad(s) }; $$('[data-cd]', el).forEach(function (x) { x.textContent = digits(map[x.getAttribute('data-cd')]); }); }
      else { var o = $('[data-cd-out]', el) || el; o.textContent = digits(d + T('days') + ' ' + pad(h) + ':' + pad(m) + ':' + pad(s)); }
    });
  }
  if (cds.length) { tick(); setInterval(tick, 1000); }

  /* ---------- count-up stats ---------- */
  var counters = $$('[data-count]');
  if (counters.length && 'IntersectionObserver' in window) {
    var io = new IntersectionObserver(function (es) {
      es.forEach(function (e) {
        if (!e.isIntersecting) return; io.unobserve(e.target);
        var el = e.target, end = +el.getAttribute('data-count'), suf = el.getAttribute('data-suffix') || '', t0 = performance.now();
        (function step(t) { var p = Math.min(1, (t - t0) / 1200), v = Math.round(end * (1 - Math.pow(1 - p, 3))); el.textContent = digits(lakh(v)) + suf; if (p < 1) requestAnimationFrame(step); })(t0);
      });
    }, { threshold: .4 });
    counters.forEach(function (c) { io.observe(c); });
  }

  /* ---------- wishlist ---------- */
  var WK = 'musafir-wishlist';
  function wl() { return store.get(WK, []); }
  function renderWishCount() { var n = wl().length; $$('[data-wish-count]').forEach(function (c) { c.textContent = digits(n); c.classList.toggle('hidden', n === 0); }); }
  function syncWish() { var list = wl(); $$('[data-wish]').forEach(function (b) { b.setAttribute('aria-pressed', list.indexOf(b.getAttribute('data-wish')) > -1 ? 'true' : 'false'); }); renderWishCount(); }
  on(document, 'click', function (e) {
    var b = e.target.closest('[data-wish]'); if (!b) return; e.preventDefault(); e.stopPropagation();
    var id = b.getAttribute('data-wish'), list = wl(), i = list.indexOf(id);
    if (i > -1) { list.splice(i, 1); toast(T('removed')); } else { list.push(id); toast(T('added')); }
    store.set(WK, list); syncWish(); renderWishlistPage();
  });
  function renderWishlistPage() {
    var page = $('[data-wishlist-page]'); if (!page) return;
    var list = wl(), any = false;
    $$('[data-wish-item]', page).forEach(function (it) { var show = list.indexOf(it.getAttribute('data-wish-item')) > -1; it.hidden = !show; if (show) any = true; });
    var empty = $('[data-wish-empty]', page); if (empty) empty.hidden = any;
  }
  syncWish(); renderWishlistPage();
  $$('[data-wish-seed]').forEach(function (b) { on(b, 'click', function () { store.set(WK, b.getAttribute('data-wish-seed').split(',')); syncWish(); renderWishlistPage(); }); });

  /* ---------- compare (max 3) ---------- */
  var CK = 'musafir-compare';
  function cmp() { return store.get(CK, []); }
  function renderCompareBar() {
    var list = cmp(), bar = $('#compare-bar');
    $$('[data-compare]').forEach(function (c) { c.checked = list.indexOf(c.getAttribute('data-compare')) > -1; });
    if (!bar) return;
    bar.hidden = list.length === 0;
    var n = $('[data-compare-n]', bar); if (n) n.textContent = digits(list.length);
    var go = $('[data-compare-go]', bar); if (go) go.href = go.getAttribute('data-base') + '?ids=' + list.join(',');
  }
  on(document, 'change', function (e) {
    var c = e.target.closest('[data-compare]'); if (!c) return;
    var list = cmp(), id = c.getAttribute('data-compare'), i = list.indexOf(id);
    if (c.checked && i < 0) { if (list.length >= 3) { c.checked = false; toast(T('compareMax'), 'error'); return; } list.push(id); }
    if (!c.checked && i > -1) list.splice(i, 1);
    store.set(CK, list); renderCompareBar();
  });
  on($('[data-compare-clear]'), 'click', function () { store.set(CK, []); renderCompareBar(); });
  renderCompareBar();
  // compare page: show columns for ids
  var cpage = $('[data-compare-page]');
  if (cpage) {
    var q = new URLSearchParams(location.search).get('ids'); var ids = q ? q.split(',') : cmp(); if (!ids.length) ids = (cpage.getAttribute('data-default') || '').split(',');
    $$('[data-col]', cpage).forEach(function (c) { c.hidden = ids.indexOf(c.getAttribute('data-col')) < 0; });
  }

  /* ---------- cookie banner ---------- */
  var ck = $('#cookie');
  if (ck) {
    var consent = store.get('musafir-consent', null);
    if (!consent) setTimeout(function () { ck.hidden = false; }, 600);
    $$('[data-cookie]', ck).forEach(function (b) {
      on(b, 'click', function () {
        var a = b.getAttribute('data-cookie');
        if (a === 'custom') { $('#cookie-custom').hidden = !$('#cookie-custom').hidden; return; }
        var c = { essential: true, analytics: a === 'accept', marketing: a === 'accept', at: Date.now() };
        if (a === 'save') $$('[data-cookie-opt]', ck).forEach(function (x) { c[x.getAttribute('data-cookie-opt')] = x.checked; });
        store.set('musafir-consent', c); ck.hidden = true; toast(T('saved'));
      });
    });
    $$('[data-cookie-settings]').forEach(function (b) { on(b, 'click', function () { ck.hidden = false; $('#cookie-custom').hidden = false; }); });
  }

  /* ---------- chat widget ---------- */
  var fab = $('#chat-fab'), panel = $('#chat-panel');
  if (fab && panel) {
    var setChat = function (open) { panel.hidden = !open; fab.setAttribute('aria-expanded', open ? 'true' : 'false'); if (open) { var i = $('#chat-input'); if (i) i.focus(); } };
    on(fab, 'click', function () { setChat(panel.hidden); });
    $$('[data-chat-close]').forEach(function (b) { on(b, 'click', function () { setChat(false); fab.focus(); }); });
    on(panel, 'keydown', function (e) { if (e.key === 'Escape') { setChat(false); fab.focus(); } });
    var log = $('#chat-log');
    var say = function (txt, me) { var d = document.createElement('div'); d.className = me ? 'ml-auto max-w-[85%] rounded-2xl rounded-tr-sm bg-brand-700 p-3 text-white' : 'max-w-[85%] rounded-2xl rounded-tl-sm bg-white p-3 shadow-sm dark:bg-ink-800 dark:text-ink-100'; d.textContent = txt; log.appendChild(d); log.scrollTop = log.scrollHeight; };
    var send = function (txt) { if (!txt) return; say(txt, true); setTimeout(function () { say(T('reply')); }, 700); };
    $$('[data-chat-quick]').forEach(function (b) { on(b, 'click', function () { send(b.textContent.trim()); }); });
    on($('#chat-form'), 'submit', function (e) { e.preventDefault(); var i = $('#chat-input'); send(i.value.trim()); i.value = ''; });
    $$('[data-open-chat]').forEach(function (b) { on(b, 'click', function (e) { e.preventDefault(); setChat(true); }); });
  }

  /* ---------- form validation ---------- */
  function validField(f) {
    var w = f.closest('.field') || f.parentElement, ok = f.checkValidity();
    if (ok && f.hasAttribute('data-match')) { var m = $(f.getAttribute('data-match')); ok = !!m && m.value === f.value; }
    if (ok && f.type === 'tel' && f.value) ok = /^(\+?88)?0?1[3-9]\d{8}$/.test(f.value.replace(/[\s-]/g, ''));
    w.classList.toggle('is-invalid', !ok); f.classList.toggle('is-invalid', !ok); f.setAttribute('aria-invalid', ok ? 'false' : 'true');
    return ok;
  }
  M.validate = function (scope) { var ok = true, first = null; $$('input,select,textarea', scope).forEach(function (f) { if (f.disabled || f.closest('[hidden]') || f.type === 'hidden') return; if (!validField(f)) { ok = false; first = first || f; } }); if (first) first.focus(); return ok; };
  $$('form[data-validate]').forEach(function (form) {
    form.setAttribute('novalidate', '');
    $$('input,select,textarea', form).forEach(function (f) { on(f, 'blur', function () { if (f.value || f.closest('.is-invalid')) validField(f); }); on(f, 'input', function () { if (f.closest('.is-invalid')) validField(f); }); });
    on(form, 'submit', function (e) {
      e.preventDefault();
      if (!M.validate(form)) { toast(T('required'), 'error'); return; }
      var r = form.getAttribute('data-redirect');
      if (r) { location.href = r; return; }
      toast(form.getAttribute('data-success') || T('sent'));
      if (!form.hasAttribute('data-keep')) form.reset();
      var done = form.getAttribute('data-done'); if (done) { var d = $(done); if (d) { d.hidden = false; form.hidden = true; } }
    });
  });

  /* ---------- password toggle & OTP ---------- */
  $$('[data-pw-toggle]').forEach(function (b) { on(b, 'click', function () { var i = $(b.getAttribute('data-pw-toggle')); if (!i) return; var s = i.type === 'password'; i.type = s ? 'text' : 'password'; b.setAttribute('aria-pressed', s ? 'true' : 'false'); }); });
  $$('[data-otp]').forEach(function (g) {
    var ins = $$('input', g);
    ins.forEach(function (i, idx) {
      on(i, 'input', function () { i.value = i.value.replace(/\D/g, '').slice(-1); if (i.value && ins[idx + 1]) ins[idx + 1].focus(); });
      on(i, 'keydown', function (e) { if (e.key === 'Backspace' && !i.value && ins[idx - 1]) ins[idx - 1].focus(); });
      on(i, 'paste', function (e) { var t = (e.clipboardData || window.clipboardData).getData('text').replace(/\D/g, ''); if (!t) return; e.preventDefault(); ins.forEach(function (x, j) { x.value = t[j] || ''; }); (ins[Math.min(t.length, ins.length) - 1] || i).focus(); });
    });
  });
  $$('[data-show]').forEach(function (b) { on(b, 'click', function (e) { var tgt = $(b.getAttribute('data-show')), hide = b.getAttribute('data-hide'); if (b.hasAttribute('data-validate-scope') && !M.validate($(b.getAttribute('data-validate-scope')))) { toast(T('required'), 'error'); return; } e.preventDefault(); if (hide) $$(hide).forEach(function (h) { h.hidden = true; }); if (tgt) { tgt.hidden = false; var f = $('input,button', tgt); if (f) f.focus(); } if (b.hasAttribute('data-otp-send')) { toast(T('otpSent')); startResend(); } }); });
  function startResend() { var r = $('[data-resend]'); if (!r) return; var n = 30; r.disabled = true; var lbl = r.getAttribute('data-label') || r.textContent; r.setAttribute('data-label', lbl); var iv = setInterval(function () { n--; r.textContent = lbl + ' (' + digits(n) + ')'; if (n <= 0) { clearInterval(iv); r.disabled = false; r.textContent = lbl; } }, 1000); }
  $$('[data-resend]').forEach(function (r) { on(r, 'click', function () { toast(T('otpSent')); startResend(); }); });

  /* ---------- copy ---------- */
  $$('[data-copy]').forEach(function (b) { on(b, 'click', function () { var v = b.getAttribute('data-copy'); (navigator.clipboard ? navigator.clipboard.writeText(v) : Promise.reject()).then(function () { toast(T('copied')); }, function () { toast(T('copied')); }); }); });
  $$('[data-print]').forEach(function (b) { on(b, 'click', function () { window.print(); }); });
  $$('[data-demo]').forEach(function (b) { on(b, 'click', function (e) { e.preventDefault(); toast(b.getAttribute('data-demo') || T('demo')); }); });

  /* ---------- dialogs ---------- */
  $$('[data-modal-open]').forEach(function (b) { on(b, 'click', function (e) { e.preventDefault(); var d = document.getElementById(b.getAttribute('data-modal-open')); if (d && d.showModal) { d.showModal(); } }); });
  $$('dialog').forEach(function (d) { on(d, 'click', function (e) { if (e.target === d) d.close(); }); $$('[data-modal-close]', d).forEach(function (c) { on(c, 'click', function () { d.close(); }); }); });

  /* ---------- steppers & live price ---------- */
  function recalc(scope) {
    var box = scope.closest('[data-price-calc]'); if (!box) return;
    var total = 0;
    $$('[data-stepper]', box).forEach(function (s) { var i = $('input', s); total += (+i.value || 0) * (+s.getAttribute('data-unit') || 0); });
    $$('[data-addon]:checked', box).forEach(function (a) { total += +a.getAttribute('data-addon'); });
    var sel = $('[data-tier-select]', box); if (sel) { var opt = sel.options[sel.selectedIndex]; var mult = +(opt.getAttribute('data-mult') || 1); total = Math.round(total * mult); }
    if (box.dataset.discount) total = Math.round(total * (1 - +box.dataset.discount));
    $$('[data-total]', box).forEach(function (o) { o.textContent = money(total); });
    $$('[data-total-mirror]').forEach(function (o) { o.textContent = money(total); });
    var dep = $('[data-deposit]', box); if (dep) dep.textContent = money(Math.round(total * 0.3));
    $$('[data-deposit-mirror]', box).forEach(function (o) { o.textContent = '· ' + money(Math.round(total * 0.3)); });
    try { sessionStorage.setItem('musafir-last-total', String(total)); } catch (e) {}
  }
  // booking page: hydrate summary from ?tour= / ?pkg= / ?hotel= / ?flight=
  var cat = $('#booking-catalog');
  if (cat) {
    try {
      var C_ = JSON.parse(cat.textContent), sp_ = new URLSearchParams(location.search), item = null;
      ['tour', 'cruise', 'activity', 'hotel', 'flight'].some(function (k) { var v = sp_.get(k); if (v && C_[k + ':' + v]) { item = C_[k + ':' + v]; return true; } return false; });
      if (item) {
        $$('[data-bk-title]').forEach(function (e) { e.textContent = item.title; });
        $$('[data-bk-sub]').forEach(function (e) { e.textContent = item.sub; });
        $$('[data-bk-img]').forEach(function (e) { e.src = item.img; });
        $$('[data-bk-price]').forEach(function (e) { e.textContent = money(item.price); });
        var f = { adults: 1, children: 0.7, infants: 0.1 };
        $$('[data-unit-key]').forEach(function (st) { st.setAttribute('data-unit', Math.round(item.price * f[st.getAttribute('data-unit-key')])); });
        try { sessionStorage.setItem('musafir-last-item', JSON.stringify(item)); } catch (e) {}
      }
      ['adults', 'children', 'infants'].forEach(function (k) { var v = sp_.get(k), i = $('input[name="' + k + '"]', $('[data-steps]')); if (v && i) i.value = v; });
    } catch (e) {}
  }
  $$('[data-coupon-apply]').forEach(function (b) {
    on(b, 'click', function () {
      var box = b.closest('[data-price-calc]'), inp = $('[data-coupon-input]', box), code = (inp.value || '').trim().toUpperCase();
      if (code === 'MUSAFIR10' || code === 'CRUISE10') { box.dataset.discount = '0.1'; var r = $('[data-coupon-row]', box); if (r) r.hidden = false; toast(T('coupon_ok')); recalc(inp); }
      else { toast(T('coupon_bad'), 'error'); }
    });
  });
  $$('[data-stepper]').forEach(function (s) {
    var i = $('input', s), min = +(i.min || 0), max = +(i.max || 99);
    var out = $('[data-step-out]', s);
    var upd = function () { if (out) out.textContent = digits(i.value); recalc(s); };
    $$('[data-step]', s).forEach(function (b) { on(b, 'click', function () { var v = Math.min(max, Math.max(min, (+i.value || 0) + (+b.getAttribute('data-step')))); i.value = v; upd(); }); });
    on(i, 'change', upd); upd();
  });
  $$('[data-addon],[data-tier-select]').forEach(function (a) { on(a, 'change', function () { recalc(a); }); });

  /* ---------- lightbox ---------- */
  var lb = $('#lightbox');
  if (lb) {
    var imgs = $$('[data-lightbox]'), cur = 0, li = $('img', lb), cap = $('[data-lb-cap]', lb);
    var show = function (i) { cur = (i + imgs.length) % imgs.length; li.src = imgs[cur].getAttribute('href'); li.alt = imgs[cur].getAttribute('data-caption') || ''; if (cap) cap.textContent = digits((cur + 1) + ' / ' + imgs.length) + (li.alt ? ' — ' + li.alt : ''); };
    imgs.forEach(function (a, i) { on(a, 'click', function (e) { e.preventDefault(); show(i); lb.showModal(); }); });
    on($('[data-lb-prev]', lb), 'click', function () { show(cur - 1); });
    on($('[data-lb-next]', lb), 'click', function () { show(cur + 1); });
    on(lb, 'keydown', function (e) { if (e.key === 'ArrowLeft') show(cur - 1); if (e.key === 'ArrowRight') show(cur + 1); });
  }

  /* ---------- listings: filters, sort, view, quick filter, pagination ---------- */
  function applyListing(root) {
    var items = $$('[data-item]', root), form = $('[data-filters]', root) || (root.id && $('[data-filters][data-for="' + root.id + '"]'));
    var forms = $$('[data-filters][data-for="' + root.id + '"]'); if (form && forms.indexOf(form) < 0) forms.push(form);
    var get = function (name) { var vals = []; [root._af || forms[0]].forEach(function (f) { if (!f) return; $$('[name="' + name + '"]', f).forEach(function (x) { if ((x.type === 'checkbox' || x.type === 'radio') ? x.checked : x.value) vals.push(x.value); }); }); return vals; };
    var region = get('region'), cats = get('cat'), tiers = get('tier'), stars = get('stars'), maxp = get('maxprice')[0], dur = get('dur')[0], rmin = get('rating')[0], q = (get('q')[0] || '').toLowerCase(), stops = get('stops'), air = get('airline');
    var shown = 0;
    items.forEach(function (it) {
      var ok = true, d = it.dataset;
      if (region.length && region.indexOf(d.region) < 0) ok = false;
      if (cats.length && !cats.some(function (c) { return (d.cats || '').split(' ').indexOf(c) > -1; })) ok = false;
      if (tiers.length && tiers.indexOf(d.tier) < 0) ok = false;
      if (stars.length && stars.indexOf(d.stars) < 0) ok = false;
      if (stops.length && stops.indexOf(d.stops) < 0) ok = false;
      if (air.length && air.indexOf(d.airline) < 0) ok = false;
      if (maxp && +d.price > +maxp) ok = false;
      if (dur) { var r = dur.split('-'); if (+d.days < +r[0] || +d.days > +r[1]) ok = false; }
      if (rmin && +d.rating < +rmin) ok = false;
      if (q && (d.title || it.textContent).toLowerCase().indexOf(q) < 0 && it.textContent.toLowerCase().indexOf(q) < 0) ok = false;
      it.hidden = !ok; if (ok) shown++;
    });
    $$('[data-count-out]').forEach(function (c) { c.textContent = digits(shown); });
    var empty = $('[data-empty]', root); if (empty) empty.hidden = shown > 0;
    $$('[data-maxprice-out]').forEach(function (o) { if (maxp) o.textContent = money(maxp); });
    // active chips
    var chips = $('[data-active-filters]'); if (chips) { var n = region.length + cats.length + tiers.length + stars.length + stops.length + air.length + (rmin ? 1 : 0) + (dur ? 1 : 0); chips.textContent = n ? digits(n) : ''; chips.hidden = !n; }
  }
  $$('[data-listing]').forEach(function (root) {
    var grid = $('[data-items]', root);
    // URL presets e.g. ?type=honeymoon&region=bd&q=...
    var sp = new URLSearchParams(location.search);
    var preset = { cat: sp.get('type'), region: sp.get('region'), tier: sp.get('tier'), q: sp.get('q') };
    $$('[data-filters]').forEach(function (f) {
      Object.keys(preset).forEach(function (k) { if (!preset[k]) return; $$('[name="' + k + '"]', f).forEach(function (x) { if (x.type === 'checkbox') { if (x.value === preset[k]) x.checked = true; } else x.value = preset[k]; }); });
      on(f, 'input', function () { root._af = f; applyListing(root); }); on(f, 'change', function () { root._af = f; applyListing(root); });
      on(f, 'reset', function () { root._af = f; setTimeout(function () { applyListing(root); }, 0); });
      on(f, 'submit', function (e) { e.preventDefault(); applyListing(root); var d = f.closest('[data-drawer]'); if (d) closeDrawer(d); });
    });
    var sort = $('[data-sort]', root);
    on(sort, 'change', function () {
      var v = sort.value, its = $$('[data-item]', grid);
      its.sort(function (a, b) { var A = a.dataset, B_ = b.dataset; if (v === 'price-asc') return A.price - B_.price; if (v === 'price-desc') return B_.price - A.price; if (v === 'rating') return B_.rating - A.rating; if (v === 'duration') return A.days - B_.days; if (v === 'dep') return (A.dep || '').localeCompare(B_.dep || ''); return (+A.order || 0) - (+B_.order || 0); });
      its.forEach(function (i) { grid.appendChild(i); });
    });
    $$('[data-item]', grid).forEach(function (it, i) { it.dataset.order = i; });
    $$('[data-view]', root).forEach(function (b) {
      on(b, 'click', function () {
        var list = b.getAttribute('data-view') === 'list';
        $$('[data-view]', root).forEach(function (x) { x.setAttribute('aria-pressed', x === b ? 'true' : 'false'); });
        grid.classList.toggle('lg:grid-cols-3', !list); grid.classList.toggle('sm:grid-cols-2', !list); grid.classList.toggle('xl:grid-cols-3', !list);
        $$('[data-item]', grid).forEach(function (it) { it.classList.toggle('sm:flex-row', list); var im = it.firstElementChild; if (im) { im.classList.toggle('sm:w-72', list); im.classList.toggle('sm:aspect-auto', list); } });
        store.set('musafir-view', list ? 'list' : 'grid');
      });
    });
    if (store.get('musafir-view') === 'list') { var lb_ = $('[data-view="list"]', root); if (lb_) lb_.click(); }
    applyListing(root);
  });
  $$('[data-sort-btn]').forEach(function (b) {
    on(b, 'click', function () {
      var root = b.closest('[data-listing]'), sel = root && $('[data-sort]', root); if (!sel) return;
      sel.value = b.getAttribute('data-sort-btn'); sel.dispatchEvent(new Event('change'));
      $$('[data-sort-btn]', root).forEach(function (x) { var a = x === b; x.setAttribute('aria-pressed', a ? 'true' : 'false'); x.classList.toggle('bg-brand-700', a); x.classList.toggle('text-white', a); x.classList.toggle('bg-white', !a); x.classList.toggle('dark:bg-ink-900', !a); });
    });
  });
  $$('[data-filter-group]').forEach(function (g) {
    $$('[data-quick-filter]', g).forEach(function (b) {
      on(b, 'click', function () {
        var v = b.getAttribute('data-quick-filter');
        $$('[data-quick-filter]', g).forEach(function (x) { var a = x === b; x.classList.toggle('is-active', a); x.setAttribute('aria-pressed', a ? 'true' : 'false'); });
        $$('[data-item]', g).forEach(function (it) { var d = it.dataset; it.hidden = !(v === 'all' || d.region === v || (d.cats || '').split(' ').indexOf(v) > -1 || d.tier === v || d.status === v || d.kind === v); });
      });
    });
  });
  $$('[data-pagination]').forEach(function (p) {
    var btns = $$('[data-page]', p).filter(function (b) { return /^\d+$/.test(b.getAttribute('data-page')); }), cur = 1;
    var set = function (n) {
      cur = Math.max(1, Math.min(btns.length, n));
      btns.forEach(function (b, i) { var a = i + 1 === cur; b.className = 'h-10 min-w-10 rounded-xl px-3 text-sm font-semibold ' + (a ? 'bg-brand-700 text-white' : 'border border-ink-200 hover:border-brand-500 dark:border-ink-700'); if (a) b.setAttribute('aria-current', 'page'); else b.removeAttribute('aria-current'); });
      $('[data-page="prev"]', p).disabled = cur === 1; $('[data-page="next"]', p).disabled = cur === btns.length;
    };
    $$('[data-page]', p).forEach(function (b) { on(b, 'click', function () { var v = b.getAttribute('data-page'); set(v === 'prev' ? cur - 1 : v === 'next' ? cur + 1 : +v); var top = p.closest('section') || document.body; window.scrollTo({ top: top.getBoundingClientRect().top + window.scrollY - 90, behavior: 'smooth' }); }); });
  });

  /* ---------- multi-step booking ---------- */
  $$('[data-steps]').forEach(function (wrap) {
    var steps = $$('[data-step-panel]', wrap), ind = $$('[data-step-ind]', wrap), cur = 0;
    var go = function (n, init) {
      cur = Math.max(0, Math.min(steps.length - 1, n));
      steps.forEach(function (s, i) { s.hidden = i !== cur; });
      ind.forEach(function (d, i) { d.setAttribute('data-state', i < cur ? 'done' : i === cur ? 'current' : 'todo'); if (i === cur) d.setAttribute('aria-current', 'step'); else d.removeAttribute('aria-current'); });
      var lbl = $('[data-step-label]', wrap); if (lbl) lbl.textContent = T('step') + ' ' + digits(cur + 1) + '/' + digits(steps.length);
      var bar = $('[data-step-bar]', wrap); if (bar) bar.style.width = ((cur + 1) / steps.length * 100) + '%';
      if (init) return;
      window.scrollTo({ top: wrap.getBoundingClientRect().top + window.scrollY - 90, behavior: 'smooth' });
      var h = $('h2', steps[cur]); if (h) { h.setAttribute('tabindex', '-1'); h.focus({ preventScroll: true }); }
    };
    $$('[data-next]', wrap).forEach(function (b) { on(b, 'click', function () { if (!M.validate(steps[cur])) { toast(T('required'), 'error'); return; } if (b.hasAttribute('data-pay')) { b.disabled = true; var o = b.innerHTML; b.innerHTML = '<span class="h-4 w-4 animate-spin rounded-full border-2 border-white/40 border-t-white"></span>'; setTimeout(function () { b.disabled = false; b.innerHTML = o; toast(T('paid')); var rd = b.getAttribute('data-redirect'); if (rd) { setTimeout(function () { location.href = rd; }, 600); return; } go(cur + 1); }, 1100); return; } go(cur + 1); }); });
    $$('[data-prev]', wrap).forEach(function (b) { on(b, 'click', function () { go(cur - 1); }); });
    go(0, true);
  });
  // payment method switch
  $$('[data-paymethod]').forEach(function (r) { on(r, 'change', function () { $$('[data-pay-panel]').forEach(function (p) { var a = p.getAttribute('data-pay-panel') === r.value; p.hidden = !a; $$('input,select', p).forEach(function (i) { i.disabled = !a; }); }); }); if (r.checked) r.dispatchEvent(new Event('change')); });

  /* ---------- uploads (mock) ---------- */
  $$('[data-dropzone]').forEach(function (z) {
    var input = $('input[type=file]', z), list = $(z.getAttribute('data-list')) || $('[data-files]', z);
    var add = function (files) {
      Array.prototype.forEach.call(files, function (f) {
        var row = document.createElement('div'); row.className = 'flex items-center gap-3 rounded-xl border border-ink-100 p-3 text-sm dark:border-ink-800';
        row.innerHTML = '<span class="grid h-9 w-9 place-items-center rounded-lg bg-brand-50 text-brand-700 dark:bg-brand-900/40 dark:text-brand-300">📄</span><div class="min-w-0 flex-1"><p class="truncate font-semibold"></p><div class="mt-1 h-1.5 overflow-hidden rounded-full bg-ink-100 dark:bg-ink-800"><div class="h-full w-0 rounded-full bg-brand-600 transition-all duration-700"></div></div></div>';
        var fn = $('[data-file-name]', z); if (!list) { if (fn) fn.textContent = '✓ ' + f.name; z.classList.add('border-brand-500'); return; }
        $('p', row).textContent = f.name; list.appendChild(row);
        setTimeout(function () { $('.bg-brand-600', row).style.width = '100%'; }, 50);
      });
      toast(T('saved'));
    };
    on(input, 'change', function () { add(input.files); });
    ['dragenter', 'dragover'].forEach(function (ev) { on(z, ev, function (e) { e.preventDefault(); z.classList.add('ring-2', 'ring-brand-500'); }); });
    ['dragleave', 'drop'].forEach(function (ev) { on(z, ev, function (e) { e.preventDefault(); z.classList.remove('ring-2', 'ring-brand-500'); if (ev === 'drop') add(e.dataTransfer.files); }); });
  });

  /* ---------- star rating input ---------- */
  $$('[data-rate]').forEach(function (g) { var bs = $$('button', g), inp = $('input', g); bs.forEach(function (b, i) { on(b, 'click', function () { inp.value = i + 1; bs.forEach(function (x, j) { x.classList.toggle('text-accent-400', j <= i); x.classList.toggle('text-ink-300', j > i); x.setAttribute('aria-pressed', j <= i ? 'true' : 'false'); }); }); }); });

  /* ---------- range output ---------- */
  $$('input[type=range][data-out]').forEach(function (r) { var o = $(r.getAttribute('data-out')); var f = function () { if (o) o.textContent = money(r.value); }; on(r, 'input', f); f(); });

  /* ---------- currency switcher (display only; charged in BDT) ---------- */
  var RATES = { BDT: 1, USD: 122, EUR: 132 }, SYM = { BDT: '৳\u00a0', USD: 'US$\u00a0', EUR: '€\u00a0' };
  var CUR = store.get('musafir-cur', 'BDT'); if (!RATES[CUR]) CUR = 'BDT';
  var ORIG = new WeakMap(), PRICE_RE = /৳[\s\u00a0]?([\d০-৯][\d০-৯,]*)/g;
  var toAscii = function (s) { return s.replace(/[০-৯]/g, function (d) { return BN.indexOf(d); }); };
  var intl = function (n) { return n.toLocaleString('en-US'); };
  function convertNode(n) {
    var src = ORIG.has(n) ? ORIG.get(n) : n.nodeValue;
    if (src.indexOf('৳') < 0) return;
    if (!ORIG.has(n)) ORIG.set(n, src);
    var out = CUR === 'BDT' ? src : src.replace(PRICE_RE, function (m, num) { var v = +toAscii(num).replace(/,/g, ''); return SYM[CUR] + digits(intl(Math.round(v / RATES[CUR]))); });
    if (n.nodeValue !== out) { n._musafirSet = true; n.nodeValue = out; }
  }
  function convertAll(root) {
    var w = document.createTreeWalker(root || document.body, NodeFilter.SHOW_TEXT, { acceptNode: function (n) { return (ORIG.has(n) || n.nodeValue.indexOf('৳') > -1) && !(n.parentNode && /^(SCRIPT|STYLE|TEXTAREA)$/.test(n.parentNode.nodeName)) ? 1 : 3; } });
    var n; while ((n = w.nextNode())) convertNode(n);
  }
  M.convertPrices = convertAll;
  if (window.MutationObserver) {
    new MutationObserver(function (ms) {
      if (CUR === 'BDT') return;
      ms.forEach(function (m) {
        if (m.type === 'characterData') { var n = m.target; if (n._musafirSet) { n._musafirSet = false; return; } ORIG.delete(n); convertNode(n); }
        else m.addedNodes.forEach(function (a) { if (a.nodeType === 3) { ORIG.delete(a); convertNode(a); } else if (a.nodeType === 1) convertAll(a); });
      });
    }).observe(document.body, { subtree: true, childList: true, characterData: true });
  }
  $$('[data-currency]').forEach(function (s) {
    s.value = CUR;
    on(s, 'change', function () {
      CUR = s.value; store.set('musafir-cur', CUR); $$('[data-currency]').forEach(function (o) { o.value = CUR; });
      convertAll();
      toast(CUR === 'BDT' ? T('saved') : (M.lang === 'bn' ? 'আনুমানিক ' + CUR + ' মূল্য দেখানো হচ্ছে; পরিশোধ হবে টাকায়।' : 'Showing approximate ' + CUR + ' prices; you pay in BDT.'));
    });
  });
  if (CUR !== 'BDT') convertAll();

  /* ---------- admin: sidebar, select-all, bulk ---------- */
  var shell = $('[data-admin-shell]');
  if (shell) {
    if (store.get('musafir-admin-collapsed', false)) shell.classList.add('is-collapsed');
    $$('[data-sidebar-toggle]').forEach(function (b) { on(b, 'click', function () { var c = shell.classList.toggle('is-collapsed'); store.set('musafir-admin-collapsed', c); b.setAttribute('aria-expanded', c ? 'false' : 'true'); }); });
  }
  $$('[data-check-all]').forEach(function (all) {
    var tbl = all.closest('[data-table]') || document, boxes = $$('[data-row-check]', tbl), bar = $('[data-bulk]', tbl);
    var upd = function () { var n = boxes.filter(function (b) { return b.checked; }).length; if (bar) { bar.hidden = n === 0; var o = $('[data-bulk-n]', bar); if (o) o.textContent = digits(n); } all.checked = n === boxes.length; all.indeterminate = n > 0 && n < boxes.length; };
    on(all, 'change', function () { boxes.forEach(function (b) { b.checked = all.checked; }); upd(); });
    boxes.forEach(function (b) { on(b, 'change', upd); });
  });
  $$('[data-confirm-delete]').forEach(function (b) { on(b, 'click', function () { var d = document.getElementById('confirm-dialog'); if (d && d.showModal) { d.showModal(); var row = b.closest('[data-row]'); var ok = $('[data-confirm-ok]', d); ok.onclick = function () { d.close(); if (row) { row.style.opacity = '.3'; setTimeout(function () { row.remove(); }, 250); } toast(T('deleted')); }; } }); });
  $$('[data-status-select]').forEach(function (s) { on(s, 'change', function () { toast(T('saved') + ': ' + s.options[s.selectedIndex].text); }); });
  $$('[data-toggle-switch]').forEach(function (s) { on(s, 'click', function () { var a = s.getAttribute('aria-checked') !== 'true'; s.setAttribute('aria-checked', a ? 'true' : 'false'); }); });

  /* ---------- charts (Chart.js, theme-aware) ---------- */
  var charts = [];
  function drawCharts() {
    if (!window.Chart) return;
    charts.forEach(function (c) { c.destroy(); }); charts = [];
    var dark = document.documentElement.classList.contains('dark');
    var grid = dark ? 'rgba(148,163,184,.12)' : 'rgba(15,23,42,.06)', txt = dark ? '#94A3B8' : '#64748B';
    Chart.defaults.font.family = getComputedStyle(document.body).fontFamily; Chart.defaults.color = txt;
    $$('[data-chart]').forEach(function (cv) {
      var cfg = JSON.parse(cv.getAttribute('data-chart'));
      (cfg.data.datasets || []).forEach(function (ds) { if (ds.fill && ds.type !== 'bar' && cfg.type === 'line') { var ctx = cv.getContext('2d'), g = ctx.createLinearGradient(0, 0, 0, cv.height || 300); g.addColorStop(0, (ds.borderColor || '#14A497') + '55'); g.addColorStop(1, (ds.borderColor || '#14A497') + '00'); ds.backgroundColor = g; } });
      cfg.options = Object.assign({ responsive: true, maintainAspectRatio: false, plugins: { legend: { display: cfg.type === 'doughnut', position: 'bottom', labels: { boxWidth: 10, usePointStyle: true } }, tooltip: { padding: 10, cornerRadius: 10 } } }, cfg.options || {});
      if (cfg.type !== 'doughnut') cfg.options.scales = Object.assign({ x: { grid: { display: false }, ticks: { color: txt } }, y: { grid: { color: grid }, border: { display: false }, ticks: { color: txt, callback: function (v) { return cv.hasAttribute('data-money') ? digits(v >= 1e5 ? (v / 1e5) + (M.lang === 'bn' ? ' লাখ' : 'L') : v) : digits(v); } } } }, cfg.options.scales || {});
      charts.push(new Chart(cv, cfg));
    });
  }
  if ($('[data-chart]')) { var tryDraw = function () { if (window.Chart) drawCharts(); else setTimeout(tryDraw, 60); }; tryDraw(); on(document, 'themechange', drawCharts); }

  /* ---------- trip planner ---------- */
  var PL = $('[data-planner]');
  if (PL) (function () {
    var data = JSON.parse($('#planner-data').textContent), L = function (k) { return PL.getAttribute('data-l-' + k); };
    var days = {}, order = [], KEY = 'musafir-plan';
    var daysBox = $('[data-plan-days]', PL), tl = $('[data-plan-timeline]', PL);
    function fmtDate(d) { try { return d.toLocaleDateString(M.lang === 'bn' ? 'bn-BD' : 'en-GB', { day: 'numeric', month: 'short', weekday: 'short' }); } catch (e) { return d.toDateString(); } }
    function esc(s) { return String(s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }
    function renderDays() {
      if (!order.length) { daysBox.innerHTML = '<p class="rounded-2xl border border-dashed border-ink-200 p-5 text-center text-sm muted dark:border-ink-700">' + esc(L('none')) + '</p>'; return; }
      daysBox.innerHTML = order.map(function (s, i) { var d = data.dest[s]; return '<div class="flex items-center gap-3 rounded-2xl border border-ink-100 p-3 dark:border-ink-800"><img src="' + d.img + '" alt="" class="h-12 w-12 rounded-xl object-cover" width="48" height="48"><div class="min-w-0 flex-1"><p class="truncate font-semibold">' + digits(i + 1) + '. ' + esc(d.name) + '</p><p class="text-xs muted">' + money(d.land) + ' / ' + esc(L('day')) + '</p></div><div class="flex items-center gap-2"><button type="button" class="icon-btn h-8 w-8 border border-ink-200 dark:border-ink-700" data-pd="' + s + '" data-dv="-1" aria-label="' + esc(L('less') + ' — ' + d.name) + '">−</button><b class="w-14 text-center text-sm" aria-live="polite">' + digits(days[s]) + ' ' + esc(L('days')) + '</b><button type="button" class="icon-btn h-8 w-8 border border-ink-200 dark:border-ink-700" data-pd="' + s + '" data-dv="1" aria-label="' + esc(L('more') + ' — ' + d.name) + '">+</button></div></div>'; }).join('');
    }
    function calc() {
      var ad = +$('[data-plan-adults]', PL).value, kd = +$('[data-plan-kids]', PL).value, pax = ad + kd * 0.7, heads = ad + kd;
      var tier = $('[data-plan-tier]:checked', PL), mult = tier ? +tier.getAttribute('data-mult') : 1;
      var total = 0, land = 0, air = 0, acts = 0, maxAir = 0, td = 0;
      order.forEach(function (s) { var d = data.dest[s]; land += d.land * days[s] * mult * pax; maxAir = Math.max(maxAir, d.air); td += days[s]; });
      air = order.length ? (maxAir + (order.length - 1) * 6000) * pax : 0;
      $$('[data-plan-act]:checked', PL).forEach(function (c) { if (!c.closest('[data-plan-act-row]').hidden) acts += +c.getAttribute('data-price') * heads; });
      land = Math.round(land / 100) * 100; air = Math.round(air / 100) * 100; total = land + air + acts;
      $('[data-plan-air]', PL).textContent = money(air); $('[data-plan-land]', PL).textContent = money(land); $('[data-plan-acts]', PL).textContent = money(acts);
      $('[data-plan-total]', PL).textContent = money(total); $('[data-plan-pp]', PL).textContent = money(heads ? Math.round(total / heads) : 0);
      $('[data-plan-totaldays]', PL).textContent = digits(td); $('[data-plan-places]', PL).textContent = digits(order.length);
      $('[data-plan-quote]', PL).disabled = !order.length;
      // timeline
      if (!order.length) { tl.innerHTML = '<li class="muted">' + esc(L('none')) + '</li>'; return; }
      var st = new Date(($('[data-plan-start]', PL).value || '2026-12-18') + 'T00:00:00'), n = 0, rows = [];
      order.forEach(function (s) { var d = data.dest[s]; for (var k = 0; k < days[s]; k++) { var dt = new Date(st); dt.setDate(st.getDate() + n); n++; rows.push('<li class="flex gap-3"><span class="w-16 shrink-0 text-xs font-bold text-brand-700 dark:text-brand-300">' + esc(L('day')) + ' ' + digits(n) + '<br><span class="font-normal muted">' + esc(fmtDate(dt)) + '</span></span><span>' + esc(d.name) + ' — ' + esc(k === 0 ? L('arrive') : L('explore')) + '</span></li>'); } });
      var end = new Date(st); end.setDate(st.getDate() + n);
      rows.push('<li class="flex gap-3"><span class="w-16 shrink-0 text-xs font-bold text-brand-700 dark:text-brand-300">' + esc(L('day')) + ' ' + digits(n + 1) + '<br><span class="font-normal muted">' + esc(fmtDate(end)) + '</span></span><span>' + esc(L('fly')) + '</span></li>');
      tl.innerHTML = rows.join('');
    }
    function syncActs() { $$('[data-plan-act-row]', PL).forEach(function (r) { var d = r.getAttribute('data-dest'); r.hidden = !!d && order.indexOf(d) < 0; }); }
    function update() { renderDays(); syncActs(); calc(); }
    $$('[data-plan-dest]', PL).forEach(function (c) {
      on(c, 'change', function () {
        var s = c.value;
        if (c.checked) { if (order.length >= 4) { c.checked = false; toast(L('max'), 'error'); return; } order.push(s); days[s] = days[s] || data.dest[s].def; }
        else { order = order.filter(function (x) { return x !== s; }); }
        update();
      });
    });
    on(daysBox, 'click', function (e) { var b = e.target.closest('[data-pd]'); if (!b) return; var s = b.getAttribute('data-pd'); days[s] = Math.min(14, Math.max(1, days[s] + +b.getAttribute('data-dv'))); renderDays(); calc(); var nb = $('[data-pd="' + s + '"][data-dv="' + b.getAttribute('data-dv') + '"]', daysBox); if (nb) nb.focus(); });
    $$('[data-plan-adults],[data-plan-kids],[data-plan-tier],[data-plan-start],[data-plan-act]', PL).forEach(function (x) { on(x, 'change', calc); });
    function snapshot() { return { order: order, days: days, adults: $('[data-plan-adults]', PL).value, kids: $('[data-plan-kids]', PL).value, start: $('[data-plan-start]', PL).value, tier: ($('[data-plan-tier]:checked', PL) || {}).value, acts: $$('[data-plan-act]:checked', PL).map(function (c) { return c.value; }) }; }
    on($('[data-plan-save]', PL), 'click', function () { try { localStorage.setItem(KEY, JSON.stringify(snapshot())); } catch (e) {} toast(L('saved')); });
    on($('[data-plan-form]', PL), 'submit', function (e) { e.preventDefault(); var ref = 'MSF-TP-' + String(Date.now()).slice(-5); try { localStorage.setItem(KEY, JSON.stringify(snapshot())); } catch (er) {} $('#quote-dialog').close(); toast(L('sent') + ' ' + digits(ref)); });
    // restore (saved plan) or URL preset ?dest=bali
    var saved = null; try { saved = JSON.parse(localStorage.getItem(KEY) || 'null'); } catch (e) {}
    var pre = new URLSearchParams(location.search).get('dest');
    if (pre && data.dest[pre]) saved = { order: [pre], days: {} };
    if (saved && saved.order) {
      saved.order.forEach(function (s) { if (!data.dest[s]) return; var c = $('[data-plan-dest][value="' + s + '"]', PL); if (c) c.checked = true; order.push(s); days[s] = (saved.days && saved.days[s]) || data.dest[s].def; });
      if (saved.adults) $('[data-plan-adults]', PL).value = saved.adults; if (saved.kids) $('[data-plan-kids]', PL).value = saved.kids; if (saved.start) $('[data-plan-start]', PL).value = saved.start;
      if (saved.tier) { var tr_ = $('[data-plan-tier][value="' + saved.tier + '"]', PL); if (tr_) tr_.checked = true; }
      (saved.acts || []).forEach(function (a) { var c = $('[data-plan-act][value="' + a + '"]', PL); if (c) c.checked = true; });
    }
    update();
  })();

  /* ---------- FAQ search ---------- */
  $$('[data-faq-search]').forEach(function (inp) {
    var grp = inp.closest('[data-filter-group]'), empty = $('[data-faq-empty]', grp);
    on(inp, 'input', function () {
      var q = inp.value.trim().toLowerCase(), n = 0;
      $$('[data-item]', grp).forEach(function (it) { var ok = !q || it.textContent.toLowerCase().indexOf(q) > -1; it.hidden = !ok; if (ok) { n++; if (q) it.open = true; } });
      if (empty) empty.hidden = n > 0;
    });
  });
  /* ---------- gift card live preview ---------- */
  $$('[data-gift]').forEach(function (g) {
    var amt = $('[data-gift-amt]', g), to = $('[data-gift-to]', g), def = to ? to.textContent : '';
    $$('[data-gift-opt]', g).forEach(function (r) { on(r, 'change', function () { amt.textContent = money(+r.value); }); });
    var nm = $('[data-gift-name]', g); if (nm) on(nm, 'input', function () { to.textContent = nm.value ? (M.lang === 'bn' ? nm.value + '-এর জন্য' : 'For ' + nm.value) : def; });
  });


  /* ---------- portal/admin data tables: search, filter, sort (table + mobile cards stay in sync) ---------- */
  $$('[data-dt]').forEach(function (dt) {
    var id = dt.id, fl = $('[data-dt-filters="' + id + '"]'), q = $('[data-dt-search="' + id + '"]'), fv = 'all', field = fl ? fl.getAttribute('data-dt-field') : 'status';
    var rows = function () { return $$('[data-dt-row]', dt); };
    function apply() {
      var s = q ? q.value.trim().toLowerCase() : '', n = 0;
      rows().forEach(function (r) { var ok = (fv === 'all' || r.dataset[field] === fv) && (!s || r.textContent.toLowerCase().indexOf(s) > -1); r.hidden = !ok; if (ok && !r.closest('[data-dt-cards]')) n++; });
      var c = $('[data-dt-count]', dt); if (c) c.textContent = digits(n);
      var e = $('[data-dt-empty]', dt); if (e) e.classList.toggle('hidden', n > 0);
    }
    if (fl) $$('[data-dt-filter]', fl).forEach(function (b) { on(b, 'click', function () { fv = b.getAttribute('data-dt-filter'); $$('[data-dt-filter]', fl).forEach(function (x) { var a = x === b; x.classList.toggle('is-active', a); x.setAttribute('aria-pressed', a ? 'true' : 'false'); }); apply(); }); });
    if (q) { on(q, 'input', apply); var pre = new URLSearchParams(location.search).get('q'); if (pre) { q.value = pre; } }
    $$('[data-dt-sort]', dt).forEach(function (b) {
      var dir = 1; on(b, 'click', function () {
        var k = b.getAttribute('data-dt-sort'); dir = -dir;
        [$('[data-dt-body]', dt), $('[data-dt-cards]', dt)].forEach(function (box) { if (!box) return; $$('[data-dt-row]', box).sort(function (x, y) { var A_ = x.dataset[k], B_ = y.dataset[k]; return (isNaN(A_) ? String(A_).localeCompare(B_) : A_ - B_) * dir; }).forEach(function (r) { box.appendChild(r); }); });
        var th = b.closest('th'); $$('th', dt).forEach(function (x) { x.removeAttribute('aria-sort'); }); if (th) th.setAttribute('aria-sort', dir > 0 ? 'ascending' : 'descending');
      });
    });
    apply();
  });
  /* admin search shortcut "/" */
  on(document, 'keydown', function (e) { if (e.key === '/' && !/INPUT|TEXTAREA|SELECT/.test((document.activeElement || {}).tagName || '')) { var s = $('#adm-q'); if (s && s.offsetParent) { e.preventDefault(); s.focus(); } } });
  /* kanban: move lead card to next stage (demo) */
  $$('[data-move-next]').forEach(function (b) { on(b, 'click', function () { var card = b.closest('[data-kcard]'), col = card && card.closest('[data-kcol]'), next = col && col.nextElementSibling; if (next && $('[data-klist]', next)) { $('[data-klist]', next).prepend(card); [col, next].forEach(function (c) { var n = $('[data-kn]', c); if (n) n.textContent = digits($$('[data-kcard]', c).length); }); toast(T('saved')); } }); });
  /* chat composer (portal support) */
  $$('[data-chat-form]').forEach(function (f) { on(f, 'submit', function (e) { e.preventDefault(); var i = $('textarea,input', f), v = i.value.trim(); if (!v) return; var log = $(f.getAttribute('data-chat-form')); var d = document.createElement('div'); d.className = 'ml-auto max-w-[85%] rounded-2xl rounded-br-md bg-brand-700 px-4 py-2.5 text-sm text-white'; d.textContent = v; log.appendChild(d); i.value = ''; log.scrollTop = log.scrollHeight; }); });
  /* ---------- misc ---------- */
  $$('input[type=date][data-min-today]').forEach(function (d) { d.min = new Date().toISOString().slice(0, 10); });
  $$('[data-year]').forEach(function (y) { y.textContent = digits(new Date().getFullYear()); });
})();
