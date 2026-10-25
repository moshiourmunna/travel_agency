import type { Metadata } from 'next';
import { QuickFilter } from '@/components/client/HomeBits';
import { ReviewDialog } from '@/components/detail/ReviewDialog';
import { RatingSummary } from '@/components/detail/Reviews';
import { Icon } from '@/components/icons/Icon';
import { Pagination } from '@/components/listing/Pagination';
import { PageHero, type Crumb } from '@/components/ui/basics';
import { ReviewCard } from '@/components/ui/cards';
import { api } from '@/lib/api';
import type { Lang } from '@/lib/format';
import { getI18n } from '@/lib/i18n';
import { getPage, pageMetadata } from '@/lib/page';
import { breadcrumbJsonLd, JsonLd } from '@/lib/seo';
import { getSite, siteUrl } from '@/lib/site';

export async function generateMetadata({ params, searchParams }: PageProps<'/[lang]/reviews'>): Promise<Metadata> {
  const sp = await searchParams;
  return pageMetadata((await params).lang as Lang, 'reviews', '/reviews', { noindex: !!sp.page && sp.page !== '1' });
}

export default async function ReviewsPage({ params, searchParams }: PageProps<'/[lang]/reviews'>) {
  const lang = (await params).lang as Lang;
  const sp = await searchParams;
  const pg = Math.max(1, Number(Array.isArray(sp.page) ? sp.page[0] : sp.page) || 1);
  const [i, page, res, site] = await Promise.all([getI18n(lang), getPage('reviews', lang), api<{ data: any[]; meta: any }>('reviews', { lang, tags: ['reviews'], query: { page: pg, per_page: 12 } }), getSite(lang)]);
  const t = i.t;
  const c: any = site.settings.company ?? {};
  const sum: any = site.settings.reviews?.summary ?? {};
  const platforms: any[] = site.settings.reviews?.platforms ?? [];
  const rating = Number(c.rating?.value ?? res.meta.average ?? 0);
  const count = Number(c.rating?.count ?? res.meta.total ?? 0);
  const crumbs: Crumb[] = [[t('Home', 'হোম'), i.u('/')], [t('Reviews', 'রিভিউ'), i.u('/reviews')]];
  const base = siteUrl(site);
  const ld = { '@context': 'https://schema.org', '@type': 'TravelAgency', name: c.name, url: base, aggregateRating: { '@type': 'AggregateRating', ratingValue: rating, reviewCount: count, bestRating: 5 },
    review: res.data.slice(0, 10).map((r) => ({ '@type': 'Review', author: { '@type': 'Person', name: r.name }, datePublished: r.date, reviewBody: r.body, reviewRating: { '@type': 'Rating', ratingValue: r.rating, bestRating: 5 } })) };
  return (
    <>
      <JsonLd data={breadcrumbJsonLd(base, crumbs)} />
      <JsonLd data={ld} />
      <PageHero i={i} title={page.title} sub={page.subtitle} crumbs={crumbs} image={page.image} />
      <section className="section"><div className="wrap">
        <div className="grid gap-6 lg:grid-cols-[1.4fr_1fr]">
          <RatingSummary i={i} rating={rating} count={count} histogram={sum.histogram ?? res.meta.histogram} recommend={sum.recommend ?? 0} scores={sum.scores ?? []} />
          <div className="card flex flex-col justify-between gap-4 p-6">
            <div><p className="text-sm muted">{t('Also rated on', 'অন্যান্য প্ল্যাটফর্মে রেটিং')}</p><ul className="mt-3 space-y-2 text-sm">{platforms.map((p) => (
              <li key={p.name} className="flex items-center justify-between"><a href={p.url} target="_blank" rel="noopener noreferrer" className="font-bold hover:text-brand-700">{p.name}</a><span className="inline-flex items-center gap-1"><Icon name="star" className="h-4 w-4 fill-current text-accent-400" /> {i.d(p.rating)} <span className="muted">({i.num(p.count)})</span></span></li>
            ))}</ul></div>
            <ReviewDialog subject={{ type: 'site', slug: 'musafir' }} loginHref={i.u('/login')} openIcon={<Icon name="pen-line" className="h-4 w-4" />} closeIcon={<Icon name="x" />} starIcon={<Icon name="star" className="h-7 w-7 fill-current" />} buttonClass="btn btn-primary"
              l={{ open: t('Write a review', 'রিভিউ লিখুন'), title: t('Write a review', 'রিভিউ লিখুন'), rating: t('Your rating', 'আপনার রেটিং'), ratingErr: t('Please choose a rating.', 'রেটিং দিন।'), titleLabel: t('Title', 'শিরোনাম'), titleErr: t('Add a short title.', 'ছোট একটি শিরোনাম দিন।'), body: t('Your experience', 'আপনার অভিজ্ঞতা'), bodyErr: t('Please write at least 20 characters.', 'কমপক্ষে ২০ অক্ষর লিখুন।'), cancel: t('Cancel', 'বাতিল'), submit: t('Submit review', 'রিভিউ জমা দিন'), close: t('Close', 'বন্ধ'), stars: t('stars', 'তারকা'), success: t('Thank you! Your review will appear after moderation.', 'ধন্যবাদ! যাচাইয়ের পর আপনার রিভিউ প্রকাশিত হবে।'), signin: t('Only travellers who completed a Musafir trip can review.', 'শুধু মুসাফিরের সাথে ট্রিপ সম্পন্ন করা ভ্রমণকারীরাই রিভিউ দিতে পারেন।'), signinCta: t('Sign in to continue', 'চালিয়ে যেতে সাইন ইন করুন'), failed: t('Something went wrong. Please try again.', 'কিছু একটা সমস্যা হয়েছে। আবার চেষ্টা করুন।') }} />
          </div>
        </div>
        <div className="mt-10">
          <QuickFilter label={t('Filter reviews', 'রিভিউ ফিল্টার')} rowClass="mb-6" chipsClass="flex flex-wrap gap-2" options={[{ value: 'all', label: t('All', 'সব') }, { value: '5', label: t('5 stars', '৫ তারকা') }, { value: '4', label: t('4 stars', '৪ তারকা') }, { value: 'bd', label: t('Domestic trips', 'দেশীয় ট্রিপ') }, { value: 'intl', label: t('International', 'আন্তর্জাতিক') }]}>
            <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">{res.data.map((r) => <div key={r.id} data-item data-cats={[r.rating, r.region].filter(Boolean).join(' ')}><ReviewCard i={i} r={r} /></div>)}</div>
          </QuickFilter>
          <Pagination i={i} path={i.u('/reviews')} params={{}} current={res.meta.page} last={res.meta.last_page} />
        </div>
      </div></section>
    </>
  );
}
