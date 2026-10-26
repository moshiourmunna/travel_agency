import { RowFilter } from '@/components/account/client';
import { accountCtx, accountMetadata, AccountHead } from '@/components/account/page';
import { Empty, KindChip, Status, Thumb } from '@/components/account/ui';
import { Icon } from '@/components/icons/Icon';
import { me } from '@/lib/account';

export const generateMetadata = accountMetadata('bookings');

const PUBLIC: Record<string, string> = { tour: '/tours/', cruise: '/cruises/', activity: '/activities/', hotel: '/hotels/' };

export default async function Bookings({ params }: PageProps<'/[lang]/account/bookings'>) {
  const { lang, i } = await accountCtx(params);
  const { t, u, d, bdt, date } = i;
  const x = await me<any>('bookings', lang, `/${lang}/account/bookings`);
  const c = x.counts;
  const sr = (ref: string) => <span className="sr-only"> {ref}</span>;
  return (
    <>
      <AccountHead i={i} k="bookings" sub={t('Manage trips, download vouchers and invoices, or request changes.', 'ট্রিপ ম্যানেজ করুন, ভাউচার ও ইনভয়েস ডাউনলোড করুন বা পরিবর্তনের অনুরোধ করুন।')}>
        <a href={u('/tours')} className="btn btn-primary btn-sm"><Icon name="plus" className="h-4 w-4" /> {t('Book a new trip', 'নতুন ট্রিপ বুক করুন')}</a>
      </AccountHead>
      {x.items.length ? (
        <div id="mybk">
          <RowFilter target="mybk" label={t('Filter bookings', 'বুকিং ফিল্টার')} placeholder={t('Search by ref, trip or place…', 'রেফারেন্স, ট্রিপ বা জায়গা খুঁজুন…')}
            chips={[{ value: 'all', label: t('All', 'সব'), count: d(c.all) }, { value: 'upcoming', label: t('Upcoming', 'আসন্ন'), count: d(c.upcoming) },
              { value: 'completed', label: t('Completed', 'সম্পন্ন'), count: d(c.completed) }, { value: 'cancelled', label: t('Cancelled & refunded', 'বাতিল ও রিফান্ড'), count: d(c.cancelled) }]} />
          <ul className="space-y-4">
            {x.items.map((b: any) => {
              const up = b.group === 'upcoming';
              const again = b.product?.slug && PUBLIC[b.product.kind] ? PUBLIC[b.product.kind] + b.product.slug : null;
              return (
                <li key={b.ref} className="card overflow-hidden" data-row data-group={b.group} data-kind={b.kind} data-booking={b.ref} data-q={`${b.ref} ${b.title} ${b.subtitle ?? ''}`}>
                  <article className="flex flex-col sm:flex-row" aria-labelledby={`bk-${b.ref}`}>
                    <Thumb img={b.image} className={`h-36 w-full object-cover sm:h-auto sm:w-56 ${b.group === 'cancelled' ? 'grayscale' : ''}`} />
                    <div className="flex min-w-0 flex-1 flex-col gap-3 p-4 sm:p-5 lg:flex-row lg:items-center">
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2"><KindChip t={t} k={b.kind} /> <Status t={t} s={b.status} /><span className="text-xs muted">{b.ref}</span></div>
                        <h2 id={`bk-${b.ref}`} className="mt-1.5 text-lg font-bold leading-snug text-ink-900 dark:text-white">
                          <a href={u(`/account/bookings/${b.ref}`)} className="hover:text-brand-700 dark:hover:text-brand-300">{b.title}</a>
                        </h2>
                        <p className="mt-1 text-sm muted"><Icon name="calendar" className="mr-1 inline h-4 w-4" />{date(b.travel_start)}{b.travel_end && b.travel_end !== b.travel_start ? ` – ${date(b.travel_end)}` : ''}{b.subtitle ? ` · ${b.subtitle}` : ''}</p>
                        <p className="mt-1 text-xs muted">{t('Booked on', 'বুকিংয়ের তারিখ')} {date(b.booked_on)}</p>
                      </div>
                      <div className="flex flex-wrap items-center justify-between gap-3 border-t border-ink-100 pt-3 dark:border-ink-800 lg:block lg:min-w-[12rem] lg:border-0 lg:pt-0 lg:text-right">
                        <div>
                          <p className="text-xl font-extrabold">{bdt(b.total)}</p>
                          {b.status === 'refunded' ? <p className="text-xs text-violet-700 dark:text-violet-300">{t('Refunded', 'রিফান্ড হয়েছে')} {bdt(b.paid || b.total)}</p>
                            : b.status === 'cancelled' ? <p className="text-xs muted">{t('Cancelled', 'বাতিল')}</p>
                            : b.balance > 0 ? <p className="text-xs font-semibold text-rose-700 dark:text-rose-300">{t('Balance due', 'বাকি')} {bdt(b.balance)}</p>
                            : <p className="text-xs muted">{t('Paid in full', 'সম্পূর্ণ পরিশোধিত')}</p>}
                        </div>
                        <div className="flex flex-wrap gap-2 lg:mt-3 lg:justify-end">
                          {b.kind === 'visa' ? <a href={u('/account/visa')} className="btn btn-primary btn-sm">{t('Track visa', 'ভিসা ট্র্যাক')}{sr(b.ref)}</a>
                            : b.status === 'pending' && b.balance > 0 ? <a href={u(`/account/bookings/${b.ref}#pay`)} className="btn btn-accent btn-sm">{t('Pay now', 'এখন পরিশোধ')}{sr(b.ref)}</a>
                            : b.kind === 'flight' && up ? <a href={u(`/account/bookings/${b.ref}/ticket`)} className="btn btn-primary btn-sm">{t('E-ticket', 'ই-টিকিট')}{sr(b.ref)}</a>
                            : up ? <a href={u(`/account/bookings/${b.ref}`)} className="btn btn-primary btn-sm">{t('Manage', 'ম্যানেজ')}{sr(b.ref)}</a>
                            : <a href={u(`/account/bookings/${b.ref}`)} className="btn btn-outline btn-sm">{t('Details', 'বিস্তারিত')}{sr(b.ref)}</a>}
                          {b.status === 'completed' ? <a href={u('/account/reviews')} className="btn btn-outline btn-sm"><Icon name="star" className="h-4 w-4" /> {t('Review', 'রিভিউ')}{sr(b.ref)}</a> : null}
                          {again && !up ? <a href={u(again)} className="btn btn-outline btn-sm">{t('Book again', 'আবার বুক করুন')}{sr(b.ref)}</a> : null}
                          {b.paid > 0 || b.total > 0 ? (
                            <a href={`/api/bookings/${b.ref}/invoice`} className="btn btn-outline btn-sm" target="_blank" rel="noopener" data-invoice={b.ref}>
                              <Icon name="download" className="h-4 w-4" /><span className="sr-only sm:not-sr-only">{t('Invoice', 'ইনভয়েস')}</span>{sr(b.ref)}
                            </a>
                          ) : null}
                        </div>
                      </div>
                    </div>
                  </article>
                </li>
              );
            })}
          </ul>
          <p className="card mt-3 p-8 text-center text-sm muted" data-rows-empty hidden>{t('No bookings match.', 'কোনো বুকিং মেলেনি।')}</p>
        </div>
      ) : (
        <Empty icon="luggage" title={t('No bookings yet', 'এখনও কোনো বুকিং নেই')} sub={t('Your holidays, flights, hotels and visas will appear here.', 'আপনার হলিডে, ফ্লাইট, হোটেল ও ভিসা এখানে দেখা যাবে।')}>
          <a href={u('/tours')} className="btn btn-primary">{t('Explore holidays', 'হলিডে দেখুন')}</a>
        </Empty>
      )}
    </>
  );
}
