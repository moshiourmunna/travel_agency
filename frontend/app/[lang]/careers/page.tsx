import type { Metadata } from 'next';
import { Icon } from '@/components/icons/Icon';
import { ApplyDialog } from '@/components/forms/ApplyDialog';
import { PageHero, type Crumb } from '@/components/ui/basics';
import { apiData } from '@/lib/api';
import type { Lang } from '@/lib/format';
import { getI18n } from '@/lib/i18n';
import { getPage, pageMetadata } from '@/lib/page';
import { breadcrumbJsonLd, JsonLd } from '@/lib/seo';
import { getSite, siteUrl } from '@/lib/site';

export async function generateMetadata({ params }: PageProps<'/[lang]/careers'>): Promise<Metadata> {
  return pageMetadata((await params).lang as Lang, 'careers', '/careers');
}

export default async function CareersPage({ params }: PageProps<'/[lang]/careers'>) {
  const lang = (await params).lang as Lang;
  const [i, page, jobs, site] = await Promise.all([getI18n(lang), getPage('careers', lang), apiData<any[]>('careers', { lang, tags: ['careers'] }), getSite(lang)]);
  const t = i.t;
  const d: any = page.data ?? {};
  const c: any = site.settings.company ?? {};
  const crumbs: Crumb[] = [[t('Home', 'হোম'), i.u('/')], [t('Careers', 'ক্যারিয়ার'), i.u('/careers')]];
  const base = siteUrl(site);
  // Google for Jobs: one JobPosting per opening
  const ld = jobs.map((j) => ({ '@context': 'https://schema.org', '@type': 'JobPosting', title: j.title, description: `${j.title} — ${j.department}. ${t('Experience', 'অভিজ্ঞতা')}: ${j.experience}.`, datePosted: '2026-10-01', validThrough: j.closes_on,
    employmentType: /part/i.test(j.type) ? 'PART_TIME' : /intern/i.test(j.type) ? 'INTERN' : 'FULL_TIME', hiringOrganization: { '@type': 'Organization', name: c.name, sameAs: base },
    jobLocation: { '@type': 'Place', address: { '@type': 'PostalAddress', addressLocality: j.location, addressCountry: 'BD' } }, directApply: true, url: `${base}/${lang}/careers#${j.slug}` }));
  return (
    <>
      <JsonLd data={breadcrumbJsonLd(base, crumbs)} />
      {ld.map((x, k) => <JsonLd key={k} data={x} />)}
      <PageHero i={i} title={page.title} sub={page.subtitle} crumbs={crumbs} image={page.image} />
      <section className="section"><div className="wrap">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">{(d.perks ?? []).map((p: any, k: number) => <div key={k} className="card flex items-center gap-3 p-5"><Icon name={p.icon} className="h-6 w-6 shrink-0 text-brand-600" /><p className="font-semibold">{p.text}</p></div>)}</div>
        <h2 className="mt-12 text-2xl font-bold">{t('Open positions', 'খোলা পদ')} <span className="badge badge-brand align-middle">{i.d(jobs.length)}</span></h2>
        {jobs.length ? <ul className="mt-5 space-y-3">{jobs.map((j) => (
          <li key={j.slug} id={j.slug} className="card flex scroll-mt-28 flex-col gap-4 p-5 sm:flex-row sm:items-center sm:justify-between">
            <div><h3 className="font-bold">{j.title}</h3><p className="mt-1 flex flex-wrap gap-x-4 gap-y-1 text-sm muted"><span className="inline-flex items-center gap-1"><Icon name="briefcase" className="h-4 w-4" /> {j.department}</span><span className="inline-flex items-center gap-1"><Icon name="map-pin" className="h-4 w-4" /> {j.location}</span><span className="inline-flex items-center gap-1"><Icon name="clock" className="h-4 w-4" /> {j.type}</span><span>{t('Experience', 'অভিজ্ঞতা')}: {j.experience}</span></p></div>
            <ApplyDialog slug={j.slug} job={j.title} closeIcon={<Icon name="x" />} l={{ apply: t('Apply', 'আবেদন করুন'), title: t('Apply now', 'এখনই আবেদন করুন'), close: t('Close', 'বন্ধ'), name: t('Full name', 'পূর্ণ নাম'), email: t('Email', 'ইমেইল'), phone: t('Mobile', 'মোবাইল'), cv: t('CV (PDF)', 'সিভি (পিডিএফ)'), cvHint: t('PDF only, up to 5 MB.', 'শুধু পিডিএফ, সর্বোচ্চ ৫ এমবি।'), submit: t('Submit application', 'আবেদন জমা দিন'), success: d.success ?? '', required: t('Required', 'আবশ্যক'), emailBad: t('Enter a valid email address.', 'সঠিক ইমেইল ঠিকানা দিন।'), cvBad: t('Please attach a PDF up to 5 MB.', 'সর্বোচ্চ ৫ এমবির পিডিএফ দিন।'), failed: t('Something went wrong. Please try again.', 'কিছু ভুল হয়েছে। আবার চেষ্টা করুন।') }} />
          </li>
        ))}</ul> : <p className="mt-5 card p-6 muted">{t('No openings right now — send your CV to', 'এই মুহূর্তে কোনো পদ খালি নেই — সিভি পাঠান')} <a className="link" href={`mailto:${c.email}`}>{c.email}</a></p>}
      </div></section>
    </>
  );
}
