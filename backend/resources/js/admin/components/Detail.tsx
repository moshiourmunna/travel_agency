import { Link } from '@inertiajs/react';
import { Icon } from './Icon';
import { Badge } from './ui';
import { useT } from '@/lib/i18n';
import type { DetailRow } from '@/lib/types';

const show = (v: any) => (v === null || v === undefined || v === '' ? '—' : typeof v === 'object' ? JSON.stringify(v) : String(v));
const STATUS: Record<string, string> = { confirmed: 'green', paid: 'green', published: 'green', approved: 'green', resolved: 'green', closed: 'gray', pending: 'gold', open: 'blue', awaiting: 'gold', rejected: 'red', cancelled: 'red', failed: 'red', draft: 'gray' };

export function Detail({ rows }: { rows: DetailRow[] }) {
  const { money } = useT();
  return (
    <dl className="divide-y divide-ink-100 dark:divide-ink-800" data-detail>
      {rows.map((r, i) => (
        <div key={i} className="grid gap-1 py-3 sm:grid-cols-3 sm:gap-4">
          <dt className="text-sm font-medium muted">{r.label}</dt>
          <dd className="min-w-0 text-sm text-ink-900 dark:text-ink-100 sm:col-span-2">
            {r.type === 'money' ? money(r.value)
              : r.type === 'link' ? (r.href ? <a href={r.href} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 font-medium text-brand-700 hover:underline dark:text-brand-300">{r.text ?? show(r.value)}<Icon name="external-link" size={13} /></a> : show(r.value))
              : r.type === 'pre' ? <pre className="whitespace-pre-wrap rounded-xl bg-ink-50 p-3 font-sans text-sm dark:bg-ink-950">{show(r.value)}</pre>
              : r.type === 'json' ? (r.value ? <pre className="max-h-80 overflow-auto rounded-xl bg-ink-50 p-3 font-mono text-xs dark:bg-ink-950">{JSON.stringify(r.value, null, 2)}</pre> : '—')
              : r.type === 'list' ? (Array.isArray(r.value) && r.value.length ? (
                <ul className="space-y-1.5">
                  {r.value.map((x: any, j: number) => (
                    <li key={j} className="flex flex-wrap items-center gap-2">
                      {x.href ? (x.href.includes('/files/') ? <a href={x.href} target="_blank" rel="noreferrer" className="font-medium text-brand-700 hover:underline dark:text-brand-300">{x.text}</a> : <Link href={x.href} className="font-medium text-brand-700 hover:underline dark:text-brand-300">{x.text}</Link>) : <span>{typeof x === 'string' ? x : x.text}</span>}
                      {x.badge ? <Badge color={STATUS[x.badge] ?? 'gray'}>{x.badge}</Badge> : null}
                    </li>
                  ))}
                </ul>) : '—')
              : r.type === 'diff' ? (Array.isArray(r.value) && r.value.length ? (
                <div className="overflow-x-auto rounded-xl border border-ink-100 dark:border-ink-800">
                  <table className="table text-xs">
                    <thead><tr><th>Field</th><th>Before</th><th>After</th></tr></thead>
                    <tbody>{r.value.map((d: any, j: number) => <tr key={j}><td className="font-mono">{d.field}</td><td className="max-w-xs break-words text-rose-700 dark:text-rose-300">{show(d.old)}</td><td className="max-w-xs break-words text-emerald-700 dark:text-emerald-300">{show(d.new)}</td></tr>)}</tbody>
                  </table>
                </div>) : '—')
              : <span className="[overflow-wrap:anywhere]">{show(r.value)}</span>}
          </dd>
        </div>
      ))}
    </dl>
  );
}
