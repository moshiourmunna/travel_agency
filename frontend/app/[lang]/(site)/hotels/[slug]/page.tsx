import type { Metadata } from 'next';
import Link from 'next/link';
import { Icon } from '@/components/icons/Icon';
import { Price } from '@/components/client/Price';
import { LightboxScope } from '@/components/detail/Lightbox';
import { HotelBook } from '@/components/detail/MiniBook';
import { RouteMap } from '@/components/detail/RouteMap';
import { HotelCard, ReviewCard, Wish } from '@/components/ui/cards';
import { Picture } from '@/components/ui/Picture';
import { Crumbs, type Crumb } from '@/components/ui/basics';
import { api, apiData } from '@/lib/api';
import type { Lang } from '@/lib/format';
import { getI18n } from '@/lib/i18n';
import { breadcrumbJsonLd, buildMetadata, JsonLd } from '@/lib/seo';
import { getSite, siteUrl } from '@/lib/site';

// Slugs not known at build (new admin content, or a build without the API) render on first request, then cache (ISR).
// Explicit because the [lang] layout sets dynamicParams = false for the locale segment.
export const dynamicParams = true;

export async function generateStaticParams() {
  try { return (await api<{ data: { slug: string }[] }>('hotels', { lang: 'en', tags: ['hotels'], query: { per_page: 60 } })).data.map((d) => ({ slug: d.slug })); } catch { return []; }
}
const load = (slug: string, lang: Lang) => apiData<any>(`hotels/${slug}`, { lang, tags: ['hotels', `hotel:${slug}`, 'reviews'] });

export async function generateMetadata({ params }: PageProps<'/[lang]/hotels/[slug]'>): Promise<Metadata> {
  const { lang, slug } = (await params) as { lang: Lang; slug: string };
  const h = await load(slug, lang);
  return buildMetadata(lang, `/hotels/${slug}`, { title: h.name, description: h.description, image: h.image, seo: h.seo });
}

const dhaka = (addDays: number) => new Date(Date.now() + 6 * 3600e3 + addDays * 864e5).toISOString().slice(0, 10);

export default async function HotelPage({ params }: PageProps<'/[lang]/hotels/[slug]'>) {
  const { lang, slug } = (await params) as { lang: Lang; slug: string };
  const [h, i, site] = await Promise.all([load(slug, lang), getI18n(lang), getSite(lang)]);
  const t = i.t;
  const base = siteUrl(site);
  const crumbs: Crumb[] = [[t('Home', 'হোম'), i.u('/')], [t('Hotels', 'হোটেল'), i.u('/hotels')], [h.name, i.u(`/hotels/${slug}`)]];
  const gallery = [h.image, ...(h.gallery ?? []).filter((g: any) => g?.id !== h.image?.id)].filter(Boolean).slice(0, 5);
  const rules: { icon: string; title: string; text: string }[] = h.house_rules ?? site.settings.catalog?.hotel_house_rules ?? [];
  const addons = (site.settings.commerce?.hotel_addons ?? []).map((a: any) => ({ code: a.code, label: a.label, price: a.price, per: a.per }));
  const score = h.rating as number;
  const word = score >= 9 ? t('Excellent', 'চমৎকার') : score >= 8 ? t('Very good', 'খুব ভালো') : t('Good', 'ভালো');
  // Category scores: averaged from reviews when available, otherwise derived from the overall score.
  const clamp = (n: number) => Math.min(10, Math.max(0, Math.round(n * 10) / 10));
  const scores: [string, number][] = h.reviews?.scores
    ? Object.entries(h.reviews.scores as Record<string, number>).map(([k, v]) => [k, v <= 5 ? v * 2 : v])
    : [[t('Cleanliness', 'পরিচ্ছন্নতা'), clamp(score + 0.2)], [t('Location', 'অবস্থান'), clamp(score + 0.4)], [t('Staff', 'স্টাফ'), clamp(score)], [t('Value for money', 'মূল্যমান'), clamp(score - 0.4)]];
  const ld = [breadcrumbJsonLd(base, crumbs), {
    '@context': 'https://schema.org', '@type': h.kind === 'resort' ? 'Resort' : 'Hotel', name: h.name, description: h.description, image: gallery.map((g: any) => g.src), url: `${base}/${lang}/hotels/${slug}`,
    starRating: { '@type': 'Rating', ratingValue: h.stars }, address: { '@type': 'PostalAddress', addressLocality: h.city, streetAddress: h.address ?? undefined },
    geo: h.lat && h.lng ? { '@type': 'GeoCoordinates', latitude: h.lat, longitude: h.lng } : undefined,
    amenityFeature: h.amenities.map((a: any) => ({ '@type': 'LocationFeatureSpecification', name: a.label, value: true })),
    aggregateRating: h.reviews_count ? { '@type': 'AggregateRating', ratingValue: score, reviewCount: h.reviews_count, bestRating: 10 } : undefined,
    priceRange: `BDT ${Math.min(...h.rooms.map((r: any) => r.price), h.price)}–${Math.max(...h.rooms.map((r: any) => r.price), h.price)}`,
    checkinTime: '14:00', checkoutTime: '12:00',
  }];
  return (
    <>
      {ld.map((d, k) => <JsonLd key={k} data={d} />)}
      <div className="wrap pt-6"><Crumbs i={i} items={crumbs} /></div>
      <section className="wrap mt-4">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div><div className="flex items-center gap-1 text-accent-400" role="img" aria-label={`${i.d(h.stars)} ${t('star hotel', 'তারকা হোটেল')}`}>{Array.from({ length: h.stars }).map((_, k) => <Icon key={k} name="star" className="h-4 w-4 fill-current" />)}</div>
            <h1 className="mt-1 text-3xl font-extrabold sm:text-4xl">{h.name}</h1>
            <p className="mt-2 flex items-center gap-1.5 muted"><Icon name="map-pin" className="h-4 w-4" /> {h.city}{h.distance ? ` · ${h.distance}` : ''}</p></div>
          <div className="flex items-center gap-3"><div className="text-right"><p className="font-bold">{word}</p><a href="#reviews" className="text-xs muted hover:underline">{i.num(h.reviews_count)} {t('verified reviews', 'যাচাইকৃত রিভিউ')}</a></div><span className="rounded-xl bg-brand-700 px-3 py-2 text-xl font-extrabold text-white">{i.d(score)}</span><Wish i={i} id={slug} kind="hotel" /></div>
        </div>
        <LightboxScope className="mt-5 grid h-[260px] grid-cols-4 grid-rows-2 gap-2 overflow-hidden rounded-3xl sm:h-[420px]" labels={{ viewer: t('Photo viewer', 'ছবি দর্শক'), close: t('Close', 'বন্ধ'), prev: t('Previous photo', 'আগের ছবি'), next: t('Next photo', 'পরের ছবি') }} closeIcon={<Icon name="x" />} prevIcon={<Icon name="chevron-left" />} nextIcon={<Icon name="chevron-right" />}>
          {gallery.map((g: any, k: number) => (
            <a key={k} href={g.srcset?.[2]?.url ?? g.src} data-lightbox data-caption={h.name} className={`relative ${k === 0 ? 'col-span-4 row-span-2 sm:col-span-2' : 'hidden sm:block'}`}>
              <Picture img={g} alt={`${h.name} — ${i.d(k + 1)}`} className="img-cover transition hover:opacity-90" priority={k === 0} sizes={k === 0 ? '(min-width: 640px) 50vw, 100vw' : '25vw'} width={k === 0 ? 1600 : 640} height={k === 0 ? 1000 : 400} />
              {k === gallery.length - 1 && k > 0 ? <span className="absolute bottom-3 right-3 inline-flex items-center gap-1.5 rounded-xl bg-white/90 px-3 py-1.5 text-sm font-semibold text-ink-900"><Icon name="images" className="h-4 w-4" /> {t('All photos', 'সব ছবি')}</span> : null}
            </a>
          ))}
        </LightboxScope>
      </section>
      <div className="wrap grid gap-10 py-10 lg:grid-cols-[1fr_360px]">
        <div className="min-w-0 space-y-10">
          <section><h2 className="text-2xl font-bold">{t('About this property', 'প্রপার্টি সম্পর্কে')}</h2><p className="mt-3 leading-7 text-ink-600 dark:text-ink-300">{h.description}</p>
            <h3 className="mt-6 font-bold">{t('Popular amenities', 'জনপ্রিয় সুবিধা')}</h3>
            <ul className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-3">{h.amenities.map((a: any) => <li key={a.code} className="flex items-center gap-2 text-sm"><Icon name={a.icon} className="h-5 w-5 text-brand-600" /> {a.label}</li>)}</ul></section>
          <section id="rooms" className="scroll-mt-28"><h2 className="text-2xl font-bold">{t('Choose your room', 'রুম বেছে নিন')}</h2>
            <div className="mt-5 space-y-4">{h.rooms.map((r: any) => (
              <article key={r.id} className="card grid gap-4 p-4 sm:grid-cols-[160px_1fr_auto] sm:items-center">
                <Picture img={r.image ?? h.image} alt={r.name} className="aspect-[16/10] w-full rounded-xl object-cover sm:aspect-square" sizes="160px" width={640} height={400} />
                <div><h3 className="font-bold">{r.name}</h3><p className="mt-1 flex flex-wrap gap-x-3 gap-y-1 text-sm muted"><span className="inline-flex items-center gap-1"><Icon name="bed-double" className="h-4 w-4" /> {r.bed}</span><span className="inline-flex items-center gap-1"><Icon name="users" className="h-4 w-4" /> {i.d(r.occupancy)} {t('guests', 'জন অতিথি')}</span>{r.size_sqm ? <span className="inline-flex items-center gap-1"><Icon name="maximize" className="h-4 w-4" /> {i.d(r.size_sqm)} m²</span> : null}</p>
                  <ul className="mt-2 space-y-1 text-xs font-semibold">{r.breakfast ? <li className="text-emerald-700 dark:text-emerald-400">✓ {t('Breakfast included', 'নাশতা অন্তর্ভুক্ত')}</li> : null}{r.refundable ? <li className="text-emerald-700 dark:text-emerald-400">✓ {t('Free cancellation until 48 h before', '৪৮ ঘণ্টা আগে পর্যন্ত ফ্রি বাতিল')}</li> : <li className="text-ink-500 dark:text-ink-300">{t('Non-refundable — lowest price', 'অফেরতযোগ্য — সর্বনিম্ন মূল্য')}</li>}</ul></div>
                <div className="flex items-end justify-between gap-3 sm:flex-col sm:items-end"><div className="sm:text-right"><p className="text-xl font-extrabold"><Price value={r.price} /></p><p className="text-xs muted">{t('per night', 'প্রতি রাত')}</p>{r.rooms_left && r.rooms_left <= 5 ? <p className="text-xs font-semibold text-rose-600">{t('Only', 'মাত্র')} {i.d(r.rooms_left)} {t('left', 'বাকি')}</p> : null}</div>
                  <Link href={`${i.u('/booking')}?hotel=${slug}&room=${r.id}`} className="btn btn-primary btn-sm" aria-label={`${t('Reserve', 'রিজার্ভ')} — ${r.name}`}>{t('Reserve', 'রিজার্ভ')}</Link></div>
              </article>
            ))}</div></section>
          {rules.length ? <section><h2 className="text-2xl font-bold">{t('House rules', 'হাউস রুলস')}</h2>
            <ul className="mt-4 grid gap-4 sm:grid-cols-2">{rules.map((r, k) => <li key={k} className="flex gap-3"><span className="text-brand-600"><Icon name={r.icon} className="h-5 w-5" /></span><div><p className="text-sm font-bold">{r.title}</p><p className="text-sm muted">{r.text}</p></div></li>)}</ul></section> : null}
          <section id="reviews" className="scroll-mt-28"><h2 className="text-2xl font-bold">{t('Guest reviews', 'অতিথিদের রিভিউ')}</h2>
            <div className="mt-4 grid gap-3 sm:grid-cols-2">{scores.map(([k, v]) => <div key={k}><div className="flex justify-between text-sm"><span>{k}</span><b>{i.d(v)}</b></div><div className="mt-1 h-2 rounded-full bg-ink-100 dark:bg-ink-800" role="img" aria-label={`${k} ${i.d(v)}/${i.d(10)}`}><div className="h-2 rounded-full bg-brand-600" style={{ width: `${v * 10}%` }} /></div></div>)}</div>
            <div className="mt-6 grid gap-5 md:grid-cols-2">{(h.reviews?.items ?? []).slice(0, 2).map((x: any) => <ReviewCard key={x.id} i={i} r={x} />)}</div></section>
          <section><h2 className="text-2xl font-bold">{t('Location', 'অবস্থান')}</h2><div className="mt-4"><RouteMap i={i} stops={[h.name, h.city]} query={`${h.name}, ${h.city}`} /></div></section>
        </div>
        <aside className="lg:sticky lg:top-24 lg:self-start" id="book">
          <HotelBook slug={slug} price={h.price} priceWas={h.price_was} rooms={h.rooms.map((r: any) => ({ id: r.id, name: r.name, price: r.price }))} addons={addons} minDate={dhaka(0)} checkin={dhaka(30)} checkout={dhaka(33)} booking={i.u('/booking')}
            minus={<Icon name="minus" className="h-4 w-4" />} plus={<Icon name="plus" className="h-4 w-4" />}
            l={{ night: t('night', 'রাত'), in: t('Check-in', 'চেক-ইন'), out: t('Check-out', 'চেক-আউট'), room: t('Room type', 'রুমের ধরন'), rooms: t('Rooms', 'রুম'), nights: t('nights', 'রাত'), fewer: t('Fewer', 'কমান'), more: t('More', 'বাড়ান'), total: t('Total (incl. VAT)', 'মোট (ভ্যাটসহ)'), reserve: t('Reserve now', 'এখনই রিজার্ভ করুন'), note: t('You won’t be charged yet', 'এখনই কোনো টাকা কাটা হবে না'), bad: t('Check-out must be after check-in.', 'চেক-আউট অবশ্যই চেক-ইনের পরে হতে হবে।') }} />
        </aside>
      </div>
      {h.similar?.length ? <section className="wrap pb-16"><h2 className="mb-5 text-2xl font-bold">{t('Similar stays', 'একই ধরনের থাকার জায়গা')}</h2><div className="space-y-5">{h.similar.map((m: any) => <HotelCard key={m.slug} i={i} h={m} />)}</div></section> : null}
      <div className="fixed inset-x-0 bottom-16 z-30 border-t border-ink-100 bg-white/95 px-3 pb-7 pt-3 backdrop-blur dark:border-ink-800 dark:bg-ink-900/95 lg:hidden"><div className="wrap flex items-center justify-between gap-3 !px-1"><div><p className="text-xs muted">{t('From', 'শুরু')} / {t('night', 'রাত')}</p><p className="text-lg font-extrabold"><Price value={h.price} /></p></div><a href="#book" className="btn btn-accent">{t('Select dates', 'তারিখ বাছুন')}</a></div></div>
    </>
  );
}
