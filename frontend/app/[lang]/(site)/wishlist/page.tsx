import type { Metadata } from 'next';
import Link from 'next/link';
import { Icon } from '@/components/icons/Icon';
import { SeedButton, StoredIds } from '@/components/client/StoredIds';
import { PlainHero, type Crumb } from '@/components/ui/basics';
import { ActivityCard, CruiseCard, HotelCard, TourCard } from '@/components/ui/cards';
import { api } from '@/lib/api';
import type { Lang } from '@/lib/format';
import { getI18n } from '@/lib/i18n';
import { getPage, pageMetadata } from '@/lib/page';

const KINDS = { tour: 'tours', cruise: 'cruises', activity: 'activities', hotel: 'hotels' } as const;
type Kind = keyof typeof KINDS;

export async function generateMetadata({ params }: PageProps<'/[lang]/wishlist'>): Promise<Metadata> {
  return pageMetadata((await params).lang as Lang, 'wishlist', '/wishlist', { noindex: true });
}

/** Device-local wishlist: the client puts the saved ids in ?ids=kind:slug,… and the server renders real cards. */
export default async function WishlistPage({ params, searchParams }: PageProps<'/[lang]/wishlist'>) {
  const lang = (await params).lang as Lang;
  const raw = (await searchParams).ids;
  const ids = String(Array.isArray(raw) ? raw[0] : raw ?? '').split(',').filter((s) => /^(tour|cruise|activity|hotel):[a-z0-9-]{1,120}$/.test(s)).slice(0, 48);
  const byKind = new Map<Kind, string[]>();
  for (const id of ids) { const [k, s] = id.split(':') as [Kind, string]; byKind.set(k, [...(byKind.get(k) ?? []), s]); }
  const [i, page, ...lists] = await Promise.all([
    getI18n(lang), getPage('wishlist', lang),
    ...[...byKind].map(([k, slugs]) => api<{ data: any[] }>(KINDS[k], { lang, tags: [KINDS[k]], query: { slugs: slugs.join(','), per_page: 48 } }).then((r) => r.data.map((x) => ({ ...x, _k: `${k}:${x.slug}` })))),
  ]);
  const found = new Map(lists.flat().map((x: any) => [x._k, x]));
  const items = ids.map((id) => found.get(id)).filter(Boolean);
  const t = i.t;
  const crumbs: Crumb[] = [[t('Home', 'হোম'), i.u('/')], [t('Wishlist', 'উইশলিস্ট'), i.u('/wishlist')]];
  const sample: string[] = (page.data as any)?.sample ?? [];
  return (
    <>
      <StoredIds store="wish" current={ids.join(',')} follow />
      <PlainHero i={i} title={page.title} sub={page.subtitle} crumbs={crumbs} />
      <section className="section !pt-8"><div className="wrap">
        {items.length ? (
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">{items.map((x: any) => (
            <div key={x._k}>{x._k.startsWith('tour:') ? <TourCard i={i} x={x} /> : x._k.startsWith('cruise:') ? <CruiseCard i={i} c={x} /> : x._k.startsWith('activity:') ? <ActivityCard i={i} a={x} /> : <HotelCard i={i} h={x} />}</div>
          ))}</div>
        ) : (
          <div className="card mx-auto max-w-lg p-10 text-center"><span className="mx-auto grid h-16 w-16 place-items-center rounded-full bg-rose-50 text-rose-500 dark:bg-rose-900/20"><Icon name="heart" className="h-8 w-8" /></span><h2 className="mt-4 text-xl font-bold">{t('Nothing saved yet', 'এখনও কিছু সেভ করা হয়নি')}</h2><p className="mt-1 text-sm muted">{t('Tap the heart on any tour, cruise or activity.', 'যেকোনো ট্যুর, ক্রুজ বা অ্যাক্টিভিটিতে হার্ট চাপুন।')}</p>
            <div className="mt-5 flex flex-wrap justify-center gap-2"><Link href={i.u('/tours')} className="btn btn-primary btn-sm">{t('Browse tours', 'ট্যুর দেখুন')}</Link>{sample.length ? <SeedButton ids={sample} className="btn btn-outline btn-sm">{t('Load sample list', 'নমুনা তালিকা দেখুন')}</SeedButton> : null}</div></div>
        )}
      </div></section>
    </>
  );
}
