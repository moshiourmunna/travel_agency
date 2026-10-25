'use client';
import { useEffect, useState } from 'react';
import { Price } from '@/components/client/Price';
import { useSite } from '@/components/client/SiteContext';

type Opt = { code: string; label: string; price: number };
type Addon = { code: string; label: string; price: number; per: string };

function Stepper({ id, label, sub, value, min, max, set, minus, plus, dec, inc }: { id: string; label: string; sub: React.ReactNode; value: number; min: number; max: number; set: (n: number) => void; minus: React.ReactNode; plus: React.ReactNode; dec: string; inc: string }) {
  const { lang } = useSite();
  return (
    <div className="flex items-center justify-between rounded-2xl border border-ink-100 p-3 dark:border-ink-800">
      <div><p className="text-sm font-semibold" id={id}>{label}</p><p className="text-xs muted">{sub}</p></div>
      <div className="flex items-center gap-2">
        <button type="button" className="icon-btn h-8 w-8 border border-ink-200 dark:border-ink-700" disabled={value <= min} aria-label={`${dec} ${label}`} onClick={() => set(Math.max(min, value - 1))}>{minus}</button>
        <output className="w-8 text-center text-sm font-bold" aria-labelledby={id} aria-live="polite">{lang === 'bn' ? String(value).replace(/\d/g, (d) => '০১২৩৪৫৬৭৮৯'[+d]) : value}</output>
        <button type="button" className="icon-btn h-8 w-8 border border-ink-200 dark:border-ink-700" disabled={value >= max} aria-label={`${inc} ${label}`} onClick={() => set(Math.min(max, value + 1))}>{plus}</button>
      </div>
    </div>
  );
}

/** Cruise booking card: cabin × guests + add-ons; deposit from settings. */
export function CruiseBook({ slug, cabins, sailings, addons, depositPct, booking, l, header, footer, minus, plus }: {
  slug: string; cabins: Opt[]; sailings: { id: number; date: string; price: number; seats_left: number }[]; addons: Addon[]; depositPct: number; booking: string;
  l: Record<'cabin' | 'sailing' | 'guests' | 'guestsSub' | 'fewer' | 'more' | 'total' | 'deposit' | 'book', string>; header: React.ReactNode; footer: React.ReactNode; minus: React.ReactNode; plus: React.ReactNode;
}) {
  const { lang } = useSite();
  const def = cabins.find((c) => c.code === 'ocean') ?? cabins[0];
  const [cabin, setCabin] = useState(def?.code);
  const [sail, setSail] = useState(sailings[0]?.date ?? '');
  const [n, setN] = useState(2);
  const [extra, setExtra] = useState<string[]>([]);
  const base = sailings.find((s) => s.date === sail)?.price ?? def?.price ?? 0;
  const ratio = (cabins.find((c) => c.code === cabin)?.price ?? def.price) / (def?.price || 1);
  const total = Math.round(base * ratio * n + addons.filter((a) => extra.includes(a.code)).reduce((s, a) => s + a.price * (a.per === 'person' ? n : 1), 0));
  const fmt = (iso: string) => new Intl.DateTimeFormat(lang === 'bn' ? 'bn-BD' : 'en-GB', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'Asia/Dhaka' }).format(new Date(iso + 'T00:00:00+06:00'));
  return (
    <form className="card overflow-hidden" action={booking} method="get">
      <input type="hidden" name="cruise" value={slug} /><input type="hidden" name="adults" value={n} />
      {header}
      <div className="space-y-4 p-5">
        {sailings.length > 1 ? <div><label className="label" htmlFor="cr-sail">{l.sailing}</label><select id="cr-sail" name="date" className="input" value={sail} onChange={(e) => setSail(e.target.value)}>{sailings.map((s) => <option key={s.id} value={s.date}>{fmt(s.date)}</option>)}</select></div> : <input type="hidden" name="date" value={sail} />}
        <div><label className="label" htmlFor="cr-cabin">{l.cabin}</label><select id="cr-cabin" name="cabin" className="input" value={cabin} onChange={(e) => setCabin(e.target.value)}>{cabins.map((c) => <option key={c.code} value={c.code}>{c.label}</option>)}</select></div>
        <Stepper id="cr-g" label={l.guests} sub={l.guestsSub} value={n} min={1} max={8} set={setN} minus={minus} plus={plus} dec={l.fewer} inc={l.more} />
        {addons.map((a) => <label key={a.code} className="flex items-center justify-between gap-2 text-sm"><span className="flex items-center gap-2"><input type="checkbox" className="check" name="addons[]" value={a.code} checked={extra.includes(a.code)} onChange={(e) => setExtra((x) => (e.target.checked ? [...x, a.code] : x.filter((c) => c !== a.code)))} /> {a.label}</span><span className="muted">+<Price value={a.price} /></span></label>)}
        <div className="space-y-1 border-t border-ink-100 pt-4 dark:border-ink-800"><div className="flex items-center justify-between"><span className="font-semibold">{l.total}</span><b className="text-2xl" aria-live="polite"><Price value={total} /></b></div><div className="flex justify-between text-sm muted"><span>{l.deposit}</span><span><Price value={Math.round((total * depositPct) / 100)} /></span></div></div>
        <button className="btn btn-accent btn-lg w-full" disabled={!sailings.length}>{l.book}</button>
        {footer}
      </div>
    </form>
  );
}

/** Activity booking card: date → live time slots (GET /api/slots proxy), adults/children. */
export function ActivityBook({ slug, price, childPrice, times, minDate, booking, l, header, minus, plus }: {
  slug: string; price: number; childPrice: number; times: string[]; minDate: string; booking: string;
  l: Record<'date' | 'time' | 'adult' | 'child' | 'dec' | 'inc' | 'total' | 'book' | 'note' | 'full' | 'left', string>; header: React.ReactNode; minus: React.ReactNode; plus: React.ReactNode;
}) {
  const { lang } = useSite();
  const [date, setDate] = useState(minDate);
  const [slots, setSlots] = useState<{ time: string; available: number }[]>(times.map((t) => ({ time: t, available: 99 })));
  const [time, setTime] = useState(times[0] ?? '');
  const [a, setA] = useState(2);
  const [c, setC] = useState(0);
  useEffect(() => {
    let off = false;
    fetch(`/api/slots/${slug}?date=${date}`).then((r) => (r.ok ? r.json() : null)).then((j) => {
      if (off || !j?.data?.length) return;
      setSlots(j.data);
      setTime((cur) => (j.data.some((s: any) => s.time === cur && s.available > 0) ? cur : j.data.find((s: any) => s.available > 0)?.time ?? ''));
    }).catch(() => {});
    return () => { off = true; };
  }, [date, slug]);
  const d = (s: string) => (lang === 'bn' ? s.replace(/\d/g, (x) => '০১২৩৪৫৬৭৮৯'[+x]) : s);
  return (
    <form className="card p-5" action={booking} method="get">
      <input type="hidden" name="activity" value={slug} /><input type="hidden" name="adults" value={a} /><input type="hidden" name="children" value={c} />
      {header}
      <div className="mt-4"><label className="label" htmlFor="ad">{l.date}</label><input id="ad" type="date" name="date" className="input" value={date} min={minDate} onChange={(e) => e.target.value && setDate(e.target.value)} /></div>
      <fieldset className="mt-4"><legend className="label">{l.time}</legend><div className="grid grid-cols-3 gap-2">
        {slots.map((s) => (
          <label key={s.time} className={s.available > 0 ? 'cursor-pointer' : 'cursor-not-allowed opacity-50'}>
            <input type="radio" name="time" value={s.time} className="peer sr-only" checked={time === s.time} disabled={s.available <= 0} onChange={() => setTime(s.time)} />
            <span className="block rounded-xl border border-ink-200 py-2 text-center text-sm font-semibold peer-checked:border-brand-700 peer-checked:bg-brand-700 peer-checked:text-white peer-focus-visible:ring-2 peer-focus-visible:ring-brand-400 dark:border-ink-700">{d(s.time)}{s.available <= 0 ? <span className="block text-[10px] font-normal">{l.full}</span> : s.available <= 5 ? <span className="block text-[10px] font-normal">{d(String(s.available))} {l.left}</span> : null}</span>
          </label>
        ))}
      </div></fieldset>
      <div className="mt-4 space-y-2">
        <Stepper id="as-adults" label={l.adult} sub={<Price value={price} />} value={a} min={1} max={10} set={setA} minus={minus} plus={plus} dec={l.dec} inc={l.inc} />
        <Stepper id="as-children" label={l.child} sub={<Price value={childPrice} />} value={c} min={0} max={10} set={setC} minus={minus} plus={plus} dec={l.dec} inc={l.inc} />
      </div>
      <div className="mt-4 flex items-center justify-between border-t border-ink-100 pt-4 dark:border-ink-800"><span className="font-semibold">{l.total}</span><b className="text-2xl" aria-live="polite"><Price value={a * price + c * childPrice} /></b></div>
      <button className="btn btn-accent btn-lg mt-4 w-full" disabled={!time}>{l.book}</button>
      <p className="mt-3 text-center text-xs muted">{l.note}</p>
    </form>
  );
}

/** Hotel booking card: stay dates → nights × rooms × room rate + add-ons. */
export function HotelBook({ slug, price, priceWas, rooms, addons, minDate, checkin, checkout, booking, l, minus, plus }: {
  slug: string; price: number; priceWas?: number | null; rooms: { id: number; name: string; price: number }[]; addons: Addon[]; minDate: string; checkin: string; checkout: string; booking: string;
  l: Record<'night' | 'in' | 'out' | 'room' | 'rooms' | 'nights' | 'fewer' | 'more' | 'total' | 'reserve' | 'note' | 'bad', string>; minus: React.ReactNode; plus: React.ReactNode;
}) {
  const { lang } = useSite();
  const [din, setIn] = useState(checkin);
  const [dout, setOut] = useState(checkout);
  const [room, setRoom] = useState(rooms[0]?.id ?? 0);
  const [n, setN] = useState(1);
  const [extra, setExtra] = useState<string[]>([]);
  const nights = Math.max(0, Math.round((Date.parse(dout) - Date.parse(din)) / 86400000));
  const rate = rooms.find((r) => r.id === room)?.price ?? price;
  const total = rate * nights * n + addons.filter((a) => extra.includes(a.code)).reduce((s, a) => s + a.price * (a.per === 'person' ? n : 1), 0);
  const d = (s: string | number) => (lang === 'bn' ? String(s).replace(/\d/g, (x) => '০১২৩৪৫৬৭৮৯'[+x]) : String(s));
  const next = (iso: string) => { const x = new Date(iso + 'T00:00:00Z'); x.setUTCDate(x.getUTCDate() + 1); return x.toISOString().slice(0, 10); };
  return (
    <form className="card p-5" action={booking} method="get">
      <input type="hidden" name="hotel" value={slug} /><input type="hidden" name="rooms" value={n} />
      <p className="flex items-baseline gap-2"><span className="text-3xl font-extrabold"><Price value={price} /></span><span className="text-sm muted">/ {l.night}</span>{priceWas ? <s className="text-sm text-ink-400"><Price value={priceWas} /></s> : null}</p>
      <div className="mt-4 grid grid-cols-2 gap-3">
        <div><label className="label" htmlFor="hb-in">{l.in}</label><input id="hb-in" name="in" type="date" className="input" min={minDate} value={din} onChange={(e) => { const v = e.target.value; if (!v) return; setIn(v); if (dout <= v) setOut(next(v)); }} /></div>
        <div><label className="label" htmlFor="hb-out">{l.out}</label><input id="hb-out" name="out" type="date" className="input" min={next(din)} value={dout} onChange={(e) => e.target.value && setOut(e.target.value)} /></div>
      </div>
      {rooms.length > 1 ? <div className="mt-3"><label className="label" htmlFor="hb-room">{l.room}</label><select id="hb-room" name="room" className="input" value={room} onChange={(e) => setRoom(+e.target.value)}>{rooms.map((r) => <option key={r.id} value={r.id}>{r.name}</option>)}</select></div> : <input type="hidden" name="room" value={room} />}
      <div className="mt-3"><Stepper id="hb-rooms" label={l.rooms} sub={`${d(nights)} ${l.nights}`} value={n} min={1} max={5} set={setN} minus={minus} plus={plus} dec={l.fewer} inc={l.more} /></div>
      {addons.map((a) => <label key={a.code} className="mt-3 flex items-center justify-between gap-2 text-sm"><span className="flex items-center gap-2"><input type="checkbox" className="check" name="addons[]" value={a.code} checked={extra.includes(a.code)} onChange={(e) => setExtra((x) => (e.target.checked ? [...x, a.code] : x.filter((c) => c !== a.code)))} /> {a.label}</span><span className="muted">+<Price value={a.price} /></span></label>)}
      <div className="mt-4 flex items-center justify-between border-t border-ink-100 pt-4 dark:border-ink-800"><span className="font-semibold">{l.total}</span><b className="text-2xl" aria-live="polite"><Price value={total} /></b></div>
      {nights < 1 ? <p className="mt-2 text-xs font-semibold text-rose-600" role="alert">{l.bad}</p> : null}
      <button className="btn btn-accent btn-lg mt-4 w-full" disabled={nights < 1}>{l.reserve}</button>
      <p className="mt-2 text-center text-xs muted">{l.note}</p>
    </form>
  );
}
