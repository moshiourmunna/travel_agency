import { Link } from '@inertiajs/react';
import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from 'react';
import { useAdminUrl } from '@/lib/http';
import { useT } from '@/lib/i18n';
import type { Pagination as P } from '@/lib/types';
import { Icon } from './Icon';

export const cx = (...c: (string | false | null | undefined)[]) => c.filter(Boolean).join(' ');

const BADGE: Record<string, string> = { green: 'badge-green', red: 'badge-red', blue: 'badge-blue', gray: 'badge-gray', gold: 'badge-gold', accent: 'badge-accent', brand: 'badge-brand', purple: 'badge-purple', violet: 'badge-purple' };
export function Badge({ color = 'gray', children, className }: { color?: string; children: ReactNode; className?: string }) {
  return <span className={cx('badge', BADGE[color] ?? 'badge-gray', className)}>{children}</span>;
}

export function Card({ title, actions, children, className, pad = true, id }: { title?: ReactNode; actions?: ReactNode; children: ReactNode; className?: string; pad?: boolean; id?: string }) {
  return (
    <section className={cx('card', className)} id={id}>
      {title || actions ? (
        <header className="flex flex-wrap items-center justify-between gap-2 border-b border-ink-100 px-4 py-3 dark:border-ink-800 sm:px-5">
          {title ? <h2 className="text-base font-bold">{title}</h2> : <span />}
          {actions ? <div className="flex flex-wrap items-center gap-2">{actions}</div> : null}
        </header>
      ) : null}
      <div className={pad ? 'p-4 sm:p-5' : ''}>{children}</div>
    </section>
  );
}

export function Spinner({ className }: { className?: string }) {
  return <span className={cx('inline-block h-4 w-4 animate-spin rounded-full border-2 border-current border-r-transparent', className)} role="status" aria-label="Loading" />;
}

export function Switch({ checked, onChange, label, disabled, id }: { checked: boolean; onChange: (v: boolean) => void; label?: string; disabled?: boolean; id?: string }) {
  return (
    <button type="button" id={id} role="switch" aria-checked={checked} aria-label={label} disabled={disabled} className={cx('switch', disabled && 'opacity-50')} onClick={() => onChange(!checked)}>
      <span />
    </button>
  );
}

export function PageHeader({ title, subtitle, crumbs = [], actions, icon }: { title: ReactNode; subtitle?: ReactNode; crumbs?: [string, string?][]; actions?: ReactNode; icon?: string }) {
  const { t } = useT();
  const url = useAdminUrl();
  return (
    <div className="mb-6">
      <nav aria-label="Breadcrumb" className="mb-2 text-xs text-ink-500 dark:text-ink-300">
        <ol className="flex flex-wrap items-center gap-1">
          {[[t('Admin', 'অ্যাডমিন'), undefined] as [string, string?], ...crumbs].map(([label, href], i, all) => (
            <li key={i} className="flex items-center gap-1">
              {i === 0 ? <Link href={url('/')} className="hover:text-brand-700 hover:underline dark:hover:text-brand-300">{label}</Link>
                : href && i < all.length - 1 ? <Link href={href} className="hover:text-brand-700 hover:underline dark:hover:text-brand-300">{label}</Link> : <span aria-current={i === all.length - 1 ? 'page' : undefined}>{label}</span>}
              {i < all.length - 1 ? <Icon name="chevron-right" size={12} /> : null}
            </li>
          ))}
        </ol>
      </nav>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div className="flex min-w-0 items-center gap-3">
          {icon ? <span className="hidden h-11 w-11 shrink-0 place-items-center rounded-2xl bg-brand-50 text-brand-700 dark:bg-brand-900/40 dark:text-brand-300 sm:grid"><Icon name={icon} size={22} /></span> : null}
          <div className="min-w-0">
            <h1 className="truncate text-2xl font-extrabold tracking-tight sm:text-3xl">{title}</h1>
            {subtitle ? <p className="mt-1 text-sm muted">{subtitle}</p> : null}
          </div>
        </div>
        {actions ? <div className="flex flex-wrap gap-2">{actions}</div> : null}
      </div>
    </div>
  );
}

export function Empty({ icon = 'inbox', title, children }: { icon?: string; title: string; children?: ReactNode }) {
  return (
    <div className="flex flex-col items-center justify-center px-6 py-14 text-center">
      <span className="grid h-14 w-14 place-items-center rounded-2xl bg-ink-50 text-ink-400 dark:bg-ink-800 dark:text-ink-300"><Icon name={icon} size={26} /></span>
      <p className="mt-4 font-semibold text-ink-900 dark:text-white">{title}</p>
      {children ? <div className="mt-1 text-sm muted">{children}</div> : null}
    </div>
  );
}

export function Pager({ p, onPage }: { p: P; onPage: (n: number) => void }) {
  const { t, num } = useT();
  if (p.last <= 1) return p.total ? <p className="px-4 py-3 text-xs muted">{t(`${p.total} records`, `${num(p.total)}টি রেকর্ড`)}</p> : null;
  const pages: (number | '…')[] = [];
  for (let i = 1; i <= p.last; i++) if (i === 1 || i === p.last || Math.abs(i - p.page) <= 1) pages.push(i); else if (pages[pages.length - 1] !== '…') pages.push('…');
  return (
    <div className="flex flex-col items-center justify-between gap-3 px-4 py-3 sm:flex-row">
      <p className="text-xs muted">{t(`Showing ${p.from}–${p.to} of ${p.total}`, `${num(p.total)}টির মধ্যে ${num(p.from ?? 0)}–${num(p.to ?? 0)}`)}</p>
      <nav className="flex items-center gap-1" aria-label={t('Pagination', 'পৃষ্ঠা')}>
        <button type="button" className="icon-btn h-9 w-9" disabled={p.page <= 1} onClick={() => onPage(p.page - 1)} aria-label={t('Previous page', 'আগের পৃষ্ঠা')}><Icon name="chevron-left" /></button>
        {pages.map((n, i) => n === '…' ? <span key={i} className="px-1 text-ink-400">…</span> : (
          <button key={i} type="button" onClick={() => onPage(n)} aria-current={n === p.page ? 'page' : undefined}
            className={cx('h-9 min-w-9 rounded-lg px-2 text-sm font-semibold', n === p.page ? 'bg-brand-700 text-white' : 'text-ink-600 hover:bg-ink-100 dark:text-ink-300 dark:hover:bg-ink-800')}>{num(n)}</button>
        ))}
        <button type="button" className="icon-btn h-9 w-9" disabled={p.page >= p.last} onClick={() => onPage(p.page + 1)} aria-label={t('Next page', 'পরের পৃষ্ঠা')}><Icon name="chevron-right" /></button>
      </nav>
    </div>
  );
}

/** Accessible modal on <dialog>. */
export function Modal({ open, onClose, title, children, footer, size = 'md' }: { open: boolean; onClose: () => void; title: ReactNode; children: ReactNode; footer?: ReactNode; size?: 'sm' | 'md' | 'lg' | 'xl' }) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const d = ref.current;
    if (!d) return;
    if (open && !d.open) d.showModal();
    if (!open && d.open) d.close();
  }, [open]);
  const w = { sm: 'max-w-md', md: 'max-w-xl', lg: 'max-w-3xl', xl: 'max-w-6xl' }[size];
  return (
    <dialog ref={ref} onCancel={(e) => { e.preventDefault(); onClose(); }} onClick={(e) => e.target === ref.current && onClose()}
      className={cx('w-[calc(100%-1.5rem)] overflow-hidden rounded-2xl border border-ink-100 bg-white p-0 text-ink-700 shadow-lift dark:border-ink-800 dark:bg-ink-900 dark:text-ink-200', w)}>
      {open ? (
        <div className="flex max-h-[calc(100dvh-2rem)] flex-col">
          <header className="flex items-center justify-between gap-3 border-b border-ink-100 px-5 py-3.5 dark:border-ink-800">
            <h2 className="text-lg font-bold">{title}</h2>
            <button type="button" className="icon-btn h-9 w-9" onClick={onClose} aria-label="Close"><Icon name="x" /></button>
          </header>
          <div className="min-h-0 flex-1 overflow-y-auto px-5 py-4">{children}</div>
          {footer ? <footer className="flex flex-wrap justify-end gap-2 border-t border-ink-100 bg-ink-50/60 px-5 py-3 dark:border-ink-800 dark:bg-ink-850">{footer}</footer> : null}
        </div>
      ) : null}
    </dialog>
  );
}

type ConfirmOpts = { title: string; body?: ReactNode; confirm?: string; danger?: boolean };
const ConfirmCtx = createContext<(o: ConfirmOpts) => Promise<boolean>>(async () => false);
export const useConfirm = () => useContext(ConfirmCtx);

export function ConfirmProvider({ children }: { children: ReactNode }) {
  const { t } = useT();
  const [state, setState] = useState<(ConfirmOpts & { resolve: (v: boolean) => void }) | null>(null);
  const ask = useCallback((o: ConfirmOpts) => new Promise<boolean>((resolve) => setState({ ...o, resolve })), []);
  const close = (v: boolean) => { state?.resolve(v); setState(null); };
  return (
    <ConfirmCtx.Provider value={ask}>
      {children}
      <Modal open={!!state} onClose={() => close(false)} title={state?.title ?? ''} size="sm"
        footer={<>
          <button type="button" className="btn btn-outline btn-sm" onClick={() => close(false)}>{t('Cancel', 'বাতিল')}</button>
          <button type="button" className={cx('btn btn-sm', state?.danger ? 'btn-danger' : 'btn-primary')} onClick={() => close(true)} data-confirm-ok autoFocus>{state?.confirm ?? t('Confirm', 'নিশ্চিত করুন')}</button>
        </>}>
        <div className="text-sm leading-6">{state?.body}</div>
      </Modal>
    </ConfirmCtx.Provider>
  );
}

/** Small dropdown menu. */
export function Menu({ button, children, align = 'right', label }: { button: ReactNode; children: (close: () => void) => ReactNode; align?: 'left' | 'right'; label: string }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    const h = (e: MouseEvent) => !ref.current?.contains(e.target as Node) && setOpen(false);
    const k = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false);
    document.addEventListener('mousedown', h);
    document.addEventListener('keydown', k);
    return () => { document.removeEventListener('mousedown', h); document.removeEventListener('keydown', k); };
  }, [open]);
  return (
    <div className="relative" ref={ref}>
      <button type="button" className="icon-btn" aria-haspopup="menu" aria-expanded={open} aria-label={label} onClick={() => setOpen(!open)}>{button}</button>
      {open ? (
        <div role="menu" className={cx('absolute z-40 mt-1 min-w-[12rem] overflow-hidden rounded-xl border border-ink-100 bg-white py-1 shadow-lift dark:border-ink-700 dark:bg-ink-900', align === 'right' ? 'right-0' : 'left-0')}>
          {children(() => setOpen(false))}
        </div>
      ) : null}
    </div>
  );
}
export const menuItem = 'flex w-full items-center gap-2.5 px-3.5 py-2 text-left text-sm text-ink-700 hover:bg-ink-50 dark:text-ink-200 dark:hover:bg-ink-800';

export function Stat({ label, value, icon, tone = 'brand', delta, href }: { label: string; value: ReactNode; icon: string; tone?: string; delta?: number | null; href?: string }) {
  const { t, d } = useT();
  const tones: Record<string, string> = {
    brand: 'bg-brand-50 text-brand-700 dark:bg-brand-900/40 dark:text-brand-300', accent: 'bg-accent-100 text-accent-800 dark:bg-accent-400/15 dark:text-accent-200',
    blue: 'bg-sky-50 text-sky-700 dark:bg-sky-900/30 dark:text-sky-300', red: 'bg-rose-50 text-rose-700 dark:bg-rose-900/30 dark:text-rose-300', gold: 'bg-gold-100 text-gold-700 dark:bg-gold-700/30 dark:text-gold-200',
  };
  const inner = (
    <>
      <div className="flex items-start justify-between gap-3"><p className="text-sm font-medium muted">{label}</p><span className={cx('grid h-9 w-9 shrink-0 place-items-center rounded-xl', tones[tone] ?? tones.brand)}><Icon name={icon} /></span></div>
      <p className="mt-2 text-xl font-extrabold tracking-tight text-ink-900 [overflow-wrap:anywhere] dark:text-white sm:text-2xl">{value}</p>
      {delta !== undefined && delta !== null ? (
        <p className={cx('mt-1 inline-flex items-center gap-1 text-xs font-semibold', delta >= 0 ? 'text-emerald-700 dark:text-emerald-300' : 'text-rose-700 dark:text-rose-300')}>
          <Icon name={delta >= 0 ? 'trending-up' : 'trending-down'} size={14} />{delta >= 0 ? '+' : ''}{d(delta)}% <span className="font-normal muted">{t('vs last month', 'গত মাসের তুলনায়')}</span>
        </p>
      ) : null}
    </>
  );
  return href ? <Link href={href} className="card card-hover block p-4 sm:p-5">{inner}</Link> : <div className="card p-4 sm:p-5">{inner}</div>;
}
