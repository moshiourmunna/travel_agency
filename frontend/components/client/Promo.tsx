'use client';
import { useEffect, useState } from 'react';
import { digits } from '@/lib/format';
import { useSite } from './SiteContext';
import { toast } from './store';

/** Coupon code chip: copies to the clipboard and confirms with a toast. */
export function CopyCode({ code, className, label, children }: { code: string; className: string; label: string; children?: React.ReactNode }) {
  const { msg } = useSite();
  return (
    <button type="button" className={className} aria-label={`${label} ${code}`} onClick={async () => {
      try { await navigator.clipboard.writeText(code); toast(`${msg.copied} ${code}`); } catch { toast(code); }
    }}>{code} {children}</button>
  );
}

function useLeft(to: string) {
  const [now, setNow] = useState<number | null>(null);
  useEffect(() => { setNow(Date.now()); const id = setInterval(() => setNow(Date.now()), 1000); return () => clearInterval(id); }, []);
  if (now === null) return null;
  let s = Math.max(0, Math.floor((new Date(to).getTime() - now) / 1000));
  const d = Math.floor(s / 86400); s -= d * 86400;
  const h = Math.floor(s / 3600); s -= h * 3600;
  const m = Math.floor(s / 60); s -= m * 60;
  return { d, h, m, s, over: new Date(to).getTime() <= now };
}
const p2 = (n: number) => String(n).padStart(2, '0');

/** Four-box countdown (days / hours / mins / secs). */
export function CountdownGrid({ to, label, units, className = 'grid grid-cols-4 gap-2 text-center' }: { to: string; label: string; units: [string, string, string, string]; className?: string }) {
  const { lang } = useSite();
  const l = useLeft(to);
  const vals = l ? [l.d, l.h, l.m, l.s].map((n) => digits(p2(n), lang)) : ['--', '--', '--', '--'];
  return (
    <div className={className} role="timer" aria-label={label}>
      {vals.map((v, k) => <div key={k} className="min-w-[4rem] rounded-2xl bg-ink-900 px-2 py-3 text-white"><b className="block text-2xl tabular-nums" suppressHydrationWarning>{v}</b><span className="text-[11px] uppercase tracking-wider text-ink-300">{units[k]}</span></div>)}
    </div>
  );
}

/** Inline "3d 04:12:09" countdown (offer cards); shows `ended` once past. */
export function CountdownText({ to, ended }: { to: string; ended: string }) {
  const { lang, msg } = useSite();
  const l = useLeft(to);
  return <b className="tabular-nums" suppressHydrationWarning>{!l ? '--' : l.over ? ended : digits(`${l.d}${msg.days} ${p2(l.h)}:${p2(l.m)}:${p2(l.s)}`, lang)}</b>;
}
