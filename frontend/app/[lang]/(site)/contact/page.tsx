import type { Metadata } from 'next';
import { Icon } from '@/components/icons/Icon';
import { InquiryForm } from '@/components/forms/QuoteForm';
import { PageHero, type Crumb } from '@/components/ui/basics';
import type { Lang } from '@/lib/format';
import { getI18n } from '@/lib/i18n';
import { getPage, pageMetadata } from '@/lib/page';
import { breadcrumbJsonLd, JsonLd } from '@/lib/seo';
import { getSite, siteUrl } from '@/lib/site';

export async function generateMetadata({ params }: PageProps<'/[lang]/contact'>): Promise<Metadata> {
  return pageMetadata((await params).lang as Lang, 'contact', '/contact');
}

/** Stylised office map (no third-party map tiles/cookies); "Open in Google Maps" uses the company geo setting. */
function OfficeMap({ label }: { label: string }) {
  return (
    <svg viewBox="0 0 600 340" className="h-auto w-full" role="img" aria-label={label}><rect width="600" height="340" fill="#E8F3F1" /><g stroke="#fff" strokeWidth="14" fill="none"><path d="M0 120 H600" /><path d="M0 250 C200 230 400 270 600 240" /><path d="M180 0 V340" /><path d="M420 0 C400 120 450 220 430 340" /></g><g stroke="#fff" strokeWidth="6" fill="none" opacity=".9"><path d="M0 60 H600" /><path d="M300 0 V340" /><path d="M0 190 H600" /><path d="M90 0 V340" /><path d="M520 0 V340" /></g><path d="M470 280 C520 270 560 300 600 290 V340 H440Z" fill="#A8E8DD" /><rect x="200" y="135" width="85" height="42" rx="6" fill="#CFE9E4" /><rect x="320" y="70" width="80" height="40" rx="6" fill="#D9EFD9" /><text x="243" y="161" fontSize="11" textAnchor="middle" fill="#356">Banani 11</text><text x="360" y="95" fontSize="11" textAnchor="middle" fill="#356">Gulshan 2</text><g transform="translate(300 150)"><circle r="34" fill="#0D6B65" opacity=".15" /><path d="M0 -36 C-16 -36 -24 -24 -24 -14 C-24 4 0 22 0 22 C0 22 24 4 24 -14 C24 -24 16 -36 0 -36Z" fill="#0D6B65" /><circle cy="-15" r="8" fill="#F6A33B" /></g></svg>
  );
}

export default async function ContactPage({ params }: PageProps<'/[lang]/contact'>) {
  const lang = (await params).lang as Lang;
  const [i, page, site] = await Promise.all([getI18n(lang), getPage('contact', lang), getSite(lang)]);
  const t = i.t;
  const d: any = page.data ?? {};
  const c: any = site.settings.company ?? {};
  const crumbs: Crumb[] = [[t('Home', 'হোম'), i.u('/')], [t('Contact', 'যোগাযোগ'), i.u('/contact')]];
  const base = siteUrl(site);
  const maps = c.geo ? `https://www.google.com/maps/search/?api=1&query=${c.geo.lat},${c.geo.lng}` : `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(c.address ?? '')}`;
  const ld = { '@context': 'https://schema.org', '@type': 'ContactPage', name: page.title, url: `${base}/${lang}/contact`, mainEntity: { '@type': 'TravelAgency', name: c.name, telephone: c.hotline_tel, email: c.email, address: { '@type': 'PostalAddress', streetAddress: c.address, addressLocality: 'Dhaka', addressCountry: 'BD' }, geo: c.geo ? { '@type': 'GeoCoordinates', latitude: c.geo.lat, longitude: c.geo.lng } : undefined } };
  const cards: [string, string, string, string][] = [
    ['phone', t('Hotline 24/7', 'হটলাইন ২৪/৭'), i.d(c.hotline), `tel:${c.hotline_tel}`],
    ['whatsapp', t('WhatsApp', 'হোয়াটসঅ্যাপ'), i.d(c.whatsapp), `https://wa.me/${c.whatsapp_number}`],
    ['mail', t('Email', 'ইমেইল'), c.email, `mailto:${c.email}`],
    ['calendar-clock', t('Book a video call', 'ভিডিও কলে পরামর্শ'), d.video_call ?? '', '#contact-form'],
  ];
  const topics: string[] = d.topics ?? [];
  return (
    <>
      <JsonLd data={breadcrumbJsonLd(base, crumbs)} />
      <JsonLd data={ld} />
      <PageHero i={i} title={page.title} sub={page.subtitle} crumbs={crumbs} image={page.image} />
      <section className="relative -mt-10"><div className="wrap grid gap-4 sm:grid-cols-2 lg:grid-cols-4">{cards.map(([ic, a, b, h]) => (
        <a key={ic} href={h} className="card card-hover flex items-center gap-4 p-5" {...(h.startsWith('http') ? { target: '_blank', rel: 'noopener noreferrer' } : {})}><span className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-brand-700 text-white"><Icon name={ic} className="h-5 w-5" /></span><span className="min-w-0"><span className="block text-sm muted">{a}</span><span className="block truncate font-bold">{b}</span></span></a>
      ))}</div></section>
      <section className="section"><div className="wrap grid gap-10 lg:grid-cols-[1.1fr_1fr]">
        <div id="contact-form" className="scroll-mt-28">
          <InquiryForm type="contact" idPrefix="c" className="card grid gap-4 p-6 sm:grid-cols-2 sm:p-8" submitClass="btn btn-primary btn-lg w-full justify-self-start sm:col-span-2 sm:w-auto"
            header={<h2 className="text-2xl font-bold sm:col-span-2">{d.form_title ?? t('Send us a message', 'আমাদের বার্তা পাঠান')}</h2>}
            submit={<><Icon name="send" className="h-5 w-5" /> {t('Send message', 'বার্তা পাঠান')}</>} success={d.success ?? ''}
            fields={[
              { name: 'name', label: `${t('Full name', 'পূর্ণ নাম')} *`, required: true, autoComplete: 'name' },
              { name: 'phone', label: `${t('Mobile', 'মোবাইল')} *`, type: 'tel', required: true, placeholder: '01XXXXXXXXX', autoComplete: 'tel' },
              { name: 'email', label: t('Email', 'ইমেইল'), type: 'email', autoComplete: 'email' },
              ...(topics.length ? [{ name: 'subject', label: t('Topic', 'বিষয়'), type: 'select' as const, options: topics.map((x) => ({ value: x, label: x })) }] : []),
              { name: 'message', label: `${t('Message', 'বার্তা')} *`, type: 'textarea', rows: 5, required: true, full: true },
              { name: 'wa', label: '', cls: 'sm:col-span-2', node: <label className="flex items-start gap-2.5 text-sm"><input type="checkbox" name="details.whatsapp_updates" value="yes" className="check mt-0.5" /> {t('Send me WhatsApp updates about this request', 'এই অনুরোধ সম্পর্কে হোয়াটসঅ্যাপে আপডেট পাঠান')}</label> },
            ]} />
        </div>
        <div className="space-y-6">
          <figure className="overflow-hidden rounded-3xl border border-ink-100 dark:border-ink-800">
            <OfficeMap label={t('Map: Musafir head office, Banani, Dhaka', 'ম্যাপ: মুসাফির প্রধান কার্যালয়, বনানী, ঢাকা')} />
            <figcaption className="flex flex-wrap items-center justify-between gap-3 p-4 text-sm"><span className="flex items-start gap-2"><Icon name="map-pin" className="mt-0.5 h-4 w-4 shrink-0 text-brand-600" /> {c.address}</span><a className="link font-semibold" href={maps} target="_blank" rel="noopener noreferrer">{t('Open in Google Maps', 'গুগল ম্যাপে খুলুন')}</a></figcaption>
          </figure>
          <div className="card p-6"><h2 className="text-lg font-bold">{t('Branches', 'শাখা')}</h2><ul className="mt-3 space-y-3 text-sm">{(c.branches ?? []).map((b: string) => <li key={b} className="flex gap-2"><Icon name="building-2" className="h-4 w-4 shrink-0 text-brand-600" /> {b}</li>)}</ul><p className="mt-4 flex gap-2 border-t border-ink-100 pt-4 text-sm dark:border-ink-800"><Icon name="clock" className="h-4 w-4 shrink-0 text-brand-600" /> {c.hours}</p></div>
        </div>
      </div></section>
    </>
  );
}
