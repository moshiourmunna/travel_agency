import { Link } from '@inertiajs/react';
import { Download } from 'lucide-react';
import { DataTable, type Column } from '@/components/admin/data-table';
import { Chips, FilterBar, FilterSelect, SearchInput, useFilters } from '@/components/admin/filters';
import { PageHeader } from '@/components/admin/page-header';
import { Pagination } from '@/components/admin/pagination';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Panel } from '@/components/ui/card';
import { useT } from '@/lib/i18n';
import { num, query } from '@/lib/utils';
import type { Option, Paged } from '@/types';

type Row = { id: number; ref: string; date: string; name: string; phone: string; district: string | null; class: string; pilgrims: number; status: string; status_label: string; booking: string | null };
type Filters = { q: string; status: string; package_class: string; district: string; sort: string; dir: string };
export const preTone = (s: string) => (s === 'converted' || s === 'registered' ? 'ok' : s === 'cancelled' ? 'no' : s === 'contacted' ? 'inf' : 'pen') as 'ok' | 'no' | 'inf' | 'pen';

export default function PreregsIndex({ preregs, filters, districts, counts, options }: { preregs: Paged<Row>; filters: Filters; districts: string[]; counts: Record<string, number>; options: { statuses: Option[]; classes: Option[] } }) {
  const t = useT();
  const f = useFilters(filters);
  const v = f.values;
  const cols: Column<Row>[] = [
    { key: 'ref', label: t('Ref'), sort: 'ref', main: true, render: (p) => <Link href={`/admin/pre-registrations/${p.id}`} className="font-semibold text-brand-600 hover:underline dark:text-brand-100">{p.ref}</Link> },
    { key: 'name', label: t('Name'), sort: 'name', render: (p) => <div>{p.name}<div className="text-xs text-[var(--muted)]">{p.phone}</div></div> },
    { key: 'district', label: t('District'), render: (p) => p.district ?? '—' },
    { key: 'class', label: t('Package'), render: (p) => t(p.class) },
    { key: 'pilgrims', label: t('Pilgrims'), align: 'end', render: (p) => p.pilgrims },
    { key: 'status', label: t('Status'), render: (p) => <div><Badge tone={preTone(p.status)}>{t(p.status_label)}</Badge>{p.booking && <div className="mt-0.5 text-xs"><Link href={`/admin/bookings/${p.booking}`} className="text-brand-600 dark:text-brand-100">{p.booking}</Link></div>}</div> },
    { key: 'date', label: t('Date'), sort: 'created', render: (p) => <span className="whitespace-nowrap">{p.date}</span> },
  ];
  return (
    <>
      <PageHeader title={t('Pre-registrations')} sub={t(':n records', { n: num(preregs.meta.total) })} actions={<Button asChild variant="outline" size="sm"><a href={`/admin/pre-registrations/export${query(filters)}`}><Download />CSV</a></Button>} />
      <Panel>
        <Chips items={[{ label: t('All'), params: {}, active: !filters.status }, ...options.statuses.map((s) => ({ label: `${t(s.label)} (${counts[s.value] ?? 0})`, params: { status: s.value }, active: filters.status === s.value }))]} />
        <FilterBar onSubmit={() => f.apply()} onReset={f.reset} dirty={!!(filters.q || filters.package_class || filters.district)}>
          <SearchInput value={v.q} onChange={(x) => f.set('q', x)} placeholder={t('Ref, name or phone')} />
          <FilterSelect value={v.package_class} onChange={(x) => f.apply({ package_class: x })} options={options.classes} placeholder={t('All classes')} />
          <FilterSelect value={v.district} onChange={(x) => f.apply({ district: x })} options={districts.map((d) => ({ value: d, label: d }))} placeholder={t('All districts')} translate={false} />
        </FilterBar>
        <DataTable columns={cols} rows={preregs.data} rowKey={(p) => p.id} sort={filters.sort} dir={filters.dir} empty={t('No pre-registrations found.')} caption={t('Pre-registrations')} />
        <Pagination meta={preregs.meta} />
      </Panel>
    </>
  );
}
