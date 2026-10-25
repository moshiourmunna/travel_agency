import type { Metadata } from 'next';
import Link from 'next/link';
import { QuickFilter } from '@/components/client/HomeBits';
import { DestCard } from '@/components/ui/cards';
import { PageHero, type Crumb } from '@/components/ui/basics';
import { apiData } from '@/lib/api';
import type { Lang } from '@/lib/format';
import { getI18n } from '@/lib/i18n';
import { getPage, pageMetadata } from '@/lib/page';
import { breadcrumbJsonLd, JsonLd } from '@/lib/seo';
import { getSite, siteUrl } from '@/lib/site';

export async function generateMetadata({ params }: PageProps<'/[lang]/destinations'>): Promise<Metadata> {
  return pageMetadata((await params).lang as Lang, 'destinations');
}

export default async function DestinationsPage({ params }: PageProps<'/[lang]/destinations'>) {
  const lang = (await params).lang as Lang;
  const [i, page, list, site] = await Promise.all([getI18n(lang), getPage('destinations', lang), apiData<any[]>('destinations', { lang, tags: ['destinations'] }), getSite(lang)]);
  const t = i.t;
  const crumbs: Crumb[] = [[t('Home', 'হোম'), i.u('/')], [t('Destinations', 'গন্তব্য'), i.u('/destinations')]];
  return (
    <>
      <JsonLd data={breadcrumbJsonLd(siteUrl(site), crumbs)} />
      <PageHero i={i} title={page.title} sub={page.subtitle} crumbs={crumbs} image={page.image} />
      <section className="section">
        <div className="wrap">
          <QuickFilter label={t('Filter destinations', 'গন্তব্য ফিল্টার')} rowClass="mb-8" options={[{ value: 'all', label: t('All destinations', 'সব গন্তব্য') }, { value: 'bd', label: t('Bangladesh', 'বাংলাদেশ') }, { value: 'intl', label: t('International', 'আন্তর্জাতিক') }]}>
            <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {list.map((d) => <div key={d.slug} data-item data-region={d.region}><DestCard i={i} d={d} /><p className="mt-3 line-clamp-2 px-1 text-sm muted">{d.excerpt}</p></div>)}
            </div>
          </QuickFilter>
        </div>
      </section>
      <section className="pb-16"><div className="wrap"><div className="flex flex-col items-start justify-between gap-5 rounded-3xl bg-brand-50 p-8 dark:bg-brand-900/30 md:flex-row md:items-center"><div><h2 className="text-2xl font-bold">{t("Can't decide? Let us plan it.", 'সিদ্ধান্ত নিতে পারছেন না? আমরা পরিকল্পনা করে দিই।')}</h2><p className="mt-1 muted">{t('Share your budget and dates — get 3 tailor-made options within 24 hours.', 'বাজেট ও তারিখ জানান — ২৪ ঘণ্টায় ৩টি কাস্টম অপশন পান।')}</p></div><Link href={i.u('/custom-tour')} className="btn btn-primary btn-lg">{t('Plan my trip', 'ট্যুর প্ল্যান করুন')}</Link></div></div></section>
    </>
  );
}
