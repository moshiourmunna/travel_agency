import type { Metadata } from 'next';
import { FaqFilter } from '@/components/client/FaqFilter';
import { Icon } from '@/components/icons/Icon';
import { PageHero, type Crumb } from '@/components/ui/basics';
import { api } from '@/lib/api';
import type { Lang } from '@/lib/format';
import { getI18n } from '@/lib/i18n';
import { getPage, pageMetadata } from '@/lib/page';
import { breadcrumbJsonLd, JsonLd } from '@/lib/seo';
import { getSite, siteUrl } from '@/lib/site';

export async function generateMetadata({ params }: PageProps<'/[lang]/faq'>): Promise<Metadata> {
  return pageMetadata((await params).lang as Lang, 'faq', '/faq');
}

export default async function FaqPage({ params }: PageProps<'/[lang]/faq'>) {
  const lang = (await params).lang as Lang;
  const [i, page, res, site] = await Promise.all([getI18n(lang), getPage('faq', lang), api<{ data: any[]; meta: any }>('faqs', { lang, tags: ['faqs'], query: { show_on: 'faq' } }), getSite(lang)]);
  const t = i.t;
  const c: any = site.settings.company ?? {};
  const crumbs: Crumb[] = [[t('Home', 'হোম'), i.u('/')], [t('FAQ', 'প্রশ্নোত্তর'), i.u('/faq')]];
  const cats = (res.meta.categories ?? []).filter((x: any) => res.data.some((f) => f.category === x.slug));
  const ld = { '@context': 'https://schema.org', '@type': 'FAQPage', mainEntity: res.data.map((f) => ({ '@type': 'Question', name: f.q, acceptedAnswer: { '@type': 'Answer', text: f.a } })) };
  const short: Record<string, string> = { payment: t('Payments', 'পেমেন্ট') };
  return (
    <>
      <JsonLd data={breadcrumbJsonLd(siteUrl(site), crumbs)} />
      <JsonLd data={ld} />
      <PageHero i={i} title={page.title} sub={page.subtitle} crumbs={crumbs} image={page.image} />
      <section className="section"><div className="wrap max-w-4xl">
        <FaqFilter target="#faq-list" label={t('Search questions', 'প্রশ্ন খুঁজুন')} placeholder={t('Try “refund”, “EMI” or “visa”…', 'লিখুন “রিফান্ড”, “ইএমআই” বা “ভিসা”…')} topicsLabel={t('Topics', 'বিষয়')} icon={<Icon name="search" className="h-5 w-5" />}
          topics={[{ value: 'all', label: t('All', 'সব') }, ...cats.map((x: any) => ({ value: x.slug, label: short[x.slug] ?? x.name }))]} />
        <div id="faq-list" className="mt-8 divide-y divide-ink-100 overflow-hidden rounded-2xl border border-ink-100 bg-white dark:divide-ink-800 dark:border-ink-800 dark:bg-ink-900">
          {res.data.map((f, k) => (
            <details key={f.id} className="group" data-item data-cats={f.category ?? ''} data-title={`${f.q} ${f.a}`} open={k === 0}>
              <summary className="flex cursor-pointer list-none items-center justify-between gap-4 p-5 font-semibold">{f.q}<span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-ink-50 transition group-open:rotate-45 dark:bg-ink-800"><Icon name="plus" className="h-4 w-4" /></span></summary>
              <div className="px-5 pb-5 text-ink-600 dark:text-ink-300">{f.a}</div>
            </details>
          ))}
        </div>
        <p data-faq-empty hidden className="mt-6 text-center muted">{t('No matching questions — ask us directly.', 'মিল পাওয়া যায়নি — সরাসরি জিজ্ঞেস করুন।')}</p>
        <div className="mt-10 grid gap-4 sm:grid-cols-3">
          <a href="#chat" data-open-chat className="card card-hover flex items-center gap-3 p-4 font-semibold"><Icon name="message-circle" className="h-5 w-5 text-brand-600" /> {t('Live chat', 'লাইভ চ্যাট')}</a>
          <a href={`tel:${c.hotline_tel}`} className="card card-hover flex items-center gap-3 p-4 font-semibold"><Icon name="phone" className="h-5 w-5 text-brand-600" /> {t('Call hotline', 'হটলাইনে কল')}</a>
          <a href={`mailto:${c.email}`} className="card card-hover flex items-center gap-3 p-4 font-semibold"><Icon name="mail" className="h-5 w-5 text-brand-600" /> {t('Email support', 'ইমেইল সাপোর্ট')}</a>
        </div>
      </div></section>
    </>
  );
}
