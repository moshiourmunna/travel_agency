import type { Metadata } from 'next';
import { Icon } from '@/components/icons/Icon';
import { TripPlanner, type PlannerConfig } from '@/components/planner/TripPlanner';
import { PageHero, type Crumb } from '@/components/ui/basics';
import { apiData } from '@/lib/api';
import type { Lang } from '@/lib/format';
import { getI18n } from '@/lib/i18n';
import { getPage, pageMetadata } from '@/lib/page';
import { breadcrumbJsonLd, JsonLd } from '@/lib/seo';
import { getSite, siteUrl } from '@/lib/site';

export async function generateMetadata({ params }: PageProps<'/[lang]/trip-planner'>): Promise<Metadata> {
  return pageMetadata((await params).lang as Lang, 'trip-planner', '/trip-planner');
}

export default async function TripPlannerPage({ params }: PageProps<'/[lang]/trip-planner'>) {
  const lang = (await params).lang as Lang;
  const [i, page, cfg, themes, site] = await Promise.all([
    getI18n(lang), getPage('trip-planner', lang), apiData<PlannerConfig>('planner/config', { lang, tags: ['planner', 'destinations', 'activities'] }),
    apiData<any[]>('themes', { lang, tags: ['themes'] }), getSite(lang),
  ]);
  const t = i.t;
  const crumbs: Crumb[] = [[t('Home', 'হোম'), i.u('/')], [t('Trip planner', 'ট্রিপ প্ল্যানার'), i.u('/trip-planner')]];
  const now = Date.now() + 6 * 3600e3;
  const today = new Date(now).toISOString().slice(0, 10);
  const defaultStart = new Date(now + 53 * 864e5).toISOString().slice(0, 10);
  const interests = (
    <fieldset className="mt-5"><legend className="label">{t('Interests (optional)', 'আগ্রহ (ঐচ্ছিক)')}</legend><div className="flex flex-wrap gap-2">{themes.map((th) => (
      <label key={th.slug} className="chip relative cursor-pointer has-[:checked]:border-brand-700 has-[:checked]:bg-brand-700 has-[:checked]:text-white has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-brand-400"><input type="checkbox" className="sr-only" name="pint" value={th.slug} /><Icon name={th.icon} className="h-4 w-4" /> {th.name}</label>
    ))}</div></fieldset>
  );
  const app = { '@context': 'https://schema.org', '@type': 'WebApplication', name: page.title, description: page.subtitle, applicationCategory: 'TravelApplication', operatingSystem: 'Any', offers: { '@type': 'Offer', price: 0, priceCurrency: 'BDT' }, url: `${siteUrl(site)}/${lang}/trip-planner` };
  return (
    <>
      <JsonLd data={breadcrumbJsonLd(siteUrl(site), crumbs)} />
      <JsonLd data={app} />
      <PageHero i={i} title={page.title} sub={page.subtitle} crumbs={crumbs} image={page.image} />
      <TripPlanner cfg={cfg} today={today} defaultStart={defaultStart} interests={interests}
        icons={{ check: <Icon name="check" className="h-4 w-4" />, send: <Icon name="send" className="h-5 w-5" />, bookmark: <Icon name="bookmark" className="h-4 w-4" />, x: <Icon name="x" /> }}
        l={{
          step1: t('Where do you want to go?', 'কোথায় যেতে চান?'), step1sub: t('Choose up to 4 — combine Bangladesh and abroad if you like.', 'সর্বোচ্চ ৪টি বাছুন — চাইলে দেশ-বিদেশ মিলিয়ে।'),
          step2: t('How many days in each place?', 'প্রতিটি জায়গায় কত দিন?'), step3: t('Who, when and what style?', 'কে, কবে ও কোন ধরনের?'),
          step4: t('Add experiences', 'অভিজ্ঞতা যোগ করুন'), step4sub: t('Suggestions update for the places you picked.', 'আপনার বাছাই করা জায়গা অনুযায়ী পরামর্শ বদলায়।'),
          from: t('from', 'শুরু'), day: t('Day', 'দিন'), days: t('days', 'দিন'), places: t('places', 'জায়গা'), person: t('person', 'জন'),
          none: t('Pick at least one destination to start.', 'শুরু করতে অন্তত একটি গন্তব্য বাছুন।'), max: t('Up to 4 destinations per plan', 'প্রতি প্ল্যানে সর্বোচ্চ ৪টি গন্তব্য'),
          less: t('Fewer days', 'দিন কমান'), more: t('More days', 'দিন বাড়ান'), arrive: t('Arrive & check in', 'পৌঁছানো ও চেক-ইন'), explore: t('Explore', 'ঘুরে দেখা'), fly: t('Fly home', 'দেশে ফেরা'),
          start: t('Start date', 'শুরুর তারিখ'), adults: t('Adults', 'প্রাপ্তবয়স্ক'), children: t('Children', 'শিশু'), tierLegend: t('Hotel & comfort level', 'হোটেল ও আরামের স্তর'),
          yourTrip: t('Your trip', 'আপনার ট্রিপ'), air: t('Flights (est.)', 'ফ্লাইট (আনুমানিক)'), land: t('Hotels, transfers & guide', 'হোটেল, ট্রান্সফার ও গাইড'), acts: t('Experiences', 'অভিজ্ঞতা'),
          total: t('Estimated total', 'আনুমানিক মোট'), pp: t('Per person', 'জনপ্রতি'), quote: t('Get a free quote', 'ফ্রি কোটেশন নিন'), save: t('Save plan', 'প্ল্যান সেভ করুন'),
          saved: t('Plan saved on this device', 'প্ল্যান এই ডিভাইসে সেভ হয়েছে'), disclaimer: t('Estimates only — final price depends on dates & availability.', 'শুধু আনুমানিক — চূড়ান্ত মূল্য তারিখ ও প্রাপ্যতার উপর নির্ভর করে।'),
          dlgTitle: t('Request your custom quote', 'কাস্টম কোটেশনের অনুরোধ'), close: t('Close', 'বন্ধ'), name: t('Full name', 'পূর্ণ নাম'), mobile: t('Mobile', 'মোবাইল'), email: t('Email', 'ইমেইল'),
          note: t('Anything else?', 'আর কিছু?'), notePh: t('Dietary needs, celebrations, visa help…', 'খাবারের চাহিদা, বিশেষ উদযাপন, ভিসা সহায়তা…'), send: t('Send request', 'অনুরোধ পাঠান'),
          sent: t('Request sent! Reference', 'অনুরোধ পাঠানো হয়েছে! রেফারেন্স'), required: t('Required', 'আবশ্যক'), phoneBad: t('Enter a valid Bangladeshi mobile number.', 'সঠিক বাংলাদেশি মোবাইল নম্বর দিন।'),
          emailBad: t('Enter a valid email address.', 'সঠিক ইমেইল ঠিকানা দিন।'), failed: t('Something went wrong. Please try again.', 'কিছু ভুল হয়েছে। আবার চেষ্টা করুন।'),
        }} />
    </>
  );
}
