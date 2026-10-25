import type { Metadata } from 'next';
import Link from 'next/link';
import { Suspense } from 'react';
import { Icon } from '@/components/icons/Icon';
import { Price } from '@/components/client/Price';
import { SwapButton } from '@/components/client/Tabs';
import { TripForm } from '@/components/flights/TripFields';
import type { Field } from '@/components/listing/Filters';
import { Filters } from '@/components/listing/Filters';
import { FilterDrawer } from '@/components/listing/ListingBits';
import { Picture } from '@/components/ui/Picture';
import { SearchHero, SecHead, type Crumb } from '@/components/ui/basics';
import { api, ApiError } from '@/lib/api';
import type { Lang } from '@/lib/format';
import { getI18n } from '@/lib/i18n';
import { getPage, pageMetadata } from '@/lib/page';
import { breadcrumbJsonLd, JsonLd } from '@/lib/seo';
import { getSite, siteUrl } from '@/lib/site';

type SP = Record<string, string | string[] | undefined>;
const one = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v) || undefined;
const dhaka = (add = 0) => new Date(Date.now() + 6 * 3600e3 + add * 864e5).toISOString().slice(0, 10);
/** "Dhaka (DAC)" | "dac" → "DAC" */
const iata = (v: string | undefined, fallback: string) => { const m = v?.match(/\(([A-Za-z]{3})\)\s*$/) ?? v?.trim().match(/^([A-Za-z]{3})$/); return m ? m[1].toUpperCase() : fallback; };
const isoDate = (v: string | undefined) => (v && /^\d{4}-\d{2}-\d{2}$/.test(v) ? v : undefined);
const PAX: Record<string, [number, number]> = { '1': [1, 0], '2': [2, 0], '2-1': [2, 1], '3': [3, 0], '4': [4, 0] };
const CABINS = ['economy', 'premium', 'business', 'first'];

export async function generateMetadata({ params, searchParams }: PageProps<'/[lang]/flights'>): Promise<Metadata> {
  return pageMetadata((await params).lang as Lang, 'flights', '/flights', { noindex: Object.keys(await searchParams).length > 0 });
}

export default async function FlightsPage({ params, searchParams }: PageProps<'/[lang]/flights'>) {
  const lang = (await params).lang as Lang;
  const sp: SP = await searchParams;
  const [pc1, pc2] = (one(sp.paxcabin) ?? '').split('|'); // combined select in the hero form
  const from = iata(one(sp.from), 'DAC');
  const to0 = iata(one(sp.to), 'DXB');
  const to = to0 === from ? (from === 'DXB' ? 'DAC' : 'DXB') : to0;
  const date = isoDate(one(sp.date)) && one(sp.date)! >= dhaka() ? one(sp.date)! : dhaka(30);
  const trip = ['rt', 'ow', 'mc'].includes(one(sp.trip) ?? '') ? one(sp.trip)! : 'rt';
  const ret = trip === 'ow' ? undefined : isoDate(one(sp.return)) && one(sp.return)! >= date ? one(sp.return)! : new Date(Date.parse(date) + 8 * 864e5).toISOString().slice(0, 10);
  const paxIn = pc1 || one(sp.pax) || '1';
  const paxKey = PAX[paxIn] ? paxIn : '1';
  const cabinIn = pc2 || one(sp.cabin) || 'economy';
  const cabin = CABINS.includes(cabinIn) ? cabinIn : 'economy';
  const sort = ['cheapest', 'fastest', 'best'].includes(one(sp.sort) ?? '') ? one(sp.sort)! : 'cheapest';
  const query = { from, to, date, return: ret, adults: PAX[paxKey][0], children: PAX[paxKey][1], cabin, stops: one(sp.stops), airline: one(sp.airline), price_max: one(sp.maxprice), sort };
  const empty = { data: [] as any[], meta: { total: 0, airlines: [], dates: [], price_range: {} } as any };
  const [i, page, site, airports, routes, res] = await Promise.all([
    getI18n(lang), getPage('flights', lang), getSite(lang),
    api<{ data: { iata: string; city: string; name: string }[] }>('airports', { lang, tags: ['airports'] }).then((r) => r.data).catch(() => []),
    api<{ data: { routes: any[]; airlines: any[] } }>('flights/routes', { lang, tags: ['flights', 'settings'] }).then((r) => r.data).catch(() => ({ routes: [], airlines: [] })),
    api<{ data: any[]; meta: any }>('flights/search', { lang, tags: ['flights'], revalidate: 60, query }).catch((e) => { if (e instanceof ApiError && e.status === 422) return empty; throw e; }),
  ]);
  const t = i.t;
  const crumbs: Crumb[] = [[t('Home', 'হোম'), i.u('/')], [t('Flights', 'ফ্লাইট'), i.u('/flights')]];
  const city = (code: string) => airports.find((a) => a.iata === code)?.city ?? code;
  const label = (code: string) => `${city(code)} (${code})`;
  const m = res.meta;
  const hm = (min: number) => `${i.d(Math.floor(min / 60))}${t('h', 'ঘ')} ${i.d(String(min % 60).padStart(2, '0'))}${t('m', 'মি')}`;
  const day = (iso: string, long = false) => new Intl.DateTimeFormat(lang === 'bn' ? 'bn-BD' : 'en-GB', long ? { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC' } : { weekday: 'short', day: 'numeric', month: 'short', timeZone: 'UTC' }).format(new Date(iso + 'T00:00:00Z'));
  const flat = Object.fromEntries(Object.entries(sp).map(([k, v]) => [k, one(v)]).filter(([, v]) => v)) as Record<string, string>;
  const qs = (patch: Record<string, string | undefined>) => {
    const n = new URLSearchParams({ ...flat, from, to, date, ...(ret ? { return: ret } : {}) });
    for (const [k, v] of Object.entries(patch)) { if (v) n.set(k, v); else n.delete(k); }
    return `${i.u('/flights')}?${n.toString()}#results`;
  };
  const pr = m.price_range ?? {};
  const rmin = Math.floor((pr.min ?? 5000) / 1000) * 1000;
  const rmax = Math.max(rmin + 1000, Math.ceil((pr.max ?? 60000) / 1000) * 1000);
  const fields: Field[] = [
    { type: 'checks', name: 'stops', label: t('Stops', 'স্টপ'), options: [{ value: '0', label: t('Non-stop', 'নন-স্টপ') }, { value: '1', label: t('1 stop', '১ স্টপ') }] },
    { type: 'checks', name: 'airline', label: t('Airlines', 'এয়ারলাইন'), options: (m.airlines ?? []).map((a: any) => ({ value: a.code, label: a.name })) },
    { type: 'range', name: 'maxprice', label: t('Max price', 'সর্বোচ্চ মূল্য'), min: rmin, max: rmax, step: 1000, money: true },
  ];
  const labels = { aria: t('Filter flights', 'ফ্লাইট ফিল্টার'), clear: t('Reset', 'রিসেট'), show: t('Show results', 'ফলাফল দেখুন'), any: t('Any', 'যেকোনো') };
  const active = fields.filter((f) => flat[f.name]).length;
  const cabinLabel: Record<string, string> = { economy: t('Economy', 'ইকোনমি'), premium: t('Premium economy', 'প্রিমিয়াম ইকোনমি'), business: t('Business', 'বিজনেস'), first: t('First', 'ফার্স্ট') };
  const fastest = res.data.length ? Math.min(...res.data.map((o) => o.duration_min)) : 0;
  const sorts: [string, string, React.ReactNode][] = [['cheapest', t('Cheapest', 'সবচেয়ে সস্তা'), m.cheapest ? <Price value={m.cheapest} /> : '—'], ['fastest', t('Fastest', 'সবচেয়ে দ্রুত'), fastest ? hm(fastest) : '—'], ['best', t('Best value', 'সেরা মূল্যমান'), m.best ? <Price value={m.best} /> : '—']];
  const lowest = Math.min(...(m.dates ?? []).map((x: any) => x.fare ?? Infinity));
  const paxOpts: [string, string, string][] = [['1', 'economy', t('1 adult, Economy', '১ জন, ইকোনমি')], ['2', 'economy', t('2 adults, Economy', '২ জন, ইকোনমি')], ['2-1', 'economy', t('2 adults, 1 child, Economy', '২ জন, ১ শিশু, ইকোনমি')], ['1', 'premium', t('1 adult, Premium economy', '১ জন, প্রিমিয়াম ইকোনমি')], ['1', 'business', t('1 adult, Business', '১ জন, বিজনেস')], ['2', 'business', t('2 adults, Business', '২ জন, বিজনেস')]];
  if (!paxOpts.some(([p, c]) => p === paxKey && c === cabin)) paxOpts.push([paxKey, cabin, `${i.d(PAX[paxKey][0])} ${t('adults', 'জন')}${PAX[paxKey][1] ? `, ${i.d(PAX[paxKey][1])} ${t('child', 'শিশু')}` : ''}, ${cabinLabel[cabin]}`]);
  return (
    <>
      <JsonLd data={breadcrumbJsonLd(siteUrl(site), crumbs)} />
      <SearchHero i={i} title={page.title} sub={page.subtitle} crumbs={crumbs} image={page.image} opacity="opacity-40">
        <form method="get" action={i.u('/flights')} role="search" className="mt-6 rounded-3xl bg-white p-4 shadow-xl dark:bg-ink-900 sm:p-5">
          <TripForm initial={trip} returnId="fl-ret" l={{ rt: t('Round trip', 'রাউন্ড ট্রিপ'), ow: t('One way', 'একমুখী'), mc: t('Multi-city', 'মাল্টি-সিটি'), aria: t('Trip type', 'যাত্রার ধরন') }}
            mcNote={<p className="rounded-2xl bg-brand-50 p-3 text-sm text-brand-900 dark:bg-brand-900/30 dark:text-brand-100">{t('Multi-city trips are built by our ticketing desk — search the first leg here, or', 'মাল্টি-সিটি ট্রিপ আমাদের টিকেটিং ডেস্ক তৈরি করে — এখানে প্রথম অংশ খুঁজুন, অথবা')} <Link className="link" href={i.u('/contact')}>{t('ask an agent', 'এজেন্টকে জিজ্ঞেস করুন')}</Link>.</p>}>
            <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-[1fr_auto_1fr_1fr_1fr_1fr_auto] lg:items-end">
              <div><label className="label" htmlFor="fl-from">{t('From', 'কোথা থেকে')}</label><input id="fl-from" name="from" className="input" defaultValue={label(from)} list="airports" required autoComplete="off" /></div>
              <SwapButton a="#fl-from" b="#fl-to" className="icon-btn mx-auto h-10 w-10 rotate-90 border border-ink-200 dark:border-ink-700 lg:mb-0.5 lg:rotate-0" label={t('Swap origin and destination', 'যাত্রাস্থান ও গন্তব্য বদলান')}><Icon name="arrow-left-right" className="h-4 w-4" /></SwapButton>
              <div><label className="label" htmlFor="fl-to">{t('To', 'কোথায়')}</label><input id="fl-to" name="to" className="input" defaultValue={label(to)} list="airports" required autoComplete="off" /></div>
              <div><label className="label" htmlFor="fl-dep">{t('Departure', 'যাত্রা')}</label><input id="fl-dep" name="date" type="date" className="input" min={dhaka()} defaultValue={date} required /></div>
              <div><label className="label" htmlFor="fl-ret">{t('Return', 'ফেরা')}</label><input id="fl-ret" name="return" type="date" className="input disabled:opacity-50" min={dhaka()} defaultValue={ret ?? ''} /></div>
              <div><label className="label" htmlFor="fl-pax">{t('Travellers, class', 'যাত্রী, শ্রেণি')}</label><select id="fl-pax" name="paxcabin" className="input" defaultValue={`${paxKey}|${cabin}`}>{paxOpts.map(([p, c, l]) => <option key={`${p}|${c}`} value={`${p}|${c}`}>{l}</option>)}</select></div>
              <button className="btn btn-accent h-[46px]"><Icon name="search" className="h-4 w-4" /> {t('Search', 'খুঁজুন')}</button>
            </div>
          </TripForm>
          <datalist id="airports">{airports.map((a) => <option key={a.iata} value={`${a.city} (${a.iata})`}>{a.name}</option>)}</datalist>
        </form>
      </SearchHero>
      <section className="scroll-mt-24 py-8" id="results">
        <div className="wrap">
          {m.dates?.length ? <nav className="no-scrollbar -mx-4 mb-6 flex gap-2 overflow-x-auto px-4 md:mx-0 md:px-0" aria-label={t('Flexible dates', 'নমনীয় তারিখ')}>
            {m.dates.map((d: any) => { const on = d.date === m.date; return (
              <Link key={d.date} href={qs({ date: d.date, ...(ret && ret < d.date ? { return: undefined } : {}) })} scroll={false} aria-current={on ? 'date' : undefined}
                className={`shrink-0 rounded-2xl border px-4 py-2.5 text-center ${on ? 'border-brand-600 bg-brand-50 dark:bg-brand-900/30' : 'border-ink-200 hover:border-brand-500 dark:border-ink-700'}`}>
                <span className="block text-xs muted">{day(d.date)}</span><b className={`text-sm ${d.fare === lowest ? 'text-emerald-700 dark:text-emerald-400' : ''}`}>{d.fare ? <Price value={d.fare} /> : '—'}</b></Link>
            ); })}
          </nav> : null}
          <div className="grid gap-8 lg:grid-cols-[260px_1fr]">
            <aside className="hidden lg:block" aria-label={t('Filters', 'ফিল্টার')}><div className="card sticky top-24 p-5"><Suspense><Filters id="ffd" fields={fields} live labels={labels} search={t('Search', 'খুঁজুন')} /></Suspense></div></aside>
            <div>
              <nav className="mb-4 grid grid-cols-3 overflow-hidden rounded-2xl border border-ink-100 dark:border-ink-800" aria-label={t('Sort', 'সাজান')}>
                {sorts.map(([k, l, v], n) => <Link key={k} href={qs({ sort: k === 'cheapest' ? undefined : k })} scroll={false} aria-current={sort === k ? 'true' : undefined} className={`border-ink-100 px-3 py-3 text-left dark:border-ink-800 ${n ? 'border-l' : ''} ${sort === k ? 'bg-brand-700 text-white' : 'bg-white hover:bg-ink-50 dark:bg-ink-900 dark:hover:bg-ink-850'}`}><span className="block text-xs font-semibold opacity-80">{l}</span><b className="text-sm sm:text-base">{v}</b></Link>)}
              </nav>
              <div className="mb-4 flex items-center justify-between gap-3"><p className="text-sm muted" aria-live="polite"><b className="text-ink-900 dark:text-white">{i.d(m.total)}</b> {t('flights', 'টি ফ্লাইট')} · {city(from)} → {city(to)} · {day(m.date ?? date, true)}</p>
                <Suspense><FilterDrawer title={t('Filters', 'ফিল্টার')} openLabel={t('Filters', 'ফিল্টার')} closeLabel={t('Close filters', 'ফিল্টার বন্ধ')} activeCount={active} openIcon={<Icon name="sliders-horizontal" className="h-4 w-4" />} closeIcon={<Icon name="x" />}><Filters id="ffm" fields={fields} live={false} labels={labels} search={t('Search', 'খুঁজুন')} /></FilterDrawer></Suspense></div>
              <h2 className="sr-only">{t('Flight results', 'ফ্লাইটের ফলাফল')}</h2>
              {res.data.length ? <div className="space-y-4">{res.data.map((o) => (
                <article key={o.id} className="card overflow-hidden">
                  <div className="grid gap-4 p-4 sm:p-5 md:grid-cols-[180px_1fr_170px] md:items-center">
                    <div className="flex items-center gap-3"><span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl text-sm font-extrabold text-white" style={{ background: o.airline.color ?? '#0D6B65' }} aria-hidden="true">{o.airline.code}</span><div><p className="text-sm font-bold">{o.airline.name}</p><p className="text-xs muted">{o.flight_no} · {cabinLabel[cabin]}</p></div></div>
                    <div className="flex items-center gap-3">
                      <div className="text-center"><p className="text-xl font-extrabold tabular-nums">{i.d(o.dep_time)}</p><p className="text-xs font-semibold muted">{o.origin}</p></div>
                      <div className="flex-1 text-center"><p className="text-xs muted">{hm(o.duration_min)}</p><div className="relative my-1 h-px bg-ink-200 dark:bg-ink-700"><span className="absolute -top-1 left-0 h-2 w-2 rounded-full bg-ink-300" /><span className="absolute -top-1.5 right-0 text-brand-600"><Icon name="plane" className="h-3 w-3" /></span></div>
                        <p className={`text-xs font-semibold ${o.stops ? 'text-amber-700 dark:text-amber-300' : 'text-emerald-700 dark:text-emerald-400'}`}>{o.stops ? `${i.d(o.stops)} ${t('stop', 'স্টপ')}${o.via?.length ? ` · ${o.via.join(', ')}` : ''}` : t('Non-stop', 'নন-স্টপ')}</p></div>
                      <div className="text-center"><p className="text-xl font-extrabold tabular-nums">{i.d(o.arr_time)}{o.next_day ? <sup className="ml-0.5 text-[10px] text-rose-600">+{i.d(1)}</sup> : null}</p><p className="text-xs font-semibold muted">{o.destination}</p></div>
                    </div>
                    <div className="flex items-center justify-between gap-3 border-t border-ink-100 pt-3 dark:border-ink-800 md:flex-col md:items-end md:border-0 md:pt-0"><div className="md:text-right"><p className="text-2xl font-extrabold"><Price value={o.fare} /></p>{o.total !== o.fare ? <p className="text-xs muted">{t('Total', 'মোট')} <Price value={o.total} /></p> : null}{o.seats < 20 ? <p className="text-xs text-rose-600">{i.d(o.seats)} {t('seats left', 'টি সিট বাকি')}</p> : null}</div>
                      <Link href={`${i.u('/booking')}?flight=${o.id}&date=${m.date}${ret ? `&return=${ret}` : ''}&pax=${paxKey}&cabin=${cabin}`} className="btn btn-primary" aria-label={`${t('Select', 'বাছুন')} ${o.airline.name} ${o.flight_no}`}>{t('Select', 'বাছুন')}</Link></div>
                  </div>
                  <details className="group border-t border-ink-100 dark:border-ink-800"><summary className="flex cursor-pointer list-none items-center justify-between bg-ink-50/60 px-5 py-2.5 text-sm font-semibold text-brand-700 dark:bg-ink-850 dark:text-brand-300"><span className="flex flex-wrap gap-x-4 gap-y-1"><span className="inline-flex items-center gap-1"><Icon name="luggage" className="h-4 w-4" /> {o.baggage ? i.d(o.baggage) : '—'}</span><span className={`inline-flex items-center gap-1 ${o.refundable ? 'text-emerald-700 dark:text-emerald-400' : 'text-ink-500 dark:text-ink-300'}`}><Icon name={o.refundable ? 'circle-check' : 'circle-x'} className="h-4 w-4" /> {o.refundable ? t('Refundable', 'ফেরতযোগ্য') : t('Non-refundable', 'অফেরতযোগ্য')}</span></span><span className="inline-flex items-center gap-1">{t('Flight details', 'ফ্লাইটের বিবরণ')} <Icon name="chevron-down" className="h-4 w-4 transition group-open:rotate-180" /></span></summary>
                    <div className="grid gap-4 p-5 text-sm sm:grid-cols-3"><div><p className="font-bold">{t('Baggage', 'ব্যাগেজ')}</p><p className="muted">{t('Check-in', 'চেক-ইন')} {i.d(o.baggage ?? '—')} · {t('Cabin', 'কেবিন')} {i.d(7)} {t('kg', 'কেজি')}</p></div><div><p className="font-bold">{t('Fare rules', 'ভাড়ার নিয়ম')}</p><p className="muted">{t('Date change from', 'তারিখ পরিবর্তন')} <Price value={o.change_fee} /> + {t('fare difference', 'ভাড়ার পার্থক্য')}</p></div><div><p className="font-bold">{t('Fare breakdown', 'ভাড়ার বিভাজন')}</p><p className="muted">{t('Base', 'মূল')} <Price value={o.base} /> · {t('Taxes', 'কর')} <Price value={o.taxes} /></p></div></div>
                  </details>
                </article>
              ))}</div> : <div className="card p-10 text-center"><span className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-ink-100 dark:bg-ink-800"><Icon name="plane" className="h-6 w-6" /></span><p className="mt-3 font-bold">{t('No flights match your search', 'আপনার অনুসন্ধানে কোনো ফ্লাইট মেলেনি')}</p><p className="text-sm muted">{t('Try another date, clear a filter, or ask our ticketing desk for a quote.', 'অন্য তারিখ চেষ্টা করুন, ফিল্টার সরান, অথবা টিকেটিং ডেস্কে কোট চান।')}</p><Link href={i.u('/contact')} className="btn btn-primary mt-4">{t('Ask an agent', 'এজেন্টকে জিজ্ঞেস করুন')}</Link></div>}
              <p className="mt-4 text-xs muted">{t('Fares are indicative per adult and confirmed at booking.', 'ভাড়া জনপ্রতি আনুমানিক এবং বুকিংয়ের সময় নিশ্চিত করা হয়।')}</p>
            </div>
          </div>
        </div>
      </section>
      <section className="section bg-ink-50 dark:bg-ink-900/50"><div className="wrap">
        <SecHead eyebrow={t('Popular routes', 'জনপ্রিয় রুট')} title={t('Fares people are booking now', 'এখন যে ভাড়ায় বুক হচ্ছে')} />
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">{routes.routes.map((r: any) => (
          <Link key={`${r.from}-${r.to}`} href={`${i.u('/flights')}?from=${r.from}&to=${r.to}#results`} className="card card-hover flex items-center gap-3 p-3"><Picture img={r.image} alt="" className="h-16 w-16 rounded-xl object-cover" sizes="64px" width={640} height={400} /><div className="min-w-0"><p className="truncate text-sm font-bold">{r.from_city} → {r.to_city}</p><p className="text-xs muted">{t('from', 'শুরু')} <b className="text-brand-700 dark:text-brand-300">{r.fare ? <Price value={r.fare} /> : '—'}</b></p></div></Link>
        ))}</div>
        <div className="mt-10"><SecHead eyebrow={t('Partners', 'পার্টনার')} title={t('Airlines we ticket', 'যে এয়ারলাইনের টিকেট দিই')} /><ul className="flex flex-wrap gap-3">{routes.airlines.map((a: any) => <li key={a.code} className="chip"><span className="grid h-6 w-6 place-items-center rounded-md text-[10px] font-extrabold text-white" style={{ background: a.color ?? '#0D6B65' }} aria-hidden="true">{a.code}</span>{a.name}</li>)}</ul></div>
      </div></section>
    </>
  );
}
