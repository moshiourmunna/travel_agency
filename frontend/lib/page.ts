import 'server-only';
import { cache } from 'react';
import type { Metadata } from 'next';
import { apiData } from './api';
import type { Lang } from './format';
import { buildMetadata, type SeoPayload } from './seo';
import type { Image } from './types';

export type CmsPage = { slug: string; template: string; title: string; subtitle: string | null; body: string | null; image?: Image; data: Record<string, any>; updated_at: string | null; sections: any[]; seo: SeoPayload };

/** Admin-managed page record (H1, subtitle, hero, page data blocks, sections, SEO). Cached per request. */
export const getPage = cache((slug: string, lang: Lang) => apiData<CmsPage>(`pages/${slug}`, { lang, tags: ['pages', `page:${slug}`] }));

/** Replace ":name" placeholders (e.g. ":count") in admin copy. */
export const fill = (s: string | null | undefined, vars: Record<string, string | number>) => (s ?? '').replace(/:([a-z_]+)/g, (m, k) => (k in vars ? String(vars[k]) : m));

export async function pageMetadata(lang: Lang, slug: string, path = `/${slug}`, extra: { noindex?: boolean } = {}): Promise<Metadata> {
  const p = await getPage(slug, lang);
  return buildMetadata(lang, path, { title: p.title, description: p.subtitle?.includes(':') ? null : p.subtitle, image: p.image, seo: p.seo, noindex: extra.noindex });
}
