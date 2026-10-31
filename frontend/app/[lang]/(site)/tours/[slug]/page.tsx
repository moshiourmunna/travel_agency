import type { Metadata } from 'next';
import { Icon } from '@/components/icons/Icon';
import { PrintButton, ShareButton, ExpandAll, Sheet } from '@/components/detail/Actions';
import { BookingCard, type BookingLabels } from '@/components/detail/BookingCard';
import { Gallery, QuickFacts, SubNav } from '@/components/detail/Gallery';
import { ReviewsBlock } from '@/components/detail/Reviews';
import { RouteMap } from '@/components/detail/RouteMap';
import { Price } from '@/components/client/Price';
import { CancelBadge, Crumbs, FaqList, SecHead, Stars, type Crumb } from '@/components/ui/basics';
import { TourCard, Wish } from '@/components/ui/cards';
import { api, apiData } from '@/lib/api';
import type { Lang } from '@/lib/format';
import { getI18n, type I18n } from '@/lib/i18n';
import { breadcrumbJsonLd, buildMetadata, JsonLd } from '@/lib/seo';
import { getSite, siteUrl } from '@/lib/site';

export const revalidate = 300;
// Slugs not known at build (new admin content, or a build without the API) render on first request, then cache (ISR).
// Explicit because the [lang] layout sets dynamicParams = false for the locale segment.
export const dynamicParams = true;

export async function generateStaticParams() {
  // Pre-render every published tour at build (ISR keeps them fresh; new tours render on demand).
  try {
    const r = await api<{ data: { slug: string }[] }>('tours', { lang: 'en', tags: ['tours'], query: { per_page: 60 } });
    return r.data.map((t) => ({ slug: t.slug }));
  } catch { return []; }
}

const load = (slug: string, lang: Lang) => apiData<any>(`tours/${slug}`, { lang, tags: ['tours', `tour:${slug}`, 'reviews'] });

export async function generateMetadata({ params }: PageProps<'/[lang]/tours/[slug]'>): Promise<Metadata> {
  const { lang, slug } = (await params) as { lang: Lang; slug: string };
  const x = await load(slug, lang);
  return buildMetadata(lang, `/tours/${slug}`, { title: x.title, description: x.summary, image: x.image, seo: x.seo });
}

function labels(i: I18n, x: any, pax: Record<string, number>): BookingLabels {
  const t = i.t;
  return {
    from: t('From, per person', 'শুরু, জনপ্রতি'), save: t('Save', 'সাশ্রয়'), date: t('Departure date', 'যাত্রার তারিখ'), room: t('Room type', 'রুমের ধরন'),
    adults: t('Adults', 'প্রাপ্তবয়স্ক'), adultsSub: t('12+ years', '১২+ বছর'), children: t('Children', 'শিশু'), childrenSub: `${t('2–11 years', '২–১১ বছর')}, ${i.d(Math.round((pax.children ?? 0.7) * 100))}%`,
    infants: t('Infants', 'নবজাতক'), infantsSub: `${t('Under 2', '২ বছরের কম')}, ${i.d(Math.round((pax.infants ?? 0.1) * 100))}%`, decrease: t('Decrease', 'কমান'), increase: t('Increase', 'বাড়ান'),
    addons: t('Add-ons', 'অতিরিক্ত সেবা'), total: t('Total', 'মোট'), payNow: '', book: t('Book now', 'এখনই বুক করুন'), ask: t('Ask on WhatsApp', 'হোয়াটসঅ্যাপে জিজ্ঞেস করুন'),
    instalments: '', soldOut: t('Sold out', 'বিক্রি শেষ'), noDates: t('No open departures right now — ask us for a private date.', 'এই মুহূর্তে কোনো খোলা যাত্রা নেই — ব্যক্তিগত তারিখের জন্য যোগাযোগ করুন।'),
  };
}

export default async function TourPage({ params }: PageProps<'/[lang]/tours/[slug]'>) {
  const { lang, slug } = (await params) as { lang: Lang; slug: string };
  const [x, i, site, faqs] = await Promise.all([load(slug, lang), getI18n(lang), getSite(lang), apiData<any[]>('faqs', { lang, tags: ['faqs'], query: { show_on: 'tour' } })]);
  const t = i.t;
  const c = site.settings.company ?? {};
  const commerce = site.settings.commerce ?? {};
  const pax = commerce.pax_factors ?? { adults: 1, children: 0.7, infants: 0.1 };
  const deposit = commerce.deposit_pct ?? 30;
  const base = siteUrl(site);
  const crumbs: Crumb[] = [[t('Home', 'হোম'), i.u('/')], [t('Tours', 'ট্যুর'), i.u('/tours')], [x.title, i.u(`/tours/${slug}`)]];
  const catNames: Record<string, string> = Object.fromEntries((site.categories ?? []).map((k: any) => [k.slug, k.name]));
  const l = labels(i, x, pax);
  l.payNow = `${t('Pay now', 'এখন দিন')} (${i.d(deposit)}% ${t('deposit', 'অগ্রিম')})`;
  const perks = (
    <ul className="space-y-1.5 text-xs muted">
      <li className="flex gap-2"><Icon name="shield-check" className="h-4 w-4 text-brand-600" /> {x.cancellation?.label}</li>
      <li className="flex gap-2"><Icon name="wallet" className="h-4 w-4 text-brand-600" /> {t('Pay the rest in', 'বাকি টাকা')} {i.d(commerce.instalments ?? 3)} {t('installments', 'কিস্তিতে')}</li>
    </ul>
  );
  const card = (id: string) => (
    <BookingCard id={id} slug={slug} price={x.price} priceWas={x.price_was} deps={x.departures} tiers={x.price_tiers} addons={x.addons} pax={pax} depositPct={deposit} l={l}
      booking={i.u('/booking')} whatsapp={c.whatsapp_number} title={x.title} perks={perks} waIcon={<Icon name="whatsapp" className="h-4 w-4 text-[#1FAF38]" />} minus={<Icon name="minus" className="h-4 w-4" />} plus={<Icon name="plus" className="h-4 w-4" />} />
  );
  const mealName: Record<string, string> = { breakfast: t('Breakfast', 'নাশতা'), lunch: t('Lunch', 'দুপুরের খাবার'), dinner: t('Dinner', 'রাতের খাবার') };
  const ld = [
    breadcrumbJsonLd(base, crumbs),
    {
      '@context': 'https://schema.org', '@type': ['TouristTrip', 'Product'], name: x.title, description: x.summary || x.description, image: x.gallery?.map((g: any) => g?.src).filter(Boolean),
      url: `${base}/${lang}/tours/${slug}`, sku: slug, brand: { '@type': 'Brand', name: 'Musafir' }, touristType: x.categories,
      itinerary: { '@type': 'ItemList', itemListElement: x.itinerary.map((d: any, k: number) => ({ '@type': 'ListItem', position: k + 1, name: d.title })) },
      aggregateRating: x.reviews_count ? { '@type': 'AggregateRating', ratingValue: x.rating, reviewCount: x.reviews_count, bestRating: 5 } : undefined,
      offers: { '@type': 'AggregateOffer', priceCurrency: 'BDT', lowPrice: Math.min(x.price, ...x.departures.map((d: any) => d.price)), highPrice: Math.max(x.price, ...x.departures.map((d: any) => d.price)), offerCount: x.departures.length, availability: x.departures.some((d: any) => d.seats_left > 0) ? 'https://schema.org/InStock' : 'https://schema.org/SoldOut', url: `${base}/${lang}/tours/${slug}` },
      provider: { '@id': `${base}/#org` },
    },
    faqs.length ? { '@context': 'https://schema.org', '@type': 'FAQPage', mainEntity: faqs.map((f) => ({ '@type': 'Question', name: f.q, acceptedAnswer: { '@type': 'Answer', text: f.a } })) } : null,
  ];
  const ib = 'grid h-9 w-9 place-items-center rounded-full border border-ink-200 dark:border-ink-700';
  return (
    <>
      {ld.map((d, k) => <JsonLd key={k} data={d} />)}
      <div className="wrap pt-5"><Crumbs i={i} items={crumbs} /></div>
      <Gallery i={i} images={x.gallery?.length ? x.gallery : [x.image]} title={x.title} />
      <div className="wrap grid gap-10 pb-16 pt-8 lg:grid-cols-[1fr_380px]">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            {x.badge ? <span className="badge bg-accent-400 text-ink-900">{x.badge}</span> : null}
            <span className="badge badge-brand">{x.region === 'bd' ? t('Bangladesh', 'বাংলাদেশ') : t('International', 'আন্তর্জাতিক')}</span>
            {x.categories.map((k: string) => <span key={k} className="badge badge-gray">{catNames[k] ?? k}</span>)}
          </div>
          <h1 className="mt-3 text-[1.75rem] font-extrabold leading-tight sm:text-4xl">{x.title}</h1>
          <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-2 text-sm">
            <span className="flex items-center gap-1.5"><Stars i={i} rating={x.rating} /> <b>{i.d(x.rating)}</b> <a href="#reviews" className="link font-medium">({i.num(x.reviews_count)} {t('reviews', 'রিভিউ')})</a></span>
            <span className="flex items-center gap-1 muted"><Icon name="map-pin" className="h-4 w-4" /> {x.location}, {x.country}</span>
            {x.booked_this_week ? <span className="flex items-center gap-1 muted"><Icon name="flame" className="h-4 w-4 text-accent-500" /> {t('Booked', 'এই সপ্তাহে')} {i.d(x.booked_this_week)} {t('times this week', 'বার বুক হয়েছে')}</span> : null}
          </div>
          <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1"><CancelBadge policy={x.cancellation} /><span className="inline-flex items-center gap-1 text-xs font-semibold text-ink-600 dark:text-ink-300"><Icon name="zap" className="h-3.5 w-3.5 text-accent-500" /> {t('Instant confirmation', 'তাৎক্ষণিক নিশ্চিতকরণ')}</span><span className="inline-flex items-center gap-1 text-xs font-semibold text-ink-600 dark:text-ink-300"><Icon name="wallet" className="h-3.5 w-3.5 text-brand-600" /> {t('Reserve now, pay later', 'এখন রিজার্ভ, পরে পরিশোধ')}</span></div>
          <div className="mt-4 flex gap-2">
            <Wish i={i} id={slug} />
            <ShareButton className={ib} label={t('Copy link to share', 'শেয়ার করতে লিংক কপি করুন')} copied={t('Link copied', 'লিংক কপি হয়েছে')}><Icon name="share-2" className="h-4 w-4" /></ShareButton>
            <PrintButton className={ib} label={t('Print itinerary', 'ভ্রমণসূচি প্রিন্ট')}><Icon name="printer" className="h-4 w-4" /></PrintButton>
          </div>
          <QuickFacts items={[
            ['calendar-days', t('Duration', 'সময়কাল'), `${i.d(x.days)} ${t('days', 'দিন')} / ${i.d(x.nights)} ${t('nights', 'রাত')}`],
            ['users', t('Group size', 'দলের আকার'), `${i.d(x.group_size)} ${t('people', 'জন')}`],
            ['languages', t('Guide', 'গাইড'), t('Bangla & English', 'বাংলা ও ইংরেজি')],
            ['plane', t('Flights', 'ফ্লাইট'), x.includes_flight ? t('Included', 'অন্তর্ভুক্ত') : t('Not included', 'অন্তর্ভুক্ত নয়')],
            ['stamp', t('Visa', 'ভিসা'), x.includes_visa ? t('We assist', 'আমরা সহায়তা করি') : t('Not required', 'প্রয়োজন নেই')],
            ['rotate-ccw', t('Cancellation', 'বাতিল'), x.cancellation?.label ?? '—'],
          ]} />
          <SubNav i={i} items={[['overview', t('Overview', 'সংক্ষেপ')], ['itinerary', t('Itinerary', 'ভ্রমণসূচি')], ['inclusions', t('Inclusions', 'যা থাকছে')], ['dates', t('Dates & prices', 'তারিখ ও মূল্য')], ['map', t('Map', 'ম্যাপ')], ['reviews', t('Reviews', 'রিভিউ')], ['faq', t('FAQ', 'প্রশ্নোত্তর')]]} />
          <section id="overview" className="scroll-mt-32 pt-8">
            <h2 className="text-2xl font-bold">{t('Overview', 'সংক্ষেপ')}</h2>
            <p className="mt-3 leading-7 text-ink-600 dark:text-ink-300">{x.description}</p>
            <h3 className="mt-6 font-bold">{t('Highlights', 'হাইলাইটস')}</h3>
            <ul className="mt-3 grid gap-2 sm:grid-cols-2">
              {[...x.highlights, t('Meals for every diet, on request', 'অনুরোধে সব ধরনের খাদ্যাভ্যাসের খাবার')].map((h: string, k: number) => <li key={k} className="flex gap-2 rounded-xl bg-brand-50/70 p-3 text-sm dark:bg-brand-900/20"><Icon name="sparkles" className="mt-0.5 h-4 w-4 shrink-0 text-brand-600" />{h}</li>)}
            </ul>
          </section>
          <section id="itinerary" className="scroll-mt-32 pt-10">
            <div className="flex items-center justify-between"><h2 className="text-2xl font-bold">{t('Day-by-day itinerary', 'দিনভিত্তিক ভ্রমণসূচি')}</h2><ExpandAll target="itinerary" label={t('Expand all', 'সব খুলুন')} collapse={t('Collapse all', 'সব বন্ধ করুন')} /></div>
            <ol className="relative mt-5 space-y-3 before:absolute before:bottom-6 before:left-[19px] before:top-6 before:w-0.5 before:bg-brand-100 dark:before:bg-brand-900">
              {x.itinerary.map((d: any, k: number) => (
                <li key={k} className="relative pl-12">
                  <span className={`absolute left-0 top-3 grid h-10 w-10 place-items-center rounded-full ${k === 0 || k === x.itinerary.length - 1 ? 'bg-accent-400 text-ink-900' : 'bg-brand-700 text-white'} text-sm font-bold ring-4 ring-white dark:ring-ink-950`} aria-hidden="true">{i.d(k + 1)}</span>
                  <details className="card group" open={k === 0}>
                    <summary className="flex cursor-pointer list-none items-center justify-between gap-3 p-4"><span><span className="block text-xs font-bold uppercase tracking-wider text-brand-700 dark:text-brand-300">{t('Day', 'দিন')} {i.d(d.day ?? k + 1)}</span><span className="font-bold text-ink-900 dark:text-white">{d.title}</span></span><Icon name="chevron-down" className="h-5 w-5 shrink-0 transition group-open:rotate-180" /></summary>
                    <div className="border-t border-ink-100 px-4 pb-4 pt-3 text-sm leading-6 text-ink-600 dark:border-ink-800 dark:text-ink-300"><p>{d.body}</p>
                      <div className="mt-3 flex flex-wrap gap-2 text-xs">
                        {d.meals?.length ? <span className="badge badge-gray"><Icon name="utensils" className="h-3.5 w-3.5" /> {d.meals.map((m: string) => mealName[m] ?? m).join(' · ')}</span> : null}
                        {d.stay ? <span className="badge badge-gray"><Icon name="bed-double" className="h-3.5 w-3.5" /> {d.stay}</span> : null}
                      </div></div>
                  </details>
                </li>
              ))}
            </ol>
          </section>
          <section id="inclusions" className="scroll-mt-32 pt-10">
            <h2 className="text-2xl font-bold">{t("What's included", 'যা থাকছে ও যা থাকছে না')}</h2>
            <div className="mt-5 grid gap-4 sm:grid-cols-2">
              <div className="card p-5"><h3 className="flex items-center gap-2 font-bold text-emerald-700 dark:text-emerald-400"><Icon name="circle-check" className="h-5 w-5" /> {t('Included', 'অন্তর্ভুক্ত')}</h3><ul className="mt-3 space-y-2 text-sm">{x.inclusions.map((s: string, k: number) => <li key={k} className="flex gap-2"><Icon name="check" className="mt-0.5 h-4 w-4 shrink-0 text-emerald-700 dark:text-emerald-400" />{s}</li>)}</ul></div>
              <div className="card p-5"><h3 className="flex items-center gap-2 font-bold text-rose-700 dark:text-rose-400"><Icon name="circle-x" className="h-5 w-5" /> {t('Not included', 'অন্তর্ভুক্ত নয়')}</h3><ul className="mt-3 space-y-2 text-sm">{x.exclusions.map((s: string, k: number) => <li key={k} className="flex gap-2"><Icon name="x" className="mt-0.5 h-4 w-4 shrink-0 text-rose-500" />{s}</li>)}</ul></div>
            </div>
          </section>
          <section id="dates" className="scroll-mt-32 pt-10">
            <h2 className="text-2xl font-bold">{t('Departure dates & prices', 'যাত্রার তারিখ ও মূল্য')}</h2>
            <p className="mt-1 text-sm muted">{t('Prices per person on twin sharing, including VAT.', 'দুজনের রুমে জনপ্রতি মূল্য, ভ্যাটসহ।')}</p>
            <div className="relative mt-4 overflow-x-auto rounded-2xl border border-ink-100 dark:border-ink-800">
              <table className="table">
                <thead><tr><th scope="col">{t('Departure', 'যাত্রা')}</th><th scope="col" className="hidden sm:table-cell">{t('Return', 'ফেরা')}</th><th scope="col">{t('Seats', 'আসন')}</th><th scope="col">{t('Price', 'মূল্য')}</th><th scope="col"><span className="sr-only">{t('Action', 'অ্যাকশন')}</span></th></tr></thead>
                <tbody>{x.departures.map((d: any) => { const sold = d.seats_left <= 0 || d.status === 'sold_out'; return (
                  <tr key={d.id}><td className="font-semibold">{i.date(d.date)}</td><td className="hidden muted sm:table-cell">{i.date(d.return_date)}</td>
                    <td>{sold ? <span className="badge badge-gray">{t('Sold out', 'বিক্রি শেষ')}</span> : d.seats_left <= 4 ? <span className="badge badge-red">{i.d(d.seats_left)} {t('left', 'বাকি')}</span> : <span className="badge badge-green">{t('Available', 'খালি')}</span>}</td>
                    <td className="font-bold"><Price value={d.price} /></td>
                    <td className="text-right">{sold ? null : <a href={`${i.u('/booking')}?tour=${slug}&date=${d.date}`} className="btn btn-outline btn-sm">{t('Select', 'বাছাই')}</a>}</td></tr>
                ); })}</tbody>
              </table>
            </div>
          </section>
          <section id="map" className="scroll-mt-32 pt-10"><h2 className="mb-4 text-2xl font-bold">{t('Route map', 'রুট ম্যাপ')}</h2><RouteMap i={i} stops={x.route_stops?.length ? x.route_stops : [x.location]} query={`${x.location}, ${x.country}`} /></section>
          <ReviewsBlock i={i} r={x.reviews} subject={{ type: 'tour', slug }} />
          {faqs.length ? <section id="faq" className="scroll-mt-32 pt-10"><h2 className="mb-4 text-2xl font-bold">{t('Frequently asked questions', 'সাধারণ প্রশ্নোত্তর')}</h2><FaqList items={faqs} /></section> : null}
        </div>
        <aside className="hidden lg:block" aria-label={t('Book this tour', 'এই ট্যুর বুক করুন')}><div className="sticky top-24" id="book">{card('d')}</div></aside>
      </div>
      {x.similar?.length ? (
        <section className="border-t border-ink-100 bg-ink-50 py-14 dark:border-ink-800 dark:bg-ink-900/40">
          <div className="wrap"><SecHead eyebrow={t('You may also like', 'আপনার পছন্দ হতে পারে')} title={t('Similar tours', 'একই রকম ট্যুর')} link={i.u('/tours')} linkLabel={t('All tours', 'সব ট্যুর')} />
            <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">{x.similar.map((s: any) => <TourCard key={s.slug} i={i} x={s} />)}</div></div>
        </section>
      ) : null}
      <div className="fixed inset-x-0 bottom-16 z-30 border-t border-ink-100 bg-white/95 px-4 pb-7 pt-3 shadow-[0_-8px_24px_-12px_rgba(0,0,0,.2)] backdrop-blur dark:border-ink-800 dark:bg-ink-900/95 lg:hidden">
        <div className="mx-auto flex max-w-xl items-center justify-between gap-3">
          <div><p className="text-xs muted">{t('From, per person', 'শুরু, জনপ্রতি')}</p><p className="text-lg font-extrabold text-ink-900 dark:text-white"><Price value={x.price} /> {x.price_was ? <s className="text-xs font-normal text-ink-400"><Price value={x.price_was} /></s> : null}</p></div>
          <div className="flex gap-2"><a href={`https://wa.me/${c.whatsapp_number}`} className="btn btn-outline btn-sm" aria-label="WhatsApp" target="_blank" rel="noopener"><Icon name="whatsapp" className="h-4 w-4" /></a>
            <Sheet trigger={t('Check dates', 'তারিখ দেখুন')} triggerClass="btn btn-accent" title={t('Book this tour', 'এই ট্যুর বুক করুন')} closeLabel={t('Close', 'বন্ধ')} closeIcon={<Icon name="x" />}>{card('m')}</Sheet></div>
        </div>
      </div>
    </>
  );
}
