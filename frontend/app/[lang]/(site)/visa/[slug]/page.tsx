import type { Metadata } from 'next';
import Link from 'next/link';
import { Icon } from '@/components/icons/Icon';
import { Price } from '@/components/client/Price';
import { Tabs } from '@/components/client/Tabs';
import { InquiryForm } from '@/components/forms/QuoteForm';
import { DIMMED_HERO_SIZES, Picture } from '@/components/ui/Picture';
import { Crumbs, FaqList, type Crumb } from '@/components/ui/basics';
import { apiData } from '@/lib/api';
import type { Lang } from '@/lib/format';
import { getI18n } from '@/lib/i18n';
import { breadcrumbJsonLd, buildMetadata, JsonLd } from '@/lib/seo';
import { getSite, siteUrl } from '@/lib/site';

export async function generateStaticParams() {
  try { return (await apiData<{ slug: string }[]>('visas', { lang: 'en', tags: ['visas'] })).map((v) => ({ slug: v.slug })); } catch { return []; }
}
const load = (slug: string, lang: Lang) => apiData<any>(`visas/${slug}`, { lang, tags: ['visas', `visa:${slug}`, 'faqs'] });

export async function generateMetadata({ params }: PageProps<'/[lang]/visa/[slug]'>): Promise<Metadata> {
  const { lang, slug } = (await params) as { lang: Lang; slug: string };
  const v = await load(slug, lang);
  const i = await getI18n(lang);
  return buildMetadata(lang, `/visa/${slug}`, { title: `${v.country} ${i.t('visa from Bangladesh', 'ভিসা — বাংলাদেশ থেকে')}`, description: `${v.visa_type} · ${v.processing}`, image: v.image, seo: v.seo });
}

export default async function VisaDetail({ params }: PageProps<'/[lang]/visa/[slug]'>) {
  const { lang, slug } = (await params) as { lang: Lang; slug: string };
  const [v, i, site] = await Promise.all([load(slug, lang), getI18n(lang), getSite(lang)]);
  const t = i.t;
  const base = siteUrl(site);
  const crumbs: Crumb[] = [[t('Home', 'হোম'), i.u('/')], [t('Visa', 'ভিসা'), i.u('/visa')], [v.country, i.u(`/visa/${slug}`)]];
  const sets = (v.document_sets as { code: string; name: string; items: string[] }[]).map((s) => (s.code === 'general' ? { ...s, items: [...s.items, ...(v.extra_documents ?? [])] } : s)).filter((s) => s.items.length);
  const facts: [string, string, React.ReactNode][] = [['clock', t('Processing', 'প্রসেসিং'), v.processing], ['calendar-check', t('Validity', 'মেয়াদ'), v.validity], ['hourglass', t('Max stay', 'সর্বোচ্চ অবস্থান'), v.stay], ['log-in', t('Entry', 'প্রবেশ'), v.entry], ['wallet', t('Total fee', 'মোট ফি'), <Price key="p" value={v.fee} />]];
  const ld = [breadcrumbJsonLd(base, crumbs),
    { '@context': 'https://schema.org', '@type': 'Service', name: `${v.country} ${v.visa_type}`, serviceType: 'Visa processing', areaServed: 'BD', provider: { '@type': 'TravelAgency', name: site.settings.company?.name, url: base },
      offers: { '@type': 'Offer', priceCurrency: 'BDT', price: v.fee, url: `${base}/${lang}/visa/${slug}` } },
    ...(v.faqs?.length ? [{ '@context': 'https://schema.org', '@type': 'FAQPage', mainEntity: v.faqs.map((f: any) => ({ '@type': 'Question', name: f.q, acceptedAnswer: { '@type': 'Answer', text: f.a } })) }] : [])];
  return (
    <>
      {ld.map((d, k) => <JsonLd key={k} data={d} />)}
      <section className="relative isolate overflow-hidden bg-ink-950"><Picture img={v.image} className="img-cover absolute inset-0 -z-10 opacity-50" priority sizes={DIMMED_HERO_SIZES} width={1600} height={1000} /><div className="absolute inset-0 -z-10 bg-gradient-to-r from-ink-950 via-ink-950/70 to-transparent" />
        <div className="wrap py-12 md:py-16"><Crumbs i={i} items={crumbs} light />
          <p className="mt-5 inline-flex rounded-lg bg-white px-2 py-1 text-xs font-extrabold tracking-wider text-ink-900">{v.iso2}</p>
          <h1 className="mt-3 text-3xl font-extrabold text-white sm:text-5xl">{v.country} {t('visa from Bangladesh', 'ভিসা — বাংলাদেশ থেকে')}</h1><p className="mt-2 text-lg text-ink-200">{v.visa_type} · {v.processing}</p></div></section>
      <section className="border-b border-ink-100 dark:border-ink-800"><ul className="wrap grid grid-cols-2 gap-4 py-6 md:grid-cols-5">
        {facts.map(([ic, k, val]) => <li key={k} className="flex items-center gap-3"><span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-brand-50 text-brand-700 dark:bg-brand-900/40 dark:text-brand-300"><Icon name={ic} className="h-5 w-5" /></span><div><p className="text-xs muted">{k}</p><p className="text-sm font-bold">{val}</p></div></li>)}
      </ul></section>
      <div className="wrap grid gap-10 py-12 lg:grid-cols-[1fr_380px]">
        <div className="min-w-0 space-y-10">
          {v.description ? <section><p className="leading-7 text-ink-600 dark:text-ink-300">{v.description}</p></section> : null}
          <section><h2 className="text-2xl font-bold">{t('Required documents', 'প্রয়োজনীয় কাগজপত্র')}</h2>
            <div className="mt-5">
              <Tabs label={t('Applicant type', 'আবেদনকারীর ধরন')} listClass="no-scrollbar flex gap-1 overflow-x-auto border-b border-ink-100 dark:border-ink-800" tabClass="tab-line shrink-0" tabs={sets.map((s) => ({ id: `vp-${s.code}`, label: s.name }))}>
                {sets.map((s) => <div key={s.code} className="pt-5"><ul className="grid gap-3 sm:grid-cols-2">{s.items.map((it, k) => <li key={k} className="flex gap-3 rounded-2xl border border-ink-100 p-4 text-sm dark:border-ink-800"><Icon name="file-check" className="h-5 w-5 shrink-0 text-brand-600" /> {it}</li>)}</ul></div>)}
              </Tabs>
            </div></section>
          {v.fee_breakdown?.length ? <section><h2 className="text-2xl font-bold">{t('Fee breakdown', 'ফি বিবরণ')}</h2>
            <div className="mt-4 overflow-hidden rounded-2xl border border-ink-100 dark:border-ink-800"><table className="table"><caption className="sr-only">{t('Fee breakdown', 'ফি বিবরণ')}</caption><tbody>
              {v.fee_breakdown.map((r: any, k: number) => <tr key={k}><th scope="row">{r.label}</th><td className="text-right"><Price value={r.amount} /></td></tr>)}
              <tr className="bg-ink-50 dark:bg-ink-850"><th scope="row" className="!text-base !font-bold">{t('Total', 'মোট')}</th><td className="text-right text-lg font-extrabold"><Price value={v.fee} /></td></tr>
            </tbody></table></div>
            <p className="mt-3 text-xs muted">{t('Embassy fees are non-refundable and may change without notice.', 'দূতাবাস ফি অফেরতযোগ্য এবং পূর্ব নোটিশ ছাড়াই পরিবর্তন হতে পারে।')}</p></section> : null}
          {v.faqs?.length ? <section><h2 className="text-2xl font-bold">{t('Good to know', 'জেনে রাখুন')}</h2><div className="mt-5"><FaqList items={v.faqs} /></div></section> : null}
        </div>
        <aside className="lg:sticky lg:top-24 lg:self-start" id="apply">
          <div className="card p-5">
            <InquiryForm type="visa" idPrefix="va" className="space-y-3" extra={{ product: `${v.country} — ${v.visa_type}`, destination: v.country }} submitClass="btn btn-accent btn-lg mt-2 w-full"
              header={<h2 className="mb-4 text-lg font-bold">{t('Start your application', 'আবেদন শুরু করুন')}</h2>}
              footer={site.settings.catalog?.visa_approval_note ? <p className="flex items-center justify-center gap-1.5 text-xs muted"><Icon name="badge-check" className="h-4 w-4 text-emerald-600" /> {site.settings.catalog.visa_approval_note}</p> : null}
              submit={t('Submit application', 'আবেদন জমা দিন')} success={t('Application received! Our visa officer will call you within 2 working hours.', 'আবেদন পেয়েছি! আমাদের ভিসা অফিসার ২ কর্মঘণ্টার মধ্যে কল করবেন।')}
              fields={[
                { name: 'name', label: t('Full name', 'পুরো নাম'), required: true, autoComplete: 'name', error: t('Please enter your name.', 'আপনার নাম লিখুন।') },
                { name: 'phone', label: t('Mobile', 'মোবাইল'), type: 'tel', required: true, placeholder: '01XXXXXXXXX', autoComplete: 'tel', error: t('Enter a valid BD mobile number.', 'সঠিক বাংলাদেশি মোবাইল নম্বর দিন।') },
                { name: 'details.profession', label: t('Profession', 'পেশা'), type: 'select', options: [['job', t('Job holder', 'চাকরিজীবী')], ['business', t('Business owner', 'ব্যবসায়ী')], ['student', t('Student', 'শিক্ষার্থী')], ['other', t('Other', 'অন্যান্য')]].map(([value, label]) => ({ value, label })) },
                { name: 'travel_date', label: t('Intended travel date', 'সম্ভাব্য ভ্রমণের তারিখ'), type: 'date', required: true },
                { name: 'adults', label: t('Applicants', 'আবেদনকারী'), type: 'number', min: 1, max: 20, defaultValue: '1' },
              ]} />
          </div>
          {v.fee ? <div className="card mt-4 p-5 text-center">
            <p className="text-sm font-bold">{t('Know what you need?', 'কী লাগবে জানেন?')}</p>
            <p className="mt-1 text-xs muted">{t('Pay the service fee online now and upload documents from My Account.', 'এখনই অনলাইনে সার্ভিস ফি দিন, ডকুমেন্ট মাই অ্যাকাউন্ট থেকে আপলোড করুন।')}</p>
            <Link href={`${i.u('/booking')}?visa=${v.slug}&adults=1`} className="btn btn-primary mt-3 w-full" data-visa-pay><Icon name="credit-card" className="h-4 w-4" /> {t('Apply & pay online', 'অনলাইনে আবেদন ও পেমেন্ট')}</Link>
          </div> : null}
        </aside>
      </div>
      {v.similar?.length ? <section className="wrap pb-16"><h2 className="mb-4 text-xl font-bold">{t('Other popular visas', 'অন্যান্য জনপ্রিয় ভিসা')}</h2><ul className="flex flex-wrap gap-2">{v.similar.map((s: any) => <li key={s.slug}><Link href={i.u(`/visa/${s.slug}`)} className="chip hover:border-brand-500"><span className="text-[10px] font-extrabold tracking-wider">{s.iso2}</span> {s.country} · <Price value={s.fee} /></Link></li>)}</ul></section> : null}
    </>
  );
}
