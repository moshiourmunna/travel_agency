import type { Viewport } from 'next';
import { notFound } from 'next/navigation';
import { Suspense } from 'react';
import '../globals.css';
import { Icon } from '@/components/icons/Icon';
import { SiteProvider } from '@/components/client/SiteContext';
import { Chat, CookieBanner, MobileBar, Toaster } from '@/components/client/Widgets';
import { Footer } from '@/components/layout/Footer';
import { Header } from '@/components/layout/Header';
import { apiData } from '@/lib/api';
import { isLang, LOCALES, type Lang } from '@/lib/format';
import { getI18n } from '@/lib/i18n';
import { JsonLd, orgJsonLd } from '@/lib/seo';
import { getSite } from '@/lib/site';
import { Img } from '@/lib/img';

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
  const [site, i, themes, cruiseImg] = await Promise.all([
    getSite(lang),
    getI18n(lang),
    apiData<any[]>('themes', { lang, tags: ['themes'] }).catch(() => []),
    Img.key('cruise', lang),
  ]);
  const { t, u } = i;
  const company = site.settings.company ?? {};
  const msg = {
    added: t('Saved to wishlist', 'উইশলিস্টে রাখা হয়েছে'), removed: t('Removed from wishlist', 'উইশলিস্ট থেকে সরানো হয়েছে'),
    compareMax: t('You can compare up to 3 packages', 'সর্বোচ্চ ৩টি প্যাকেজ তুলনা করা যায়'), saved: t('Saved', 'সংরক্ষিত'),
    sent: t('Thanks! We will get back to you shortly.', 'ধন্যবাদ! আমরা শিগগিরই যোগাযোগ করব।'),
    reply: t('Thanks! A travel expert will reply within 2 minutes. You can also WhatsApp us anytime.', 'ধন্যবাদ! একজন ট্রাভেল এক্সপার্ট ২ মিনিটের মধ্যে উত্তর দেবেন। চাইলে যেকোনো সময় হোয়াটসঅ্যাপ করুন।'),
    required: t('This field is required', 'এই ঘরটি পূরণ করা আবশ্যক'), copied: t('Copied!', 'কপি হয়েছে!'),
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
          <Suspense fallback={null}>
            <Header i={i} company={company} menus={site.menus as any} themes={themes} cruiseImage={cruiseImg} />
          </Suspense>
          <main id="main" tabIndex={-1} className="outline-none">{children}</main>
          <Footer i={i} company={company} social={site.settings.social?.links ?? []} app={site.settings.app?.links ?? {}} menus={site.menus as any} menuNames={site.menu_names ?? {}} />
          <MobileBar
            label={t('Quick navigation', 'দ্রুত নেভিগেশন')}
            items={[
              { key: 'home', href: u('/'), label: t('Home', 'হোম'), icon: <Icon name="house" className="h-[22px] w-[22px]" /> },
              { key: 'tours', href: u('/tours'), label: t('Explore', 'ঘুরে দেখুন'), icon: <Icon name="compass" className="h-[22px] w-[22px]" /> },
              { key: 'offers', href: u('/offers'), label: t('Deals', 'অফার'), icon: <Icon name="badge-percent" className="h-6 w-6" />, feature: true },
              { key: 'wish', href: u('/wishlist'), label: t('Saved', 'সেভড'), icon: <Icon name="heart" className="h-[22px] w-[22px]" /> },
              { key: 'account', href: u('/account'), label: t('Account', 'অ্যাকাউন্ট'), icon: <Icon name="circle-user-round" className="h-[22px] w-[22px]" /> },
            ]}
          />
          <Chat
            waNumber={company.whatsapp_number}
            tel={company.hotline_tel}
            s={{
              title: t('Musafir Support', 'মুসাফির সাপোর্ট'), online: t('Typically replies in 2 min', 'সাধারণত ২ মিনিটে উত্তর দেন'), close: t('Close chat', 'চ্যাট বন্ধ করুন'),
              hello: t('Hi there! 👋 How can we help you plan your journey today?', 'হ্যালো! 👋 আজ আপনার ভ্রমণ পরিকল্পনায় কীভাবে সাহায্য করতে পারি?'), message: t('Message', 'বার্তা'),
              placeholder: t('Type a message…', 'বার্তা লিখুন…'), send: t('Send', 'পাঠান'), call: t('Call us', 'কল করুন'), open: t('Open chat', 'চ্যাট খুলুন'), dialog: t('Chat with Musafir', 'মুসাফিরের সাথে চ্যাট'),
              quick: [t('Holiday deals', 'হলিডে অফার'), t('Cruise dates & prices', 'ক্রুজের তারিখ ও মূল্য'), t('Visa help', 'ভিসা সহায়তা'), t('Talk to an agent', 'এজেন্টের সাথে কথা বলুন')],
            }}
            icons={{ close: <Icon name="x" className="h-5 w-5" />, send: <Icon name="send-horizontal" className="h-4 w-4" />, wa: <Icon name="message-circle" className="h-4 w-4" />, phone: <Icon name="phone" className="h-4 w-4" />, fab: <Icon name="messages-square" className="h-6 w-6" /> }}
          />
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
