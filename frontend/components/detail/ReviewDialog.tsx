'use client';
import { useRef, useState } from 'react';
import { useSite } from '@/components/client/SiteContext';

type L = { open: string; title: string; rating: string; ratingErr: string; titleLabel: string; titleErr: string; body: string; bodyErr: string; cancel: string; submit: string; close: string; stars: string; success: string; signin: string; signinCta: string; failed: string };

/**
 * "Write a review": validates like the mockup, posts to the BFF (/api/reviews). Only travellers with a completed
 * booking may review — a 401 from the API shows a sign-in prompt instead of a fake success.
 */
export function ReviewDialog({ l, subject, loginHref, openIcon, closeIcon, starIcon, buttonClass = 'btn btn-outline btn-sm' }: { l: L; subject: { type: string; slug: string }; loginHref: string; openIcon: React.ReactNode; closeIcon: React.ReactNode; starIcon: React.ReactNode; buttonClass?: string }) {
  const dlg = useRef<HTMLDialogElement>(null);
  const { lang } = useSite();
  const [rating, setRating] = useState(0);
  const [err, setErr] = useState<Record<string, boolean>>({});
  const [state, setState] = useState<'idle' | 'busy' | 'done' | 'auth' | 'fail'>('idle');
  const submit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    const title = String(f.get('title') ?? '').trim(), body = String(f.get('body') ?? '').trim();
    const er = { rating: !rating, title: title.length < 4, body: body.length < 20 };
    setErr(er);
    if (Object.values(er).some(Boolean)) { (e.currentTarget.querySelector('.is-invalid input, .is-invalid textarea, .is-invalid button') as HTMLElement | null)?.focus(); return; }
    setState('busy');
    try {
      const r = await fetch(`/api/reviews?lang=${lang}`, { method: 'POST', headers: { 'Content-Type': 'application/json', Accept: 'application/json' }, body: JSON.stringify({ ...subject, rating, title, body }) });
      setState(r.ok ? 'done' : r.status === 401 || r.status === 403 ? 'auth' : 'fail');
    } catch { setState('fail'); }
  };
  return (
    <>
      <button type="button" className={buttonClass} onClick={() => { setState('idle'); dlg.current?.showModal(); }}>{openIcon} {l.open}</button>
      <dialog ref={dlg} className="w-[calc(100%-2rem)] max-w-lg rounded-3xl bg-white p-0 text-ink-800 shadow-2xl backdrop:bg-ink-950/60 dark:bg-ink-900 dark:text-ink-100" aria-labelledby="rv-h">
        <form className="space-y-4 p-6" noValidate onSubmit={submit}>
          <div className="flex items-center justify-between"><h2 id="rv-h" className="text-xl font-bold">{l.title}</h2><button type="button" className="icon-btn" onClick={() => dlg.current?.close()} aria-label={l.close}>{closeIcon}</button></div>
          {state === 'done' ? <p className="rounded-xl bg-emerald-50 p-4 text-sm font-semibold text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-300" role="status">{l.success}</p> : null}
          {state === 'auth' ? <p className="rounded-xl bg-amber-50 p-4 text-sm text-amber-900 dark:bg-amber-900/30 dark:text-amber-200" role="alert">{l.signin} <a className="link font-semibold" href={loginHref}>{l.signinCta}</a></p> : null}
          {state === 'fail' ? <p className="rounded-xl bg-rose-50 p-4 text-sm text-rose-800 dark:bg-rose-900/30 dark:text-rose-300" role="alert">{l.failed}</p> : null}
          <div className={`field ${err.rating ? 'is-invalid' : ''}`}><p className="label" id="rv-rate">{l.rating}</p>
            <div className="flex gap-1" role="group" aria-labelledby="rv-rate">{[1, 2, 3, 4, 5].map((n) => <button key={n} type="button" className={n <= rating ? 'text-accent-400' : 'text-ink-300'} aria-label={`${lang === 'bn' ? '০১২৩৪৫'[n] : n} ${l.stars}`} aria-pressed={n === rating} onClick={() => { setRating(n); setErr((x) => ({ ...x, rating: false })); }}>{starIcon}</button>)}</div>
            <p className="field-error">{l.ratingErr}</p></div>
          <div className={`field ${err.title ? 'is-invalid' : ''}`}><label className="label" htmlFor="rv-title">{l.titleLabel}</label><input id="rv-title" name="title" className="input" required minLength={4} maxLength={120} aria-invalid={err.title || undefined} /><p className="field-error">{l.titleErr}</p></div>
          <div className={`field ${err.body ? 'is-invalid' : ''}`}><label className="label" htmlFor="rv-body">{l.body}</label><textarea id="rv-body" name="body" rows={4} className="input" required minLength={20} maxLength={3000} aria-invalid={err.body || undefined} /><p className="field-error">{l.bodyErr}</p></div>
          <div className="flex justify-end gap-2"><button type="button" className="btn btn-ghost" onClick={() => dlg.current?.close()}>{l.cancel}</button><button className="btn btn-primary" disabled={state === 'busy'} aria-busy={state === 'busy'}>{l.submit}</button></div>
        </form>
      </dialog>
    </>
  );
}
