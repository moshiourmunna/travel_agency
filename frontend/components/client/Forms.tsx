'use client';
import { useState } from 'react';
import { useSite } from './SiteContext';
import { toast } from './store';

/** POST JSON to a same-origin route handler (BFF → Laravel). Maps 422 errors onto fields. */
export async function postForm(path: string, body: unknown, lang: string) {
  const res = await fetch(`/api/${path}?lang=${lang}`, { method: 'POST', headers: { 'Content-Type': 'application/json', Accept: 'application/json' }, body: JSON.stringify(body) });
  const json = await res.json().catch(() => ({}));
  return { ok: res.ok, status: res.status, json } as { ok: boolean; status: number; json: any };
}

export function NewsletterForm({ labels }: { labels: { email: string; placeholder: string; invalid: string; submit: string; success: string; already: string } }) {
  const { lang, msg } = useSite();
  const [err, setErr] = useState(false);
  const [busy, setBusy] = useState(false);
  return (
    <form
      className="flex flex-col gap-2 sm:flex-row"
      noValidate
      onSubmit={async (e) => {
        e.preventDefault();
        const f = e.currentTarget;
        const input = f.elements.namedItem('email') as HTMLInputElement;
        if (!input.checkValidity() || !input.value) { setErr(true); input.focus(); return; }
        setErr(false); setBusy(true);
        const r = await postForm('newsletter', { email: input.value }, lang);
        setBusy(false);
        if (r.ok) { toast(r.json?.data?.status === 'already_subscribed' ? labels.already : labels.success); f.reset(); }
        else if (r.status === 422) setErr(true);
        else toast(r.status === 429 ? msg.tooMany : msg.error, 'error');
      }}
    >
      <div className={`flex-1 ${err ? 'is-invalid' : ''}`}>
        <label htmlFor="nl-email" className="sr-only">{labels.email}</label>
        <input id="nl-email" name="email" type="email" required autoComplete="email" aria-invalid={err || undefined} aria-describedby={err ? 'nl-err' : undefined} className="input border-white/10 bg-white/5 text-white placeholder:text-ink-400 dark:bg-white/5" placeholder={labels.placeholder} />
        <p id="nl-err" className="field-error">{labels.invalid}</p>
      </div>
      <button className="btn btn-accent" type="submit" disabled={busy}>{labels.submit}</button>
    </form>
  );
}
