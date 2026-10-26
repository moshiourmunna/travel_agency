import type { Metadata } from 'next';
import { Suspense } from 'react';
import { Icon } from '@/components/icons/Icon';
import type { Field } from '@/components/listing/Filters';
import { Filters } from '@/components/listing/Filters';
import { FilterDrawer, SortSelect } from '@/components/listing/ListingBits';
import { Pagination } from '@/components/listing/Pagination';
import { SearchHero, type Crumb } from '@/components/ui/basics';
import { HotelCard } from '@/components/ui/cards';
import { api } from '@/lib/api';
import type { Lang } from '@/lib/format';
import { getI18n, type I18n } from '@/lib/i18n';
import { getPage, pageMetadata } from '@/lib/page';
import { breadcrumbJsonLd, JsonLd } from '@/lib/seo';
import { getSite, siteUrl } from '@/lib/site';

type SP = Record<string, string | string[] | undefined>;
const one = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v) || undefined;
const iso = (d: Date) => d.toISOString().slice(0, 10);
const plusDays = (n: number) => { const d = new Date(); d.setDate(d.getDate() + n); return d; };

export async function generateMetadata({ params, searchParams }: PageProps<'/[lang]/hotels'>): Promise<Metadata> {
  return pageMetadata((await params).lang as Lang, 'hotels', '/hotels', { noindex: Object.keys(await searchParams).length > 0 });
}

function fields(i: I18n): Field[] {
  const t = i.t;
  const star = <Icon name="star" className="inline h-3.5 w-3.5 fill-current" />;
  return [
    { type: 'search', name: 'q', label: t('Property name', 'প্রপার্টির নাম'), placeholder: t('e.g. Ocean Pearl', 'যেমন ওশান পার্ল') },
    { type: 'chips', name: 'stars', label: t('Star rating', 'তারকা রেটিং'), options: [5, 4, 3].map((n) => ({ value: String(n), label: i.d(n), icon: star })) },
    { type: 'radios', name: 'rating', label: t('Guest rating', 'অতিথি রেটিং'), options: [{ value: '9', label: t('Excellent 9+', 'চমৎকার ৯+') }, { value: '8.5', label: t('Very good 8.5+', 'খুব ভালো ৮.৫+') }] },
    { type: 'range', name: 'maxprice', label: t('Max per night', 'প্রতি রাত সর্বোচ্চ'), min: 5000, max: 60000, step: 500, money: true },
    { type: 'toggle', name: 'free', label: t('Free cancellation', 'ফ্রি বাতিল') },
    { type: 'toggle', name: 'breakfast', label: t('Breakfast included', 'নাশতা অন্তর্ভুক্ত') },
  ];
}

export default async function HotelsPage({ params, searchParams }: PageProps<'/[lang]/hotels'>) {
  const lang = (await params).lang as Lang;
  const sp: SP = await searchParams;
  const [i, page, res, site] = await Promise.all([getI18n(lang), getPage('hotels', lang),
    api<{ data: any[]; meta: any }>('hotels', { lang, tags: ['hotels'], query: { q: one(sp.q), stars: one(sp.stars), rating: one(sp.rating), price_max: one(sp.maxprice), refundable: one(sp.free) ? 1 : undefined, breakfast: one(sp.breakfast) ? 1 : undefined, sort: one(sp.sort), page: one(sp.page), per_page: 24 } }),
    getSite(lang)]);
  const t = i.t;
  const crumbs: Crumb[] = [[t('Home', 'হোম'), i.u('/')], [t('Hotels', 'হোটেল'), i.u('/hotels')]];
  const fs = fields(i);
  const labels = { aria: t('Filter hotels', 'হোটেল ফিল্টার'), clear: t('Reset', 'রিসেট'), show: t('Show results', 'ফলাফল দেখুন'), any: t('Any', 'যেকোনো') };
  const active = fs.filter((f) => one(sp[f.name])).length;
  const checkin = one(sp.in) ?? iso(plusDays(30));
  const checkout = one(sp.out) ?? iso(plusDays(33));
  const flat = Object.fromEntries(Object.entries(sp).map(([k, v]) => [k, one(v)]));
  const guests: [string, string][] = [['1-2', t('2 adults · 1 room', '২ প্রাপ্তবয়স্ক · ১ রুম')], ['1-3', t('2 adults, 1 child · 1 room', '২ প্রাপ্তবয়স্ক, ১ শিশু · ১ রুম')], ['2-4', t('4 adults · 2 rooms', '৪ প্রাপ্তবয়স্ক · ২ রুম')]];
  return (
    <>
      <JsonLd data={breadcrumbJsonLd(siteUrl(site), crumbs)} />
      <SearchHero i={i} title={page.title} sub={page.subtitle} crumbs={crumbs} image={page.image}>
        <form method="get" action={i.u('/hotels')} role="search" className="mt-6 grid gap-3 rounded-3xl bg-white p-4 shadow-xl dark:bg-ink-900 sm:p-5 md:grid-cols-2 lg:grid-cols-[2fr_1fr_1fr_1fr_auto] lg:items-end">
          <div><label className="label" htmlFor="ht-where">{t('City, hotel or area', 'শহর, হোটেল বা এলাকা')}</label><input id="ht-where" name="q" className="input" defaultValue={one(sp.q) ?? ''} placeholder={t("e.g. Cox's Bazar", 'যেমন কক্সবাজার')} /></div>
          <div><label className="label" htmlFor="ht-in">{t('Check-in', 'চেক-ইন')}</label><input id="ht-in" name="in" type="date" className="input" min={iso(new Date())} defaultValue={checkin} /></div>
          <div><label className="label" htmlFor="ht-out">{t('Check-out', 'চেক-আউট')}</label><input id="ht-out" name="out" type="date" className="input" min={iso(plusDays(1))} defaultValue={checkout} /></div>
          <div><label className="label" htmlFor="ht-g">{t('Guests & rooms', 'অতিথি ও রুম')}</label><select id="ht-g" name="guests" className="input" defaultValue={one(sp.guests) ?? '1-2'}>{guests.map(([v, l]) => <option key={v} value={v}>{l}</option>)}</select></div>
          <button className="btn btn-accent h-[46px]"><Icon name="search" className="h-4 w-4" /> {t('Search', 'খুঁজুন')}</button>
        </form>
      </SearchHero>
      <section className="py-10" id="hlist">
        <div className="wrap grid gap-8 lg:grid-cols-[260px_1fr]">
          <aside className="hidden lg:block" aria-label={t('Filters', 'ফিল্টার')}><div className="card sticky top-24 p-5"><Suspense><Filters id="hfd" fields={fs} live labels={labels} search={t('Search', 'খুঁজুন')} /></Suspense></div></aside>
          <div>
            <div className="mb-5 flex flex-wrap items-center justify-between gap-3"><p className="text-sm muted" aria-live="polite"><b className="text-ink-900 dark:text-white">{i.d(res.meta.total)}</b> {t('properties', 'টি প্রপার্টি')}</p>
              <div className="flex gap-2"><Suspense>
                <FilterDrawer title={t('Filters', 'ফিল্টার')} openLabel={t('Filters', 'ফিল্টার')} closeLabel={t('Close filters', 'ফিল্টার বন্ধ')} activeCount={active} openIcon={<Icon name="sliders-horizontal" className="h-4 w-4" />} closeIcon={<Icon name="x" />}>
                  <Filters id="hfm" fields={fs} live={false} labels={labels} search={t('Search', 'খুঁজুন')} />
                </FilterDrawer>
                <SortSelect id="hsort" label={t('Sort by', 'সাজান')} options={[{ value: '', label: t('Recommended', 'প্রস্তাবিত') }, { value: 'price-asc', label: t('Price: low to high', 'মূল্য: কম থেকে বেশি') }, { value: 'price-desc', label: t('Price: high to low', 'মূল্য: বেশি থেকে কম') }, { value: 'rating', label: t('Guest rating', 'অতিথি রেটিং') }]} />
              </Suspense></div></div>
            <h2 className="sr-only">{t('All hotels', 'সব হোটেল')}</h2>
            {res.data.length ? <div className="space-y-5">{res.data.map((h) => <HotelCard key={h.slug} i={i} h={h} />)}</div>
              : <div className="card p-10 text-center"><p className="font-bold">{t('No hotels match your filters', 'আপনার ফিল্টারে কোনো হোটেল মেলেনি')}</p></div>}
            <Pagination i={i} path="/hotels" params={flat} current={res.meta.current_page} last={res.meta.last_page} />
          </div>
        </div>
      </section>
    </>
  );
}
