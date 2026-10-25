'use client';
import { useEffect, useRef, useState } from 'react';
import { useSite } from './SiteContext';

/**
 * Instant client-side filter over server-rendered items (`[data-item][data-title]` inside `target`).
 * Updates the live count (`[data-count-out]`) and toggles the empty state (`[data-empty]`). Pre-filled from ?q=.
 */
export function TextFilter({ target, id, label, placeholder, icon, className }: { target: string; id: string; label: string; placeholder: string; icon: React.ReactNode; className?: string }) {
  const { lang } = useSite();
  const [q, setQ] = useState('');
  const first = useRef(true);
  useEffect(() => {
    if (first.current) { first.current = false; const init = new URLSearchParams(location.search).get('q') ?? ''; if (init) { setQ(init); return; } }
    const root = document.querySelector(target);
    if (!root) return;
    const needle = q.trim().toLowerCase();
    let n = 0;
    root.querySelectorAll<HTMLElement>('[data-item]').forEach((el) => { const hit = !needle || (el.dataset.title ?? '').toLowerCase().includes(needle); el.hidden = !hit; if (hit) n++; });
    root.querySelectorAll<HTMLElement>('[data-count-out]').forEach((el) => { el.textContent = lang === 'bn' ? String(n).replace(/\d/g, (d) => '০১২৩৪৫৬৭৮৯'[+d]) : String(n); });
    root.querySelectorAll<HTMLElement>('[data-empty]').forEach((el) => { el.hidden = n > 0; });
  }, [q, target, lang]);
  return (
    <form className={className} role="search" onSubmit={(e) => e.preventDefault()}>
      <label className="label" htmlFor={id}>{label}</label>
      <div className="relative"><span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-ink-400">{icon}</span><input id={id} name="q" type="search" className="input pl-9" placeholder={placeholder} value={q} onChange={(e) => setQ(e.target.value)} autoComplete="off" /></div>
    </form>
  );
}
