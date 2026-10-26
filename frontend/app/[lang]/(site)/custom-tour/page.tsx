import type { Metadata } from 'next';
import Link from 'next/link';
import { Icon } from '@/components/icons/Icon';
import { InquiryForm } from '@/components/forms/QuoteForm';
import { PageHero, type Crumb } from '@/components/ui/basics';
import { apiData } from '@/lib/api';
import type { Lang } from '@/lib/format';
import { getI18n } from '@/lib/i18n';
import { getPage, pageMetadata } from '@/lib/page';
import { breadcrumbJsonLd, JsonLd } from '@/lib/seo';
import { getSite, siteUrl } from '@/lib/site';

export async function generateMetadata({ params }: PageProps<'/[lang]/custom-tour'>): Promise<Metadata> {
  return pageMetadata((await params).lang as Lang, 'custom-tour', '/custom-tour');
}

export default async function CustomTourPage({ params }: PageProps<'/[lang]/custom-tour'>) {
  const lang = (await params).lang as Lang;
  const [i, page, themes, dests, site] = await Promise.all([
    getI18n(lang), getPage('custom-tour', lang), apiData<any[]>('themes', { lang, tags: ['themes'] }),
    apiData<any[]>('destinations', { lang, tags: ['destinations'], query: { per_page: 100 } }), getSite(lang),
  ]);
  const t = i.t;
  const d: any = page.data ?? {};
  const crumbs: Crumb[] = [[t('Home', 'হোম'), i.u('/')], [t('Custom trip', 'কাস্টম ট্রিপ'), i.u('/custom-tour')]];
  const now = new Date(Date.now() + 6 * 3600e3);
  const month = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 3, 1)).toISOString().slice(0, 7);
  const budgets: string[] = d.budgets ?? [];
  const style = (
    <fieldset><legend className="label">{t('Trip style', 'ট্রিপের ধরন')}</legend><div className="flex flex-wrap gap-2">{themes.map((th) => (
      <label key={th.slug} className="chip relative cursor-pointer has-[:checked]:border-brand-700 has-[:checked]:bg-brand-700 has-[:checked]:text-white has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-brand-400"><input type="checkbox" name="interests[]" value={th.slug} className="sr-only" /><Icon name={th.icon} className="h-4 w-4" /> {th.name}</label>
    ))}</div></fieldset>
  );
  return (
    <>
      <JsonLd data={breadcrumbJsonLd(siteUrl(site), crumbs)} />
      <PageHero i={i} title={page.title} sub={page.subtitle} crumbs={crumbs} image={page.image} />
      <section className="section"><div className="wrap grid gap-10 lg:grid-cols-[1.3fr_1fr]">
        <div>
          <datalist id="ct-dl">{dests.map((x) => <option key={x.slug} value={x.name} />)}</datalist>
          <InquiryForm type="custom-tour" idPrefix="ct" className="card grid grid-cols-6 gap-x-4 gap-y-5 p-6 sm:p-8 [&>*]:col-span-6" submitClass="btn btn-primary btn-lg justify-self-start"
            header={<h2 className="text-2xl font-bold">{d.form_title ?? t('Your trip request', 'আপনার ট্রিপ অনুরোধ')}</h2>}
            submit={<><Icon name="send" className="h-5 w-5" /> {t('Request my itinerary', 'ভ্রমণসূচির অনুরোধ পাঠান')}</>} success={t('Request received!', 'অনুরোধ পেয়েছি!')}
            done={{ icon: <Icon name="check" className="h-8 w-8" />, title: t('Thank you!', 'ধন্যবাদ!'), text: d.success }}
            fields={[
              { name: 'destination', label: `${t('Where to?', 'কোথায়?')} *`, required: true, list: 'ct-dl', placeholder: t('e.g. Japan, Bali + Singapore', 'যেমন জাপান, বালি + সিঙ্গাপুর'), cls: 'sm:!col-span-3' },
              { name: 'travel_month', label: t('Approx. month', 'আনুমানিক মাস'), type: 'month', defaultValue: month, cls: 'sm:!col-span-3' },
              { name: 'details.days', label: t('Days', 'দিন'), type: 'number', min: 2, max: 45, defaultValue: '7', cls: '!col-span-2' },
              { name: 'adults', label: t('Adults', 'প্রাপ্তবয়স্ক'), type: 'number', min: 1, max: 99, defaultValue: '2', cls: '!col-span-2' },
              { name: 'children', label: t('Children', 'শিশু'), type: 'number', min: 0, max: 20, defaultValue: '0', cls: '!col-span-2' },
              ...(budgets.length ? [{ name: 'details.budget', label: t('Budget per person', 'জনপ্রতি বাজেট'), type: 'select' as const, options: budgets.map((b) => ({ value: b, label: b })), defaultValue: budgets[1] ?? budgets[0] }] : []),
              { name: 'style', label: '', node: style },
              { name: 'name', label: `${t('Full name', 'পূর্ণ নাম')} *`, required: true, autoComplete: 'name', cls: 'sm:!col-span-3' },
              { name: 'phone', label: `${t('Mobile', 'মোবাইল')} *`, type: 'tel', required: true, placeholder: '01XXXXXXXXX', autoComplete: 'tel', cls: 'sm:!col-span-3' },
              { name: 'message', label: t('Anything else?', 'আর কিছু?'), type: 'textarea', rows: 3 },
            ]} />
        </div>
        <aside className="space-y-4">
          <div className="card p-6"><h2 className="font-bold">{d.planner_title}</h2><p className="mt-1 text-sm muted">{d.planner_text}</p><Link href={i.u('/trip-planner')} className="btn btn-outline btn-sm mt-4"><Icon name="route" className="h-4 w-4" /> {t('Open trip planner', 'ট্রিপ প্ল্যানার খুলুন')}</Link></div>
          {d.perks?.length ? <ul className="card space-y-3 p-6 text-sm">{d.perks.map((p: string, k: number) => <li key={k} className="flex gap-2"><Icon name="check" className="h-4 w-4 shrink-0 text-brand-600" /> {p}</li>)}</ul> : null}
        </aside>
      </div></section>
    </>
  );
}
