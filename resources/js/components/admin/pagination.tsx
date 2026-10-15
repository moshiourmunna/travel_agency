import { Link } from '@inertiajs/react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { useT } from '@/lib/i18n';
import { cn } from '@/lib/utils';
import type { Meta } from '@/types';

function href(page: number, param: string) {
  const url = new URL(window.location.href);
  url.searchParams.set(param, String(page));
  return url.pathname + url.search;
}

/** Windowed pagination: 1 … 4 5 [6] 7 8 … 20 */
export function pages(current: number, last: number): (number | '…')[] {
  const out: (number | '…')[] = [];
  for (let i = 1; i <= last; i++) {
    if (i === 1 || i === last || Math.abs(i - current) <= 1) out.push(i);
    else if (out[out.length - 1] !== '…') out.push('…');
  }
  return out;
}

export function Pagination({ meta, param = 'page' }: { meta: Meta; param?: string }) {
  const t = useT();
  if (!meta || meta.total === 0) return null;
  const { current_page: cur, last_page: last } = meta;
  const item = 'inline-flex h-9 min-w-9 items-center justify-center rounded-lg border border-[var(--border)] bg-[var(--card)] px-2 text-sm';
  return (
    <nav className="mt-4 flex flex-wrap items-center justify-between gap-3" aria-label={t('Pagination')}>
      <p className="text-xs text-[var(--muted)]">{t('Showing :from–:to of :total', { from: meta.from ?? 0, to: meta.to ?? 0, total: meta.total })}</p>
      {last > 1 && (
        <div className="flex flex-wrap items-center gap-1">
          {cur > 1 ? <Link href={href(cur - 1, param)} preserveScroll className={item} aria-label={t('Previous')} rel="prev"><ChevronLeft className="size-4 rtl:rotate-180" /></Link> : <span className={cn(item, 'opacity-40')} aria-hidden><ChevronLeft className="size-4 rtl:rotate-180" /></span>}
          {pages(cur, last).map((p, i) => p === '…' ? <span key={'e' + i} className="px-1 text-[var(--muted)]">…</span> : (
            <Link key={p} href={href(p, param)} preserveScroll aria-current={p === cur ? 'page' : undefined} className={cn(item, p === cur && 'border-brand-600 bg-brand-600 text-white')}>{p}</Link>
          ))}
          {cur < last ? <Link href={href(cur + 1, param)} preserveScroll className={item} aria-label={t('Next')} rel="next"><ChevronRight className="size-4 rtl:rotate-180" /></Link> : <span className={cn(item, 'opacity-40')} aria-hidden><ChevronRight className="size-4 rtl:rotate-180" /></span>}
        </div>
      )}
    </nav>
  );
}
