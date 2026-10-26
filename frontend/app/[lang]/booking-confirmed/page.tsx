import type { Metadata } from 'next';
import Link from 'next/link';
import { CopyButton, PrintButton } from '@/components/detail/Actions';
import { Icon } from '@/components/icons/Icon';
import { PlainHero } from '@/components/ui/basics';
import { apiFresh } from '@/lib/api';
import type { Lang } from '@/lib/format';
import { getI18n } from '@/lib/i18n';
import { pathMetadata } from '@/lib/page';
import { authHeaders } from '@/lib/session';
import { getSite } from '@/lib/site';

export const dynamic = 'force-dynamic';

export async function generateMetadata({ params }: PageProps<'/[lang]/booking-confirmed'>): Promise<Metadata> {
  const lang = (await params).lang as Lang;
  return pathMetadata(lang, '/booking-confirmed', lang === 'bn' ? 'বুকিং নিশ্চিত' : 'Booking confirmed', { noindex: true });
}

const one = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v) ?? '';

export default async function BookingConfirmed({ params, searchParams }: PageProps<'/[lang]/booking-confirmed'>) {
  const lang = (await params).lang as Lang;
  const sp = await searchParams;
  const ref = one(sp.ref), key = one(sp.key);
  const [i, site] = await Promise.all([getI18n(lang), getSite(lang)]);
  const t = i.t;
  const b: any = /^[A-Z]{3}-\d{2}-\d{5}$/.test(ref) ? await apiFresh<{ data: any }>(`bookings/${ref}`, lang, { key }, await authHeaders()).then((r) => r?.data ?? null).catch(() => null) : null;

  if (!b) {
    return (
      <>
        <PlainHero i={i} title={t('Booking not found', 'বুকিং পাওয়া যায়নি')} crumbs={[[t('Home', 'হোম'), i.u('/')], [t('Booking', 'বুকিং'), i.u('/booking-confirmed')]]} />
        <div className="wrap py-12"><div className="card mx-auto max-w-xl p-8 text-center">
          <p className="muted">{t('The link may be incomplete. Check the e-mail or SMS we sent you, or sign in to My Account.', 'লিংকটি অসম্পূর্ণ হতে পারে। আমাদের পাঠানো ইমেইল/এসএমএস দেখুন বা মাই অ্যাকাউন্টে সাইন ইন করুন।')}</p>
          <div className="mt-6 flex justify-center gap-3"><Link href={i.u('/account')} className="btn btn-primary">{t('My Account', 'মাই অ্যাকাউন্ট')}</Link><Link href={i.u('/contact')} className="btn btn-outline">{t('Contact us', 'যোগাযোগ')}</Link></div>
        </div></div>
      </>
    );
  }

  const company = site.settings.company ?? {};
  const iata = (company.licences ?? []).find((l: any) => l.name === 'IATA')?.number;
  const confirmed = ['confirmed', 'partial', 'completed'].includes(b.status);
  const awaitingBank = !confirmed && b.payments.some((p: any) => p.gateway === 'bank_transfer' && p.status === 'pending');
  const cancelled = b.status === 'cancelled';
  const paidVia = b.payments.find((p: any) => p.status === 'success' || p.status === 'paid');
  const nextDue = b.instalments.find((x: any) => x.status !== 'paid');
  const statusBadge: Record<string, [string, string]> = {
    paid: [t('PAID', 'পরিশোধিত'), 'bg-emerald-100 text-emerald-800 dark:bg-emerald-500/15 dark:text-emerald-300'],
    partial: [t('PARTIALLY PAID', 'আংশিক পরিশোধিত'), 'bg-amber-100 text-amber-800 dark:bg-amber-500/15 dark:text-amber-300'],
    unpaid: [t('UNPAID', 'অপরিশোধিত'), 'bg-rose-100 text-rose-800 dark:bg-rose-500/15 dark:text-rose-300'],
    refunded: [t('REFUNDED', 'রিফান্ড হয়েছে'), 'bg-ink-100 text-ink-700 dark:bg-ink-800 dark:text-ink-300'],
  };
  const [badge, badgeCls] = statusBadge[b.payment_status] ?? statusBadge.unpaid;
  const gwName: Record<string, string> = { bkash: 'bKash', nagad: t('Nagad', 'নগদ'), sslcommerz: t('Card', 'কার্ড'), bank_transfer: t('Bank transfer', 'ব্যাংক ট্রান্সফার'), mock: t('Test gateway', 'টেস্ট গেটওয়ে'), wallet: t('Wallet', 'ওয়ালেট') };
  const name = [b.contact.first_name, b.contact.last_name].filter(Boolean).join(' ');
  const doc = (d: string) => `/api/bookings/${b.ref}/${d}?key=${b.key}`;
  const hasDocs = b.documents.length > 0;
  const title = cancelled ? t('Booking expired', 'বুকিংয়ের মেয়াদ শেষ') : confirmed ? t('Booking confirmed!', 'বুকিং নিশ্চিত হয়েছে!') : awaitingBank ? t('Booking received', 'বুকিং পাওয়া গেছে') : t('Awaiting payment', 'পেমেন্টের অপেক্ষায়');
  const sub = cancelled ? t('The payment window passed and the seats were released.', 'পেমেন্টের সময় পেরিয়ে গেছে, সিট ছেড়ে দেওয়া হয়েছে।')
    : confirmed ? `${t('Thank you', 'ধন্যবাদ')}, ${b.contact.first_name}. ${t('Your e-voucher and invoice have been sent to your email and phone. Booking reference:', 'আপনার ই-ভাউচার ও ইনভয়েস ইমেইল ও ফোনে পাঠানো হয়েছে। বুকিং রেফারেন্স:')}`
    : awaitingBank ? t('We are verifying your bank transfer — usually within a few working hours. Your seats are held meanwhile. Booking reference:', 'আপনার ব্যাংক ট্রান্সফার যাচাই করা হচ্ছে — সাধারণত কয়েক কর্মঘণ্টার মধ্যে। ততক্ষণ সিট হোল্ড থাকবে। বুকিং রেফারেন্স:')
    : t('Your booking is saved but not paid yet. Booking reference:', 'আপনার বুকিং সংরক্ষিত, তবে এখনো পরিশোধ হয়নি। বুকিং রেফারেন্স:');
  const steps: [string, string, boolean][] = [
    [t('Confirmation sent', 'নিশ্চিতকরণ পাঠানো হয়েছে'), t('Check your inbox and SMS', 'ইনবক্স ও এসএমএস দেখুন'), confirmed],
    [t('Coordinator assigned', 'কো-অর্ডিনেটর নির্ধারণ'), t('We will call you within 2 working hours', '২ কর্মঘণ্টার মধ্যে আমরা কল করব'), false],
    [t('Upload documents', 'ডকুমেন্ট আপলোড'), t('Passport & photo in My Account', 'মাই অ্যাকাউন্টে পাসপোর্ট ও ছবি'), false],
    ...(b.balance > 0 && nextDue ? [[t('Pay balance', 'বাকি পরিশোধ'), `${i.bdt(nextDue.amount)} · ${t('due', 'শেষ তারিখ')} ${i.date(nextDue.due_date)}`, false] as [string, string, boolean]] : []),
  ];

  return (
    <>
      <section className="relative overflow-hidden bg-gradient-to-br from-brand-800 to-brand-600 text-white print:hidden">
        <div className="pattern-dots absolute inset-0 opacity-20" />
        <div className="wrap relative py-12 text-center md:py-16">
          <span className="mx-auto grid h-20 w-20 place-items-center rounded-full bg-white text-brand-700 shadow-xl ring-8 ring-white/20"><Icon name={cancelled ? 'x' : confirmed ? 'check' : 'clock'} className="h-10 w-10" /></span>
          <h1 className="mt-6 text-3xl font-extrabold sm:text-4xl">{title}</h1>
          <p className="mx-auto mt-2 max-w-xl text-brand-100">{sub}</p>
          <p className="mt-4 inline-flex items-center gap-2 rounded-2xl bg-white/15 px-5 py-3 font-mono text-xl font-bold ring-1 ring-white/25" data-booking-ref>{b.ref}
            <CopyButton value={b.ref} label={t('Copy reference', 'রেফারেন্স কপি করুন')} copied={t('Copied', 'কপি হয়েছে')} className="icon-btn h-8 w-8 text-white hover:bg-white/15"><Icon name="copy" className="h-4 w-4" /></CopyButton></p>
          <div className="mt-6 flex flex-wrap justify-center gap-3">
            {!confirmed && !cancelled && !awaitingBank && <Link href={`${i.u('/booking')}?ref=${b.ref}&key=${b.key}&payment=pending`} className="btn bg-white text-brand-800 hover:bg-brand-50">{t('Pay now', 'এখনই পরিশোধ')}</Link>}
            {confirmed && <Link href={i.u(`/account/bookings/${b.ref}`)} className="btn bg-white text-brand-800 hover:bg-brand-50">{t('Manage booking', 'বুকিং ম্যানেজ করুন')}</Link>}
            {hasDocs && <a href={doc('invoice')} className="btn bg-white/10 text-white ring-1 ring-white/30 hover:bg-white/20" data-doc="invoice"><Icon name="download" className="h-4 w-4" /> {t('Download invoice (PDF)', 'ইনভয়েস ডাউনলোড (PDF)')}</a>}
            {hasDocs && b.documents.some((d: any) => d.kind === 'voucher') && <a href={doc('voucher')} className="btn bg-white/10 text-white ring-1 ring-white/30 hover:bg-white/20" data-doc="voucher"><Icon name="ticket" className="h-4 w-4" /> {t('E-voucher (PDF)', 'ই-ভাউচার (PDF)')}</a>}
            <PrintButton label={t('Print', 'প্রিন্ট')} className="btn bg-white/10 text-white ring-1 ring-white/30 hover:bg-white/20"><Icon name="printer" className="h-4 w-4" /> {t('Print', 'প্রিন্ট')}</PrintButton>
          </div>
        </div>
      </section>

      <div className="wrap grid gap-8 py-10 lg:grid-cols-[1fr_320px]">
        <div className="min-w-0">
          <article className="card overflow-hidden print:border-0 print:shadow-none" id="invoice" aria-labelledby="inv-h">
            <header className="flex flex-wrap items-start justify-between gap-6 border-b border-ink-100 p-6 dark:border-ink-800 sm:p-8">
              <div>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src="/brand/logo.svg" alt={company.short_name ?? 'Musafir'} className="h-11 w-auto dark:hidden print:block" width={190} height={48} />
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src="/brand/logo-dark.svg" alt="" className="hidden h-11 w-auto dark:block print:hidden" width={190} height={48} />
                <p className="mt-3 max-w-xs text-xs muted">{company.name}<br />{company.address}<br />BIN {company.bin}{iata ? ` · IATA ${iata}` : ''}</p>
              </div>
              <div className="text-right"><h2 id="inv-h" className="text-2xl font-extrabold tracking-tight">{t('INVOICE', 'ইনভয়েস')}</h2><p className="mt-1 text-sm font-semibold">#{b.invoice_no}</p><span className={`badge mt-2 ${badgeCls}`} data-pay-status={b.payment_status}>{badge}</span></div>
            </header>
            <div className="grid gap-6 p-6 text-sm sm:grid-cols-3 sm:p-8">
              <div><p className="text-xs font-bold uppercase tracking-wide muted">{t('Billed to', 'বিল প্রাপক')}</p><p className="mt-1 font-bold">{name}</p><p className="muted">{i.d(b.contact.phone)}<br />{b.contact.email}</p></div>
              <div><p className="text-xs font-bold uppercase tracking-wide muted">{t('Issued', 'ইস্যুর তারিখ')}</p><p className="mt-1 font-semibold">{i.date(b.created_at)}</p>
                {nextDue && b.balance > 0 && <><p className="mt-3 text-xs font-bold uppercase tracking-wide muted">{t('Balance due by', 'বাকি পরিশোধের শেষ তারিখ')}</p><p className="mt-1 font-semibold">{i.date(nextDue.due_date)}</p></>}</div>
              <div><p className="text-xs font-bold uppercase tracking-wide muted">{t('Booking ref.', 'বুকিং রেফ.')}</p><p className="mt-1 font-mono font-bold">{b.ref}</p>
                <p className="mt-3 text-xs font-bold uppercase tracking-wide muted">{t('Trip', 'ট্রিপ')}</p><p className="mt-1 font-semibold">{b.title}</p><p className="text-xs muted">{b.subtitle}{b.travel_start ? ` · ${i.date(b.travel_start)}` : ''}</p>
                {b.contact.pnr && <p className="mt-1 text-xs">PNR <span className="font-mono font-bold">{b.contact.pnr}</span></p>}
                {b.contact.gift_code && <p className="mt-1 text-xs">{t('Gift card code', 'গিফট কার্ড কোড')} <span className="font-mono font-bold" data-gift-code>{b.contact.gift_code}</span></p>}</div>
            </div>
            <div className="overflow-x-auto px-6 sm:px-8"><table className="table min-w-[520px]"><thead><tr><th scope="col">{t('Description', 'বিবরণ')}</th><th scope="col" className="text-right">{t('Qty', 'পরিমাণ')}</th><th scope="col" className="text-right">{t('Unit price', 'একক মূল্য')}</th><th scope="col" className="text-right">{t('Amount', 'টাকা')}</th></tr></thead>
              <tbody>{b.items.filter((x: any) => x.total >= 0).map((x: any, k: number) => <tr key={k}><td>{x.label}</td><td className="text-right">{i.num(x.qty)}</td><td className="text-right">{i.bdt(x.unit)}</td><td className="text-right font-semibold">{i.bdt(x.total)}</td></tr>)}</tbody></table></div>
            <div className="flex justify-end p-6 sm:p-8"><dl className="w-full max-w-xs space-y-2 text-sm">
              <div className="flex justify-between"><dt className="muted">{t('Subtotal', 'সাবটোটাল')}</dt><dd>{i.bdt(b.subtotal)}</dd></div>
              {b.items.filter((x: any) => x.total < 0).map((x: any, k: number) => <div key={k} className="flex justify-between text-emerald-700 dark:text-emerald-400"><dt>{x.label}</dt><dd>−{i.bdt(-x.total)}</dd></div>)}
              <div className="flex justify-between"><dt className="muted">{t('VAT', 'ভ্যাট')}</dt><dd>{t('Included', 'অন্তর্ভুক্ত')}</dd></div>
              <div className="flex justify-between border-t border-ink-100 pt-2 text-base font-bold dark:border-ink-800"><dt>{t('Total', 'মোট')}</dt><dd data-total>{i.bdt(b.total)}</dd></div>
              {b.paid > 0 && <div className="flex justify-between text-emerald-700 dark:text-emerald-400"><dt>{t('Paid', 'পরিশোধিত')}{paidVia ? ` (${gwName[paidVia.gateway] ?? paidVia.gateway})` : ''}</dt><dd data-paid>−{i.bdt(b.paid)}</dd></div>}
              <div className="flex justify-between rounded-xl bg-ink-50 p-3 text-base font-extrabold dark:bg-ink-850"><dt>{t('Balance due', 'বাকি')}</dt><dd data-balance>{i.bdt(b.balance)}</dd></div>
            </dl></div>
            {b.travellers.length > 0 && <div className="border-t border-ink-100 px-6 py-5 text-sm dark:border-ink-800 sm:px-8"><p className="text-xs font-bold uppercase tracking-wide muted">{t('Travellers', 'যাত্রী')}</p>
              <ul className="mt-2 grid gap-1 sm:grid-cols-2">{b.travellers.map((tr: any, k: number) => <li key={k}>{tr.name}{tr.ticket_no ? <span className="muted"> · {t('Ticket', 'টিকিট')} {tr.ticket_no}</span> : null}</li>)}</ul></div>}
            <footer className="border-t border-ink-100 p-6 text-xs muted dark:border-ink-800 sm:px-8">{t('This is a computer-generated invoice and does not require a signature. Payments are subject to our refund policy.', 'এটি কম্পিউটারে তৈরি ইনভয়েস, স্বাক্ষরের প্রয়োজন নেই। পেমেন্ট আমাদের রিফান্ড নীতিমালার অধীন।')} {company.email} · {i.d(company.hotline)}</footer>
          </article>
        </div>
        <aside className="space-y-5 print:hidden">
          <div className="card p-5"><h2 className="font-bold">{t('What happens next', 'এরপর কী হবে')}</h2>
            <ol className="mt-4 space-y-4">{steps.map(([h, s, done], k) => (
              <li key={k} className="flex gap-3"><span className={`grid h-9 w-9 shrink-0 place-items-center rounded-full ${done ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300' : 'bg-ink-100 text-ink-600 dark:bg-ink-800 dark:text-ink-300'}`}><Icon name={done ? 'check' : (['mail', 'headset', 'upload', 'wallet'][k] ?? 'circle')} className="h-4 w-4" /></span>
                <div><p className="text-sm font-bold">{h}</p><p className="text-xs muted">{s}</p></div></li>))}</ol></div>
          <div className="card p-5"><h2 className="font-bold">{t('Add to your trip', 'ট্রিপে যোগ করুন')}</h2><div className="mt-3 space-y-2">
            {([['plane', t('Flights', 'ফ্লাইট'), '/flights'], ['shield-plus', t('Travel insurance', 'ট্রাভেল ইন্স্যুরেন্স'), '/insurance'], ['stamp', t('Visa assistance', 'ভিসা সহায়তা'), '/visa']] as const).map(([ic, l, p]) => (
              <Link key={p} href={i.u(p)} className="flex items-center justify-between rounded-xl border border-ink-100 p-3 text-sm font-semibold hover:border-brand-500 dark:border-ink-800"><span className="flex items-center gap-2"><Icon name={ic} className="h-4 w-4 text-brand-600" /> {l}</span><Icon name="chevron-right" className="h-4 w-4" /></Link>))}
          </div></div>
        </aside>
      </div>
    </>
  );
}
