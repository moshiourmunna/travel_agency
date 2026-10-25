import type { Metadata } from 'next';
import { Icon } from '@/components/icons/Icon';
import { Price } from '@/components/client/Price';
import { PickInto } from '@/components/client/PickInto';
import { InquiryForm } from '@/components/forms/QuoteForm';
import { PageHero, type Crumb } from '@/components/ui/basics';
import { apiData } from '@/lib/api';
import type { Lang } from '@/lib/format';
import { getI18n } from '@/lib/i18n';
import { getPage, pageMetadata } from '@/lib/page';
import { breadcrumbJsonLd, JsonLd } from '@/lib/seo';
import { getSite, siteUrl } from '@/lib/site';

export async function generateMetadata({ params }: PageProps<'/[lang]/insurance'>): Promise<Metadata> {
  return pageMetadata((await params).lang as Lang, 'insurance', '/insurance');
}

export default async function InsurancePage({ params }: PageProps<'/[lang]/insurance'>) {
  const lang = (await params).lang as Lang;
  const [i, page, plans, site] = await Promise.all([getI18n(lang), getPage('insurance', lang), apiData<any[]>('insurance-plans', { lang, tags: ['insurance'] }), getSite(lang)]);
  const t = i.t;
  const crumbs: Crumb[] = [[t('Home', 'হোম'), i.u('/')], [t('Travel insurance', 'ভ্রমণ বিমা'), i.u('/insurance')]];
  const base = siteUrl(site);
  const ld = { '@context': 'https://schema.org', '@type': 'ItemList', name: page.title, itemListElement: plans.map((p, k) => ({ '@type': 'ListItem', position: k + 1, item: { '@type': 'Product', name: p.name, category: 'Travel insurance', offers: { '@type': 'Offer', priceCurrency: 'BDT', price: p.price, url: `${base}/${lang}/insurance#ins-quote` } } })) };
  const start = new Date(Date.now() + 6 * 3600e3 + 30 * 864e5).toISOString().slice(0, 10);
  const popular = plans.find((p) => p.is_popular) ?? plans[0];
  return (
    <>
      <JsonLd data={breadcrumbJsonLd(base, crumbs)} />
      <JsonLd data={ld} />
      <PageHero i={i} title={page.title} sub={page.subtitle} crumbs={crumbs} image={page.image} />
      <section className="section"><div className="wrap">
        <div className="grid gap-5 md:grid-cols-3">{plans.map((p) => (
          <article key={p.code} className={`card relative flex flex-col p-6 ${p.is_popular ? 'ring-2 ring-brand-600' : ''}`}>
            {p.is_popular ? <span className="badge absolute -top-3 left-6 bg-brand-700 text-white">{t('Most popular', 'সবচেয়ে জনপ্রিয়')}</span> : null}
            <h2 className="text-xl font-bold">{p.name}</h2>
            <p className="mt-2"><span className="text-3xl font-extrabold"><Price value={p.price} /></span> {p.price_note ? <span className="text-sm muted">/ {p.price_note}</span> : null}</p>
            {p.medical_cover ? <p className="mt-1 text-sm muted">{t('Medical cover', 'চিকিৎসা কভার')}: <b className="text-ink-900 dark:text-white">{i.d(p.medical_cover)}</b></p> : null}
            <ul className="mt-4 flex-1 space-y-2 text-sm">{p.coverage.map((c: string, k: number) => <li key={k} className="flex gap-2"><Icon name="check" className="h-4 w-4 shrink-0 text-brand-600" /> {c}</li>)}</ul>
            <a href="#ins-quote" data-pick={p.name} className={`btn mt-6 ${p.is_popular ? 'btn-primary' : 'btn-outline'}`} aria-label={`${t('Get this plan', 'এই প্ল্যান নিন')} — ${p.name}`}>{t('Get this plan', 'এই প্ল্যান নিন')}</a>
          </article>
        ))}</div>
        <PickInto target="in-product" />
        <div id="ins-quote" className="card mt-12 scroll-mt-28 p-6">
          <InquiryForm type="insurance" idPrefix="in" className="grid gap-4 sm:grid-cols-2 lg:grid-cols-6 lg:items-end [&>button]:lg:self-end" submitClass="btn btn-accent"
            submit={t('Get quote', 'কোটেশন নিন')} success={t('Quote sent to your phone by SMS.', 'কোটেশন এসএমএসে পাঠানো হয়েছে।')}
            fields={[
              { name: 'name', label: `${t('Full name', 'পুরো নাম')} *`, required: true, autoComplete: 'name' },
              { name: 'destination', label: `${t('Destination', 'গন্তব্য')} *`, required: true },
              { name: 'product', label: t('Plan', 'প্ল্যান'), type: 'select', options: plans.map((p) => ({ value: p.name, label: p.name })), defaultValue: popular?.name },
              { name: 'travel_date', label: t('Start', 'শুরু'), type: 'date', defaultValue: start },
              { name: 'phone', label: `${t('Mobile', 'মোবাইল')} *`, type: 'tel', required: true, placeholder: '01XXXXXXXXX', autoComplete: 'tel' },
            ]} />
        </div>
        <p className="mt-4 text-xs muted">{t('Underwritten by licensed Bangladeshi insurers; Musafir acts as an authorised agent. Policy wording prevails.', 'লাইসেন্সপ্রাপ্ত বাংলাদেশি বিমা কোম্পানি দ্বারা প্রদত্ত; মুসাফির অনুমোদিত এজেন্ট। পলিসির শর্তাবলি প্রযোজ্য।')}</p>
      </div></section>
    </>
  );
}
