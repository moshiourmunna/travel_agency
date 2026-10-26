import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { ApiForm, Modal, PayDue } from '@/components/account/client';
import { accountCtx, gatewayOptions, payLabels } from '@/components/account/page';
import { AccountCrumbs } from '@/components/account/Shell';
import { Progress, Status } from '@/components/account/ui';
import { Tabs } from '@/components/client/Tabs';
import { PrintButton } from '@/components/detail/Actions';
import { Icon } from '@/components/icons/Icon';
import { Avatar } from '@/components/ui/basics';
import { Picture } from '@/components/ui/Picture';
import { me } from '@/lib/account';
import type { Lang } from '@/lib/format';
import { getI18n } from '@/lib/i18n';
import { pathMetadata } from '@/lib/page';
import { getSite } from '@/lib/site';

const REF = /^[A-Z]{3}-\d{2}-\d{5}$/;

export async function generateMetadata({ params }: PageProps<'/[lang]/account/bookings/[ref]'>): Promise<Metadata> {
  const { lang, ref } = await params;
  const i = await getI18n(lang as Lang);
  return pathMetadata(lang as Lang, `/account/bookings/${ref}`, `${i.t('Booking', 'বুকিং')} ${ref}`, { noindex: true });
}

export default async function BookingDetail({ params }: PageProps<'/[lang]/account/bookings/[ref]'>) {
  const { ref } = await params;
  if (!REF.test(ref)) notFound();
  const { lang, i } = await accountCtx(params);
  const { t, u, d, num, bdt, date } = i;
  const [b, site] = await Promise.all([me<any>(`bookings/${ref}`, lang, `/${lang}/account/bookings/${ref}`), getSite(lang)]);
  const wa = site.settings.company?.whatsapp_number;
  const pct = b.total > 0 ? Math.round((b.paid / b.total) * 100) : 0;
  const due = b.next_due && b.balance > 0 ? b.next_due : null;
  const payAmount = due ? Math.min(due.amount, b.balance) : b.balance;
  const payable = b.balance > 0 && ['pending', 'partial', 'confirmed'].includes(b.status);
  const paid = b.payments.filter((p: any) => p.status === 'success');
  const tabs = [
    b.itinerary.length ? { id: 'tb-itin', label: t('Itinerary', 'ভ্রমণসূচি') } : null,
    { id: 'tb-trav', label: t('Travellers', 'ভ্রমণকারী') },
    { id: 'tb-pay', label: t('Payments', 'পেমেন্ট') },
    { id: 'tb-docs', label: t('Documents', 'ডকুমেন্ট') },
    { id: 'tb-act', label: t('Activity', 'কার্যক্রম') },
  ].filter(Boolean) as { id: string; label: string }[];
  const fx = 'mr-1 inline h-4 w-4 text-brand-700 dark:text-brand-300';
  const pax = [b.pax?.adults ? `${d(b.pax.adults)} ${b.pax.adults === 1 ? t('adult', 'প্রাপ্তবয়স্ক') : t('adults', 'প্রাপ্তবয়স্ক')}` : null,
    b.pax?.children ? `${d(b.pax.children)} ${b.pax.children === 1 ? t('child', 'শিশু') : t('children', 'শিশু')}` : null,
    b.pax?.infants ? `${d(b.pax.infants)} ${b.pax.infants === 1 ? t('infant', 'ইনফ্যান্ট') : t('infants', 'ইনফ্যান্ট')}` : null].filter(Boolean).join(', ') || `${d(b.pax_count)} ${t('travellers', 'জন')}`;
  const tone: Record<string, string> = { emerald: 'bg-emerald-500', amber: 'bg-amber-500', rose: 'bg-rose-500' };
  const win = (w: any) => w.until && !w.from ? (lang === 'bn' ? `${date(w.until, 'short')} পর্যন্ত` : `Until ${date(w.until, 'short')}`)
    : w.until ? `${date(w.from, 'short')} – ${date(w.until, 'short')}` : (lang === 'bn' ? `${date(w.after, 'short')}-এর পর` : `After ${date(w.after, 'short')}`);
  const refundTxt = (w: any) => w.pct >= 100 ? (b.policy.fee ? (lang === 'bn' ? `${bdt(b.policy.fee)} ফি বাদে পূর্ণ রিফান্ড` : `Full refund minus ${bdt(b.policy.fee)} fee`) : t('Full refund', 'পূর্ণ রিফান্ড'))
    : w.pct > 0 ? `${d(w.pct)}% ${t('refund', 'রিফান্ড')}` : t('Non-refundable', 'অফেরতযোগ্য');
  const docIcon: Record<string, string> = { voucher: 'file-text', invoice: 'receipt' };
  const docName: Record<string, string> = { voucher: t('E-voucher', 'ই-ভাউচার'), invoice: `${t('Invoice', 'ইনভয়েস')}${b.invoice_no ? ` ${b.invoice_no}` : ''}` };
  const close = t('Close', 'বন্ধ করুন');

  return (
    <>
      <AccountCrumbs i={i} items={[[t('My account', 'মাই অ্যাকাউন্ট'), '/account'], [t('My bookings', 'আমার বুকিং'), '/account/bookings'], [`${t('Booking', 'বুকিং')} ${b.ref}`, `/account/bookings/${b.ref}`]]} />
      <div className="card overflow-hidden" data-booking-detail={b.ref}>
        <div className="relative h-40 sm:h-56">
          <Picture img={b.image} className="h-full w-full object-cover" sizes="(min-width: 1024px) 70vw, 100vw" priority width={1600} height={1000} />
          <div className="absolute inset-0 bg-gradient-to-t from-ink-950/85 to-transparent" />
          <div className="absolute inset-x-0 bottom-0 p-4 text-white sm:p-6">
            <div className="flex flex-wrap items-center gap-2"><Status t={t} s={b.status} /><span className="rounded-full bg-white/15 px-2.5 py-0.5 text-xs font-semibold">{b.ref}</span></div>
            <h1 className="mt-2 text-2xl font-extrabold sm:text-3xl">{b.title}</h1>
          </div>
        </div>
        <div className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between sm:p-6">
          <ul className="flex flex-wrap gap-x-6 gap-y-2 text-sm">
            <li><Icon name="calendar" className={fx} />{date(b.travel_start)}{b.travel_end && b.travel_end !== b.travel_start ? ` – ${date(b.travel_end)}` : ''}</li>
            {b.nights ? <li><Icon name="moon" className={fx} />{d(b.nights)} {b.nights === 1 ? t('night', 'রাত') : t('nights', 'রাত')}</li> : null}
            <li><Icon name="users" className={fx} />{pax}</li>
            {b.subtitle ? <li><Icon name="building-2" className={fx} />{b.subtitle}</li> : null}
          </ul>
          <div className="flex flex-wrap gap-2 print:hidden">
            {b.kind === 'flight' && b.payment_status !== 'unpaid' ? <a href={u(`/account/bookings/${b.ref}/ticket`)} className="btn btn-primary btn-sm"><Icon name="ticket" className="h-4 w-4" /> {t('E-ticket', 'ই-টিকিট')}</a> : null}
            {b.paid > 0 ? <a href={`/api/bookings/${b.ref}/voucher`} target="_blank" rel="noopener" className="btn btn-outline btn-sm"><Icon name="printer" className="h-4 w-4" /> {t('Print voucher', 'ভাউচার প্রিন্ট')}</a>
              : <PrintButton label={t('Print', 'প্রিন্ট')} className="btn btn-outline btn-sm"><Icon name="printer" className="h-4 w-4" /> {t('Print', 'প্রিন্ট')}</PrintButton>}
            {b.can_cancel ? (
              <Modal id="change-dialog" triggerClass="btn btn-outline btn-sm" trigger={<><Icon name="pencil" className="h-4 w-4" /> {t('Request change', 'পরিবর্তনের অনুরোধ')}</>} title={t('Request a change', 'পরিবর্তনের অনুরোধ')} closeLabel={close}>
                <ApiForm path={`bookings/${b.ref}/request`} extra={{ type: 'change' }} reset success={b.agent ? (lang === 'bn' ? `${b.agent.name}-এর কাছে অনুরোধ পাঠানো হয়েছে` : `Change request sent to ${b.agent.name}`) : t('Change request sent', 'পরিবর্তনের অনুরোধ পাঠানো হয়েছে')}>
                  <p className="mt-2 text-sm muted">{t('Tell us what you would like to change — dates, rooms, travellers or extras. Your travel expert replies in your support inbox.', 'কী পরিবর্তন চান লিখুন — তারিখ, রুম, ভ্রমণকারী বা অতিরিক্ত সেবা। আপনার ট্রাভেল এক্সপার্ট সাপোর্ট ইনবক্সে উত্তর দেবেন।')}</p>
                  <div className="field mt-4"><label className="label" htmlFor="ch-m">{t('What should change?', 'কী পরিবর্তন করতে চান?')}</label><textarea id="ch-m" name="message" className="input min-h-[7rem]" required minLength={5} maxLength={2000} /></div>
                  <div className="mt-6 flex justify-end"><button className="btn btn-primary">{t('Send request', 'অনুরোধ পাঠান')}</button></div>
                </ApiForm>
              </Modal>
            ) : null}
            {b.can_cancel ? (
              <Modal id="cancel-dialog" triggerClass="btn btn-outline btn-sm text-rose-700 dark:text-rose-300" trigger={<><Icon name="circle-x" className="h-4 w-4" /> {t('Cancel booking', 'বুকিং বাতিল')}</>} title={t('Cancel this booking?', 'এই বুকিং বাতিল করবেন?')} closeLabel={close}>
                <ApiForm path={`bookings/${b.ref}/request`} extra={{ type: 'cancel' }} success={t('Cancellation requested — our team will confirm the refund.', 'বাতিলের অনুরোধ পাঠানো হয়েছে — আমাদের টিম রিফান্ড নিশ্চিত করবে।')}>
                  {b.policy ? (
                    <>
                      <p className="mt-2 text-sm muted">{b.policy.refund_pct >= 100 ? t('You are inside the free window. Estimated refund:', 'আপনি ফ্রি সময়ের মধ্যে আছেন। আনুমানিক রিফান্ড:') : b.policy.refund_pct > 0 ? t('A partial refund applies now. Estimated refund:', 'এখন আংশিক রিফান্ড প্রযোজ্য। আনুমানিক রিফান্ড:') : t('This booking is now non-refundable. Estimated refund:', 'এই বুকিং এখন অফেরতযোগ্য। আনুমানিক রিফান্ড:')}</p>
                      <p className={`mt-1 text-3xl font-extrabold ${b.policy.refund_estimate > 0 ? 'text-emerald-700 dark:text-emerald-400' : 'text-rose-700 dark:text-rose-300'}`} data-refund-estimate>{bdt(b.policy.refund_estimate)}</p>
                    </>
                  ) : <p className="mt-2 text-sm muted">{t('Our team will confirm any refund under the booking terms.', 'বুকিংয়ের শর্ত অনুযায়ী আমাদের টিম রিফান্ড নিশ্চিত করবে।')}</p>}
                  <div className="field mt-4"><label className="label" htmlFor="cx-r">{t('Reason', 'কারণ')}</label>
                    <select id="cx-r" name="message" className="input" defaultValue="Change of plans">
                      {[['Change of plans', 'পরিকল্পনা পরিবর্তন'], ['Visa issue', 'ভিসা সমস্যা'], ['Health reasons', 'স্বাস্থ্যগত কারণ'], ['Found a better price', 'কম দামে পেয়েছি'], ['Other reason', 'অন্য কারণ']].map(([en, bn]) => <option key={en} value={en}>{t(en, bn)}</option>)}
                    </select></div>
                  {b.paid > 0 ? (
                    <fieldset className="mt-4"><legend className="label">{t('Refund to', 'রিফান্ড যাবে')}</legend>
                      <div className="grid grid-cols-2 gap-2 text-sm">
                        <label className="flex items-center gap-2 rounded-xl border border-ink-200 p-3 dark:border-ink-700"><input type="radio" name="refund_to" value="wallet" className="check" defaultChecked /> {t('Musafir wallet (instant)', 'মুসাফির ওয়ালেট (তাৎক্ষণিক)')}</label>
                        <label className="flex items-center gap-2 rounded-xl border border-ink-200 p-3 dark:border-ink-700"><input type="radio" name="refund_to" value="original" className="check" /> {paid[0]?.method ?? t('Original method', 'মূল মাধ্যম')} ({lang === 'bn' ? '৩–৫ দিন' : '3–5 days'})</label>
                      </div></fieldset>
                  ) : null}
                  <div className="mt-6 flex justify-end gap-2"><button type="submit" className="btn bg-rose-700 text-white hover:bg-rose-800">{t('Confirm cancellation', 'বাতিল নিশ্চিত করুন')}</button></div>
                </ApiForm>
              </Modal>
            ) : null}
          </div>
        </div>
      </div>

      {b.open_requests?.length ? (
        <div className="mt-4 rounded-2xl border border-sky-200 bg-sky-50 p-4 text-sm text-sky-900 dark:border-sky-900 dark:bg-sky-950/40 dark:text-sky-100" role="status">
          <Icon name="info" className="mr-1 inline h-4 w-4" /> {t('Open requests:', 'চলমান অনুরোধ:')} {b.open_requests.map((r: any, k: number) => <span key={r.ref}>{k ? ', ' : ''}<a href={u(`/account/support?t=${r.ref}`)} className="font-semibold underline">{r.ref}</a> — {r.subject}</span>)}
        </div>
      ) : null}

      <div className="mt-6 grid gap-6 xl:grid-cols-[1fr_22rem]">
        <div className="min-w-0">
          <Tabs label={t('Booking sections', 'বুকিংয়ের অংশ')} tabs={tabs} listClass="flex max-w-full gap-1 overflow-x-auto rounded-xl bg-ink-100 p-1 dark:bg-ink-850 sm:inline-flex" tabClass="tab-pill shrink-0">
            {[
              b.itinerary.length ? (
                <section key="itin" id="tb-itin" role="tabpanel" aria-labelledby="tb-itin-tab" className="card mt-4 p-4 sm:p-6">
                  <ol className="relative space-y-6 border-l-2 border-dashed border-brand-200 pl-6 dark:border-brand-800">
                    {b.itinerary.map((x: any) => (
                      <li key={x.day} className="relative">
                        <span className="absolute -left-[35px] grid h-7 w-7 place-items-center rounded-full bg-brand-700 text-xs font-bold text-white">{d(x.day)}</span>
                        <p className="text-xs font-semibold uppercase tracking-wide text-brand-700 dark:text-brand-300">{date(x.date, 'short')}</p>
                        <h3 className="font-bold">{x.title}</h3>{x.body ? <p className="mt-1 text-sm muted">{x.body}</p> : null}
                      </li>
                    ))}
                  </ol>
                </section>
              ) : null,
              <section key="trav" id="tb-trav" role="tabpanel" aria-labelledby="tb-trav-tab" className="card mt-4 p-4 sm:p-6">
                <ul className="divide-y divide-ink-100 dark:divide-ink-800">
                  {b.travellers.map((p: any, k: number) => (
                    <li key={k} className="flex flex-wrap items-center gap-3 py-3">
                      <Avatar initials={p.name.split(' ').map((w: string) => w[0]).slice(0, 2).join('')} />
                      <div className="min-w-0 flex-1"><p className="font-semibold">{p.name}</p>
                        <p className="text-xs muted">{p.type === 'child' ? t('Child', 'শিশু') : p.type === 'infant' ? t('Infant', 'ইনফ্যান্ট') : t('Adult', 'প্রাপ্তবয়স্ক')}{p.ticket_no ? ` · ${t('Ticket', 'টিকিট')} ${p.ticket_no}` : ''}{p.seat ? ` · ${t('Seat', 'সিট')} ${p.seat}` : ''}</p></div>
                      <span className="badge badge-brand"><Icon name="check" className="h-3.5 w-3.5" /> {t('Details complete', 'তথ্য সম্পূর্ণ')}</span>
                    </li>
                  ))}
                </ul>
                <a href={u('/account/travellers')} className="btn btn-outline btn-sm mt-3">{t('Edit travellers', 'ভ্রমণকারী এডিট')}</a>
              </section>,
              <section key="pay" id="tb-pay" role="tabpanel" aria-labelledby="tb-pay-tab" className="card mt-4 p-4 sm:p-6">
                <div className="flex items-center justify-between text-sm"><p>{t('Paid', 'পরিশোধিত')} <b>{bdt(b.paid)}</b> {t('of', 'এর মধ্যে')} {bdt(b.total)}</p><p className="font-semibold">{d(pct)}%</p></div>
                <Progress pct={pct} label={t('Paid so far', 'এ পর্যন্ত পরিশোধিত')} className="mt-2" />
                {b.instalments.length ? (
                  <ol className="mt-5 space-y-3">
                    {b.instalments.map((x: any) => {
                      const p = x.status === 'paid' ? paid.find((y: any) => Math.abs(y.amount - x.amount) < 1) : null;
                      return (
                        <li key={x.id} className="flex flex-wrap items-center gap-3 rounded-2xl border border-ink-100 p-3 dark:border-ink-800" data-instalment={x.seq} data-status={x.status}>
                          <span className={`grid h-9 w-9 place-items-center rounded-xl ${x.status === 'paid' ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300' : x.status === 'due' || x.status === 'overdue' ? 'bg-accent-100 text-accent-800 dark:bg-accent-400/15 dark:text-accent-200' : 'bg-ink-100 text-ink-600 dark:bg-ink-800 dark:text-ink-300'}`}>{d(x.seq)}</span>
                          <div className="flex-1"><p className="font-semibold">{bdt(x.amount)}</p><p className="text-xs muted">{t('Due', 'নির্ধারিত')} {date(x.due_date)}{p ? ` · ${t('paid via', 'পরিশোধ')} ${p.method}` : ''}</p></div>
                          {x.status === 'paid' ? <Status t={t} s="success" /> : x.status === 'due' || x.status === 'overdue' ? <a href="#pay" className="btn btn-accent btn-sm">{t('Pay now', 'এখন পরিশোধ')}</a> : <span className="text-xs muted">{t('Upcoming', 'আসন্ন')}</span>}
                        </li>
                      );
                    })}
                  </ol>
                ) : null}
                {b.payments.length ? (
                  <>
                    <h3 className="mt-6 text-sm font-bold">{t('Transactions', 'লেনদেন')}</h3>
                    <ul className="mt-2 divide-y divide-ink-100 text-sm dark:divide-ink-800">
                      {b.payments.map((p: any) => <li key={p.id} className="flex flex-wrap items-center justify-between gap-2 py-2"><span>{p.method} · <span className="muted">{date((p.paid_at ?? p.created_at)?.slice(0, 10), 'short')}{p.txn ? ` · ${p.txn}` : ''}</span></span><span className="flex items-center gap-2"><b>{bdt(p.amount)}</b><Status t={t} s={p.status === 'initiated' ? 'pending' : p.status} /></span></li>)}
                    </ul>
                  </>
                ) : null}
              </section>,
              <section key="docs" id="tb-docs" role="tabpanel" aria-labelledby="tb-docs-tab" className="card mt-4 p-4 sm:p-6">
                <ul className="grid gap-3 sm:grid-cols-2">
                  {b.documents.filter((x: any) => x.kind !== 'voucher' || b.paid > 0).map((x: any) => (
                    <li key={x.kind} className="flex items-center gap-3 rounded-2xl border border-ink-100 p-3 dark:border-ink-800">
                      <span className="grid h-10 w-10 place-items-center rounded-xl bg-brand-50 text-brand-700 dark:bg-brand-900/40 dark:text-brand-300"><Icon name={docIcon[x.kind] ?? 'file-text'} className="h-5 w-5" /></span>
                      <div className="min-w-0 flex-1"><p className="truncate text-sm font-semibold">{docName[x.kind] ?? x.title}</p><p className="text-xs muted">PDF</p></div>
                      <a href={`/api/bookings/${b.ref}/${x.kind}`} target="_blank" rel="noopener" className="icon-btn" aria-label={`${t('Download', 'ডাউনলোড')} ${docName[x.kind] ?? x.title}`} data-doc={x.kind}><Icon name="download" className="h-4 w-4" /></a>
                    </li>
                  ))}
                  {b.kind === 'flight' && b.payment_status !== 'unpaid' ? (
                    <li className="flex items-center gap-3 rounded-2xl border border-ink-100 p-3 dark:border-ink-800">
                      <span className="grid h-10 w-10 place-items-center rounded-xl bg-brand-50 text-brand-700 dark:bg-brand-900/40 dark:text-brand-300"><Icon name="plane" className="h-5 w-5" /></span>
                      <div className="min-w-0 flex-1"><p className="truncate text-sm font-semibold">{t('Flight e-ticket', 'ফ্লাইট ই-টিকিট')}</p><p className="text-xs muted">{b.pnr ? `PNR ${b.pnr}` : ''}</p></div>
                      <a href={u(`/account/bookings/${b.ref}/ticket`)} className="icon-btn" aria-label={t('Open e-ticket', 'ই-টিকিট খুলুন')}><Icon name="chevron-right" className="h-4 w-4" /></a>
                    </li>
                  ) : null}
                </ul>
              </section>,
              <section key="act" id="tb-act" role="tabpanel" aria-labelledby="tb-act-tab" className="card mt-4 p-4 sm:p-6">
                <ol className="relative space-y-4 border-l border-ink-100 pl-5 dark:border-ink-800">
                  {b.activity.map((a: any, k: number) => (
                    <li key={k} className="relative"><span className="absolute -left-[25px] top-1.5 h-2.5 w-2.5 rounded-full bg-brand-600 ring-4 ring-white dark:ring-ink-900" /><p className="text-sm font-semibold">{a.text}</p><p className="text-xs muted">{date(a.at?.slice(0, 10))}</p></li>
                  ))}
                </ol>
              </section>,
            ].filter(Boolean) as React.ReactNode[]}
          </Tabs>
        </div>

        <aside className="space-y-6">
          <section className="card p-4 sm:p-5" aria-labelledby="sum-h" id="pay">
            <h2 id="sum-h" className="font-bold">{t('Price summary', 'মূল্যের সারাংশ')}</h2>
            <dl className="mt-3 space-y-2 text-sm">
              {b.items.map((x: any, k: number) => <div key={k} className="flex justify-between gap-3"><dt className="muted">{x.label}{x.qty > 1 ? ` × ${d(x.qty)}` : ''}</dt><dd>{x.total < 0 ? '−' : ''}{bdt(Math.abs(x.total))}</dd></div>)}
              {b.discount > 0 ? <div className="flex justify-between gap-3 text-emerald-700 dark:text-emerald-400"><dt>{t('Discount', 'ছাড়')}</dt><dd>−{bdt(b.discount)}</dd></div> : null}
              <div className="flex justify-between gap-3 border-t border-ink-100 pt-2 text-base font-bold dark:border-ink-800"><dt>{t('Total', 'মোট')}</dt><dd>{bdt(b.total)}</dd></div>
              <div className="flex justify-between gap-3"><dt className="muted">{t('Paid', 'পরিশোধিত')}</dt><dd>{bdt(b.paid)}</dd></div>
              {b.balance > 0 ? <div className="flex justify-between gap-3 font-semibold text-rose-700 dark:text-rose-300"><dt>{t('Balance', 'বাকি')}</dt><dd>{bdt(b.balance)}</dd></div> : null}
            </dl>
            {payable ? (
              <>
                <p className="mt-4 rounded-xl bg-accent-50 p-3 text-sm text-accent-900 dark:bg-accent-400/10 dark:text-accent-100">
                  {due ? (lang === 'bn' ? `কিস্তি ${d(due.seq)} — ${bdt(payAmount)} · শেষ তারিখ ${date(due.due_date, 'short')}` : `Instalment ${due.seq} — ${bdt(payAmount)} · due ${date(due.due_date, 'short')}`) : `${t('Amount due', 'পরিশোধযোগ্য')} — ${bdt(payAmount)}`}
                </p>
                <PayDue booking={b.ref} instalmentId={due?.id ?? null} amount={bdt(payAmount)} gateways={gatewayOptions(i, b.gateways)} labels={payLabels(i)}
                  wallet={b.wallet?.enabled ? { balance: b.wallet.balance, enough: b.wallet.balance >= payAmount, label: t('Musafir wallet', 'মুসাফির ওয়ালেট'), sub: `${t('Balance', 'ব্যালান্স')} ${bdt(b.wallet.balance)}` } : null}
                  bankInfo={b.bank ? (
                    <dl className="mt-3 grid grid-cols-[auto_1fr] gap-x-3 gap-y-1 rounded-xl bg-ink-50 p-3 text-xs dark:bg-ink-850">
                      <dt className="muted">{t('Bank', 'ব্যাংক')}</dt><dd className="font-semibold">{b.bank.bank}</dd>
                      <dt className="muted">{t('Account name', 'অ্যাকাউন্টের নাম')}</dt><dd className="font-semibold">{b.bank.account_name}</dd>
                      <dt className="muted">{t('Account no.', 'অ্যাকাউন্ট নং')}</dt><dd className="font-semibold tabular-nums">{b.bank.account_no}</dd>
                      <dt className="muted">{t('Routing', 'রাউটিং')}</dt><dd className="font-semibold tabular-nums">{b.bank.routing}</dd>
                      <dt className="muted">{t('Reference', 'রেফারেন্স')}</dt><dd className="font-semibold">{b.ref}</dd>
                    </dl>
                  ) : null} />
              </>
            ) : null}
            {b.miles_earn && !['cancelled', 'refunded'].includes(b.status) ? <p className="mt-2 text-center text-xs muted">{t('Earns', 'পাবেন')} {num(b.miles_earn)} {t('Miles', 'মাইলস')}</p> : null}
          </section>
          {b.agent ? (
            <section className="card p-4 sm:p-5" aria-labelledby="agent-h">
              <h2 id="agent-h" className="font-bold">{t('Your travel expert', 'আপনার ট্রাভেল এক্সপার্ট')}</h2>
              <div className="mt-3 flex items-center gap-3"><Avatar initials={b.agent.initials} className="h-12 w-12 text-sm" gradient="from-accent-400 to-accent-700" />
                <div><p className="font-semibold">{b.agent.name}</p><p className="text-xs muted">{t('Replies in ~5 min, 9 AM – 10 PM', 'সাধারণত ~৫ মিনিটে উত্তর, সকাল ৯টা – রাত ১০টা')}</p></div></div>
              <div className="mt-4 grid grid-cols-2 gap-2">
                {wa ? <a href={`https://wa.me/${wa}?text=${encodeURIComponent(`${b.ref} — `)}`} target="_blank" rel="noopener" className="btn btn-outline btn-sm"><Icon name="whatsapp" className="h-4 w-4 text-[#1FAF38]" /> WhatsApp</a> : null}
                <a href={u('/account/support')} className="btn btn-outline btn-sm"><Icon name="message-circle" className="h-4 w-4" /> {t('Chat', 'চ্যাট')}</a>
              </div>
            </section>
          ) : null}
          {b.policy ? (
            <section className="card p-4 sm:p-5" aria-labelledby="pol-h" data-policy={b.policy.code}>
              <h2 id="pol-h" className="font-bold">{t('Cancellation policy', 'বাতিলের নীতি')}</h2>
              <p className="text-xs muted">{b.policy.name}</p>
              <ul className="mt-3 space-y-2 text-sm">
                {b.policy.windows.map((w: any, k: number) => <li key={k} className="flex gap-2"><span className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${tone[w.tone] ?? 'bg-ink-400'}`} /><span><b>{win(w)}</b> — {refundTxt(w)}</span></li>)}
              </ul>
            </section>
          ) : null}
        </aside>
      </div>
    </>
  );
}
