import { Link } from '@inertiajs/react';
import { ArrowLeft } from 'lucide-react';
import { DataTable, type Column } from '@/components/admin/data-table';
import { PageHeader } from '@/components/admin/page-header';
import { StatCard } from '@/components/admin/stat-card';
import { StatusBadge } from '@/components/admin/status-badge';
import { Button } from '@/components/ui/button';
import { Panel } from '@/components/ui/card';
import { useT } from '@/lib/i18n';
import { money } from '@/lib/utils';
import type { BookingRow } from '@/types';
import { commissionCols, type CommissionRow } from './index';

const STATUSES = [{ value: 'pending', label: 'Pending' }, { value: 'approved', label: 'Approved' }, { value: 'paid', label: 'Paid' }, { value: 'void', label: 'Void' }];

export default function AgentStatement({ agent, stats, commissions, bookings }: { agent: { id: number; code: string; company: string; rate: number }; stats: { bookings: number; sales: number; earned: number; payable: number }; commissions: CommissionRow[]; bookings: BookingRow[] }) {
  const t = useT();
  const bcols: Column<BookingRow>[] = [
    { key: 'ref', label: t('Ref'), main: true, render: (b) => <Link href={`/admin/bookings/${b.ref}`} className="font-semibold text-brand-600 dark:text-brand-100">{b.ref}</Link> },
    { key: 'customer', label: t('Customer'), render: (b) => b.customer.name },
    { key: 'package', label: t('Package'), render: (b) => b.package },
    { key: 'total', label: t('Total'), align: 'end', render: (b) => money(b.total) },
    { key: 'status', label: t('Status'), render: (b) => <StatusBadge status={b.status} label={b.status_label} tone={b.status_tone} /> },
    { key: 'date', label: t('Date'), render: (b) => b.created },
  ];
  return (
    <>
      <PageHeader title={`${t('Statement')} – ${agent.code}`} sub={`${agent.company} · ${agent.rate}%`} actions={<Button asChild variant="outline" size="sm"><Link href="/admin/commissions"><ArrowLeft className="rtl:rotate-180" />{t('Back')}</Link></Button>} />
      <div className="mb-5 grid grid-cols-2 gap-3 xl:grid-cols-4">
        <StatCard label={t('Bookings')} value={stats.bookings} /><StatCard label={t('Sales')} value={money(stats.sales)} />
        <StatCard label={t('Earned')} value={money(stats.earned)} /><StatCard label={t('Payable')} value={money(stats.payable)} />
      </div>
      <Panel title={t('Commissions')}><DataTable columns={commissionCols(t, STATUSES, false)} rows={commissions} rowKey={(c) => c.id} small empty={t('No commissions.')} /></Panel>
      <Panel title={t('Bookings')} className="mt-5"><DataTable columns={bcols} rows={bookings} rowKey={(b) => b.id} small empty={t('No bookings yet.')} /></Panel>
    </>
  );
}
