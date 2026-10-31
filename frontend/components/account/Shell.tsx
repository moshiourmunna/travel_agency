import { Suspense } from 'react';
import { Icon } from '@/components/icons/Icon';
import { ActiveLink } from '@/components/client/ActiveLink';
import { LangLink, ThemeToggle } from '@/components/client/HeaderBits';
import { Avatar } from '@/components/ui/basics';
import type { I18n } from '@/lib/i18n';
import { SideDrawer, SignOutButton, WishSync } from './client';

type Counts = { bookings?: number; visa?: number; payments?: number; notifications?: number };
export type Me = { name: string; first_name: string; initials: string; avatar?: string | null; miles: number; tier?: { name: string } | null; next_tier?: { name: string; to_go: number; progress: number } | null };

/** Same groups, icons and order as the mockup's portal sidebar (pages_account.NAV). Badges are live counts. */
function nav(i: I18n, c: Counts): [string | null, [string, string, string, string, number | undefined][]][] {
  const { t } = i;
  return [
    [null, [['index', '/account', 'layout-dashboard', t('Dashboard', 'ড্যাশবোর্ড'), undefined], ['bookings', '/account/bookings', 'luggage', t('My bookings', 'আমার বুকিং'), c.bookings],
      ['trips', '/account/trips', 'map', t('Saved trips & wishlist', 'সংরক্ষিত ট্রিপ ও উইশলিস্ট'), undefined], ['visa', '/account/visa', 'stamp', t('Visa tracker', 'ভিসা ট্র্যাকার'), c.visa]]],
    [t('Money', 'টাকা-পয়সা'), [['wallet', '/account/wallet', 'wallet', t('Wallet & Miles', 'ওয়ালেট ও মাইলস'), undefined], ['payments', '/account/payments', 'credit-card', t('Payments & instalments', 'পেমেন্ট ও কিস্তি'), c.payments],
      ['referrals', '/account/referrals', 'gift', t('Refer & earn', 'রেফার করে আয়'), undefined]]],
    [t('Account', 'অ্যাকাউন্ট'), [['travellers', '/account/travellers', 'users', t('Travellers & passports', 'ভ্রমণকারী ও পাসপোর্ট'), undefined],
      ['notifications', '/account/notifications', 'bell', t('Notifications', 'নোটিফিকেশন'), c.notifications], ['support', '/account/support', 'life-buoy', t('Help & support', 'সাহায্য ও সাপোর্ট'), undefined],
      ['reviews', '/account/reviews', 'star', t('My reviews', 'আমার রিভিউ'), undefined], ['profile', '/account/profile', 'user-round', t('Profile', 'প্রোফাইল'), undefined],
      ['settings', '/account/settings', 'settings', t('Settings & security', 'সেটিংস ও নিরাপত্তা'), undefined]]],
  ];
}

function SideNav({ i, me, counts, mobile = false }: { i: I18n; me: Me; counts: Counts; mobile?: boolean }) {
  const { t, u, d, num } = i;
  return (
    <>
      <div className={`flex h-16 shrink-0 items-center gap-2 border-b border-ink-100 px-4 dark:border-ink-800 ${mobile ? 'pr-14' : ''}`}>
        <a href={u('/')} className="flex items-center gap-2" aria-label={t('Musafir home', 'মুসাফির হোম')}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/brand/logo-compact.svg" alt="" className="h-9 w-auto dark:hidden" width={140} height={40} />
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/brand/logo-compact-dark.svg" alt="" className="hidden h-9 w-auto dark:block" width={140} height={40} />
        </a>
      </div>
      <nav className="flex-1 space-y-5 overflow-y-auto p-3" aria-label={t('Account navigation', 'অ্যাকাউন্ট নেভিগেশন')}>
        {nav(i, counts).map(([grp, items], g) => (
          <div key={g}>
            {grp ? <p className="mb-1 px-3 text-[11px] font-bold uppercase tracking-wider text-ink-500 dark:text-ink-300">{grp}</p> : null}
            <ul className="space-y-0.5">
              {items.map(([key, href, ic, label, cnt]) => (
                <li key={key}>
                  <ActiveLink href={u(href)} exact={key === 'index'} className="side-link" data-nav={key}>
                    <Icon name={ic} className="h-[18px] w-[18px] shrink-0" /><span className="flex-1 truncate">{label}</span>
                    {cnt ? <span className="rounded-full bg-accent-100 px-2 py-0.5 text-[11px] font-bold text-accent-900 dark:bg-accent-400/20 dark:text-accent-200">{d(cnt)}</span> : null}
                  </ActiveLink>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </nav>
      <div className="border-t border-ink-100 p-3 dark:border-ink-800">
        <div className="rounded-2xl bg-gradient-to-br from-brand-800 to-brand-600 p-4 text-white">
          <p className="text-xs text-brand-100">{t('Musafir Miles', 'মুসাফির মাইলস')}{me.tier ? ` · ${me.tier.name}` : ''}</p>
          <p className="text-xl font-extrabold">{num(me.miles)}</p>
          {me.next_tier ? (
            <>
              <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-white/20"><div className="h-full rounded-full bg-accent-400" style={{ width: `${Math.min(100, Math.max(0, me.next_tier.progress))}%` }} /></div>
              <p className="mt-1.5 text-[11px] text-brand-100">{num(me.next_tier.to_go)} {t('Miles to', 'মাইলস বাকি')} {me.next_tier.name}</p>
            </>
          ) : <p className="mt-1.5 text-[11px] text-brand-100">{t('Top tier — enjoy every perk', 'সর্বোচ্চ স্তর — সব সুবিধা উপভোগ করুন')}</p>}
        </div>
        <SignOutButton className="side-link w-full" label={t('Sign out', 'সাইন আউট')}><Icon name="log-out" className="h-[18px] w-[18px]" /></SignOutButton>
      </div>
    </>
  );
}

/** Traveller portal chrome (mockup app/shell.html): fixed sidebar ≥ lg, drawer below, sticky top bar, footer line. */
export function AccountShell({ i, me, counts, company, children }: { i: I18n; me: Me; counts: Counts; company: string; children: React.ReactNode }) {
  const { t, u, d } = i;
  return (
    <div className="min-h-screen bg-ink-50 dark:bg-ink-950" data-app="account">
      <a href="#main" className="skip-link">{t('Skip to content', 'মূল বিষয়বস্তুতে যান')}</a>
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-64 flex-col border-r border-ink-100 bg-white dark:border-ink-800 dark:bg-ink-900 lg:flex"><SideNav i={i} me={me} counts={counts} /></aside>
      <div className="lg:pl-64">
        <header className="sticky top-0 z-20 border-b border-ink-100 bg-white/90 backdrop-blur-xl dark:border-ink-800 dark:bg-ink-900/90">
          <div className="flex h-16 items-center gap-2 px-3 sm:px-6">
            <SideDrawer openLabel={t('Open menu', 'মেনু খুলুন')} closeLabel={t('Close menu', 'মেনু বন্ধ করুন')} title={t('Menu', 'মেনু')} openIcon={<Icon name="menu" className="h-6 w-6" />}>
              <div className="flex h-full flex-col"><SideNav i={i} me={me} counts={counts} mobile /></div>
            </SideDrawer>
            <a href={u('/')} className="lg:hidden" aria-label={t('Musafir home', 'মুসাফির হোম')}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/brand/icon.svg" alt="" className="h-8 w-8" width={32} height={32} />
            </a>
            <p className="ml-1 hidden truncate text-sm font-semibold text-ink-700 dark:text-ink-200 md:block">{t('Welcome back,', 'আবার স্বাগতম,')} {me.first_name} 👋</p>
            <div className="ml-auto flex items-center gap-1">
              <a href={u('/tours')} className="btn btn-primary btn-sm mr-1 hidden sm:inline-flex"><Icon name="plus" className="h-4 w-4" /> {t('New trip', 'নতুন ট্রিপ')}</a>
              <Suspense fallback={<span className="icon-btn w-auto px-2.5 text-sm font-bold">{i.lang === 'en' ? <span lang="bn" className="font-[system-ui]">বাং</span> : 'EN'}</span>}>
                <LangLink to={i.other} className="icon-btn w-auto px-2.5 text-sm font-bold" label={t('বাংলায় দেখুন', 'View in English')}>{i.lang === 'en' ? <span lang="bn" className="font-[system-ui]">বাং</span> : 'EN'}</LangLink>
              </Suspense>
              <ThemeToggle className="icon-btn" label={t('Toggle dark mode', 'ডার্ক মোড চালু/বন্ধ')}><Icon name="moon" className="h-5 w-5 dark:hidden" /><Icon name="sun" className="hidden h-5 w-5 dark:block" /></ThemeToggle>
              <a href={u('/account/notifications')} className="icon-btn relative" aria-label={`${t('Notifications', 'নোটিফিকেশন')} (${d(counts.notifications ?? 0)} ${t('unread', 'অপঠিত')})`} data-unread={counts.notifications ?? 0}>
                <Icon name="bell" className="h-5 w-5" />{counts.notifications ? <span className="absolute right-1.5 top-1.5 h-2.5 w-2.5 rounded-full bg-rose-500 ring-2 ring-white dark:ring-ink-900" /> : null}
              </a>
              <a href={u('/account/profile')} className="ml-1 flex items-center gap-2 rounded-full p-0.5 pr-2 hover:bg-ink-100 dark:hover:bg-ink-800" aria-label={t('Your profile', 'আপনার প্রোফাইল')}>
                {me.avatar
                  // eslint-disable-next-line @next/next/no-img-element
                  ? <img src={me.avatar} alt="" className="h-9 w-9 rounded-full object-cover" width={36} height={36} />
                  : <Avatar initials={me.initials} className="h-9 w-9 text-xs" />}
                <span className="hidden text-sm font-semibold xl:block">{me.first_name}</span>
              </a>
            </div>
          </div>
        </header>
        <main id="main" tabIndex={-1} className="outline-none">
          <div className="mx-auto max-w-[1400px] px-3 py-5 sm:px-6 sm:py-8">{children}</div>
          <footer className="mx-auto max-w-[1400px] px-3 pb-24 pt-2 text-xs text-ink-500 dark:text-ink-300 sm:px-6 lg:pb-8">© {d(new Date().getFullYear())} {company} · <a href={u('/privacy')} className="hover:underline">{t('Privacy policy', 'গোপনীয়তা নীতি')}</a> · <a href={u('/contact')} className="hover:underline">{t('Contact us', 'যোগাযোগ')}</a></footer>
        </main>
      </div>
      <WishSync />
    </div>
  );
}

/** Breadcrumb line above portal pages (mockup crumbs_ui). */
export function AccountCrumbs({ i, items }: { i: I18n; items: [string, string][] }) {
  return (
    <nav aria-label={i.t('Breadcrumb', 'ব্রেডক্রাম্ব')} className="mb-2 text-xs text-ink-500 dark:text-ink-300">
      <ol className="flex flex-wrap items-center gap-1">
        {items.map(([n, h], k) => (
          <li key={k} className="flex items-center gap-1">
            {k < items.length - 1 ? <><a href={i.u(h)} className="hover:text-brand-700 hover:underline dark:hover:text-brand-300">{n}</a><Icon name="chevron-right" className="h-3 w-3" /></> : <span aria-current="page">{n}</span>}
          </li>
        ))}
      </ol>
    </nav>
  );
}
