import type { Metadata } from 'next';
import { Icon } from '@/components/icons/Icon';
import { Price } from '@/components/client/Price';
import { CruiseBook } from '@/components/detail/MiniBook';
import { ReviewsBlock } from '@/components/detail/Reviews';
import { RouteMap } from '@/components/detail/RouteMap';
import { DIMMED_HERO_SIZES, Picture } from '@/components/ui/Picture';
import { CancelBadge, Crumbs, SecHead, Stars, type Crumb } from '@/components/ui/basics';
import { CruiseCard } from '@/components/ui/cards';
import { api, apiData } from '@/lib/api';
import type { Lang } from '@/lib/format';
import { getI18n } from '@/lib/i18n';
import { breadcrumbJsonLd, buildMetadata, JsonLd } from '@/lib/seo';
import { getSite, siteUrl } from '@/lib/site';

export async function generateStaticParams() {
  try { return (await api<{ data: { slug: string }[] }>('cruises', { lang: 'en', tags: ['cruises'], query: { per_page: 60 } })).data.map((d) => ({ slug: d.slug })); } catch { return []; }
}
const load = (slug: string, lang: Lang) => apiData<any>(`cruises/${slug}`, { lang, tags: ['cruises', `cruise:${slug}`, 'reviews'] });

export async function generateMetadata({ params }: PageProps<'/[lang]/cruises/[slug]'>): Promise<Metadata> {
  const { lang, slug } = (await params) as { lang: Lang; slug: string };
  const c = await load(slug, lang);
  return buildMetadata(lang, `/cruises/${slug}`, { title: c.title, description: c.description, image: c.image, seo: c.seo });
}

export default async function CruisePage({ params }: PageProps<'/[lang]/cruises/[slug]'>) {
  const { lang, slug } = (await params) as { lang: Lang; slug: string };
  const [c, i, site] = await Promise.all([load(slug, lang), getI18n(lang), getSite(lang)]);
  const t = i.t;
  const base = siteUrl(site);
  const commerce = site.settings.commerce ?? {};
  const deposit = commerce.deposit_pct ?? 30;
  const crumbs: Crumb[] = [[t('Home', 'হোম'), i.u('/')], [t('Cruises', 'ক্রুজ'), i.u('/cruises')], [c.title, i.u(`/cruises/${slug}`)]];
  const cabinIcon: Record<string, string> = { inside: 'bed-double', ocean: 'sunrise', balcony: 'sun', suite: 'crown' };
  const def = c.cabins.find((x: any) => x.code === 'ocean') ?? c.cabins[0];
  const pct = (p: number) => Math.round((p / (def?.price || 1) - 1) * 100);
  const cabins = c.cabins.map((x: any) => ({ code: x.code, price: x.price, label: x.code === def?.code ? x.name : `${x.name} (${pct(x.price) > 0 ? '+' : '−'}${i.d(Math.abs(pct(x.price)))}%)` }));
  const ports = c.ports_of_call?.length ? c.ports_of_call : c.route.map((p: string, k: number) => ({ day: k + 1, port: p }));
  const addons = (commerce.cruise_addons ?? []).map((a: any) => ({ code: a.code, label: a.label, price: a.price, per: a.per }));
  const ld = [breadcrumbJsonLd(base, crumbs), {
    '@context': 'https://schema.org', '@type': ['TouristTrip', 'Product'], name: c.title, description: c.description, image: c.image?.src, url: `${base}/${lang}/cruises/${slug}`, sku: slug,
    brand: { '@type': 'Brand', name: c.line }, itinerary: { '@type': 'ItemList', itemListElement: ports.map((p: any, k: number) => ({ '@type': 'ListItem', position: k + 1, name: p.port })) },
    aggregateRating: c.reviews_count ? { '@type': 'AggregateRating', ratingValue: c.rating, reviewCount: c.reviews_count, bestRating: 5 } : undefined,
    offers: { '@type': 'AggregateOffer', priceCurrency: 'BDT', lowPrice: Math.min(...c.cabins.map((x: any) => x.price)), highPrice: Math.max(...c.cabins.map((x: any) => x.price)), offerCount: c.sailings.length, availability: c.sailings.length ? 'https://schema.org/InStock' : 'https://schema.org/SoldOut' },
  }];
  const portNote = (k: number, n: number) => k === 0 ? t('Embark from 1:00 PM · welcome dinner & safety drill', 'দুপুর ১টা থেকে বোর্ডিং · স্বাগত ডিনার ও নিরাপত্তা মহড়া') : k === n - 1 ? t('Disembark after breakfast · airport transfer', 'নাশতার পর জাহাজ ত্যাগ · এয়ারপোর্ট ট্রান্সফার') : t('Arrive 8:00 AM, depart 6:00 PM · optional shore excursion', 'সকাল ৮টায় পৌঁছানো, সন্ধ্যা ৬টায় ছাড়া · ঐচ্ছিক তীর ভ্রমণ');
  return (
    <>
      {ld.map((d, k) => <JsonLd key={k} data={d} />)}
      <section className="relative isolate overflow-hidden bg-ink-950">
        <Picture img={c.image} alt={c.title} className="img-cover absolute inset-0 -z-10 opacity-60" priority sizes={DIMMED_HERO_SIZES} width={1600} height={1000} />
        <div className="absolute inset-0 -z-10 bg-gradient-to-t from-ink-950 via-ink-950/50 to-ink-950/20" />
        <div className="wrap py-10 md:py-16">
          <Crumbs i={i} items={crumbs} light />
          <div className="mt-5 flex flex-wrap gap-2"><span className="badge bg-white text-ink-800">{c.region_label}</span>{c.badge ? <span className="badge bg-accent-400 text-ink-900">{c.badge}</span> : null}</div>
          <h1 className="mt-3 max-w-4xl text-3xl font-extrabold text-white text-balance sm:text-5xl">{c.title}</h1>
          <div className="mt-4 flex flex-wrap items-center gap-x-5 gap-y-2 text-sm text-ink-200"><span className="inline-flex items-center gap-1.5"><Stars i={i} rating={c.rating} /> <b className="text-white">{i.d(c.rating)}</b> ({i.num(c.reviews_count)})</span><span className="inline-flex items-center gap-1.5"><Icon name="ship" className="h-4 w-4" /> {c.ship} · {c.line}</span><span className="inline-flex items-center gap-1.5"><Icon name="moon" className="h-4 w-4" /> {i.d(c.nights)} {t('nights', 'রাত')}</span><span className="inline-flex items-center gap-1.5"><Icon name="anchor" className="h-4 w-4" /> {t('From', 'যাত্রা:')} {c.depart_port}</span></div>
        </div>
      </section>
      <div className="wrap grid gap-10 py-10 lg:grid-cols-[1fr_380px]">
        <div className="min-w-0 space-y-12">
          <section><h2 className="text-2xl font-bold">{t('Route', 'রুট')}</h2>
            <div className="mt-5"><RouteMap i={i} stops={c.route} query={c.title} /></div>
            <ol className="mt-6 space-y-3">{ports.map((p: any, k: number) => <li key={k} className="flex gap-4 rounded-2xl border border-ink-100 p-4 dark:border-ink-800"><span className="grid h-12 w-16 shrink-0 place-items-center rounded-xl bg-brand-50 text-center text-xs font-bold text-brand-800 dark:bg-brand-900/30 dark:text-brand-300">{t('Day', 'দিন')}<br />{i.d(p.day)}</span><div><h3 className="font-bold">{p.port}</h3><p className="mt-0.5 text-sm muted">{p.body || portNote(k, ports.length)}</p></div></li>)}</ol>
          </section>
          <section><h2 className="text-2xl font-bold">{t('Cabins & prices', 'কেবিন ও মূল্য')}</h2>
            <div className="mt-5 grid gap-4 sm:grid-cols-3">{c.cabins.map((x: any) => { const pop = x.code === def?.code; return (
              <div key={x.code} className={`card p-5 ${pop ? 'ring-2 ring-brand-600' : ''}`}><span className="grid h-10 w-10 place-items-center rounded-xl bg-brand-50 text-brand-700 dark:bg-brand-900/40 dark:text-brand-300"><Icon name={cabinIcon[x.code] ?? 'bed-double'} className="h-5 w-5" /></span><h3 className="mt-3 font-bold">{x.name}</h3><p className="text-xs muted">{t('Twin sharing, per person', 'দুজনের কেবিন, জনপ্রতি')}</p><p className="mt-2 text-2xl font-extrabold"><Price value={x.price} /></p>{pop ? <span className="badge badge-brand mt-2">{t('Most popular', 'সবচেয়ে জনপ্রিয়')}</span> : null}</div>
            ); })}</div>
          </section>
          <section><h2 className="text-2xl font-bold">{t('Included', 'যা অন্তর্ভুক্ত')}</h2>
            <ul className="mt-4 grid gap-2 sm:grid-cols-2">{[...c.highlights, t('Port taxes & gratuities', 'বন্দর কর ও টিপস'), t('Return transfers to port', 'বন্দরে যাওয়া-আসার ট্রান্সফার'), t('Musafir travel kit', 'মুসাফির ট্রাভেল কিট')].map((h: string, k: number) => <li key={k} className="flex gap-2 text-sm"><Icon name="check" className="h-4 w-4 shrink-0 text-brand-600" /> {h}</li>)}</ul>
            <div className="mt-5 rounded-2xl bg-ink-50 p-4 text-sm dark:bg-ink-850"><p className="font-bold">{t('Cancellation policy', 'বাতিল নীতি')}</p><div className="mt-1"><CancelBadge policy={c.cancellation} /></div>
              <p className="mt-1 muted">{(c.cancellation?.rules ?? []).filter((r: any) => r.days_before > 0).map((r: any) => `${i.d(r.refund_pct)}% ${t('refund', 'রিফান্ড')} ${i.d(r.days_before)}+ ${t('days before sailing', 'দিন আগে')}`).join(' · ')}{(c.cancellation?.rules ?? []).length ? ` · ${t('non-refundable after that', 'এরপর অফেরতযোগ্য')}` : ''}</p></div>
          </section>
          <ReviewsBlock variant="card" limit={2} i={i} r={c.reviews} subject={{ type: 'cruise', slug }} title={t('Guest reviews', 'অতিথিদের রিভিউ')} defaults={{ cabin: 4.7, food: 4.8, entertainment: 4.9, value: 4.6 }} />
        </div>
        <aside className="lg:sticky lg:top-24 lg:self-start" id="book">
          <CruiseBook slug={slug} cabins={cabins} sailings={c.sailings} addons={addons} depositPct={deposit} booking={i.u('/booking')} minus={<Icon name="minus" className="h-4 w-4" />} plus={<Icon name="plus" className="h-4 w-4" />}
            l={{ cabin: t('Cabin', 'কেবিন'), sailing: t('Sailing date', 'যাত্রার তারিখ'), guests: t('Guests', 'অতিথি'), guestsSub: t('Max 4 per cabin', 'প্রতি কেবিনে সর্বোচ্চ ৪'), fewer: t('Fewer', 'কমান'), more: t('More', 'বাড়ান'), total: t('Total', 'মোট'), deposit: `${t('Deposit today', 'আজ অগ্রিম')} (${i.d(deposit)}%)`, book: t('Book this cruise', 'এই ক্রুজ বুক করুন') }}
            header={<div className="bg-gradient-to-br from-ink-900 to-brand-900 p-5 text-white"><p className="text-sm text-brand-200">{t('From, per person', 'শুরু, জনপ্রতি')}</p><p className="flex flex-wrap items-baseline gap-2"><span className="text-3xl font-extrabold"><Price value={c.price} /></span>{c.price_was ? <s className="text-ink-300"><Price value={c.price_was} /></s> : null}</p>{c.next_departure ? <p className="mt-1 text-sm text-ink-300">{t('Next sailing', 'পরবর্তী যাত্রা')}: {i.date(c.next_departure)}</p> : null}</div>}
            footer={<div className="text-center"><CancelBadge policy={c.cancellation} /></div>} />
        </aside>
      </div>
      {c.similar?.length ? <section className="border-t border-ink-100 bg-ink-50 py-14 dark:border-ink-800 dark:bg-ink-900/40"><div className="wrap"><SecHead eyebrow={t('More sailings', 'আরও ক্রুজ')} title={t('You may also like', 'আপনার পছন্দ হতে পারে')} link={i.u('/cruises')} linkLabel={t('All cruises', 'সব ক্রুজ')} /><div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">{c.similar.map((s: any) => <CruiseCard key={s.slug} i={i} c={s} />)}</div></div></section> : null}
      <div className="fixed inset-x-0 bottom-16 z-30 border-t border-ink-100 bg-white/95 px-3 pb-7 pt-3 backdrop-blur dark:border-ink-800 dark:bg-ink-900/95 lg:hidden"><div className="wrap flex items-center justify-between gap-3 !px-1"><div><p className="text-xs muted">{i.d(c.nights)} {t('nights', 'রাত')} · {c.ship}</p><p className="text-lg font-extrabold"><Price value={c.price} /></p></div><a href="#book" className="btn btn-accent">{t('Book now', 'বুক করুন')}</a></div></div>
    </>
  );
}
