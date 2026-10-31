import type { Metadata } from 'next';
import Link from 'next/link';
import { CountUp } from '@/components/client/HomeBits';
import { Icon } from '@/components/icons/Icon';
import { PageHero, SecHead, type Crumb } from '@/components/ui/basics';
import { Picture } from '@/components/ui/Picture';
import type { Lang } from '@/lib/format';
import { getI18n } from '@/lib/i18n';
import { getPage, pageMetadata } from '@/lib/page';
import { breadcrumbJsonLd, JsonLd } from '@/lib/seo';
import { getSite, siteUrl } from '@/lib/site';

export async function generateMetadata({ params }: PageProps<'/[lang]/about'>): Promise<Metadata> {
  return pageMetadata((await params).lang as Lang, 'about', '/about');
}

export default async function AboutPage({ params }: PageProps<'/[lang]/about'>) {
  const lang = (await params).lang as Lang;
  const [i, page, site] = await Promise.all([getI18n(lang), getPage('about', lang), getSite(lang)]);
  const t = i.t;
  const d: any = page.data ?? {};
  const c: any = site.settings.company ?? {};
  const crumbs: Crumb[] = [[t('Home', 'হোম'), i.u('/')], [t('About', 'আমাদের কথা'), i.u('/about')]];
  const base = siteUrl(site);
  const ld = { '@context': 'https://schema.org', '@type': 'AboutPage', name: page.title, url: `${base}/${lang}/about`, mainEntity: { '@type': 'TravelAgency', name: c.name, foundingDate: String(c.founded ?? ''), url: base } };
  return (
    <>
      <JsonLd data={breadcrumbJsonLd(base, crumbs)} />
      <JsonLd data={ld} />
      <PageHero i={i} title={page.title} sub={page.subtitle} crumbs={crumbs} image={page.image} />
      <section className="section"><div className="wrap grid items-center gap-10 lg:grid-cols-2">
        <div><p className="eyebrow">{d.story_eyebrow}</p><h2 className="h-section">{d.story_title}</h2><div className="prose-m">{(d.story ?? []).map((p: string, k: number) => <p key={k}>{p}</p>)}</div></div>
        <div className="grid grid-cols-2 gap-4">{(d.photos ?? []).slice(0, 2).map((p: any, k: number) => <Picture key={k} img={p.image} alt={p.alt} className={`aspect-[3/4] w-full rounded-3xl object-cover ${k ? 'mt-10' : ''}`} sizes="(min-width: 1024px) 25vw, 50vw" width={480} height={640} />)}</div>
      </div></section>
      {site.stats?.length ? <section className="bg-brand-900 py-14 text-white"><dl className="wrap grid grid-cols-2 gap-8 text-center md:grid-cols-4">{site.stats.map((s: any, k: number) => (
        <div key={k} className="flex flex-col-reverse"><dt className="mt-1 text-sm text-brand-200">{s.label}</dt><dd><CountUp value={s.value} suffix={s.suffix ?? ''} format="lakh" className="text-4xl text-white" /></dd></div>
      ))}</dl></section> : null}
      <section className="section"><div className="wrap"><SecHead eyebrow={d.values_eyebrow} title={d.values_title} center />
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">{(d.values ?? []).map((v: any, k: number) => <div key={k} className="card p-6"><span className="grid h-12 w-12 place-items-center rounded-2xl bg-brand-50 text-brand-700 dark:bg-brand-900/40 dark:text-brand-300"><Icon name={v.icon} className="h-6 w-6" /></span><h3 className="mt-4 text-lg font-bold">{v.title}</h3><p className="mt-1 text-sm muted">{v.text}</p></div>)}</div>
      </div></section>
      <section className="section bg-ink-50 dark:bg-ink-900/50"><div className="wrap grid gap-10 lg:grid-cols-[1fr_1.3fr]">
        <div><SecHead eyebrow={d.milestones_eyebrow} title={d.milestones_title} /></div>
        <ol className="relative space-y-8 border-l-2 border-brand-200 pl-8 dark:border-brand-800">{(d.milestones ?? []).map((m: any, k: number) => <li key={k} className="relative"><span className="absolute -left-[41px] grid h-5 w-5 place-items-center rounded-full border-4 border-white bg-brand-600 dark:border-ink-950" /><p className="text-sm font-bold text-brand-700 dark:text-brand-300">{i.d(m.year)}</p><p className="mt-0.5 font-semibold">{m.text}</p></li>)}</ol>
      </div></section>
      <section className="section"><div className="wrap"><SecHead eyebrow={d.licences_eyebrow} title={d.licences_title} center />
        <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">{(c.licences ?? []).map((l: any) => <li key={l.name} className="card flex items-center gap-4 p-5"><span className="grid h-12 w-12 shrink-0 place-items-center rounded-xl bg-ink-900 text-xs font-extrabold text-white dark:bg-white dark:text-ink-900">{String(l.name).slice(0, 4).toUpperCase()}</span><div><p className="font-bold">{l.name}</p><p className="text-sm muted">{t('Licence', 'লাইসেন্স')} {i.d(l.number)}</p></div></li>)}</ul>
        <div className="mt-12 text-center"><Link href={i.u('/team')} className="btn btn-outline">{t('Meet the team', 'টিমের সাথে পরিচিত হোন')} <Icon name="arrow-right" className="h-4 w-4" /></Link> <Link href={i.u('/careers')} className="btn btn-ghost">{t('Join us', 'আমাদের সাথে যোগ দিন')}</Link></div>
      </div></section>
    </>
  );
}
