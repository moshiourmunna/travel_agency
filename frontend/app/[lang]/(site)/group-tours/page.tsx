import type { Metadata } from 'next';
import { Icon } from '@/components/icons/Icon';
import { InquiryForm } from '@/components/forms/QuoteForm';
import { PageHero, type Crumb } from '@/components/ui/basics';
import type { Lang } from '@/lib/format';
import { getI18n } from '@/lib/i18n';
import { getPage, pageMetadata } from '@/lib/page';
import { breadcrumbJsonLd, JsonLd } from '@/lib/seo';
import { getSite, siteUrl } from '@/lib/site';

export async function generateMetadata({ params }: PageProps<'/[lang]/group-tours'>): Promise<Metadata> {
  return pageMetadata((await params).lang as Lang, 'group-tours', '/group-tours');
}

export default async function GroupToursPage({ params }: PageProps<'/[lang]/group-tours'>) {
  const lang = (await params).lang as Lang;
  const [i, page, site] = await Promise.all([getI18n(lang), getPage('group-tours', lang), getSite(lang)]);
  const t = i.t;
  const d: any = page.data ?? {};
  const crumbs: Crumb[] = [[t('Home', 'হোম'), i.u('/')], [t('Group tours', 'গ্রুপ ট্যুর'), i.u('/group-tours')]];
  const base = siteUrl(site);
  const ld = { '@context': 'https://schema.org', '@type': 'Service', name: page.title, description: page.subtitle, provider: { '@type': 'TravelAgency', name: site.settings.company?.name, url: base }, areaServed: 'BD',
    hasOfferCatalog: { '@type': 'OfferCatalog', name: page.title, itemListElement: (d.services ?? []).map((s: any) => ({ '@type': 'Offer', itemOffered: { '@type': 'Service', name: s.title, description: s.text } })) } };
  return (
    <>
      <JsonLd data={breadcrumbJsonLd(base, crumbs)} />
      <JsonLd data={ld} />
      <PageHero i={i} title={page.title} sub={page.subtitle} crumbs={crumbs} image={page.image} />
      <section className="section"><div className="wrap">
        {d.services?.length ? <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">{d.services.map((s: any, k: number) => (
          <div key={k} className="card p-6"><span className="grid h-12 w-12 place-items-center rounded-2xl bg-brand-700 text-white"><Icon name={s.icon} className="h-6 w-6" /></span><h2 className="mt-4 text-lg font-bold">{s.title}</h2><p className="mt-1 text-sm muted">{s.text}</p></div>
        ))}</div> : null}
        <div className="mt-12 grid gap-10 lg:grid-cols-2">
          {d.clients?.length ? <div><h2 className="text-2xl font-bold">{d.clients_title}</h2><div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-3">{d.clients.map((n: string) => <div key={n} className="grid h-16 place-items-center rounded-2xl border border-ink-100 text-sm font-extrabold tracking-tight text-ink-500 dark:border-ink-800 dark:text-ink-300">{n}</div>)}</div>{d.clients_note ? <p className="mt-3 text-xs muted">{d.clients_note}</p> : null}</div> : <div />}
          <InquiryForm type="group-tour" idPrefix="g" className="card grid gap-4 p-6 sm:grid-cols-2" submitClass="btn btn-primary justify-self-start sm:col-span-2"
            header={<h2 className="text-xl font-bold sm:col-span-2">{d.form_title ?? t('Request a group proposal', 'গ্রুপ প্রস্তাবের অনুরোধ')}</h2>}
            submit={t('Send request', 'অনুরোধ পাঠান')} success={d.success ?? t('Thanks — our corporate desk will call you today.', 'ধন্যবাদ — আমাদের কর্পোরেট ডেস্ক আজই কল করবে।')}
            fields={[
              { name: 'organisation', label: `${t('Organisation', 'প্রতিষ্ঠান')} *`, required: true, autoComplete: 'organization' },
              { name: 'adults', label: t('Group size', 'দলের আকার'), type: 'number', min: 10, max: 500, defaultValue: '25' },
              { name: 'name', label: `${t('Contact person', 'যোগাযোগকারী')} *`, required: true, autoComplete: 'name' },
              { name: 'email', label: `${t('Work email', 'অফিস ইমেইল')} *`, type: 'email', required: true, autoComplete: 'email' },
              { name: 'message', label: t('Brief', 'সংক্ষিপ্ত বিবরণ'), type: 'textarea', rows: 3, full: true },
            ]} />
        </div>
      </div></section>
    </>
  );
}
