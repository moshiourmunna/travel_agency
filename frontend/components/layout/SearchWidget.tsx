import { Icon } from '@/components/icons/Icon';
import { SwapButton, Tabs } from '@/components/client/Tabs';
import { api, apiData } from '@/lib/api';
import type { I18n } from '@/lib/i18n';

const iso = (d: Date) => d.toISOString().slice(0, 10);
const MONTHS_EN = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
const MONTHS_BN = ['জানুয়ারি', 'ফেব্রুয়ারি', 'মার্চ', 'এপ্রিল', 'মে', 'জুন', 'জুলাই', 'আগস্ট', 'সেপ্টেম্বর', 'অক্টোবর', 'নভেম্বর', 'ডিসেম্বর'];

/** Multi-tab search (tours, cruises, flights, hotels, visa). Plain GET forms → listing pages (works without JS). */
export async function SearchWidget({ i }: { i: I18n }) {
  const { t, d, u, lang } = i;
  const [dests, regions, visas, airports] = await Promise.all([
    apiData<any[]>('destinations', { lang, tags: ['destinations'] }),
    api<any>('cruises', { lang, tags: ['cruises'] }).catch(() => null),
    apiData<any[]>('visas', { lang, tags: ['visas'] }),
    apiData<any[]>('airports', { lang, tags: ['airports'] }),
  ]);
  const now = new Date();
  const months = Array.from({ length: 5 }, (_, k) => { const m = new Date(now.getFullYear(), now.getMonth() + 1 + k, 1); return { v: `${m.getFullYear()}-${String(m.getMonth() + 1).padStart(2, '0')}`, l: d(`${(lang === 'bn' ? MONTHS_BN : MONTHS_EN)[m.getMonth()].slice(0, lang === 'bn' ? undefined : 3)} ${m.getFullYear()}`) }; });
  const dep = new Date(now.getTime() + 17 * 864e5), ret = new Date(now.getTime() + 24 * 864e5);
  const hin = new Date(now.getTime() + 53 * 864e5), hout = new Date(now.getTime() + 56 * 864e5);
  const ap = (code: string) => airports.find((a) => a.iata === code);
  const apLabel = (code: string) => (ap(code) ? `${ap(code).city} (${code})` : code);
  return (
    <div className="rounded-3xl bg-white/95 p-2 shadow-2xl ring-1 ring-black/5 backdrop-blur-xl dark:bg-ink-900/95 dark:ring-white/10" data-tabs>
      <Tabs
        label={t('Search type', 'অনুসন্ধানের ধরন')}
        listClass="no-scrollbar flex gap-1 overflow-x-auto rounded-2xl bg-ink-100/80 p-1 dark:bg-ink-950/60"
        tabs={[
          { id: 's-tours', label: <><Icon name="palmtree" className="h-4 w-4" /><span>{t('Tours', 'ট্যুর')}</span></> },
          { id: 's-cruise', label: <><Icon name="ship" className="h-4 w-4" /><span>{t('Cruises', 'ক্রুজ')}</span></> },
          { id: 's-flights', label: <><Icon name="plane" className="h-4 w-4" /><span>{t('Flights', 'ফ্লাইট')}</span></> },
          { id: 's-hotels', label: <><Icon name="bed-double" className="h-4 w-4" /><span>{t('Hotels', 'হোটেল')}</span></> },
          { id: 's-visa', label: <><Icon name="stamp" className="h-4 w-4" /><span>{t('Visa', 'ভিসা')}</span></> },
        ]}
      >
        <form action={u('/tours')} className="grid gap-3 p-3 sm:p-4 md:grid-cols-[1.4fr_1fr_1fr_auto]">
          <div><label className="label" htmlFor="st-dest">{t('Where to?', 'কোথায় যাবেন?')}</label><div className="relative"><Icon name="map-pin" className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-400" /><input id="st-dest" name="q" list="dest-list" className="input pl-9" placeholder={t("Cox's Bazar, Maldives, Turkey…", 'কক্সবাজার, মালদ্বীপ, তুরস্ক…')} /></div>
            <datalist id="dest-list">{dests.map((x) => <option key={x.slug} value={x.name} />)}</datalist></div>
          <div><label className="label" htmlFor="st-month">{t('When', 'কবে')}</label><select id="st-month" name="month" className="input"><option value="">{t('Any month', 'যেকোনো মাস')}</option>{months.map((m) => <option key={m.v} value={m.v}>{m.l}</option>)}</select></div>
          <div><label className="label" htmlFor="st-pax">{t('Travellers', 'ভ্রমণকারী')}</label><select id="st-pax" name="pax" className="input" defaultValue="2">{[1, 2, 3, 4, 5, 6, 7, 8].map((n) => <option key={n} value={n}>{d(n)} {n === 1 ? t('traveller', 'জন') : t('travellers', 'জন')}</option>)}</select></div>
          <button className="btn btn-accent btn-lg self-end"><Icon name="search" className="h-5 w-5" /><span>{t('Search tours', 'ট্যুর খুঁজুন')}</span></button>
        </form>
        <form action={u('/cruises')} className="grid gap-3 p-3 sm:p-4 md:grid-cols-[1.2fr_1fr_1fr_auto]">
          <div><label className="label" htmlFor="sc-region">{t('Cruise region', 'ক্রুজ অঞ্চল')}</label><select id="sc-region" name="region" className="input"><option value="">{t('Anywhere', 'যেকোনো অঞ্চল')}</option>{Object.entries<string>(regions?.meta?.regions ?? {}).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</select></div>
          <div><label className="label" htmlFor="sc-len">{t('Length', 'সময়কাল')}</label><select id="sc-len" name="dur" className="input"><option value="">{t('Any length', 'যেকোনো')}</option><option value="1-3">{t('1–3 nights', '১–৩ রাত')}</option><option value="4-5">{t('4–5 nights', '৪–৫ রাত')}</option><option value="6-14">{t('6+ nights', '৬+ রাত')}</option></select></div>
          <div><label className="label" htmlFor="sc-month">{t('Departure', 'যাত্রার সময়')}</label><select id="sc-month" name="month" className="input"><option value="">{t('Any time', 'যেকোনো সময়')}</option>{months.map((m) => <option key={m.v} value={m.v}>{m.l}</option>)}</select></div>
          <button className="btn btn-accent btn-lg self-end"><Icon name="search" className="h-5 w-5" /><span>{t('Find cruises', 'ক্রুজ খুঁজুন')}</span></button>
        </form>
        <form action={u('/flights')} className="p-3 sm:p-4">
          <div className="mb-3 flex flex-wrap gap-2" role="radiogroup" aria-label={t('Trip type', 'যাত্রার ধরন')}>
            {([['ow', t('One way', 'একমুখী')], ['rt', t('Round trip', 'রাউন্ড ট্রিপ')], ['mc', t('Multi-city', 'মাল্টি-সিটি')]] as const).map(([v, l]) => (
              <label key={v} className="cursor-pointer"><input type="radio" name="trip" value={v} className="peer sr-only" defaultChecked={v === 'rt'} /><span className="chip peer-checked:border-brand-600 peer-checked:bg-brand-700 peer-checked:text-white peer-focus-visible:ring-2 peer-focus-visible:ring-brand-500">{l}</span></label>
            ))}
          </div>
          <div className="grid gap-3 md:grid-cols-[1fr_auto_1fr_1fr_1fr_auto] md:items-end">
            <div><label className="label" htmlFor="sf-from">{t('From', 'কোথা থেকে')}</label><input id="sf-from" name="from" list="ap-list" className="input" defaultValue={apLabel('DAC')} /></div>
            <SwapButton a="#sf-from" b="#sf-to" className="icon-btn mx-auto -my-1 h-10 w-10 rotate-90 border border-ink-200 md:my-0 md:rotate-0 dark:border-ink-700" label={t('Swap origin and destination', 'যাত্রাস্থান ও গন্তব্য বদলান')}><Icon name="arrow-left-right" className="h-4 w-4" /></SwapButton>
            <div><label className="label" htmlFor="sf-to">{t('To', 'কোথায়')}</label><input id="sf-to" name="to" list="ap-list" className="input" defaultValue={apLabel('DXB')} /></div>
            <datalist id="ap-list">{airports.map((a) => <option key={a.iata} value={`${a.city} (${a.iata})`} />)}</datalist>
            <div><label className="label" htmlFor="sf-dep">{t('Depart', 'যাত্রা')}</label><input id="sf-dep" type="date" name="date" className="input" defaultValue={iso(dep)} min={iso(now)} /></div>
            <div><label className="label" htmlFor="sf-ret">{t('Return', 'ফেরা')}</label><input id="sf-ret" type="date" name="return" className="input" defaultValue={iso(ret)} min={iso(now)} /></div>
            <button className="btn btn-accent btn-lg"><Icon name="search" className="h-5 w-5" /><span className="md:sr-only xl:not-sr-only">{t('Search', 'খুঁজুন')}</span></button>
          </div>
          <div className="mt-3 flex flex-wrap items-center gap-x-5 gap-y-2 text-sm">
            <label className="flex items-center gap-2"><span className="muted">{t('Travellers', 'যাত্রী')}</span><select className="input w-auto py-1.5" name="pax" defaultValue="1"><option value="1">{t('1 Adult', '১ জন প্রাপ্তবয়স্ক')}</option><option value="2">{t('2 Adults', '২ জন প্রাপ্তবয়স্ক')}</option><option value="2-1">{t('2 Adults, 1 Child', '২ জন প্রাপ্তবয়স্ক, ১ শিশু')}</option></select></label>
            <label className="flex items-center gap-2"><span className="muted">{t('Class', 'শ্রেণি')}</span><select className="input w-auto py-1.5" name="cabin" aria-label={t('Cabin class', 'কেবিন শ্রেণি')}><option value="economy">{t('Economy', 'ইকোনমি')}</option><option value="premium">{t('Premium economy', 'প্রিমিয়াম ইকোনমি')}</option><option value="business">{t('Business', 'বিজনেস')}</option></select></label>
            <label className="flex items-center gap-2"><input type="checkbox" className="check" name="stops" value="0" /> {t('Direct flights only', 'শুধু সরাসরি ফ্লাইট')}</label>
          </div>
        </form>
        <form action={u('/hotels')} className="grid gap-3 p-3 sm:p-4 md:grid-cols-[1.4fr_1fr_1fr_1fr_auto] md:items-end">
          <div><label className="label" htmlFor="sho-city">{t('City, area or hotel', 'শহর, এলাকা বা হোটেল')}</label><input id="sho-city" name="q" className="input" placeholder={t("Cox's Bazar", 'কক্সবাজার')} /></div>
          <div><label className="label" htmlFor="sho-in">{t('Check-in', 'চেক-ইন')}</label><input id="sho-in" name="in" type="date" className="input" defaultValue={iso(hin)} min={iso(now)} /></div>
          <div><label className="label" htmlFor="sho-out">{t('Check-out', 'চেক-আউট')}</label><input id="sho-out" name="out" type="date" className="input" defaultValue={iso(hout)} min={iso(now)} /></div>
          <div><label className="label" htmlFor="sho-g">{t('Rooms & guests', 'রুম ও অতিথি')}</label><select id="sho-g" name="guests" className="input"><option value="1-2">{t('1 room, 2 guests', '১ রুম, ২ জন')}</option><option value="2-4">{t('2 rooms, 4 guests', '২ রুম, ৪ জন')}</option><option value="3-6">{t('3 rooms, 6 guests', '৩ রুম, ৬ জন')}</option></select></div>
          <button className="btn btn-accent btn-lg"><Icon name="search" className="h-5 w-5" /><span className="md:sr-only xl:not-sr-only">{t('Search', 'খুঁজুন')}</span></button>
        </form>
        <form action={u('/visa')} className="grid gap-3 p-3 sm:p-4 md:grid-cols-[1.4fr_1fr_1fr_auto] md:items-end">
          <div><label className="label" htmlFor="sv-c">{t('Destination country', 'গন্তব্য দেশ')}</label><select id="sv-c" name="country" className="input">{visas.map((v) => <option key={v.slug} value={v.slug}>{v.flag} {v.country}</option>)}</select></div>
          <div><label className="label" htmlFor="sv-t">{t('Visa type', 'ভিসার ধরন')}</label><select id="sv-t" name="type" className="input"><option value="tourist">{t('Tourist', 'ট্যুরিস্ট')}</option><option value="business">{t('Business', 'বিজনেস')}</option><option value="medical">{t('Medical', 'মেডিকেল')}</option><option value="student">{t('Student', 'স্টুডেন্ট')}</option></select></div>
          <div><label className="label" htmlFor="sv-n">{t('Nationality', 'জাতীয়তা')}</label><select id="sv-n" name="nationality" className="input"><option value="BD">{t('Bangladeshi', 'বাংলাদেশি')}</option><option value="other">{t('Other', 'অন্যান্য')}</option></select></div>
          <button className="btn btn-accent btn-lg"><Icon name="search" className="h-5 w-5" /><span>{t('Check requirements', 'শর্তাবলি দেখুন')}</span></button>
        </form>
      </Tabs>
    </div>
  );
}
