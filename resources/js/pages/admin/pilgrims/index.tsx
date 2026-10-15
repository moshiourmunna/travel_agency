import { Link } from '@inertiajs/react';
import { Download, Pencil } from 'lucide-react';
import { DataTable, type Column } from '@/components/admin/data-table';
import { Chips, FilterBar, FilterSelect, SearchInput, useFilters } from '@/components/admin/filters';
import { PageHeader } from '@/components/admin/page-header';
import { Pagination } from '@/components/admin/pagination';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Panel } from '@/components/ui/card';
import { useT } from '@/lib/i18n';
import { num, query, ucfirst } from '@/lib/utils';
import type { Option, Paged } from '@/types';

type Row = { id: number; name: string; gender: string; age: number | null; wheelchair: boolean; passport: string | null; verified: boolean; expiry: string | null; expiry_warn: boolean; booking: string | null; visa: string | null; account: string | null };
type Filters = { q: string; gender: string; package_id: string; passport: string; mahram: string; sort: string; dir: string };

export default function PilgrimsIndex({ pilgrims, filters, packages }: { pilgrims: Paged<Row>; filters: Filters; packages: Option[] }) {
  const t = useT();
  const f = useFilters(filters);
  const v = f.values;
  const cols: Column<Row>[] = [
    { key: 'name', label: t('Name'), sort: 'name', main: true, render: (p) => <div><Link href={`/admin/pilgrims/${p.id}`} className="font-semibold text-brand-600 hover:underline dark:text-brand-100">{p.name}</Link>{p.wheelchair && ' ♿'}<div className="text-xs text-[var(--muted)]">{t(ucfirst(p.gender))}{p.age !== null && ` · ${p.age} ${t('yrs')}`}</div></div> },
    { key: 'passport', label: t('Passport'), render: (p) => p.passport ? <span className="whitespace-nowrap">{p.passport} {p.verified && <Badge tone="ok">✓</Badge>}</span> : <Badge tone="no">{t('Missing')}</Badge> },
    { key: 'expiry', label: t('Expiry'), sort: 'expiry', render: (p) => p.expiry ? <span className={p.expiry_warn ? 'font-medium text-red-600' : ''}>{p.expiry_warn && '⚠ '}{p.expiry}</span> : '—' },
    { key: 'booking', label: t('Booking'), render: (p) => p.booking ? <Link href={`/admin/bookings/${p.booking}`} className="text-brand-600 dark:text-brand-100">{p.booking}</Link> : '—' },
    { key: 'visa', label: t('Visa'), render: (p) => p.visa ? <Badge tone={p.visa === 'approved' ? 'ok' : p.visa === 'rejected' ? 'no' : 'pen'}>{t(ucfirst(p.visa))}</Badge> : '—' },
    { key: 'account', label: t('Account'), render: (p) => p.account ?? '—' },
    { key: 'actions', label: t('Actions'), actions: true, align: 'end', render: (p) => <Button asChild size="xs" variant="outline"><Link href={`/admin/pilgrims/${p.id}/edit`} aria-label={`${t('Edit')} ${p.name}`}><Pencil />{t('Edit')}</Link></Button> },
  ];
  return (
    <>
      <PageHeader title={t('Pilgrims')} sub={t(':n pilgrims', { n: num(pilgrims.meta.total) })} actions={<Button asChild variant="outline" size="sm"><a href={`/admin/pilgrims/export${query(filters)}`}><Download />CSV</a></Button>} />
      <Panel>
        <Chips items={[
          { label: t('All'), params: {}, active: !filters.passport && !filters.mahram },
          { label: t('Passport missing'), params: { passport: 'missing' }, active: filters.passport === 'missing' },
          { label: `⚠ ${t('Expiring < 6 months')}`, params: { passport: 'expiring' }, active: filters.passport === 'expiring' },
          { label: t('Unverified passport'), params: { passport: 'unverified' }, active: filters.passport === 'unverified' },
          { label: t('Mahram needed'), params: { mahram: 'needed' }, active: filters.mahram === 'needed' },
        ]} />
        <FilterBar onSubmit={() => f.apply()} onReset={f.reset} dirty={!!(filters.q || filters.gender || filters.package_id)}>
          <SearchInput value={v.q} onChange={(x) => f.set('q', x)} placeholder={t('Name or phone')} />
          <FilterSelect value={v.gender} onChange={(x) => f.apply({ gender: x })} options={[{ value: 'male', label: 'Male' }, { value: 'female', label: 'Female' }]} placeholder={t('Any gender')} />
          <FilterSelect value={v.package_id} onChange={(x) => f.apply({ package_id: x })} options={packages} placeholder={t('All packages')} translate={false} />
        </FilterBar>
        <DataTable columns={cols} rows={pilgrims.data} rowKey={(p) => p.id} sort={filters.sort} dir={filters.dir} empty={t('No pilgrims found.')} caption={t('Pilgrims')} />
        <Pagination meta={pilgrims.meta} />
      </Panel>
    </>
  );
}
