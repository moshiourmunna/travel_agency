'use client';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';
import { useSite } from '@/components/client/SiteContext';
import { KEYS, read, toast, write } from '@/components/client/store';

const WISH_KINDS = ['tour', 'cruise', 'activity', 'hotel'];

export type MeRes = { ok: boolean; status: number; data?: any; message?: string; errors?: Record<string, string[]> };

/** Call the traveller API through the BFF (/api/me/*). A 401 means the session ended: clear it and sign in again. */
export function useMe() {
  const { lang } = useSite();
  return async (method: string, path: string, body?: unknown): Promise<MeRes> => {
    const multipart = typeof FormData !== 'undefined' && body instanceof FormData;
    try {
      const r = await fetch(`/api/me/${path.replace(/^\//, '')}${path.includes('?') ? '&' : '?'}lang=${lang}`, {
        method, headers: { Accept: 'application/json', ...(body && !multipart ? { 'Content-Type': 'application/json' } : {}) },
        body: body === undefined ? undefined : multipart ? (body as FormData) : JSON.stringify(body),
      });
      if (r.status === 401) {
        const back = window.location.pathname + window.location.search;
        window.location.assign(`/api/auth/logout?next=${encodeURIComponent(`/${lang}/login?next=${encodeURIComponent(back)}`)}`);
        return { ok: false, status: 401 };
      }
      const j = await r.json().catch(() => ({}));
      return { ok: r.ok, status: r.status, data: j.data, message: j.message, errors: j.errors };
    } catch { return { ok: false, status: 0 }; }
  };
}

/** Turn a form into JSON: a[b] → nested objects, x[] → arrays, unnamed-value checkboxes → booleans, number inputs → numbers, '' → null. */
function formJson(f: HTMLFormElement) {
  const out: Record<string, any> = {};
  const put = (name: string, v: any) => {
    const isArr = name.endsWith('[]');
    const parts = (isArr ? name.slice(0, -2) : name).replace(/\]/g, '').split('[');
    let o = out;
    parts.slice(0, -1).forEach((p) => { o[p] = o[p] ?? {}; o = o[p]; });
    const last = parts[parts.length - 1];
    if (isArr) { o[last] = Array.isArray(o[last]) ? o[last] : []; if (v !== undefined) o[last].push(v); }
    else o[last] = v;
  };
  for (const el of Array.from(f.elements) as HTMLInputElement[]) {
    if (!el.name || el.disabled || el.type === 'submit' || el.type === 'button' || el.type === 'file' || el.dataset.skip !== undefined) continue;
    if (el.type === 'checkbox') {
      if (el.name.endsWith('[]')) put(el.name, el.checked ? el.value : undefined);
      else put(el.name, el.hasAttribute('value') ? (el.checked ? el.value : null) : el.checked);
    } else if (el.type === 'radio') { if (el.checked) put(el.name, el.value); }
    else if (el.type === 'number') put(el.name, el.value === '' ? null : Number(el.value));
    else put(el.name, el.value.trim() === '' ? null : el.value.trim());
  }
  return out;
}

/** Show Laravel validation errors next to their fields (adds .is-invalid + a .field-error line), plus a form-level message. */
function showErrors(f: HTMLFormElement, r: MeRes, fallback: string, tooMany: string) {
  f.querySelectorAll('[data-err]').forEach((n) => n.remove());
  f.querySelectorAll('.is-invalid').forEach((n) => n.classList.remove('is-invalid'));
  let first: HTMLElement | null = null;
  const unplaced: string[] = [];
  for (const [k, msgs] of Object.entries(r.errors ?? {})) {
    const name = k.split('.').map((p, n) => (n ? `[${p}]` : p)).join('');
    const el = f.querySelector<HTMLElement>(`[name="${name}"],[name="${name}[]"],[name="${k}"]`);
    if (!el) { unplaced.push(msgs[0]); continue; }
    const box = el.closest('.field') ?? el.parentElement!;
    box.classList.add('is-invalid');
    el.setAttribute('aria-invalid', 'true');
    const p = document.createElement('p');
    p.className = 'field-error'; p.dataset.err = ''; p.setAttribute('role', 'alert'); p.textContent = msgs[0];
    box.appendChild(p);
    first = first ?? el;
  }
  const msg = r.status === 429 ? tooMany : unplaced[0] ?? (first ? null : r.message || fallback);
  if (msg) {
    const p = document.createElement('div');
    p.dataset.err = ''; p.setAttribute('role', 'alert'); p.dataset.formError = '';
    p.className = 'mt-3 rounded-xl border border-rose-200 bg-rose-50 p-3 text-sm text-rose-800 dark:border-rose-900 dark:bg-rose-950/40 dark:text-rose-200';
    p.textContent = msg;
    (f.querySelector('[data-form-msg]') ?? f).appendChild(p);
  }
  first?.focus();
}

/**
 * A form that saves to the traveller API. On success: toast, refresh the server-rendered page (so totals/badges update),
 * close a surrounding <dialog>, optionally reset or navigate.
 */
export function ApiForm({ path, method = 'POST', multipart = false, success, reset = false, go, className, children, extra, id, confirm }: {
  path: string; method?: string; multipart?: boolean; success: string; reset?: boolean; go?: string; className?: string; children: React.ReactNode; extra?: Record<string, unknown>; id?: string; confirm?: string;
}) {
  const call = useMe();
  const router = useRouter();
  const { msg } = useSite();
  const [busy, setBusy] = useState(false);
  return (
    <form id={id} className={className} noValidate aria-busy={busy} data-api-form={path} onSubmit={async (e) => {
      e.preventDefault();
      const f = e.currentTarget;
      if (!f.checkValidity()) { f.reportValidity(); return; }
      if (confirm && !window.confirm(confirm)) return;
      setBusy(true);
      let body: unknown;
      if (multipart) { const fd = new FormData(f); for (const [k, v] of Object.entries(extra ?? {})) fd.append(k, String(v)); body = fd; }
      else body = { ...formJson(f), ...(extra ?? {}) };
      const r = await call(method, path, body);
      setBusy(false);
      if (!r.ok) { if (r.status !== 401) showErrors(f, r, msg.error, msg.tooMany); return; }
      f.querySelectorAll('[data-err]').forEach((n) => n.remove());
      f.querySelectorAll('.is-invalid').forEach((n) => n.classList.remove('is-invalid'));
      toast(success);
      if (reset) f.reset();
      f.closest('dialog')?.close();
      if (go) { window.location.assign(go); return; }
      router.refresh();
    }}>
      <fieldset disabled={busy} className="contents">{children}</fieldset>
      <div data-form-msg />
    </form>
  );
}

/** One-click write (delete, mark read, revoke…), with an optional confirm step. */
export function ApiButton({ method, path, body, success, confirm, className, label, children, go }: {
  method: string; path: string; body?: unknown; success: string; confirm?: string; className: string; label?: string; children: React.ReactNode; go?: string;
}) {
  const call = useMe();
  const router = useRouter();
  const { msg } = useSite();
  const [busy, setBusy] = useState(false);
  return (
    <button type="button" className={className} aria-label={label} disabled={busy} aria-busy={busy} data-api-button={path} onClick={async () => {
      if (confirm && !window.confirm(confirm)) return;
      setBusy(true);
      const r = await call(method, path, body);
      setBusy(false);
      if (!r.ok) { if (r.status !== 401) toast(r.status === 429 ? msg.tooMany : r.message || msg.error, 'error'); return; }
      toast(success);
      if (go) { window.location.assign(go); return; }
      router.refresh();
    }}>{children}</button>
  );
}

/** Native <dialog> with a trigger button; ApiForm inside closes it on success. */
export function Modal({ trigger, triggerClass, title, closeLabel, children, id, wide = false }: { trigger: React.ReactNode; triggerClass: string; title: string; closeLabel: string; children: React.ReactNode; id?: string; wide?: boolean }) {
  const ref = useRef<HTMLDialogElement>(null);
  return (
    <>
      <button type="button" className={triggerClass} onClick={() => ref.current?.showModal()} aria-haspopup="dialog" data-modal-open={id}>{trigger}</button>
      <dialog ref={ref} id={id} className={`${wide ? 'w-[min(94vw,40rem)]' : 'w-[min(92vw,30rem)]'} rounded-3xl p-0 backdrop:bg-ink-950/60 dark:bg-ink-900 dark:text-white`} aria-label={title}
        onClick={(e) => { if (e.target === ref.current) ref.current?.close(); }}>
        <div className="p-6">
          <div className="flex items-start justify-between gap-3"><h2 className="text-lg font-bold">{title}</h2>
            <button type="button" className="icon-btn -mr-2 -mt-2" aria-label={closeLabel} onClick={() => ref.current?.close()}>
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5" aria-hidden="true"><path d="M18 6 6 18" /><path d="m6 6 12 12" /></svg>
            </button></div>
          {children}
        </div>
      </dialog>
    </>
  );
}

/** Revokes the token server-side, clears the cookie and goes to the sign-in page. */
export function SignOutButton({ className, label, children }: { className: string; label: string; children: React.ReactNode }) {
  const { lang } = useSite();
  return (
    <button type="button" className={className} data-sign-out onClick={async () => {
      await fetch(`/api/auth/logout?lang=${lang}`, { method: 'POST', headers: { Accept: 'application/json' } }).catch(() => null);
      // The account keeps the wishlist; clear this device's copy so the next person on a shared device starts clean.
      write(KEYS.wish, []);
      window.location.assign(`/${lang}/login`);
    }}>{children}<span>{label}</span></button>
  );
}

/** Left slide-in navigation for the portal on small screens. */
export function SideDrawer({ openLabel, closeLabel, title, openIcon, children }: { openLabel: string; closeLabel: string; title: string; openIcon: React.ReactNode; children: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();
  const opener = useRef<HTMLButtonElement>(null);
  const panel = useRef<HTMLDivElement>(null);
  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => setOpen(false), [pathname]);
  useEffect(() => {
    document.documentElement.classList.toggle('overflow-hidden', open);
    if (!open) return;
    panel.current?.querySelector<HTMLElement>('a,button')?.focus();
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') { setOpen(false); opener.current?.focus(); } };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open]);
  return (
    <>
      <button ref={opener} type="button" className="icon-btn lg:hidden" aria-controls="sidenav" aria-expanded={open} aria-label={openLabel} onClick={() => setOpen(true)}>{openIcon}</button>
      <div id="sidenav" className={`fixed inset-0 z-[60] lg:hidden ${open ? '' : 'hidden'}`} role="dialog" aria-modal="true" aria-label={title}>
        <div className="absolute inset-0 bg-ink-950/50 backdrop-blur-sm" onClick={() => setOpen(false)} />
        <div ref={panel} className="absolute left-0 top-0 flex h-full w-[86%] max-w-xs flex-col bg-white shadow-2xl dark:bg-ink-900">
          <button type="button" className="icon-btn absolute right-3 top-3" aria-label={closeLabel} onClick={() => { setOpen(false); opener.current?.focus(); }}>
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-6 w-6" aria-hidden="true"><path d="M18 6 6 18" /><path d="m6 6 12 12" /></svg>
          </button>
          {children}
        </div>
      </div>
    </>
  );
}

/** Client-side chip filter + search over server-rendered rows ([data-row] with data-group / data-q). */
export function RowFilter({ target, chips, field = 'group', placeholder, label }: { target: string; chips: { value: string; label: string; count?: string }[]; field?: string; placeholder: string; label: string }) {
  const [cur, setCur] = useState('all');
  const [q, setQ] = useState('');
  useEffect(() => {
    const root = document.getElementById(target);
    if (!root) return;
    let shown = 0;
    root.querySelectorAll<HTMLElement>('[data-row]').forEach((r) => {
      const ok = (cur === 'all' || r.dataset[field] === cur) && (!q || (r.dataset.q ?? r.textContent ?? '').toLowerCase().includes(q.toLowerCase()));
      r.hidden = !ok; if (ok) shown++;
    });
    const empty = root.querySelector<HTMLElement>('[data-rows-empty]');
    if (empty) empty.hidden = shown > 0;
  }, [cur, q, target, field]);
  return (
    <div className="mb-4 flex flex-col gap-3 2xl:flex-row 2xl:items-center 2xl:justify-between">
      <div className="-mx-3 flex gap-2 overflow-x-auto px-3 pb-1 sm:mx-0 sm:flex-wrap sm:px-0" role="group" aria-label={label}>
        {chips.map((c) => (
          <button key={c.value} type="button" className={`chip shrink-0 ${cur === c.value ? 'is-active' : ''}`} aria-pressed={cur === c.value} data-filter={c.value} onClick={() => setCur(c.value)}>
            {c.label}{c.count !== undefined ? <span className="ml-1 rounded-full bg-ink-900/10 px-1.5 text-[11px] dark:bg-white/15">{c.count}</span> : null}
          </button>
        ))}
      </div>
      <div className="relative 2xl:w-72"><label htmlFor={`${target}-q`} className="sr-only">{placeholder}</label>
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-500 dark:text-ink-300" aria-hidden="true"><circle cx="11" cy="11" r="8" /><path d="m21 21-4.3-4.3" /></svg>
        <input id={`${target}-q`} type="search" className="input h-10 pl-9" placeholder={placeholder} value={q} onChange={(e) => setQ(e.target.value)} /></div>
    </div>
  );
}

/** Copy-to-clipboard + native share for the referral link. */
export function ShareLink({ link, text, copyLabel, shareLabel, copied }: { link: string; text: string; copyLabel: string; shareLabel: string; copied: string }) {
  return (
    <div className="flex flex-wrap gap-2">
      <button type="button" className="btn btn-primary btn-sm" data-copy-link onClick={async () => { try { await navigator.clipboard.writeText(link); toast(copied); } catch { toast(link); } }}>{copyLabel}</button>
      <button type="button" className="btn btn-outline btn-sm" onClick={async () => {
        if (navigator.share) { try { await navigator.share({ title: text, text, url: link }); } catch {} } else window.open(`https://wa.me/?text=${encodeURIComponent(`${text} ${link}`)}`, '_blank', 'noopener');
      }}>{shareLabel}</button>
    </div>
  );
}

/**
 * Each portal visit: merge this device's wishlist (localStorage) into the account, then mirror the account list back to
 * the device so hearts on public pages match on every browser the traveller signs in on.
 */
export function WishSync() {
  const call = useMe();
  useEffect(() => {
    try {
      const raw = read<string[]>(KEYS.wish, []);
      const items = raw.map((k) => k.split(':')).filter(([kind, slug]) => slug && WISH_KINDS.includes(kind)).map(([kind, slug]) => ({ kind, slug }));
      void call('POST', 'wishlist', { items }).then((r) => {
        if (!r.ok || !Array.isArray(r.data?.keys)) return;
        const merged = Array.from(new Set([...read<string[]>(KEYS.wish, []), ...r.data.keys]));
        write(KEYS.wish, merged);
      });
    } catch {}
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  return null;
}

/** Remove a saved item from the account and from this device. */
export function WishRemove({ kind, slug, label, done, className }: { kind: string; slug: string; label: string; done: string; className: string }) {
  const call = useMe();
  const router = useRouter();
  const { msg } = useSite();
  const [busy, setBusy] = useState(false);
  return (
    <button type="button" className={className} aria-label={label} disabled={busy} data-wish-remove={`${kind}:${slug}`} onClick={async () => {
      setBusy(true);
      const r = await call('POST', 'wishlist', { remove: { kind, slug } });
      setBusy(false);
      if (!r.ok) { if (r.status !== 401) toast(msg.error, 'error'); return; }
      write(KEYS.wish, read<string[]>(KEYS.wish, []).filter((k) => k !== `${kind}:${slug}`));
      toast(done);
      router.refresh();
    }}>
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-[18px] w-[18px]" aria-hidden="true"><path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z" /></svg>
    </button>
  );
}

/** On/off switch that saves immediately (PUT …settings with {[group]: {[name]: value}} or {[name]: value}). */
export function SaveSwitch({ path, name, group, on, labelId, disabled = false, saved }: { path: string; name: string; group?: string; on: boolean; labelId: string; disabled?: boolean; saved: string }) {
  const call = useMe();
  const { msg } = useSite();
  const [v, setV] = useState(on);
  const [busy, setBusy] = useState(false);
  return (
    <button type="button" role="switch" aria-checked={v} aria-labelledby={labelId} aria-disabled={disabled || undefined} disabled={busy || disabled} className="switch" data-switch={name}
      onClick={async () => {
        const next = !v; setV(next); setBusy(true);
        const r = await call('PUT', path, group ? { [group]: { [name]: next } } : { [name]: next });
        setBusy(false);
        if (!r.ok) { setV(!next); if (r.status !== 401) toast(r.message || msg.error, 'error'); return; }
        toast(saved);
      }}><span /></button>
  );
}

/**
 * Pay a due amount from the portal: pick a gateway (or wallet), the server re-computes the amount, then we follow the
 * gateway redirect (or show bank-transfer instructions). Instalment-aware.
 */
export function PayDue({ booking, bookingKey, instalmentId, amount, gateways, wallet, labels, bankInfo }: {
  bankInfo?: React.ReactNode; booking: string; bookingKey?: string; instalmentId?: number | null; amount: string; gateways: { code: string; label: string; sub?: string }[]; wallet: { balance: number; label: string; sub: string; enough: boolean } | null;
  labels: { choose: string; pay: string; secure: string; slip: string; slipHint: string; sent: string; noWallet: string };
}) {
  const { lang, msg } = useSite();
  const [gw, setGw] = useState(gateways[0]?.code ?? (wallet?.enough ? 'wallet' : ''));
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [bank, setBank] = useState<any>(null);
  const slip = useRef<HTMLInputElement>(null);
  return (
    <form className="mt-4" noValidate data-pay-due={booking} onSubmit={async (e) => {
      e.preventDefault(); setErr(null);
      if (gw === 'bank_transfer' && !slip.current?.value.trim()) { setErr(labels.slipHint); slip.current?.focus(); return; }
      setBusy(true);
      const r = await fetch(`/api/bookings/${booking}/pay?lang=${lang}`, { method: 'POST', headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify({ key: bookingKey, gateway: gw, instalment_id: instalmentId ?? null, slip_ref: gw === 'bank_transfer' ? slip.current?.value.trim() : undefined }) }).catch(() => null);
      const j = r ? await r.json().catch(() => ({})) : {};
      setBusy(false);
      if (!r || !r.ok) { setErr(r?.status === 429 ? msg.tooMany : (j.errors ? (Object.values(j.errors) as string[][])[0][0] : j.message) || msg.error); return; }
      if (j.data?.redirect) { window.location.assign(j.data.redirect); return; }
      if (j.data?.pending) { setBank(j.data); toast(labels.sent); return; }
      window.location.reload();
    }}>
      <fieldset disabled={busy}>
        <legend className="label">{labels.choose}</legend>
        <div className="grid gap-2 sm:grid-cols-2">
          {gateways.map((g) => (
            <label key={g.code} className="relative flex cursor-pointer items-center gap-3 rounded-2xl border border-ink-200 p-3 has-[:checked]:border-brand-600 has-[:checked]:bg-brand-50 dark:border-ink-700 dark:has-[:checked]:bg-brand-900/30">
              <input type="radio" name="gateway" value={g.code} className="check" checked={gw === g.code} onChange={() => setGw(g.code)} />
              <span className="min-w-0"><span className="block text-sm font-semibold">{g.label}</span>{g.sub ? <span className="block text-xs muted">{g.sub}</span> : null}</span>
            </label>
          ))}
          {wallet ? (
            <label className={`relative flex items-center gap-3 rounded-2xl border border-ink-200 p-3 has-[:checked]:border-brand-600 has-[:checked]:bg-brand-50 dark:border-ink-700 dark:has-[:checked]:bg-brand-900/30 ${wallet.enough ? 'cursor-pointer' : 'cursor-not-allowed opacity-60'}`}>
              <input type="radio" name="gateway" value="wallet" className="check" disabled={!wallet.enough} checked={gw === 'wallet'} onChange={() => setGw('wallet')} />
              <span><span className="block text-sm font-semibold">{wallet.label}</span><span className="block text-xs muted">{wallet.enough ? wallet.sub : labels.noWallet}</span></span>
            </label>
          ) : null}
        </div>
        {gw === 'bank_transfer' ? bankInfo : null}
        {gw === 'bank_transfer' ? (
          <div className="field mt-3"><label className="label" htmlFor={`slip-${booking}`}>{labels.slip}</label><input ref={slip} id={`slip-${booking}`} className="input" maxLength={64} autoComplete="off" /><p className="mt-1 text-xs muted">{labels.slipHint}</p></div>
        ) : null}
      </fieldset>
      {err ? <div role="alert" data-form-error className="mt-3 rounded-xl border border-rose-200 bg-rose-50 p-3 text-sm text-rose-800 dark:border-rose-900 dark:bg-rose-950/40 dark:text-rose-200">{err}</div> : null}
      {bank ? <div role="status" className="mt-3 rounded-xl border border-sky-200 bg-sky-50 p-3 text-sm text-sky-900 dark:border-sky-900 dark:bg-sky-950/40 dark:text-sky-100">{labels.sent}</div> : null}
      <button className="btn btn-accent btn-lg mt-4 w-full" disabled={busy || !gw} aria-busy={busy}>
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4" aria-hidden="true"><rect width="18" height="11" x="3" y="11" rx="2" ry="2" /><path d="M7 11V7a5 5 0 0 1 10 0v4" /></svg>
        {labels.pay} {amount}
      </button>
      <p className="mt-2 text-center text-xs muted">{labels.secure}</p>
    </form>
  );
}

/** Amount input with quick chips (wallet top-up). */
export function AmountChips({ id, values, labels }: { id: string; values: number[]; labels: string[] }) {
  return (
    <div className="mt-3 flex flex-wrap gap-2">
      {values.map((v, k) => <button key={v} type="button" className="chip" onClick={() => { const el = document.getElementById(id) as HTMLInputElement | null; if (el) { el.value = String(v); el.focus(); } }}>{labels[k]}</button>)}
    </div>
  );
}

/** Wallet top-up: POST → follow the gateway redirect. */
export function TopupForm({ children, labels }: { children: React.ReactNode; labels: { error: string } }) {
  const call = useMe();
  const { msg } = useSite();
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  return (
    <form noValidate data-topup onSubmit={async (e) => {
      e.preventDefault(); setErr(null);
      const f = e.currentTarget;
      if (!f.checkValidity()) { f.reportValidity(); return; }
      const fd = new FormData(f);
      setBusy(true);
      const r = await call('POST', 'wallet/topup', { amount: Number(fd.get('amount')), gateway: fd.get('gateway') });
      setBusy(false);
      if (r.ok && r.data?.redirect) { window.location.assign(r.data.redirect); return; }
      if (r.status !== 401) setErr(r.status === 429 ? msg.tooMany : (r.errors ? Object.values(r.errors)[0][0] : r.message) || labels.error);
    }}>
      <fieldset disabled={busy} className="contents">{children}</fieldset>
      {err ? <div role="alert" data-form-error className="mt-3 rounded-xl border border-rose-200 bg-rose-50 p-3 text-sm text-rose-800 dark:border-rose-900 dark:bg-rose-950/40 dark:text-rose-200">{err}</div> : null}
    </form>
  );
}

/** Support chat composer: text and/or one attachment (PDF/JPG/PNG ≤ 5 MB). */
export function ChatComposer({ ticket, labels }: { ticket: string; labels: { message: string; placeholder: string; attach: string; send: string; sent: string; tooBig: string; remove: string } }) {
  const call = useMe();
  const router = useRouter();
  const { msg } = useSite();
  const [busy, setBusy] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const txt = useRef<HTMLTextAreaElement>(null);
  return (
    <form className="border-t border-ink-100 p-3 dark:border-ink-800" data-chat-form={ticket} onSubmit={async (e) => {
      e.preventDefault();
      const text = txt.current?.value.trim() ?? '';
      if (!text && !file) { txt.current?.focus(); return; }
      const fd = new FormData();
      if (text) fd.append('message', text);
      if (file) fd.append('file', file);
      setBusy(true);
      const r = await call('POST', `tickets/${ticket}/messages`, fd);
      setBusy(false);
      if (!r.ok) { if (r.status !== 401) toast(r.status === 429 ? msg.tooMany : (r.errors ? Object.values(r.errors)[0][0] : r.message) || msg.error, 'error'); return; }
      if (txt.current) txt.current.value = '';
      setFile(null); if (fileRef.current) fileRef.current.value = '';
      toast(labels.sent);
      router.refresh();
    }}>
      {file ? <p className="mb-2 flex items-center gap-2 text-xs muted"><span className="truncate">📎 {file.name}</span><button type="button" className="link-muted font-semibold" onClick={() => { setFile(null); if (fileRef.current) fileRef.current.value = ''; }}>{labels.remove}</button></p> : null}
      <div className="flex items-end gap-2">
        <label htmlFor={`att-${ticket}`} className="icon-btn cursor-pointer" title={labels.attach}>
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5" aria-hidden="true"><path d="m21.44 11.05-9.19 9.19a6 6 0 0 1-8.49-8.49l8.57-8.57A4 4 0 1 1 18 8.84l-8.59 8.57a2 2 0 0 1-2.83-2.83l8.49-8.48" /></svg>
          <span className="sr-only">{labels.attach}</span>
        </label>
        <input ref={fileRef} id={`att-${ticket}`} type="file" className="sr-only" accept=".pdf,.jpg,.jpeg,.png" onChange={(e) => { const f = e.target.files?.[0] ?? null; if (f && f.size > 5 * 1024 * 1024) { toast(labels.tooBig, 'error'); e.target.value = ''; return; } setFile(f); }} />
        <label htmlFor={`msg-${ticket}`} className="sr-only">{labels.message}</label>
        <textarea ref={txt} id={`msg-${ticket}`} rows={1} maxLength={3000} className="input min-h-[2.75rem] flex-1 resize-none" placeholder={labels.placeholder} disabled={busy}
          onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); e.currentTarget.form?.requestSubmit(); } }} />
        <button className="btn btn-primary" aria-label={labels.send} disabled={busy} aria-busy={busy}>
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4" aria-hidden="true"><path d="M14.536 21.686a.5.5 0 0 0 .937-.024l6.5-19a.496.496 0 0 0-.635-.635l-19 6.5a.5.5 0 0 0-.024.937l7.93 3.18a2 2 0 0 1 1.112 1.11z" /><path d="m21.854 2.147-10.94 10.939" /></svg>
        </button>
      </div>
    </form>
  );
}

/** Profile photo picker (uploads immediately). */
export function AvatarUpload({ label, saved, tooBig }: { label: string; saved: string; tooBig: string }) {
  const call = useMe();
  const router = useRouter();
  const { msg } = useSite();
  const [busy, setBusy] = useState(false);
  return (
    <label className={`absolute bottom-0 right-0 grid h-8 w-8 cursor-pointer place-items-center rounded-full bg-brand-700 text-white ring-4 ring-white dark:ring-ink-900 ${busy ? 'opacity-60' : ''}`} title={label}>
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4" aria-hidden="true"><path d="M14.5 4h-5L7 7H4a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2h-3l-2.5-3z" /><circle cx="12" cy="13" r="3" /></svg>
      <span className="sr-only">{label}</span>
      <input type="file" accept="image/jpeg,image/png,image/webp" className="sr-only" data-avatar-input disabled={busy} onChange={async (e) => {
        const f = e.target.files?.[0]; e.target.value = '';
        if (!f) return;
        if (f.size > 2 * 1024 * 1024) { toast(tooBig, 'error'); return; }
        const fd = new FormData(); fd.append('photo', f);
        setBusy(true);
        const r = await call('POST', 'avatar', fd);
        setBusy(false);
        if (!r.ok) { if (r.status !== 401) toast((r.errors ? Object.values(r.errors)[0][0] : r.message) || msg.error, 'error'); return; }
        toast(saved); router.refresh();
      }} />
    </label>
  );
}

/** Toast + clean URL after returning from a gateway (?topup=success|failed|cancelled, ?paid=…). */
export function ReturnNotice({ param, messages }: { param: string; messages: Record<string, [string, 'ok' | 'error']> }) {
  useEffect(() => {
    const u = new URL(window.location.href);
    const v = u.searchParams.get(param);
    if (!v || !messages[v]) return;
    toast(messages[v][0], messages[v][1] === 'error' ? 'error' : undefined);
    u.searchParams.delete(param);
    window.history.replaceState(null, '', u.pathname + (u.search ? u.search : '') + u.hash);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  return null;
}

/** Departure countdown (d/h/m/s) for the dashboard hero. */
export function DepartCountdown({ to, label, units }: { to: string; label: string; units: [string, string, string, string] }) {
  const [left, setLeft] = useState<number | null>(null);
  useEffect(() => {
    const end = new Date(to).getTime();
    const tick = () => setLeft(Math.max(0, end - Date.now()));
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [to]);
  const { lang } = useSite();
  const fmt = (n: number) => (lang === 'bn' ? String(n).replace(/\d/g, (x) => '০১২৩৪৫৬৭৮৯'[+x]) : String(n));
  const parts = left === null ? null : [Math.floor(left / 86400000), Math.floor(left / 3600000) % 24, Math.floor(left / 60000) % 60, Math.floor(left / 1000) % 60];
  return (
    <div className="grid grid-cols-4 gap-2 text-center" role="timer" aria-label={label}>
      {units.map((u, k) => <div key={u} className="min-w-[3.25rem] rounded-xl bg-ink-950/50 px-2 py-2"><b className="block text-xl tabular-nums" data-cd={'dhms'[k]}>{parts ? fmt(parts[k]) : '–'}</b><span className="text-[11px] text-ink-100">{u}</span></div>)}
    </div>
  );
}
