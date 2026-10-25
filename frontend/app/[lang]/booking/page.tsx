import type { Metadata } from 'next';
import Link from 'next/link';
import { InquiryForm } from '@/components/forms/QuoteForm';
import { Icon } from '@/components/icons/Icon';
import { Picture } from '@/components/ui/Picture';
import { PlainHero, type Crumb } from '@/components/ui/basics';
import { api } from '@/lib/api';
import type { Lang } from '@/lib/format';
import { getI18n } from '@/lib/i18n';
import { pathMetadata } from '@/lib/page';
import type { Image } from '@/lib/types';

export async function generateMetadata({ params }: PageProps<'/[lang]/booking'>): Promise<Metadata> {
  const lang = (await params).lang as Lang;
  return pathMetadata(lang, '/booking', lang === 'bn' ? 'নিরাপদ চেকআউট' : 'Secure checkout', { noindex: true });
}

const KINDS = [['tour', 'tours'], ['cruise', 'cruises'], ['activity', 'activities'], ['hotel', 'hotels']] as const;
const one = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v) ?? '';

/**
 * Checkout entry (M3 interim): resolves what the traveller picked from the query string and takes a booking request
 * that lands in the CRM. M4 replaces the request form with the 4-step checkout + payment gateways on this same URL.
 */
export default async function BookingPage({ params, searchParams }: PageProps<'/[lang]/booking'>) {
  const lang = (await params).lang as Lang;
  const sp = await searchParams;
  const i = await getI18n(lang);
  const t = i.t;
  const crumbs: Crumb[] = [[t('Home', 'হোম'), i.u('/')], [t('Checkout', 'চেকআউট'), i.u('/booking')]];
  const picked = KINDS.find(([k]) => one(sp[k]));
  const item = picked ? await api<{ data: { title?: string; name?: string; image?: Image; price?: number } }>(`${picked[1]}/${encodeURIComponent(one(sp[picked[0]]))}`, { lang, tags: [picked[1]], allow404: true }).then((r) => r?.data ?? null).catch(() => null) : null;
  const title = item?.title ?? item?.name ?? (one(sp.flight) ? `${t('Flight', 'ফ্লাইট')} ${one(sp.flight)}` : one(sp.gift) ? `${t('Gift card', 'গিফট কার্ড')} · ${i.bdt(Number(one(sp.amount)) || 0)}` : '');
  const facts: [string, string][] = [];
  const add = (k: string, label: string, fmt: (v: string) => string = (v) => v) => { const v = one(sp[k]); if (v) facts.push([label, fmt(v)]); };
  add('date', t('Travel date', 'ভ্রমণের তারিখ'), (v) => i.date(v));
  add('in', t('Check-in', 'চেক-ইন'), (v) => i.date(v));
  add('out', t('Check-out', 'চেক-আউট'), (v) => i.date(v));
  add('time', t('Time', 'সময়'));
  add('adults', t('Adults', 'প্রাপ্তবয়স্ক'), i.d);
  add('children', t('Children', 'শিশু'), i.d);
  add('rooms', t('Rooms', 'রুম'), i.d);
  add('cabin', t('Cabin', 'কেবিন'));
  const summary = [title, ...facts.map(([l, v]) => `${l}: ${v}`)].filter(Boolean).join(' · ');
  return (
    <>
      <PlainHero i={i} title={t('Secure checkout', 'নিরাপদ চেকআউট')} crumbs={crumbs} />
      <div className="wrap grid gap-8 py-8 lg:grid-cols-[1fr_380px]">
        <div className="min-w-0">
          <div className="mb-6 flex gap-3 rounded-2xl border border-brand-200 bg-brand-50 p-4 text-sm dark:border-brand-900 dark:bg-brand-950/40">
            <Icon name="info" className="mt-0.5 h-5 w-5 shrink-0 text-brand-700 dark:text-brand-300" />
            <p>{t('Send your booking request and a travel expert confirms availability and the final price within 30 minutes (9am–10pm). Nothing is charged now.', 'বুকিং অনুরোধ পাঠান — একজন ট্রাভেল এক্সপার্ট ৩০ মিনিটের মধ্যে (সকাল ৯টা–রাত ১০টা) প্রাপ্যতা ও চূড়ান্ত মূল্য নিশ্চিত করবেন। এখন কোনো টাকা কাটা হবে না।')}</p>
          </div>
          <InquiryForm type="quote" idPrefix="bk" className="card grid gap-4 p-5 sm:grid-cols-2 sm:p-7" submitClass="btn btn-primary btn-lg w-full sm:col-span-2"
            header={<h2 className="text-xl font-bold sm:col-span-2">{t('Traveller details', 'যাত্রীর তথ্য')}</h2>}
            submit={<><Icon name="send" className="h-5 w-5" /> {t('Send booking request', 'বুকিং অনুরোধ পাঠান')}</>}
            success={t('Request received! We will call you shortly to confirm.', 'অনুরোধ পেয়েছি! নিশ্চিত করতে শিগগিরই কল করব।')}
            extra={{ subject: t('Booking request', 'বুকিং অনুরোধ'), destination: title.slice(0, 120) || undefined, adults: Number(one(sp.adults)) || undefined, children: one(sp.children) ? Number(one(sp.children)) || 0 : undefined, travel_date: /^\d{4}-\d{2}-\d{2}$/.test(one(sp.date) || one(sp.in)) ? one(sp.date) || one(sp.in) : undefined, details: { booking: summary, query: new URLSearchParams(Object.entries(sp).map(([k, v]) => [k, one(v)])).toString() } }}
            fields={[
              { name: 'name', label: `${t('Full name (as on passport)', 'পূর্ণ নাম (পাসপোর্ট অনুযায়ী)')} *`, required: true, autoComplete: 'name' },
              { name: 'phone', label: `${t('Mobile', 'মোবাইল')} *`, type: 'tel', required: true, placeholder: '01XXXXXXXXX', autoComplete: 'tel' },
              { name: 'email', label: t('Email', 'ইমেইল'), type: 'email', autoComplete: 'email', full: true },
              { name: 'message', label: t('Special requests', 'বিশেষ অনুরোধ'), type: 'textarea', rows: 3, full: true },
            ]} />
        </div>
        <aside className="lg:sticky lg:top-24 lg:self-start">
          <div className="card p-5">
            <h2 className="font-bold">{t('Your selection', 'আপনার নির্বাচন')}</h2>
            {title ? (
              <div className="mt-4 flex gap-3">
                {item?.image ? <Picture img={item.image} alt="" sizes="112px" className="h-16 w-24 shrink-0 rounded-xl object-cover" width={112} height={80} /> : null}
                <div className="min-w-0"><p className="font-semibold">{title}</p>{item?.price ? <p className="mt-1 text-sm muted">{t('from', 'শুরু')} {i.bdt(item.price)}</p> : null}</div>
              </div>
            ) : <p className="mt-3 text-sm muted">{t('Nothing selected yet.', 'এখনো কিছু বাছাই করা হয়নি।')} <Link className="link" href={i.u('/tours')}>{t('Browse tours', 'ট্যুর দেখুন')}</Link></p>}
            {facts.length ? <dl className="mt-4 space-y-2 border-t border-ink-100 pt-4 text-sm dark:border-ink-800">{facts.map(([l, v]) => <div key={l} className="flex justify-between gap-3"><dt className="muted">{l}</dt><dd className="font-semibold">{v}</dd></div>)}</dl> : null}
            <p className="mt-4 flex items-center gap-2 text-xs muted"><Icon name="shield-check" className="h-4 w-4 text-brand-600" /> {t('IATA · ATAB · TOAB licensed agency', 'আইএটিএ · আটাব · টোয়াব লাইসেন্সপ্রাপ্ত এজেন্সি')}</p>
          </div>
        </aside>
      </div>
    </>
  );
}
