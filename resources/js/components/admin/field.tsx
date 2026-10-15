import * as React from 'react';
import { cn } from '@/lib/utils';

/** Label + control + error, wired with aria-invalid / aria-describedby. Child must be a single form control. */
export function Field({ label, error, hint, required, className, children, id }: { label?: React.ReactNode; error?: string; hint?: React.ReactNode; required?: boolean; className?: string; children: React.ReactElement<Record<string, unknown>>; id?: string }) {
  const auto = React.useId();
  const fid = id ?? (children.props.id as string) ?? auto;
  const eid = `${fid}-err`;
  return (
    <div className={cn('min-w-0', className)}>
      {label && <label htmlFor={fid} className="mb-1 block text-[13px] font-medium text-[var(--muted)]">{label}{required && <span className="text-red-600" aria-hidden> *</span>}</label>}
      {React.cloneElement(children, { id: fid, 'aria-invalid': error ? true : undefined, 'aria-describedby': error ? eid : undefined, ...(required ? { 'aria-required': true } : {}) })}
      {hint && !error && <p className="mt-1 text-xs text-[var(--muted)]">{hint}</p>}
      {error && <p id={eid} role="alert" className="mt-1 text-xs font-medium text-red-600 dark:text-red-400">{error}</p>}
    </div>
  );
}

export function FormGrid({ children, className }: { children: React.ReactNode; className?: string }) {
  return <div className={cn('grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3', className)}>{children}</div>;
}
