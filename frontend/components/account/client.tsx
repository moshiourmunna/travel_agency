'use client';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';
import { useSite } from '@/components/client/SiteContext';
import { toast } from '@/components/client/store';

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
      try { localStorage.removeItem('musafir-wish-synced'); } catch {}
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
