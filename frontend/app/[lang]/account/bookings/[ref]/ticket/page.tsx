import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import QRCode from 'qrcode';
import { ApiForm, Modal } from '@/components/account/client';
import { accountCtx } from '@/components/account/page';
import { AccountCrumbs } from '@/components/account/Shell';
import { PageHead, Status } from '@/components/account/ui';
import { PrintButton } from '@/components/detail/Actions';
import { Icon } from '@/components/icons/Icon';
import { me } from '@/lib/account';
import type { Lang } from '@/lib/format';
import { getI18n } from '@/lib/i18n';
import { pathMetadata } from '@/lib/page';

export async function generateMetadata({ params }: PageProps<'/[lang]/account/bookings/[ref]/ticket'>): Promise<Metadata> {
  const { lang, ref } = await params;
  const i = await getI18n(lang as Lang);
  return pathMetadata(lang as Lang, `/account/bookings/${ref}/ticket`, `${i.t('E-ticket', 'ই-টিকিট')} ${ref}`, { noindex: true });
}

/** Real, scannable QR (SVG, rendered on the server) with the boarding details the gate agent needs. */
async function qr(text: string) {
  return QRCode.toString(text, { type: 'svg', margin: 1, errorCorrectionLevel: 'M', color: { dark: '#0B1B2B', light: '#FFFFFF' } });
}

export default async function ETicket({ params }: PageProps<'/[lang]/account/bookings/[ref]/ticket'>) {
  const { ref } = await params;
  if (!/^[A-Z]{3}-\d{2}-\d{5}$/.test(ref)) notFound();
  const { lang, i } = await accountCtx(params);
  const { t, u, d, date } = i;
  const x = await me<any>(`bookings/${ref}/ticket`, lang, `/${lang}/account/bookings/${ref}/ticket`);
  const f = x.flight;
  const dur = f?.duration_min ? (lang === 'bn' ? `${d(Math.floor(f.duration_min / 60))}ঘ ${d(f.duration_min % 60)}মি` : `${Math.floor(f.duration_min / 60)}h ${f.duration_min % 60}m`) : '';
  const cabin: Record<string, string> = { economy: t('Economy', 'ইকোনমি'), premium: t('Premium economy', 'প্রিমিয়াম ইকোনমি'), business: t('Business', 'বিজনেস'), first: t('First', 'ফার্স্ট') };
  const codes = await Promise.all(x.passengers.map((p: any) => qr([`MUSAFIR`, x.ref, x.pnr ?? '', f?.no ?? '', x.date ?? '', f ? `${f.from}-${f.to}` : '', p.name, p.seat ?? '', p.ticket_no ?? ''].join('|'))));
  const close = t('Close', 'বন্ধ করুন');
  const title = `${t('E-ticket', 'ই-টিকিট')} ${x.ref}`;
  return (
    <>
      <AccountCrumbs i={i} items={[[t('My account', 'মাই অ্যাকাউন্ট'), '/account'], [t('My bookings', 'আমার বুকিং'), '/account/bookings'], [title, `/account/bookings/${x.ref}/ticket`]]} />
      <PageHead title={title} sub={t('Show this on your phone or print it. Check-in opens 3 hours before departure.', 'ফোনে দেখান বা প্রিন্ট করুন। চেক-ইন যাত্রার ৩ ঘণ্টা আগে শুরু।')}>
        <PrintButton label={t('Print', 'প্রিন্ট')} className="btn btn-outline btn-sm print:hidden"><Icon name="printer" className="h-4 w-4" /> {t('Print', 'প্রিন্ট')}</PrintButton>
        <a href={u(`/account/bookings/${x.ref}`)} className="btn btn-primary btn-sm print:hidden"><Icon name="luggage" className="h-4 w-4" /> {t('Booking details', 'বুকিংয়ের বিস্তারিত')}</a>
      </PageHead>
      <div className="grid gap-6 xl:grid-cols-[1fr_20rem]">
        <div className="space-y-5">
          {x.passengers.map((p: any, k: number) => (
            <article key={k} className="card overflow-hidden break-inside-avoid" aria-label={`${t('Boarding pass', 'বোর্ডিং পাস')} ${p.name}`} data-pass={p.ticket_no ?? k}>
              <div className="flex items-center justify-between gap-3 px-4 py-3 text-white sm:px-6" style={{ backgroundColor: f?.color || '#0D6B65' }}>
                <p className="font-bold">{f?.airline ?? t('Flight', 'ফ্লাইট')}</p>
                <p className="text-sm">{cabin[x.cabin] ?? x.cabin}{x.pnr ? <> · PNR <b>{x.pnr}</b></> : null}</p>
              </div>
              <div className="grid gap-5 p-4 sm:p-6 md:grid-cols-[1fr_auto]">
                <div>
                  {f ? (
                    <div className="flex items-center justify-between gap-3">
                      <div><p className="text-3xl font-extrabold sm:text-4xl">{f.from}</p><p className="text-sm muted">{f.from_city}</p></div>
                      <div className="flex flex-1 flex-col items-center px-2 text-xs muted">
                        <span>{f.no}{dur ? ` · ${dur}` : ''}</span>
                        <span className="relative my-2 block h-px w-full bg-ink-200 dark:bg-ink-700"><span className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 bg-white px-1 text-brand-700 dark:bg-ink-900 dark:text-brand-300"><Icon name="plane" className="h-4 w-4" /></span></span>
                        <span>{f.stops ? `${d(f.stops)} ${t('stop', 'স্টপ')}` : t('Non-stop', 'সরাসরি')}</span>
                      </div>
                      <div className="text-right"><p className="text-3xl font-extrabold sm:text-4xl">{f.to}</p><p className="text-sm muted">{f.to_city}</p></div>
                    </div>
                  ) : null}
                  <dl className="mt-5 grid grid-cols-2 gap-4 border-t border-dashed border-ink-200 pt-4 text-sm dark:border-ink-700 sm:grid-cols-4">
                    {([[t('Passenger', 'যাত্রী'), p.name], [t('Date', 'তারিখ'), date(x.date)], [t('Departs', 'ছাড়বে'), f?.dep ? d(f.dep) : '—'], [t('Boarding', 'বোর্ডিং'), f?.boarding ? d(f.boarding) : '—'],
                      [t('Seat', 'সিট'), p.seat ?? t('At check-in', 'চেক-ইনে')], [t('Gate', 'গেট'), '—'], [t('Baggage', 'ব্যাগেজ'), f?.baggage ? `${f.baggage} + 7 kg` : '—'], [t('E-ticket', 'ই-টিকিট'), p.ticket_no ?? t('Being issued', 'ইস্যু হচ্ছে')]] as [string, string][]).map(([l, v]) => (
                      <div key={l} className="min-w-0"><dt className="text-xs muted">{l}</dt><dd className="break-words font-semibold">{v}</dd></div>
                    ))}
                  </dl>
                </div>
                <div className="flex flex-col items-center justify-center gap-2 border-t border-dashed border-ink-200 pt-4 dark:border-ink-700 md:border-l md:border-t-0 md:pl-6 md:pt-0">
                  <div className="h-32 w-32 overflow-hidden rounded-lg bg-white p-1 [&>svg]:h-full [&>svg]:w-full" role="img" aria-label={`${t('Boarding QR code', 'বোর্ডিং কিউআর কোড')} — ${p.name}`} dangerouslySetInnerHTML={{ __html: codes[k] }} />
                  <p className="text-xs muted">{t('Scan at the gate', 'গেটে স্ক্যান করুন')}</p>
                </div>
              </div>
            </article>
          ))}
        </div>
        <aside className="space-y-5 print:hidden">
          <section className="card p-4 sm:p-5"><h2 className="font-bold">{t('Flight status', 'ফ্লাইট স্ট্যাটাস')}</h2>
            <p className="mt-2 flex items-center gap-2 text-sm"><Status t={t} s="confirmed" /> {t('Scheduled', 'নির্ধারিত সময়ে')}</p>
            <p className="mt-2 text-xs muted">{t('We will SMS and WhatsApp you if anything changes.', 'কিছু পরিবর্তন হলে এসএমএস ও হোয়াটসঅ্যাপে জানাব।')}</p></section>
          <section className="card p-4 sm:p-5"><h2 className="font-bold">{t('Before you fly', 'যাত্রার আগে')}</h2>
            <ul className="mt-3 space-y-2 text-sm">
              {[['Passport valid 6+ months', 'পাসপোর্টের মেয়াদ ৬+ মাস'], ['Return ticket & hotel voucher printed', 'ফিরতি টিকিট ও হোটেল ভাউচার প্রিন্ট'], ['Check the arrival-card rules of your destination', 'গন্তব্যের অ্যারাইভাল কার্ডের নিয়ম দেখে নিন'], ['Be at the airport 3 hours before departure', 'যাত্রার ৩ ঘণ্টা আগে বিমানবন্দরে পৌঁছান']].map(([en, bn]) => (
                <li key={en} className="flex gap-2"><Icon name="circle-check" className="mt-0.5 h-4 w-4 shrink-0 text-brand-700 dark:text-brand-300" /> {t(en, bn)}</li>
              ))}
            </ul></section>
          <section className="card p-4 sm:p-5"><h2 className="font-bold">{t('Add-ons', 'অ্যাড-অন')}</h2>
            <p className="mt-1 text-xs muted">{t('Your travel expert confirms the airline price before anything is charged.', 'কিছু চার্জ করার আগে আপনার ট্রাভেল এক্সপার্ট এয়ারলাইনের মূল্য নিশ্চিত করবেন।')}</p>
            <div className="mt-3 grid gap-2">
              {([['seat', 'armchair', t('Change seats', 'সিট পরিবর্তন'), t('Please change our seats on', 'অনুগ্রহ করে আমাদের সিট পরিবর্তন করুন —')], ['bag', 'luggage', t('+10 kg baggage', '+১০ কেজি ব্যাগেজ'), t('Please add 10 kg extra baggage on', 'অনুগ্রহ করে ১০ কেজি অতিরিক্ত ব্যাগেজ যোগ করুন —')], ['meal', 'utensils', t('Special meal', 'বিশেষ খাবার'), t('Please request a special meal on', 'অনুগ্রহ করে বিশেষ খাবারের অনুরোধ করুন —')]] as [string, string, string, string][]).map(([k, ic, l, msg]) => (
                <Modal key={k} id={`addon-${k}`} triggerClass="btn btn-outline btn-sm w-full justify-start" trigger={<><Icon name={ic} className="h-4 w-4" /> {l}</>} title={l} closeLabel={close}>
                  <ApiForm path={`bookings/${x.ref}/request`} extra={{ type: 'change' }} reset success={t('Request sent — we will confirm by SMS.', 'অনুরোধ পাঠানো হয়েছে — এসএমএসে নিশ্চিত করব।')}>
                    <div className="field mt-4"><label className="label" htmlFor={`ad-${k}`}>{t('Details', 'বিস্তারিত')}</label>
                      <textarea id={`ad-${k}`} name="message" className="input min-h-[6rem]" required minLength={5} maxLength={2000} defaultValue={`${msg} ${f?.no ?? ''} (${x.ref}). `} /></div>
                    <div className="mt-6 flex justify-end"><button className="btn btn-primary">{t('Send request', 'অনুরোধ পাঠান')}</button></div>
                  </ApiForm>
                </Modal>
              ))}
            </div></section>
        </aside>
      </div>
    </>
  );
}
