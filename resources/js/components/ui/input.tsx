import * as React from 'react';
import { cn } from '@/lib/utils';

export const inputClass =
  'h-10 w-full min-w-0 rounded-lg border border-[var(--border)] bg-[var(--card)] px-3 text-sm text-[var(--fg)] placeholder:text-[var(--muted)] focus-visible:outline-2 focus-visible:outline-[var(--ring)] focus-visible:outline-offset-0 disabled:opacity-60 aria-[invalid=true]:border-red-500';

export const Input = React.forwardRef<HTMLInputElement, React.InputHTMLAttributes<HTMLInputElement>>(({ className, ...props }, ref) => (
  <input ref={ref} className={cn(inputClass, props.type === 'file' && 'h-auto py-1.5 file:me-3 file:rounded-md file:border-0 file:bg-brand-50 file:px-3 file:py-1 file:text-brand-700', className)} {...props} />
));
Input.displayName = 'Input';

export const Textarea = React.forwardRef<HTMLTextAreaElement, React.TextareaHTMLAttributes<HTMLTextAreaElement>>(({ className, ...props }, ref) => (
  <textarea ref={ref} className={cn(inputClass, 'h-auto min-h-[72px] py-2', className)} {...props} />
));
Textarea.displayName = 'Textarea';

type SelectProps = React.SelectHTMLAttributes<HTMLSelectElement> & { options?: { value: string; label: string }[]; placeholder?: string };

/** Native select (best on mobile, accessible by default) styled like shadcn. */
export const Select = React.forwardRef<HTMLSelectElement, SelectProps>(({ className, options, placeholder, children, ...props }, ref) => (
  <select ref={ref} className={cn(inputClass, 'pe-8 appearance-none bg-[length:16px] bg-no-repeat [background-position:right_.6rem_center] rtl:[background-position:left_.6rem_center]', className)}
    style={{ backgroundImage: "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='%2378857f' stroke-width='2'%3E%3Cpath d='m6 9 6 6 6-6'/%3E%3C/svg%3E\")" }} {...props}>
    {placeholder !== undefined && <option value="">{placeholder}</option>}
    {options?.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
    {children}
  </select>
));
Select.displayName = 'Select';

export function Label({ className, ...props }: React.LabelHTMLAttributes<HTMLLabelElement>) {
  return <label className={cn('mb-1 block text-[13px] font-medium text-[var(--muted)]', className)} {...props} />;
}

export function Checkbox({ label, className, ...props }: React.InputHTMLAttributes<HTMLInputElement> & { label: React.ReactNode }) {
  return (
    <label className={cn('inline-flex min-h-9 cursor-pointer items-center gap-2 text-sm', className)}>
      <input type="checkbox" className="size-4 rounded accent-brand-600" {...props} />
      <span>{label}</span>
    </label>
  );
}
