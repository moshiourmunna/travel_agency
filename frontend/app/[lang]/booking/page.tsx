import type { Metadata } from 'next';
import Link from 'next/link';
import { Checkout, type CheckoutL, type Quote, type Sel } from '@/components/checkout/Checkout';
import { Icon } from '@/components/icons/Icon';
import { PlainHero, type Crumb } from '@/components/ui/basics';
import { apiFresh, apiPost } from '@/lib/api';
import type { Lang } from '@/lib/format';
import { getI18n, type I18n } from '@/lib/i18n';
import { pathMetadata } from '@/lib/page';
import { authHeaders } from '@/lib/session';
import { getSite } from '@/lib/site';

export const dynamic = 'force-dynamic';

export async function generateMetadata({ params }: PageProps<'/[lang]/booking'>): Promise<Metadata> {
  const lang = (await params).lang as Lang;
  return pathMetadata(lang, '/booking', lang === 'bn' ? 'নিরাপদ চেকআউট' : 'Secure checkout', { noindex: true });
}

type SP = Record<string, string | string[] | undefined>;
const one = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v) ?? '';
const many = (sp: SP, k: string) => [sp[k], sp[`${k}[]`]].flat().filter((x): x is string => typeof x === 'string' && x !== '');
const back: Record<string, string> = { tour: '/tours', cruise: '/cruises', activity: '/activities', hotel: '/hotels', flight: '/flights', visa: '/visa', gift_card: '/gift-cards' };

/** Translate the product the traveller picked (query string from the booking cards) into a checkout selection. */
function selection(sp: SP): Sel | null {
  const n = (k: string) => (one(sp[k]) ? Number(one(sp[k])) : undefined);
  if (one(sp.tour)) return { kind: 'tour', slug: one(sp.tour), date: one(sp.date) || undefined, room: one(sp.room) || undefined, adults: n('adults') ?? 2, children: n('children') ?? 0, infants: n('infants') ?? 0, addons: many(sp, 'addons') };
  if (one(sp.cruise)) return { kind: 'cruise', slug: one(sp.cruise), date: one(sp.date) || undefined, cabin: one(sp.cabin) || undefined, adults: n('adults') ?? 2, addons: many(sp, 'addons') };
  if (one(sp.activity)) return { kind: 'activity', slug: one(sp.activity), date: one(sp.date) || undefined, time: one(sp.time) || undefined, option: n('option'), adults: n('adults') ?? 2, children: n('children') ?? 0 };
  if (one(sp.hotel)) return { kind: 'hotel', slug: one(sp.hotel), in: one(sp.in) || undefined, out: one(sp.out) || undefined, room: one(sp.room) || undefined, rooms: n('rooms') ?? 1, addons: many(sp, 'addons') };
  if (one(sp.flight)) return { kind: 'flight', flight: n('flight'), date: one(sp.date) || undefined, return: one(sp.return) || undefined, pax: one(sp.pax) || '1', cabin: one(sp.cabin) || 'economy' };
  if (one(sp.visa)) return { kind: 'visa', slug: one(sp.visa), adults: n('adults') ?? 1 };
  if (one(sp.gift)) return { kind: 'gift_card', gift: one(sp.gift), amount: n('amount'), to: one(sp.to) || undefined, email: one(sp.email) || undefined, message: one(sp.message) || undefined, send_on: one(sp.send_on) || undefined };
  return null;
}

function labels(i: I18n, site: any): CheckoutL {
  const t = i.t;
  const bank = site?.settings?.payments?.bank_details;
  return {
    step: t('Step', 'ধাপ'), ssl: t('256-bit SSL', '২৫৬-বিট SSL'), stepsLabel: t('Checkout steps', 'চেকআউটের ধাপ'),
    stepTrip: t('Trip', 'ট্রিপ'), stepTravellers: t('Travellers', 'যাত্রী'), stepExtras: t('Extras', 'অতিরিক্ত'), stepPayment: t('Payment', 'পেমেন্ট'),
    reviewTrip: t('Review your trip', 'আপনার ট্রিপ দেখে নিন'), change: t('Change', 'পরিবর্তন'), travelDate: t('Travel date', 'ভ্রমণের তারিখ'), sailing: t('Sailing date', 'যাত্রার তারিখ'),
    room: t('Room', 'রুম'), cabin: t('Cabin', 'কেবিন'), time: t('Time', 'সময়'), option: t('Option', 'অপশন'), standard: t('Standard', 'স্ট্যান্ডার্ড'),
    noSlots: t('No times on this date', 'এই তারিখে কোনো সময় নেই'), soldOut: t('sold out', 'বিক্রি শেষ'), left: t('left', 'বাকি'), seatsLeft: t('seats left', 'সিট বাকি'),
    checkIn: t('Check-in', 'চেক-ইন'), checkOut: t('Check-out', 'চেক-আউট'), rooms: t('Rooms', 'রুম সংখ্যা'),
    adults: t('Adults', 'প্রাপ্তবয়স্ক'), children: t('Children', 'শিশু'), infants: t('Infants', 'ইনফ্যান্ট'), adultSub: t('Age 12+', '১২+ বছর'), childSub: t('Age 3–11', '৩–১১ বছর'),
    guests: t('Guests', 'অতিথি'), applicants: t('Applicants', 'আবেদনকারী'), decrease: t('Decrease', 'কমান'), increase: t('Increase', 'বাড়ান'),
    continue: t('Continue', 'এগিয়ে যান'), back: t('Back', 'পেছনে'), toPayment: t('Continue to payment', 'পেমেন্টে যান'),
    travellerDetails: t('Traveller details', 'যাত্রীর তথ্য'), namesMatch: t('Names must match passport/NID.', 'নাম পাসপোর্ট/এনআইডি অনুযায়ী হতে হবে।'), signInAutofill: t('Already have an account? Sign in to autofill', 'অ্যাকাউন্ট আছে? সাইন ইন করে অটোফিল করুন'),
    leadTraveller: t('Lead traveller', 'প্রধান যাত্রী'), firstName: t('First name', 'নামের প্রথম অংশ'), lastName: t('Last name', 'নামের শেষ অংশ'), emailLabel: t('Email', 'ইমেইল'), mobile: t('Mobile', 'মোবাইল'),
    passportIntl: t('Passport no. (needed for this trip)', 'পাসপোর্ট নম্বর (এই ট্রিপে প্রয়োজন)'), passportOpt: t('Passport no. (international trips)', 'পাসপোর্ট নম্বর (আন্তর্জাতিক ট্রিপ)'), dob: t('Date of birth', 'জন্মতারিখ'),
    traveller: t('Traveller', 'যাত্রী'), fullName: t('Full name', 'পূর্ণ নাম'), relation: t('Relation', 'সম্পর্ক'), relations: t('Spouse|Parent|Child|Sibling|Friend|Colleague', 'স্বামী/স্ত্রী|মা-বাবা|সন্তান|ভাই-বোন|বন্ধু|সহকর্মী'),
    specialRequests: t('Special requests', 'বিশেষ অনুরোধ'), requestsPh: t('Dietary needs, wheelchair, honeymoon setup…', 'খাবারের চাহিদা, হুইলচেয়ার, হানিমুন সেটআপ…'),
    required: t('Required', 'আবশ্যক'), email: t('Enter a valid email.', 'সঠিক ইমেইল দিন।'), phone: t('Enter a valid BD mobile number.', 'সঠিক বাংলাদেশি মোবাইল নম্বর দিন।'), passport: t('Enter a valid passport number.', 'সঠিক পাসপোর্ট নম্বর দিন।'),
    makeBetter: t('Make it better', 'ট্রিপ আরও ভালো করুন'), noExtras: t('No extras for this booking.', 'এই বুকিংয়ে কোনো অতিরিক্ত সেবা নেই।'), perPerson: t('Per traveller', 'প্রতি যাত্রী'), perBooking: t('Per booking', 'প্রতি বুকিং'),
    addonSub_insurance: t('Medical up to US$50,000, trip cancellation, baggage', 'চিকিৎসা US$৫০,০০০ পর্যন্ত, ট্রিপ বাতিল, লাগেজ'), addonSub_pickup: t('Private car, meet & greet', 'প্রাইভেট কার, মিট অ্যান্ড গ্রিট'),
    addonSub_esim: t('Works in 120+ countries · per traveller', '১২০+ দেশে চলে · প্রতি যাত্রী'), addonSub_photographer: t('Edited photos in 48 h', '৪৮ ঘণ্টায় এডিট করা ছবি'),
    promo: t('Promo code', 'প্রোমো কোড'), apply: t('Apply', 'প্রয়োগ'), remove: t('Remove', 'সরান'), try: t('Try', 'চেষ্টা করুন'),
    payment: t('Payment', 'পেমেন্ট'), howMuch: t('How much would you like to pay now?', 'এখন কত পরিশোধ করতে চান?'), deposit: t('deposit', 'অগ্রিম'), depositSub: t('Rest 21 days before travel', 'বাকিটা যাত্রার ২১ দিন আগে'),
    payFull: t('Pay in full', 'পুরো টাকা দিন'), payFullSub: t('Get 2% instant discount', '২% তাৎক্ষণিক ছাড়'), payFullPlain: t('One payment, all done', 'একবারেই পরিশোধ'), instalments: t('Instalments', 'কিস্তি'), instalmentsSub: t('monthly payments', 'মাসিক কিস্তি'),
    now: t('now', 'এখন'), today: t('Today', 'আজ'), method: t('Choose payment method', 'পেমেন্ট পদ্ধতি বেছে নিন'),
    gw_bkash: 'bKash', gw_nagad: t('Nagad', 'নগদ'), gw_sslcommerz: t('Card', 'কার্ড'), gw_bank_transfer: t('Bank', 'ব্যাংক'), gw_mock: t('Test gateway', 'টেস্ট গেটওয়ে'),
    gwSub_wallet: t('Mobile wallet', 'মোবাইল ওয়ালেট'), gwSub_card: t('Visa · Master · Amex', 'ভিসা · মাস্টার · অ্যামেক্স'), gwSub_bank: t('Transfer / deposit', 'ট্রান্সফার / জমা'), gwSub_test: t('Sandbox only', 'শুধু স্যান্ডবক্স'),
    gwInfo_bkash: t('You will be taken to the secure bKash checkout to enter your bKash number, OTP and PIN.', 'নিরাপদ বিকাশ চেকআউটে আপনার বিকাশ নম্বর, ওটিপি ও পিন দেবেন।'),
    gwInfo_nagad: t('You will be taken to the secure Nagad checkout to approve the payment.', 'পেমেন্ট অনুমোদনের জন্য নিরাপদ নগদ চেকআউটে নেওয়া হবে।'),
    gwInfo_sslcommerz: t('You will enter your card on the secure SSLCommerz page (PCI-DSS, 3-D Secure). We never see or store your card number.', 'নিরাপদ SSLCommerz পেজে কার্ডের তথ্য দেবেন (PCI-DSS, 3-D Secure)। আমরা আপনার কার্ড নম্বর দেখি বা রাখি না।'),
    gwInfo_mock: t('Simulated payment for testing.', 'টেস্টের জন্য সিমুলেটেড পেমেন্ট।'), gwInfo_default: t('You will be redirected to complete the payment.', 'পেমেন্ট সম্পূর্ণ করতে রিডাইরেক্ট করা হবে।'),
    slip: t('Transaction / slip reference', 'ট্রানজ্যাকশন / স্লিপ রেফারেন্স'), bankNote: t('Your seats are held for 24 hours while our accounts team verifies the transfer.', 'অ্যাকাউন্টস টিম ট্রান্সফার যাচাই করা পর্যন্ত ২৪ ঘণ্টা সিট হোল্ড থাকবে।'),
    bankRows: JSON.stringify(bank ? [[t('Account name', 'অ্যাকাউন্টের নাম'), bank.account_name], [t('Bank', 'ব্যাংক'), bank.bank], [t('Account no.', 'অ্যাকাউন্ট নম্বর'), bank.account_no], [t('Routing no.', 'রাউটিং নম্বর'), bank.routing]] : []),
    sandbox: t('Test mode: no real money is charged.', 'টেস্ট মোড: কোনো আসল টাকা কাটা হবে না।'),
    agree1: t('I agree to the', 'আমি'), terms: t('terms', 'শর্তাবলি'), and: t('and', 'ও'), policy: t('cancellation policy', 'বাতিল নীতিমালা'), agree2: t('.', ' মেনে নিচ্ছি।'), agreeError: t('Please accept the terms to continue.', 'এগিয়ে যেতে শর্তাবলি মেনে নিন।'),
    paySecurely: t('Pay securely', 'নিরাপদে পরিশোধ'), processing: t('Processing…', 'প্রসেস হচ্ছে…'), summary: t('Booking summary', 'বুকিং সারাংশ'),
    fullDiscount: t('Pay-in-full discount', 'পূর্ণ পরিশোধ ছাড়'), vat: t('Taxes & VAT', 'কর ও ভ্যাট'), included: t('Included', 'অন্তর্ভুক্ত'), total: t('Total', 'মোট'), dueNow: t('Due now', 'এখন পরিশোধ'),
    licensed: t('Govt. licensed · IATA accredited', 'সরকার অনুমোদিত · IATA স্বীকৃত'), support: `${t('24/7 support', '২৪/৭ সহায়তা')}: ${i.d(site?.settings?.company?.hotline ?? '')}`,
    genericError: t('Something went wrong. Please try again.', 'কিছু একটা সমস্যা হয়েছে। আবার চেষ্টা করুন।'),
    payFailed: t('Your payment did not go through. Your booking is saved — you can try again or choose another method.', 'পেমেন্ট সম্পন্ন হয়নি। বুকিং সংরক্ষিত আছে — আবার চেষ্টা করুন বা অন্য পদ্ধতি বেছে নিন।'),
    payCancelled: t('You cancelled the payment. Your booking is saved — pay when you are ready.', 'আপনি পেমেন্ট বাতিল করেছেন। বুকিং সংরক্ষিত আছে — প্রস্তুত হলে পরিশোধ করুন।'),
  };
}

const icons = () => ({
  minus: <Icon name="minus" className="h-4 w-4" />, plus: <Icon name="plus" className="h-4 w-4" />, left: <Icon name="arrow-left" className="h-4 w-4" />, right: <Icon name="arrow-right" className="h-4 w-4" />,
  check: <Icon name="check" className="h-4 w-4" />, lock: <Icon name="lock" className="h-4 w-4" />, info: <Icon name="info" className="h-5 w-5 shrink-0" />, alert: <Icon name="circle-alert" className="h-5 w-5 shrink-0" />,
  plane: <Icon name="plane" className="h-7 w-7" />, calendar: <Icon name="calendar" className="h-4 w-4 text-brand-600" />, calendarCheck: <Icon name="calendar-check" className="h-4 w-4 text-brand-600" />,
  shield: <Icon name="shield-check" className="h-4 w-4 text-brand-600" />, headset: <Icon name="headset" className="h-4 w-4 text-brand-600" />, sparkles: <Icon name="sparkles" className="h-5 w-5" />,
  'addon-insurance': <Icon name="shield-plus" className="h-5 w-5" />, 'addon-pickup': <Icon name="car" className="h-5 w-5" />, 'addon-esim': <Icon name="smartphone" className="h-5 w-5" />,
  'addon-photographer': <Icon name="camera" className="h-5 w-5" />, 'addon-drinks': <Icon name="wine" className="h-5 w-5" />, 'addon-transfer': <Icon name="car" className="h-5 w-5" />,
});

/** Booking → resume quote shape (pay the next part of an existing booking after a failed/cancelled payment). */
function resumeQuote(b: any): Quote {
  const plan = { code: b.payment_plan, now: b.instalments.find((x: any) => x.status !== 'paid')?.amount ?? b.balance, discount: 0, total: b.total, schedule: [] };
  return {
    kind: b.kind, slug: '', title: b.title, subtitle: b.subtitle, image: b.image, travel_start: b.travel_start, travel_end: b.travel_end, pax: b.pax, pax_count: b.pax_count, options: {},
    lines: b.items.filter((x: any) => x.total >= 0).map((x: any) => ({ code: String(x.code ?? x.label), label: x.label, qty: x.qty, unit: x.unit, total: x.total })),
    addons: [], subtotal: b.subtotal, discount: b.discount, coupon: null, total: b.total, plans: [plan], cancellation: null, refundable: null, gateways: b.gateways, payment_mode: 'sandbox', needs_passport: false, choices: {},
  };
}

export default async function BookingPage({ params, searchParams }: PageProps<'/[lang]/booking'>) {
  const lang = (await params).lang as Lang;
  const sp: SP = await searchParams;
  const [i, site] = await Promise.all([getI18n(lang), getSite(lang)]);
  const t = i.t;
  const crumbs: Crumb[] = [[t('Home', 'হোম'), i.u('/')], [t('Checkout', 'চেকআউট'), i.u('/booking')]];
  const links = { terms: i.u('/terms'), refund: i.u('/refund-policy'), login: `${i.u('/login')}?next=${encodeURIComponent(i.u('/booking'))}`, change: i.u('/tours') };
  const L = labels(i, site);
  const hero = <PlainHero i={i} title={t('Secure checkout', 'নিরাপদ চেকআউট')} crumbs={crumbs} />;
  const empty = (title: string, text: string, cta: [string, string]) => (
    <>{hero}<div className="wrap py-12"><div className="card mx-auto max-w-xl p-8 text-center">
      <span className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-brand-50 text-brand-700 dark:bg-brand-900/40 dark:text-brand-300"><Icon name="luggage" className="h-7 w-7" /></span>
      <h2 className="mt-4 text-xl font-bold">{title}</h2><p className="mt-2 text-sm muted">{text}</p><Link href={cta[1]} className="btn btn-primary mt-6">{cta[0]}</Link></div></div></>
  );

  // Resume an existing booking (after a failed or cancelled payment).
  const ref = one(sp.ref), key = one(sp.key);
  if (/^[A-Z]{3}-\d{2}-\d{5}$/.test(ref)) {
    const b = await apiFresh<{ data: any }>(`bookings/${ref}`, lang, { key }, await authHeaders()).then((r) => r?.data ?? null).catch(() => null);
    if (!b) return empty(t('Booking not found', 'বুকিং পাওয়া যায়নি'), t('The link may be incomplete. Check the e-mail we sent you, or contact us.', 'লিংকটি অসম্পূর্ণ হতে পারে। আমাদের পাঠানো ইমেইল দেখুন বা যোগাযোগ করুন।'), [t('Contact us', 'যোগাযোগ'), i.u('/contact')]);
    if (b.status === 'cancelled') return empty(t('This booking has expired', 'এই বুকিংয়ের মেয়াদ শেষ'), t('The payment window passed and the seats were released. Please start a new booking.', 'পেমেন্টের সময় পেরিয়ে গেছে, সিট ছেড়ে দেওয়া হয়েছে। নতুন বুকিং করুন।'), [t('Browse tours', 'ট্যুর দেখুন'), i.u('/tours')]);
    if (b.balance <= 0 || (b.payment_status !== 'unpaid' && one(sp.payment) === '')) return empty(t('Nothing to pay', 'পরিশোধের কিছু নেই'), `${b.ref}`, [t('View booking', 'বুকিং দেখুন'), `${i.u('/booking-confirmed')}?ref=${b.ref}&key=${b.key}`]);
    return <>{hero}<Checkout initial={resumeQuote(b)} sel={{}} L={L} icons={icons()} links={links} resume={{ ref: b.ref, key: b.key, status: one(sp.payment) || 'failed' }} /></>;
  }

  const sel = selection(sp);
  if (!sel) return empty(t('Pick a trip to book', 'বুক করতে একটি ট্রিপ বেছে নিন'), t('Choose a tour, cruise, activity, hotel, flight or visa service and press Book now.', 'ট্যুর, ক্রুজ, অ্যাক্টিভিটি, হোটেল, ফ্লাইট বা ভিসা সেবা বেছে "এখনই বুক করুন" চাপুন।'), [t('Browse tours', 'ট্যুর দেখুন'), i.u('/tours')]);
  const res = await apiPost<{ data: Quote; message?: string; errors?: Record<string, string[]> }>('checkout/quote', sel, lang, await authHeaders()).catch(() => ({ status: 503, body: {} as any }));
  const backTo = i.u(back[String(sel.kind)] ?? '/tours') + (sel.slug && sel.kind !== 'gift_card' ? `/${sel.slug}` : '');
  if (res.status !== 200) {
    const eb = res.body as { message?: string; errors?: Record<string, string[]> };
    const msg = eb?.errors ? Object.values(eb.errors)[0]?.[0] : eb?.message;
    return empty(t('This option is no longer available', 'এই অপশনটি আর পাওয়া যাচ্ছে না'), msg ?? t('Please go back and pick another date or option.', 'ফিরে গিয়ে অন্য তারিখ বা অপশন বেছে নিন।'), [t('Go back', 'ফিরে যান'), backTo]);
  }
  return <>{hero}<Checkout initial={res.body.data} sel={sel} L={L} icons={icons()} links={{ ...links, change: backTo }} /></>;
}
