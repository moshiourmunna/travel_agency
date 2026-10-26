import type { Metadata } from 'next';
import { Suspense } from 'react';
import { Icon } from '@/components/icons/Icon';
import { ActivityFilters } from '@/components/listing/ActivityFilters';
import { ListingGrid, SortSelect } from '@/components/listing/ListingBits';
import { Pagination } from '@/components/listing/Pagination';
import { PageHero, type Crumb } from '@/components/ui/basics';
import { ActivityCard } from '@/components/ui/cards';
import { api } from '@/lib/api';
import type { Lang } from '@/lib/format';
import { getI18n } from '@/lib/i18n';
import { getPage, pageMetadata } from '@/lib/page';
import { breadcrumbJsonLd, JsonLd } from '@/lib/seo';
import { getSite, siteUrl } from '@/lib/site';

const one = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v) || undefined;

export async function generateMetadata({ params, searchParams }: PageProps<'/[lang]/activities'>): Promise<Metadata> {
  return pageMetadata((await params).lang as Lang, 'activities', '/activities', { noindex: Object.keys(await searchParams).length > 0 });
}

export default async function ActivitiesPage({ params, searchParams }: PageProps<'/[lang]/activities'>) {
  const lang = (await params).lang as Lang;
  const sp = await searchParams;
  const [i, page, res, site] = await Promise.all([getI18n(lang), getPage('activities', lang),
    api<{ data: any[]; meta: any }>('activities', { lang, tags: ['activities'], query: { q: one(sp.q), category: one(sp.cat), rating: one(sp.rating), free_cancel: one(sp.free) ? 1 : undefined, price_max: one(sp.maxprice), destination: one(sp.dest), sort: one(sp.sort), page: one(sp.page) } }), getSite(lang)]);
  const t = i.t;
  const crumbs: Crumb[] = [[t('Home', 'হোম'), i.u('/')], [t('Activities', 'অ্যাক্টিভিটি'), i.u('/activities')]];
  const cats = res.meta.categories as { key: string; icon: string; label: string }[];
  const icons: Record<string, React.ReactNode> = Object.fromEntries(cats.map((c) => [c.key, <Icon key={c.key} name={c.icon} className="h-4 w-4" />]));
  icons.__free = <Icon name="circle-check" className="h-4 w-4 text-emerald-700 dark:text-emerald-400" />;
  const perks: [string, string, string][] = [
    ['zap', t('Instant confirmation', 'তাৎক্ষণিক নিশ্চিতকরণ'), t('Voucher on your phone in seconds.', 'সেকেন্ডেই ফোনে ভাউচার।')],
    ['circle-check', t('Free cancellation', 'ফ্রি বাতিল'), t('Most experiences: full refund up to 24 h before.', 'বেশিরভাগ অভিজ্ঞতায় ২৪ ঘণ্টা আগে পর্যন্ত পূর্ণ রিফান্ড।')],
    ['shield-check', t('Vetted local partners', 'যাচাইকৃত স্থানীয় পার্টনার'), t('Licensed operators, insured and reviewed by real guests.', 'লাইসেন্সপ্রাপ্ত, বিমাকৃত ও আসল অতিথিদের রিভিউকৃত অপারেটর।')],
  ];
  const flat = Object.fromEntries(Object.entries(sp).map(([k, v]) => [k, one(v)]));
  return (
    <>
      <JsonLd data={breadcrumbJsonLd(siteUrl(site), crumbs)} />
      <PageHero i={i} title={page.title} sub={page.subtitle} crumbs={crumbs} image={page.image} />
      <section className="py-10" id="alist">
        <div className="wrap">
          <Suspense><ActivityFilters cats={cats} icons={icons} l={{ aria: t('Filter activities', 'অ্যাক্টিভিটি ফিল্টার'), cats: t('Categories', 'ক্যাটাগরি'), search: t('Search activities', 'অ্যাক্টিভিটি খুঁজুন'), placeholder: t('City or activity…', 'শহর বা অ্যাক্টিভিটি…'), rating: t('Rating', 'রেটিং'), any: t('Any rating', 'যেকোনো রেটিং'), free: t('Free cancellation only', 'শুধু ফ্রি বাতিল'), max: t('Max price', 'সর্বোচ্চ মূল্য') }} /></Suspense>
          <div className="mb-5 mt-8 flex flex-wrap items-center justify-between gap-3"><p className="text-sm muted" aria-live="polite"><b className="text-ink-900 dark:text-white">{i.d(res.meta.total)}</b> {t('experiences', 'টি অভিজ্ঞতা')}</p>
            <div><Suspense><SortSelect id="asort" label={t('Sort by', 'সাজান')} options={[{ value: '', label: t('Recommended', 'প্রস্তাবিত') }, { value: 'price-asc', label: t('Price: low to high', 'মূল্য: কম থেকে বেশি') }, { value: 'rating', label: t('Top rated', 'সেরা রেটিং') }]} /></Suspense></div></div>
          <h2 className="sr-only">{t('All activities', 'সব অ্যাক্টিভিটি')}</h2>
          {res.data.length ? <ListingGrid className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">{res.data.map((a) => <ActivityCard key={a.slug} i={i} a={a} />)}</ListingGrid>
            : <div className="card p-10 text-center"><p className="font-bold">{t('No activities match', 'কোনো অ্যাক্টিভিটি মেলেনি')}</p></div>}
          <Pagination i={i} path="/activities" params={flat} current={res.meta.current_page} last={res.meta.last_page} />
        </div>
      </section>
      <section className="pb-16"><div className="wrap grid gap-4 rounded-3xl bg-ink-50 p-6 dark:bg-ink-900 sm:grid-cols-3 sm:p-8">{perks.map(([ic, ti, de]) => <div key={ti} className="flex gap-3"><span className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-white text-brand-700 shadow-sm dark:bg-ink-800 dark:text-brand-300"><Icon name={ic} className="h-5 w-5" /></span><div><h2 className="font-bold">{ti}</h2><p className="text-sm muted">{de}</p></div></div>)}</div></section>
    </>
  );
}
