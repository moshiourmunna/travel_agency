'use client';
import { useEffect, useState } from 'react';

/** Help-centre filter: free-text search + topic chips over server-rendered `[data-item][data-title][data-cats]` <details>. */
export function FaqFilter({ target, label, placeholder, topicsLabel, topics, icon }: { target: string; label: string; placeholder: string; topicsLabel: string; topics: { value: string; label: string }[]; icon: React.ReactNode }) {
  const [q, setQ] = useState('');
  const [cat, setCat] = useState('all');
  useEffect(() => {
    const root = document.querySelector(target);
    if (!root) return;
    const needle = q.trim().toLowerCase();
    let n = 0;
    root.querySelectorAll<HTMLElement>('[data-item]').forEach((el) => {
      const hit = (cat === 'all' || (el.dataset.cats ?? '').split(' ').includes(cat)) && (!needle || (el.dataset.title ?? '').toLowerCase().includes(needle));
      el.hidden = !hit;
      if (hit) n++;
      if (needle && hit) (el as HTMLDetailsElement).open = true;
    });
    document.querySelectorAll<HTMLElement>('[data-faq-empty]').forEach((el) => { el.hidden = n > 0; });
  }, [q, cat, target]);
  return (
    <>
      <div className="relative" role="search"><label className="sr-only" htmlFor="faq-q">{label}</label><span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-ink-400">{icon}</span><input id="faq-q" type="search" className="input py-3.5 pl-12 text-base" placeholder={placeholder} value={q} onChange={(e) => setQ(e.target.value)} autoComplete="off" /></div>
      <div className="mt-5 flex flex-wrap gap-2" role="group" aria-label={topicsLabel}>{topics.map((o) => <button key={o.value} type="button" className={`chip ${cat === o.value ? 'is-active' : ''}`} aria-pressed={cat === o.value} onClick={() => setCat(o.value)}>{o.label}</button>)}</div>
    </>
  );
}
