'use client';
import { useEffect, useMemo, useRef, useState } from 'react';
import { Price } from '@/components/client/Price';
import { useSite } from '@/components/client/SiteContext';
import { KEYS, toast } from '@/components/client/store';
import { digits } from '@/lib/format';
import type { Image } from '@/lib/types';

type Dest = { slug: string; name: string; region: string; image?: Image; land: number; air: number; default_days: number };
type Act = { slug: string; title: string; city: string; price: number; destination?: string | null; image?: Image };
type Tier = { key: string; mult: number; label: string; description: string };
type Rules = { max_destinations: number; min_days: number; max_days: number; child_factor: number; leg_cost: number; round_to: number };
export type PlannerConfig = { destinations: Dest[]; activities: Act[]; tiers: Tier[]; rules: Rules };
type Saved = { order: string[]; days: Record<string, number>; adults?: string; kids?: string; start?: string; tier?: string; acts?: string[] };

const thumb = (img?: Image) => img?.srcset?.[0]?.url ?? img?.src ?? '';
const L_KEYS = ['step1', 'step1sub', 'step2', 'step3', 'step4', 'step4sub', 'from', 'day', 'days', 'places', 'person', 'none', 'max', 'less', 'more', 'arrive', 'explore', 'fly', 'start', 'adults', 'children', 'tierLegend', 'yourTrip', 'air', 'land', 'acts', 'total', 'pp', 'quote', 'save', 'saved', 'disclaimer', 'dlgTitle', 'close', 'name', 'mobile', 'email', 'note', 'notePh', 'send', 'sent', 'required', 'phoneBad', 'emailBad', 'failed'] as const;
export type PlannerLabels = Record<(typeof L_KEYS)[number], string>;

/** Interactive trip planner: pick places & days, live estimate (same formula as PlannerController::compute), quote request. */
export function TripPlanner({ cfg, l, today, defaultStart, icons, interests }: {
  cfg: PlannerConfig; l: PlannerLabels; today: string; defaultStart: string; interests: React.ReactNode;
  icons: { check: React.ReactNode; send: React.ReactNode; bookmark: React.ReactNode; x: React.ReactNode };
}) {
  const { lang, msg } = useSite();
  const d = (n: number | string) => digits(String(n), lang);
  const R = cfg.rules;
  const dest = useMemo(() => Object.fromEntries(cfg.destinations.map((x) => [x.slug, x])), [cfg.destinations]);
  const [order, setOrder] = useState<string[]>([]);
  const [days, setDays] = useState<Record<string, number>>({});
  const [adults, setAdults] = useState('2');
  const [kids, setKids] = useState('0');
  const [start, setStart] = useState(defaultStart);
  const [tier, setTier] = useState(cfg.tiers.find((t) => t.mult === 1)?.key ?? cfg.tiers[0]?.key ?? 'comfort');
  const [acts, setActs] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<Record<string, string>>({});
  const dlg = useRef<HTMLDialogElement>(null);

  // restore a saved plan, or a ?dest= preset from destination pages
  useEffect(() => {
    let saved: Saved | null = null;
    try { saved = JSON.parse(localStorage.getItem(KEYS.plan) || 'null'); } catch {}
    const pre = new URLSearchParams(location.search).get('dest');
    if (pre && dest[pre]) saved = { order: [pre], days: {} };
    if (!saved?.order) return;
    const o = saved.order.filter((s) => dest[s]).slice(0, R.max_destinations);
    setOrder(o);
    setDays(Object.fromEntries(o.map((s) => [s, saved!.days?.[s] ?? dest[s].default_days])));
    if (saved.adults) setAdults(saved.adults);
    if (saved.kids) setKids(saved.kids);
    if (saved.start && saved.start >= today) setStart(saved.start);
    if (saved.tier && cfg.tiers.some((t) => t.key === saved!.tier)) setTier(saved.tier);
    if (saved.acts) setActs(saved.acts);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const visibleActs = cfg.activities.filter((a) => !a.destination || order.includes(a.destination));
  const est = useMemo(() => {
    const ad = +adults, kd = +kids, pax = ad + kd * R.child_factor, heads = ad + kd;
    const mult = cfg.tiers.find((t) => t.key === tier)?.mult ?? 1;
    let land = 0, maxAir = 0, td = 0;
    for (const s of order) { land += dest[s].land * days[s] * mult * pax; maxAir = Math.max(maxAir, dest[s].air); td += days[s]; }
    const air = order.length ? (maxAir + (order.length - 1) * R.leg_cost) * pax : 0;
    const r = (x: number) => Math.round(x / R.round_to) * R.round_to;
    const a = visibleActs.filter((x) => acts.includes(x.slug)).reduce((n, x) => n + x.price * heads, 0);
    const total = r(land) + r(air) + a;
    return { land: r(land), air: r(air), acts: a, total, pp: heads ? Math.round(total / heads) : 0, days: td };
  }, [adults, kids, tier, order, days, acts, visibleActs, dest, cfg.tiers, R]);

  const toggleDest = (s: string, on: boolean) => {
    if (on) {
      if (order.length >= R.max_destinations) { toast(l.max, 'error'); return; }
      setOrder([...order, s]);
      setDays({ ...days, [s]: days[s] ?? dest[s].default_days });
    } else setOrder(order.filter((x) => x !== s));
  };
  const bump = (s: string, dv: number) => setDays({ ...days, [s]: Math.min(R.max_days, Math.max(R.min_days, days[s] + dv)) });
  const snapshot = (): Saved => ({ order, days, adults, kids, start, tier, acts });
  const save = () => { try { localStorage.setItem(KEYS.plan, JSON.stringify(snapshot())); } catch {} toast(l.saved); };

  const fmt = (dt: Date) => { try { return dt.toLocaleDateString(lang === 'bn' ? 'bn-BD' : 'en-GB', { day: 'numeric', month: 'short', weekday: 'short', timeZone: 'UTC' }); } catch { return dt.toDateString(); } };
  const timeline: { n: number; date: Date; text: string }[] = [];
  if (order.length) {
    const st = new Date(`${start || defaultStart}T00:00:00Z`);
    let n = 0;
    for (const s of order) for (let k = 0; k < days[s]; k++) { timeline.push({ n: n + 1, date: new Date(st.getTime() + n * 864e5), text: `${dest[s].name} — ${k === 0 ? l.arrive : l.explore}` }); n++; }
    timeline.push({ n: n + 1, date: new Date(st.getTime() + n * 864e5), text: l.fly });
  }

  const submit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    const name = String(f.get('name') ?? '').trim(), phone = String(f.get('phone') ?? '').replace(/[\s-]/g, ''), email = String(f.get('email') ?? '').trim();
    const er: Record<string, string> = {};
    if (!name) er.name = l.required;
    if (!phone) er.phone = l.required; else if (!/^(?:\+?880|0)1[3-9]\d{8}$/.test(phone)) er.phone = l.phoneBad;
    if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email)) er.email = l.emailBad;
    setErr(er);
    if (Object.keys(er).length) { e.currentTarget.querySelector<HTMLElement>(`[name="${Object.keys(er)[0]}"]`)?.focus(); return; }
    const interestsPicked = [...document.querySelectorAll<HTMLInputElement>('input[name="pint"]:checked')].map((x) => x.value);
    setBusy(true);
    try {
      const r = await fetch(`/api/planner/quote?lang=${lang}`, { method: 'POST', headers: { 'Content-Type': 'application/json', Accept: 'application/json' }, body: JSON.stringify({
        stops: order.map((s) => ({ slug: s, days: days[s] })), adults: +adults, children: +kids, tier, start, activities: visibleActs.filter((x) => acts.includes(x.slug)).map((x) => x.slug),
        interests: interestsPicked, name, phone, email: email || null, note: String(f.get('note') ?? '') || null, website: String(f.get('website') ?? ''),
      }) });
      const j = await r.json().catch(() => ({}));
      if (r.ok) {
        try { localStorage.setItem(KEYS.plan, JSON.stringify(snapshot())); } catch {}
        dlg.current?.close(); (e.target as HTMLFormElement).reset();
        toast(`${l.sent} ${d(j.data?.reference ?? '')}`);
      } else if (r.status === 422 && j.errors) {
        setErr(Object.fromEntries(Object.entries(j.errors).map(([k, v]) => [k, (v as string[])[0]])));
      } else toast(l.failed, 'error');
    } catch { toast(l.failed, 'error'); }
    setBusy(false);
  };

  const H = ({ n, id, children }: { n: number; id: string; children: React.ReactNode }) => (
    <h2 id={id} className="flex items-center gap-3 text-xl font-bold"><span className="grid h-8 w-8 place-items-center rounded-full bg-brand-700 text-sm text-white">{d(n)}</span>{children}</h2>
  );
  const none = <p className="rounded-2xl border border-dashed border-ink-200 p-5 text-center text-sm muted dark:border-ink-700">{l.none}</p>;
  const field = (name: string, label: string, input: React.ReactNode) => (
    <div className={`field ${err[name] ? 'is-invalid' : ''}`}><label className="label" htmlFor={`q-${name}`}>{label}</label>{input}<p className="field-error" id={`q-${name}-err`}>{err[name] ?? l.required}</p></div>
  );
  const inputProps = (name: string) => ({ id: `q-${name}`, name, className: 'input', 'aria-invalid': !!err[name] || undefined, 'aria-describedby': err[name] ? `q-${name}-err` : undefined });

  return (
    <div className="wrap grid gap-8 py-10 lg:grid-cols-[1fr_400px]">
      <div className="min-w-0 space-y-10">
        <section aria-labelledby="p1"><H n={1} id="p1">{l.step1}</H>
          <p className="mt-1 text-sm muted">{l.step1sub}</p>
          <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-4">{cfg.destinations.map((x) => (
            <label key={x.slug} className="group relative cursor-pointer overflow-hidden rounded-2xl ring-2 ring-transparent has-[:checked]:ring-brand-600">
              <input type="checkbox" className="peer sr-only" name="pdest" value={x.slug} checked={order.includes(x.slug)} onChange={(e) => toggleDest(x.slug, e.target.checked)} />
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={thumb(x.image)} alt="" className="aspect-[4/3] w-full object-cover" loading="lazy" width={320} height={240} />
              <span className="absolute inset-0 bg-gradient-to-t from-ink-950/85 to-transparent" />
              <span className="absolute right-2 top-2 grid h-7 w-7 place-items-center rounded-full bg-white/90 text-transparent peer-checked:bg-brand-600 peer-checked:text-white">{icons.check}</span>
              <span className="absolute inset-x-0 bottom-0 p-3 text-white"><span className="block text-sm font-bold leading-tight">{x.name}</span><span className="text-xs text-white/80">{l.from} <Price value={x.land} />/{l.day}</span></span>
              <span className="absolute inset-0 rounded-2xl peer-focus-visible:ring-4 peer-focus-visible:ring-accent-400" />
            </label>
          ))}</div>
        </section>
        <section aria-labelledby="p2"><H n={2} id="p2">{l.step2}</H>
          <div className="mt-4 space-y-3">{order.length ? order.map((s, k) => (
            <div key={s} className="flex items-center gap-3 rounded-2xl border border-ink-100 p-3 dark:border-ink-800">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={thumb(dest[s].image)} alt="" className="h-12 w-12 rounded-xl object-cover" width={48} height={48} />
              <div className="min-w-0 flex-1"><p className="truncate font-semibold">{d(k + 1)}. {dest[s].name}</p><p className="text-xs muted"><Price value={dest[s].land} /> / {l.day}</p></div>
              <div className="flex items-center gap-2">
                <button type="button" className="icon-btn h-8 w-8 border border-ink-200 dark:border-ink-700" onClick={() => bump(s, -1)} disabled={days[s] <= R.min_days} aria-label={`${l.less} — ${dest[s].name}`}>−</button>
                <b className="w-14 text-center text-sm" aria-live="polite">{d(days[s])} {l.days}</b>
                <button type="button" className="icon-btn h-8 w-8 border border-ink-200 dark:border-ink-700" onClick={() => bump(s, 1)} disabled={days[s] >= R.max_days} aria-label={`${l.more} — ${dest[s].name}`}>+</button>
              </div>
            </div>
          )) : none}</div>
        </section>
        <section aria-labelledby="p3"><H n={3} id="p3">{l.step3}</H>
          <div className="mt-4 grid gap-4 sm:grid-cols-3">
            <div><label className="label" htmlFor="pstart">{l.start}</label><input id="pstart" type="date" className="input" value={start} min={today} onChange={(e) => setStart(e.target.value)} /></div>
            <div><label className="label" htmlFor="padults">{l.adults}</label><select id="padults" className="input" value={adults} onChange={(e) => setAdults(e.target.value)}>{Array.from({ length: 10 }, (_, k) => <option key={k} value={k + 1}>{d(k + 1)}</option>)}</select></div>
            <div><label className="label" htmlFor="pkids">{l.children}</label><select id="pkids" className="input" value={kids} onChange={(e) => setKids(e.target.value)}>{Array.from({ length: 7 }, (_, k) => <option key={k} value={k}>{d(k)}</option>)}</select></div>
          </div>
          <fieldset className="mt-5"><legend className="label">{l.tierLegend}</legend><div className="grid gap-3 sm:grid-cols-3">{cfg.tiers.map((t) => (
            <label key={t.key} className="cursor-pointer"><input type="radio" name="ptier" value={t.key} className="peer sr-only" checked={tier === t.key} onChange={() => setTier(t.key)} /><span className="block h-full rounded-2xl border border-ink-200 p-4 peer-checked:border-brand-600 peer-checked:bg-brand-50 peer-focus-visible:ring-2 peer-focus-visible:ring-brand-400 dark:border-ink-700 dark:peer-checked:bg-brand-900/30"><b className="block">{t.label}</b><span className="text-xs muted">{t.description}</span></span></label>
          ))}</div></fieldset>
          {interests}
        </section>
        <section aria-labelledby="p4"><H n={4} id="p4">{l.step4}</H>
          <p className="mt-1 text-sm muted">{l.step4sub}</p>
          <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">{visibleActs.map((a) => (
            <label key={a.slug} className="flex min-w-0 cursor-pointer items-center gap-3 rounded-2xl border border-ink-100 p-3 has-[:checked]:border-brand-600 has-[:checked]:bg-brand-50 dark:border-ink-800 dark:has-[:checked]:bg-brand-900/30">
              <input type="checkbox" className="check" value={a.slug} checked={acts.includes(a.slug)} onChange={(e) => setActs(e.target.checked ? [...acts, a.slug] : acts.filter((x) => x !== a.slug))} />
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={thumb(a.image)} alt="" className="h-14 w-14 shrink-0 rounded-xl object-cover" loading="lazy" width={56} height={56} />
              <span className="min-w-0 flex-1"><span className="block truncate text-sm font-semibold">{a.title}</span><span className="text-xs muted">{a.city} · <Price value={a.price} />/{l.person}</span></span>
            </label>
          ))}</div>
        </section>
      </div>
      <aside className="lg:sticky lg:top-24 lg:self-start">
        <div className="card overflow-hidden">
          <div className="bg-gradient-to-br from-brand-800 to-brand-600 p-5 text-white"><p className="text-sm text-brand-100">{l.yourTrip}</p><p className="text-2xl font-extrabold">{d(est.days)} {l.days} · {d(order.length)} {l.places}</p></div>
          <ol className="max-h-72 space-y-2 overflow-y-auto p-5 text-sm" aria-live="polite">{timeline.length ? timeline.map((r) => (
            <li key={r.n} className="flex gap-3"><span className="w-16 shrink-0 text-xs font-bold text-brand-700 dark:text-brand-300">{l.day} {d(r.n)}<br /><span className="font-normal muted">{fmt(r.date)}</span></span><span>{r.text}</span></li>
          )) : <li className="muted">{l.none}</li>}</ol>
          <dl className="space-y-2 border-t border-ink-100 p-5 text-sm dark:border-ink-800">
            <div className="flex justify-between"><dt className="muted">{l.air}</dt><dd><Price value={est.air} /></dd></div>
            <div className="flex justify-between"><dt className="muted">{l.land}</dt><dd><Price value={est.land} /></dd></div>
            <div className="flex justify-between"><dt className="muted">{l.acts}</dt><dd><Price value={est.acts} /></dd></div>
            <div className="flex items-center justify-between border-t border-ink-100 pt-3 dark:border-ink-800"><dt className="font-bold">{l.total}</dt><dd className="text-2xl font-extrabold"><Price value={est.total} /></dd></div>
            <div className="flex justify-between text-xs muted"><dt>{l.pp}</dt><dd><Price value={est.pp} /></dd></div>
          </dl>
          <div className="space-y-2 p-5 pt-0">
            <button type="button" className="btn btn-accent btn-lg w-full" disabled={!order.length} onClick={() => { setErr({}); dlg.current?.showModal(); }}>{icons.send} {l.quote}</button>
            <button type="button" className="btn btn-outline w-full" onClick={save}>{icons.bookmark} {l.save}</button>
            <p className="text-center text-xs muted">{l.disclaimer}</p>
          </div>
        </div>
      </aside>
      <dialog ref={dlg} className="w-[min(100%-2rem,32rem)] rounded-3xl bg-white p-0 text-ink-900 shadow-2xl backdrop:bg-ink-950/60 dark:bg-ink-900 dark:text-ink-100" aria-labelledby="qd-t">
        <form className="space-y-4 p-6" noValidate onSubmit={submit}>
          <input type="text" name="website" tabIndex={-1} autoComplete="off" className="hidden" aria-hidden="true" />
          <div className="flex items-center justify-between"><h2 id="qd-t" className="text-xl font-bold">{l.dlgTitle}</h2><button type="button" className="icon-btn" onClick={() => dlg.current?.close()} aria-label={l.close}>{icons.x}</button></div>
          {field('name', `${l.name} *`, <input {...inputProps('name')} required autoComplete="name" maxLength={120} />)}
          <div className="grid gap-4 sm:grid-cols-2">
            {field('phone', `${l.mobile} *`, <input {...inputProps('phone')} type="tel" inputMode="tel" required autoComplete="tel" placeholder="01XXXXXXXXX" maxLength={20} />)}
            {field('email', l.email, <input {...inputProps('email')} type="email" autoComplete="email" maxLength={190} />)}
          </div>
          {field('note', l.note, <textarea {...inputProps('note')} rows={3} maxLength={2000} placeholder={l.notePh} />)}
          <button className="btn btn-primary btn-lg w-full" disabled={busy} aria-busy={busy}>{l.send}</button>
          <p className="text-center text-[11px] muted">{msg.privacy}</p>
        </form>
      </dialog>
    </div>
  );
}
