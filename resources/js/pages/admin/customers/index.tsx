import { Link, usePage } from '@inertiajs/react';
import { Download, Pencil, Plus, RotateCcw } from 'lucide-react';
import { DataTable, type Column } from '@/components/admin/data-table';
import { Chips, FilterBar, FilterSelect, SearchInput, useFilters } from '@/components/admin/filters';
import { PageHeader } from '@/components/admin/page-header';
import { Pagination } from '@/components/admin/pagination';
import { PostButton } from '@/components/admin/post-button';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Panel } from '@/components/ui/card';
import { useT } from '@/lib/i18n';
import { num, query } from '@/lib/utils';
import type { Option, Paged, SharedProps } from '@/types';

export type CustomerRow = { id: number; name: string | null; phone: string | null; email: string | null; district: string | null; agent: string | null; bookings: number; pilgrims: number; since: string; trashed: boolean };
type Filters = { q: string; agent_id: string; district: string; trashed: string; sort: string; dir: string };

export default function CustomersIndex({ customers, filters, agents, districts, trashedCount }: { customers: Paged<CustomerRow>; filters: Filters; agents: Option[]; districts: string[]; trashedCount: number }) {
  const t = useT();
  const { auth, modules } = usePage<SharedProps>().props;
  const f = useFilters(filters);
  const v = f.values;
  const cols: Column<CustomerRow>[] = [
    { key: 'name', label: t('Name'), sort: 'name', main: true, render: (c) => <div className="flex flex-wrap items-center gap-1.5"><Link href={`/admin/customers/${c.id}`} className="font-semibold text-brand-600 hover:underline dark:text-brand-100">{c.name ?? '—'}</Link>{c.trashed && <Badge tone="no">{t('Trashed')}</Badge>}</div> },
    { key: 'contact', label: t('Contact'), render: (c) => <div className="min-w-0 break-words">{c.phone}<div className="text-xs text-[var(--muted)]">{c.email}</div></div> },
    { key: 'district', label: t('District'), sort: 'district', render: (c) => c.district ?? '—' },
    ...(modules.agents ? [{ key: 'agent', label: t('Agent'), render: (c: CustomerRow) => c.agent ? <Badge>{c.agent}</Badge> : '—' }] : []),
    { key: 'bookings', label: t('Bookings'), sort: 'bookings', align: 'end', render: (c) => num(c.bookings) },
    { key: 'pilgrims', label: t('Pilgrims'), align: 'end', render: (c) => num(c.pilgrims) },
    { key: 'since', label: t('Since'), sort: 'created', render: (c) => <span className="whitespace-nowrap">{c.since}</span> },
    { key: 'actions', label: t('Actions'), actions: true, align: 'end', render: (c) => c.trashed
      ? <PostButton size="xs" variant="outline" href={`/admin/customers/${c.id}/restore`}><RotateCcw />{t('Restore')}</PostButton>
      : <Button asChild size="xs" variant="outline"><Link href={`/admin/customers/${c.id}/edit`} aria-label={`${t('Edit')} ${c.name ?? ''}`}><Pencil />{t('Edit')}</Link></Button> },
  ];
  return (
    <>
      <PageHeader title={t('Customers')} sub={t(':n customers', { n: num(customers.meta.total) })}
        actions={<>
          <Button asChild variant="outline" size="sm"><a href={`/admin/customers/export${query(filters)}`}><Download />CSV</a></Button>
          <Button asChild variant="gold" size="sm"><Link href="/admin/customers/create"><Plus />{t('New customer')}</Link></Button>
        </>} />
      <Panel>
        {auth.user?.isOwner && trashedCount > 0 && <Chips items={[{ label: t('Active'), params: {}, active: !filters.trashed }, { label: `🗑 ${t('Trash')} (${trashedCount})`, params: { trashed: 'only' }, active: filters.trashed === 'only' }]} />}
        <FilterBar onSubmit={() => f.apply()} onReset={f.reset} dirty={!!(filters.q || filters.agent_id || filters.district)}>
          <SearchInput value={v.q} onChange={(x) => f.set('q', x)} placeholder={t('Name, phone, email or district')} />
          {modules.agents && <FilterSelect value={v.agent_id} onChange={(x) => f.apply({ agent_id: x })} options={agents} placeholder={t('Any agent')} translate={false} />}
          <FilterSelect value={v.district} onChange={(x) => f.apply({ district: x })} options={districts.map((d) => ({ value: d, label: d }))} placeholder={t('All districts')} translate={false} />
        </FilterBar>
        <DataTable columns={cols} rows={customers.data} rowKey={(c) => c.id} sort={filters.sort} dir={filters.dir} empty={t('No customers found.')} caption={t('Customers')} />
        <Pagination meta={customers.meta} />
      </Panel>
    </>
  );
}
