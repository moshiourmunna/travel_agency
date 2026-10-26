import type { Metadata } from 'next';
import Link from 'next/link';
import { PlainHero, type Crumb } from '@/components/ui/basics';
import { api } from '@/lib/api';
import type { Lang } from '@/lib/format';
import { getI18n } from '@/lib/i18n';
import { getPage, pageMetadata } from '@/lib/page';
import { breadcrumbJsonLd, JsonLd } from '@/lib/seo';
import { getSite, siteUrl } from '@/lib/site';

export async function generateMetadata({ params }: PageProps<'/[lang]/sitemap'>): Promise<Metadata> {
  return pageMetadata((await params).lang as Lang, 'sitemap', '/sitemap');
}

type Row = { slug: string; title?: string; name?: string; country?: string };
const list = (lang: Lang, path: string, tag: string) => api<{ data: Row[] }>(path, { lang, tags: [tag], query: path === 'posts' ? { per_page: 48 } : { per_page: 60 } }).then((r) => r.data).catch(() => [] as Row[]);
const label = (r: Row) => r.title ?? r.name ?? r.country ?? r.slug;

/** Human sitemap: every public page and catalogue item, grouped — generated from the live catalogue so it never goes stale. */
export default async function SitemapPage({ params }: PageProps<'/[lang]/sitemap'>) {
  const lang = (await params).lang as Lang;
  const [i, page, site, tours, themes, cruises, activities, destinations, hotels, visas, posts] = await Promise.all([
    getI18n(lang), getPage('sitemap', lang), getSite(lang),
    list(lang, 'tours', 'tours'), list(lang, 'themes', 'themes'), list(lang, 'cruises', 'cruises'), list(lang, 'activities', 'activities'),
    list(lang, 'destinations', 'destinations'), list(lang, 'hotels', 'hotels'), list(lang, 'visas', 'visas'), list(lang, 'posts', 'posts'),
  ]);
  const t = i.t;
  const crumbs: Crumb[] = [[t('Home', 'হোম'), i.u('/')], [page.title, i.u('/sitemap')]];
  const items = (prefix: string, rows: Row[]) => rows.map((r) => [`/${prefix}/${r.slug}`, label(r)] as [string, string]);
  const groups: [string, [string, string][]][] = [
    [t('Holidays', 'হলিডে'), [['/tours', t('All tours', 'সব ট্যুর')], ['/holidays', t('Holidays by theme', 'থিম অনুযায়ী হলিডে')], ...items('holidays', themes), ['/destinations', t('Destinations', 'গন্তব্য')], ['/trip-planner', t('Trip planner', 'ট্রিপ প্ল্যানার')], ['/custom-tour', t('Custom trip', 'কাস্টম ট্রিপ')], ['/group-tours', t('Group tours', 'গ্রুপ ট্যুর')], ['/compare', t('Compare tours', 'ট্যুর তুলনা')]]],
    [t('Tours', 'ট্যুর'), items('tours', tours)],
    [t('Cruises & activities', 'ক্রুজ ও অ্যাক্টিভিটি'), [['/cruises', t('All cruises', 'সব ক্রুজ')], ...items('cruises', cruises), ['/activities', t('All activities', 'সব অ্যাক্টিভিটি')], ...items('activities', activities)]],
    [t('Destinations', 'গন্তব্য'), items('destinations', destinations)],
    [t('Flights, hotels & visa', 'ফ্লাইট, হোটেল ও ভিসা'), [['/flights', t('Flights', 'ফ্লাইট')], ['/hotels', t('Hotels', 'হোটেল')], ...items('hotels', hotels), ['/visa', t('Visa services', 'ভিসা সেবা')], ...items('visa', visas), ['/insurance', t('Travel insurance', 'ট্রাভেল ইন্স্যুরেন্স')]]],
    [t('Company', 'প্রতিষ্ঠান'), [['/about', t('About', 'আমাদের কথা')], ['/team', t('Team', 'টিম')], ['/careers', t('Careers', 'ক্যারিয়ার')], ['/reviews', t('Reviews', 'রিভিউ')], ['/gallery', t('Gallery', 'গ্যালারি')], ['/blog', t('Blog', 'ব্লগ')], ['/offers', t('Offers', 'অফার')], ['/gift-cards', t('Gift cards', 'গিফট কার্ড')], ['/contact', t('Contact', 'যোগাযোগ')], ['/brand', t('Brand sheet', 'ব্র্যান্ড শিট')], ['/credits', t('Image credits', 'ছবির ক্রেডিট')]]],
    [t('Blog', 'ব্লগ'), items('blog', posts)],
    [t('Help & legal', 'সহায়তা ও আইনি'), [['/faq', t('FAQ', 'প্রশ্নোত্তর')], ['/terms', t('Terms', 'শর্তাবলি')], ['/privacy', t('Privacy', 'গোপনীয়তা')], ['/refund-policy', t('Refund policy', 'রিফান্ড নীতি')], ['/login', t('Sign in', 'সাইন ইন')], ['/register', t('Register', 'রেজিস্টার')], ['/wishlist', t('Wishlist', 'উইশলিস্ট')]]],
  ];
  return (
    <>
      <JsonLd data={breadcrumbJsonLd(siteUrl(site), crumbs)} />
      <PlainHero i={i} title={page.title} crumbs={crumbs} />
      <section className="section !pt-8"><div className="wrap columns-1 gap-8 sm:columns-2 lg:columns-4">
        {groups.filter((g) => g[1].length).map(([title, links]) => (
          <div key={title} className="mb-8 break-inside-avoid">
            <h2 className="mb-3 font-bold">{title}</h2>
            <ul className="space-y-1.5 text-sm">{links.map(([h, l]) => <li key={h}><Link className="link-muted" href={i.u(h)} prefetch={false}>{l}</Link></li>)}</ul>
          </div>
        ))}
      </div></section>
    </>
  );
}
