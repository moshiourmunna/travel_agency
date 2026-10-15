import { router } from '@inertiajs/react';
import { ArrowDown, ArrowUp, ArrowUpDown } from 'lucide-react';
import * as React from 'react';
import { useT } from '@/lib/i18n';
import { cn } from '@/lib/utils';

export type Column<T> = {
  key: string;
  label: string;
  render: (row: T) => React.ReactNode;
  sort?: string;              // server sort key
  className?: string;         // td classes
  main?: boolean;             // full-width in mobile card
  actions?: boolean;          // action cell (no label on mobile)
  align?: 'end';
};

/**
 * Responsive data table. ≥768px: classic table. <768px: each row becomes a labelled card (CSS only, see admin.css).
 * Sorting is server-side: clicking a sortable header updates ?sort=&dir= and reloads the page props.
 */
export function DataTable<T>({ columns, rows, rowKey, empty, sort, dir, small, caption }: { columns: Column<T>[]; rows: T[]; rowKey: (r: T) => string | number; empty?: string; sort?: string; dir?: string; small?: boolean; caption?: string }) {
  const t = useT();
  const onSort = (key: string) => {
    const url = new URL(window.location.href);
    const nextDir = sort === key && dir !== 'asc' ? 'asc' : 'desc';
    url.searchParams.set('sort', key);
    url.searchParams.set('dir', nextDir);
    url.searchParams.delete('page');
    router.get(url.pathname + url.search, {}, { preserveState: true, preserveScroll: true, replace: true });
  };
  return (
    <div className="lg:overflow-x-auto lg:rounded-lg lg:border lg:border-[var(--border)]">
      <table className={cn('rtable w-full border-collapse text-sm', small && 'text-[13px]')}>
        {caption && <caption className="sr-only">{caption}</caption>}
        <thead className="bg-black/[.03] dark:bg-white/[.04]">
          <tr>
            {columns.map((c) => {
              const active = c.sort && sort === c.sort;
              return (
                <th key={c.key} scope="col" aria-sort={active ? (dir === 'asc' ? 'ascending' : 'descending') : undefined}
                  aria-label={c.actions ? String(c.label || t('Actions')) : undefined}
                  className={cn('px-3 py-2.5 text-start text-xs font-semibold uppercase tracking-wide text-[var(--muted)] whitespace-nowrap', c.align === 'end' && 'text-end', c.actions && 'w-px')}>
                  {c.sort ? (
                    <button type="button" onClick={() => onSort(c.sort!)} className="inline-flex items-center gap-1 uppercase hover:text-[var(--fg)]">
                      {c.label}{active ? (dir === 'asc' ? <ArrowUp className="size-3" /> : <ArrowDown className="size-3" />) : <ArrowUpDown className="size-3 opacity-40" />}
                    </button>
                  ) : c.actions ? null : c.label}
                </th>
              );
            })}
          </tr>
        </thead>
        <tbody>
          {rows.length === 0 && (
            <tr className="row-empty"><td colSpan={columns.length} className="cell-empty px-3 py-10 text-center text-[var(--muted)]">{empty ?? t('No records.')}</td></tr>
          )}
          {rows.map((r) => (
            <tr key={rowKey(r)} className="border-t border-[var(--border)] align-top hover:bg-black/[.02] dark:hover:bg-white/[.03]">
              {columns.map((c) => (
                <td key={c.key} data-label={c.actions ? '' : c.label}
                  className={cn('px-3 py-2.5', c.main && 'cell-main', c.actions && 'cell-actions', c.align === 'end' && 'text-end tabular-nums', c.className)}>
                  {c.render(r)}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
