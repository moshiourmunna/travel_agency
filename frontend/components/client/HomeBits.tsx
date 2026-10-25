'use client';
import { useEffect, useRef, useState } from 'react';
import { useSite } from './SiteContext';
import { digits } from '@/lib/format';

/** Live countdown "12d 04h 10m 05s" to an ISO time; renders "--" on the server to avoid hydration drift. */
export function Countdown({ to, className, label, endsLabel }: { to: string; className: string; label: string; endsLabel: string }) {
  const { lang, msg } = useSite();
  const [now, setNow] = useState<number | null>(null);
  useEffect(() => { setNow(Date.now()); const id = setInterval(() => setNow(Date.now()), 1000); return () => clearInterval(id); }, []);
  let out = '--';
  if (now !== null) {
    let s = Math.max(0, Math.floor((new Date(to).getTime() - now) / 1000));
    const d = Math.floor(s / 86400); s -= d * 86400;
    const h = Math.floor(s / 3600); s -= h * 3600;
    const m = Math.floor(s / 60); s -= m * 60;
    const p = (n: number) => String(n).padStart(2, '0');
    out = digits(`${d}${msg.days} ${p(h)}:${p(m)}:${p(s)}`, lang);
  }
  return (
    <div className={className} aria-label={label}>
      <span className="text-xs text-ink-300">{endsLabel}</span><b className="text-base font-bold tabular-nums" suppressHydrationWarning>{out}</b>
    </div>
  );
}

export function ScrollButtons({ target, prev, next, children }: { target: string; prev: string; next: string; children: [React.ReactNode, React.ReactNode] }) {
  const go = (dir: number) => { const el = document.querySelector<HTMLElement>(target); el?.scrollBy({ left: dir * el.clientWidth * 0.8, behavior: 'smooth' }); };
  return (
    <div className="hidden gap-2 md:flex">
      <button type="button" className="icon-btn border border-ink-200 dark:border-ink-700" aria-label={prev} onClick={() => go(-1)}>{children[0]}</button>
      <button type="button" className="icon-btn border border-ink-200 dark:border-ink-700" aria-label={next} onClick={() => go(1)}>{children[1]}</button>
    </div>
  );
}

/** Quick filter chips over server-rendered cards (data-region / data-cats on each [data-item]). */
export function QuickFilter({ label, options, header, children }: { label: string; options: { value: string; label: string }[]; header: React.ReactNode; children: React.ReactNode }) {
  const [v, setV] = useState('all');
  const box = useRef<HTMLDivElement>(null);
  useEffect(() => {
    box.current?.querySelectorAll<HTMLElement>('[data-item]').forEach((el) => {
      const ok = v === 'all' || el.dataset.region === v || (el.dataset.cats ?? '').split(' ').includes(v);
      el.hidden = !ok;
    });
  }, [v]);
  return (
    <>
      <div className="mb-8 flex flex-col gap-5 md:flex-row md:items-end md:justify-between">
        {header}
        <div className="no-scrollbar -mx-4 flex gap-2 overflow-x-auto px-4 md:mx-0 md:px-0" role="group" aria-label={label}>
          {options.map((o) => <button key={o.value} type="button" className={`chip shrink-0 ${v === o.value ? 'is-active' : ''}`} aria-pressed={v === o.value} onClick={() => setV(o.value)}>{o.label}</button>)}
        </div>
      </div>
      <div ref={box}>{children}</div>
    </>
  );
}

/** Animated number (counts up once when visible). SSR renders the final value. */
export function CountUp({ value, suffix = '', format }: { value: number; suffix?: string; format: 'lakh' | 'plain' }) {
  const { lang } = useSite();
  const ref = useRef<HTMLElement>(null);
  const [n, setN] = useState(value);
  useEffect(() => {
    const el = ref.current;
    if (!el || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const io = new IntersectionObserver(([e]) => {
      if (!e.isIntersecting) return;
      io.disconnect();
      const t0 = performance.now();
      const step = (t: number) => { const k = Math.min(1, (t - t0) / 1200); setN(Math.round(value * (1 - Math.pow(1 - k, 3)))); if (k < 1) requestAnimationFrame(step); };
      setN(0); requestAnimationFrame(step);
    });
    io.observe(el);
    return () => io.disconnect();
  }, [value]);
  const s = format === 'lakh' ? String(n).replace(/(\d)(?=(\d\d)+\d$)/g, '$1,') : String(n);
  return <b ref={ref} className="block text-2xl font-extrabold text-brand-700 dark:text-brand-300" suppressHydrationWarning>{digits(s, lang)}{suffix}</b>;
}
