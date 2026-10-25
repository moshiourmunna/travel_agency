'use client';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useEffect, useRef, useState, useTransition } from 'react';
import { KEYS, useStored, write } from '@/components/client/store';

/** Results grid that follows the saved grid/list preference (cards use `group-data-[view=list]/view:` variants). */
export function ListingGrid({ className, listClass, children }: { className: string; listClass?: string; children: React.ReactNode }) {
  const view = useStored<string>(KEYS.view, 'grid');
  const [pending] = usePendingNav();
  return <div className={`group/view ${className} ${view === 'list' && listClass ? listClass : ''} ${pending ? 'opacity-60 transition-opacity' : ''}`} data-view={view} data-items aria-busy={pending || undefined}>{children}</div>;
}

export function ViewToggle({ label, grid, list, gridIcon, listIcon }: { label: string; grid: string; list: string; gridIcon: React.ReactNode; listIcon: React.ReactNode }) {
  const view = useStored<string>(KEYS.view, 'grid');
  const btn = 'icon-btn h-8 w-8 aria-pressed:bg-ink-100 aria-pressed:text-brand-700 dark:aria-pressed:bg-ink-800';
  return (
    <div className="hidden rounded-xl border border-ink-200 p-1 dark:border-ink-700 sm:flex" role="group" aria-label={label}>
      <button type="button" className={btn} data-view="grid" aria-pressed={view !== 'list'} aria-label={grid} onClick={() => write(KEYS.view, 'grid')}>{gridIcon}</button>
      <button type="button" className={btn} data-view="list" aria-pressed={view === 'list'} aria-label={list} onClick={() => write(KEYS.view, 'list')}>{listIcon}</button>
    </div>
  );
}

/* Navigation-pending flag shared between filter controls and the grid (dims results while the server renders). */
let pendingNav = false;
const subs = new Set<(v: boolean) => void>();
function setPendingNav(v: boolean) { pendingNav = v; subs.forEach((s) => s(v)); }
function usePendingNav(): [boolean] {
  const [v, setV] = useState(pendingNav);
  useEffect(() => { subs.add(setV); return () => { subs.delete(setV); }; }, []);
  return [v];
}

/** Push new query params (resetting page) — used by sort/filter controls. Keeps scroll position. */
export function useQueryNav() {
  const router = useRouter();
  const pathname = usePathname();
  const sp = useSearchParams();
  const [pending, start] = useTransition();
  useEffect(() => setPendingNav(pending), [pending]);
  const go = (next: URLSearchParams) => {
    next.delete('page');
    const qs = next.toString();
    start(() => router.push(qs ? `${pathname}?${qs}` : pathname, { scroll: false }));
  };
  return { sp, go, pending };
}

export function SortSelect({ id, label, options }: { id: string; label: string; options: { value: string; label: string }[] }) {
  const { sp, go } = useQueryNav();
  return (
    <>
      <label className="sr-only" htmlFor={id}>{label}</label>
      <select id={id} className="input w-auto py-2 text-sm" data-sort value={sp.get('sort') ?? ''} onChange={(e) => { const n = new URLSearchParams(sp); if (e.target.value) n.set('sort', e.target.value); else n.delete('sort'); go(n); }}>
        {options.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
      </select>
    </>
  );
}

/** Bottom-sheet filter drawer for < lg (mockup: data-drawer). */
export function FilterDrawer({ title, openLabel, closeLabel, activeCount, openIcon, closeIcon, children }: { title: string; openLabel: string; closeLabel: string; activeCount: number; openIcon: React.ReactNode; closeIcon: React.ReactNode; children: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  const panel = useRef<HTMLDivElement>(null);
  const opener = useRef<HTMLButtonElement>(null);
  const sp = useSearchParams();
  useEffect(() => setOpen(false), [sp]);
  useEffect(() => {
    if (!open) return;
    document.documentElement.style.overflow = 'hidden';
    panel.current?.querySelector<HTMLElement>('input,select,button')?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
      if (e.key === 'Tab' && panel.current) {
        const f = [...panel.current.querySelectorAll<HTMLElement>('a[href],button:not([disabled]),input:not([type=hidden]),select,textarea')].filter((x) => x.offsetParent !== null);
        if (!f.length) return;
        const [first, last] = [f[0], f[f.length - 1]];
        if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); } else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
      }
    };
    document.addEventListener('keydown', onKey);
    const btn = opener.current;
    return () => { document.documentElement.style.overflow = ''; document.removeEventListener('keydown', onKey); btn?.focus(); };
  }, [open]);
  return (
    <>
      <button ref={opener} type="button" className="btn btn-outline btn-sm lg:hidden" aria-controls="filters" aria-expanded={open} onClick={() => setOpen(true)}>
        {openIcon} {openLabel} {activeCount ? <span className="rounded-full bg-brand-700 px-1.5 text-[11px] text-white">{activeCount}</span> : null}
      </button>
      <div id="filters" className={`fixed inset-0 z-[60] lg:hidden ${open ? '' : 'hidden'}`} role="dialog" aria-modal="true" aria-label={title}>
        <div className="absolute inset-0 bg-ink-950/50" onClick={() => setOpen(false)} />
        <div ref={panel} className="absolute inset-x-0 bottom-0 max-h-[88vh] overflow-y-auto rounded-t-3xl bg-white p-5 dark:bg-ink-900">
          <div className="mx-auto mb-4 h-1.5 w-12 rounded-full bg-ink-200 dark:bg-ink-700" />
          <div className="mb-4 flex items-center justify-between"><h2 className="text-lg font-bold">{title}</h2><button type="button" className="icon-btn" aria-label={closeLabel} onClick={() => setOpen(false)}>{closeIcon}</button></div>
          {open ? children : null}
        </div>
      </div>
    </>
  );
}
