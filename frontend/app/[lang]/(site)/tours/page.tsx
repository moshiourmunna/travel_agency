import type { Metadata } from 'next';
import Link from 'next/link';
import { Suspense } from 'react';
import { Icon } from '@/components/icons/Icon';
import { CompareBar } from '@/components/listing/CompareBar';
import { Filters, type Field } from '@/components/listing/Filters';
import { FilterDrawer, ListingGrid, SortSelect, ViewToggle } from '@/components/listing/ListingBits';
import { Pagination } from '@/components/listing/Pagination';
import { PageHero, type Crumb } from '@/components/ui/basics';
import { TourCard } from '@/components/ui/cards';
import { api } from '@/lib/api';
import type { Lang } from '@/lib/format';
import { getI18n, type I18n } from '@/lib/i18n';
import { fill, getPage, pageMetadata } from '@/lib/page';
import { breadcrumbJsonLd, JsonLd } from '@/lib/seo';
import { getSite, siteUrl } from '@/lib/site';
import type { TourCard as Tour } from '@/lib/types';

type SP = Record<string, string | string[] | undefined>;
const one = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v) || undefined;

export async function generateMetadata({ params, searchParams }: PageProps<'/[lang]/tours'>): Promise<Metadata> {
  const lang = (await params).lang as Lang;
  const sp = await searchParams;
  // Filtered/sorted/paged variants are noindex (canonical stays /tours) to avoid thin duplicates.
  return pageMetadata(lang, 'tours', '/tours', { noindex: Object.keys(sp).some((k) => !['region', 'cat', 'type'].includes(k)) });
}

/** Mockup URL params → API params. */
function apiQuery(sp: SP) {
  const dur = one(sp.dur)?.split('-') ?? [];
  return {
    q: one(sp.q), region: one(sp.region), category: one(sp.cat) ?? one(sp.type) ?? one(sp.theme), destination: one(sp.dest),
    price_max: one(sp.maxprice), days_min: dur[0], days_max: dur[1], rating: one(sp.rating),
    sort: one(sp.sort) === 'pop' ? undefined : one(sp.sort), page: one(sp.page), per_page: 24,
  };
}

function filterFields(i: I18n, meta: any): Field[] {
  const t = i.t;
  return [
    { type: 'search', name: 'q', label: t('Search', 'খুঁজুন'), placeholder: t('Destination or tour name', 'গন্তব্য বা ট্যুরের নাম') },
    { type: 'checks', name: 'region', label: t('Region', 'অঞ্চল'), options: [{ value: 'bd', label: t('Bangladesh', 'বাংলাদেশ') }, { value: 'intl', label: t('International', 'আন্তর্জাতিক') }] },
    { type: 'chips', name: 'cat', label: t('Travel style', 'ভ্রমণের ধরন'), options: (meta.categories ?? []).filter((c: any) => c.slug !== 'cruise').map((c: any) => ({ value: c.slug, label: c.name })) },
    { type: 'range', name: 'maxprice', label: t('Max budget per person', 'জনপ্রতি সর্বোচ্চ বাজেট'), min: 5000, max: 200000, step: 5000, money: true },
    { type: 'radios', name: 'dur', label: t('Duration', 'সময়কাল'), options: [{ value: '1-3', label: t('1–3 days', '১–৩ দিন') }, { value: '4-6', label: t('4–6 days', '৪–৬ দিন') }, { value: '7-30', label: t('7+ days', '৭+ দিন') }] },
    { type: 'radios', name: 'rating', label: t('Guest rating', 'অতিথি রেটিং'), options: [{ value: '4.5', label: t('4.5 & up', '৪.৫ ও তার বেশি') }, { value: '4.8', label: t('4.8 & up', '৪.৮ ও তার বেশি') }] },
  ];
}

export default async function ToursPage({ params, searchParams }: PageProps<'/[lang]/tours'>) {
  const lang = (await params).lang as Lang;
  const sp = await searchParams;
  if (sp.type && !sp.cat) sp.cat = sp.type; // legacy ?type=honeymoon
  if (sp.theme && !sp.cat) sp.cat = sp.theme;
  const [i, page, res, all, site] = await Promise.all([
    getI18n(lang), getPage('tours', lang),
    api<{ data: Tour[]; meta: any }>('tours', { lang, tags: ['tours'], query: apiQuery(sp) }),
    api<{ meta: { total: number } }>('tours', { lang, tags: ['tours'], query: { per_page: 1 } }),
    getSite(lang),
  ]);
  const t = i.t;
  const fields = filterFields(i, res.meta);
  const active = fields.filter((f) => one(sp[f.name])).length;
  const labels = { aria: t('Filter tours', 'ট্যুর ফিল্টার'), clear: t('Clear all', 'সব মুছুন'), show: t('Show results', 'ফলাফল দেখুন'), any: t('Any', 'যেকোনো') };
  const crumbs: Crumb[] = [[t('Home', 'হোম'), i.u('/')], [t('Tours', 'ট্যুর'), i.u('/tours')]];
  const base = siteUrl(site);
  const listLd = {
    '@context': 'https://schema.org', '@type': 'ItemList', name: page.title, numberOfItems: res.meta.total,
    itemListElement: res.data.map((x, k) => ({ '@type': 'ListItem', position: k + 1, url: `${base}/${lang}/tours/${x.slug}`, name: x.title })),
  };
  const flat = Object.fromEntries(Object.entries(sp).map(([k, v]) => [k, one(v)]));
  return (
    <>
      <JsonLd data={breadcrumbJsonLd(base, crumbs)} />
      <JsonLd data={listLd} />
      <PageHero i={i} title={page.title} sub={fill(page.subtitle, { count: i.d(all.meta.total) })} crumbs={crumbs} image={page.image} />
      <section className="py-10 md:py-14" id="listing">
        <div className="wrap grid gap-8 lg:grid-cols-[280px_1fr]">
          <aside className="hidden lg:block" aria-label={t('Filters', 'ফিল্টার')}><div className="card sticky top-24 p-5"><Suspense><Filters id="fd" fields={fields} live labels={labels} search={t('Search', 'খুঁজুন')} /></Suspense></div></aside>
          <div>
            <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
              <p className="text-sm muted" aria-live="polite"><b className="text-ink-900 dark:text-white">{i.d(res.meta.total)}</b> {t('tours found', 'টি ট্যুর পাওয়া গেছে')}</p>
              <div className="flex items-center gap-2">
                <Suspense>
                  <FilterDrawer title={t('Filters', 'ফিল্টার')} openLabel={t('Filters', 'ফিল্টার')} closeLabel={t('Close filters', 'ফিল্টার বন্ধ')} activeCount={active} openIcon={<Icon name="sliders-horizontal" className="h-4 w-4" />} closeIcon={<Icon name="x" />}>
                    <Filters id="fm" fields={fields} live={false} labels={labels} search={t('Search', 'খুঁজুন')} />
                  </FilterDrawer>
                  <SortSelect id="sort" label={t('Sort by', 'সাজান')} options={[{ value: '', label: t('Most popular', 'সবচেয়ে জনপ্রিয়') }, { value: 'price-asc', label: t('Price: low to high', 'মূল্য: কম থেকে বেশি') }, { value: 'price-desc', label: t('Price: high to low', 'মূল্য: বেশি থেকে কম') }, { value: 'rating', label: t('Top rated', 'সেরা রেটিং') }, { value: 'duration', label: t('Shortest first', 'কম দিনের আগে') }]} />
                </Suspense>
                <ViewToggle label={t('View', 'ভিউ')} grid={t('Grid view', 'গ্রিড ভিউ')} list={t('List view', 'লিস্ট ভিউ')} gridIcon={<Icon name="layout-grid" className="h-4 w-4" />} listIcon={<Icon name="list" className="h-4 w-4" />} />
              </div>
            </div>
            <h2 className="sr-only">{t('All tour packages', 'সব ট্যুর প্যাকেজ')}</h2>
            {res.data.length ? (
              <ListingGrid className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3" listClass="!grid-cols-1">
                {res.data.map((x) => <TourCard key={x.slug} i={i} x={x} />)}
              </ListingGrid>
            ) : (
              <div className="card mt-4 p-10 text-center"><span className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-ink-100 dark:bg-ink-800"><Icon name="search-x" className="h-6 w-6" /></span><p className="mt-3 font-bold">{t('No tours match your filters', 'আপনার ফিল্টারে কোনো ট্যুর মেলেনি')}</p><p className="text-sm muted">{t('Try widening the budget or clearing a filter.', 'বাজেট বাড়িয়ে বা একটি ফিল্টার সরিয়ে দেখুন।')}</p><Link href={i.u('/custom-tour')} className="btn btn-primary mt-4">{t('Request a custom tour', 'কাস্টম ট্যুরের অনুরোধ')}</Link></div>
            )}
            <Pagination i={i} path="/tours" params={flat} current={res.meta.current_page} last={res.meta.last_page} />
          </div>
        </div>
      </section>
      <CompareBar label={t('selected to compare', 'টি তুলনার জন্য নির্বাচিত')} clear={t('Clear', 'মুছুন')} go={t('Compare now', 'এখনই তুলনা করুন')} href={i.u('/compare')} />
    </>
  );
}
