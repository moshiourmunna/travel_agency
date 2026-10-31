import { Head, Link, usePage } from '@inertiajs/react';
import { useCallback } from 'react';
import type { ChartConfiguration } from 'chart.js';
import { ChartBox } from '@/components/Chart';
import { Icon } from '@/components/Icon';
import { Badge, Card, Empty, Stat, cx } from '@/components/ui';
import { useAdminUrl, useCan } from '@/lib/http';
import { useT } from '@/lib/i18n';
import type { Shared } from '@/lib/types';

type Kpi = { key: string; label: string; value: number; type?: 'money'; delta?: number | null; icon: string; href?: string };
type Attn = { count: number; label: string; href: string; icon: string; tone: string };
type Day = { date: string; bookings: number; revenue: number | null };
type Recent = { id: number; ref: string; title: string; customer: string | null; total: number; status: string; status_label: string; status_color: string; created_at: string; href: string };
type Mix = { kind: string; label: string; count: number; total: number | null };
type Props = { kpis: Kpi[]; attention: Attn[]; chart: Day[] | null; recent: Recent[]; mix: Mix[]; revalidate: { at: string; ok: boolean; tags: string[]; error?: string } | null };

const PALETTE = ['#0f766e', '#f59e0b', '#0ea5e9', '#e11d48', '#8b5cf6', '#84cc16', '#64748b', '#14b8a6'];

export default function Dashboard({ kpis, attention, chart, recent, mix, revalidate }: Props) {
  const { t, num, money, ago, date, d, bn } = useT();
  const url = useAdminUrl();
  const can = useCan();
  const user = (usePage().props as unknown as Shared).auth?.user;
  const hour = Number(new Date().toLocaleString('en-GB', { hour: 'numeric', hour12: false, timeZone: 'Asia/Dhaka' }));
  const hello = hour < 12 ? t('Good morning', 'শুভ সকাল') : hour < 17 ? t('Good afternoon', 'শুভ অপরাহ্ন') : t('Good evening', 'শুভ সন্ধ্যা');
  const totalAttn = attention.reduce((s, a) => s + a.count, 0);

  const lineCfg = useCallback((dark: boolean): ChartConfiguration => ({
    type: 'bar',
    data: {
      labels: (chart ?? []).map((x) => d(new Date(x.date + 'T00:00:00').toLocaleDateString(bn ? 'bn-BD' : 'en-GB', { day: 'numeric', month: 'short' }))),
      datasets: [
        { type: 'line', label: t('Bookings', 'বুকিং'), data: (chart ?? []).map((x) => x.bookings), borderColor: dark ? '#2dd4bf' : '#0f766e', backgroundColor: dark ? 'rgba(45,212,191,.15)' : 'rgba(15,118,110,.10)', fill: true, tension: 0.35, pointRadius: 0, pointHoverRadius: 4, yAxisID: 'y', order: 0 },
        ...((chart ?? []).some((x) => x.revenue !== null) ? [{ type: 'bar' as const, label: t('Payments (৳)', 'পেমেন্ট (৳)'), data: (chart ?? []).map((x) => x.revenue ?? 0), backgroundColor: dark ? 'rgba(251,191,36,.45)' : 'rgba(245,158,11,.45)', borderRadius: 4, yAxisID: 'y1', order: 1 }] : []),
      ],
    } as any,
    options: {
      responsive: true, maintainAspectRatio: false, interaction: { mode: 'index', intersect: false },
      plugins: { legend: { position: 'bottom', labels: { boxWidth: 10, usePointStyle: true } }, tooltip: { callbacks: { label: (c: any) => c.dataset.yAxisID === 'y1' ? ` ${money(c.raw)}` : ` ${num(c.raw)} ${t('bookings', 'বুকিং')}` } } },
      scales: { x: { grid: { display: false }, ticks: { maxTicksLimit: 8 } }, y: { beginAtZero: true, ticks: { precision: 0 } }, y1: { display: (chart ?? []).some((x) => x.revenue !== null), position: 'right', beginAtZero: true, grid: { drawOnChartArea: false }, ticks: { callback: (v: any) => '৳' + (v >= 100000 ? (v / 100000).toFixed(1) + 'L' : v >= 1000 ? (v / 1000).toFixed(0) + 'k' : v) } } },
    },
  }), [chart, bn]); // eslint-disable-line react-hooks/exhaustive-deps

  const mixCfg = useCallback((dark: boolean): ChartConfiguration => ({
    type: 'doughnut',
    data: { labels: mix.map((m) => m.label), datasets: [{ data: mix.map((m) => m.count), backgroundColor: PALETTE, borderColor: dark ? '#0b1220' : '#fff', borderWidth: 2 }] },
    options: { responsive: true, maintainAspectRatio: false, cutout: '68%', plugins: { legend: { display: false } } } as any,
  }), [mix]);

  return (
    <>
      <Head title={t('Dashboard', 'ড্যাশবোর্ড')} />
      <div className="mb-6 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-sm muted">{date(new Date().toISOString())}</p>
          <h1 className="text-2xl font-extrabold tracking-tight sm:text-3xl">{hello}, {user?.name.split(' ')[0]}</h1>
          <p className="mt-1 text-sm muted">{totalAttn ? t(`${totalAttn} things need your attention today.`, `আজ ${num(totalAttn)}টি বিষয়ে আপনার মনোযোগ দরকার।`) : t('Everything is up to date.', 'সব কিছু হালনাগাদ।')}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          {can('bookings.view') ? <Link href={url('/bookings')} className="btn btn-outline btn-sm"><Icon name="briefcase" size={16} />{t('Bookings', 'বুকিং')}</Link> : null}
          {can('content.manage') ? <Link href={url('/pages')} className="btn btn-outline btn-sm"><Icon name="layout-template" size={16} />{t('Pages', 'পেজ')}</Link> : null}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:gap-4 xl:grid-cols-4" data-kpis>
        {kpis.map((k) => <Stat key={k.key} label={k.label} value={k.type === 'money' ? money(k.value) : num(k.value)} icon={k.icon} delta={k.delta} href={k.href} tone={k.key === 'outstanding' ? 'gold' : k.key === 'revenue' ? 'accent' : k.key === 'visa' ? 'blue' : 'brand'} />)}
      </div>

      <div className="mt-5 grid gap-5 xl:grid-cols-3">
        {chart ? (
          <Card title={t('Last 30 days', 'গত ৩০ দিন')} className="xl:col-span-2">
            <ChartBox config={lineCfg} label={t('Bookings and payments per day', 'প্রতিদিনের বুকিং ও পেমেন্ট')} height={280} />
          </Card>
        ) : null}
        <Card title={<span className="flex items-center gap-2">{t('Needs attention', 'মনোযোগ দরকার')}{totalAttn ? <Badge color="red">{num(totalAttn)}</Badge> : null}</span>} pad={false} className={cx(!chart && 'xl:col-span-3')}>
          {attention.length ? (
            <ul className="divide-y divide-ink-100 dark:divide-ink-800" data-attention>
              {attention.map((a) => (
                <li key={a.label}>
                  <Link href={a.href} className="flex items-center gap-3 px-4 py-3 hover:bg-ink-50 dark:hover:bg-ink-800/50 sm:px-5">
                    <span className={cx('grid h-9 w-9 shrink-0 place-items-center rounded-xl', a.tone === 'red' ? 'bg-rose-50 text-rose-700 dark:bg-rose-900/30 dark:text-rose-300' : 'bg-accent-100 text-accent-800 dark:bg-accent-400/15 dark:text-accent-200')}><Icon name={a.icon} size={17} /></span>
                    <span className="flex-1 text-sm font-medium text-ink-800 dark:text-ink-100">{a.label}</span>
                    <span className="text-lg font-extrabold tabular-nums text-ink-900 dark:text-white">{num(a.count)}</span>
                    <Icon name="chevron-right" size={16} className="text-ink-300" />
                  </Link>
                </li>
              ))}
            </ul>
          ) : <Empty icon="party-popper" title={t('All clear', 'সব ঠিক আছে')}>{t('Nothing is waiting on you.', 'আপনার জন্য কিছু অপেক্ষায় নেই।')}</Empty>}
        </Card>
      </div>

      {can('bookings.view') ? (
        <div className="mt-5 grid gap-5 xl:grid-cols-3">
          <Card title={t('Latest bookings', 'সাম্প্রতিক বুকিং')} pad={false} className="xl:col-span-2" actions={<Link href={url('/bookings')} className="text-sm font-semibold text-brand-700 hover:underline dark:text-brand-300">{t('View all', 'সব দেখুন')}</Link>}>
            {recent.length ? (
              <div className="overflow-x-auto">
                <table className="table">
                  <thead><tr><th>{t('Booking', 'বুকিং')}</th><th className="hidden sm:table-cell">{t('Customer', 'গ্রাহক')}</th><th className="text-right">{t('Total', 'মোট')}</th><th>{t('Status', 'অবস্থা')}</th></tr></thead>
                  <tbody>
                    {recent.map((b) => (
                      <tr key={b.id}>
                        <td><Link href={b.href} className="font-semibold text-ink-900 hover:text-brand-700 dark:text-white">{b.ref}</Link><p className="max-w-[16rem] truncate text-xs muted">{b.title} · {ago(b.created_at)}</p></td>
                        <td className="hidden sm:table-cell">{b.customer ?? '—'}</td>
                        <td className="whitespace-nowrap text-right tabular-nums">{money(b.total)}</td>
                        <td><Badge color={b.status_color}>{b.status_label}</Badge></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : <Empty icon="briefcase" title={t('No bookings yet', 'এখনও কোনো বুকিং নেই')} />}
          </Card>
          <Card title={t('Sales mix · 90 days', 'বিক্রির ধরন · ৯০ দিন')}>
            {mix.length ? (
              <>
                <ChartBox config={mixCfg} height={180} label={t('Bookings by product', 'পণ্য অনুযায়ী বুকিং')} />
                <ul className="mt-4 space-y-2 text-sm">
                  {mix.map((m, i) => (
                    <li key={m.kind} className="flex items-center gap-2">
                      <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ background: PALETTE[i % PALETTE.length] }} />
                      <span className="flex-1">{m.label}</span><span className="tabular-nums muted">{num(m.count)}</span>
                      {m.total !== null ? <span className="w-28 text-right font-semibold tabular-nums">{money(m.total)}</span> : null}
                    </li>
                  ))}
                </ul>
              </>
            ) : <Empty icon="chart-pie" title={t('No sales yet', 'এখনও বিক্রি নেই')} />}
          </Card>
        </div>
      ) : null}

      {revalidate ? (
        <p className="mt-5 flex items-center gap-2 text-xs muted" data-revalidate-status>
          <span className={cx('h-2 w-2 rounded-full', revalidate.ok ? 'bg-emerald-500' : 'bg-rose-500')} />
          {revalidate.ok ? t('Website cache refreshed', 'ওয়েবসাইট ক্যাশ হালনাগাদ হয়েছে') : t('Website refresh failed', 'ওয়েবসাইট হালনাগাদ ব্যর্থ')} · {ago(revalidate.at)}{revalidate.error ? ` · ${revalidate.error}` : ''}
        </p>
      ) : null}
    </>
  );
}
