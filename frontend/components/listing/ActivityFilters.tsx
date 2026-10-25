'use client';
import { useEffect, useRef, useState } from 'react';
import { useSite } from '@/components/client/SiteContext';
import { useQueryNav } from './ListingBits';

/** Horizontal filter bar for activities (category chips + search/rating/free-cancel/price). URL-driven. */
export function ActivityFilters({ cats, l, icons }: { cats: { key: string; label: string }[]; icons: Record<string, React.ReactNode>; l: Record<'aria' | 'cats' | 'search' | 'placeholder' | 'rating' | 'any' | 'free' | 'max', string> }) {
  const { sp, go } = useQueryNav();
  const { lang } = useSite();
  const [q, setQ] = useState(sp.get('q') ?? '');
  const [max, setMax] = useState(+(sp.get('maxprice') ?? 30000));
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined);
  useEffect(() => { setQ(sp.get('q') ?? ''); setMax(+(sp.get('maxprice') ?? 30000)); }, [sp]);
  const set = (k: string, v: string | null, debounce = false) => {
    const n = new URLSearchParams(sp);
    if (v) n.set(k, v); else n.delete(k);
    clearTimeout(timer.current);
    if (debounce) timer.current = setTimeout(() => go(n), 450); else go(n);
  };
  const cur = (sp.get('cat') ?? '').split(',').filter(Boolean);
  const money = (n: number) => '৳\u00a0' + (lang === 'bn' ? n.toLocaleString('en-IN').replace(/\d/g, (d) => '০১২৩৪৫৬৭৮৯'[+d]) : n.toLocaleString('en-IN'));
  return (
    <form className="space-y-4" aria-label={l.aria} role="search" onSubmit={(e) => { e.preventDefault(); set('q', q); }}>
      <div className="no-scrollbar relative -mx-4 flex gap-2 overflow-x-auto px-4 pb-1" role="group" aria-label={l.cats}>
        {cats.map((c) => (
          <label key={c.key} className="chip relative cursor-pointer has-[:checked]:border-brand-700 has-[:checked]:bg-brand-700 has-[:checked]:text-white has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-brand-500">
            <input type="checkbox" name="cat" value={c.key} className="sr-only" checked={cur.includes(c.key)} onChange={(e) => set('cat', (e.target.checked ? [...cur, c.key] : cur.filter((x) => x !== c.key)).join(',') || null)} />{icons[c.key]} {c.label}
          </label>
        ))}
      </div>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <div className="relative"><label className="sr-only" htmlFor="aq">{l.search}</label>
          <svg viewBox="0 0 24 24" className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-400" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true"><circle cx="11" cy="11" r="8" /><path d="m21 21-4.3-4.3" /></svg>
          <input id="aq" name="q" type="search" className="input pl-9" placeholder={l.placeholder} value={q} onChange={(e) => { setQ(e.target.value); set('q', e.target.value, true); }} /></div>
        <div><label className="sr-only" htmlFor="arating">{l.rating}</label><select id="arating" name="rating" className="input" value={sp.get('rating') ?? ''} onChange={(e) => set('rating', e.target.value)}><option value="">{l.any}</option><option value="4.5">{lang === 'bn' ? '৪.৫+' : '4.5+'}</option><option value="4.8">{lang === 'bn' ? '৪.৮+' : '4.8+'}</option></select></div>
        <label className="flex items-center gap-2.5 rounded-xl border border-ink-200 px-3 py-2.5 text-sm dark:border-ink-700"><input type="checkbox" className="check" name="free" checked={sp.get('free') === '1'} onChange={(e) => set('free', e.target.checked ? '1' : null)} /> {icons.__free} {l.free}</label>
        <div><label className="label !mb-1 text-xs" htmlFor="aprice">{l.max}: <output htmlFor="aprice">{money(max)}</output></label><input id="aprice" type="range" name="maxprice" min={1000} max={30000} step={500} value={max} className="w-full" onChange={(e) => { setMax(+e.target.value); set('maxprice', +e.target.value >= 30000 ? null : e.target.value, true); }} /></div>
      </div>
    </form>
  );
}
