import type { Metadata } from 'next';
import { Sections } from '@/components/home/Sections';
import { apiData } from '@/lib/api';
import type { Lang } from '@/lib/format';
import { getI18n } from '@/lib/i18n';
import { buildMetadata, JsonLd } from '@/lib/seo';
import { getSite, siteUrl } from '@/lib/site';

type Home = { title: string; subtitle?: string; sections: any[]; seo: any };
const load = (lang: Lang) => apiData<Home>('home', { lang, tags: ['pages', 'page:home', 'tours', 'destinations', 'offers', 'themes', 'cruises', 'activities', 'reviews', 'posts', 'faqs'] });

export async function generateMetadata({ params }: PageProps<'/[lang]'>): Promise<Metadata> {
  const lang = (await params).lang as Lang;
  const home = await load(lang);
  const hero = home.sections.find((s) => s.type === 'hero');
  return buildMetadata(lang, '/', { title: home.title, description: hero?.data?.subtitle, image: hero?.data?.bg_image, seo: home.seo, absoluteTitle: true });
}

export default async function HomePage({ params }: PageProps<'/[lang]'>) {
  const lang = (await params).lang as Lang;
  const [home, i, site] = await Promise.all([load(lang), getI18n(lang), getSite(lang)]);
  const base = siteUrl(site);
  const ld = {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    '@id': `${base}/#website`,
    url: `${base}/${lang}`,
    name: lang === 'bn' ? 'মুসাফির' : 'Musafir',
    inLanguage: lang === 'bn' ? 'bn-BD' : 'en',
    publisher: { '@id': `${base}/#org` },
    potentialAction: { '@type': 'SearchAction', target: { '@type': 'EntryPoint', urlTemplate: `${base}/${lang}/search?q={search_term_string}` }, 'query-input': 'required name=search_term_string' },
  };
  return (
    <>
      <JsonLd data={ld} />
      <Sections i={i} sections={home.sections} site={site} />
    </>
  );
}
