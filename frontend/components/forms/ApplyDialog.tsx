'use client';
import { useRef, useState } from 'react';
import { useSite } from '@/components/client/SiteContext';

type L = Record<'apply' | 'title' | 'close' | 'name' | 'email' | 'phone' | 'cv' | 'cvHint' | 'submit' | 'success' | 'required' | 'emailBad' | 'cvBad' | 'failed', string>;

/** "Apply" button + modal form for one job; posts multipart to the BFF (CV stays private on the server). */
export function ApplyDialog({ slug, job, l, closeIcon }: { slug: string; job: string; l: L; closeIcon: React.ReactNode }) {
  const { lang, msg } = useSite();
  const dlg = useRef<HTMLDialogElement>(null);
  const [state, setState] = useState<'idle' | 'busy' | 'done'>('idle');
  const [ref, setRef] = useState('');
  const [err, setErr] = useState<Record<string, string>>({});
  const id = `ap-${slug}`;
  const submit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const er: Record<string, string> = {};
    if (!String(fd.get('name') ?? '').trim()) er.name = l.required;
    const em = String(fd.get('email') ?? '').trim();
    if (!em) er.email = l.required; else if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(em)) er.email = l.emailBad;
    const cv = fd.get('cv') as File | null;
    if (cv && cv.size && (cv.type !== 'application/pdf' || cv.size > 5 * 1024 * 1024)) er.cv = l.cvBad;
    if (cv && !cv.size) fd.delete('cv');
    setErr(er);
    if (Object.keys(er).length) { e.currentTarget.querySelector<HTMLElement>(`[name="${Object.keys(er)[0]}"]`)?.focus(); return; }
    setState('busy');
    try {
      const r = await fetch(`/api/careers/${slug}/apply?lang=${lang}`, { method: 'POST', body: fd, headers: { Accept: 'application/json' } });
      const j = await r.json().catch(() => ({}));
      if (r.ok) { setRef(j.data?.reference ?? ''); setState('done'); return; }
      if (j.errors) setErr(Object.fromEntries(Object.entries(j.errors).map(([k, v]) => [k, (v as string[])[0]])));
      else setErr({ form: l.failed });
    } catch { setErr({ form: l.failed }); }
    setState('idle');
  };
  const f = (name: string, label: string, input: React.ReactNode, hint?: string) => (
    <div className={`field ${err[name] ? 'is-invalid' : ''}`}><label className="label" htmlFor={`${id}-${name}`}>{label}</label>{input}{hint ? <p className="mt-1 text-xs muted">{hint}</p> : null}<p className="field-error" id={`${id}-${name}-err`}>{err[name] ?? l.required}</p></div>
  );
  const p = (name: string) => ({ id: `${id}-${name}`, name, 'aria-invalid': !!err[name] || undefined, 'aria-describedby': err[name] ? `${id}-${name}-err` : undefined });
  return (
    <>
      <button type="button" className="btn btn-outline btn-sm shrink-0" aria-label={`${l.apply} — ${job}`} onClick={() => { setErr({}); dlg.current?.showModal(); }}>{l.apply}</button>
      <dialog ref={dlg} className="w-[min(100%-2rem,32rem)] rounded-3xl bg-white p-0 text-ink-900 shadow-2xl backdrop:bg-ink-950/60 dark:bg-ink-900 dark:text-ink-100" aria-labelledby={`${id}-t`}>
        {state === 'done' ? (
          <div className="p-6 text-center" role="status"><p className="text-lg font-bold">{l.success}</p>{ref ? <p className="mt-1 text-sm">{msg.reference}: <b className="font-mono">{ref}</b></p> : null}<button type="button" className="btn btn-primary mt-5" onClick={() => dlg.current?.close()}>{l.close}</button></div>
        ) : (
          <form className="space-y-4 p-6" noValidate onSubmit={submit} encType="multipart/form-data">
            <input type="text" name="website" tabIndex={-1} autoComplete="off" className="hidden" aria-hidden="true" />
            <div className="flex items-center justify-between gap-3"><h2 id={`${id}-t`} className="text-xl font-bold">{l.title}<span className="mt-0.5 block text-sm font-normal muted">{job}</span></h2><button type="button" className="icon-btn" onClick={() => dlg.current?.close()} aria-label={l.close}>{closeIcon}</button></div>
            {f('name', `${l.name} *`, <input {...p('name')} className="input" required autoComplete="name" maxLength={120} />)}
            {f('email', `${l.email} *`, <input {...p('email')} type="email" className="input" required autoComplete="email" maxLength={190} />)}
            {f('phone', l.phone, <input {...p('phone')} type="tel" className="input" autoComplete="tel" placeholder="01XXXXXXXXX" maxLength={20} />)}
            {f('cv', l.cv, <input {...p('cv')} type="file" accept=".pdf,application/pdf" className="input" />, l.cvHint)}
            {err.form ? <p className="text-sm font-semibold text-rose-600" role="alert">{err.form}</p> : null}
            <button className="btn btn-primary w-full" disabled={state === 'busy'} aria-busy={state === 'busy'}>{l.submit}</button>
          </form>
        )}
      </dialog>
    </>
  );
}
