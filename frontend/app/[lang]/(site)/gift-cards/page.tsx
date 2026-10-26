import type { Metadata } from 'next';
import { Icon } from '@/components/icons/Icon';
import { GiftCardForm } from '@/components/forms/GiftCardForm';
import { PageHero, type Crumb } from '@/components/ui/basics';
import { apiData } from '@/lib/api';
import type { Lang } from '@/lib/format';
import { getI18n } from '@/lib/i18n';
import { getPage, pageMetadata } from '@/lib/page';
import { breadcrumbJsonLd, JsonLd } from '@/lib/seo';
import { getSite, siteUrl } from '@/lib/site';

export async function generateMetadata({ params }: PageProps<'/[lang]/gift-cards'>): Promise<Metadata> {
  return pageMetadata((await params).lang as Lang, 'gift-cards', '/gift-cards');
}

export default async function GiftCardsPage({ params }: PageProps<'/[lang]/gift-cards'>) {
  const lang = (await params).lang as Lang;
  const [i, page, designs, site] = await Promise.all([getI18n(lang), getPage('gift-cards', lang), apiData<any[]>('gift-card-designs', { lang, tags: ['gift-cards'] }), getSite(lang)]);
  const t = i.t;
  const crumbs: Crumb[] = [[t('Home', 'হোম'), i.u('/')], [t('Gift cards', 'গিফট কার্ড'), i.u('/gift-cards')]];
  return (
    <>
      <JsonLd data={breadcrumbJsonLd(siteUrl(site), crumbs)} />
      <PageHero i={i} title={page.title} sub={page.subtitle} crumbs={crumbs} image={page.image} />
      <section className="section"><div className="wrap">
        <GiftCardForm designs={designs.map((d) => ({ code: d.code, name: d.name, gradient: d.gradient, amounts: d.amounts }))} booking={i.u('/booking')} today={new Date(Date.now() + 6 * 3600e3).toISOString().slice(0, 10)} logo="/brand/icon-white.svg" icon={<Icon name="gift" className="h-5 w-5" />}
          l={{ brand: t('Musafir gift card', 'মুসাফির গিফট কার্ড'), forWho: t('For someone special', 'বিশেষ কারো জন্য'), note: t('Delivered instantly by email & SMS with a printable PDF.', 'ইমেইল ও এসএমএসে তাৎক্ষণিক, প্রিন্টযোগ্য পিডিএফসহ।'), amount: t('Amount', 'পরিমাণ'), design: t('Design', 'ডিজাইন'), to: `${t('Recipient name', 'প্রাপকের নাম')} *`, email: `${t('Recipient email', 'প্রাপকের ইমেইল')} *`, message: t('Message', 'বার্তা'), date: t('Send on', 'পাঠানোর তারিখ'), buy: t('Buy gift card', 'গিফট কার্ড কিনুন'), required: t('Required', 'আবশ্যক'), emailBad: t('Enter a valid email address.', 'সঠিক ইমেইল ঠিকানা দিন।') }} />
      </div></section>
    </>
  );
}
