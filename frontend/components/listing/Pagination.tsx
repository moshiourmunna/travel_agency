import Link from 'next/link';
import { Icon } from '@/components/icons/Icon';
import type { I18n } from '@/lib/i18n';

/** Real link-based pagination (crawlable). Hidden when everything fits on one page. */
export function Pagination({ i, path, params, current, last }: { i: I18n; path: string; params: Record<string, string | undefined>; current: number; last: number }) {
  if (last <= 1) return null;
  const url = (p: number) => {
    const q = new URLSearchParams(Object.entries(params).filter(([k, v]) => v && k !== 'page') as [string, string][]);
    if (p > 1) q.set('page', String(p));
    const s = q.toString();
    return i.u(path) + (s ? `?${s}` : '');
  };
  const pages = Array.from({ length: last }, (_, k) => k + 1).filter((p) => p === 1 || p === last || Math.abs(p - current) <= 1);
  const edge = 'icon-btn border border-ink-200 dark:border-ink-700';
  return (
    <nav className="mt-10 flex items-center justify-center gap-1.5" aria-label={i.t('Pagination', 'পৃষ্ঠা')}>
      {current > 1 ? <Link href={url(current - 1)} className={edge} aria-label={i.t('Previous page', 'আগের পাতা')} rel="prev"><Icon name="chevron-left" className="h-4 w-4" /></Link> : <span className={`${edge} opacity-40`} aria-hidden="true"><Icon name="chevron-left" className="h-4 w-4" /></span>}
      {pages.map((p, k) => (
        <span key={p} className="contents">
          {k > 0 && p - pages[k - 1] > 1 ? <span className="px-1 muted" aria-hidden="true">…</span> : null}
          <Link href={url(p)} className={`grid h-10 min-w-10 place-items-center rounded-xl px-3 text-sm font-semibold ${p === current ? 'bg-brand-700 text-white' : 'border border-ink-200 hover:border-brand-500 dark:border-ink-700'}`} aria-current={p === current ? 'page' : undefined}>{i.d(p)}</Link>
        </span>
      ))}
      {current < last ? <Link href={url(current + 1)} className={edge} aria-label={i.t('Next page', 'পরের পাতা')} rel="next"><Icon name="chevron-right" className="h-4 w-4" /></Link> : <span className={`${edge} opacity-40`} aria-hidden="true"><Icon name="chevron-right" className="h-4 w-4" /></span>}
    </nav>
  );
}
