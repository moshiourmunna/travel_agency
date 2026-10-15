import { Link, usePage } from '@inertiajs/react';
import { Download, Pencil, Plus, RotateCcw } from 'lucide-react';
import { DataTable, type Column } from '@/components/admin/data-table';
import { Chips, DateInput, FilterBar, FilterSelect, SearchInput, useFilters } from '@/components/admin/filters';
import { PageHeader } from '@/components/admin/page-header';
import { Pagination } from '@/components/admin/pagination';
import { PostButton } from '@/components/admin/post-button';
import { PayStatus, StatusBadge } from '@/components/admin/status-badge';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Panel } from '@/components/ui/card';
import { useT } from '@/lib/i18n';
import { money, num, query, ucfirst } from '@/lib/utils';
import type { BookingRow, Option, Paged, SharedProps } from '@/types';

type Filters = { q: string; status: string; package_id: string; payment_status: string; payment_mode: string; type: string; agent_id: string; from: string; to: string; trashed: string; sort: string; dir: string };
type Props = {
  bookings: Paged<BookingRow>; totals: { n: number; value: number; collected: number }; filters: Filters; trashedCount: number;
  options: { statuses: Option[]; payment_statuses: Option[]; modes: Option[]; types: Option[]; packages: Option[]; agents: Option[] };
};

export default function BookingsIndex({ bookings, totals, filters, options, trashedCount }: Props) {
  const t = useT();
  const { auth, modules } = usePage<SharedProps>().props;
  const f = useFilters(filters);
  const v = f.values;
  const anyChip = filters.status || filters.payment_status || filters.trashed;
  const chips = [
    { label: t('All'), params: {}, active: !anyChip },
    ...['pending', 'hold', 'confirmed', 'docs_pending', 'visa', 'cancelled'].map((s) => ({ label: t(options.statuses.find((o) => o.value === s)?.label ?? s), params: { status: s }, active: filters.status === s && !filters.payment_status })),
    { label: `⚠ ${t('Overdue installment')}`, params: { payment_status: 'overdue' }, active: filters.payment_status === 'overdue' },
    ...(auth.user?.isOwner && trashedCount ? [{ label: `🗑 ${t('Trash')} (${trashedCount})`, params: { trashed: 'only' }, active: filters.trashed === 'only' }] : []),
  ];
  const cols: Column<BookingRow>[] = [
    { key: 'ref', label: t('Ref'), sort: 'ref', main: true, render: (b) => (
      <div className="flex flex-wrap items-center gap-1.5"><Link href={`/admin/bookings/${b.ref}`} className="font-semibold text-brand-600 hover:underline dark:text-brand-100">{b.ref}</Link>{b.agent && <Badge>{b.agent}</Badge>}{b.trashed && <Badge tone="no">{t('Trashed')}</Badge>}</div>
    ) },
    { key: 'customer', label: t('Customer'), render: (b) => <div className="min-w-0">{b.customer.name}<div className="text-xs text-[var(--muted)]">{b.customer.phone}</div></div> },
    { key: 'package', label: t('Package'), render: (b) => <div className="max-w-[260px]"><span className="line-clamp-2">{b.package}</span><div className="text-xs text-[var(--muted)]">{t(ucfirst(b.room_type))}</div></div> },
    { key: 'pax', label: t('Pax'), sort: 'pax', align: 'end', render: (b) => b.pax },
    { key: 'total', label: t('Total'), sort: 'total', align: 'end', render: (b) => <span className="whitespace-nowrap">{money(b.total)}</span> },
    { key: 'paid', label: t('Paid'), sort: 'paid', align: 'end', render: (b) => <span className="whitespace-nowrap">{money(b.paid)}</span> },
    { key: 'payment', label: t('Payment'), render: (b) => <div><PayStatus status={b.payment_status} label={b.payment_status_label} /><div className="mt-0.5 text-xs text-[var(--muted)]">{t(b.payment_mode_label)}</div></div> },
    { key: 'status', label: t('Status'), sort: 'status', render: (b) => <StatusBadge status={b.status} label={b.status_label} tone={b.status_tone} /> },
    { key: 'date', label: t('Date'), sort: 'created', render: (b) => <span className="whitespace-nowrap">{b.created}</span> },
    { key: 'actions', label: t('Actions'), actions: true, align: 'end', render: (b) => b.trashed
      ? <PostButton size="xs" variant="outline" href={`/admin/bookings/${b.ref}/restore`}><RotateCcw />{t('Restore')}</PostButton>
      : <Button asChild size="xs" variant="outline"><Link href={`/admin/bookings/${b.ref}/edit`} aria-label={`${t('Edit')} ${b.ref}`}><Pencil />{t('Edit')}</Link></Button> },
  ];
  const keep = (o: Partial<Filters>) => ({ ...v, ...o });
  return (
    <>
      <PageHeader title={t('Bookings')} sub={`${t(':n bookings', { n: num(totals.n) })} · ${t('Value')} ${money(totals.value)} · ${t('Collected')} ${money(totals.collected)}`}
        actions={<>
          <Button asChild variant="outline" size="sm"><a href={`/admin/bookings/export${query(filters)}`}><Download />CSV</a></Button>
          <Button asChild variant="gold" size="sm"><Link href="/admin/bookings/create"><Plus />{t('New booking')}</Link></Button>
        </>} />
      <Panel>
        <Chips items={chips} />
        <FilterBar onSubmit={() => f.apply({ ...v })} onReset={f.reset} dirty={Object.entries(filters).some(([k, x]) => x && k !== 'sort' && k !== 'dir')}>
          <SearchInput value={v.q} onChange={(x) => f.set('q', x)} placeholder={t('Ref, customer, phone, email or pilgrim')} />
          <FilterSelect value={v.status} onChange={(x) => f.apply(keep({ status: x }))} options={options.statuses} placeholder={t('All statuses')} />
          <FilterSelect value={v.package_id} onChange={(x) => f.apply(keep({ package_id: x }))} options={options.packages} placeholder={t('All packages')} translate={false} />
          <FilterSelect value={v.payment_status} onChange={(x) => f.apply(keep({ payment_status: x }))} options={options.payment_statuses} placeholder={t('Any payment status')} />
          <FilterSelect value={v.payment_mode} onChange={(x) => f.apply(keep({ payment_mode: x }))} options={options.modes} placeholder={t('Any payment plan')} />
          <FilterSelect value={v.type} onChange={(x) => f.apply(keep({ type: x }))} options={options.types} placeholder={t('All types')} />
          {modules.agents && <FilterSelect value={v.agent_id} onChange={(x) => f.apply(keep({ agent_id: x }))} options={options.agents} placeholder={t('Any agent')} translate={false} />}
          <DateInput value={v.from} onChange={(x) => f.set('from', x)} label={t('From')} />
          <DateInput value={v.to} onChange={(x) => f.set('to', x)} label={t('To')} />
        </FilterBar>
        <DataTable columns={cols} rows={bookings.data} rowKey={(b) => b.id} empty={t('No bookings match these filters.')} sort={filters.sort} dir={filters.dir} caption={t('Bookings')} />
        <Pagination meta={bookings.meta} />
      </Panel>
    </>
  );
}
