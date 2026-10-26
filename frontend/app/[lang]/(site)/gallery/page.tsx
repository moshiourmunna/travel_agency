import type { Metadata } from 'next';
import Link from 'next/link';
import { QuickFilter } from '@/components/client/HomeBits';
import { LightboxScope } from '@/components/detail/Lightbox';
import { Icon } from '@/components/icons/Icon';
import { PageHero, type Crumb } from '@/components/ui/basics';
import { apiData } from '@/lib/api';
import type { Lang } from '@/lib/format';
import { getI18n } from '@/lib/i18n';
import { getPage, pageMetadata } from '@/lib/page';
import { breadcrumbJsonLd, JsonLd } from '@/lib/seo';
import { getSite, siteUrl } from '@/lib/site';

export async function generateMetadata({ params }: PageProps<'/[lang]/gallery'>): Promise<Metadata> {
  return pageMetadata((await params).lang as Lang, 'gallery', '/gallery');
}

const ASPECTS = ['aspect-[4/5]', 'aspect-[4/3]', 'aspect-square'];

export default async function GalleryPage({ params }: PageProps<'/[lang]/gallery'>) {
  const lang = (await params).lang as Lang;
  const [i, page, albums, site] = await Promise.all([getI18n(lang), getPage('gallery', lang), apiData<any[]>('gallery', { lang, tags: ['gallery'] }), getSite(lang)]);
  const t = i.t;
  const crumbs: Crumb[] = [[t('Home', 'হোম'), i.u('/')], [t('Gallery', 'গ্যালারি'), i.u('/gallery')]];
  // one masonry across albums, in the admin's photo order (chips filter by album)
  const items = albums.flatMap((a) => a.items.map((x: any, k: number) => ({ ...x, album: a.slug, k }))).sort((a, b) => (a.sort ?? 0) - (b.sort ?? 0));
  const base = siteUrl(site);
  const ld = { '@context': 'https://schema.org', '@type': 'ImageGallery', name: page.title, url: `${base}/${lang}/gallery`, image: items.filter((x) => x.image).slice(0, 30).map((x) => ({ '@type': 'ImageObject', contentUrl: x.image.src, caption: x.caption, creator: x.image.credit ? { '@type': 'Person', name: x.image.credit } : undefined, license: x.image.credit_url })) };
  return (
    <>
      <JsonLd data={breadcrumbJsonLd(base, crumbs)} />
      <JsonLd data={ld} />
      <PageHero i={i} title={page.title} sub={page.subtitle} crumbs={crumbs} image={page.image} />
      <section className="section"><div className="wrap">
        <QuickFilter label={t('Filter photos', 'ছবি ফিল্টার')} rowClass="mb-6" chipsClass="flex flex-wrap gap-2" options={[{ value: 'all', label: t('All', 'সব') }, ...albums.map((a) => ({ value: a.slug, label: a.title }))]}>
          <LightboxScope className="columns-2 gap-4 md:columns-3 xl:columns-4 [&>*]:mb-4" labels={{ viewer: t('Photo viewer', 'ছবি দর্শক'), close: t('Close', 'বন্ধ'), prev: t('Previous photo', 'আগের ছবি'), next: t('Next photo', 'পরের ছবি') }} closeIcon={<Icon name="x" />} prevIcon={<Icon name="chevron-left" />} nextIcon={<Icon name="chevron-right" />}>
            {items.filter((x) => x.image).map((x, k) => (
              <a key={`${x.album}-${x.k}`} href={x.image.srcset?.at(-1)?.url ?? x.image.src} data-lightbox data-caption={x.caption} data-item data-cats={x.album} className="group relative block break-inside-avoid overflow-hidden rounded-2xl">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={x.image.srcset?.[0]?.url ?? x.image.src} alt={x.caption} className={`w-full object-cover transition duration-500 group-hover:scale-105 ${ASPECTS[k % 3]}`} loading="lazy" decoding="async" width={640} height={400} />
                <span className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-ink-950/80 to-transparent p-3 text-sm font-semibold text-white opacity-0 transition group-hover:opacity-100 group-focus-visible:opacity-100">{x.caption}</span>
              </a>
            ))}
          </LightboxScope>
        </QuickFilter>
        <p className="mt-8 text-xs muted">{t('Photos: Wikimedia Commons contributors under Creative Commons licences — see', 'ছবি: উইকিমিডিয়া কমন্স অবদানকারী, ক্রিয়েটিভ কমন্স লাইসেন্স — দেখুন')} <Link className="link" href={i.u('/credits')}>{t('image credits', 'ছবির ক্রেডিট')}</Link>.</p>
      </div></section>
    </>
  );
}
