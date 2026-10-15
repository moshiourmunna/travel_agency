import { Link } from '@inertiajs/react';
import { Check, Pencil, Plus, X } from 'lucide-react';
import { ConfirmDelete } from '@/components/admin/confirm-dialog';
import { DataTable, type Column } from '@/components/admin/data-table';
import { FilterBar, SearchInput, useFilters } from '@/components/admin/filters';
import { PageHeader } from '@/components/admin/page-header';
import { Pagination } from '@/components/admin/pagination';
import { Button } from '@/components/ui/button';
import { Panel } from '@/components/ui/card';
import { useT } from '@/lib/i18n';
import { money } from '@/lib/utils';
import type { Paged } from '@/types';

type Cell = { kind: 'bool' | 'money' | 'text'; value: string | number | boolean | null };
type Item = { id: number; cells: Record<string, Cell> };

export default function ResourceIndex({ resource, label, searchable, columns, items, filters }: { resource: string; label: string; searchable: boolean; columns: { key: string; label: string; sortable: boolean }[]; items: Paged<Item>; filters: { q: string; sort: string; dir: string } }) {
  const t = useT();
  const f = useFilters(filters);
  const base = `/admin/manage/${resource}`;
  const cols: Column<Item>[] = [
    ...columns.map((c, i): Column<Item> => ({
      key: c.key, label: t(c.label), sort: c.sortable ? c.key : undefined, main: i === 0, align: items.data[0]?.cells[c.key]?.kind === 'money' ? 'end' : undefined,
      render: (it) => {
        const cell = it.cells[c.key];
        if (!cell) return '—';
        if (cell.kind === 'bool') return cell.value ? <Check className="size-4 text-emerald-600" aria-label={t('Yes')} /> : <X className="size-4 text-[var(--muted)]" aria-label={t('No')} />;
        if (cell.kind === 'money') return <span className="whitespace-nowrap">{money(Number(cell.value))}</span>;
        const s = String(cell.value ?? '');
        return i === 0 ? <Link href={`${base}/${it.id}/edit`} className="font-semibold text-brand-600 hover:underline dark:text-brand-100">{s || `#${it.id}`}</Link> : <span className="break-words">{s || '—'}</span>;
      },
    })),
    { key: 'actions', label: t('Actions'), actions: true, align: 'end', render: (it) => (
      <div className="flex justify-end gap-1.5">
        <Button asChild size="xs" variant="outline"><Link href={`${base}/${it.id}/edit`} aria-label={`${t('Edit')} #${it.id}`}><Pencil />{t('Edit')}</Link></Button>
        <ConfirmDelete action={`${base}/${it.id}`} message={t('This permanently deletes the record.')} trigger={<Button size="xs" variant="outline-destructive" aria-label={`${t('Delete')} #${it.id}`}>{t('Delete')}</Button>} />
      </div>
    ) },
  ];
  return (
    <>
      <PageHeader title={t(label)} sub={`${items.meta.total} ${t('records')}`} actions={<Button asChild variant="gold" size="sm"><Link href={`${base}/create`}><Plus />{t('Add new')}</Link></Button>} />
      <Panel>
        {searchable && <FilterBar onSubmit={() => f.apply()} onReset={f.reset} dirty={!!filters.q}><SearchInput value={f.values.q} onChange={(x) => f.set('q', x)} placeholder={t('Search')} /></FilterBar>}
        <DataTable columns={cols} rows={items.data} rowKey={(i) => i.id} sort={filters.sort} dir={filters.dir} empty={t('No records yet.')} caption={t(label)} />
        <Pagination meta={items.meta} />
      </Panel>
    </>
  );
}
