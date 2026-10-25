import type { Metadata } from 'next';
import type { Lang } from './format';
import type { Image } from './types';
import { getSite, siteUrl } from './site';

export type SeoPayload = { title?: string | null; description?: string | null; og_title?: string | null; og_image?: Image; canonical?: string | null; robots?: string | null; keywords?: string | null; json_ld?: unknown } | null;

/**
 * Builds Next metadata matching the mockup head: title "X | Musafir", description, canonical, hreflang en/bn/x-default,
 * Open Graph (locale + alternate), Twitter card, robots. `path` is locale-less ("/tours/x").
 */
export async function buildMetadata(lang: Lang, path: string, o: { title: string; description?: string | null; image?: Image; seo?: SeoPayload; ogType?: 'website' | 'article'; noindex?: boolean; absoluteTitle?: boolean }): Promise<Metadata> {
  const site = await getSite(lang);
  const base = siteUrl(site);
  const suffix = site.settings?.seo?.title_suffix ?? (lang === 'bn' ? 'মুসাফির' : 'Musafir');
  const p = path === '/' ? '' : path;
  const rawTitle = o.seo?.title || o.title;
  const title = o.absoluteTitle || rawTitle.includes(suffix) ? rawTitle : `${rawTitle} | ${suffix}`;
  const description = o.seo?.description || o.description || site.settings?.seo?.default_description || '';
  const img = o.seo?.og_image ?? o.image;
  const ogUrl = img?.srcset?.[2]?.url ?? img?.src ?? `${base}/brand/icon-512.png`;
  const canonical = o.seo?.canonical || `${base}/${lang}${p}`;
  const robots = o.noindex || (o.seo?.robots ?? '').includes('noindex') ? { index: false, follow: !(o.seo?.robots ?? '').includes('nofollow') } : { index: true, follow: true, 'max-image-preview': 'large' as const };
  return {
    metadataBase: new URL(base),
    title: { absolute: title },
    description,
    keywords: o.seo?.keywords || undefined,
    alternates: { canonical, languages: { en: `${base}/en${p}`, bn: `${base}/bn${p}`, 'x-default': `${base}/en${p}` } },
    robots,
    openGraph: {
      type: o.ogType ?? 'website',
      siteName: lang === 'bn' ? 'মুসাফির' : 'Musafir',
      title: o.seo?.og_title || title,
      description,
      url: canonical,
      locale: lang === 'bn' ? 'bn_BD' : 'en_US',
      alternateLocale: lang === 'bn' ? 'en_US' : 'bn_BD',
      images: [{ url: ogUrl, width: 1600, height: 1000, alt: img?.alt || rawTitle }],
    },
    twitter: { card: 'summary_large_image', site: '@musafirbd', title, description, images: [ogUrl] },
  };
}

export function JsonLd({ data }: { data: unknown }) {
  if (!data) return null;
  return <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(data).replace(/</g, '\\u003c') }} />;
}

export async function orgJsonLd(lang: Lang) {
  const site = await getSite(lang);
  const base = siteUrl(site);
  const c = site.settings.company ?? {};
  const social = (site.settings.social?.links ?? []).map((l: { url: string }) => l.url).filter((u: string) => !u.includes('wa.me'));
  return {
    '@context': 'https://schema.org',
    '@type': ['TravelAgency', 'Organization'],
    '@id': `${base}/#org`,
    name: c.name,
    alternateName: lang === 'bn' ? 'Musafir' : 'মুসাফির',
    url: `${base}/`,
    logo: `${base}/brand/icon-512.png`,
    telephone: c.hotline_tel,
    email: c.email,
    priceRange: '৳৳',
    address: { '@type': 'PostalAddress', streetAddress: c.address, addressLocality: 'Dhaka', addressCountry: 'BD' },
    geo: c.geo ? { '@type': 'GeoCoordinates', latitude: c.geo.lat, longitude: c.geo.lng } : undefined,
    foundingDate: c.founded ? String(c.founded) : undefined,
    sameAs: social,
    aggregateRating: c.rating ? { '@type': 'AggregateRating', ratingValue: c.rating.value, reviewCount: c.rating.count, bestRating: 5 } : undefined,
  };
}

export function breadcrumbJsonLd(base: string, items: [string, string][]) {
  return { '@context': 'https://schema.org', '@type': 'BreadcrumbList', itemListElement: items.map(([name, url], k) => ({ '@type': 'ListItem', position: k + 1, name, item: url.startsWith('http') ? url : base + url })) };
}
