import type { Metadata } from 'next';
import Link from 'next/link';
import { Icon } from '@/components/icons/Icon';
import { Price } from '@/components/client/Price';
import { Picture } from '@/components/ui/Picture';
import { PageHero, type Crumb } from '@/components/ui/basics';
import { apiData } from '@/lib/api';
import type { Lang } from '@/lib/format';
import { getI18n } from '@/lib/i18n';
import { getPage, pageMetadata } from '@/lib/page';
import { breadcrumbJsonLd, JsonLd } from '@/lib/seo';
import { getSite, siteUrl } from '@/lib/site';

export async function generateMetadata({ params }: PageProps<'/[lang]/holidays'>): Promise<Metadata> {
  return pageMetadata((await params).lang as Lang, 'holidays');
}

export default async function HolidaysPage({ params }: PageProps<'/[lang]/holidays'>) {
  const lang = (await params).lang as Lang;
  const [i, page, themes, site] = await Promise.all([getI18n(lang), getPage('holidays', lang), apiData<any[]>('themes', { lang, tags: ['themes', 'tours'] }), getSite(lang)]);
  const t = i.t;
  const crumbs: Crumb[] = [[t('Home', 'হোম'), i.u('/')], [t('Holidays', 'হলিডে'), i.u('/holidays')]];
  return (
    <>
      <JsonLd data={breadcrumbJsonLd(siteUrl(site), crumbs)} />
      <PageHero i={i} title={page.title} sub={page.subtitle} crumbs={crumbs} image={page.image} />
      <section className="section"><div className="wrap grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {themes.map((th) => (
          <Link key={th.slug} href={i.u(`/holidays/${th.slug}`)} className="card card-hover group overflow-hidden">
            <div className="relative aspect-[16/10] overflow-hidden"><Picture img={th.image} alt="" className="img-cover transition duration-700 group-hover:scale-105" /><span className="absolute left-4 top-4 grid h-11 w-11 place-items-center rounded-2xl bg-white/90 text-brand-700 shadow"><Icon name={th.icon} className="h-5 w-5" /></span></div>
            <div className="p-5"><h2 className="text-xl font-bold">{th.name}</h2><p className="mt-1 text-sm muted">{th.tagline}</p>
              <p className="mt-4 flex items-center justify-between text-sm"><span><b>{i.d(th.tours_count)}</b> {t('trips', 'টি ট্রিপ')} · {t('from', 'শুরু')} <b><Price value={th.price_from ?? 0} /></b></span><span className="link inline-flex items-center gap-1">{t('Explore', 'দেখুন')} <Icon name="arrow-right" className="h-4 w-4" /></span></p></div>
          </Link>
        ))}
      </div></section>
      <section className="pb-16"><div className="wrap"><div className="flex flex-col items-start justify-between gap-5 rounded-3xl bg-gradient-to-r from-brand-800 to-brand-600 p-8 text-white md:flex-row md:items-center"><div><h2 className="text-2xl font-bold">{t('Mix themes in one trip', 'এক ট্রিপে একাধিক থিম')}</h2><p className="mt-1 text-brand-100">{t('Beach + adventure? Family + culture? Build it day by day in our trip planner.', 'সৈকত + অ্যাডভেঞ্চার? পরিবার + সংস্কৃতি? আমাদের ট্রিপ প্ল্যানারে দিন ধরে সাজান।')}</p></div><Link href={i.u('/trip-planner')} className="btn btn-accent btn-lg"><Icon name="route" className="h-5 w-5" /> {t('Open trip planner', 'ট্রিপ প্ল্যানার খুলুন')}</Link></div></div></section>
    </>
  );
}
