'use client';
import { useState } from 'react';
import { useSite } from '@/components/client/SiteContext';
import { digits, groupLakh } from '@/lib/format';

type Design = { code: string; name: string; gradient: string; amounts: number[] };

/** Gift card builder with live preview; submits to checkout (/booking?gift=…) where payment happens. */
export function GiftCardForm({ designs, booking, today, l, icon, logo }: {
  designs: Design[]; booking: string; today: string; logo: string; icon: React.ReactNode;
  l: Record<'brand' | 'forWho' | 'note' | 'amount' | 'design' | 'to' | 'email' | 'message' | 'date' | 'buy' | 'required' | 'emailBad', string>;
}) {
  const { lang } = useSite();
  const [design, setDesign] = useState(designs[0]?.code ?? 'classic');
  const d = designs.find((x) => x.code === design) ?? designs[0];
  const amounts = d?.amounts?.length ? d.amounts : [5000, 10000, 25000, 50000, 100000];
  const [amt, setAmt] = useState(amounts.includes(10000) ? 10000 : amounts[0]);
  const [to, setTo] = useState('');
  const [err, setErr] = useState<Record<string, string>>({});
  const money = (n: number) => '৳\u00a0' + digits(groupLakh(n), lang);
  return (
    <div className="grid gap-10 lg:grid-cols-2">
      <div>
        <div className={`relative aspect-[1.6] overflow-hidden rounded-3xl bg-gradient-to-br ${d?.gradient ?? 'from-brand-800 via-brand-600 to-accent-400'} p-6 text-white shadow-lift sm:p-8`} aria-live="polite">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={logo} alt="" className="absolute -right-6 -top-6 h-40 w-40 opacity-20" width={160} height={160} />
          <p className="text-sm font-semibold uppercase tracking-widest text-white/80">{l.brand}</p>
          <p className="mt-4 text-4xl font-extrabold sm:text-5xl">{money(amt)}</p>
          <p className="mt-4 text-sm text-white/90">{to.trim() || l.forWho}</p>
          <p className="absolute bottom-5 right-6 font-mono text-xs tracking-widest sm:text-sm">MSF-GIFT-••••-{digits(today.slice(0, 4), lang)}</p>
        </div>
        <p className="mt-4 text-sm muted">{l.note}</p>
      </div>
      <form className="card space-y-5 p-6" action={booking} method="get" noValidate onSubmit={(e) => {
        const f = new FormData(e.currentTarget); const er: Record<string, string> = {};
        if (!String(f.get('to') ?? '').trim()) er.to = l.required;
        const em = String(f.get('email') ?? '').trim();
        if (!em) er.email = l.required; else if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(em)) er.email = l.emailBad;
        setErr(er);
        if (Object.keys(er).length) { e.preventDefault(); e.currentTarget.querySelector<HTMLElement>(`[name="${Object.keys(er)[0]}"]`)?.focus(); }
      }}>
        <input type="hidden" name="gift" value={design} />
        {designs.length > 1 ? <fieldset><legend className="label">{l.design}</legend><div className="flex flex-wrap gap-2">{designs.map((x) => (
          <label key={x.code} className="cursor-pointer"><input type="radio" name="design" value={x.code} className="peer sr-only" checked={design === x.code} onChange={() => setDesign(x.code)} /><span className="flex items-center gap-2 rounded-xl border border-ink-200 px-3 py-2 text-sm font-semibold peer-checked:border-brand-700 peer-checked:ring-2 peer-checked:ring-brand-600 peer-focus-visible:ring-2 peer-focus-visible:ring-brand-400 dark:border-ink-700"><span className={`h-5 w-8 rounded-md bg-gradient-to-br ${x.gradient}`} aria-hidden="true" />{x.name}</span></label>
        ))}</div></fieldset> : null}
        <fieldset><legend className="label">{l.amount}</legend><div className="grid grid-cols-2 gap-2 sm:grid-cols-3">{amounts.map((a) => (
          <label key={a} className="cursor-pointer"><input type="radio" name="amount" value={a} className="peer sr-only" checked={amt === a} onChange={() => setAmt(a)} /><span className="block rounded-xl border border-ink-200 py-2.5 text-center text-sm font-bold peer-checked:border-brand-700 peer-checked:bg-brand-700 peer-checked:text-white peer-focus-visible:ring-2 peer-focus-visible:ring-brand-400 dark:border-ink-700">{money(a)}</span></label>
        ))}</div></fieldset>
        <div className={`field ${err.to ? 'is-invalid' : ''}`}><label className="label" htmlFor="gf-to">{l.to}</label><input id="gf-to" name="to" className="input" required maxLength={80} value={to} onChange={(e) => setTo(e.target.value)} aria-invalid={!!err.to || undefined} aria-describedby={err.to ? 'gf-to-err' : undefined} /><p className="field-error" id="gf-to-err">{err.to ?? l.required}</p></div>
        <div className={`field ${err.email ? 'is-invalid' : ''}`}><label className="label" htmlFor="gf-em">{l.email}</label><input id="gf-em" name="email" type="email" className="input" required autoComplete="email" aria-invalid={!!err.email || undefined} aria-describedby={err.email ? 'gf-em-err' : undefined} /><p className="field-error" id="gf-em-err">{err.email ?? l.required}</p></div>
        <div className="field"><label className="label" htmlFor="gf-msg">{l.message}</label><textarea id="gf-msg" name="message" rows={2} className="input" maxLength={140} /></div>
        <div className="field"><label className="label" htmlFor="gf-dt">{l.date}</label><input id="gf-dt" name="send_on" type="date" className="input" defaultValue={today} min={today} /></div>
        <button className="btn btn-accent btn-lg w-full">{icon} {l.buy}</button>
      </form>
    </div>
  );
}
