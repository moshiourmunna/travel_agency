'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

type Copy = { kicker: string; title: string; text: string; searchLabel: string; placeholder: string; search: string; home: string; deals: string; contact: string };

/**
 * 404 body. Both languages are rendered into the static shell and the visible one is picked from the URL on the client —
 * reading request headers in a not-found boundary would turn every page dynamic (no SSG).
 */
export function NotFoundView({ copy, icon }: { copy: Record<'en' | 'bn', Copy>; icon: React.ReactNode }) {
  const lang = usePathname()?.split('/')[1] === 'bn' ? 'bn' : 'en';
  const c = copy[lang];
  return (
    <section className="grid min-h-[70vh] place-items-center px-4 py-16 text-center"><div className="max-w-lg">
      <svg viewBox="0 0 200 120" className="mx-auto h-32 w-auto" aria-hidden="true"><circle cx="100" cy="40" r="18" fill="#F6A33B" /><path d="M20 110 C50 70 60 40 75 40 C88 40 90 80 100 80 C110 80 112 40 125 40 C140 40 150 70 180 110" fill="none" stroke="#0D6B65" strokeWidth="12" strokeLinecap="round" /></svg>
      <p className="mt-6 text-sm font-bold uppercase tracking-widest text-brand-700 dark:text-brand-300">{c.kicker}</p>
      <h1 className="mt-2 text-3xl font-extrabold sm:text-4xl">{c.title}</h1>
      <p className="mt-3 muted">{c.text}</p>
      <form action={`/${lang}/tours`} className="mx-auto mt-6 flex max-w-sm gap-2" role="search">
        <label htmlFor="nf-q" className="sr-only">{c.searchLabel}</label>
        <input id="nf-q" name="q" className="input" placeholder={c.placeholder} />
        <button className="btn btn-primary">{icon}<span className="sr-only">{c.search}</span></button>
      </form>
      <div className="mt-6 flex flex-wrap justify-center gap-2">
        <Link href={`/${lang}`} className="btn btn-outline btn-sm">{c.home}</Link>
        <Link href={`/${lang}/offers`} className="btn btn-ghost btn-sm">{c.deals}</Link>
        <Link href={`/${lang}/contact`} className="btn btn-ghost btn-sm">{c.contact}</Link>
      </div>
    </div></section>
  );
}
