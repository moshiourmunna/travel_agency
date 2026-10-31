import type { Viewport } from 'next';
import { notFound } from 'next/navigation';
import '../globals.css';
import { Icon } from '@/components/icons/Icon';
import { SiteProvider } from '@/components/client/SiteContext';
import { CookieBanner, Toaster } from '@/components/client/Widgets';
import { isLang, LOCALES, type Lang } from '@/lib/format';
import { getI18n } from '@/lib/i18n';
import { JsonLd, orgJsonLd } from '@/lib/seo';
import { getSite } from '@/lib/site';

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
  colorScheme: 'light dark',
  themeColor: [{ media: '(prefers-color-scheme: light)', color: '#0D6B65' }, { media: '(prefers-color-scheme: dark)', color: '#07131F' }],
};

export const generateStaticParams = () => LOCALES.map((lang) => ({ lang }));
export const dynamicParams = false;

/* Runs before paint: applies the saved/system theme (no flash) and remembers the language. */
const THEME_JS = `(function(){try{var d=document.documentElement,t=localStorage.getItem('musafir-theme');if(t)t=t.replace(/"/g,'');if(t==='dark'||(!t&&window.matchMedia&&matchMedia('(prefers-color-scheme: dark)').matches))d.classList.add('dark');localStorage.setItem('musafir-lang',d.lang)}catch(e){}})();`;

export default async function RootLayout({ children, params }: LayoutProps<'/[lang]'>) {
  const { lang: l } = await params;
  if (!isLang(l)) notFound();
  const lang = l as Lang;
  const [site, i] = await Promise.all([getSite(lang), getI18n(lang)]);
  const { t, u } = i;
  const msg = {
    added: t('Saved to wishlist', 'উইশলিস্টে রাখা হয়েছে'), removed: t('Removed from wishlist', 'উইশলিস্ট থেকে সরানো হয়েছে'),
    compareMax: t('You can compare up to 3 packages', 'সর্বোচ্চ ৩টি প্যাকেজ তুলনা করা যায়'), saved: t('Saved', 'সংরক্ষিত'),
    sent: t('Thanks! We will get back to you shortly.', 'ধন্যবাদ! আমরা শিগগিরই যোগাযোগ করব।'),
    reply: t('Thanks! A travel expert will reply within 2 minutes. You can also WhatsApp us anytime.', 'ধন্যবাদ! একজন ট্রাভেল এক্সপার্ট ২ মিনিটের মধ্যে উত্তর দেবেন। চাইলে যেকোনো সময় হোয়াটসঅ্যাপ করুন।'),
    required: t('This field is required', 'এই ঘরটি পূরণ করা আবশ্যক'), phone: t('Enter a valid BD mobile number.', 'সঠিক মোবাইল নম্বর দিন।'), email: t('Please enter a valid email.', 'সঠিক ইমেইল দিন।'),
    reference: t('Reference', 'রেফারেন্স'), failed: t('Something went wrong. Please try again.', 'কিছু একটা সমস্যা হয়েছে। আবার চেষ্টা করুন।'),
    privacy: t('By submitting you agree to our privacy policy.', 'জমা দিয়ে আপনি আমাদের গোপনীয়তা নীতিতে সম্মত হচ্ছেন।'), copied: t('Copied!', 'কপি হয়েছে!'),
    nothing: t('No matches — try clearing a filter.', 'কিছু মেলেনি — একটি ফিল্টার সরিয়ে দেখুন।'), results: t('results', 'ফলাফল'),
    error: t('Something went wrong. Please try again.', 'কিছু একটা সমস্যা হয়েছে। আবার চেষ্টা করুন।'),
    tooMany: t('Too many attempts. Please wait a minute and try again.', 'অনেকবার চেষ্টা করা হয়েছে। এক মিনিট পর আবার চেষ্টা করুন।'),
    days: t('d', 'দি'), hrs: t('h', 'ঘ'), min: t('m', 'মি'), sec: t('s', 'সে'),
  };
  return (
    <html lang={lang} dir="ltr" className="scroll-smooth" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: THEME_JS }} />
        {lang === 'bn' ? (
          <>
            <link rel="preload" as="font" type="font/woff2" crossOrigin="anonymous" href="/fonts/hind-siliguri-bengali-400-normal.woff2" />
            <link rel="preload" as="font" type="font/woff2" crossOrigin="anonymous" href="/fonts/hind-siliguri-bengali-700-normal.woff2" />
          </>
        ) : (
          <link rel="preload" as="font" type="font/woff2" crossOrigin="anonymous" href="/fonts/plus-jakarta-sans-latin-wght-normal.woff2" />
        )}
        {/* display headings (Latin italic serif) — only worth preloading on English pages; font-display: optional → no layout shift */}
        {lang === 'en' ? <link rel="preload" as="font" type="font/woff2" crossOrigin="anonymous" href="/fonts/fraunces-latin-wght-italic.woff2" /> : null}
        <link rel="icon" href="/favicon.ico" sizes="any" />
        <link rel="icon" href="/brand/icon.svg" type="image/svg+xml" />
        <link rel="apple-touch-icon" href="/brand/icon-180.png" />
        <link rel="manifest" href="/manifest.webmanifest" />
        {site.settings.seo?.google_site_verification ? <meta name="google-site-verification" content={site.settings.seo.google_site_verification} /> : null}
        {site.settings.seo?.bing_site_verification ? <meta name="msvalidate.01" content={site.settings.seo.bing_site_verification} /> : null}
        <JsonLd data={await orgJsonLd(lang)} />
      </head>
      <body className="min-h-screen">
        <SiteProvider value={{ lang, currencies: site.currencies, msg }}>
          {children}
          <CookieBanner
            privacyHref={u('/privacy')}
            icon={<Icon name="cookie" />}
            s={{
              region: t('Cookie consent', 'কুকি সম্মতি'), text: t('We use cookies to keep you signed in, remember your preferences and measure site performance.', 'আপনাকে সাইন-ইন রাখতে, পছন্দ মনে রাখতে ও সাইটের পারফরম্যান্স মাপতে আমরা কুকি ব্যবহার করি।'),
              privacy: t('Privacy policy', 'গোপনীয়তা নীতি'), custom: t('Customise', 'কাস্টমাইজ'), reject: t('Reject optional', 'ঐচ্ছিক বাতিল'), accept: t('Accept all', 'সব গ্রহণ'),
              essential: t('Essential', 'প্রয়োজনীয়'), analytics: t('Analytics', 'অ্যানালিটিক্স'), marketing: t('Marketing', 'মার্কেটিং'), save: t('Save preferences', 'পছন্দ সংরক্ষণ'),
            }}
          />
          <Toaster />
        </SiteProvider>
      </body>
    </html>
  );
}
