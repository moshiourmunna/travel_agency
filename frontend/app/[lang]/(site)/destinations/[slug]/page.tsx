import type { Metadata } from 'next';
import { Icon } from '@/components/icons/Icon';
import { RouteMap } from '@/components/detail/RouteMap';
import { InquiryForm } from '@/components/forms/QuoteForm';
import { DIMMED_HERO_SIZES, Picture } from '@/components/ui/Picture';
import { Crumbs, type Crumb } from '@/components/ui/basics';
import { ActivityCard, TourCard } from '@/components/ui/cards';
import { api, apiData } from '@/lib/api';
import type { Lang } from '@/lib/format';
import { getI18n } from '@/lib/i18n';
import { nextMonths } from '@/lib/months';
import { breadcrumbJsonLd, buildMetadata, JsonLd } from '@/lib/seo';
import { getSite, siteUrl } from '@/lib/site';

export async function generateStaticParams() {
  try { return (await api<{ data: { slug: string }[] }>('destinations', { lang: 'en', tags: ['destinations'] })).data.map((d) => ({ slug: d.slug })); } catch { return []; }
}
const load = (slug: string, lang: Lang) => apiData<any>(`destinations/${slug}`, { lang, tags: ['destinations', `destination:${slug}`, 'tours', 'activities'] });

export async function generateMetadata({ params }: PageProps<'/[lang]/destinations/[slug]'>): Promise<Metadata> {
  const { lang, slug } = (await params) as { lang: Lang; slug: string };
  const d = await load(slug, lang);
  return buildMetadata(lang, `/destinations/${slug}`, { title: d.name, description: d.description, image: d.image, seo: d.seo });
}

export default async function DestinationPage({ params }: PageProps<'/[lang]/destinations/[slug]'>) {
  const { lang, slug } = (await params) as { lang: Lang; slug: string };
  const [d, i, site] = await Promise.all([load(slug, lang), getI18n(lang), getSite(lang)]);
  const t = i.t;
  const base = siteUrl(site);
  const crumbs: Crumb[] = [[t('Home', 'হোম'), i.u('/')], [t('Destinations', 'গন্তব্য'), i.u('/destinations')], [d.name, i.u(`/destinations/${slug}`)]];
  const ld = { '@context': 'https://schema.org', '@type': 'TouristDestination', name: d.name, description: d.description, image: d.image?.src, url: `${base}/${lang}/destinations/${slug}`,
    geo: d.lat ? { '@type': 'GeoCoordinates', latitude: d.lat, longitude: d.lng } : undefined, containedInPlace: { '@type': 'Country', name: d.country }, touristType: d.things_to_do };
  return (
    <>
      <JsonLd data={breadcrumbJsonLd(base, crumbs)} /><JsonLd data={ld} />
      <section className="relative isolate overflow-hidden bg-ink-950">
        <Picture img={d.image} alt={d.name} className="img-cover absolute inset-0 -z-10 opacity-75" priority sizes={DIMMED_HERO_SIZES} width={1600} height={1000} />
        <div className="absolute inset-0 -z-10 bg-gradient-to-t from-ink-950 via-ink-950/40 to-ink-950/20" />
        <div className="wrap flex min-h-[420px] flex-col justify-end py-10 md:min-h-[520px]">
          <Crumbs i={i} items={crumbs} light />
          <h1 className="mt-4 text-4xl font-extrabold text-white sm:text-6xl">{d.name}</h1>
          <p className="mt-3 max-w-2xl text-lg text-white/85">{d.description}</p>
        </div>
      </section>
      <section className="border-b border-ink-100 bg-white dark:border-ink-800 dark:bg-ink-900">
        <ul className="wrap grid grid-cols-2 gap-4 py-6 md:grid-cols-5">
          {([['sun', t('Best time', 'সেরা সময়'), d.best_time], ['stamp', t('Visa', 'ভিসা'), d.visa_info], ['banknote', t('Currency', 'মুদ্রা'), d.currency], ['plane', t('From Dhaka', 'ঢাকা থেকে'), d.flight_time], ['map', t('Packages', 'প্যাকেজ'), `${i.d(d.tours_count)} ${t('tours', 'ট্যুর')}`]] as const).map(([ic, k, v]) => (
            <li key={k} className="flex items-center gap-3"><span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-brand-50 text-brand-700 dark:bg-brand-900/40 dark:text-brand-300"><Icon name={ic} className="h-5 w-5" /></span><div><p className="text-xs muted">{k}</p><p className="text-sm font-bold text-ink-900 dark:text-white">{v || '—'}</p></div></li>
          ))}
        </ul>
      </section>
      <div className="wrap grid gap-10 py-14 lg:grid-cols-[1fr_340px]">
        <div className="min-w-0">
          <h2 className="text-2xl font-bold">{t('Top things to do', 'যা যা করবেন')}</h2>
          <div className="mt-5 grid gap-4 sm:grid-cols-2">{(d.things_to_do ?? []).map((th: string, k: number) => <div key={k} className="card flex items-center gap-4 p-4"><span className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-accent-100 text-lg font-extrabold text-accent-700 dark:bg-accent-900/40 dark:text-accent-200">{i.d(k + 1)}</span><div><p className="font-bold text-ink-900 dark:text-white">{th}</p><p className="text-xs muted">{t('Included in selected packages', 'নির্দিষ্ট প্যাকেজে অন্তর্ভুক্ত')}</p></div></div>)}</div>
          {d.tours?.length ? <><h2 className="mt-12 text-2xl font-bold">{t('Packages to', 'প্যাকেজ:')} {d.name}</h2><div className="mt-5 grid gap-5 sm:grid-cols-2">{d.tours.map((x: any) => <TourCard key={x.slug} i={i} x={x} />)}</div></> : null}
          {d.nearby_tours?.length ? <><h2 className="mt-12 text-2xl font-bold">{t('More tours in', 'আরও ট্যুর:')} {d.country}</h2><div className="mt-5 grid gap-5 sm:grid-cols-2">{d.nearby_tours.map((x: any) => <TourCard key={x.slug} i={i} x={x} />)}</div></> : null}
          {d.activities?.length ? <><h2 className="mt-12 text-2xl font-bold">{t('Things to do in', 'যা করবেন:')} {d.name}</h2><div className="mt-5 grid gap-5 sm:grid-cols-2">{d.activities.map((a: any) => <ActivityCard key={a.slug} i={i} a={a} />)}</div></> : null}
          <h2 className="mt-12 text-2xl font-bold">{t('Travel tips', 'ভ্রমণ টিপস')}</h2>
          <div className="prose-m"><ul>
            <li>{t('Carry a photocopy of your passport/NID and keep digital copies in the Musafir app.', 'পাসপোর্ট/এনআইডির ফটোকপি সাথে রাখুন এবং ডিজিটাল কপি মুসাফির অ্যাপে সংরক্ষণ করুন।')}</li>
            <li>{t('Book at least 3–4 weeks ahead for peak season and public holidays.', 'ভরা মৌসুম ও সরকারি ছুটিতে অন্তত ৩–৪ সপ্তাহ আগে বুক করুন।')}</li>
            <li>{t('Dress modestly at religious sites and respect local customs.', 'ধর্মীয় স্থানে শালীন পোশাক পরুন ও স্থানীয় রীতি মেনে চলুন।')}</li>
            <li>{t('Keep some cash in local currency; cards are widely accepted in cities.', 'কিছু স্থানীয় মুদ্রা নগদ রাখুন; শহরে কার্ড সহজে চলে।')}</li>
          </ul></div>
        </div>
        <aside className="space-y-5">
          <div className="card p-5"><h2 className="font-bold">{t('Get a free quote', 'ফ্রি কোটেশন নিন')}</h2><p className="mt-1 text-sm muted">{t('Our', 'আমাদের')} {d.name} {t('specialist replies within 2 hours.', 'বিশেষজ্ঞ ২ ঘণ্টার মধ্যে উত্তর দেবেন।')}</p>
            <div className="mt-4"><InquiryForm idPrefix="dq" type="quote" extra={{ destination: d.name }} submit={t('Request quote', 'কোটেশন চান')} success={t('Thanks! A specialist will call you within 2 hours.', 'ধন্যবাদ! একজন বিশেষজ্ঞ ২ ঘণ্টার মধ্যে কল করবেন।')}
              fields={[
                { name: 'name', label: t('Full name', 'পূর্ণ নাম'), required: true, autoComplete: 'name', error: t('Please enter your name.', 'আপনার নাম লিখুন।') },
                { name: 'phone', label: t('Mobile number', 'মোবাইল নম্বর'), type: 'tel', required: true, placeholder: '01XXXXXXXXX', autoComplete: 'tel', error: t('Enter a valid BD mobile number.', 'সঠিক মোবাইল নম্বর দিন।') },
                { name: 'travel_month', label: t('Travel month', 'ভ্রমণের মাস'), type: 'select', options: [...nextMonths(lang, 4).slice(1), { value: 'not-sure', label: t('Not sure yet', 'এখনো ঠিক হয়নি') }] },
              ]} /></div></div>
          <RouteMap i={i} stops={[d.name, ...(d.things_to_do ?? []).slice(0, 3)]} query={`${d.name}, ${d.country}`} />
        </aside>
      </div>
    </>
  );
}
