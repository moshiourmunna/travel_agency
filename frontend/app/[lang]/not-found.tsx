import type { Metadata } from 'next';
import Link from 'next/link';
import { headers } from 'next/headers';
import { Icon } from '@/components/icons/Icon';
import { isLang, type Lang } from '@/lib/format';
import { getI18n } from '@/lib/i18n';

export const metadata: Metadata = { title: '404 — Page not found · Musafir', robots: { index: false, follow: true } };

/** Localised 404 with a search box and the most useful exits. Locale comes from the proxy header (boundaries get no params). */
export default async function NotFound() {
  const h = (await headers()).get('x-musafir-lang') ?? 'en';
  const lang: Lang = isLang(h) ? h : 'en';
  const i = await getI18n(lang);
  const t = i.t;
  return (
    <section className="grid min-h-[70vh] place-items-center px-4 py-16 text-center"><div className="max-w-lg">
      <svg viewBox="0 0 200 120" className="mx-auto h-32 w-auto" aria-hidden="true"><circle cx="100" cy="40" r="18" fill="#F6A33B" /><path d="M20 110 C50 70 60 40 75 40 C88 40 90 80 100 80 C110 80 112 40 125 40 C140 40 150 70 180 110" fill="none" stroke="#0D6B65" strokeWidth="12" strokeLinecap="round" /></svg>
      <p className="mt-6 text-sm font-bold uppercase tracking-widest text-brand-700 dark:text-brand-300">{t('Error 404', 'ত্রুটি ৪০৪')}</p>
      <h1 className="mt-2 text-3xl font-extrabold sm:text-4xl">{t('Looks like this road leads nowhere', 'মনে হচ্ছে এই পথ কোথাও যায়নি')}</h1>
      <p className="mt-3 muted">{t('The page may have moved. Try searching or head back to the start.', 'পাতাটি সরানো হতে পারে। খুঁজে দেখুন বা শুরুতে ফিরে যান।')}</p>
      <form action={i.u('/tours')} className="mx-auto mt-6 flex max-w-sm gap-2" role="search">
        <label htmlFor="nf-q" className="sr-only">{t('Search tours', 'ট্যুর খুঁজুন')}</label>
        <input id="nf-q" name="q" className="input" placeholder={t('Where to?', 'কোথায়?')} />
        <button className="btn btn-primary"><Icon name="search" className="h-4 w-4" /><span className="sr-only">{t('Search', 'খুঁজুন')}</span></button>
      </form>
      <div className="mt-6 flex flex-wrap justify-center gap-2">
        <Link href={i.u('/')} className="btn btn-outline btn-sm">{t('Home', 'হোম')}</Link>
        <Link href={i.u('/offers')} className="btn btn-ghost btn-sm">{t('Deals', 'ডিল')}</Link>
        <Link href={i.u('/contact')} className="btn btn-ghost btn-sm">{t('Contact', 'যোগাযোগ')}</Link>
      </div>
    </div></section>
  );
}
