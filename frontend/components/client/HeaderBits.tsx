'use client';
import { usePathname, useSearchParams } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';
import { useSite } from './SiteContext';
import { KEYS, toast, useCurrency, write } from './store';

/** Desktop dropdown (hover on hover-capable devices, click/keyboard everywhere, Esc + outside click close). */
export function Dropdown({ label, under = [], panelClass, children }: { label: React.ReactNode; under?: string[]; panelClass: string; children: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pathname = usePathname();
  const current = under.some((x) => pathname === x || pathname.startsWith(x + '/'));
  useEffect(() => setOpen(false), [pathname]);
  useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent) => { if (!ref.current?.contains(e.target as Node)) setOpen(false); };
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') { setOpen(false); ref.current?.querySelector('button')?.focus(); } };
    document.addEventListener('click', onDoc);
    document.addEventListener('keydown', onKey);
    return () => { document.removeEventListener('click', onDoc); document.removeEventListener('keydown', onKey); };
  }, [open]);
  const hover = typeof window !== 'undefined' && window.matchMedia?.('(hover: hover)').matches;
  return (
    <div
      className="relative"
      ref={ref}
      data-dd
      onMouseEnter={() => { if (!hover) return; if (timer.current) clearTimeout(timer.current); setOpen(true); }}
      onMouseLeave={() => { if (!hover) return; timer.current = setTimeout(() => setOpen(false), 160); }}
    >
      <button type="button" className="nav-link" aria-expanded={open} aria-haspopup="true" aria-current={current ? 'page' : undefined} onClick={(e) => { e.stopPropagation(); setOpen((o) => !o); }}>
        {label}
      </button>
      <div data-dd-panel hidden={!open} className={panelClass}>{children}</div>
    </div>
  );
}

export function HeaderShadow() {
  useEffect(() => {
    const h = document.getElementById('site-header');
    const f = () => h?.classList.toggle('shadow-soft', window.scrollY > 8);
    window.addEventListener('scroll', f, { passive: true });
    f();
    return () => window.removeEventListener('scroll', f);
  }, []);
  return null;
}

export function ThemeToggle({ className, label, children }: { className: string; label: string; children: React.ReactNode }) {
  return (
    <button
      type="button"
      className={className}
      data-theme-toggle
      aria-label={label}
      onClick={() => {
        const d = document.documentElement.classList.toggle('dark');
        write(KEYS.theme, d ? 'dark' : 'light');
        try { localStorage.setItem('musafir-theme', d ? 'dark' : 'light'); } catch {}
        document.cookie = `musafir-theme=${d ? 'dark' : 'light'};path=/;max-age=31536000;samesite=lax`;
      }}
    >
      {children}
    </button>
  );
}

export function CurrencySelect({ id, className }: { id: string; className: string }) {
  const cur = useCurrency();
  const { currencies, lang, msg } = useSite();
  return (
    <select
      id={id}
      data-currency
      className={className}
      value={cur}
      onChange={(e) => {
        const v = e.target.value;
        write(KEYS.currency, v);
        toast(v === 'BDT' ? msg.saved : lang === 'bn' ? `আনুমানিক ${v} মূল্য দেখানো হচ্ছে; পরিশোধ হবে টাকায়।` : `Showing approximate ${v} prices; you pay in BDT.`);
      }}
    >
      {currencies.map((c) => (
        <option key={c.code} className="text-ink-900" value={c.code}>{c.code === 'USD' ? '$' : c.symbol} {c.code}</option>
      ))}
    </select>
  );
}

/** Language switch keeps the current path, query and hash. */
export function LangLink({ to, className, label, children }: { to: 'en' | 'bn'; className: string; label?: string; children: React.ReactNode }) {
  const pathname = usePathname() || '/';
  const sp = useSearchParams();
  const rest = pathname.replace(/^\/(en|bn)(?=\/|$)/, '');
  const q = sp?.toString();
  const target = `/${to}${rest}${q ? '?' + q : ''}`;
  return (
    <a
      href={target}
      data-lang-link={to}
      hrefLang={to}
      lang={to}
      className={className}
      aria-label={label}
      onClick={(e) => {
        try { localStorage.setItem('musafir-lang', to); } catch {}
        document.cookie = `musafir-lang=${to};path=/;max-age=31536000;samesite=lax`;
        if (location.hash) (e.currentTarget as HTMLAnchorElement).href = target + location.hash;
      }}
    >
      {children}
    </a>
  );
}

/** Off-canvas mobile drawer with focus trap-lite, Esc and scrim close, body scroll lock. */
export function Drawer({ openLabel, closeLabel, title, header, children, footer, openIcon, closeIcon }: {
  openLabel: string; closeLabel: string; title: string; header: React.ReactNode; children: React.ReactNode; footer: React.ReactNode; openIcon: React.ReactNode; closeIcon: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const panel = useRef<HTMLDivElement>(null);
  const opener = useRef<HTMLButtonElement>(null);
  const pathname = usePathname();
  useEffect(() => setOpen(false), [pathname]);
  useEffect(() => {
    document.documentElement.classList.toggle('overflow-hidden', open);
    if (!open) return;
    panel.current?.querySelector<HTMLElement>('button,a')?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') { setOpen(false); opener.current?.focus(); }
      if (e.key === 'Tab' && panel.current) {
        const f = panel.current.querySelectorAll<HTMLElement>('a,button,select,summary,input');
        const first = f[0], last = f[f.length - 1];
        if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); } else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
      }
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open]);
  return (
    <>
      <button ref={opener} type="button" className="icon-btn lg:hidden" aria-controls="mnav" aria-expanded={open} aria-label={openLabel} onClick={() => setOpen(true)}>{openIcon}</button>
      <div id="mnav" className={`fixed inset-0 z-[60] lg:hidden ${open ? '' : 'hidden'}`} data-drawer role="dialog" aria-modal="true" aria-label={title}>
        <div className="absolute inset-0 bg-ink-950/50 backdrop-blur-sm" onClick={() => setOpen(false)} />
        <div ref={panel} className="absolute right-0 top-0 flex h-full w-[86%] max-w-sm flex-col bg-white shadow-2xl dark:bg-ink-900" data-drawer-panel>
          <div className="flex items-center justify-between border-b border-ink-100 px-4 py-3 dark:border-ink-800">
            {header}
            <button type="button" className="icon-btn" aria-label={closeLabel} onClick={() => { setOpen(false); opener.current?.focus(); }}>{closeIcon}</button>
          </div>
          {children}
          {footer}
        </div>
      </div>
    </>
  );
}
