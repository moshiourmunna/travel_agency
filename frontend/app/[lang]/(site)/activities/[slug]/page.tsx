import type { Metadata } from 'next';
import { Icon } from '@/components/icons/Icon';
import { Price } from '@/components/client/Price';
import { LightboxScope } from '@/components/detail/Lightbox';
import { ActivityBook } from '@/components/detail/MiniBook';
import { ReviewsBlock } from '@/components/detail/Reviews';
import { Picture } from '@/components/ui/Picture';
import { CancelBadge, Crumbs, Stars, type Crumb } from '@/components/ui/basics';
import { ActivityCard } from '@/components/ui/cards';
import { api, apiData } from '@/lib/api';
import type { Lang } from '@/lib/format';
import { getI18n } from '@/lib/i18n';
import { breadcrumbJsonLd, buildMetadata, JsonLd } from '@/lib/seo';
import { getSite, siteUrl } from '@/lib/site';

export async function generateStaticParams() {
  try { return (await api<{ data: { slug: string }[] }>('activities', { lang: 'en', tags: ['activities'], query: { per_page: 60 } })).data.map((d) => ({ slug: d.slug })); } catch { return []; }
}
const load = (slug: string, lang: Lang) => apiData<any>(`activities/${slug}`, { lang, tags: ['activities', `activity:${slug}`, 'reviews'] });

export async function generateMetadata({ params }: PageProps<'/[lang]/activities/[slug]'>): Promise<Metadata> {
  const { lang, slug } = (await params) as { lang: Lang; slug: string };
  const a = await load(slug, lang);
  return buildMetadata(lang, `/activities/${slug}`, { title: a.title, description: a.description, image: a.image, seo: a.seo });
}

const todayDhaka = (addDays = 1) => { const d = new Date(Date.now() + 6 * 3600e3 + addDays * 864e5); return d.toISOString().slice(0, 10); };

export default async function ActivityPage({ params }: PageProps<'/[lang]/activities/[slug]'>) {
  const { lang, slug } = (await params) as { lang: Lang; slug: string };
  const [a, i, site] = await Promise.all([load(slug, lang), getI18n(lang), getSite(lang)]);
  const t = i.t;
  const base = siteUrl(site);
  const crumbs: Crumb[] = [[t('Home', 'হোম'), i.u('/')], [t('Activities', 'অ্যাক্টিভিটি'), i.u('/activities')], [a.title, i.u(`/activities/${slug}`)]];
  const opt = a.options?.[0];
  const gal = (a.gallery ?? []).filter((g: any) => g?.id !== a.image?.id).slice(0, 2);
  const ld = [breadcrumbJsonLd(base, crumbs), {
    '@context': 'https://schema.org', '@type': ['TouristAttraction', 'Product'], name: a.title, description: a.description, image: a.image?.src, url: `${base}/${lang}/activities/${slug}`, sku: slug,
    aggregateRating: a.reviews_count ? { '@type': 'AggregateRating', ratingValue: a.rating, reviewCount: a.reviews_count, bestRating: 5 } : undefined,
    offers: { '@type': 'Offer', priceCurrency: 'BDT', price: a.price, availability: 'https://schema.org/InStock', url: `${base}/${lang}/activities/${slug}` },
  }];
  return (
    <>
      {ld.map((d, k) => <JsonLd key={k} data={d} />)}
      <div className="wrap pt-6"><Crumbs i={i} items={crumbs} /></div>
      <div className="wrap grid gap-10 py-6 lg:grid-cols-[1fr_380px]">
        <div className="min-w-0">
          <p className="text-sm font-semibold text-brand-700 dark:text-brand-300">{a.category_label} · {a.city}</p>
          <h1 className="mt-1 text-[1.75rem] font-extrabold leading-tight sm:text-4xl">{a.title}</h1>
          <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-2 text-sm"><span className="inline-flex items-center gap-1.5"><Stars i={i} rating={a.rating} /> <b>{i.d(a.rating)}</b> <a href="#reviews" className="link">({i.num(a.reviews_count)} {t('reviews', 'রিভিউ')})</a></span><CancelBadge policy={a.cancellation} />{a.badge ? <span className="badge bg-accent-400 text-ink-900">{a.badge}</span> : null}</div>
          <LightboxScope className="mt-5 grid gap-2 sm:grid-cols-[2fr_1fr]" labels={{ viewer: t('Photo viewer', 'ছবি দর্শক'), close: t('Close', 'বন্ধ'), prev: t('Previous photo', 'আগের ছবি'), next: t('Next photo', 'পরের ছবি') }} closeIcon={<Icon name="x" />} prevIcon={<Icon name="chevron-left" />} nextIcon={<Icon name="chevron-right" />}>
            <a href={a.image?.srcset?.[2]?.url ?? a.image?.src} data-lightbox data-caption={a.title}><Picture img={a.image} alt={a.title} className="aspect-[16/10] w-full rounded-3xl object-cover" priority sizes="(min-width: 1024px) 50vw, 100vw" width={1200} height={750} /></a>
            <div className="hidden gap-2 sm:grid">{gal.map((g: any, k: number) => <a key={k} href={g.srcset?.[2]?.url ?? g.src} data-lightbox data-caption={a.title}><Picture img={g} alt="" className="h-full w-full rounded-3xl object-cover" sizes="25vw" /></a>)}</div>
          </LightboxScope>
          <dl className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
            {([['clock', t('Duration', 'সময়কাল'), a.duration], ['languages', t('Languages', 'ভাষা'), (a.languages ?? []).includes('bn') ? t('English, Bangla', 'ইংরেজি, বাংলা') : t('English', 'ইংরেজি')], ['zap', t('Confirmation', 'নিশ্চিতকরণ'), a.instant_confirm ? t('Instant', 'তাৎক্ষণিক') : t('Within 24 h', '২৪ ঘণ্টার মধ্যে')], ['car', t('Pickup', 'পিকআপ'), a.pickup ? t('Hotel pickup', 'হোটেল পিকআপ') : t('Meet on site', 'স্পটে সাক্ষাৎ')]] as const).map(([ic, k, v]) => <div key={k} className="rounded-2xl border border-ink-100 p-3 dark:border-ink-800"><dt className="flex items-center gap-1.5 text-xs muted"><Icon name={ic} className="h-3.5 w-3.5" /> {k}</dt><dd className="mt-0.5 text-sm font-bold">{v}</dd></div>)}
          </dl>
          <section className="pt-10"><h2 className="text-2xl font-bold">{t('Highlights', 'হাইলাইট')}</h2><ul className="mt-4 space-y-2">{a.highlights.map((h: string, k: number) => <li key={k} className="flex gap-2"><Icon name="check" className="mt-0.5 h-5 w-5 shrink-0 text-brand-600" /> {h}</li>)}</ul></section>
          <section className="grid gap-6 pt-10 sm:grid-cols-2"><div><h2 className="text-xl font-bold">{t('Included', 'অন্তর্ভুক্ত')}</h2><ul className="mt-3 space-y-1.5 text-sm">{(a.inclusions ?? []).map((l: string, k: number) => <li key={k} className="flex gap-2"><Icon name="check" className="h-4 w-4 text-brand-600" /> {l}</li>)}</ul></div>
            <div><h2 className="text-xl font-bold">{t('Not included', 'অন্তর্ভুক্ত নয়')}</h2><ul className="mt-3 space-y-1.5 text-sm">{(a.exclusions?.length ? a.exclusions : [t('Tips (optional)', 'টিপস (ঐচ্ছিক)'), t('Personal expenses', 'ব্যক্তিগত খরচ')]).map((l: string, k: number) => <li key={k} className="flex gap-2"><Icon name="x" className="h-4 w-4 text-rose-500" /> {l}</li>)}</ul></div></section>
          <section className="pt-10"><h2 className="text-2xl font-bold">{t('Meeting point & what to bring', 'সাক্ষাতের স্থান ও যা আনবেন')}</h2><div className="mt-4 rounded-2xl bg-ink-50 p-5 text-sm dark:bg-ink-850"><p className="flex gap-2"><Icon name="map-pin" className="h-5 w-5 shrink-0 text-brand-600" /> {a.meeting_point || t('Exact meeting point and operator phone number appear on your voucher.', 'সঠিক সাক্ষাতের স্থান ও অপারেটরের ফোন নম্বর ভাউচারে থাকবে।')}</p><p className="mt-2 flex gap-2"><Icon name="backpack" className="h-5 w-5 shrink-0 text-brand-600" /> {t('Passport or NID, comfortable shoes, sunscreen and water.', 'পাসপোর্ট বা এনআইডি, আরামদায়ক জুতা, সানস্ক্রিন ও পানি।')}</p></div></section>
          <ReviewsBlock variant="card" limit={2} i={i} r={a.reviews} subject={{ type: 'activity', slug }} title={t('Reviews', 'রিভিউ')} defaults={{ guide: 4.9, value: 4.7, safety: 4.9, fun: 4.8 }} />
          {a.similar?.length ? <section className="pt-12"><h2 className="mb-5 text-2xl font-bold">{t('You might also like', 'আপনার পছন্দ হতে পারে')}</h2><div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">{a.similar.map((m: any) => <ActivityCard key={m.slug} i={i} a={m} />)}</div></section> : null}
        </div>
        <aside className="lg:sticky lg:top-24 lg:self-start" id="book">
          <ActivityBook slug={slug} price={opt?.price ?? a.price} childPrice={opt?.child_price ?? Math.round(a.price * 0.7)} times={a.times ?? []} minDate={todayDhaka(1)} booking={i.u('/booking')} minus={<Icon name="minus" className="h-4 w-4" />} plus={<Icon name="plus" className="h-4 w-4" />}
            header={<><p className="text-sm muted">{t('From', 'শুরু')}</p><p className="flex items-baseline gap-2"><span className="text-3xl font-extrabold"><Price value={a.price} /></span>{a.price_was ? <s className="muted"><Price value={a.price_was} /></s> : null}<span className="text-sm muted">/ {t('person', 'জন')}</span></p></>}
            l={{ date: t('Date', 'তারিখ'), time: t('Time', 'সময়'), adult: t('Adult', 'প্রাপ্তবয়স্ক'), child: t('Child (3–11)', 'শিশু (৩–১১)'), dec: t('Decrease', 'কমান'), inc: t('Increase', 'বাড়ান'), total: t('Total', 'মোট'), book: t('Check availability & book', 'প্রাপ্যতা দেখে বুক করুন'), note: t('Reserve now & pay later available', 'এখন রিজার্ভ, পরে পরিশোধের সুবিধা আছে'), full: t('Full', 'পূর্ণ'), left: t('left', 'বাকি') }} />
        </aside>
      </div>
      <div className="fixed inset-x-0 bottom-16 z-30 border-t border-ink-100 bg-white/95 px-3 pb-7 pt-3 backdrop-blur dark:border-ink-800 dark:bg-ink-900/95 lg:hidden"><div className="wrap flex items-center justify-between gap-3 !px-1"><div><p className="text-xs muted">{t('From', 'শুরু')}</p><p className="text-lg font-extrabold"><Price value={a.price} /></p></div><a href="#book" className="btn btn-accent">{t('Select date', 'তারিখ বাছুন')}</a></div></div>
    </>
  );
}
