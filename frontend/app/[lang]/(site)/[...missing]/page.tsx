import type { Metadata } from 'next';
import { notFound, permanentRedirect, redirect } from 'next/navigation';
import { LegalPage, legalMetadata } from '@/components/pages/Legal';
import { api, apiData } from '@/lib/api';
import type { Lang } from '@/lib/format';
import type { CmsPage } from '@/lib/page';

type Redirect = { from_path: string; to_path: string; code: number | string };

const norm = (p: string) => ('/' + p.replace(/^\/+|\/+$/g, '')).toLowerCase();

/** Admin-managed redirects (SEO → Redirects). Paths are stored without the /en or /bn prefix. */
async function findRedirect(lang: Lang, path: string): Promise<Redirect | undefined> {
  const list = await apiData<Redirect[]>('redirects', { lang, tags: ['redirects'] }).catch(() => [] as Redirect[]);
  const p = norm(path);
  return (list ?? []).find((r) => norm(r.from_path) === p || norm(r.from_path) === norm(`/${lang}${p}`));
}

/** A page created in the admin (Pages) at /{slug} that has no dedicated route renders with the article layout. */
async function findPage(lang: Lang, segs: string[]): Promise<CmsPage | null> {
  if (segs.length !== 1 || !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(segs[0])) return null;
  const r = await api<{ data: CmsPage } | null>(`pages/${segs[0]}`, { lang, tags: ['pages', `page:${segs[0]}`], allow404: true }).catch(() => null);
  return r?.data ?? null;
}

export async function generateMetadata({ params }: PageProps<'/[lang]/[...missing]'>): Promise<Metadata> {
  const { lang, missing } = await params;
  const segs = missing.map((s) => decodeURIComponent(s));
  const page = await findPage(lang as Lang, segs);
  return page ? legalMetadata(lang as Lang, page.slug) : {};
}

/** Unknown path: admin redirect → admin page → localised not-found page (inside the site chrome). */
export default async function Missing({ params }: PageProps<'/[lang]/[...missing]'>) {
  const { lang, missing } = await params;
  const segs = missing.map((s) => decodeURIComponent(s));
  const path = '/' + segs.join('/');
  const r = await findRedirect(lang as Lang, path);
  if (r) {
    const to = /^https?:\/\//i.test(r.to_path) ? r.to_path : `/${lang}/${r.to_path.replace(/^\/+/, '').replace(/^(en|bn)\//, '')}`.replace(/\/$/, '') || `/${lang}`;
    if (String(r.code) === '302') redirect(to);
    permanentRedirect(to);
  }
  const page = await findPage(lang as Lang, segs);
  if (page) return <LegalPage lang={lang as Lang} slug={page.slug} />;
  notFound();
}
