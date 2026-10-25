import type { Metadata } from 'next';
import Link from 'next/link';
import { Price } from '@/components/client/Price';
import { StoredIds } from '@/components/client/StoredIds';
import { PlainHero, type Crumb } from '@/components/ui/basics';
import { Picture } from '@/components/ui/Picture';
import { api } from '@/lib/api';
import type { Lang } from '@/lib/format';
import { getI18n } from '@/lib/i18n';
import { getPage, pageMetadata } from '@/lib/page';
import { breadcrumbJsonLd, JsonLd } from '@/lib/seo';
import { getSite, siteUrl } from '@/lib/site';
import type { TourCard } from '@/lib/types';

const parse = (v: string | string[] | undefined) => String(Array.isArray(v) ? v[0] : v ?? '').split(',').map((s) => s.trim()).filter((s) => /^[a-z0-9-]{1,120}$/.test(s)).slice(0, 3);

export async function generateMetadata({ params, searchParams }: PageProps<'/[lang]/compare'>): Promise<Metadata> {
  return pageMetadata((await params).lang as Lang, 'compare', '/compare', { noindex: !!(await searchParams).ids });
}

export default async function ComparePage({ params, searchParams }: PageProps<'/[lang]/compare'>) {
  const lang = (await params).lang as Lang;
  const picked = parse((await searchParams).ids);
  const [i, page, site] = await Promise.all([getI18n(lang), getPage('compare', lang), getSite(lang)]);
  const ids = picked.length ? picked : ((site.settings.catalog?.compare_default as string[] | undefined) ?? []).slice(0, 3);
  const res = ids.length ? await api<{ data: TourCard[] }>('tours', { lang, tags: ['tours'], query: { slugs: ids.join(','), per_page: 3 } }) : { data: [] };
  const tours = ids.map((s) => res.data.find((x) => x.slug === s)).filter(Boolean) as TourCard[];
  const t = i.t;
  const crumbs: Crumb[] = [[t('Home', 'হোম'), i.u('/')], [t('Tours', 'ট্যুর'), i.u('/tours')], [t('Compare', 'তুলনা'), i.u('/compare')]];
  const rows: [string, (x: TourCard) => React.ReactNode][] = [
    [t('Price from', 'শুরুর মূল্য'), (x) => <Price value={x.price} />],
    [t('Duration', 'সময়কাল'), (x) => `${i.d(x.days)} ${t('days', 'দিন')} / ${i.d(x.nights)} ${t('nights', 'রাত')}`],
    [t('Rating', 'রেটিং'), (x) => `★ ${i.d(x.rating)} (${i.d(x.reviews_count)})`],
    [t('Destination', 'গন্তব্য'), (x) => [x.location, x.country].filter(Boolean).join(', ')],
    [t('Group size', 'দলের আকার'), (x) => i.d(x.group_size ?? '—')],
    [t('Cancellation', 'বাতিল'), (x) => x.cancellation?.label ?? '—'],
    [t('Highlights', 'হাইলাইট'), (x) => (x.highlights ?? []).slice(0, 3).join(', ')],
  ];
  return (
    <>
      <JsonLd data={breadcrumbJsonLd(siteUrl(site), crumbs)} />
      <StoredIds store="compare" current={picked.join(',')} />
      <PlainHero i={i} title={page.title} sub={page.subtitle} crumbs={crumbs} />
      <section className="section !pt-8"><div className="wrap overflow-x-auto">
        {tours.length ? (
          <table className="w-full min-w-[640px] border-separate border-spacing-0 text-sm">
            <caption className="sr-only">{t('Tour comparison', 'ট্যুর তুলনা')}</caption>
            <thead><tr><th scope="col" className="w-40 p-3 text-left align-bottom text-xs uppercase tracking-wider muted">{t('Tour', 'ট্যুর')}</th>{tours.map((x) => (
              <th key={x.slug} scope="col" className="p-3 text-left align-top">{x.image ? <Picture img={x.image} alt="" className="aspect-[16/10] w-full rounded-2xl object-cover" sizes="320px" width={320} height={200} /> : null}<Link className="mt-2 block font-bold hover:text-brand-700" href={i.u(`/tours/${x.slug}`)}>{x.title}</Link></th>
            ))}</tr></thead>
            <tbody>
              {rows.map(([label, fn]) => <tr key={label} className="odd:bg-ink-50 dark:odd:bg-ink-900"><th scope="row" className="p-3 text-left font-semibold">{label}</th>{tours.map((x) => <td key={x.slug} className="p-3">{fn(x)}</td>)}</tr>)}
              <tr><td className="p-3" />{tours.map((x) => <td key={x.slug} className="p-3"><Link href={`${i.u('/booking')}?tour=${x.slug}`} className="btn btn-accent btn-sm w-full">{t('Book', 'বুক করুন')}</Link></td>)}</tr>
            </tbody>
          </table>
        ) : <p className="card p-8 text-center muted">{t('Tick “Compare” on up to 3 tour cards.', 'সর্বোচ্চ ৩টি ট্যুর কার্ডে “তুলনা” টিক দিন।')} <Link href={i.u('/tours')} className="font-semibold text-brand-700 hover:underline">{t('Browse tours', 'ট্যুর দেখুন')}</Link></p>}
      </div></section>
    </>
  );
}
