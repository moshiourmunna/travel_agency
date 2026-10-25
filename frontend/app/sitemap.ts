import type { MetadataRoute } from 'next';

export const revalidate = 3600;

/** Every public URL in both languages with hreflang alternates; data comes from GET /api/v1/sitemap (respects noindex / in_sitemap). */
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = (process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000').replace(/\/$/, '');
  const api = (process.env.API_URL || 'http://127.0.0.1:8000').replace(/\/$/, '');
  let rows: { path: string; lastmod?: string; priority?: number; changefreq?: string }[] = [];
  try {
    const r = await fetch(`${api}/api/v1/sitemap`, { headers: { Accept: 'application/json', 'X-Musafir-Ssr': process.env.REVALIDATE_SECRET || '' }, next: { tags: ['all', 'sitemap'], revalidate: 3600 } });
    rows = (await r.json()).data ?? [];
  } catch {}
  if (!rows.some((r) => r.path === '/')) rows.unshift({ path: '/', priority: 1, changefreq: 'daily' });
  return rows.flatMap((r) => {
    const p = r.path === '/' ? '' : r.path;
    const alternates = { languages: { en: `${base}/en${p}`, bn: `${base}/bn${p}`, 'x-default': `${base}/en${p}` } };
    return (['en', 'bn'] as const).map((l) => ({
      url: `${base}/${l}${p}`,
      lastModified: r.lastmod ? new Date(r.lastmod) : undefined,
      changeFrequency: (r.changefreq ?? 'weekly') as MetadataRoute.Sitemap[number]['changeFrequency'],
      priority: Number(r.priority ?? 0.7),
      alternates,
    }));
  });
}
