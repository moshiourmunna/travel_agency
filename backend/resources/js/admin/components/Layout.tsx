import { Link, router, usePage } from '@inertiajs/react';
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { getJson, useAdminUrl } from '@/lib/http';
import { useT } from '@/lib/i18n';
import type { NavGroup, Shared } from '@/lib/types';
import { Icon } from './Icon';
import { ConfirmProvider, cx, Menu, menuItem, Modal, Spinner } from './ui';

type Toast = { id: number; tone: 'success' | 'error' | 'warning'; text: string };
const ToastCtx = createContext<(tone: Toast['tone'], text: string) => void>(() => {});
export const useToast = () => useContext(ToastCtx);

function Toasts({ items, dismiss }: { items: Toast[]; dismiss: (id: number) => void }) {
  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-4 z-[90] flex flex-col items-center gap-2 px-3 sm:bottom-6 sm:right-6 sm:left-auto sm:items-end" aria-live="polite">
      {items.map((t) => (
        <div key={t.id} role={t.tone === 'error' ? 'alert' : 'status'} data-toast={t.tone}
          className={cx('pointer-events-auto flex w-full max-w-md items-start gap-3 rounded-2xl border px-4 py-3 text-sm shadow-lift animate-fadeUp',
            t.tone === 'success' && 'border-emerald-200 bg-white text-ink-800 dark:border-emerald-800 dark:bg-ink-900 dark:text-ink-100',
            t.tone === 'error' && 'border-rose-200 bg-rose-50 text-rose-900 dark:border-rose-800 dark:bg-rose-950 dark:text-rose-100',
            t.tone === 'warning' && 'border-accent-200 bg-accent-50 text-accent-900 dark:border-accent-700 dark:bg-ink-900 dark:text-accent-100')}>
          <Icon name={t.tone === 'success' ? 'circle-check' : t.tone === 'error' ? 'circle-alert' : 'triangle-alert'} className={cx('mt-0.5 shrink-0', t.tone === 'success' && 'text-emerald-600')} />
          <p className="flex-1 leading-5">{t.text}</p>
          <button type="button" className="-m-1 rounded p-1 opacity-60 hover:opacity-100" onClick={() => dismiss(t.id)} aria-label="Dismiss"><Icon name="x" size={16} /></button>
        </div>
      ))}
    </div>
  );
}

function useTheme(): [boolean, () => void] {
  const [dark, setDark] = useState(() => typeof document !== 'undefined' && document.documentElement.classList.contains('dark'));
  const toggle = () => {
    const v = !dark;
    setDark(v);
    document.documentElement.classList.toggle('dark', v);
    try { localStorage.setItem('musafir-theme', v ? 'dark' : 'light'); } catch { /* private mode */ }
  };
  return [dark, toggle];
}

function SideNav({ nav, current, onNavigate }: { nav: NavGroup[]; current: string; onNavigate?: () => void }) {
  const { t } = useT();
  const [q, setQ] = useState('');
  const all = nav.flatMap((g) => g.items);
  const active = all.filter((i) => current === i.href || current.startsWith(i.href + '/') || current.startsWith(i.href + '?')).sort((a, b) => b.href.length - a.href.length)[0]?.key
    ?? all.find((i) => i.href === current)?.key;
  const shown = q.trim()
    ? [{ label: null, items: all.filter((i) => i.label.toLowerCase().includes(q.trim().toLowerCase())) }]
    : nav;
  return (
    <nav className="flex-1 space-y-5 overflow-y-auto p-3" aria-label={t('Admin navigation', 'অ্যাডমিন নেভিগেশন')}>
      <div className="relative">
        <label className="sr-only" htmlFor="nav-filter">{t('Find a module', 'মডিউল খুঁজুন')}</label>
        <Icon name="search" size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-400" />
        <input id="nav-filter" value={q} onChange={(e) => setQ(e.target.value)} className="input h-9 py-1.5 pl-8 text-[13px]" placeholder={t('Find a module…', 'মডিউল খুঁজুন…')} />
      </div>
      {shown.map((g, i) => (
        <div key={i}>
          {g.label ? <p className="mb-1 px-3 text-[11px] font-bold uppercase tracking-wider text-ink-500 dark:text-ink-300">{g.label}</p> : null}
          <ul className="space-y-0.5">
            {g.items.map((it) => (
              <li key={it.key}>
                <Link href={it.href} className="side-link py-2" aria-current={active === it.key ? 'page' : undefined} onClick={onNavigate} data-nav={it.key}>
                  <Icon name={it.icon} /><span className="flex-1 truncate">{it.label}</span>
                  {it.badge ? <span className="rounded-full bg-accent-100 px-2 py-0.5 text-[11px] font-bold text-accent-900 dark:bg-accent-400/20 dark:text-accent-200">{it.badge}</span> : null}
                </Link>
              </li>
            ))}
          </ul>
        </div>
      ))}
      {shown[0]?.items.length === 0 ? <p className="px-3 text-sm muted">{t('No module matches.', 'কোনো মডিউল মেলেনি।')}</p> : null}
    </nav>
  );
}

function Brand() {
  const url = useAdminUrl();
  return (
    <Link href={url('/')} className="flex items-center gap-2" aria-label="Musafir admin home" data-home>
      <img src="/brand/logo-compact.svg" alt="Musafir" className="h-9 w-auto dark:hidden" width="140" height="40" />
      <img src="/brand/logo-compact-dark.svg" alt="Musafir" className="hidden h-9 w-auto dark:block" width="140" height="40" />
      <span className="badge bg-accent-100 text-accent-900 dark:bg-accent-400/20 dark:text-accent-200">Admin</span>
    </Link>
  );
}

type Hit = { group: string; title: string; sub: string; href: string; icon: string };
function SearchDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { t } = useT();
  const url = useAdminUrl();
  const [q, setQ] = useState('');
  const [hits, setHits] = useState<Hit[]>([]);
  const [busy, setBusy] = useState(false);
  const [sel, setSel] = useState(0);
  const timer = useRef<number | undefined>(undefined);
  useEffect(() => { if (!open) { setQ(''); setHits([]); } }, [open]);
  useEffect(() => {
    window.clearTimeout(timer.current);
    if (q.trim().length < 2) { setHits([]); return; }
    timer.current = window.setTimeout(async () => {
      setBusy(true);
      try { setHits((await getJson<{ results: Hit[] }>(url('/search') + '?q=' + encodeURIComponent(q.trim()))).results); setSel(0); } catch { setHits([]); } finally { setBusy(false); }
    }, 220);
  }, [q]);
  const go = (h: Hit) => { onClose(); router.visit(h.href); };
  let last = '';
  return (
    <Modal open={open} onClose={onClose} title={t('Search everything', 'সবকিছুতে খুঁজুন')} size="lg">
      <div className="relative">
        <Icon name="search" className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-400" />
        <input autoFocus value={q} onChange={(e) => setQ(e.target.value)} className="input pl-10" placeholder={t('Booking ref, customer, tour, page…', 'বুকিং রেফ, গ্রাহক, ট্যুর, পেজ…')} aria-label={t('Search', 'খুঁজুন')}
          onKeyDown={(e) => {
            if (e.key === 'ArrowDown') { e.preventDefault(); setSel((s) => Math.min(hits.length - 1, s + 1)); }
            if (e.key === 'ArrowUp') { e.preventDefault(); setSel((s) => Math.max(0, s - 1)); }
            if (e.key === 'Enter' && hits[sel]) go(hits[sel]);
          }} />
        {busy ? <Spinner className="absolute right-3 top-3 text-brand-600" /> : null}
      </div>
      <ul className="mt-3 max-h-[55vh] overflow-y-auto" role="listbox">
        {hits.map((h, i) => {
          const head = h.group !== last ? (last = h.group) : null;
          return (
            <li key={i}>
              {head ? <p className="mt-3 px-2 pb-1 text-[11px] font-bold uppercase tracking-wider text-ink-500">{head}</p> : null}
              <button type="button" role="option" aria-selected={i === sel} onMouseEnter={() => setSel(i)} onClick={() => go(h)}
                className={cx('flex w-full items-center gap-3 rounded-xl px-3 py-2 text-left text-sm', i === sel ? 'bg-brand-50 text-brand-900 dark:bg-brand-900/40 dark:text-white' : '')}>
                <Icon name={h.icon} className="shrink-0 text-ink-400" /><span className="min-w-0 flex-1 truncate font-medium">{h.title}</span>{h.sub ? <span className="truncate text-xs muted">{h.sub}</span> : null}
              </button>
            </li>
          );
        })}
      </ul>
      {q.trim().length >= 2 && !busy && hits.length === 0 ? <p className="py-6 text-center text-sm muted">{t('Nothing found.', 'কিছু পাওয়া যায়নি।')}</p> : null}
    </Modal>
  );
}

export default function Layout({ children }: { children: ReactNode }) {
  const page = usePage();
  const props = page.props as unknown as Shared;
  const { t, lang } = useT();
  const url = useAdminUrl();
  const [drawer, setDrawer] = useState(false);
  const [search, setSearch] = useState(false);
  const [dark, toggleDark] = useTheme();
  const [toasts, setToasts] = useState<Toast[]>([]);
  const seq = useRef(0);
  const toast = useCallback((tone: Toast['tone'], text: string) => {
    const id = ++seq.current;
    setToasts((x) => [...x.slice(-3), { id, tone, text }]);
    window.setTimeout(() => setToasts((x) => x.filter((i) => i.id !== id)), tone === 'error' ? 9000 : 5000);
  }, []);
  const flash = props.flash;
  useEffect(() => {
    if (flash?.success) toast('success', flash.success);
    if (flash?.warning) toast('warning', flash.warning);
    if (flash?.error) toast('error', flash.error);
  }, [flash]);
  useEffect(() => {
    const k = (e: KeyboardEvent) => {
      if ((e.key === 'k' && (e.metaKey || e.ctrlKey)) || (e.key === '/' && !(e.target as HTMLElement).closest('input,textarea,select,[contenteditable]'))) { e.preventDefault(); setSearch(true); }
    };
    window.addEventListener('keydown', k);
    return () => window.removeEventListener('keydown', k);
  }, []);
  useEffect(() => router.on('navigate', () => setDrawer(false)), []);
  const current = page.url.split('#')[0];
  const user = props.auth?.user;
  const nav = useMemo(() => props.nav ?? [], [props.nav]);
  const footerLinks = (
    <div className="border-t border-ink-100 p-3 dark:border-ink-800">
      <a href={props.app.frontend + '/' + lang} className="side-link py-2" target="_blank" rel="noopener"><Icon name="external-link" /><span>{t('View website', 'ওয়েবসাইট দেখুন')}</span></a>
      <button type="button" className="side-link w-full py-2" onClick={() => router.post(url('/logout'))}><Icon name="log-out" /><span>{t('Sign out', 'সাইন আউট')}</span></button>
    </div>
  );

  return (
    <ToastCtx.Provider value={toast}>
      <ConfirmProvider>
        <a href="#main" className="skip-link">{t('Skip to content', 'মূল অংশে যান')}</a>
        <div className="min-h-screen bg-ink-50 dark:bg-ink-950">
          <aside className="fixed inset-y-0 left-0 z-30 hidden w-64 flex-col border-r border-ink-100 bg-white dark:border-ink-800 dark:bg-ink-900 lg:flex">
            <div className="flex h-16 shrink-0 items-center border-b border-ink-100 px-4 dark:border-ink-800"><Brand /></div>
            <SideNav nav={nav} current={current} />
            {footerLinks}
          </aside>
          {drawer ? (
            <div className="fixed inset-0 z-[60] lg:hidden" role="dialog" aria-modal="true" aria-label={t('Menu', 'মেনু')}>
              <div className="absolute inset-0 bg-ink-950/50 backdrop-blur-sm" onClick={() => setDrawer(false)} />
              <div className="absolute left-0 top-0 flex h-full w-[86%] max-w-xs flex-col bg-white shadow-2xl dark:bg-ink-900">
                <div className="flex h-16 shrink-0 items-center justify-between border-b border-ink-100 px-4 dark:border-ink-800"><Brand /><button type="button" className="icon-btn" onClick={() => setDrawer(false)} aria-label={t('Close menu', 'মেনু বন্ধ')}><Icon name="x" /></button></div>
                <SideNav nav={nav} current={current} onNavigate={() => setDrawer(false)} />
                {footerLinks}
              </div>
            </div>
          ) : null}
          <div className="lg:pl-64">
            <header className="sticky top-0 z-20 flex h-16 items-center gap-2 border-b border-ink-100 bg-white/90 px-3 backdrop-blur dark:border-ink-800 dark:bg-ink-900/90 sm:px-6">
              <button type="button" className="icon-btn lg:hidden" onClick={() => setDrawer(true)} aria-label={t('Open menu', 'মেনু খুলুন')}><Icon name="menu" /></button>
              <button type="button" onClick={() => setSearch(true)} className="flex h-10 min-w-0 max-w-md flex-1 items-center gap-2 rounded-xl border border-ink-200 bg-white px-3 text-left text-sm text-ink-400 transition hover:border-brand-400 dark:border-ink-700 dark:bg-ink-850" data-search>
                <Icon name="search" size={16} /><span className="flex-1 truncate">{t('Search bookings, customers, refs…', 'বুকিং, গ্রাহক, রেফ খুঁজুন…')}</span><span className="kbd hidden sm:inline">/</span>
              </button>
              <div className="ml-auto flex items-center gap-1">
                {props.app.payment_mode !== 'live' ? <span className="badge badge-accent hidden md:inline-flex" title="PAYMENT_MODE">{t('Sandbox payments', 'স্যান্ডবক্স পেমেন্ট')}</span> : null}
                <button type="button" className="icon-btn font-bold" onClick={() => router.post(url('/locale'), { locale: lang === 'bn' ? 'en' : 'bn' }, { preserveScroll: true })} aria-label={t('Switch to Bangla', 'Switch to English')} data-lang>
                  <span className="text-sm">{lang === 'bn' ? 'EN' : 'বাং'}</span>
                </button>
                <button type="button" className="icon-btn" onClick={toggleDark} aria-label={dark ? t('Light mode', 'লাইট মোড') : t('Dark mode', 'ডার্ক মোড')} data-theme-toggle><Icon name={dark ? 'sun' : 'moon'} /></button>
                <Menu label={t('Account menu', 'অ্যাকাউন্ট মেনু')} button={<span className="grid h-9 w-9 place-items-center rounded-full bg-brand-700 text-xs font-bold text-white">{user?.initials}</span>}>
                  {(close) => (
                    <>
                      <div className="border-b border-ink-100 px-3.5 py-2.5 dark:border-ink-800"><p className="text-sm font-semibold text-ink-900 dark:text-white">{user?.name}</p><p className="text-xs muted">{user?.email} · {user?.role}</p></div>
                      <Link href={url('/profile')} className={menuItem} onClick={close}><Icon name="user" size={16} />{t('My profile', 'আমার প্রোফাইল')}</Link>
                      <a href={props.app.frontend + '/' + lang} target="_blank" rel="noopener" className={menuItem}><Icon name="external-link" size={16} />{t('View website', 'ওয়েবসাইট দেখুন')}</a>
                      <button type="button" className={menuItem} onClick={() => router.post(url('/logout'))} data-logout><Icon name="log-out" size={16} />{t('Sign out', 'সাইন আউট')}</button>
                    </>
                  )}
                </Menu>
              </div>
            </header>
            <main id="main" tabIndex={-1} className="outline-none">
              <div className="mx-auto max-w-[1400px] px-3 py-5 sm:px-6 sm:py-8">{children}</div>
            </main>
          </div>
        </div>
        <SearchDialog open={search} onClose={() => setSearch(false)} />
        <Toasts items={toasts} dismiss={(id) => setToasts((x) => x.filter((i) => i.id !== id))} />
      </ConfirmProvider>
    </ToastCtx.Provider>
  );
}
