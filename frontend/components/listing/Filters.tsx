'use client';
import { useEffect, useRef, useState } from 'react';
import { useSite } from '@/components/client/SiteContext';
import { useQueryNav } from './ListingBits';

export type Opt = { value: string; label: string; count?: number; icon?: React.ReactNode };
export type Field =
  | { type: 'search'; name: string; label: string; placeholder: string }
  | { type: 'checks'; name: string; label: string; options: Opt[] }
  | { type: 'chips'; name: string; label: string; options: Opt[] }
  | { type: 'radios'; name: string; label: string; options: Opt[] }
  | { type: 'range'; name: string; label: string; min: number; max: number; step: number; money?: boolean }
  | { type: 'toggle'; name: string; label: string };

const fmtMoney = (n: number, lang: string) => '৳\u00a0' + (lang === 'bn' ? n.toLocaleString('en-IN').replace(/\d/g, (d) => '০১২৩৪৫৬৭৮৯'[+d]) : n.toLocaleString('en-IN'));

/**
 * URL-driven filter form (shareable, crawlable results). `live` (desktop sidebar) applies on change — debounced
 * for text and sliders; the mobile drawer applies on "Show results". Multi-value params are comma-joined.
 */
export function Filters({ id, fields, live, labels, search }: { id: string; fields: Field[]; live: boolean; labels: { aria: string; clear: string; show: string; any: string }; search: string }) {
  const { sp, go } = useQueryNav();
  const { lang } = useSite();
  const [state, setState] = useState<Record<string, string>>(() => Object.fromEntries(fields.map((f) => [f.name, sp.get(f.name) ?? ''])));
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined);
  const key = sp.toString();
  useEffect(() => { setState(Object.fromEntries(fields.map((f) => [f.name, sp.get(f.name) ?? '']))); }, [key]); // eslint-disable-line react-hooks/exhaustive-deps

  const apply = (s: Record<string, string>) => {
    const n = new URLSearchParams(sp);
    for (const f of fields) { const v = s[f.name]; if (v && !(f.type === 'range' && +v >= f.max)) n.set(f.name, v); else n.delete(f.name); }
    n.delete('type'); n.delete('theme'); // legacy aliases are folded into `cat`
    go(n);
  };
  const set = (name: string, v: string, debounce = false) => {
    const s = { ...state, [name]: v };
    setState(s);
    if (!live) return;
    clearTimeout(timer.current);
    if (debounce) timer.current = setTimeout(() => apply(s), 450); else apply(s);
  };
  const toggleMulti = (name: string, v: string, on: boolean) => {
    const cur = (state[name] || '').split(',').filter(Boolean);
    set(name, (on ? [...new Set([...cur, v])] : cur.filter((x) => x !== v)).join(','));
  };

  return (
    <form className="space-y-6" aria-label={labels.aria} role="search" onSubmit={(e) => { e.preventDefault(); clearTimeout(timer.current); apply(state); }}
      onReset={(e) => { e.preventDefault(); const s = Object.fromEntries(fields.map((f) => [f.name, ''])); setState(s); apply(s); }}>
      {fields.map((f) => {
        const fid = `${id}-${f.name}`;
        if (f.type === 'search') return (
          <div key={f.name}><label className="label" htmlFor={fid}>{f.label}</label><div className="relative">{/* search icon */}
            <svg viewBox="0 0 24 24" className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-400" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><circle cx="11" cy="11" r="8" /><path d="m21 21-4.3-4.3" /></svg>
            <input id={fid} name={f.name} type="search" className="input pl-9" placeholder={f.placeholder} value={state[f.name]} onChange={(e) => set(f.name, e.target.value, true)} aria-label={search} /></div></div>
        );
        if (f.type === 'checks') return (
          <fieldset key={f.name}><legend className="label">{f.label}</legend><div className="space-y-2">
            {f.options.map((o) => <label key={o.value} className="flex items-center gap-2.5 text-sm"><input type="checkbox" className="check" name={f.name} value={o.value} checked={(state[f.name] || '').split(',').includes(o.value)} onChange={(e) => toggleMulti(f.name, o.value, e.target.checked)} /> {o.label}{o.count !== undefined ? <span className="ml-auto text-xs muted">{lang === 'bn' ? String(o.count).replace(/\d/g, (d) => '০১২৩৪৫৬৭৮৯'[+d]) : o.count}</span> : null}</label>)}
          </div></fieldset>
        );
        if (f.type === 'chips') return (
          <fieldset key={f.name}><legend className="label">{f.label}</legend><div className="flex flex-wrap gap-2">
            {f.options.map((o) => <label key={o.value} className="cursor-pointer"><input type="checkbox" name={f.name} value={o.value} className="peer sr-only" checked={(state[f.name] || '').split(',').includes(o.value)} onChange={(e) => toggleMulti(f.name, o.value, e.target.checked)} /><span className="chip text-xs peer-checked:border-brand-600 peer-checked:bg-brand-700 peer-checked:text-white peer-focus-visible:ring-2 peer-focus-visible:ring-brand-500">{o.label}{o.icon ? <> {o.icon}</> : null}</span></label>)}
          </div></fieldset>
        );
        if (f.type === 'radios') return (
          <fieldset key={f.name}><legend className="label">{f.label}</legend><div className="space-y-2">
            {[{ value: '', label: labels.any }, ...f.options].map((o) => <label key={o.value} className="flex items-center gap-2.5 text-sm"><input type="radio" className="check rounded-full" name={`${fid}`} value={o.value} checked={(state[f.name] || '') === o.value} onChange={() => set(f.name, o.value)} /> {o.label}</label>)}
          </div></fieldset>
        );
        if (f.type === 'toggle') return (
          <label key={f.name} className="flex items-center gap-2.5 text-sm"><input type="checkbox" className="check" name={f.name} checked={state[f.name] === '1'} onChange={(e) => set(f.name, e.target.checked ? '1' : '')} /> {f.label}</label>
        );
        if (f.type !== 'range') return null;
        const v = +(state[f.name] || f.max);
        const show = (n: number) => (f.money ? fmtMoney(n, lang) : lang === 'bn' ? String(n).replace(/\d/g, (d) => '০১২৩৪৫৬৭৮৯'[+d]) : String(n));
        return (
          <div key={f.name}><label className="label" htmlFor={fid}>{f.label}: <output htmlFor={fid} className="text-brand-700 dark:text-brand-300">{show(v)}</output></label>
            <input id={fid} type="range" name={f.name} min={f.min} max={f.max} step={f.step} value={v} className="w-full" onChange={(e) => set(f.name, e.target.value, true)} />
            <div className="mt-1 flex justify-between text-xs muted"><span>{show(f.min)}</span><span>{show(f.max)}</span></div></div>
        );
      })}
      <div className="flex gap-2"><button type="reset" className="btn btn-outline flex-1">{labels.clear}</button>{live ? null : <button type="submit" className="btn btn-primary flex-1">{labels.show}</button>}</div>
    </form>
  );
}
