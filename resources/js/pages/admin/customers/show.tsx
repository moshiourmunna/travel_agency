import { Link, usePage } from '@inertiajs/react';
import { ArrowLeft, Pencil, Plus, RotateCcw } from 'lucide-react';
import { ConfirmDelete } from '@/components/admin/confirm-dialog';
import { DataTable, type Column } from '@/components/admin/data-table';
import { PageHeader } from '@/components/admin/page-header';
import { PostButton } from '@/components/admin/post-button';
import { StatCard } from '@/components/admin/stat-card';
import { PayStatus, StatusBadge } from '@/components/admin/status-badge';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Panel } from '@/components/ui/card';
import { useT } from '@/lib/i18n';
import { money, ucfirst } from '@/lib/utils';
import type { BookingRow, PaymentRow, SharedProps } from '@/types';

type Props = {
  customer: { id: number; name: string | null; phone: string | null; email: string | null; gender: string | null; dob: string | null; nid: string | null; district: string | null; address: string | null; emergency_contact: string | null; agent: string | null; status: string | null; locale: string; last_login: string | null; trashed: boolean };
  stats: { bookings: number; value: number; paid: number; due: number };
  bookings: BookingRow[]; payments: PaymentRow[];
  pilgrims: { id: number; name: string; relation: string | null; passport: string | null; warn: boolean }[];
};

export default function CustomerShow({ customer: c, stats, bookings, payments, pilgrims }: Props) {
  const t = useT();
  const { auth } = usePage<SharedProps>().props;
  const bcols: Column<BookingRow>[] = [
    { key: 'ref', label: t('Ref'), main: true, render: (b) => <Link href={`/admin/bookings/${b.ref}`} className="font-semibold text-brand-600 hover:underline dark:text-brand-100">{b.ref}</Link> },
    { key: 'package', label: t('Package'), render: (b) => b.package },
    { key: 'total', label: t('Total'), align: 'end', render: (b) => money(b.total) },
    { key: 'pay', label: t('Payment'), render: (b) => <PayStatus status={b.payment_status} label={b.payment_status_label} /> },
    { key: 'status', label: t('Status'), render: (b) => <StatusBadge status={b.status} label={b.status_label} tone={b.status_tone} /> },
  ];
  const pcols: Column<PaymentRow>[] = [
    { key: 'date', label: t('Date'), main: true, render: (p) => <span className="whitespace-nowrap">{p.date}</span> },
    { key: 'booking', label: t('Booking'), render: (p) => p.booking ? <Link href={`/admin/bookings/${p.booking.ref}`} className="text-brand-600 dark:text-brand-100">{p.booking.ref}</Link> : '—' },
    { key: 'method', label: t('Method'), render: (p) => t(p.method_label) },
    { key: 'amount', label: t('Amount'), align: 'end', render: (p) => money(p.amount) },
    { key: 'status', label: t('Status'), render: (p) => <StatusBadge status={p.status} label={p.status_label} tone={p.status_tone} /> },
  ];
  const row = (k: string, v: React.ReactNode) => v ? <><dt className="text-[var(--muted)]">{k}</dt><dd className="min-w-0 break-words">{v}</dd></> : null;
  return (
    <>
      <PageHeader title={c.name ?? t('Customer')} sub={`${c.phone ?? ''}${c.email ? ' · ' + c.email : ''}`}
        actions={<>
          {c.trashed ? (auth.user?.isOwner && <PostButton variant="gold" size="sm" href={`/admin/customers/${c.id}/restore`}><RotateCcw />{t('Restore')}</PostButton>) : <>
            <Button asChild variant="gold" size="sm"><Link href={`/admin/bookings/create?customer_id=${c.id}`}><Plus />{t('New booking')}</Link></Button>
            <Button asChild variant="outline" size="sm"><Link href={`/admin/customers/${c.id}/edit`}><Pencil />{t('Edit')}</Link></Button>
            {auth.user?.isOwner && <ConfirmDelete action={`/admin/customers/${c.id}`} message={t('The customer is moved to trash and their login is blocked.')} />}
          </>}
          <Button asChild variant="outline" size="sm"><Link href="/admin/customers"><ArrowLeft className="rtl:rotate-180" />{t('All customers')}</Link></Button>
        </>} />
      {c.trashed && <div role="status" className="mb-4 rounded-xl border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-900 dark:border-amber-800 dark:bg-amber-950 dark:text-amber-200">🗑 {t('This customer is in trash.')}</div>}
      <div className="mb-5 grid grid-cols-2 gap-3 xl:grid-cols-4">
        <StatCard label={t('Bookings')} value={stats.bookings} />
        <StatCard label={t('Value')} value={money(stats.value)} />
        <StatCard label={t('Paid')} value={money(stats.paid)} />
        <StatCard label={t('Due')} value={money(stats.due)} tone={stats.due > 0 ? 'danger' : undefined} />
      </div>
      <div className="grid gap-5 xl:grid-cols-3">
        <div className="space-y-5 xl:col-span-2 min-w-0">
          <Panel title={t('Bookings')}><DataTable columns={bcols} rows={bookings} rowKey={(b) => b.id} small empty={t('No bookings yet.')} /></Panel>
          <Panel title={t('Payments')}><DataTable columns={pcols} rows={payments} rowKey={(p) => p.id} small empty={t('No payments yet.')} /></Panel>
        </div>
        <div className="space-y-5 min-w-0">
          <Panel title={t('Profile')}>
            <dl className="grid grid-cols-[minmax(96px,auto)_1fr] gap-x-3 gap-y-2 text-[13px]">
              {row(t('Status'), c.status && <Badge tone={c.status === 'active' ? 'ok' : 'no'}>{t(ucfirst(c.status))}</Badge>)}
              {row(t('Gender'), c.gender && t(ucfirst(c.gender)))}{row(t('Date of birth'), c.dob)}{row(t('NID'), c.nid)}
              {row(t('District'), c.district)}{row(t('Address'), c.address)}{row(t('Emergency contact'), c.emergency_contact)}
              {row(t('Agent'), c.agent)}{row(t('Language'), c.locale)}{row(t('Last login'), c.last_login)}
            </dl>
          </Panel>
          <Panel title={`${t('Pilgrims')} (${pilgrims.length})`}>
            {pilgrims.length === 0 ? <p className="text-sm text-[var(--muted)]">{t('No pilgrims saved.')}</p> : (
              <ul className="divide-y divide-[var(--border)] text-sm">
                {pilgrims.map((p) => <li key={p.id} className="flex flex-wrap items-center justify-between gap-2 py-2"><Link href={`/admin/pilgrims/${p.id}`} className="text-brand-600 hover:underline dark:text-brand-100">{p.name}</Link>
                  <span className="text-xs text-[var(--muted)]">{p.relation && t(p.relation)} {p.passport} {p.warn && <Badge tone="pen">⚠</Badge>}</span></li>)}
              </ul>
            )}
          </Panel>
        </div>
      </div>
    </>
  );
}
