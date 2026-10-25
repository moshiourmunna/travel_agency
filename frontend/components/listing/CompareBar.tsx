'use client';
import Link from 'next/link';
import { KEYS, useCompare, write } from '@/components/client/store';
import { useSite } from '@/components/client/SiteContext';

export function CompareBar({ label, clear, go, href }: { label: string; clear: string; go: string; href: string }) {
  const ids = useCompare();
  const { lang } = useSite();
  if (!ids.length) return null;
  const d = (n: number) => (lang === 'bn' ? String(n).replace(/\d/g, (x) => '০১২৩৪৫৬৭৮৯'[+x]) : String(n));
  return (
    <div id="compare-bar" className="fixed inset-x-3 bottom-20 z-40 mx-auto flex max-w-xl items-center justify-between gap-3 rounded-2xl bg-ink-900 p-3 pl-5 text-white shadow-2xl lg:bottom-6" role="region" aria-label={label}>
      <p className="text-sm font-semibold" aria-live="polite"><span data-compare-n>{d(ids.length)}</span>/{d(3)} {label}</p>
      <div className="flex gap-2"><button type="button" className="btn btn-sm text-ink-300 hover:text-white" onClick={() => write(KEYS.compare, [])}>{clear}</button><Link href={`${href}?ids=${ids.join(',')}`} className="btn btn-accent btn-sm">{go}</Link></div>
    </div>
  );
}
