import { DataTable, type Column } from '@/components/admin/data-table';
import { DateInput, FilterBar, FilterSelect, useFilters } from '@/components/admin/filters';
import { PageHeader } from '@/components/admin/page-header';
import { Pagination } from '@/components/admin/pagination';
import { Badge } from '@/components/ui/badge';
import { Panel } from '@/components/ui/card';
import { useT } from '@/lib/i18n';
import { num } from '@/lib/utils';
import type { Option, Paged } from '@/types';

type Row = { id: number; at: string; user: string | null; action: string; subject: string; before: string | null; after: string | null; ip: string | null };

export default function AuditIndex({ logs, filters, users, groups }: { logs: Paged<Row>; filters: { action: string; user_id: string; from: string; to: string }; users: Option[]; groups: string[] }) {
  const t = useT();
  const f = useFilters(filters);
  const v = f.values;
  const cols: Column<Row>[] = [
    { key: 'at', label: t('When'), main: true, render: (l) => <span className="whitespace-nowrap">{l.at}</span> },
    { key: 'user', label: t('User'), render: (l) => l.user ?? t('System') },
    { key: 'action', label: t('Action'), render: (l) => <Badge tone="inf">{l.action}</Badge> },
    { key: 'subject', label: t('Subject'), render: (l) => l.subject },
    { key: 'change', label: t('Change'), render: (l) => <div className="max-w-[420px] break-all font-mono text-[11px] leading-relaxed">{l.before && <div className="text-red-700 dark:text-red-300">− {l.before}</div>}{l.after && <div className="text-emerald-700 dark:text-emerald-300">+ {l.after}</div>}</div> },
    { key: 'ip', label: 'IP', render: (l) => <span className="text-xs text-[var(--muted)]">{l.ip}</span> },
  ];
  return (
    <>
      <PageHeader title={t('Audit log')} sub={t(':n entries', { n: num(logs.meta.total) })} />
      <Panel>
        <FilterBar onSubmit={() => f.apply()} onReset={f.reset} dirty={Object.values(filters).some(Boolean)}>
          <FilterSelect value={v.action} onChange={(x) => f.apply({ action: x })} options={groups.map((g) => ({ value: g, label: g }))} placeholder={t('All actions')} translate={false} />
          <FilterSelect value={v.user_id} onChange={(x) => f.apply({ user_id: x })} options={users} placeholder={t('All users')} translate={false} />
          <DateInput value={v.from} onChange={(x) => f.set('from', x)} label={t('From')} />
          <DateInput value={v.to} onChange={(x) => f.set('to', x)} label={t('To')} />
        </FilterBar>
        <DataTable columns={cols} rows={logs.data} rowKey={(l) => l.id} small empty={t('No entries.')} caption={t('Audit log')} />
        <Pagination meta={logs.meta} />
      </Panel>
    </>
  );
}
