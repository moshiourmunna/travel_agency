import type { Metadata } from 'next';
import { Suspense } from 'react';
import { Icon } from '@/components/icons/Icon';
import { Filters, type Field } from '@/components/listing/Filters';
import { FilterDrawer, ListingGrid, SortSelect } from '@/components/listing/ListingBits';
import { Pagination } from '@/components/listing/Pagination';
import { PageHero, SecHead, type Crumb } from '@/components/ui/basics';
import { CruiseCard } from '@/components/ui/cards';
import { api } from '@/lib/api';
import type { Lang } from '@/lib/format';
import { getI18n } from '@/lib/i18n';
import { getPage, pageMetadata } from '@/lib/page';
import { breadcrumbJsonLd, JsonLd } from '@/lib/seo';
import { getSite, siteUrl } from '@/lib/site';

const one = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v) || undefined;

export async function generateMetadata({ params, searchParams }: PageProps<'/[lang]/cruises'>): Promise<Metadata> {
  return pageMetadata((await params).lang as Lang, 'cruises', '/cruises', { noindex: Object.keys(await searchParams).length > 0 });
}

export default async function CruisesPage({ params, searchParams }: PageProps<'/[lang]/cruises'>) {
  const lang = (await params).lang as Lang;
  const sp = await searchParams;
  const dur = one(sp.dur)?.split('-') ?? [];
  const [i, page, res, site] = await Promise.all([getI18n(lang), getPage('cruises', lang),
    api<{ data: any[]; meta: any }>('cruises', { lang, tags: ['cruises'], query: { region: one(sp.region), nights_min: dur[0], nights_max: dur[1], price_max: one(sp.maxprice), sort: one(sp.sort) ?? 'dep', page: one(sp.page) } }), getSite(lang)]);
  const t = i.t;
  const crumbs: Crumb[] = [[t('Home', 'হোম'), i.u('/')], [t('Cruises', 'ক্রুজ'), i.u('/cruises')]];
  const fields: Field[] = [
    { type: 'checks', name: 'region', label: t('Region', 'অঞ্চল'), options: Object.entries(res.meta.regions ?? {}).map(([value, label]) => ({ value, label: label as string })) },
    { type: 'radios', name: 'dur', label: t('Length', 'সময়কাল'), options: [{ value: '1-3', label: t('1–3 nights', '১–৩ রাত') }, { value: '4-5', label: t('4–5 nights', '৪–৫ রাত') }, { value: '6-14', label: t('6+ nights', '৬+ রাত') }] },
    { type: 'range', name: 'maxprice', label: t('Max per person', 'জনপ্রতি সর্বোচ্চ'), min: 20000, max: 200000, step: 5000, money: true },
  ];
  const labels = { aria: t('Filter cruises', 'ক্রুজ ফিল্টার'), clear: t('Reset', 'রিসেট'), show: t('Show results', 'ফলাফল দেখুন'), any: t('Any', 'যেকোনো') };
  const steps: [string, string, string][] = [
    ['ship', t('Choose ship & cabin', 'জাহাজ ও কেবিন বাছুন'), t('Inside, ocean-view or balcony — compare in one table.', 'ইনসাইড, ওশান-ভিউ বা ব্যালকনি — এক টেবিলে তুলনা।')],
    ['stamp', t('Visa & flights', 'ভিসা ও ফ্লাইট'), t('We file visas and book flights to the embarkation port.', 'ভিসা আবেদন ও বন্দর পর্যন্ত ফ্লাইট আমরাই করি।')],
    ['file-check-2', t('Boarding pack', 'বোর্ডিং প্যাক'), t('E-tickets, luggage tags and port guide 7 days before.', '৭ দিন আগে ই-টিকিট, লাগেজ ট্যাগ ও বন্দর গাইড।')],
    ['headset', t('24/7 at sea', 'সমুদ্রেও ২৪/৭'), t('WhatsApp support onboard and at every port.', 'জাহাজে ও প্রতিটি বন্দরে হোয়াটসঅ্যাপ সাপোর্ট।')],
  ];
  const flat = Object.fromEntries(Object.entries(sp).map(([k, v]) => [k, one(v)]));
  return (
    <>
      <JsonLd data={breadcrumbJsonLd(siteUrl(site), crumbs)} />
      <PageHero i={i} title={page.title} sub={page.subtitle} crumbs={crumbs} image={page.image} />
      <section className="py-10" id="clist">
        <div className="wrap grid gap-8 lg:grid-cols-[260px_1fr]">
          <aside className="hidden lg:block" aria-label={t('Filters', 'ফিল্টার')}><div className="card sticky top-24 p-5"><Suspense><Filters id="cfd" fields={fields} live labels={labels} search="" /></Suspense></div></aside>
          <div>
            <div className="mb-5 flex flex-wrap items-center justify-between gap-3"><p className="text-sm muted" aria-live="polite"><b className="text-ink-900 dark:text-white">{i.d(res.meta.total)}</b> {t('cruises', 'টি ক্রুজ')}</p>
              <div className="flex gap-2"><Suspense>
                <FilterDrawer title={t('Filters', 'ফিল্টার')} openLabel={t('Filters', 'ফিল্টার')} closeLabel={t('Close filters', 'ফিল্টার বন্ধ')} activeCount={fields.filter((f) => one(sp[f.name])).length} openIcon={<Icon name="sliders-horizontal" className="h-4 w-4" />} closeIcon={<Icon name="x" />}><Filters id="cfm" fields={fields} live={false} labels={labels} search="" /></FilterDrawer>
                <SortSelect id="csort" label={t('Sort by', 'সাজান')} options={[{ value: '', label: t('Departure date', 'যাত্রার তারিখ') }, { value: 'price-asc', label: t('Price: low to high', 'মূল্য: কম থেকে বেশি') }, { value: 'price-desc', label: t('Price: high to low', 'মূল্য: বেশি থেকে কম') }, { value: 'rating', label: t('Top rated', 'সেরা রেটিং') }, { value: 'duration', label: t('Shortest first', 'কম সময় আগে') }]} />
              </Suspense></div></div>
            <h2 className="sr-only">{t('All cruises', 'সব ক্রুজ')}</h2>
            {res.data.length ? <ListingGrid className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">{res.data.map((c) => <CruiseCard key={c.slug} i={i} c={c} />)}</ListingGrid>
              : <div className="card p-10 text-center"><p className="font-bold">{t('No cruises match your filters', 'আপনার ফিল্টারে কোনো ক্রুজ মেলেনি')}</p></div>}
            <Pagination i={i} path="/cruises" params={flat} current={res.meta.current_page} last={res.meta.last_page} />
          </div>
        </div>
      </section>
      <section className="section bg-ink-50 dark:bg-ink-900/50"><div className="wrap">
        <SecHead eyebrow={t('First cruise?', 'প্রথম ক্রুজ?')} title={t('How cruising with Musafir works', 'মুসাফিরের সাথে ক্রুজ যেভাবে হয়')} center />
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">{steps.map(([ic, ti, de]) => <div key={ti} className="card p-6"><span className="grid h-12 w-12 place-items-center rounded-2xl bg-brand-700 text-white"><Icon name={ic} className="h-6 w-6" /></span><h3 className="mt-4 font-bold">{ti}</h3><p className="mt-1 text-sm muted">{de}</p></div>)}</div>
      </div></section>
    </>
  );
}
