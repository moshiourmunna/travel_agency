import 'server-only';
import type { Metadata } from 'next';
import type { Lang } from '@/lib/format';
import { getI18n, type I18n } from '@/lib/i18n';
import { pathMetadata } from '@/lib/page';
import { AccountCrumbs } from './Shell';
import { PageHead } from './ui';

/** Portal page titles + intros (same copy as the mockup's pages_account.PAGES). Admin SEO rows keyed by path can override the <title>. */
export const PAGES: Record<string, [[string, string], [string, string]]> = {
  index: [['My account', 'মাই অ্যাকাউন্ট'], ['Your trips, payments, visas and Miles in one place.', 'আপনার ট্রিপ, পেমেন্ট, ভিসা ও মাইলস এক জায়গায়।']],
  bookings: [['My bookings', 'আমার বুকিং'], ['Upcoming, completed and cancelled bookings.', 'আসন্ন, সম্পন্ন ও বাতিল বুকিং।']],
  visa: [['Visa tracker', 'ভিসা ট্র্যাকার'], ['Track every visa application stage by stage.', 'প্রতিটি ভিসা আবেদনের ধাপ ট্র্যাক করুন।']],
  trips: [['Saved trips & wishlist', 'সংরক্ষিত ট্রিপ ও উইশলিস্ট'], ['Plans from the trip planner and saved packages.', 'ট্রিপ প্ল্যানারের পরিকল্পনা ও সংরক্ষিত প্যাকেজ।']],
  wallet: [['Wallet & Miles', 'ওয়ালেট ও মাইলস'], ['Wallet balance, Musafir Miles and membership tier.', 'ওয়ালেট ব্যালান্স, মুসাফির মাইলস ও সদস্য স্তর।']],
  payments: [['Payments & instalments', 'পেমেন্ট ও কিস্তি'], ['Instalment plans, receipts and saved payment methods.', 'কিস্তি পরিকল্পনা, রসিদ ও সংরক্ষিত পেমেন্ট মাধ্যম।']],
  referrals: [['Refer & earn', 'রেফার করে আয়'], ['Invite friends and earn wallet credit.', 'বন্ধুদের আমন্ত্রণ জানিয়ে ওয়ালেট ক্রেডিট পান।']],
  travellers: [['Travellers & passports', 'ভ্রমণকারী ও পাসপোর্ট'], ['Saved co-travellers and passport details.', 'সংরক্ষিত সহযাত্রী ও পাসপোর্টের তথ্য।']],
  notifications: [['Notifications', 'নোটিফিকেশন'], ['Trip alerts, payment reminders and offers.', 'ট্রিপ অ্যালার্ট, পেমেন্ট রিমাইন্ডার ও অফার।']],
  support: [['Help & support', 'সাহায্য ও সাপোর্ট'], ['Support tickets and chat with your travel expert.', 'সাপোর্ট টিকিট ও ট্রাভেল এক্সপার্টের সাথে চ্যাট।']],
  reviews: [['My reviews', 'আমার রিভিউ'], ['Reviews you wrote and trips waiting for a review.', 'আপনার লেখা রিভিউ ও রিভিউয়ের অপেক্ষায় থাকা ট্রিপ।']],
  profile: [['Profile', 'প্রোফাইল'], ['Personal details and contact information.', 'ব্যক্তিগত ও যোগাযোগের তথ্য।']],
  settings: [['Settings & security', 'সেটিংস ও নিরাপত্তা'], ['Password, two-step sign-in, preferences and privacy.', 'পাসওয়ার্ড, টু-স্টেপ সাইন-ইন, পছন্দ ও গোপনীয়তা।']],
};

export const accountPath = (key: string) => (key === 'index' ? '/account' : `/account/${key}`);

/** generateMetadata for a portal page (always noindex). */
export const accountMetadata = (key: string) => async ({ params }: { params: Promise<{ lang: string }> }): Promise<Metadata> => {
  const lang = (await params).lang as Lang;
  const i = await getI18n(lang);
  return pathMetadata(lang, accountPath(key), i.t(...PAGES[key][0]), { noindex: true });
};

export async function accountCtx(params: Promise<{ lang: string }>) {
  const lang = (await params).lang as Lang;
  return { lang, i: await getI18n(lang) };
}

/** Breadcrumb + H1 + intro, like the mockup's crumbs_ui + page_head. */
export function AccountHead({ i, k, title, sub, parents = [], children }: { i: I18n; k: string; title?: string; sub?: string | null; parents?: [string, string][]; children?: React.ReactNode }) {
  const [tt, ss] = PAGES[k] ?? [null, null];
  const name = title ?? (tt ? i.t(...tt) : '');
  return (
    <>
      <AccountCrumbs i={i} items={[[i.t('My account', 'মাই অ্যাকাউন্ট'), '/account'], ...parents, [name, accountPath(k)]].filter((_, n) => !(k === 'index' && n > 0)) as [string, string][]} />
      <PageHead title={name} sub={sub === undefined ? (ss ? i.t(...ss) : null) : sub}>{children}</PageHead>
    </>
  );
}

/** "2 hours ago" / "3 days ago" (then the date) in the visitor's language. */
export function ago(i: I18n, iso: string | null | undefined): string {
  if (!iso) return '';
  const s = Math.max(0, (Date.now() - new Date(iso).getTime()) / 1000);
  const { t, d } = i;
  if (s < 60) return t('Just now', 'এইমাত্র');
  if (s < 3600) return `${d(Math.floor(s / 60))} ${t('min ago', 'মিনিট আগে')}`;
  if (s < 86400) { const h = Math.floor(s / 3600); return `${d(h)} ${h === 1 ? t('hour ago', 'ঘণ্টা আগে') : t('hours ago', 'ঘণ্টা আগে')}`; }
  if (s < 2 * 86400) return t('Yesterday', 'গতকাল');
  if (s < 7 * 86400) return `${d(Math.floor(s / 86400))} ${t('days ago', 'দিন আগে')}`;
  return i.date(iso.slice(0, 10), 'short');
}

/** Where "Manage" goes for a booking card (mockup: tour → booking, flight → e-ticket, visa → tracker). */
export const manageHref = (b: { ref: string; kind: string }) => (b.kind === 'visa' ? '/account/visa' : b.kind === 'flight' ? `/account/bookings/${b.ref}/ticket` : `/account/bookings/${b.ref}`);

/** Gateway names for portal pay / top-up forms (codes come from the API's enabled list). */
export function gatewayOptions(i: I18n, codes: string[]) {
  const { t } = i;
  const M: Record<string, [string, string]> = {
    bkash: ['bKash', t('Mobile wallet', 'মোবাইল ওয়ালেট')], nagad: [t('Nagad', 'নগদ'), t('Mobile wallet', 'মোবাইল ওয়ালেট')],
    sslcommerz: [t('Card / net banking', 'কার্ড / নেট ব্যাংকিং'), 'Visa · Mastercard · Amex'], bank_transfer: [t('Bank transfer', 'ব্যাংক ট্রান্সফার'), t('Verified within 1 working day', '১ কর্মদিবসে যাচাই')],
    mock: [t('Test gateway', 'টেস্ট গেটওয়ে'), t('Sandbox — no real money', 'স্যান্ডবক্স — আসল টাকা নয়')],
  };
  return codes.filter((c) => c !== 'wallet').map((c) => ({ code: c, label: M[c]?.[0] ?? c, sub: M[c]?.[1] }));
}

export const payLabels = (i: I18n) => ({
  choose: i.t('Pay with', 'পরিশোধের মাধ্যম'), pay: i.t('Pay', 'পরিশোধ করুন'), secure: i.t('Secure payment · amounts are confirmed by our server', 'নিরাপদ পেমেন্ট · অঙ্ক আমাদের সার্ভারে নিশ্চিত হয়'),
  slip: i.t('Transfer reference / slip no.', 'ট্রান্সফার রেফারেন্স / স্লিপ নং'), slipHint: i.t('Enter the reference printed on your bank slip.', 'ব্যাংক স্লিপে থাকা রেফারেন্স লিখুন।'),
  sent: i.t('Transfer reported — we will confirm within 1 working day.', 'ট্রান্সফার জমা হয়েছে — ১ কর্মদিবসে নিশ্চিত করা হবে।'), noWallet: i.t('Balance too low', 'ব্যালান্স যথেষ্ট নয়'),
});
