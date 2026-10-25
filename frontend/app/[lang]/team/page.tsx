import type { Metadata } from 'next';
import Link from 'next/link';
import { Icon } from '@/components/icons/Icon';
import { Avatar, PageHero, type Crumb } from '@/components/ui/basics';
import { Picture } from '@/components/ui/Picture';
import { apiData } from '@/lib/api';
import type { Lang } from '@/lib/format';
import { getI18n } from '@/lib/i18n';
import { getPage, pageMetadata } from '@/lib/page';
import { breadcrumbJsonLd, JsonLd } from '@/lib/seo';
import { getSite, siteUrl } from '@/lib/site';

export async function generateMetadata({ params }: PageProps<'/[lang]/team'>): Promise<Metadata> {
  return pageMetadata((await params).lang as Lang, 'team', '/team');
}

export default async function TeamPage({ params }: PageProps<'/[lang]/team'>) {
  const lang = (await params).lang as Lang;
  const [i, page, team, site] = await Promise.all([getI18n(lang), getPage('team', lang), apiData<any[]>('team', { lang, tags: ['team'] }), getSite(lang)]);
  const t = i.t;
  const d: any = page.data ?? {};
  const crumbs: Crumb[] = [[t('Home', 'হোম'), i.u('/')], [t('About', 'আমাদের কথা'), i.u('/about')], [t('Team', 'টিম'), i.u('/team')]];
  const base = siteUrl(site);
  const ld = { '@context': 'https://schema.org', '@type': 'ItemList', name: page.title, itemListElement: team.map((m, k) => ({ '@type': 'ListItem', position: k + 1, item: { '@type': 'Person', name: m.name, jobTitle: m.role, worksFor: { '@type': 'Organization', name: site.settings.company?.name } } })) };
  return (
    <>
      <JsonLd data={breadcrumbJsonLd(base, crumbs)} />
      <JsonLd data={ld} />
      <PageHero i={i} title={page.title} sub={page.subtitle} crumbs={crumbs} image={page.image} />
      <section className="section"><div className="wrap grid gap-6 sm:grid-cols-2 lg:grid-cols-4">{team.map((m) => (
        <article key={m.name} className="card p-6 text-center">
          {m.photo ? <Picture img={m.photo} alt={m.name} className="mx-auto h-24 w-24 rounded-full object-cover" sizes="96px" width={96} height={96} /> : <Avatar initials={m.initials} className="mx-auto h-24 w-24 text-2xl" gradient={m.gradient ?? undefined} />}
          <h2 className="mt-4 text-lg font-bold">{m.name}</h2><p className="text-sm text-brand-700 dark:text-brand-300">{m.role}</p>
          {m.countries_visited ? <p className="mt-3 text-xs muted">{t('Countries visited', 'ভ্রমণকৃত দেশ')}: {i.d(m.countries_visited)}</p> : null}
          <div className="mt-4 flex justify-center gap-2">
            {m.socials?.linkedin ? <a href={m.socials.linkedin} className="icon-btn border border-ink-200 dark:border-ink-700" target="_blank" rel="noopener noreferrer" aria-label={`LinkedIn — ${m.name}`}><Icon name="linkedin" className="h-4 w-4" /></a> : null}
            {m.socials?.email ? <a href={`mailto:${m.socials.email}`} className="icon-btn border border-ink-200 dark:border-ink-700" aria-label={`${t('Email', 'ইমেইল')} — ${m.name}`}><Icon name="mail" className="h-4 w-4" /></a> : null}
          </div>
        </article>
      ))}</div></section>
      <section className="pb-16"><div className="wrap"><div className="flex flex-col items-start justify-between gap-5 rounded-3xl bg-ink-900 p-8 text-white md:flex-row md:items-center"><div><h2 className="text-2xl font-bold">{d.cta_title}</h2><p className="mt-1 text-ink-300">{d.cta_text}</p></div><Link href={i.u('/careers')} className="btn btn-accent">{t('See open roles', 'খোলা পদ দেখুন')}</Link></div></div></section>
    </>
  );
}
