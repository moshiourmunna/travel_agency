import { Link, router } from '@inertiajs/react';
import { RotateCcw, Search } from 'lucide-react';
import * as React from 'react';
import { Button } from '@/components/ui/button';
import { Input, Select } from '@/components/ui/input';
import { useT } from '@/lib/i18n';
import { clean, cn, query } from '@/lib/utils';
import type { Option } from '@/types';

/** Filter state synced to the query string (server-side filtering). */
export function useFilters<T extends Record<string, string>>(initial: T) {
  const [values, setValues] = React.useState<T>(initial);
  const apply = (next: Partial<T> = {}) => {
    const v = { ...values, ...next };
    setValues(v);
    router.get(window.location.pathname, clean(v) as Record<string, string>, { preserveState: true, preserveScroll: true, replace: true });
  };
  const set = (k: keyof T, v: string, now = false) => {
    if (now) apply({ [k]: v } as Partial<T>);
    else setValues((s) => ({ ...s, [k]: v }));
  };
  const reset = () => router.get(window.location.pathname, {}, { replace: true });
  return { values, set, apply, reset };
}

export function FilterBar({ children, onSubmit, onReset, dirty }: { children: React.ReactNode; onSubmit: () => void; onReset?: () => void; dirty?: boolean }) {
  const t = useT();
  return (
    <form role="search" onSubmit={(e) => { e.preventDefault(); onSubmit(); }} className="mb-4 flex flex-wrap items-end gap-2 [&>*]:min-w-0">
      {children}
      <div className="flex gap-2">
        <Button type="submit" size="sm"><Search />{t('Filter')}</Button>
        {dirty && onReset && <Button type="button" size="sm" variant="outline" onClick={onReset}><RotateCcw />{t('Reset')}</Button>}
      </div>
    </form>
  );
}

export function SearchInput({ value, onChange, placeholder, className }: { value: string; onChange: (v: string) => void; placeholder: string; className?: string }) {
  return (
    <div className={cn('relative w-full sm:w-auto sm:min-w-[240px] sm:flex-1', className)}>
      <Search className="pointer-events-none absolute start-3 top-1/2 size-4 -translate-y-1/2 text-[var(--muted)]" aria-hidden />
      <Input type="search" value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} aria-label={placeholder} className="ps-9" name="q" />
    </div>
  );
}

export function FilterSelect({ value, onChange, options, placeholder, label, translate = true }: { value: string; onChange: (v: string) => void; options: Option[]; placeholder: string; label?: string; translate?: boolean }) {
  const t = useT();
  return (
    <Select value={value} onChange={(e) => onChange(e.target.value)} aria-label={label ?? placeholder} className="w-[calc(50%-4px)] sm:w-auto sm:max-w-[220px]"
      placeholder={placeholder} options={options.map((o) => ({ value: o.value, label: translate ? t(o.label) : o.label }))} />
  );
}

export function DateInput({ value, onChange, label }: { value: string; onChange: (v: string) => void; label: string }) {
  return <Input type="date" value={value} onChange={(e) => onChange(e.target.value)} aria-label={label} title={label} className="w-[calc(50%-4px)] sm:w-[150px]" />;
}

/** Quick filter chips (links that replace the filter set). */
export function Chips({ items }: { items: { label: React.ReactNode; params: Record<string, string | undefined>; active: boolean }[] }) {
  return (
    <div className="chips mb-3 flex gap-1.5 overflow-x-auto pb-1" role="list">
      {items.map((c, i) => (
        <Link key={i} href={window.location.pathname + query(c.params)} preserveState replace aria-current={c.active ? 'true' : undefined}
          className={cn('inline-flex h-8 shrink-0 items-center rounded-full border px-3 text-[13px] whitespace-nowrap',
            c.active ? 'border-brand-600 bg-brand-600 text-white' : 'border-[var(--border)] bg-[var(--card)] hover:border-brand-500')}>
          {c.label}
        </Link>
      ))}
    </div>
  );
}
