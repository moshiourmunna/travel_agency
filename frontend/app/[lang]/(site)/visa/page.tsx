import type { Metadata } from 'next';
import Link from 'next/link';
import { Icon } from '@/components/icons/Icon';
import { Price } from '@/components/client/Price';
import { TextFilter } from '@/components/client/TextFilter';
import { Picture } from '@/components/ui/Picture';
import { PageHero, SecHead, type Crumb } from '@/components/ui/basics';
import { apiData } from '@/lib/api';
import type { Lang } from '@/lib/format';
import { getI18n } from '@/lib/i18n';
import { getPage, pageMetadata } from '@/lib/page';
import { breadcrumbJsonLd, JsonLd } from '@/lib/seo';
import { getSite, siteUrl } from '@/lib/site';

export async function generateMetadata({ params }: PageProps<'/[lang]/visa'>): Promise<Metadata> {
  return pageMetadata((await params).lang as Lang, 'visa', '/visa');
}

export default async function VisaPage({ params }: PageProps<'/[lang]/visa'>) {
  const lang = (await params).lang as Lang;
  const [i, page, visas, site] = await Promise.all([getI18n(lang), getPage('visa', lang), apiData<any[]>('visas', { lang, tags: ['visas'] }), getSite(lang)]);
  // Other-language country names so "থাইল্যান্ড" and "Thailand" both match the filter.
  const other = await apiData<any[]>('visas', { lang: lang === 'en' ? 'bn' : 'en', tags: ['visas'] }).catch(() => []);
  const alt = Object.fromEntries(other.map((v) => [v.slug, v.country]));
  const t = i.t;
  const crumbs: Crumb[] = [[t('Home', 'হোম'), i.u('/')], [t('Visa', 'ভিসা'), i.u('/visa')]];
  const d = page.data ?? {};
  const base = siteUrl(site);
  const list = { '@context': 'https://schema.org', '@type': 'ItemList', name: page.title, itemListElement: visas.map((v, k) => ({ '@type': 'ListItem', position: k + 1, url: `${base}/${lang}/visa/${v.slug}`, name: `${v.country} — ${v.visa_type}` })) };
  return (
    <>
      <JsonLd data={breadcrumbJsonLd(base, crumbs)} />
      <JsonLd data={list} />
      <PageHero i={i} title={page.title} sub={page.subtitle} crumbs={crumbs} image={page.image} />
      <section className="section" id="vlist">
        <div className="wrap">
          <div className="mb-8 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
            <TextFilter target="#vlist" id="v-q" className="w-full max-w-md" label={t('Which country are you visiting?', 'কোন দেশে যাচ্ছেন?')} placeholder={t('Search a country', 'দেশের নাম লিখুন')} icon={<Icon name="search" className="h-4 w-4" />} />
            <p className="text-sm muted" aria-live="polite"><b className="text-ink-900 dark:text-white" data-count-out>{i.d(visas.length)}</b> {t('countries', 'টি দেশ')}</p>
          </div>
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {visas.map((v) => (
              <article key={v.slug} className="card card-hover group relative overflow-hidden" data-item data-title={`${v.country} ${alt[v.slug] ?? ''} ${v.iso2 ?? ''}`}>
                <div className="relative aspect-[16/9] overflow-hidden"><Picture img={v.image} alt="" className="img-cover transition duration-700 group-hover:scale-105" sizes="(min-width: 1280px) 25vw, (min-width: 640px) 50vw, 100vw" /><div className="absolute inset-0 bg-gradient-to-t from-ink-950/70" /><span className="absolute left-3 top-3 rounded-lg bg-white px-2 py-1 text-xs font-extrabold tracking-wider text-ink-900">{v.iso2}</span><h2 className="absolute bottom-3 left-4 text-xl font-bold text-white">{v.country}</h2></div>
                <div className="p-4"><p className="text-sm font-semibold text-brand-700 dark:text-brand-300">{v.visa_type}</p>
                  <dl className="mt-3 grid grid-cols-2 gap-2 text-xs"><div><dt className="muted">{t('Processing', 'প্রসেসিং')}</dt><dd className="font-semibold">{v.processing}</dd></div><div><dt className="muted">{t('Stay', 'অবস্থান')}</dt><dd className="font-semibold">{v.stay}</dd></div></dl>
                  <div className="mt-4 flex items-center justify-between border-t border-ink-100 pt-3 dark:border-ink-800"><p><span className="text-xs muted">{t('From', 'শুরু')}</span> <b className="text-lg"><Price value={v.fee} /></b></p><Link href={i.u(`/visa/${v.slug}`)} className="link text-sm after:absolute after:inset-0">{t('Details', 'বিস্তারিত')} →</Link></div></div>
              </article>
            ))}
          </div>
          <div data-empty hidden className="card p-10 text-center"><p className="font-bold">{t('Country not listed?', 'দেশটি তালিকায় নেই?')}</p><p className="text-sm muted">{t('We process visas for 40+ countries — call us.', 'আমরা ৪০+ দেশের ভিসা প্রসেস করি — কল করুন।')}</p>{site.settings.company?.hotline ? <a href={`tel:${site.settings.company.hotline_tel}`} className="btn btn-primary btn-sm mt-4"><Icon name="phone" className="h-4 w-4" /> {i.d(site.settings.company.hotline)}</a> : null}</div>
        </div>
      </section>
      {d.steps?.length ? <section className="section bg-ink-50 dark:bg-ink-900/50"><div className="wrap">
        <SecHead center eyebrow={d.steps_eyebrow} title={d.steps_title} />
        <ol className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">{d.steps.map((s: any, k: number) => <li key={k} className="card p-6"><span className="grid h-12 w-12 place-items-center rounded-2xl bg-brand-700 text-white"><Icon name={s.icon} className="h-6 w-6" /></span><p className="mt-4 text-xs font-bold text-brand-700 dark:text-brand-300">{t('Step', 'ধাপ')} {i.d(k + 1)}</p><h3 className="font-bold">{s.title}</h3><p className="mt-1 text-sm muted">{s.text}</p></li>)}</ol>
      </div></section> : null}
    </>
  );
}
