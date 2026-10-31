import type { Metadata } from 'next';
import { Icon } from '@/components/icons/Icon';
import { QuickFilter } from '@/components/client/HomeBits';
import { FaqList, PageHero, SecHead, type Crumb } from '@/components/ui/basics';
import { ActivityCard, TourCard } from '@/components/ui/cards';
import { api, apiData } from '@/lib/api';
import type { Lang } from '@/lib/format';
import { getI18n } from '@/lib/i18n';
import { breadcrumbJsonLd, buildMetadata, JsonLd } from '@/lib/seo';
import { getSite, siteUrl } from '@/lib/site';

// Slugs not known at build (new admin content, or a build without the API) render on first request, then cache (ISR).
// Explicit because the [lang] layout sets dynamicParams = false for the locale segment.
export const dynamicParams = true;

export async function generateStaticParams() {
  try { return (await api<{ data: { slug: string }[] }>('themes', { lang: 'en', tags: ['themes'] })).data.map((d) => ({ slug: d.slug })); } catch { return []; }
}
const load = (slug: string, lang: Lang) => apiData<any>(`themes/${slug}`, { lang, tags: ['themes', `theme:${slug}`, 'tours', 'activities'] });

export async function generateMetadata({ params }: PageProps<'/[lang]/holidays/[slug]'>): Promise<Metadata> {
  const { lang, slug } = (await params) as { lang: Lang; slug: string };
  const th = await load(slug, lang);
  return buildMetadata(lang, `/holidays/${slug}`, { title: th.name, description: th.tagline, image: th.image, seo: th.seo });
}

export default async function ThemePage({ params }: PageProps<'/[lang]/holidays/[slug]'>) {
  const { lang, slug } = (await params) as { lang: Lang; slug: string };
  const [th, i, site, faqs] = await Promise.all([load(slug, lang), getI18n(lang), getSite(lang), apiData<any[]>('faqs', { lang, tags: ['faqs'], query: { show_on: 'home' } })]);
  const t = i.t;
  const base = siteUrl(site);
  const crumbs: Crumb[] = [[t('Home', 'হোম'), i.u('/')], [t('Holidays', 'হলিডে'), i.u('/holidays')], [th.name, i.u(`/holidays/${slug}`)]];
  const list = { '@context': 'https://schema.org', '@type': 'ItemList', name: th.name, itemListElement: th.tours.map((x: any, k: number) => ({ '@type': 'ListItem', position: k + 1, url: `${base}/${lang}/tours/${x.slug}`, name: x.title })) };
  return (
    <>
      <JsonLd data={breadcrumbJsonLd(base, crumbs)} /><JsonLd data={list} />
      <PageHero i={i} title={th.name} sub={th.tagline} crumbs={crumbs} image={th.image} />
      <section className="border-b border-ink-100 dark:border-ink-800"><div className="wrap grid gap-4 py-6 sm:grid-cols-3">{(th.perks ?? []).map((p: string, k: number) => <div key={k} className="flex items-center gap-3"><span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-brand-50 text-brand-700 dark:bg-brand-900/40 dark:text-brand-300"><Icon name="sparkles" className="h-5 w-5" /></span><p className="text-sm font-semibold">{p}</p></div>)}</div></section>
      <section className="section"><div className="wrap">
        <QuickFilter label={t('Region', 'অঞ্চল')} rowClass="mb-6 flex flex-wrap items-center justify-between gap-3" chipsClass="flex gap-2" header={<h2 className="text-2xl font-bold">{i.d(th.tours.length)} {th.name} {t('trips', 'ট্রিপ')}</h2>}
          options={[{ value: 'all', label: t('All', 'সব') }, { value: 'bd', label: t('Bangladesh', 'বাংলাদেশ') }, { value: 'intl', label: t('International', 'আন্তর্জাতিক') }]}>
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">{th.tours.map((x: any) => <TourCard key={x.slug} i={i} x={x} />)}</div>
        </QuickFilter>
        {th.activities?.length ? <><h2 className="mt-14 text-2xl font-bold">{t('Add an experience', 'একটি অভিজ্ঞতা যোগ করুন')}</h2><div className="mt-5 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">{th.activities.map((a: any) => <ActivityCard key={a.slug} i={i} a={a} />)}</div></> : null}
      </div></section>
      <section className="pb-16"><div className="wrap grid gap-6 lg:grid-cols-[1fr_1.4fr]"><div><SecHead eyebrow={t('Good to know', 'জেনে রাখুন')} title={`${t('Questions about', 'প্রশ্নোত্তর:')} ${th.name}`} /></div><FaqList items={faqs.slice(0, 4)} /></div></section>
    </>
  );
}
