import type { Metadata } from 'next';
import Link from 'next/link';
import { cache } from 'react';
import { Icon } from '@/components/icons/Icon';
import { CopyCode } from '@/components/client/Promo';
import { Avatar, Crumbs, SecHead, type Crumb } from '@/components/ui/basics';
import { Picture } from '@/components/ui/Picture';
import { api, apiData } from '@/lib/api';
import type { Lang } from '@/lib/format';
import { getI18n } from '@/lib/i18n';
import { breadcrumbJsonLd, buildMetadata, JsonLd } from '@/lib/seo';
import { getSite, siteUrl } from '@/lib/site';

const load = cache((slug: string, lang: Lang) => apiData<any>(`posts/${slug}`, { lang, tags: ['posts', `post:${slug}`] }));

export async function generateStaticParams() {
  const r = await api<{ data: { slug: string }[] }>('posts', { lang: 'en', tags: ['posts'], query: { per_page: 48 } }).catch(() => ({ data: [] }));
  return r.data.flatMap((p) => ['en', 'bn'].map((lang) => ({ lang, slug: p.slug })));
}

export async function generateMetadata({ params }: PageProps<'/[lang]/blog/[slug]'>): Promise<Metadata> {
  const { lang, slug } = (await params) as { lang: Lang; slug: string };
  const p = await load(slug, lang);
  return buildMetadata(lang, `/blog/${slug}`, { title: p.title, description: p.excerpt, image: p.image, seo: p.seo, ogType: 'article' });
}

const ENT: Record<string, string> = { amp: '&', lt: '<', gt: '>', quot: '"', '#39': "'", nbsp: '\u00a0' };
const decode = (s: string) => s.replace(/&(amp|lt|gt|quot|#39|nbsp);/g, (_, k: string) => ENT[k]);

/** Adds stable ids to <h2>s (table of contents) and splits the body so a CTA can sit after the 2nd section. */
function sections(html: string) {
  const parts = html.split(/(?=<h2[\s>])/i).filter((s) => s.trim());
  const toc: { id: string; text: string }[] = [];
  const out = parts.map((s) => {
    const m = s.match(/^<h2([^>]*)>([\s\S]*?)<\/h2>/i);
    if (!m) return s;
    const id = `s${toc.length + 1}`;
    toc.push({ id, text: decode(m[2].replace(/<[^>]+>/g, '').trim()) });
    return s.replace(/^<h2([^>]*)>/i, (_, attrs: string) => `<h2${attrs.replace(/\sid="[^"]*"/i, '')} id="${id}">`);
  });
  return { toc, parts: out };
}

export default async function PostPage({ params }: PageProps<'/[lang]/blog/[slug]'>) {
  const { lang, slug } = (await params) as { lang: Lang; slug: string };
  const [i, p, site] = await Promise.all([getI18n(lang), load(slug, lang), getSite(lang)]);
  const t = i.t;
  const base = siteUrl(site);
  const url = `${base}/${lang}/blog/${slug}`;
  const crumbs: Crumb[] = [[t('Home', 'হোম'), i.u('/')], [t('Blog', 'ব্লগ'), i.u('/blog')], [p.title, i.u(`/blog/${slug}`)]];
  const { toc, parts } = sections(p.body ?? '');
  const initials = String(p.author ?? '').split(/\s+/).map((w: string) => w[0]).join('').slice(0, 2);
  const ld = { '@context': 'https://schema.org', '@type': 'BlogPosting', headline: p.title, description: p.excerpt, image: p.image?.src, datePublished: p.published_at, dateModified: p.updated_at, mainEntityOfPage: url,
    author: { '@type': 'Person', name: p.author }, publisher: { '@type': 'Organization', name: site.settings.company?.name, logo: { '@type': 'ImageObject', url: `${base}/brand/icon-192.png` } }, keywords: (p.tags ?? []).map((x: any) => x.name).join(', '), inLanguage: lang === 'bn' ? 'bn-BD' : 'en' };
  const cta = (
    <aside key="cta" className="not-prose my-8 flex flex-col gap-4 rounded-3xl bg-brand-50 p-6 dark:bg-brand-900/30 sm:flex-row sm:items-center"><div className="flex-1"><p className="font-bold">{t('Want us to plan it for you?', 'আমরা কি আপনার জন্য প্ল্যান করে দেব?')}</p><p className="text-sm muted">{t('Free itinerary and quote within 4 working hours.', '৪ কর্মঘণ্টার মধ্যে ফ্রি ভ্রমণসূচি ও কোটেশন।')}</p></div><Link href={i.u('/trip-planner')} className="btn btn-primary">{t('Plan my trip', 'ট্রিপ প্ল্যান করুন')}</Link></aside>
  );
  return (
    <>
      <JsonLd data={breadcrumbJsonLd(base, crumbs)} />
      <JsonLd data={ld} />
      <article>
        <header className="wrap max-w-4xl pt-8">
          <Crumbs i={i} items={crumbs} />
          <p className="mt-6 text-sm font-semibold text-brand-700 dark:text-brand-300">{p.category}</p>
          <h1 className="mt-2 text-3xl font-extrabold leading-tight text-balance sm:text-5xl">{p.title}</h1>
          <p className="mt-4 text-lg muted">{p.excerpt}</p>
          <div className="mt-6 flex flex-wrap items-center justify-between gap-4 border-y border-ink-100 py-4 dark:border-ink-800">
            <div className="flex items-center gap-3"><Avatar initials={initials} /><div><p className="font-semibold">{p.author}</p><p className="text-sm muted"><time dateTime={p.published_at}>{i.date(p.published_at)}</time> · {i.d(p.reading_mins)} {t('min read', 'মিনিট পড়া')}</p></div></div>
            <div className="flex gap-2">
              <a className="icon-btn border border-ink-200 dark:border-ink-700" href={`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}`} target="_blank" rel="noopener noreferrer" aria-label={t('Share on Facebook', 'ফেসবুকে শেয়ার')}><Icon name="facebook" className="h-4 w-4" /></a>
              <a className="icon-btn border border-ink-200 dark:border-ink-700" href={`https://wa.me/?text=${encodeURIComponent(url)}`} target="_blank" rel="noopener noreferrer" aria-label={t('Share on WhatsApp', 'হোয়াটসঅ্যাপে শেয়ার')}><Icon name="whatsapp" className="h-4 w-4" /></a>
              <CopyCode code={url} label={t('Copy link', 'লিংক কপি')} className="icon-btn border border-ink-200 dark:border-ink-700" iconOnly><Icon name="link" className="h-4 w-4" /></CopyCode>
            </div>
          </div>
        </header>
        <figure className="wrap mt-8 max-w-5xl"><Picture img={p.image} alt={p.title} className="aspect-[16/9] w-full rounded-3xl object-cover" sizes="(min-width: 1024px) 1024px, 100vw" width={1600} height={900} priority /></figure>
        <div className="wrap grid max-w-5xl gap-10 py-10 lg:grid-cols-[220px_1fr]">
          <nav className="hidden lg:block" aria-label={t('On this page', 'এই পাতায়')}><div className="sticky top-24"><p className="mb-3 text-xs font-bold uppercase tracking-wider text-ink-400">{t('On this page', 'এই পাতায়')}</p><ol className="space-y-2 text-sm">{toc.map((s) => <li key={s.id}><a href={`#${s.id}`} className="link-muted">{s.text}</a></li>)}</ol></div></nav>
          <div className="min-w-0">
            <div className="prose-m max-w-none" dangerouslySetInnerHTML={{ __html: parts.slice(0, 2).join('') }} />
            {parts.length > 2 ? <>{cta}<div className="prose-m max-w-none" dangerouslySetInnerHTML={{ __html: parts.slice(2).join('') }} /></> : null}
            {p.tags?.length ? <div className="not-prose mt-10 flex flex-wrap gap-2">{p.tags.map((tg: any) => <span key={tg.slug} className="chip">#{tg.name}</span>)}</div> : null}
          </div>
        </div>
      </article>
      {p.related?.length ? (
        <section className="section bg-ink-50 dark:bg-ink-900/50"><div className="wrap"><SecHead eyebrow={t('Keep reading', 'আরও পড়ুন')} title={t('Related stories', 'সম্পর্কিত লেখা')} />
          <div className="grid gap-6 md:grid-cols-3">{p.related.map((r: any) => (
            <Link key={r.slug} href={i.u(`/blog/${r.slug}`)} className="card card-hover overflow-hidden"><Picture img={r.image} className="aspect-[16/10] w-full object-cover" /><div className="p-5"><p className="text-xs font-semibold text-brand-700 dark:text-brand-300">{r.category}</p><h3 className="mt-1 font-bold leading-snug">{r.title}</h3></div></Link>
          ))}</div></div></section>
      ) : null}
    </>
  );
}
