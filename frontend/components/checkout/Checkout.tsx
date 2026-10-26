'use client';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Price } from '@/components/client/Price';
import { useSite } from '@/components/client/SiteContext';

export type Line = { code: string; label: string; qty: number; unit: number; total: number };
export type Plan = { code: 'full' | 'deposit' | 'instalments'; now: number; discount: number; total: number; pct?: number; count?: number; schedule: { seq: number; due_date: string; amount: number }[] };
export type Quote = {
  kind: string; slug: string; title: string; subtitle: string; image: { src: string; srcset?: { w: number; url: string }[]; alt?: string } | null;
  travel_start: string | null; travel_end: string | null; pax: { adults: number; children: number; infants: number }; pax_count: number; options: Record<string, any>;
  lines: Line[]; addons: { code: string; label: string; price: number; per: string }[]; subtotal: number; discount: number; coupon: { code: string; label: string; discount: number } | null; total: number;
  plans: Plan[]; cancellation: { label: string; kind: string } | null; refundable: boolean | null; gateways: string[]; payment_mode: string; needs_passport: boolean;
  choices: { dates?: { date: string; price: number; seats_left: number }[]; rooms?: { code?: string; id?: number; label: string; price?: number }[]; cabins?: { code: string; label: string; price: number }[]; options?: { id: number; label: string; price: number }[]; max?: number; max_rooms?: number };
};
export type Sel = Record<string, string | number | string[] | undefined>;
type Contact = { first_name: string; last_name: string; email: string; phone: string; passport: string; dob: string };
type Errs = Record<string, string>;

const BD_MOBILE = /^(?:\+?88)?01[3-9]\d{8}$/;
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

/** Labels are translated on the server (admin-editable dictionary) and passed in. */
export type CheckoutL = Record<string, string>;

const GW: Record<string, { badge: React.ReactNode; sub: string }> = {
  bkash: { badge: <span className="rounded-md bg-[#E2136E] px-2 py-1 text-xs font-extrabold text-white">bKash</span>, sub: 'wallet' },
  nagad: { badge: <span className="rounded-md bg-[#C4161C] px-2 py-1 text-xs font-extrabold text-white">Nagad</span>, sub: 'wallet' },
  sslcommerz: { badge: <span className="flex gap-1"><span className="rounded bg-[#1A1F71] px-1.5 py-1 text-[10px] font-extrabold italic text-white">VISA</span><span className="flex"><span className="h-5 w-5 rounded-full bg-[#EB001B]" /><span className="-ml-2 h-5 w-5 rounded-full bg-[#F79E1B]/90" /></span></span>, sub: 'card' },
  bank_transfer: { badge: <span className="grid h-6 w-6 place-items-center rounded bg-brand-700 text-[11px] font-extrabold text-white">৳</span>, sub: 'bank' },
  mock: { badge: <span className="rounded-md bg-ink-700 px-2 py-1 text-xs font-extrabold text-white">TEST</span>, sub: 'test' },
};

/**
 * 4-step checkout (mockup booking.html): Trip → Travellers → Extras → Payment. Every change re-prices on the server
 * (POST /api/checkout/quote); the browser never decides an amount. "Pay securely" creates the booking, then starts the
 * chosen gateway and redirects (bKash/Nagad/SSLCommerz pages, or the local simulator in sandbox mode).
 */
export function Checkout({ initial, sel: sel0, L, icons, links, user, resume }: {
  initial: Quote; sel: Sel; L: CheckoutL; icons: Record<string, React.ReactNode>; links: { terms: string; refund: string; login: string; change: string };
  user?: { first_name: string; last_name: string; email: string; phone: string } | null;
  resume?: { ref: string; key: string; status: string } | null;
}) {
  const { lang } = useSite();
  const d = (x: string | number) => (lang === 'bn' ? String(x).replace(/\d/g, (c) => '০১২৩৪৫৬৭৮৯'[+c]) : String(x));
  const fmtD = (iso: string) => { const [y, m, dd] = iso.split('-').map(Number); return new Intl.DateTimeFormat(lang === 'bn' ? 'bn-BD' : 'en-GB', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC' }).format(new Date(Date.UTC(y, m - 1, dd))); };
  const [q, setQ] = useState<Quote>(initial);
  // Start from the server-normalised choices (first open date, default room…) so the form shows what was priced.
  const [sel, setSel] = useState<Sel>(() => ({ ...sel0, ...Object.fromEntries(Object.entries(initial.options).filter(([, v]) => v !== null && v !== undefined && v !== '')), addons: (initial.options.addons as string[]) ?? sel0.addons ?? [] }));
  const [minDate] = useState(() => new Date(Date.now() + 6 * 36e5).toISOString().slice(0, 10));
  const [step, setStep] = useState(resume ? 3 : 0);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string>('');
  const [errs, setErrs] = useState<Errs>({});
  const [contact, setContact] = useState<Contact>({ first_name: user?.first_name ?? '', last_name: user?.last_name ?? '', email: user?.email ?? '', phone: user?.phone ?? '', passport: '', dob: '' });
  const [others, setOthers] = useState<{ name: string; relation: string }[]>([]);
  const [notes, setNotes] = useState('');
  const [coupon, setCoupon] = useState((sel0.coupon as string) ?? '');
  const [couponMsg, setCouponMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [plan, setPlan] = useState<Plan['code']>(initial.plans.find((p) => p.code === 'deposit') ? 'deposit' : 'full');
  const [gw, setGw] = useState(initial.gateways[0] ?? '');
  const [slip, setSlip] = useState('');
  const [agree, setAgree] = useState(false);
  const [slots, setSlots] = useState<{ time: string; available: number }[] | null>(null);
  const top = useRef<HTMLDivElement>(null);
  const steps = [L.stepTrip, L.stepTravellers, L.stepExtras, L.stepPayment];
  const others_n = Math.max(0, q.kind === 'gift_card' ? 0 : q.pax_count - 1);

  useEffect(() => { setOthers((o) => Array.from({ length: others_n }, (_, k) => o[k] ?? { name: '', relation: '' })); }, [others_n]);
  useEffect(() => { if (!q.plans.find((p) => p.code === plan)) setPlan('full'); }, [q.plans, plan]);

  const requote = useCallback(async (next: Sel, withCoupon?: string) => {
    setBusy(true); setErr('');
    try {
      const r = await fetch(`/api/checkout/quote?lang=${lang}`, { method: 'POST', headers: { 'Content-Type': 'application/json', Accept: 'application/json' }, body: JSON.stringify({ ...next, coupon: withCoupon ?? (q.coupon?.code || undefined), contact: contact.email ? { email: contact.email } : undefined }) });
      const j = await r.json().catch(() => ({}));
      if (r.ok) { setQ(j.data); setSel(next); return { ok: true as const, data: j.data as Quote }; }
      const first = j.errors ? (Object.values(j.errors)[0] as string[])[0] : j.message;
      return { ok: false as const, field: j.errors ? Object.keys(j.errors)[0] : '', message: first || L.genericError };
    } catch { return { ok: false as const, field: '', message: L.genericError }; } finally { setBusy(false); }
  }, [lang, q.coupon, contact.email, L.genericError]);

  const change = async (patch: Sel) => { const r = await requote({ ...sel, ...patch }); if (!r.ok) setErr(r.message); };

  // Activity: live time slots for the chosen date.
  useEffect(() => {
    if (q.kind !== 'activity' || !sel.date) return;
    let off = false;
    fetch(`/api/slots/${encodeURIComponent(q.slug)}?date=${sel.date}&lang=${lang}`).then((r) => r.json()).then((j) => { if (!off) setSlots(j.data ?? []); }).catch(() => setSlots([]));
    return () => { off = true; };
  }, [q.kind, q.slug, sel.date, lang]);

  // When the activity date changes, keep the chosen time if it exists that day, else pick the first open slot and re-price.
  useEffect(() => {
    if (q.kind !== 'activity' || !slots || resume) return;
    if (sel.date === q.options.date && slots.some((s) => s.time === sel.time && s.available > 0)) return;
    const first = slots.find((s) => s.available > 0);
    if (first) change({ time: first.time });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [slots]);

  const applyCoupon = async () => {
    const code = coupon.trim().toUpperCase();
    if (!code) return;
    const r = await requote(sel, code);
    setCouponMsg(r.ok ? null : { ok: false, text: r.message });
  };
  const removeCoupon = async () => { setCoupon(''); setCouponMsg(null); const r = await requote(sel, ''); if (!r.ok) setErr(r.message); };

  const go = (n: number) => { setStep(n); setErr(''); top.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }); setTimeout(() => top.current?.querySelector<HTMLElement>('[data-step-panel] h2')?.focus(), 350); };

  const validateTravellers = () => {
    const e: Errs = {};
    if (!contact.first_name.trim()) e.first_name = L.required;
    if (!contact.last_name.trim()) e.last_name = L.required;
    if (!EMAIL.test(contact.email.trim())) e.email = L.email;
    if (!BD_MOBILE.test(contact.phone.replace(/[\s-]/g, ''))) e.phone = L.phone;
    if (contact.passport && !/^[A-Za-z0-9]{6,20}$/.test(contact.passport)) e.passport = L.passport;
    others.forEach((o, k) => { if (!o.name.trim()) e[`t${k}`] = L.required; });
    setErrs(e);
    if (Object.keys(e).length) { setTimeout(() => document.querySelector<HTMLElement>(`#ck-${Object.keys(e)[0]}`)?.focus(), 0); return false; }
    return true;
  };

  const active = q.plans.find((p) => p.code === plan) ?? q.plans[0];
  const dueNow = active?.now ?? q.total;

  const pay = async () => {
    const e: Errs = {};
    if (!gw) e.gw = L.required;
    if (gw === 'bank_transfer' && !slip.trim()) e.slip = L.required;
    if (!agree) e.agree = L.agreeError;
    setErrs(e);
    if (Object.keys(e).length) return;
    setBusy(true); setErr('');
    try {
      let ref = resume?.ref, key = resume?.key;
      if (!ref) {
        const phone = contact.phone.replace(/[\s-]/g, '');
        const r = await fetch(`/api/checkout/book?lang=${lang}`, { method: 'POST', headers: { 'Content-Type': 'application/json', Accept: 'application/json' }, body: JSON.stringify({
          ...sel, coupon: q.coupon?.code, plan, agree: true, notes: notes || undefined, website: '',
          contact: { first_name: contact.first_name.trim(), last_name: contact.last_name.trim(), email: contact.email.trim(), phone, passport: contact.passport || undefined, dob: contact.dob || undefined },
          travellers: others.map((o) => ({ name: o.name.trim(), relation: o.relation || undefined })),
        }) });
        const j = await r.json().catch(() => ({}));
        if (!r.ok) {
          if (r.status === 422 && j.errors) {
            const f = Object.keys(j.errors)[0];
            const m = (j.errors[f] as string[])[0];
            if (f.startsWith('contact.') || f.startsWith('travellers')) { setErrs({ [f.replace('contact.', '')]: m }); setStep(1); }
            else if (['date', 'time', 'room', 'cabin', 'adults', 'in', 'rooms'].includes(f)) { setStep(0); }
            setErr(m);
          } else setErr(j.message || L.genericError);
          return;
        }
        ref = j.data.ref; key = j.data.key;
        try { sessionStorage.setItem('musafir-last-booking', JSON.stringify({ ref, key })); } catch {}
      }
      const p = await fetch(`/api/bookings/${ref}/pay?lang=${lang}`, { method: 'POST', headers: { 'Content-Type': 'application/json', Accept: 'application/json' }, body: JSON.stringify({ key, gateway: gw, slip_ref: gw === 'bank_transfer' ? slip.trim() : undefined }) });
      const pj = await p.json().catch(() => ({}));
      if (!p.ok) { if (!resume) { location.assign(`/${lang}/booking?ref=${ref}&key=${key}&payment=failed`); return; } setErr(pj.message || L.genericError); return; }
      if (pj.data.redirect) { location.assign(pj.data.redirect); return; }
      location.assign(`/${lang}/booking-confirmed?ref=${ref}&key=${key}`);
    } catch { setErr(L.genericError); } finally { setBusy(false); }
  };

  const stepper = (key: 'adults' | 'children' | 'infants', label: string, sub: string, min: number, max: number) => {
    const v = Number(sel[key] ?? (key === 'adults' ? 1 : 0));
    return (
      <div className="flex items-center justify-between rounded-2xl border border-ink-100 p-3 dark:border-ink-800">
        <div><p className="text-sm font-semibold" id={`ck-${key}-l`}>{label}</p><p className="text-xs muted">{sub}</p></div>
        <div className="flex items-center gap-1.5">
          <button type="button" className="icon-btn h-8 w-8 border border-ink-200 dark:border-ink-700" disabled={busy || v <= min} aria-label={`${L.decrease} ${label}`} onClick={() => change({ [key]: v - 1 })}>{icons.minus}</button>
          <output className="w-7 text-center text-sm font-bold" aria-labelledby={`ck-${key}-l`} aria-live="polite">{d(v)}</output>
          <button type="button" className="icon-btn h-8 w-8 border border-ink-200 dark:border-ink-700" disabled={busy || v >= max} aria-label={`${L.increase} ${label}`} onClick={() => change({ [key]: v + 1 })}>{icons.plus}</button>
        </div>
      </div>
    );
  };

  const field = (k: keyof Contact, label: string, props: React.InputHTMLAttributes<HTMLInputElement> = {}) => (
    <div className={`field ${errs[k] ? 'is-invalid' : ''}`}>
      <label className="label" htmlFor={`ck-${k}`}>{label}</label>
      <input id={`ck-${k}`} className="input" value={contact[k]} aria-invalid={!!errs[k]} aria-describedby={errs[k] ? `ck-${k}-e` : undefined}
        onChange={(e) => { setContact((c) => ({ ...c, [k]: e.target.value })); if (errs[k]) setErrs((x) => ({ ...x, [k]: '' })); }} {...props} />
      <p className="field-error" id={`ck-${k}-e`}>{errs[k]}</p>
    </div>
  );

  const panel = (i: number, children: React.ReactNode) => (
    <section className="card p-5 sm:p-7" data-step-panel hidden={step !== i} aria-labelledby={`ck-h${i}`}>{children}</section>
  );
  const nav = (i: number, next: () => void, nextLabel = L.continue) => (
    <div className="mt-7 flex justify-between gap-3">
      {i > 0 ? <button type="button" className="btn btn-ghost" onClick={() => go(i - 1)}>{icons.left} {L.back}</button> : <span />}
      <button type="button" className="btn btn-primary" disabled={busy} onClick={next}>{nextLabel} {icons.right}</button>
    </div>
  );

  const ch = q.choices ?? {};
  const kindHas = (k: string) => q.kind === k;
  const planText: Record<string, [string, string]> = {
    deposit: [`${d(active?.code === 'deposit' ? active.pct ?? 30 : q.plans.find((p) => p.code === 'deposit')?.pct ?? 30)}% ${L.deposit}`, L.depositSub],
    full: [L.payFull, q.plans.find((p) => p.code === 'full')?.discount ? L.payFullSub : L.payFullPlain],
    instalments: [L.instalments, `${d(q.plans.find((p) => p.code === 'instalments')?.count ?? 3)} ${L.instalmentsSub}`],
  };

  return (
    <div className="wrap grid gap-8 py-8 lg:grid-cols-[1fr_380px]" ref={top}>
      <div className="min-w-0">
        <div className="mb-6">
          <div className="flex items-center justify-between text-sm font-semibold"><span>{L.step} {d(step + 1)}/{d(4)}</span><span className="muted flex items-center gap-1">{icons.lock} {L.ssl}</span></div>
          <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-ink-100 dark:bg-ink-800"><div className="h-full rounded-full bg-brand-600 transition-all duration-500" style={{ width: `${(step + 1) * 25}%` }} /></div>
          <ol className="mt-4 hidden grid-cols-4 gap-2 sm:grid" aria-label={L.stepsLabel}>
            {steps.map((s, k) => <li key={s} data-step-ind data-state={k < step ? 'done' : k === step ? 'current' : 'todo'} aria-current={k === step ? 'step' : undefined} className="flex items-center gap-2"><span className="step-dot grid h-8 w-8 shrink-0 place-items-center rounded-full border-2 border-ink-200 text-sm font-bold dark:border-ink-700">{k < step ? icons.check : d(k + 1)}</span><span className="text-sm font-semibold">{s}</span></li>)}
          </ol>
        </div>
        {resume ? <div role="alert" className="mb-5 flex gap-3 rounded-2xl border border-amber-300 bg-amber-50 p-4 text-sm text-amber-900 dark:border-amber-800 dark:bg-amber-950/40 dark:text-amber-200">{icons.info}<p>{resume.status === 'cancelled' ? L.payCancelled : L.payFailed} <b>{resume.ref}</b></p></div> : null}
        {err ? <div role="alert" className="mb-5 flex gap-3 rounded-2xl border border-rose-300 bg-rose-50 p-4 text-sm text-rose-800 dark:border-rose-900 dark:bg-rose-950/40 dark:text-rose-200">{icons.alert}<p>{err}</p></div> : null}

        {panel(0, <>
          <h2 id="ck-h0" tabIndex={-1} className="text-xl font-bold outline-none">{L.reviewTrip}</h2>
          <div className="mt-5 flex gap-4 rounded-2xl border border-ink-100 p-4 dark:border-ink-800">
            {q.image ? <img src={q.image.srcset?.[0]?.url ?? q.image.src} alt="" className="h-20 w-28 shrink-0 rounded-xl object-cover" width={640} height={400} /> : <span className="grid h-20 w-28 shrink-0 place-items-center rounded-xl bg-brand-50 text-brand-700 dark:bg-brand-900/40 dark:text-brand-300">{icons.plane}</span>}
            <div className="min-w-0"><p className="font-bold">{q.title}</p><p className="mt-1 text-sm muted">{q.subtitle}</p>{resume ? null : <a href={links.change} className="link mt-1 inline-block text-sm">{L.change}</a>}</div>
          </div>
          {resume ? null : <>
            {(kindHas('tour') || kindHas('cruise')) && ch.dates ? (
              <div className="mt-5 grid gap-4 sm:grid-cols-2">
                <div><label className="label" htmlFor="ck-date">{kindHas('cruise') ? L.sailing : L.travelDate}</label>
                  <select id="ck-date" className="input" value={String(sel.date ?? '')} disabled={busy} onChange={(e) => change({ date: e.target.value })}>{ch.dates.map((x) => <option key={x.date} value={x.date}>{fmtD(x.date)} — ৳ {x.price.toLocaleString('en-IN')}{x.seats_left <= 6 ? ` · ${d(x.seats_left)} ${L.seatsLeft}` : ''}</option>)}</select></div>
                {kindHas('tour') && ch.rooms?.length ? <div><label className="label" htmlFor="ck-room">{L.room}</label><select id="ck-room" className="input" value={String(sel.room ?? ch.rooms[0].code)} disabled={busy} onChange={(e) => change({ room: e.target.value })}>{ch.rooms.map((r) => <option key={r.code} value={r.code}>{r.label}</option>)}</select></div> : null}
                {kindHas('cruise') && ch.cabins?.length ? <div><label className="label" htmlFor="ck-cabin">{L.cabin}</label><select id="ck-cabin" className="input" value={String(sel.cabin ?? q.options.cabin)} disabled={busy} onChange={(e) => change({ cabin: e.target.value })}>{ch.cabins.map((r) => <option key={r.code} value={r.code}>{r.label}</option>)}</select></div> : null}
              </div>) : null}
            {kindHas('activity') ? (
              <div className="mt-5 grid gap-4 sm:grid-cols-2">
                <div><label className="label" htmlFor="ck-adate">{L.travelDate}</label><input id="ck-adate" type="date" className="input" value={String(sel.date ?? '')} min={minDate} onChange={(e) => e.target.value && setSel((s) => ({ ...s, date: e.target.value }))} /></div>
                <div><label className="label" htmlFor="ck-time">{L.time}</label><select id="ck-time" className="input" value={String(sel.time ?? '')} disabled={busy || !slots} onChange={(e) => change({ time: e.target.value })}>
                  {!slots?.length ? <option value="">{slots ? L.noSlots : '…'}</option> : null}
                  {slots?.map((s) => <option key={s.time} value={s.time} disabled={s.available <= 0}>{d(s.time)}{s.available <= 0 ? ` — ${L.soldOut}` : s.available <= 5 ? ` — ${d(s.available)} ${L.left}` : ''}</option>)}</select></div>
                {ch.options?.length ? <div className="sm:col-span-2"><label className="label" htmlFor="ck-opt">{L.option}</label><select id="ck-opt" className="input" value={String(sel.option ?? '')} onChange={(e) => change({ option: e.target.value ? Number(e.target.value) : undefined })}><option value="">{L.standard}</option>{ch.options.map((o) => <option key={o.id} value={o.id}>{o.label}</option>)}</select></div> : null}
              </div>) : null}
            {kindHas('hotel') ? (
              <div className="mt-5 grid gap-4 sm:grid-cols-2">
                <div><label className="label" htmlFor="ck-in">{L.checkIn}</label><input id="ck-in" type="date" className="input" value={String(sel.in ?? '')} onChange={(e) => e.target.value && change({ in: e.target.value })} /></div>
                <div><label className="label" htmlFor="ck-out">{L.checkOut}</label><input id="ck-out" type="date" className="input" value={String(sel.out ?? '')} min={String(sel.in ?? '')} onChange={(e) => e.target.value && change({ out: e.target.value })} /></div>
                {ch.rooms?.length ? <div><label className="label" htmlFor="ck-hroom">{L.room}</label><select id="ck-hroom" className="input" value={String(sel.room ?? q.options.room)} onChange={(e) => change({ room: e.target.value })}>{ch.rooms.map((r) => <option key={r.id} value={r.id}>{r.label}</option>)}</select></div> : null}
                <div><label className="label" htmlFor="ck-rooms">{L.rooms}</label><select id="ck-rooms" className="input" value={String(sel.rooms ?? q.options.rooms ?? 1)} onChange={(e) => change({ rooms: Number(e.target.value) })}>{[1, 2, 3, 4, 5].map((n) => <option key={n} value={n}>{d(n)}</option>)}</select></div>
              </div>) : null}
            {kindHas('tour') || kindHas('activity') ? (
              <div className="mt-4 grid gap-3 sm:grid-cols-3">
                {stepper('adults', L.adults, kindHas('tour') ? '12+' : L.adultSub, 1, ch.max ?? 9)}
                {stepper('children', L.children, kindHas('tour') ? '2–11' : L.childSub, 0, ch.max ?? 9)}
                {kindHas('tour') ? stepper('infants', L.infants, '0–2', 0, Math.min(4, Number(sel.adults ?? 1))) : null}
              </div>) : null}
            {kindHas('cruise') || kindHas('visa') ? <div className="mt-4 grid gap-3 sm:grid-cols-3">{stepper('adults', kindHas('visa') ? L.applicants : L.guests, '', 1, ch.max ?? 8)}</div> : null}
          </>}
          {nav(0, () => go(1))}
        </>)}

        {panel(1, <>
          <h2 id="ck-h1" tabIndex={-1} className="text-xl font-bold outline-none">{L.travellerDetails}</h2>
          <p className="mt-1 text-sm muted">{L.namesMatch} {user ? null : <a className="link" href={links.login}>{L.signInAutofill}</a>}</p>
          <h3 className="mt-6 text-sm font-bold uppercase tracking-wide text-brand-700 dark:text-brand-300">{L.leadTraveller}</h3>
          <div className="mt-3 grid gap-4 sm:grid-cols-2">
            {field('first_name', `${L.firstName} *`, { autoComplete: 'given-name', required: true })}
            {field('last_name', `${L.lastName} *`, { autoComplete: 'family-name', required: true })}
            {field('email', `${L.emailLabel} *`, { type: 'email', autoComplete: 'email', required: true })}
            {field('phone', `${L.mobile} *`, { type: 'tel', autoComplete: 'tel', placeholder: '01XXXXXXXXX', required: true, inputMode: 'tel' })}
            {q.kind !== 'gift_card' ? field('passport', q.needs_passport ? L.passportIntl : L.passportOpt, { className: 'input uppercase', placeholder: 'A01234567' }) : null}
            {q.kind !== 'gift_card' ? field('dob', L.dob, { type: 'date', max: new Date().toISOString().slice(0, 10) }) : null}
          </div>
          {others.map((o, k) => (
            <div key={k}>
              <h3 className="mt-6 text-sm font-bold uppercase tracking-wide text-brand-700 dark:text-brand-300">{L.traveller} {d(k + 2)}</h3>
              <div className="mt-3 grid gap-4 sm:grid-cols-2">
                <div className={`field ${errs[`t${k}`] ? 'is-invalid' : ''}`}><label className="label" htmlFor={`ck-t${k}`}>{L.fullName} *</label><input id={`ck-t${k}`} className="input" value={o.name} aria-invalid={!!errs[`t${k}`]} onChange={(e) => setOthers((x) => x.map((y, j) => (j === k ? { ...y, name: e.target.value } : y)))} /><p className="field-error">{errs[`t${k}`]}</p></div>
                <div><label className="label" htmlFor={`ck-t${k}r`}>{L.relation}</label><select id={`ck-t${k}r`} className="input" value={o.relation} onChange={(e) => setOthers((x) => x.map((y, j) => (j === k ? { ...y, relation: e.target.value } : y)))}><option value="">—</option>{L.relations.split('|').map((r) => <option key={r} value={r}>{r}</option>)}</select></div>
              </div>
            </div>
          ))}
          <div className="field mt-4"><label className="label" htmlFor="ck-req">{L.specialRequests}</label><textarea id="ck-req" rows={3} maxLength={1000} className="input" placeholder={L.requestsPh} value={notes} onChange={(e) => setNotes(e.target.value)} /></div>
          {nav(1, () => validateTravellers() && go(2))}
        </>)}

        {panel(2, <>
          <h2 id="ck-h2" tabIndex={-1} className="text-xl font-bold outline-none">{L.makeBetter}</h2>
          {q.addons.length ? (
            <div className="mt-5 grid gap-3 sm:grid-cols-2">
              {q.addons.map((a) => {
                const on = ((sel.addons as string[]) ?? []).includes(a.code);
                return (
                  <label key={a.code} className="flex cursor-pointer gap-3 rounded-2xl border border-ink-200 p-4 has-[:checked]:border-brand-600 has-[:checked]:bg-brand-50/60 dark:border-ink-700 dark:has-[:checked]:bg-brand-900/20">
                    <input type="checkbox" className="check mt-1" checked={on} disabled={busy || !!resume} onChange={() => change({ addons: on ? ((sel.addons as string[]) ?? []).filter((x) => x !== a.code) : [...((sel.addons as string[]) ?? []), a.code] })} />
                    <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-brand-50 text-brand-700 dark:bg-brand-900/40 dark:text-brand-300">{icons[`addon-${a.code}`] ?? icons.sparkles}</span>
                    <span className="flex-1"><b className="block text-sm">{a.label}</b><span className="text-xs muted">{L[`addonSub_${a.code}`] ?? (a.per === 'person' ? L.perPerson : L.perBooking)}</span></span>
                    <b className="text-sm">+<Price value={a.price} /></b>
                  </label>
                );
              })}
            </div>) : <p className="mt-3 text-sm muted">{L.noExtras}</p>}
          {resume ? null : (
            <div className="mt-6">
              <label className="label" htmlFor="ck-coupon">{L.promo}</label>
              {q.coupon ? (
                <p className="flex flex-wrap items-center gap-2 text-sm"><span className="badge bg-emerald-50 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300">{q.coupon.code}</span> {q.coupon.label} · −<Price value={q.coupon.discount} /> <button type="button" className="link" onClick={removeCoupon}>{L.remove}</button></p>
              ) : (
                <div className="flex max-w-sm gap-2"><input id="ck-coupon" className="input uppercase" placeholder="MUSAFIR10" value={coupon} maxLength={32} aria-describedby="ck-coupon-m" onChange={(e) => setCoupon(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), applyCoupon())} /><button type="button" className="btn btn-outline" disabled={busy || !coupon.trim()} onClick={applyCoupon}>{L.apply}</button></div>
              )}
              <p id="ck-coupon-m" className={`mt-1 text-xs ${couponMsg && !couponMsg.ok ? 'text-rose-600 dark:text-rose-400' : 'muted'}`} aria-live="polite">{couponMsg && !couponMsg.ok ? couponMsg.text : q.coupon ? '' : <>{L.try} <code className="rounded bg-ink-100 px-1 dark:bg-ink-800">MUSAFIR10</code></>}</p>
            </div>)}
          {nav(2, () => go(3), L.toPayment)}
        </>)}

        {panel(3, <>
          <h2 id="ck-h3" tabIndex={-1} className="text-xl font-bold outline-none">{L.payment}</h2>
          {resume ? null : (
            <fieldset className="mt-5"><legend className="label">{L.howMuch}</legend>
              <div className={`grid gap-3 ${q.plans.length === 3 ? 'sm:grid-cols-3' : q.plans.length === 2 ? 'sm:grid-cols-2' : ''}`}>
                {q.plans.map((p) => (
                  <label key={p.code} className="cursor-pointer rounded-2xl border border-ink-200 p-4 has-[:checked]:border-brand-600 has-[:checked]:bg-brand-50/60 dark:border-ink-700 dark:has-[:checked]:bg-brand-900/20">
                    <input type="radio" name="plan" value={p.code} className="check rounded-full" checked={plan === p.code} onChange={() => setPlan(p.code)} /> <b className="ms-1 text-sm">{planText[p.code][0]}</b>
                    <span className="mt-1 block text-xs muted">{planText[p.code][1]}</span>
                    <span className="mt-2 block text-sm font-bold"><Price value={p.now} /> {L.now}</span>
                  </label>
                ))}
              </div>
              {active?.schedule.length ? <ul className="mt-3 space-y-1 text-xs muted">{active.schedule.map((s) => <li key={s.seq} className="flex justify-between"><span>{d(s.seq)}. {s.seq === 1 ? L.today : fmtD(s.due_date)}</span><span><Price value={s.amount} /></span></li>)}</ul> : null}
            </fieldset>)}
          <fieldset className="mt-5"><legend className="label">{L.method}</legend>
            {errs.gw ? <p className="field-error block">{errs.gw}</p> : null}
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              {q.gateways.map((g) => (
                <label key={g} className="relative flex cursor-pointer flex-col gap-2 rounded-2xl border border-ink-200 p-4 transition has-[:checked]:border-brand-600 has-[:checked]:bg-brand-50/60 has-[:checked]:ring-2 has-[:checked]:ring-brand-600/20 has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-brand-500 dark:border-ink-700 dark:has-[:checked]:bg-brand-900/20">
                  <input type="radio" name="ck-method" value={g} className="sr-only" checked={gw === g} onChange={() => setGw(g)} />
                  <span className="flex h-6 items-center">{GW[g]?.badge}</span><span className="text-sm font-bold">{L[`gw_${g}`] ?? g}</span><span className="text-xs muted">{L[`gwSub_${GW[g]?.sub}`]}</span>
                </label>
              ))}
            </div>
          </fieldset>
          <div className="mt-5 rounded-2xl bg-ink-50 p-5 text-sm dark:bg-ink-850">
            {gw === 'bank_transfer' ? (<>
              <dl className="grid gap-2 sm:grid-cols-2">{(L.bankRows ? JSON.parse(L.bankRows) as [string, string][] : []).map(([k, v]) => <div key={k}><dt className="muted">{k}</dt><dd className="font-semibold">{v}</dd></div>)}</dl>
              <div className={`field mt-3 max-w-xs ${errs.slip ? 'is-invalid' : ''}`}><label className="label" htmlFor="ck-slip">{L.slip} *</label><input id="ck-slip" className="input" maxLength={64} value={slip} aria-invalid={!!errs.slip} onChange={(e) => setSlip(e.target.value)} /><p className="field-error">{errs.slip}</p></div>
              <p className="mt-2 text-xs muted">{L.bankNote}</p>
            </>) : <p>{L[`gwInfo_${gw}`] ?? L.gwInfo_default}</p>}
            {q.payment_mode !== 'live' ? <p className="mt-3 flex items-center gap-2 text-xs text-amber-700 dark:text-amber-300">{icons.info} {L.sandbox}</p> : null}
          </div>
          <div className={`mt-5 ${errs.agree ? 'is-invalid' : ''}`}>
            <label className="flex gap-3 text-sm"><input type="checkbox" className="check mt-0.5" checked={agree} aria-invalid={!!errs.agree} onChange={(e) => setAgree(e.target.checked)} /> <span>{L.agree1} <a className="link" href={links.terms} target="_blank" rel="noopener">{L.terms}</a> {L.and} <a className="link" href={links.refund} target="_blank" rel="noopener">{L.policy}</a>{L.agree2}</span></label>
            <p className="field-error">{errs.agree}</p>
          </div>
          <div className="mt-7 flex flex-col-reverse justify-between gap-3 sm:flex-row">
            {resume ? <span /> : <button type="button" className="btn btn-ghost" onClick={() => go(2)}>{icons.left} {L.back}</button>}
            <button type="button" data-ck-pay className="btn btn-accent btn-lg" disabled={busy} onClick={pay} aria-busy={busy}>{icons.lock} {busy ? L.processing : <>{L.paySecurely} <Price value={dueNow} /></>}</button>
          </div>
        </>)}
      </div>

      <aside className="lg:sticky lg:top-24 lg:self-start" aria-label={L.summary}>
        <div className="card overflow-hidden">
          {q.image ? <img src={q.image.srcset?.[1]?.url ?? q.image.src} alt="" className="aspect-[16/8] w-full object-cover" width={640} height={320} /> : null}
          <div className="p-5"><p className="font-bold">{q.title}</p><p className="text-sm muted">{q.subtitle}</p>
            {q.travel_start ? <p className="mt-2 flex items-center gap-2 text-sm">{icons.calendar} {fmtD(q.travel_start)}{q.travel_end && q.travel_end !== q.travel_start ? ` – ${fmtD(q.travel_end)}` : ''}</p> : null}
            <dl className="mt-4 space-y-2 border-t border-ink-100 pt-4 text-sm dark:border-ink-800" aria-live="polite" aria-busy={busy}>
              {q.lines.map((l) => <div key={l.code} className="flex justify-between gap-3"><dt className="muted">{l.label}{l.qty > 1 ? ` × ${d(l.qty)}` : ''}</dt><dd className="shrink-0"><Price value={l.total} /></dd></div>)}
              {q.coupon ? <div className="flex justify-between text-emerald-700 dark:text-emerald-400"><dt>{L.promo} {q.coupon.code}</dt><dd>−<Price value={q.coupon.discount} /></dd></div> : null}
              {active?.discount ? <div className="flex justify-between text-emerald-700 dark:text-emerald-400"><dt>{L.fullDiscount}</dt><dd>−<Price value={active.discount} /></dd></div> : null}
              <div className="flex justify-between"><dt className="muted">{L.vat}</dt><dd>{L.included}</dd></div>
              <div className="flex justify-between border-t border-ink-100 pt-3 text-base dark:border-ink-800"><dt className="font-bold">{L.total}</dt><dd className="text-xl font-extrabold" data-ck-total><Price value={active?.total ?? q.total} /></dd></div>
              <div className="flex justify-between"><dt className="muted">{L.dueNow}{active?.code === 'deposit' ? ` (${d(active.pct ?? 30)}%)` : ''}</dt><dd className="font-bold text-brand-700 dark:text-brand-300" data-ck-due><Price value={dueNow} /></dd></div>
            </dl></div>
          <ul className="space-y-2 border-t border-ink-100 bg-ink-50/60 p-5 text-xs dark:border-ink-800 dark:bg-ink-850">
            <li className="flex items-center gap-2">{icons.shield} {L.licensed}</li>
            {q.cancellation ? <li className="flex items-center gap-2">{icons.calendarCheck} {q.cancellation.label}</li> : null}
            <li className="flex items-center gap-2">{icons.headset} {L.support}</li>
          </ul>
        </div>
      </aside>
    </div>
  );
}
