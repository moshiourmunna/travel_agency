import { Link, useForm } from '@inertiajs/react';
import { Download } from 'lucide-react';
import * as React from 'react';
import { ActionDialog } from '@/components/admin/confirm-dialog';
import { DataTable, type Column } from '@/components/admin/data-table';
import { Field } from '@/components/admin/field';
import { FilterBar, FilterSelect, useFilters } from '@/components/admin/filters';
import { PageHeader } from '@/components/admin/page-header';
import { Pagination } from '@/components/admin/pagination';
import { StatusBadge } from '@/components/admin/status-badge';
import { Button } from '@/components/ui/button';
import { Panel } from '@/components/ui/card';
import { Input, Select } from '@/components/ui/input';
import { useT } from '@/lib/i18n';
import { money, query } from '@/lib/utils';
import type { Option, Paged } from '@/types';

export type CommissionRow = { id: number; agent: string | null; ref: string | null; customer: string | null; booking_total: number; amount: number; status: string; status_label: string; paid_at: string | null; note: string | null };
type Agent = { id: number; code: string; company: string; tier: string; rate: number; bookings: number; earned: number; paid_out: number; payable: number };

export function CommissionEdit({ c, statuses }: { c: CommissionRow; statuses: Option[] }) {
  const t = useT();
  const [open, setOpen] = React.useState(false);
  const f = useForm({ status: c.status, amount: String(c.amount), note: c.note ?? '' });
  return (
    <ActionDialog open={open} onOpenChange={setOpen} title={`${t('Commission')} – ${c.ref ?? ''}`} trigger={<Button size="xs" variant="outline">{t('Update')}</Button>}>
      <form className="space-y-3" onSubmit={(e) => { e.preventDefault(); f.put(`/admin/commissions/${c.id}`, { preserveScroll: true, onSuccess: () => setOpen(false) }); }}>
        <Field label={t('Status')} error={f.errors.status}><Select name="status" value={f.data.status} onChange={(e) => f.setData('status', e.target.value)} options={statuses.map((o) => ({ ...o, label: t(o.label) }))} /></Field>
        <Field label={t('Amount (৳)')} error={f.errors.amount}><Input type="number" min={0} name="amount" value={f.data.amount} onChange={(e) => f.setData('amount', e.target.value)} /></Field>
        <Field label={t('Note')} error={f.errors.note}><Input name="note" value={f.data.note} onChange={(e) => f.setData('note', e.target.value)} /></Field>
        <Button type="submit" className="w-full" disabled={f.processing}>{t('Save')}</Button>
      </form>
    </ActionDialog>
  );
}

export function commissionCols(t: ReturnType<typeof useT>, statuses: Option[], withAgent = true): Column<CommissionRow>[] {
  return [
    { key: 'ref', label: t('Booking'), main: true, render: (c) => c.ref ? <Link href={`/admin/bookings/${c.ref}`} className="font-semibold text-brand-600 hover:underline dark:text-brand-100">{c.ref}</Link> : '—' },
    ...(withAgent ? [{ key: 'agent', label: t('Agent'), render: (c: CommissionRow) => c.agent ?? '—' }] : []),
    { key: 'customer', label: t('Customer'), render: (c) => c.customer ?? '—' },
    { key: 'total', label: t('Booking total'), align: 'end', render: (c) => money(c.booking_total) },
    { key: 'amount', label: t('Commission'), align: 'end', render: (c) => <b>{money(c.amount)}</b> },
    { key: 'status', label: t('Status'), render: (c) => <div><StatusBadge status={c.status} label={c.status_label} />{c.paid_at && <div className="text-xs text-[var(--muted)]">{c.paid_at}</div>}</div> },
    { key: 'actions', label: t('Actions'), actions: true, align: 'end', render: (c) => <CommissionEdit c={c} statuses={statuses} /> },
  ];
}

export default function CommissionsIndex({ commissions, agents, filters, options }: { commissions: Paged<CommissionRow>; agents: Agent[]; filters: { status: string; agent_id: string }; options: { statuses: Option[] } }) {
  const t = useT();
  const f = useFilters(filters);
  const acols: Column<Agent>[] = [
    { key: 'code', label: t('Agent'), main: true, render: (a) => <div><Link href={`/admin/agents/${a.id}/statement`} className="font-semibold text-brand-600 hover:underline dark:text-brand-100">{a.code}</Link><div className="text-xs text-[var(--muted)]">{a.company}</div></div> },
    { key: 'tier', label: t('Tier'), render: (a) => `${t(a.tier)} · ${a.rate}%` },
    { key: 'bookings', label: t('Bookings'), align: 'end', render: (a) => a.bookings },
    { key: 'earned', label: t('Earned'), align: 'end', render: (a) => money(a.earned) },
    { key: 'paid', label: t('Paid out'), align: 'end', render: (a) => money(a.paid_out) },
    { key: 'payable', label: t('Payable'), align: 'end', render: (a) => <b className={a.payable > 0 ? 'text-amber-700 dark:text-amber-300' : ''}>{money(a.payable)}</b> },
  ];
  return (
    <>
      <PageHeader title={t('Agents & commissions')} actions={<Button asChild variant="outline" size="sm"><a href={`/admin/commissions/export${query(filters)}`}><Download />CSV</a></Button>} />
      <Panel title={t('Agents')}><DataTable columns={acols} rows={agents} rowKey={(a) => a.id} empty={t('No agents yet.')} caption={t('Agents')} /></Panel>
      <Panel title={t('Commissions')} className="mt-5">
        <FilterBar onSubmit={() => f.apply()} onReset={f.reset} dirty={!!(filters.status || filters.agent_id)}>
          <FilterSelect value={f.values.status} onChange={(x) => f.apply({ status: x })} options={options.statuses} placeholder={t('All statuses')} />
          <FilterSelect value={f.values.agent_id} onChange={(x) => f.apply({ agent_id: x })} options={agents.map((a) => ({ value: String(a.id), label: a.code }))} placeholder={t('Any agent')} translate={false} />
        </FilterBar>
        <DataTable columns={commissionCols(t, options.statuses)} rows={commissions.data} rowKey={(c) => c.id} empty={t('No commissions.')} caption={t('Commissions')} />
        <Pagination meta={commissions.meta} />
      </Panel>
    </>
  );
}
