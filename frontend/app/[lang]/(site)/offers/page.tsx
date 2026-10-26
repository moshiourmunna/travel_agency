import type { Metadata } from 'next';
import Link from 'next/link';
import { Icon } from '@/components/icons/Icon';
import { QuickFilter } from '@/components/client/HomeBits';
import { CopyCode, CountdownGrid, CountdownText } from '@/components/client/Promo';
import { Picture } from '@/components/ui/Picture';
import { PageHero, SecHead, type Crumb } from '@/components/ui/basics';
import { TourCard } from '@/components/ui/cards';
import { api, apiData } from '@/lib/api';
import type { Lang } from '@/lib/format';
import { getI18n } from '@/lib/i18n';
import { getPage, pageMetadata } from '@/lib/page';
import { breadcrumbJsonLd, JsonLd } from '@/lib/seo';
import { getSite, siteUrl } from '@/lib/site';

export const revalidate = 300;

export async function generateMetadata({ params }: PageProps<'/[lang]/offers'>): Promise<Metadata> {
  return pageMetadata((await params).lang as Lang, 'offers', '/offers');
}

export default async function OffersPage({ params }: PageProps<'/[lang]/offers'>) {
  const lang = (await params).lang as Lang;
  const [i, page, offers, drops, site] = await Promise.all([getI18n(lang), getPage('offers', lang), apiData<any[]>('offers', { lang, tags: ['offers'] }),
    api<{ data: any[] }>('tours', { lang, tags: ['tours'], query: { on_sale: 1, sort: 'discount', per_page: 4 } }).then((r) => r.data).catch(() => []), getSite(lang)]);
  const t = i.t;
  const d = page.data ?? {};
  const b = d.banner;
  const crumbs: Crumb[] = [[t('Home', 'হোম'), i.u('/')], [t('Offers', 'অফার'), i.u('/offers')]];
  const kinds: [string, string][] = [['all', t('All deals', 'সব ডিল')], ['holiday', t('Holidays', 'হলিডে')], ['cruise', t('Cruises', 'ক্রুজ')], ['flight', t('Flights', 'ফ্লাইট')], ['bank', t('Bank & wallet', 'ব্যাংক ও ওয়ালেট')]];
  const present = new Set(offers.map((o) => o.kind));
  const base = siteUrl(site);
  const ld = { '@context': 'https://schema.org', '@type': 'ItemList', name: page.title, itemListElement: offers.map((o, k) => ({ '@type': 'ListItem', position: k + 1, item: { '@type': 'Offer', name: o.title, description: o.description, url: `${base}/${lang}${o.link?.startsWith('/') ? o.link : '/offers'}`, ...(o.ends_at ? { validThrough: o.ends_at } : {}) } })) };
  const copy = t('Copy code', 'কোড কপি করুন');
  return (
    <>
      <JsonLd data={breadcrumbJsonLd(base, crumbs)} />
      <JsonLd data={ld} />
      <PageHero i={i} title={page.title} sub={page.subtitle} crumbs={crumbs} image={page.image} />
      {b && (!b.ends_at || new Date(b.ends_at).getTime() > Date.now()) ? (
        <section className="relative -mt-10 pb-4"><div className="wrap"><div className="grid items-center gap-5 rounded-3xl bg-gradient-to-r from-accent-400 to-accent-300 p-6 text-ink-900 shadow-lift md:grid-cols-[1fr_auto] md:p-8">
          <div><p className="eyebrow inline-flex items-center gap-1.5 text-ink-800"><Icon name="zap" className="h-4 w-4" /> {b.eyebrow}</p><h2 className="text-2xl font-extrabold sm:text-3xl">{b.title}</h2>
            <p className="mt-1 text-sm text-ink-800">{b.text} {b.code ? <CopyCode code={b.code} label={copy} className="ml-1 inline-flex items-center gap-1 rounded-lg border border-dashed border-ink-900/40 px-2 py-0.5 font-mono font-bold"><Icon name="copy" className="h-3.5 w-3.5" /></CopyCode> : null}</p></div>
          {b.ends_at ? <CountdownGrid to={b.ends_at} label={t('Sale ends in', 'সেল শেষ হবে')} units={[t('Days', 'দিন'), t('Hours', 'ঘণ্টা'), t('Mins', 'মিনিট'), t('Secs', 'সেকেন্ড')]} /> : null}
        </div></div></section>
      ) : null}
      <section className="section !pt-10"><div className="wrap">
        <QuickFilter label={t('Offer type', 'অফারের ধরন')} rowClass="mb-6" chipsClass="flex flex-wrap gap-2" options={kinds.filter(([k]) => k === 'all' || present.has(k)).map(([value, label]) => ({ value, label }))}>
          <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
            {offers.map((o) => (
              <article key={o.code} className="card card-hover flex flex-col overflow-hidden" data-item data-cats={o.kind}>
                <div className="relative aspect-[16/9] overflow-hidden"><Picture img={o.image} alt="" className="img-cover" sizes="(min-width: 1280px) 33vw, (min-width: 768px) 50vw, 100vw" />{o.discount ? <span className="badge absolute left-3 top-3 bg-rose-600 text-white">{o.discount}</span> : null}{o.tag ? <span className="badge absolute bottom-3 left-3 bg-white/90 text-ink-800">{o.tag}</span> : null}</div>
                <div className="flex flex-1 flex-col p-5"><h2 className="text-lg font-bold leading-snug">{o.title}</h2><p className="mt-1 text-sm muted">{o.description}</p>
                  {o.ends_at ? <div className="mt-4 flex items-center justify-between gap-3 rounded-2xl bg-ink-50 px-3 py-2 text-sm dark:bg-ink-850"><span className="inline-flex items-center gap-1.5 muted"><Icon name="timer" className="h-4 w-4" /> {t('Ends in', 'শেষ হবে')}</span><CountdownText to={o.ends_at} ended={t('Ended', 'শেষ')} /></div> : null}
                  <div className="mt-auto flex items-center justify-between gap-3 pt-4">{o.code ? <CopyCode code={o.code} label={copy} className="inline-flex items-center gap-1 rounded-lg border border-dashed border-brand-400 px-2.5 py-1.5 font-mono text-sm font-bold text-brand-800 dark:text-brand-300"><Icon name="copy" className="h-3.5 w-3.5" /></CopyCode> : <span className="text-xs muted">{t('Auto-applied', 'স্বয়ংক্রিয়ভাবে প্রযোজ্য')}</span>}<Link href={o.link?.startsWith('/') ? i.u(o.link) : o.link || i.u('/tours')} className="btn btn-primary btn-sm">{t('View deal', 'ডিল দেখুন')}</Link></div>
                </div>
              </article>
            ))}
          </div>
        </QuickFilter>
      </div></section>
      <section className="pb-16"><div className="wrap">
        {drops.length ? <><SecHead eyebrow={d.drops_eyebrow} title={d.drops_title ?? t('Tours with reduced prices right now', 'এখন যেসব ট্যুরে দাম কমেছে')} link={i.u('/tours?sort=price-asc')} linkLabel={t('All tours', 'সব ট্যুর')} />
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">{drops.map((x) => <TourCard key={x.slug} i={i} x={x} />)}</div></> : null}
        {d.terms ? <p className="mt-8 rounded-2xl border border-ink-100 p-4 text-xs muted dark:border-ink-800">{d.terms}</p> : null}
      </div></section>
    </>
  );
}
