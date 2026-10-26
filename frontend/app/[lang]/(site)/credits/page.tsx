import type { Metadata } from 'next';
import { Picture } from '@/components/ui/Picture';
import { PlainHero, type Crumb } from '@/components/ui/basics';
import { api } from '@/lib/api';
import type { Lang } from '@/lib/format';
import { getI18n } from '@/lib/i18n';
import { pathMetadata } from '@/lib/page';
import { breadcrumbJsonLd, JsonLd } from '@/lib/seo';
import { getSite, siteUrl } from '@/lib/site';
import type { Image } from '@/lib/types';

export async function generateMetadata({ params }: PageProps<'/[lang]/credits'>): Promise<Metadata> {
  const lang = (await params).lang as Lang;
  return pathMetadata(lang, '/credits', lang === 'bn' ? 'ছবির ক্রেডিট' : 'Image credits');
}

type Credit = { key: string; title: string; credit: string | null; credit_url: string | null; license: string; image: Image };

/** Attribution for every licensed photo in the media library (required by CC BY / BY-SA). */
export default async function CreditsPage({ params }: PageProps<'/[lang]/credits'>) {
  const lang = (await params).lang as Lang;
  const [i, site, res] = await Promise.all([getI18n(lang), getSite(lang), api<{ data: Credit[] }>('credits', { lang, tags: ['media'] })]);
  const t = i.t;
  const crumbs: Crumb[] = [[t('Home', 'হোম'), i.u('/')], [t('Image credits', 'ছবির ক্রেডিট'), i.u('/credits')]];
  return (
    <>
      <JsonLd data={breadcrumbJsonLd(siteUrl(site), crumbs)} />
      <PlainHero i={i} title={t('Image credits', 'ছবির ক্রেডিট')} crumbs={crumbs}
        sub={t('Photos from Wikimedia Commons, used under their stated licences. Replace with licensed brand photography before launch.', 'উইকিমিডিয়া কমন্সের ছবি, উল্লিখিত লাইসেন্সে ব্যবহৃত। লঞ্চের আগে লাইসেন্সকৃত ব্র্যান্ড ফটোগ্রাফি দিয়ে বদলাতে হবে।')} />
      <section className="section !pt-8"><div className="wrap grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {res.data.map((c) => {
          const inner = (
            <>
              <Picture img={c.image} alt="" sizes="96px" className="h-16 w-24 shrink-0 rounded-lg object-cover" width={96} height={64} />
              <span className="min-w-0 text-xs"><b className="block truncate text-sm">{c.title}</b><span className="block truncate muted">{c.credit || '—'}</span><span className="badge badge-brand mt-1">{c.license}</span></span>
            </>
          );
          return c.credit_url
            ? <a key={c.key} href={c.credit_url} target="_blank" rel="noopener" className="card card-hover flex min-w-0 gap-3 p-3">{inner}</a>
            : <div key={c.key} className="card flex min-w-0 gap-3 p-3">{inner}</div>;
        })}
      </div></section>
    </>
  );
}
