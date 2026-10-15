import { Link } from '@inertiajs/react';
import * as React from 'react';
import { Card } from '@/components/ui/card';
import { cn } from '@/lib/utils';

export function StatCard({ label, value, sub, href, tone, icon, children }: { label: string; value: React.ReactNode; sub?: React.ReactNode; href?: string; tone?: 'danger'; icon?: React.ReactNode; children?: React.ReactNode }) {
  const body = (
    <Card className={cn('h-full p-4', href && 'transition hover:border-brand-500 hover:shadow-md')}>
      <div className="flex items-center justify-between gap-2 text-[13px] text-[var(--muted)]"><span>{label}</span>{icon}</div>
      <div className={cn('mt-1 text-xl font-bold tabular-nums sm:text-2xl', tone === 'danger' && 'text-red-600 dark:text-red-400')}>{value}</div>
      {sub && <div className="mt-0.5 text-xs text-[var(--muted)]">{sub}</div>}
      {children}
    </Card>
  );
  return href ? <Link href={href} className="block rounded-xl focus-visible:outline-2">{body}</Link> : body;
}

export function Progress({ value }: { value: number }) {
  return (
    <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-slate-200 dark:bg-slate-700" role="progressbar" aria-valuenow={value} aria-valuemin={0} aria-valuemax={100}>
      <div className="h-full rounded-full bg-brand-500" style={{ width: `${Math.min(100, Math.max(0, value))}%` }} />
    </div>
  );
}
