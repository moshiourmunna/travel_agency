import { Icon } from '@/components/icons/Icon';
import { Chat, MobileBar } from '@/components/client/Widgets';
import { Footer } from '@/components/layout/Footer';
import { Header } from '@/components/layout/Header';
import { apiData } from '@/lib/api';
import type { Lang } from '@/lib/format';
import { getI18n } from '@/lib/i18n';
import { getSite } from '@/lib/site';
import { Img } from '@/lib/img';

/** Public-site chrome: header, footer, mobile tab bar and chat. The traveller portal (/account) has its own app layout. */
export default async function SiteLayout({ children, params }: LayoutProps<'/[lang]'>) {
  const lang = (await params).lang as Lang;
  const [site, i, themes, cruiseImg] = await Promise.all([
    getSite(lang),
    getI18n(lang),
    apiData<any[]>('themes', { lang, tags: ['themes'] }).catch(() => []),
    Img.key('cruise', lang),
  ]);
  const { t, u } = i;
  const company = site.settings.company ?? {};
  return (
    <>
      {/* Not wrapped in Suspense: a pending boundary streams the header after <main> and shifts the page (CLS). */}
      <Header i={i} company={company} menus={site.menus as any} themes={themes} cruiseImage={cruiseImg} />
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
    </>
  );
}
