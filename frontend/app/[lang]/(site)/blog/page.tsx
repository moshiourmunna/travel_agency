import type { Metadata } from 'next';
import Link from 'next/link';
import { QuickFilter } from '@/components/client/HomeBits';
import { Pagination } from '@/components/listing/Pagination';
import { PageHero, type Crumb } from '@/components/ui/basics';
import { Picture } from '@/components/ui/Picture';
import { api } from '@/lib/api';
import type { Lang } from '@/lib/format';
import { getI18n } from '@/lib/i18n';
import { getPage, pageMetadata } from '@/lib/page';
import { breadcrumbJsonLd, JsonLd } from '@/lib/seo';
import { getSite, siteUrl } from '@/lib/site';

export async function generateMetadata({ params, searchParams }: PageProps<'/[lang]/blog'>): Promise<Metadata> {
  const sp = await searchParams;
  return pageMetadata((await params).lang as Lang, 'blog', '/blog', { noindex: !!sp.page && sp.page !== '1' });
}

export default async function BlogPage({ params, searchParams }: PageProps<'/[lang]/blog'>) {
  const lang = (await params).lang as Lang;
  const sp = await searchParams;
  const pg = Math.max(1, Number(Array.isArray(sp.page) ? sp.page[0] : sp.page) || 1);
  const [i, page, res, site] = await Promise.all([getI18n(lang), getPage('blog', lang), api<{ data: any[]; meta: any }>('posts', { lang, tags: ['posts'], query: { page: pg, per_page: 12 } }), getSite(lang)]);
  const t = i.t;
  const posts = res.data;
  const f = pg === 1 ? posts.find((p) => p.is_featured) ?? posts[0] : null;
  const crumbs: Crumb[] = [[t('Home', 'হোম'), i.u('/')], [t('Blog', 'ব্লগ'), i.u('/blog')]];
  const base = siteUrl(site);
  const min = (n: number) => `${i.d(n)} ${t('min read', 'মিনিট পড়া')}`;
  const ld = { '@context': 'https://schema.org', '@type': 'Blog', name: page.title, url: `${base}/${lang}/blog`, blogPost: posts.map((p) => ({ '@type': 'BlogPosting', headline: p.title, url: `${base}/${lang}/blog/${p.slug}`, datePublished: p.published_at, author: { '@type': 'Person', name: p.author }, image: p.image?.src })) };
  const cats = (res.meta.categories ?? []).filter((c: any) => posts.some((p) => p.category_slug === c.slug));
  return (
    <>
      <JsonLd data={breadcrumbJsonLd(base, crumbs)} />
      <JsonLd data={ld} />
      <PageHero i={i} title={page.title} sub={page.subtitle} crumbs={crumbs} image={page.image} />
      {f ? (
        <section className="section !pb-8"><div className="wrap">
          <Link href={i.u(`/blog/${f.slug}`)} className="card card-hover group grid overflow-hidden md:grid-cols-2">
            <div className="aspect-[16/10] overflow-hidden md:aspect-auto"><Picture img={f.image} className="img-cover transition duration-700 group-hover:scale-105" sizes="(min-width: 768px) 50vw, 100vw" width={1200} height={750} priority /></div>
            <div className="flex flex-col justify-center p-6 md:p-10"><span className="badge badge-brand w-fit">{t('Featured', 'ফিচার্ড')} · {f.category}</span><h2 className="mt-3 text-2xl font-extrabold leading-tight sm:text-3xl">{f.title}</h2><p className="mt-3 muted">{f.excerpt}</p><p className="mt-5 text-sm muted">{f.author} · {i.date(f.published_at)} · {min(f.reading_mins)}</p></div>
          </Link>
        </div></section>
      ) : null}
      <section className={f ? 'pb-16' : 'section'}><div className="wrap">
        <QuickFilter label={t('Categories', 'ক্যাটাগরি')} rowClass="mb-6" chipsClass="flex flex-wrap gap-2" options={[{ value: 'all', label: t('All', 'সব') }, ...cats.map((c: any) => ({ value: c.slug, label: c.name }))]}>
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">{posts.map((p) => (
            <article key={p.slug} className="card card-hover group relative flex flex-col overflow-hidden" data-item data-cats={p.category_slug}>
              <div className="aspect-[16/10] overflow-hidden"><Picture img={p.image} className="img-cover transition duration-700 group-hover:scale-105" /></div>
              <div className="flex flex-1 flex-col p-5"><p className="text-xs font-semibold text-brand-700 dark:text-brand-300">{p.category}</p><h2 className="mt-1 text-lg font-bold leading-snug"><Link href={i.u(`/blog/${p.slug}`)} className="after:absolute after:inset-0">{p.title}</Link></h2><p className="mt-2 line-clamp-3 text-sm muted">{p.excerpt}</p><p className="mt-auto pt-4 text-xs muted">{i.date(p.published_at)} · {min(p.reading_mins)}</p></div>
            </article>
          ))}</div>
        </QuickFilter>
        <Pagination i={i} path={i.u("/blog")} params={{}} current={res.meta.current_page} last={res.meta.last_page} />
      </div></section>
    </>
  );
}
