import { Link } from '@inertiajs/react';
import { Check, Download, X } from 'lucide-react';
import { DataTable, type Column } from '@/components/admin/data-table';
import { DateInput, FilterBar, FilterSelect, SearchInput, useFilters } from '@/components/admin/filters';
import { PageHeader } from '@/components/admin/page-header';
import { Pagination } from '@/components/admin/pagination';
import { PostButton } from '@/components/admin/post-button';
import { StatusBadge } from '@/components/admin/status-badge';
import { Panel } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useT } from '@/lib/i18n';
import { money, num, query } from '@/lib/utils';
import type { Option, Paged, PaymentRow } from '@/types';

type Filters = { q: string; status: string; method: string; from: string; to: string; sort: string; dir: string };
type Props = {
  payments: Paged<PaymentRow>; sum: { amount: number; refunded: number }; filters: Filters; options: { statuses: Option[]; methods: Option[] };
  overdue: { id: number; ref: string; customer: string | null; label: string; due: string; ago: string; amount: number }[];
  refunds: { id: number; ref: string | null; reason: string; date: string | null; by: string | null; amount: number }[];
};

export default function PaymentsIndex({ payments, sum, filters, options, overdue, refunds }: Props) {
  const t = useT();
  const f = useFilters(filters);
  const v = f.values;
  const cols: Column<PaymentRow>[] = [
    { key: 'id', label: '#', main: true, render: (p) => <span className="font-semibold">#{p.id} <span className="font-normal text-[var(--muted)]">{p.date}</span></span> },
    { key: 'booking', label: t('Booking'), render: (p) => p.booking ? <div><Link href={`/admin/bookings/${p.booking.ref}`} className="text-brand-600 hover:underline dark:text-brand-100">{p.booking.ref}</Link><div className="text-xs text-[var(--muted)]">{p.booking.customer}</div></div> : '—' },
    { key: 'method', label: t('Method'), render: (p) => <div>{t(p.method_label)}<div className="break-all text-xs text-[var(--muted)]">{p.txn}{p.has_slip && <> · <a href={`/admin/payments/${p.id}/slip`} target="_blank" rel="noreferrer" className="text-brand-600 dark:text-brand-100">{t('slip')}</a></>}</div></div> },
    { key: 'amount', label: t('Amount'), sort: 'amount', align: 'end', render: (p) => <span className="whitespace-nowrap">{money(p.amount)}{p.refunded > 0 && <div className="text-xs text-red-600">−{money(p.refunded)}</div>}</span> },
    { key: 'status', label: t('Status'), render: (p) => <StatusBadge status={p.status} label={p.status_label} tone={p.status_tone} /> },
    { key: 'by', label: t('Recorded by'), render: (p) => p.recorder ?? '—' },
    { key: 'actions', label: t('Actions'), actions: true, align: 'end', render: (p) => p.status === 'pending' ? <div className="flex justify-end gap-1.5">
      <PostButton size="xs" href={`/admin/payments/${p.id}/verify`} data={{ action: 'approve' }} aria-label={`${t('Verify')} #${p.id}`}><Check />{t('Verify')}</PostButton>
      <PostButton size="xs" variant="outline" href={`/admin/payments/${p.id}/verify`} data={{ action: 'reject' }} aria-label={`${t('Reject')} #${p.id}`}><X />{t('Reject')}</PostButton></div> : null },
  ];
  return (
    <>
      <PageHeader title={t('Payments')} sub={`${t(':n payments', { n: num(payments.meta.total) })} · ${money(sum.amount)}${sum.refunded ? ` · ${t('Refunded')} ${money(sum.refunded)}` : ''}`}
        actions={<Button asChild variant="outline" size="sm"><a href={`/admin/payments/export${query(filters)}`}><Download />CSV</a></Button>} />
      <div className="grid gap-5 xl:grid-cols-3">
        <Panel className="xl:col-span-2 min-w-0">
          <FilterBar onSubmit={() => f.apply()} onReset={f.reset} dirty={!!(filters.q || filters.status || filters.method || filters.from || filters.to)}>
            <SearchInput value={v.q} onChange={(x) => f.set('q', x)} placeholder={t('Ref, TrxID or customer')} />
            <FilterSelect value={v.status} onChange={(x) => f.apply({ status: x })} options={options.statuses} placeholder={t('All statuses')} />
            <FilterSelect value={v.method} onChange={(x) => f.apply({ method: x })} options={options.methods} placeholder={t('All methods')} />
            <DateInput value={v.from} onChange={(x) => f.set('from', x)} label={t('From')} />
            <DateInput value={v.to} onChange={(x) => f.set('to', x)} label={t('To')} />
          </FilterBar>
          <DataTable columns={cols} rows={payments.data} rowKey={(p) => p.id} sort={filters.sort} dir={filters.dir} empty={t('No payments match these filters.')} caption={t('Payments')} />
          <Pagination meta={payments.meta} />
        </Panel>
        <div className="space-y-5 min-w-0">
          <Panel title={`⚠ ${t('Overdue installments')}`}>
            {overdue.length === 0 ? <p className="text-sm text-[var(--muted)]">{t('Nothing overdue.')} 🎉</p> : (
              <ul className="divide-y divide-[var(--border)] text-sm">{overdue.map((i) => (
                <li key={i.id} className="flex flex-wrap items-center justify-between gap-2 py-2">
                  <span><Link href={`/admin/bookings/${i.ref}`} className="font-medium text-brand-600 dark:text-brand-100">{i.ref}</Link> · {i.customer}<div className="text-xs text-red-600">{t(i.label)} · {i.due} ({i.ago})</div></span>
                  <b className="tabular-nums">{money(i.amount)}</b>
                </li>))}</ul>
            )}
          </Panel>
          <Panel title={t('Recent refunds')}>
            {refunds.length === 0 ? <p className="text-sm text-[var(--muted)]">{t('No refunds.')}</p> : (
              <ul className="divide-y divide-[var(--border)] text-sm">{refunds.map((r) => (
                <li key={r.id} className="flex flex-wrap items-center justify-between gap-2 py-2">
                  <span>{r.ref ? <Link href={`/admin/bookings/${r.ref}`} className="text-brand-600 dark:text-brand-100">{r.ref}</Link> : '—'} · {r.reason}<div className="text-xs text-[var(--muted)]">{r.date} · {r.by}</div></span>
                  <b className="tabular-nums text-red-600">−{money(r.amount)}</b>
                </li>))}</ul>
            )}
          </Panel>
        </div>
      </div>
    </>
  );
}
