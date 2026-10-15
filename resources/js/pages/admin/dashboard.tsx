import { Link } from '@inertiajs/react';
import { Check, Plus, X } from 'lucide-react';
import { Bar, BarChart, CartesianGrid, Line, ComposedChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { PageHeader } from '@/components/admin/page-header';
import { PostButton } from '@/components/admin/post-button';
import { StatCard } from '@/components/admin/stat-card';
import { StatusBadge } from '@/components/admin/status-badge';
import { Button } from '@/components/ui/button';
import { Panel } from '@/components/ui/card';
import { useT } from '@/lib/i18n';
import { money, num } from '@/lib/utils';
import { usePage } from '@inertiajs/react';
import type { BookingRow, SharedProps } from '@/types';

type Props = {
  stats: { bookings: number; collected: number; due: number; hajj_sold: number; hajj_total: number; visa_pending: number; pending_payments: number };
  chart: { label: string; month: string; bookings: number; collected: number }[];
  byStatus: { status: string; label: string; n: number }[];
  latest: BookingRow[];
  attention: { overdue: number; overdue_amount: number; today: number; docs: number; missing_docs: number; passports: number; holds: number; preregs: number; commissions: number };
  activity: { id: number; icon: string; ref: string | null; from: string | null; to: string | null; message: string | null; ago: string; user: string | null; type: string }[];
  pendingPayments: { id: number; ref: string; method: string; amount: number }[];
  quick: { languages: string[]; modules_off: string[]; licences: number };
  now: string;
};

export default function Dashboard({ stats, chart, byStatus, latest, attention, activity, pendingPayments, quick, now }: Props) {
  const t = useT();
  const { modules } = usePage<SharedProps>().props;
  const today = new Date().toISOString().slice(0, 10);
  const quota = stats.hajj_total ? Math.round((stats.hajj_sold * 100) / stats.hajj_total) : 0;
  const maxStatus = Math.max(1, ...byStatus.map((s) => s.n));
  return (
    <>
      <PageHeader title={t('Admin Dashboard')} sub={`${t('Season Hajj 2027')} · ${now}`}
        actions={<Button asChild variant="gold" size="sm"><Link href="/admin/bookings/create"><Plus />{t('New booking')}</Link></Button>} />
      <section aria-label={t('Key figures')} className="mb-5 grid grid-cols-2 gap-3 xl:grid-cols-4">
        <StatCard label={t('Bookings (active)')} value={num(stats.bookings)} sub={`${stats.pending_payments} ${t('manual payments to verify')}`} href="/admin/bookings" />
        <StatCard label={t('Revenue collected')} value={money(stats.collected)} sub={`${money(stats.due)} ${t('due')}`} href="/admin/payments" />
        <StatCard label={t('Pilgrims – Hajj 2027')} value={`${stats.hajj_sold} / ${stats.hajj_total}`} sub={`${t('Quota used')} ${quota}%`} />
        <StatCard label={t('Visa pending')} value={stats.visa_pending} sub={t('Open visa desk')} href="/admin/inbox#visa" />
      </section>
      <Panel title={t('Needs attention')} className="mb-5">
        <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
          <StatCard label={t('Overdue installments')} value={attention.overdue} tone={attention.overdue ? 'danger' : undefined} sub={money(attention.overdue_amount)} href="/admin/bookings?payment_status=overdue" />
          <StatCard label={t('Collected today')} value={money(attention.today)} href={`/admin/payments?status=paid&from=${today}`} />
          <StatCard label={t('Documents to review')} value={attention.docs} sub={`${attention.missing_docs} ${t('missing')}`} href="/admin/bookings?status=docs_pending" />
          <StatCard label={t('Passports < 6 months')} value={attention.passports} href="/admin/pilgrims?passport=expiring" />
          <StatCard label={t('Holds expiring 24h')} value={attention.holds} href="/admin/bookings?status=hold" />
          {modules.preregistration && <StatCard label={t('New pre-registrations')} value={attention.preregs} href="/admin/pre-registrations?status=received" />}
          {modules.agents && <StatCard label={t('Commission payable')} value={money(attention.commissions)} href="/admin/commissions?status=approved" />}
        </div>
      </Panel>
      <div className="grid gap-5 xl:grid-cols-3">
        <div className="space-y-5 xl:col-span-2 min-w-0">
          <Panel title={t('Bookings & collections per month')}>
            <div className="h-64 w-full" role="img" aria-label={t('Bookings per month')}>
              <ResponsiveContainer width="100%" height="100%">
                <ComposedChart data={chart} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="currentColor" strokeOpacity={0.08} />
                  <XAxis dataKey="label" tick={{ fontSize: 11 }} stroke="currentColor" strokeOpacity={0.4} reversed={document.documentElement.dir === 'rtl'} />
                  <YAxis yAxisId="n" allowDecimals={false} tick={{ fontSize: 11 }} width={30} stroke="currentColor" strokeOpacity={0.4} orientation={document.documentElement.dir === 'rtl' ? 'right' : 'left'} />
                  <YAxis yAxisId="m" hide />
                  <Tooltip formatter={(v, name) => (name === 'collected' ? [money(Number(v)), t('Collected')] : [v, t('Bookings')])} contentStyle={{ borderRadius: 10, fontSize: 12 }} />
                  <Bar yAxisId="n" dataKey="bookings" fill="#12895a" radius={[6, 6, 0, 0]} maxBarSize={36} />
                  <Line yAxisId="m" dataKey="collected" stroke="#c9962e" strokeWidth={2} dot={false} type="monotone" />
                </ComposedChart>
              </ResponsiveContainer>
            </div>
            <div className="mt-2 flex gap-4 text-xs text-[var(--muted)]"><span className="inline-flex items-center gap-1"><i className="inline-block size-2.5 rounded-sm bg-brand-500" />{t('Bookings')}</span><span className="inline-flex items-center gap-1"><i className="inline-block h-0.5 w-3 bg-gold-500" />{t('Collected')}</span></div>
          </Panel>
          <Panel title={t('Latest bookings')} actions={<Button asChild variant="link" size="sm"><Link href="/admin/bookings">{t('All bookings')}</Link></Button>}>
            <ul className="divide-y divide-[var(--border)]">
              {latest.map((b) => (
                <li key={b.id} className="flex flex-wrap items-center justify-between gap-2 py-2.5">
                  <div className="min-w-0">
                    <Link href={`/admin/bookings/${b.ref}`} className="font-semibold text-brand-600 hover:underline dark:text-brand-100">{b.ref}</Link>
                    <span className="text-sm text-[var(--muted)]"> · {b.customer.name}</span>
                    <p className="truncate text-xs text-[var(--muted)]">{b.package} · {t(b.payment_mode_label)}</p>
                  </div>
                  <div className="flex items-center gap-2 text-sm"><span className="tabular-nums text-[var(--muted)]">{b.progress}%</span><StatusBadge status={b.status} label={b.status_label} tone={b.status_tone} /></div>
                </li>
              ))}
            </ul>
          </Panel>
        </div>
        <div className="space-y-5 min-w-0">
          <Panel title={t('Payments awaiting verification')}>
            {pendingPayments.length === 0 ? <p className="text-sm text-[var(--muted)]">{t('Nothing to verify.')}</p> : (
              <ul className="divide-y divide-[var(--border)]">
                {pendingPayments.map((p) => (
                  <li key={p.id} className="flex items-center justify-between gap-2 py-2">
                    <span className="text-sm"><Link href={`/admin/bookings/${p.ref}#payments`} className="font-medium">{p.ref}</Link> · {t(p.method)}<br /><small className="text-[var(--muted)]">{money(p.amount)}</small></span>
                    <span className="flex gap-1.5">
                      <PostButton size="icon" href={`/admin/payments/${p.id}/verify`} data={{ action: 'approve' }} aria-label={t('Verify')} title={t('Verify')}><Check /></PostButton>
                      <PostButton size="icon" variant="outline" href={`/admin/payments/${p.id}/verify`} data={{ action: 'reject' }} aria-label={t('Reject')} title={t('Reject')}><X /></PostButton>
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </Panel>
          <Panel title={t('Bookings by status')}>
            <ul className="space-y-2">
              {byStatus.map((s) => (
                <li key={s.status}>
                  <Link href={`/admin/bookings?status=${s.status}`} className="block text-sm hover:text-brand-600">
                    <div className="flex justify-between"><span>{t(s.label)}</span><b className="tabular-nums">{s.n}</b></div>
                    <div className="mt-1 h-1.5 rounded-full bg-slate-200 dark:bg-slate-700"><div className="h-full rounded-full bg-brand-500" style={{ width: `${(s.n * 100) / maxStatus}%` }} /></div>
                  </Link>
                </li>
              ))}
            </ul>
          </Panel>
          <Panel title={t('Quick settings')}>
            <p className="text-sm text-[var(--muted)]">{t('Languages on site:')} <b className="text-[var(--fg)]">{quick.languages.join(', ')}</b><br />
              {t('Modules off:')} <b className="text-[var(--fg)]">{quick.modules_off.join(', ') || t('none')}</b><br />
              {t('Licences shown:')} <b className="text-[var(--fg)]">{quick.licences}</b></p>
            <Button asChild variant="outline" size="sm" className="mt-3"><Link href="/admin/settings">{t('Open settings')}</Link></Button>
          </Panel>
        </div>
      </div>
      <Panel title={t('Recent activity')} className="mt-5">
        {activity.length === 0 ? <p className="text-sm text-[var(--muted)]">{t('No activity recorded yet.')}</p> : (
          <ol className="space-y-3">
            {activity.map((a) => (
              <li key={a.id} className="flex gap-3 text-sm">
                <span aria-hidden className="flex size-8 shrink-0 items-center justify-center rounded-full bg-brand-50 dark:bg-brand-900">{a.icon}</span>
                <div className="min-w-0">
                  {a.ref && <Link href={`/admin/bookings/${a.ref}`} className="font-medium text-brand-600 dark:text-brand-100">{a.ref}</Link>}
                  {a.ref && ' · '}{a.type === 'status' && `${t(a.from ?? '')} → ${t(a.to ?? '')} `}<span className="break-words">{a.message}</span>
                  <p className="text-xs text-[var(--muted)]">{a.ago} · {a.user ?? t('System')}</p>
                </div>
              </li>
            ))}
          </ol>
        )}
      </Panel>
    </>
  );
}
