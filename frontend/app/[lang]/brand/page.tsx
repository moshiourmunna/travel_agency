import type { Metadata } from 'next';
import { Icon } from '@/components/icons/Icon';
import { PlainHero, type Crumb } from '@/components/ui/basics';
import type { Lang } from '@/lib/format';
import { getI18n } from '@/lib/i18n';
import { pathMetadata } from '@/lib/page';

export async function generateMetadata({ params }: PageProps<'/[lang]/brand'>): Promise<Metadata> {
  const lang = (await params).lang as Lang;
  return pathMetadata(lang, '/brand', lang === 'bn' ? 'মুসাফির ব্র্যান্ড শিট' : 'Musafir brand sheet', { noindex: true });
}

const COLOURS: [string, string, string][] = [['Teal 700', '#0D6B65', 'bg-brand-700'], ['Teal 500', '#14A497', 'bg-brand-500'], ['Amber 400', '#F6A33B', 'bg-accent-400'], ['Ink 900', '#0B1B2B', 'bg-ink-900'], ['Ink 50', '#F4F7F9', 'bg-ink-50'], ['Sand', '#F5ECCB', 'bg-[#F5ECCB]']];
const FILES = ['logo.svg', 'logo-dark.svg', 'logo-compact.svg', 'logo-stacked.svg', 'icon.svg', 'icon-white.svg', 'icon-512.png', 'favicon.ico'];

/** Brand sheet (noindex): logo lockups, palette, type and downloadable assets for partners and print. */
export default async function BrandPage({ params }: PageProps<'/[lang]/brand'>) {
  const lang = (await params).lang as Lang;
  const i = await getI18n(lang);
  const t = i.t;
  const crumbs: Crumb[] = [[t('Home', 'হোম'), i.u('/')], [t('Brand', 'ব্র্যান্ড'), i.u('/brand')]];
  return (
    <>
      <PlainHero i={i} title={t('Musafir brand sheet', 'মুসাফির ব্র্যান্ড শিট')} crumbs={crumbs}>
        <p className="mt-1 max-w-2xl muted">{t('The mark: an “M” drawn as two hills with the sun rising between them, over a dotted journey trail — travel, horizons and the road ahead. Neutral, warm and readable from 16 px.', 'চিহ্ন: দুটি পাহাড়ের মতো আঁকা “M”, মাঝখানে উদীয়মান সূর্য, নিচে ডটেড যাত্রাপথ — ভ্রমণ, দিগন্ত ও সামনের পথ। নিরপেক্ষ, উষ্ণ ও ১৬ পিক্সেলেও স্পষ্ট।')}</p>
      </PlainHero>
      <section className="section !pt-10" data-brand-sheet><div className="wrap space-y-10">
        <div className="grid gap-5 md:grid-cols-2">
          <div className="grid place-items-center rounded-3xl border border-ink-100 bg-white p-10"><img src="/brand/logo.svg" alt={t('Primary logo on light', 'হালকা পটভূমিতে প্রধান লোগো')} className="h-20 w-auto" width={600} height={80} /></div>
          <div className="grid place-items-center rounded-3xl bg-[#07131F] p-10"><img src="/brand/logo-dark.svg" alt={t('Primary logo on dark', 'গাঢ় পটভূমিতে প্রধান লোগো')} className="h-20 w-auto" width={600} height={80} /></div>
          <div className="grid place-items-center rounded-3xl border border-ink-100 bg-white p-8"><img src="/brand/logo-stacked.svg" alt={t('Stacked logo', 'স্ট্যাকড লোগো')} className="h-40 w-auto" width={200} height={200} /></div>
          <div className="flex items-center justify-center gap-6 rounded-3xl border border-ink-100 bg-ink-50 p-8 dark:border-ink-800 dark:bg-ink-900">
            {[96, 64, 32, 16].map((s) => <img key={s} src="/brand/icon.svg" alt={`${t('App icon', 'অ্যাপ আইকন')} ${s}px`} width={s} height={s} />)}
            <span className="grid h-24 w-24 place-items-center rounded-3xl bg-gradient-to-br from-accent-400 to-rose-500"><img src="/brand/icon-white.svg" alt={t('Icon on photo/colour', 'ছবি/রঙের উপর আইকন')} width={80} height={80} /></span>
          </div>
        </div>
        <div><h2 className="text-xl font-bold">{t('Colours', 'রং')}</h2>
          <div className="mt-4 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">{COLOURS.map(([n, hx, cls]) => (
            <div key={n} className="overflow-hidden rounded-2xl border border-ink-100 dark:border-ink-800"><div className={`h-20 ${cls}`} /><div className="p-3 text-sm"><b>{n}</b><p className="font-mono text-xs muted">{hx}</p></div></div>
          ))}</div>
        </div>
        <div className="grid gap-5 md:grid-cols-3">
          <div className="card p-6"><p className="text-xs muted">Display · Fraunces</p><p className="mt-2 font-display text-4xl italic">the Musafir way</p></div>
          <div className="card p-6"><p className="text-xs muted">UI · Plus Jakarta Sans</p><p className="mt-2 text-3xl font-extrabold">See the world</p></div>
          <div className="card p-6"><p className="text-xs muted">বাংলা · Hind Siliguri</p><p className="mt-2 text-3xl font-bold" lang="bn">মুসাফির — বিশ্ব দেখুন</p></div>
        </div>
        <div className="card p-6"><h2 className="text-xl font-bold">{t('Downloads', 'ডাউনলোড')}</h2>
          <ul className="mt-3 flex flex-wrap gap-2 text-sm">{FILES.map((f) => <li key={f}><a className="chip" href={`/brand/${f}`} download><Icon name="download" className="h-4 w-4" /> {f}</a></li>)}</ul>
          <p className="mt-3 text-xs muted">{t('Clear space = height of the sun. Minimum size 24 px (icon) / 96 px (wordmark). Do not recolour the sun or add religious or political symbols.', 'ফাঁকা জায়গা = সূর্যের উচ্চতা। ন্যূনতম আকার ২৪ পিক্সেল (আইকন) / ৯৬ পিক্সেল (ওয়ার্ডমার্ক)। সূর্যের রং বদলাবেন না বা কোনো ধর্মীয়/রাজনৈতিক প্রতীক যোগ করবেন না।')}</p>
        </div>
      </div></section>
    </>
  );
}
