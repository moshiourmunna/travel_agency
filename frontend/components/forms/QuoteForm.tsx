'use client';
import { useState } from 'react';
import { useSite } from '@/components/client/SiteContext';

export type QField = { name: string; label: string; type?: 'text' | 'tel' | 'email' | 'select' | 'textarea' | 'number' | 'date'; required?: boolean; options?: { value: string; label: string }[]; placeholder?: string; error?: string; autoComplete?: string; min?: number; max?: number; rows?: number; full?: boolean; defaultValue?: string };

const BD_MOBILE = /^(?:\+?880|0)1[3-9]\d{8}$/;
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

/**
 * Generic lead form → POST /api/inquiries (BFF → Laravel FormController). Client validation mirrors the server
 * (BD mobile, email); server 422 errors are mapped back onto fields. Honeypot `website` is hidden from humans.
 */
export function InquiryForm({ type, fields, submit, success, consent, extra, className = 'space-y-3', grid, idPrefix, submitClass = 'btn btn-primary w-full', header, footer }: {
  type: string; fields: QField[]; submit: string; success: string; consent?: string; extra?: Record<string, unknown>; className?: string; grid?: string; idPrefix: string; submitClass?: string; header?: React.ReactNode; footer?: React.ReactNode;
}) {
  const { lang, msg } = useSite();
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [state, setState] = useState<'idle' | 'busy' | 'done' | 'fail'>('idle');
  const [ref, setRef] = useState('');
  const onSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const form = e.currentTarget;
    const fd = new FormData(form);
    const data: Record<string, unknown> = Object.fromEntries(fd.entries());
    const er: Record<string, string> = {};
    for (const f of fields) {
      const v = String(data[f.name] ?? '').trim();
      if (f.required && !v) er[f.name] = f.error ?? msg.required;
      else if (v && f.type === 'tel' && !BD_MOBILE.test(v.replace(/[\s-]/g, ''))) er[f.name] = f.error ?? msg.phone;
      else if (v && f.type === 'email' && !EMAIL.test(v)) er[f.name] = f.error ?? msg.email;
    }
    if (consent && !fd.get('consent')) er.consent = msg.required;
    setErrors(er);
    if (Object.keys(er).length) { form.querySelector<HTMLElement>(`[name="${Object.keys(er)[0]}"]`)?.focus(); return; }
    // `details.<key>` fields travel as a nested free-form details object (profession, product, …)
    const details: Record<string, string> = {};
    for (const k of Object.keys(data)) if (k.startsWith('details.')) { details[k.slice(8)] = String(data[k]); delete data[k]; }
    setState('busy');
    try {
      const r = await fetch(`/api/inquiries?lang=${lang}`, { method: 'POST', headers: { 'Content-Type': 'application/json', Accept: 'application/json' }, body: JSON.stringify({ type, ...extra, ...data, ...(Object.keys(details).length ? { details } : {}), consent: true, page: location.pathname }) });
      const j = await r.json().catch(() => ({}));
      if (r.ok) { setRef(j.data?.reference ?? j.reference ?? ''); setState('done'); form.reset(); return; }
      if (r.status === 422 && j.errors) setErrors(Object.fromEntries(Object.entries(j.errors).map(([k, v]) => [k, (v as string[])[0]])));
      setState('fail');
    } catch { setState('fail'); }
  };
  if (state === 'done') return (
    <div className="rounded-2xl bg-emerald-50 p-5 text-sm text-emerald-900 dark:bg-emerald-900/30 dark:text-emerald-200" role="status" aria-live="polite">
      <p className="font-bold">{success}</p>{ref ? <p className="mt-1">{msg.reference}: <b className="font-mono">{ref}</b></p> : null}
    </div>
  );
  const cell = (f: QField) => {
    const id = `${idPrefix}-${f.name}`;
    const bad = !!errors[f.name];
    const common = { id, name: f.name, required: f.required, 'aria-invalid': bad || undefined, 'aria-describedby': bad ? `${id}-err` : undefined, className: 'input', defaultValue: f.defaultValue, autoComplete: f.autoComplete, placeholder: f.placeholder };
    return (
      <div key={f.name} className={`field ${bad ? 'is-invalid' : ''} ${f.full ? 'sm:col-span-2' : ''}`}>
        <label className="label" htmlFor={id}>{f.label}</label>
        {f.type === 'select' ? <select {...common}>{f.options?.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}</select>
          : f.type === 'textarea' ? <textarea {...common} rows={f.rows ?? 4} maxLength={3000} />
            : <input {...common} type={f.type ?? 'text'} inputMode={f.type === 'tel' ? 'tel' : undefined} min={f.min} max={f.max} maxLength={f.type === 'number' || f.type === 'date' ? undefined : 200} />}
        <p className="field-error" id={`${id}-err`}>{errors[f.name] || f.error || msg.required}</p>
      </div>
    );
  };
  return (
    <form className={className} noValidate onSubmit={onSubmit}>
      <input type="text" name="website" tabIndex={-1} autoComplete="off" className="hidden" aria-hidden="true" />
      {header}
      {grid ? <div className={grid}>{fields.map(cell)}</div> : fields.map(cell)}
      {consent ? (
        <div className={`field ${errors.consent ? 'is-invalid' : ''}`}><label className="flex items-start gap-2.5 text-sm"><input type="checkbox" name="consent" value="1" className="check mt-0.5" /> <span>{consent}</span></label><p className="field-error">{msg.required}</p></div>
      ) : null}
      {state === 'fail' ? <p className="text-sm font-semibold text-rose-700 dark:text-rose-400" role="alert">{msg.failed}</p> : null}
      <button className={submitClass} disabled={state === 'busy'} aria-busy={state === 'busy'}>{submit}</button>
      {footer}
      {consent ? null : <p className="text-center text-[11px] muted">{msg.privacy}</p>}
    </form>
  );
}
