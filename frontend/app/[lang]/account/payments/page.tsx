import { ApiButton, PayDue } from '@/components/account/client';
import { accountCtx, accountMetadata, AccountHead, gatewayOptions, payLabels } from '@/components/account/page';
import { Empty, Progress, Status } from '@/components/account/ui';
import { Icon } from '@/components/icons/Icon';
import { me } from '@/lib/account';

export const generateMetadata = accountMetadata('payments');

const BRAND: Record<string, [string, string]> = { bkash: ['bg-[#C8155E]', 'bKash'], nagad: ['bg-[#C4161C]', 'Nagad'], visa: ['bg-[#1A1F71]', 'VISA'], mastercard: ['bg-[#EB001B]', 'MC'], amex: ['bg-[#2E77BC]', 'AMEX'] };

export default async function Payments({ params }: PageProps<'/[lang]/account/payments'>) {
  const { lang, i } = await accountCtx(params);
  const { t, d, bdt, date } = i;
  const x = await me<any>('payments', lang, `/${lang}/account/payments`);
  const now = x.due[0];
  const days = now ? Math.ceil((new Date(`${now.due_date}T23:59:59+06:00`).getTime() - Date.now()) / 864e5) : 0;
  const instTxt = (z: any) => z.of > 1 ? (lang === 'bn' ? `কিস্তি ${d(z.seq)}/${d(z.of)}` : `Instalment ${z.seq} of ${z.of}`) : t('Balance', 'বাকি');
  return (
    <>
      <AccountHead i={i} k="payments" sub={t('Pay instalments, download receipts and manage saved methods.', 'কিস্তি পরিশোধ, রসিদ ডাউনলোড ও সংরক্ষিত মাধ্যম ম্যানেজ করুন।')} />
      <div className="grid gap-6 xl:grid-cols-[1fr_24rem]">
        <div className="min-w-0 space-y-6">
          {now ? (
            <section className="card p-4 sm:p-6" aria-labelledby="due-h" data-due={now.ref}>
              <div className="flex flex-wrap items-center justify-between gap-2"><h2 id="due-h" className="text-lg font-bold">{t('Due now', 'এখন পরিশোধযোগ্য')}</h2>
                <span className={`badge ${now.overdue || days <= 7 ? 'bg-rose-50 text-rose-800 dark:bg-rose-900/30 dark:text-rose-300' : 'bg-ink-100 text-ink-700 dark:bg-ink-800 dark:text-ink-200'}`}>
                  {now.overdue || days < 0 ? t('Overdue', 'মেয়াদোত্তীর্ণ') : days === 0 ? t('Due today', 'আজই শেষ দিন') : lang === 'bn' ? `${d(days)} দিনের মধ্যে` : `Due in ${days} day${days === 1 ? '' : 's'}`}
                </span></div>
              <div className="mt-4 rounded-2xl border border-ink-100 p-4 dark:border-ink-800">
                <p className="text-sm muted">{now.ref} · {instTxt(now)} · {t('due', 'শেষ তারিখ')} {date(now.due_date, 'short')}</p>
                <p className="font-semibold">{now.title}</p>
                <p className="mt-2 text-3xl font-extrabold">{bdt(now.amount)}</p>
                <Progress pct={now.total ? (now.paid / now.total) * 100 : 0} label={t('Paid so far', 'এ পর্যন্ত পরিশোধিত')} className="mt-3" />
                <p className="mt-1 text-xs muted">{bdt(now.paid)} {t('of', 'এর মধ্যে')} {bdt(now.total)} {t('paid', 'পরিশোধিত')}</p>
              </div>
              <PayDue booking={now.ref} instalmentId={now.id} amount={bdt(now.amount)} gateways={gatewayOptions(i, x.gateways)} labels={payLabels(i)}
                wallet={x.wallet_enabled ? { balance: x.wallet, enough: x.wallet >= now.amount, label: t('Wallet', 'ওয়ালেট'), sub: `${bdt(x.wallet)} ${t('available', 'ব্যবহারযোগ্য')}` } : null} />
              {x.due.length > 1 ? (
                <div className="mt-6 border-t border-ink-100 pt-4 dark:border-ink-800">
                  <h3 className="text-sm font-bold">{t('Also due', 'আরও বাকি')}</h3>
                  <ul className="mt-2 divide-y divide-ink-100 dark:divide-ink-800">
                    {x.due.slice(1).map((z: any) => (
                      <li key={`${z.ref}-${z.seq}`} className="flex flex-wrap items-center gap-3 py-3">
                        <div className="min-w-0 flex-1"><p className="truncate text-sm font-semibold">{z.title}</p><p className="text-xs muted">{z.ref} · {instTxt(z)} · {t('due', 'শেষ তারিখ')} {date(z.due_date, 'short')}</p></div>
                        <b>{bdt(z.amount)}</b>
                        <a href={i.u(`/account/bookings/${z.ref}#pay`)} className="btn btn-accent btn-sm">{t('Pay', 'পরিশোধ')}<span className="sr-only"> {z.ref}</span></a>
                      </li>
                    ))}
                  </ul>
                </div>
              ) : null}
            </section>
          ) : <Empty icon="circle-check" title={t('Nothing due right now', 'এখন কিছু বাকি নেই')} sub={t('You are all paid up. Upcoming instalments show here when they fall due.', 'সব পরিশোধিত। আসন্ন কিস্তি সময় হলে এখানে দেখা যাবে।')} />}

          <section className="card overflow-hidden" aria-labelledby="hist-h">
            <h2 id="hist-h" className="p-4 text-lg font-bold sm:p-6 sm:pb-2">{t('Payment history', 'পেমেন্টের ইতিহাস')}</h2>
            {x.history.length ? (
              <ul className="divide-y divide-ink-100 px-4 pb-2 dark:divide-ink-800 sm:px-6">
                {x.history.map((p: any) => (
                  <li key={p.id} className="flex flex-wrap items-center gap-3 py-3" data-payment={p.status}>
                    <div className="min-w-0 flex-1"><p className="truncate text-sm font-semibold">{p.title}</p><p className="text-xs muted">{date(p.date)} · {p.ref} · {p.method}</p></div>
                    <div className="flex items-center gap-3">
                      <Status t={t} s={p.status === 'initiated' ? 'pending' : p.status} />
                      <p className="w-28 text-right font-bold">{p.status === 'refunded' ? '−' : ''}{bdt(p.amount)}</p>
                      {p.status === 'success' || p.status === 'refunded' ? (
                        <a href={`/api/bookings/${p.ref}/invoice`} target="_blank" rel="noopener" className="icon-btn h-8 w-8" aria-label={`${t('Receipt', 'রসিদ')} ${p.ref}`}><Icon name="receipt" className="h-4 w-4" /></a>
                      ) : <span className="h-8 w-8" aria-hidden="true" />}
                    </div>
                  </li>
                ))}
              </ul>
            ) : <p className="px-4 pb-6 text-sm muted sm:px-6">{t('No payments yet.', 'এখনও কোনো পেমেন্ট নেই।')}</p>}
          </section>
        </div>
        <aside className="space-y-6">
          <section className="card p-4 sm:p-5" aria-labelledby="sm-h">
            <h2 id="sm-h" className="font-bold">{t('Saved methods', 'সংরক্ষিত মাধ্যম')}</h2>
            {x.methods.length ? (
              <ul className="mt-3 space-y-2">
                {x.methods.map((m: any) => {
                  const [bg, tag] = BRAND[m.gateway] ?? ['bg-ink-700', m.gateway.toUpperCase().slice(0, 4)];
                  return (
                    <li key={m.id} className="flex items-center gap-3 rounded-2xl border border-ink-100 p-3 dark:border-ink-800" data-method={m.id}>
                      <span className={`grid h-9 w-12 place-items-center rounded-lg text-[11px] font-extrabold text-white ${bg}`}>{tag}</span>
                      <div className="min-w-0 flex-1"><p className="truncate text-sm font-semibold">{m.label}</p><p className="text-xs muted">{m.masked}{m.is_default ? ` · ${t('Default', 'ডিফল্ট')}` : ''}</p></div>
                      <ApiButton method="DELETE" path={`payment-methods/${m.id}`} className="icon-btn h-8 w-8" label={`${t('Remove', 'সরান')} ${m.label}`}
                        confirm={t('Remove this saved payment method?', 'এই সংরক্ষিত পেমেন্ট মাধ্যম সরাবেন?')} success={t('Payment method removed', 'পেমেন্ট মাধ্যম সরানো হয়েছে')}><Icon name="trash-2" className="h-4 w-4" /></ApiButton>
                    </li>
                  );
                })}
              </ul>
            ) : <p className="mt-3 text-sm muted">{t('Methods you save while paying appear here.', 'পেমেন্টের সময় সংরক্ষণ করা মাধ্যম এখানে দেখা যাবে।')}</p>}
            <p className="mt-3 text-xs muted"><Icon name="shield-check" className="mr-1 inline h-3.5 w-3.5" />{t('Cards are tokenised by the gateway; Musafir never stores card numbers.', 'কার্ড গেটওয়েতে টোকেনাইজড; মুসাফির কখনো কার্ড নম্বর সংরক্ষণ করে না।')}</p>
          </section>
          <section className="card p-4 sm:p-5" aria-labelledby="up-h">
            <h2 id="up-h" className="font-bold">{t('Upcoming instalments', 'আসন্ন কিস্তি')}</h2>
            {x.upcoming.length ? (
              <ul className="mt-3 space-y-2 text-sm">
                {x.upcoming.map((z: any) => <li key={`${z.ref}-${z.seq}`} className="flex justify-between gap-2"><span>{date(z.due_date)} · <span className="muted">{z.ref}</span></span><b>{bdt(z.amount)}</b></li>)}
              </ul>
            ) : <p className="mt-3 text-sm muted">{t('No more instalments scheduled.', 'আর কোনো কিস্তি নির্ধারিত নেই।')}</p>}
            <p className="mt-4 flex gap-2 text-xs muted"><Icon name="bell" className="h-4 w-4 shrink-0" />{t('We remind you by SMS and WhatsApp 3 days before each due date.', 'প্রতিটি কিস্তির ৩ দিন আগে এসএমএস ও হোয়াটসঅ্যাপে মনে করিয়ে দিই।')}</p>
          </section>
        </aside>
      </div>
    </>
  );
}
