import { useId, useMemo, useRef, useState, useEffect, type ReactNode } from 'react';
import { Icon } from '@/components/Icon';
import { cx } from '@/components/ui';
import { useT } from '@/lib/i18n';
import type { Opt } from '@/lib/types';

export function FieldWrap({ label, help, error, required, children, id, className, extra }: { label?: ReactNode; help?: ReactNode; error?: string | null; required?: boolean; children: ReactNode; id?: string; className?: string; extra?: ReactNode }) {
  return (
    <div className={cx(error && 'is-invalid', className)} data-field-error={error ? 'true' : undefined}>
      {label ? (
        <div className="flex items-end justify-between gap-2">
          <label className="label" htmlFor={id}>{label}{required ? <span className="text-rose-600" aria-hidden="true"> *</span> : null}</label>
          {extra}
        </div>
      ) : null}
      {children}
      {error ? <p className="mt-1 text-xs font-medium text-rose-600 dark:text-rose-400" role="alert">{error}</p> : help ? <p className="mt-1 text-xs muted">{help}</p> : null}
    </div>
  );
}

type InputProps = { label?: ReactNode; value: any; onChange: (v: string) => void; error?: string | null; help?: ReactNode; required?: boolean; type?: string; placeholder?: string; readOnly?: boolean; autoComplete?: string; min?: number; max?: number; step?: string; prefix?: ReactNode; lang?: string; counter?: number; className?: string; name?: string };
export function Input({ label, value, onChange, error, help, required, type = 'text', placeholder, readOnly, autoComplete, min, max, step, prefix, lang, counter, className, name }: InputProps) {
  const id = useId();
  const len = String(value ?? '').length;
  return (
    <FieldWrap label={label} help={help} error={error} required={required} id={id} className={className}
      extra={counter ? <span className={cx('mb-1.5 text-[11px] tabular-nums', len > counter ? 'text-rose-600' : 'muted')}>{len}/{counter}</span> : null}>
      <div className="relative">
        {prefix ? <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm text-ink-400">{prefix}</span> : null}
        <input id={id} name={name} type={type} lang={lang} className={cx('input', prefix ? 'pl-8' : '', readOnly && 'bg-ink-50 text-ink-500 dark:bg-ink-900')} value={value ?? ''} onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder} readOnly={readOnly} autoComplete={autoComplete} min={min} max={max} step={step} aria-invalid={!!error || undefined} required={required} />
      </div>
    </FieldWrap>
  );
}

export function Textarea({ label, value, onChange, error, help, required, rows = 4, readOnly, lang, placeholder, counter, mono }: { label?: ReactNode; value: any; onChange: (v: string) => void; error?: string | null; help?: ReactNode; required?: boolean; rows?: number; readOnly?: boolean; lang?: string; placeholder?: string; counter?: number; mono?: boolean }) {
  const id = useId();
  const len = String(value ?? '').length;
  return (
    <FieldWrap label={label} help={help} error={error} required={required} id={id} extra={counter ? <span className={cx('mb-1.5 text-[11px] tabular-nums', len > counter ? 'text-rose-600' : 'muted')}>{len}/{counter}</span> : null}>
      <textarea id={id} lang={lang} rows={rows} className={cx('input min-h-[2.75rem] leading-6', mono && 'font-mono text-xs', readOnly && 'bg-ink-50 dark:bg-ink-900')} value={value ?? ''} onChange={(e) => onChange(e.target.value)} readOnly={readOnly} placeholder={placeholder} aria-invalid={!!error || undefined} />
    </FieldWrap>
  );
}

/** Native select for short lists, searchable combobox for long ones. */
export function Select({ label, value, onChange, options, error, help, required, placeholder, readOnly, allowEmpty = true }: { label?: ReactNode; value: any; onChange: (v: any) => void; options: Opt[]; error?: string | null; help?: ReactNode; required?: boolean; placeholder?: string; readOnly?: boolean; allowEmpty?: boolean }) {
  const id = useId();
  const { t } = useT();
  if (options.length > 12 && !readOnly) {
    return <FieldWrap label={label} help={help} error={error} required={required} id={id}><Combo id={id} value={value} onChange={onChange} options={options} placeholder={placeholder ?? t('Choose…', 'বাছাই করুন…')} allowEmpty={allowEmpty && !required} /></FieldWrap>;
  }
  return (
    <FieldWrap label={label} help={help} error={error} required={required} id={id}>
      <select id={id} className="input" value={value ?? ''} disabled={readOnly} aria-invalid={!!error || undefined}
        onChange={(e) => { const o = options.find((x) => String(x.value) === e.target.value); onChange(o ? o.value : null); }}>
        {allowEmpty || value === null || value === undefined || value === '' ? <option value="">{placeholder ?? (required ? t('Choose…', 'বাছাই করুন…') : '—')}</option> : null}
        {options.map((o) => <option key={String(o.value)} value={String(o.value)}>{o.label}</option>)}
      </select>
    </FieldWrap>
  );
}

export function Combo({ id, value, onChange, options, placeholder, allowEmpty = true }: { id?: string; value: any; onChange: (v: any) => void; options: Opt[]; placeholder?: string; allowEmpty?: boolean }) {
  const { t } = useT();
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState('');
  const [hi, setHi] = useState(0);
  const ref = useRef<HTMLDivElement>(null);
  const cur = options.find((o) => String(o.value) === String(value));
  const list = useMemo(() => { const s = q.trim().toLowerCase(); return (s ? options.filter((o) => o.label.toLowerCase().includes(s) || String(o.value).toLowerCase() === s) : options).slice(0, 200); }, [q, options]);
  useEffect(() => {
    if (!open) return;
    const h = (e: MouseEvent) => !ref.current?.contains(e.target as Node) && setOpen(false);
    document.addEventListener('mousedown', h);
    return () => document.removeEventListener('mousedown', h);
  }, [open]);
  const pick = (o: Opt | null) => { onChange(o ? o.value : null); setOpen(false); setQ(''); };
  return (
    <div className="relative" ref={ref}>
      <button id={id} type="button" className="input flex items-center justify-between gap-2 text-left" aria-haspopup="listbox" aria-expanded={open} onClick={() => setOpen(!open)}>
        <span className={cx('truncate', !cur && 'text-ink-400')}>{cur?.label ?? placeholder}</span><Icon name="chevrons-up-down" size={15} className="shrink-0 text-ink-400" />
      </button>
      {open ? (
        <div className="absolute z-40 mt-1 w-full min-w-[16rem] overflow-hidden rounded-xl border border-ink-100 bg-white shadow-lift dark:border-ink-700 dark:bg-ink-900">
          <div className="border-b border-ink-100 p-2 dark:border-ink-800">
            <input autoFocus className="input h-9 py-1.5" placeholder={t('Type to filter…', 'ফিল্টার করতে লিখুন…')} value={q} onChange={(e) => { setQ(e.target.value); setHi(0); }}
              onKeyDown={(e) => {
                if (e.key === 'ArrowDown') { e.preventDefault(); setHi((h) => Math.min(list.length - 1, h + 1)); }
                if (e.key === 'ArrowUp') { e.preventDefault(); setHi((h) => Math.max(0, h - 1)); }
                if (e.key === 'Enter') { e.preventDefault(); if (list[hi]) pick(list[hi]); }
                if (e.key === 'Escape') setOpen(false);
              }} />
          </div>
          <ul role="listbox" className="max-h-64 overflow-y-auto py-1">
            {allowEmpty ? <li><button type="button" className="w-full px-3 py-1.5 text-left text-sm muted hover:bg-ink-50 dark:hover:bg-ink-800" onClick={() => pick(null)}>—</button></li> : null}
            {list.map((o, i) => (
              <li key={String(o.value)}>
                <button type="button" role="option" aria-selected={String(o.value) === String(value)} onMouseEnter={() => setHi(i)} onClick={() => pick(o)}
                  className={cx('flex w-full items-center justify-between gap-2 px-3 py-1.5 text-left text-sm', i === hi && 'bg-brand-50 dark:bg-brand-900/40', String(o.value) === String(value) && 'font-semibold text-brand-800 dark:text-brand-200')}>
                  <span className="truncate">{o.label}</span>{String(o.value) === String(value) ? <Icon name="check" size={14} /> : null}
                </button>
              </li>
            ))}
            {list.length === 0 ? <li className="px-3 py-2 text-sm muted">{t('No match', 'মেলেনি')}</li> : null}
          </ul>
        </div>
      ) : null}
    </div>
  );
}

export function MultiSelect({ value, onChange, options, placeholder }: { value: any[]; onChange: (v: any[]) => void; options: Opt[]; placeholder?: string }) {
  const { t } = useT();
  const [q, setQ] = useState('');
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const sel = (value ?? []).map(String);
  useEffect(() => {
    if (!open) return;
    const h = (e: MouseEvent) => !ref.current?.contains(e.target as Node) && setOpen(false);
    document.addEventListener('mousedown', h);
    return () => document.removeEventListener('mousedown', h);
  }, [open]);
  const byVal = new Map(options.map((o) => [String(o.value), o]));
  const list = options.filter((o) => !sel.includes(String(o.value)) && o.label.toLowerCase().includes(q.trim().toLowerCase())).slice(0, 150);
  const add = (o: Opt) => { onChange([...(value ?? []), o.value]); setQ(''); };
  const remove = (v: string) => onChange((value ?? []).filter((x) => String(x) !== v));
  const move = (i: number, d: number) => { const a = [...(value ?? [])]; const j = i + d; if (j < 0 || j >= a.length) return; [a[i], a[j]] = [a[j], a[i]]; onChange(a); };
  return (
    <div className="relative" ref={ref}>
      <div className="input flex min-h-[2.75rem] flex-wrap items-center gap-1.5 py-1.5" onClick={() => setOpen(true)}>
        {sel.map((v, i) => (
          <span key={v} className="inline-flex items-center gap-1 rounded-lg bg-brand-50 py-0.5 pl-2 pr-1 text-xs font-semibold text-brand-800 dark:bg-brand-900/40 dark:text-brand-200">
            {i > 0 ? <button type="button" className="opacity-50 hover:opacity-100" onClick={(e) => { e.stopPropagation(); move(i, -1); }} aria-label={t('Move left', 'বাঁয়ে সরান')}><Icon name="chevron-left" size={12} /></button> : null}
            {byVal.get(v)?.label ?? `#${v}`}
            <button type="button" className="rounded p-0.5 hover:bg-brand-100 dark:hover:bg-brand-800" onClick={(e) => { e.stopPropagation(); remove(v); }} aria-label={t('Remove', 'সরান')}><Icon name="x" size={12} /></button>
          </span>
        ))}
        <input className="min-w-[8rem] flex-1 bg-transparent text-sm outline-none" value={q} placeholder={sel.length ? '' : placeholder ?? t('Add…', 'যোগ করুন…')} onFocus={() => setOpen(true)} onChange={(e) => { setQ(e.target.value); setOpen(true); }}
          onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); if (list[0]) add(list[0]); } if (e.key === 'Backspace' && !q && sel.length) remove(sel[sel.length - 1]); if (e.key === 'Escape') setOpen(false); }} />
      </div>
      {open && list.length ? (
        <ul className="absolute z-40 mt-1 max-h-64 w-full overflow-y-auto rounded-xl border border-ink-100 bg-white py-1 shadow-lift dark:border-ink-700 dark:bg-ink-900" role="listbox">
          {list.map((o) => <li key={String(o.value)}><button type="button" className="w-full px-3 py-1.5 text-left text-sm hover:bg-brand-50 dark:hover:bg-brand-900/40" onClick={() => add(o)}>{o.label}</button></li>)}
        </ul>
      ) : null}
    </div>
  );
}

export function LangTag({ l }: { l: 'en' | 'bn' }) {
  return <span className={cx('rounded px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide', l === 'en' ? 'bg-sky-50 text-sky-700 dark:bg-sky-900/40 dark:text-sky-300' : 'bg-emerald-50 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300')}>{l === 'en' ? 'EN' : 'বাংলা'}</span>;
}
