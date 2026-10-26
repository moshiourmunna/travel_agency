import { ApiButton, WishRemove } from '@/components/account/client';
import { accountCtx, accountMetadata, AccountHead } from '@/components/account/page';
import { Empty, Thumb } from '@/components/account/ui';
import { Icon } from '@/components/icons/Icon';
import { me } from '@/lib/account';

export const generateMetadata = accountMetadata('trips');

const PUBLIC: Record<string, string> = { tour: '/tours/', cruise: '/cruises/', activity: '/activities/', hotel: '/hotels/' };
const COLS = ['grid-cols-1', 'grid-cols-1', 'grid-cols-2', 'grid-cols-3', 'grid-cols-4'];

export default async function Trips({ params }: PageProps<'/[lang]/account/trips'>) {
  const { lang, i } = await accountCtx(params);
  const { t, u, d, bdt, date } = i;
  const x = await me<any>('trips', lang, `/${lang}/account/trips`);
  return (
    <>
      <AccountHead i={i} k="trips" sub={t('Itineraries you built in the trip planner, plus everything you saved.', 'ট্রিপ প্ল্যানারে তৈরি ভ্রমণসূচি এবং আপনার সংরক্ষিত সবকিছু।')}>
        <a href={u('/trip-planner')} className="btn btn-primary btn-sm"><Icon name="route" className="h-4 w-4" /> {t('Plan a new trip', 'নতুন ট্রিপ পরিকল্পনা')}</a>
      </AccountHead>

      <h2 className="text-lg font-bold">{t('Saved itineraries', 'সংরক্ষিত ভ্রমণসূচি')}</h2>
      {x.plans.length ? (
        <ul className="mt-3 grid gap-4 md:grid-cols-2">
          {x.plans.map((p: any) => (
            <li key={p.id} className="card overflow-hidden" data-plan={p.id}>
              <div className={`grid h-32 ${COLS[Math.min(4, Math.max(1, p.places.length))]}`}>
                {p.places.length ? p.places.map((pl: any) => <Thumb key={pl.slug} img={pl.image} className="h-full w-full object-cover" />) : <Thumb img={null} className="h-full w-full" />}
              </div>
              <div className="p-4 sm:p-5">
                <h3 className="text-lg font-bold">{p.name}</h3>
                <p className="mt-1 text-sm muted">{p.places.map((pl: any) => pl.name).join(' → ')}{p.pax ? ` · ${p.pax}` : ''} · {t('updated', 'হালনাগাদ')} {date(p.updated)}</p>
                <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
                  <p><span className="text-xs muted">{t('Estimate', 'আনুমানিক')}</span><br /><b className="text-xl">{bdt(p.estimate)}</b>{p.days ? <span className="text-xs muted"> · {d(p.days)} {t('days', 'দিন')}</span> : null}</p>
                  <div className="flex gap-2">
                    <ApiButton method="DELETE" path={`trips/${p.id}`} className="icon-btn text-rose-700 dark:text-rose-300" label={`${t('Delete', 'মুছুন')} ${p.name}`}
                      confirm={t('Delete this saved itinerary?', 'এই সংরক্ষিত ভ্রমণসূচি মুছবেন?')} success={t('Itinerary deleted', 'ভ্রমণসূচি মুছে ফেলা হয়েছে')}><Icon name="trash-2" className="h-4 w-4" /></ApiButton>
                    <a href={`${u('/trip-planner')}?dest=${encodeURIComponent(p.destinations.join(','))}`} className="btn btn-outline btn-sm">{t('Edit', 'এডিট')}<span className="sr-only"> {p.name}</span></a>
                    <a href={u("/custom-tour")} className="btn btn-primary btn-sm">{t('Get a quote', 'কোটেশন নিন')}<span className="sr-only"> {p.name}</span></a>
                  </div>
                </div>
              </div>
            </li>
          ))}
        </ul>
      ) : (
        <div className="mt-3"><Empty icon="route" title={t('No saved itineraries yet', 'এখনও কোনো সংরক্ষিত ভ্রমণসূচি নেই')} sub={t('Build a multi-country trip in the planner and save it here.', 'প্ল্যানারে একাধিক দেশের ট্রিপ বানিয়ে এখানে সংরক্ষণ করুন।')}>
          <a href={u('/trip-planner')} className="btn btn-primary">{t('Open the trip planner', 'ট্রিপ প্ল্যানার খুলুন')}</a></Empty></div>
      )}

      <h2 className="mt-8 text-lg font-bold">{t('Wishlist', 'উইশলিস্ট')}</h2>
      {x.wishlist.length ? (
        <ul className="mt-3 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {x.wishlist.map((w: any) => (
            <li key={`${w.kind}:${w.slug}`} className="card relative overflow-hidden" data-wish-item={`${w.kind}:${w.slug}`}>
              <a href={u((PUBLIC[w.kind] ?? '/tours/') + w.slug)} className="group block">
                <Thumb img={w.image} className="aspect-[16/10] w-full object-cover" />
                <div className="p-4">
                  <p className="line-clamp-2 font-semibold group-hover:text-brand-700 dark:group-hover:text-brand-300">{w.title}</p>
                  <p className="mt-1 text-sm muted">{w.days ? `${d(w.days)} ${t('days', 'দিন')} · ` : ''}{t('from', 'শুরু')} <b className="text-ink-900 dark:text-white">{bdt(w.price)}</b></p>
                  {w.price_drop > 0 ? <p className="mt-2 text-xs font-semibold text-emerald-700 dark:text-emerald-400"><Icon name="trending-down" className="inline h-3.5 w-3.5" /> {lang === 'bn' ? `সংরক্ষণের পর দাম ${bdt(w.price_drop)} কমেছে` : `Price dropped ${bdt(w.price_drop)} since you saved it`}</p> : null}
                </div>
              </a>
              <WishRemove kind={w.kind} slug={w.slug} label={`${t('Remove from wishlist', 'উইশলিস্ট থেকে সরান')}: ${w.title}`} done={t('Removed from wishlist', 'উইশলিস্ট থেকে সরানো হয়েছে')}
                className="absolute right-3 top-3 grid h-9 w-9 place-items-center rounded-full bg-white/90 text-rose-600 shadow-sm backdrop-blur hover:scale-110 dark:bg-ink-900/90" />
            </li>
          ))}
        </ul>
      ) : (
        <div className="mt-3"><Empty icon="heart" title={t('Your wishlist is empty', 'আপনার উইশলিস্ট খালি')} sub={t('Tap the heart on any package to save it for later.', 'পরে দেখার জন্য যেকোনো প্যাকেজের হার্টে ট্যাপ করুন।')}>
          <a href={u('/tours')} className="btn btn-primary">{t('Explore holidays', 'হলিডে দেখুন')}</a></Empty></div>
      )}
      <p className="mt-4 text-sm muted">{t('Saved items sync across every device you sign in on.', 'সাইন ইন করা প্রতিটি ডিভাইসে সংরক্ষিত আইটেম সিঙ্ক হয়।')} <a href={u('/wishlist')} className="link-muted font-semibold">{t('Open full wishlist', 'পূর্ণ উইশলিস্ট খুলুন')} →</a></p>
    </>
  );
}
