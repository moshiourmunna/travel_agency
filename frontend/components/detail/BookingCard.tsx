'use client';
import { useMemo, useState } from 'react';
import { useSite } from '@/components/client/SiteContext';
import { Price } from '@/components/client/Price';

type Dep = { id: number; date: string; price: number; seats_left: number; status: string };
type Tier = { code: string; label: string; factor: number };
type Addon = { code: string; label: string; price: number; per: string };
export type BookingLabels = Record<'from' | 'save' | 'date' | 'room' | 'adults' | 'adultsSub' | 'children' | 'childrenSub' | 'infants' | 'infantsSub' | 'decrease' | 'increase' | 'addons' | 'total' | 'payNow' | 'book' | 'ask' | 'instalments' | 'soldOut' | 'noDates', string>;

/**
 * Live price calculator (mockup partials/booking_card.html): departure × room factor × pax factors + add-ons,
 * deposit from settings. Submits GET /booking?tour=…&date=… — the server re-prices everything at checkout.
 */
export function BookingCard({ id, slug, price, priceWas, deps, tiers, addons, pax, depositPct, l, booking, whatsapp, title, perks, waIcon, minus, plus }: {
  id: string; slug: string; price: number; priceWas?: number | null; deps: Dep[]; tiers: Tier[]; addons: Addon[]; pax: Record<string, number>; depositPct: number;
  l: BookingLabels; booking: string; whatsapp: string; title: string; perks: React.ReactNode; waIcon: React.ReactNode; minus: React.ReactNode; plus: React.ReactNode;
}) {
  const { lang } = useSite();
  const open = deps.filter((d) => d.status !== 'sold_out' && d.seats_left > 0);
  const [date, setDate] = useState(open[0]?.date ?? '');
  const [room, setRoom] = useState(tiers[0]?.code ?? 'twin');
  const [n, setN] = useState({ adults: 2, children: 0, infants: 0 });
  const [extra, setExtra] = useState<string[]>([]);
  const fmtD = (iso: string) => new Intl.DateTimeFormat(lang === 'bn' ? 'bn-BD' : 'en-GB', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'Asia/Dhaka' }).format(new Date(iso + 'T00:00:00+06:00'));
  const money = (v: number) => '৳\u00a0' + (lang === 'bn' ? Math.round(v).toLocaleString('en-IN').replace(/\d/g, (x) => '০১২৩৪৫৬৭৮৯'[+x]) : Math.round(v).toLocaleString('en-IN'));
  const dep = open.find((d) => d.date === date);
  const unit = (dep?.price ?? price) * (tiers.find((t) => t.code === room)?.factor ?? 1);
  const total = useMemo(() => {
    const paxTotal = unit * (n.adults * (pax.adults ?? 1) + n.children * (pax.children ?? 0.7) + n.infants * (pax.infants ?? 0.1));
    const add = addons.filter((a) => extra.includes(a.code)).reduce((s, a) => s + a.price * (a.per === 'person' ? n.adults + n.children : 1), 0);
    return Math.round(paxTotal + add);
  }, [unit, n, pax, addons, extra]);
  const rows: [keyof typeof n, string, string, number, number][] = [
    ['adults', l.adults, l.adultsSub, unit * (pax.adults ?? 1), 1],
    ['children', l.children, l.childrenSub, unit * (pax.children ?? 0.7), 0],
    ['infants', l.infants, l.infantsSub, unit * (pax.infants ?? 0.1), 0],
  ];
  const d = (x: number) => (lang === 'bn' ? String(x).replace(/\d/g, (c) => '০১২৩৪৫৬৭৮৯'[+c]) : String(x));
  return (
    <form className="card overflow-hidden" action={booking} method="get">
      <input type="hidden" name="tour" value={slug} />
      <div className="bg-gradient-to-r from-brand-800 to-brand-600 p-5 text-white">
        <p className="text-sm text-brand-100">{l.from}</p>
        <p className="flex flex-wrap items-baseline gap-2"><span className="text-3xl font-extrabold"><Price value={price} /></span>{priceWas ? <><s className="text-brand-200"><Price value={priceWas} /></s><span className="badge bg-accent-400 text-ink-900">{l.save} <Price value={priceWas - price} /></span></> : null}</p>
      </div>
      <div className="space-y-4 p-5">
        <div><label className="label" htmlFor={`${id}-date`}>{l.date}</label>
          {open.length ? <select id={`${id}-date`} name="date" className="input" value={date} onChange={(e) => setDate(e.target.value)}>{open.map((x) => <option key={x.id} value={x.date}>{fmtD(x.date)} — {money(x.price)}</option>)}</select> : <p className="text-sm muted">{l.noDates}</p>}</div>
        <div><label className="label" htmlFor={`${id}-room`}>{l.room}</label><select id={`${id}-room`} name="room" className="input" value={room} onChange={(e) => setRoom(e.target.value)}>{tiers.map((t) => <option key={t.code} value={t.code}>{t.label}</option>)}</select></div>
        <div className="space-y-3 rounded-2xl border border-ink-100 p-3 dark:border-ink-800">
          {rows.map(([key, label, sub, , min]) => (
            <div key={key} className="flex items-center justify-between">
              <div><p className="text-sm font-semibold text-ink-800 dark:text-white" id={`${id}-${key}-l`}>{label}</p><p className="text-xs muted">{sub}</p></div>
              <div className="flex items-center gap-2">
                <button type="button" className="icon-btn h-8 w-8 border border-ink-200 dark:border-ink-700" disabled={n[key] <= min} aria-label={`${l.decrease} ${label}`} onClick={() => setN((s) => ({ ...s, [key]: Math.max(min, s[key] - 1) }))}>{minus}</button>
                <output className="w-8 text-center text-sm font-bold" aria-labelledby={`${id}-${key}-l`} aria-live="polite">{d(n[key])}</output>
                <input type="hidden" name={key} value={n[key]} />
                <button type="button" className="icon-btn h-8 w-8 border border-ink-200 dark:border-ink-700" disabled={n[key] >= 9} aria-label={`${l.increase} ${label}`} onClick={() => setN((s) => ({ ...s, [key]: Math.min(9, s[key] + 1) }))}>{plus}</button>
              </div>
            </div>
          ))}
        </div>
        {addons.length ? (
          <fieldset className="space-y-2 text-sm"><legend className="label">{l.addons}</legend>
            {addons.map((a) => <label key={a.code} className="flex items-center justify-between gap-2"><span className="flex items-center gap-2"><input type="checkbox" className="check" name="addons[]" value={a.code} checked={extra.includes(a.code)} onChange={(e) => setExtra((x) => (e.target.checked ? [...x, a.code] : x.filter((c) => c !== a.code)))} /> {a.label}</span><span className="muted">+{money(a.price)}</span></label>)}
          </fieldset>
        ) : null}
        <div className="space-y-1 border-t border-ink-100 pt-4 dark:border-ink-800">
          <div className="flex items-center justify-between"><span className="font-semibold">{l.total}</span><b className="text-2xl text-ink-900 dark:text-white" aria-live="polite"><Price value={total} /></b></div>
          <div className="flex items-center justify-between text-sm muted"><span>{l.payNow}</span><span><Price value={Math.round((total * depositPct) / 100)} /></span></div>
        </div>
        <button className="btn btn-accent btn-lg w-full" disabled={!open.length}>{l.book}</button>
        <a href={`https://wa.me/${whatsapp}?text=${encodeURIComponent(title)}`} target="_blank" rel="noopener" className="btn btn-outline w-full">{waIcon} {l.ask}</a>
        {perks}
      </div>
    </form>
  );
}
