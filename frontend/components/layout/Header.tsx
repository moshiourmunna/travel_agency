import Link from 'next/link';
import { Icon } from '@/components/icons/Icon';
import { ActiveLink } from '@/components/client/ActiveLink';
import { CurrencySelect, Drawer, Dropdown, HeaderShadow, LangLink, ThemeToggle, AccountLink } from '@/components/client/HeaderBits';
import { WishCount } from '@/components/client/Wish';
import { Picture } from '@/components/ui/Picture';
import type { I18n } from '@/lib/i18n';
import type { Image } from '@/lib/types';

export type MenuItem = { label: string; url: string | null; icon?: string | null; badge?: string | null; description?: string | null; meta: Record<string, any>; children: MenuItem[] };
export type Theme = { slug: string; icon: string; name: string; tagline: string };

export function Header({ i, company, menus, themes, cruiseImage }: { i: I18n; company: Record<string, any>; menus: Record<string, MenuItem[]>; themes: Theme[]; cruiseImage: Image }) {
  const { t, u, d } = i;
  const mega = menus['mega-tours'] ?? [];
  const header = menus['header'] ?? [];
  const showFrom: Record<string, string> = { xl: 'hidden xl:inline-flex', '2xl': 'hidden 2xl:inline-flex' };
  const ddLink = 'block rounded-lg px-2 py-1.5 text-sm font-medium text-ink-700 hover:bg-brand-50 hover:text-brand-800 dark:text-ink-200 dark:hover:bg-ink-800 dark:hover:text-white';
  return (
    <>
      <a href="#main" className="skip-link">{t('Skip to content', 'মূল বিষয়বস্তুতে যান')}</a>
      <div className="hidden border-b border-white/5 bg-ink-950 text-[13px] text-ink-300 lg:block">
        <div className="wrap flex h-10 items-center justify-between gap-6">
          <div className="flex items-center gap-5">
            <a href={`tel:${company.hotline_tel}`} className="inline-flex items-center gap-1.5 hover:text-white"><Icon name="phone" className="h-3.5 w-3.5" /> {t('Hotline', 'হটলাইন')} {d(company.hotline)}</a>
            <a href={`https://wa.me/${company.whatsapp_number}`} className="inline-flex items-center gap-1.5 hover:text-white" rel="noopener" target="_blank"><Icon name="message-circle" className="h-3.5 w-3.5" /> WhatsApp</a>
            <a href={`mailto:${company.email}`} className="hidden items-center gap-1.5 hover:text-white xl:inline-flex"><Icon name="mail" className="h-3.5 w-3.5" /> {company.email}</a>
          </div>
          <div className="flex items-center gap-5">
            <span className="hidden items-center gap-1.5 text-gold-300 xl:inline-flex"><Icon name="shield-check" className="h-3.5 w-3.5" /> {t('IATA accredited · ATAB & TOAB member', 'আইএটিএ স্বীকৃত · আটাব ও টোয়াব সদস্য')}</span>
            <Link href={u('/account/bookings')} className="hover:text-white">{t('Manage booking', 'বুকিং ম্যানেজ')}</Link>
            <Link href={u('/login?role=agent')} className="hover:text-white">{t('Agent / B2B', 'এজেন্ট / বিটুবি')}</Link>
            <label className="sr-only" htmlFor="cur-top">{t('Currency', 'মুদ্রা')}</label>
            <CurrencySelect id="cur-top" className="cursor-pointer rounded-md border-0 bg-transparent py-0 pl-1 pr-6 text-[13px] text-ink-300 focus:ring-0" />
          </div>
        </div>
      </div>
      <header id="site-header" className="sticky top-0 z-40 border-b border-ink-100/80 bg-white/90 backdrop-blur-xl transition-shadow dark:border-ink-800/80 dark:bg-ink-950/85">
        <HeaderShadow />
        <div className="wrap flex h-16 items-center gap-3 lg:h-[72px]">
          <Link href={u('/')} className="mr-2 flex shrink-0 items-center" aria-label={t('Musafir home', 'মুসাফির হোম')}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/brand/logo-compact.svg" alt={t('Musafir — মুসাফির', 'মুসাফির — Musafir')} width={172} height={48} className="h-10 w-auto dark:hidden lg:h-11" />
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/brand/logo-compact-dark.svg" alt="" aria-hidden="true" width={172} height={48} className="hidden h-10 w-auto dark:block lg:h-11" />
          </Link>
          <nav className="hidden flex-1 items-center gap-0.5 lg:flex" aria-label={t('Main', 'প্রধান')}>
            {header.map((m, k) => {
              const chevron = <Icon name="chevron-down" className="h-4 w-4 opacity-60" />;
              if (m.meta?.mega === 'tours')
                return (
                  <Dropdown key={k} under={[m.url, ...(m.meta?.also ?? [])].filter((x): x is string => !!x).map((x) => u(x))} label={<>{m.label} {chevron}</>} panelClass="absolute left-0 top-full z-50 mt-2 w-[720px] rounded-2xl border border-ink-100 bg-white p-6 shadow-lift dark:border-ink-800 dark:bg-ink-900">
                    <div className="grid grid-cols-3 gap-6">
                      {mega.map((col, c) => (
                        <div key={c}><p className="mb-3 text-xs font-bold uppercase tracking-wider text-ink-400">{col.label}</p>
                          <ul className="space-y-1">{col.children.map((l, x) => <li key={x}><Link className={ddLink} href={u(l.url ?? '/')}>{l.label}</Link></li>)}</ul></div>
                      ))}
                    </div>
                    <div className="mt-5 flex items-center justify-between rounded-xl bg-gradient-to-r from-brand-700 to-brand-600 p-4 text-white">
                      <div><p className="font-bold">{t('Not sure where to go?', 'কোথায় যাবেন ঠিক করতে পারছেন না?')}</p><p className="text-sm text-brand-100">{t('Tell us your budget — we design the trip in 24 hours.', 'বাজেট জানান — ২৪ ঘণ্টায় আমরা ট্যুর সাজিয়ে দেব।')}</p></div>
                      <Link href={u('/trip-planner')} className="btn btn-accent btn-sm">{t('Plan my trip', 'ট্যুর প্ল্যান করুন')}</Link>
                    </div>
                  </Dropdown>
                );
              if (m.meta?.mega === 'holidays')
                return (
                  <Dropdown key={k} under={[m.url, ...(m.meta?.also ?? [])].filter((x): x is string => !!x).map((x) => u(x))} label={<>{m.label} {chevron}</>} panelClass="absolute left-0 top-full z-50 mt-2 w-[600px] overflow-hidden rounded-2xl border border-ink-100 bg-white shadow-lift dark:border-ink-800 dark:bg-ink-900">
                    <div className="grid grid-cols-[1.2fr_1fr]">
                      <div className="grid grid-cols-1 gap-1 p-5">
                        {themes.map((th) => (
                          <Link key={th.slug} href={u(`/holidays/${th.slug}`)} className="flex gap-3 rounded-xl p-2 hover:bg-brand-50 dark:hover:bg-ink-800"><span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-brand-50 text-brand-700 dark:bg-brand-900/40 dark:text-brand-300"><Icon name={th.icon} className="h-[18px] w-[18px]" /></span><span className="min-w-0"><span className="block text-sm font-semibold text-ink-800 dark:text-white">{th.name}</span><span className="block truncate text-xs text-ink-500 dark:text-ink-300">{th.tagline}</span></span></Link>
                        ))}
                        <Link href={u('/holidays')} className="mt-1 px-2 text-sm font-semibold text-brand-700 dark:text-brand-300">{t('All holiday themes →', 'সব হলিডে থিম →')}</Link>
                      </div>
                      <Link href={u('/cruises')} className="relative block min-h-[260px] overflow-hidden">
                        <Picture img={cruiseImage} className="img-cover absolute inset-0" />
                        <span className="absolute inset-0 bg-gradient-to-t from-ink-950/90 via-ink-950/30" />
                        <span className="absolute bottom-0 p-5 text-white"><span className="badge mb-2 bg-accent-400 text-ink-900">{t('New: cruises', 'নতুন: ক্রুজ')}</span><span className="block text-lg font-bold">{t('Cruises from ৳21,500', 'ক্রুজ ৳২১,৫০০ থেকে')}</span><span className="block text-sm text-ink-200">{t('Singapore, Gulf, Greek Isles & Sundarbans', 'সিঙ্গাপুর, উপসাগর, গ্রিক দ্বীপ ও সুন্দরবন')}</span></span>
                      </Link>
                    </div>
                  </Dropdown>
                );
              if (m.children.length)
                return (
                  <Dropdown key={k} label={<>{m.label} {chevron}</>} panelClass="absolute right-0 top-full z-50 mt-2 w-64 rounded-2xl border border-ink-100 bg-white p-2 shadow-lift dark:border-ink-800 dark:bg-ink-900">
                    {m.children.map((c, x) => <Link key={x} href={u(c.url ?? '/')} className="block rounded-lg px-3 py-2 text-sm font-medium text-ink-700 hover:bg-ink-50 hover:text-brand-700 dark:text-ink-200 dark:hover:bg-ink-800 dark:hover:text-white">{c.label}</Link>)}
                  </Dropdown>
                );
              return (
                <ActiveLink key={k} href={u(m.url ?? '/')} className={`nav-link ${showFrom[m.meta?.show_from] ?? ''}`}>
                  {m.label}{m.meta?.dot ? <> <span className="h-1.5 w-1.5 rounded-full bg-accent-500" /></> : null}
                </ActiveLink>
              );
            })}
          </nav>
          <div className="ml-auto flex items-center gap-1">
            <LangLink to={i.other} className="icon-btn w-auto px-2.5 text-sm font-bold" label={t('বাংলায় দেখুন', 'View in English')}>{i.lang === 'en' ? 'বাং' : 'EN'}</LangLink>
            <ThemeToggle className="icon-btn" label={t('Toggle dark mode', 'ডার্ক মোড চালু/বন্ধ')}><Icon name="moon" className="h-5 w-5 dark:hidden" /><Icon name="sun" className="hidden h-5 w-5 dark:block" /></ThemeToggle>
            <Link href={u('/wishlist')} className="icon-btn relative hidden sm:inline-flex" aria-label={t('Wishlist', 'উইশলিস্ট')}><Icon name="heart" /><WishCount className="absolute right-1 top-1 min-w-[18px] rounded-full bg-accent-500 px-1 text-center text-[10px] font-bold leading-[18px] text-white" /></Link>
            <AccountLink signInHref={u('/login')} accountHref={u('/account')} signIn={t('Sign in', 'সাইন ইন')} hi={t('My account', 'আমার অ্যাকাউন্ট')} className="btn btn-ghost btn-sm hidden xl:inline-flex"><Icon name="circle-user-round" className="h-[18px] w-[18px]" /></AccountLink>
            <Link href={u('/custom-tour')} className="btn btn-primary btn-sm hidden xl:inline-flex">{t('Get a quote', 'কোটেশন নিন')}</Link>
            <Drawer
              openLabel={t('Open menu', 'মেনু খুলুন')}
              closeLabel={t('Close menu', 'মেনু বন্ধ করুন')}
              title={t('Menu', 'মেনু')}
              openIcon={<Icon name="menu" className="h-6 w-6" />}
              closeIcon={<Icon name="x" className="h-6 w-6" />}
              header={<>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src="/brand/logo-compact.svg" alt="" className="h-9 w-auto dark:hidden" width={140} height={40} />
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src="/brand/logo-compact-dark.svg" alt="" className="hidden h-9 w-auto dark:block" width={140} height={40} />
              </>}
              footer={
                <div className="space-y-3 border-t border-ink-100 p-4 dark:border-ink-800">
                  <div className="grid grid-cols-2 gap-2">
                    <LangLink to={i.other} className="btn btn-outline btn-sm"><Icon name="languages" className="h-4 w-4" /> {i.lang === 'en' ? 'বাংলা' : 'English'}</LangLink>
                    <ThemeToggle className="btn btn-outline btn-sm" label={t('Theme', 'থিম')}><Icon name="moon" className="h-4 w-4 dark:hidden" /><Icon name="sun" className="hidden h-4 w-4 dark:block" /> {t('Theme', 'থিম')}</ThemeToggle>
                  </div>
                  <div className="flex items-center justify-between gap-3 rounded-xl border border-ink-200 px-3 py-2 dark:border-ink-700"><label htmlFor="cur-m" className="flex items-center gap-2 text-sm font-semibold"><Icon name="coins" className="h-4 w-4" /> {t('Currency', 'মুদ্রা')}</label><CurrencySelect id="cur-m" className="input w-auto py-1.5 text-sm" /></div>
                  <AccountLink signInHref={u('/login')} accountHref={u('/account')} signIn={t('Sign in / Register', 'সাইন ইন / রেজিস্টার')} hi={t('My account', 'আমার অ্যাকাউন্ট')} className="btn btn-primary w-full"><Icon name="circle-user-round" className="h-[18px] w-[18px]" /></AccountLink>
                  <a href={`tel:${company.hotline_tel}`} className="flex items-center justify-center gap-2 text-sm font-semibold text-ink-600 dark:text-ink-300"><Icon name="phone" className="h-4 w-4" /> {d(company.hotline)}</a>
                </div>
              }
            >
              <nav className="flex-1 overflow-y-auto p-3" aria-label={t('Mobile', 'মোবাইল')}>
                <details className="group rounded-xl"><summary className="flex cursor-pointer list-none items-center justify-between rounded-xl px-3 py-3 font-semibold text-ink-800 dark:text-white">{t('Tours', 'ট্যুর')} <Icon name="chevron-down" className="h-4 w-4 transition group-open:rotate-180" /></summary>
                  <div className="pb-2 pl-3">{mega.map((col, c) => (<div key={c}><p className="px-3 pt-2 text-xs font-bold uppercase tracking-wider text-ink-400">{col.label}</p>{col.children.map((l, x) => <Link key={x} href={u(l.url ?? '/')} className="block rounded-lg px-3 py-2 text-sm text-ink-600 dark:text-ink-300">{l.label}</Link>)}</div>))}<Link href={u('/tours')} className="block rounded-lg px-3 py-2 text-sm font-semibold text-brand-700 dark:text-brand-300">{t('All tours →', 'সব ট্যুর →')}</Link></div></details>
                <details className="group rounded-xl"><summary className="flex cursor-pointer list-none items-center justify-between rounded-xl px-3 py-3 font-semibold text-ink-800 dark:text-white">{t('Holidays', 'হলিডে')} <Icon name="chevron-down" className="h-4 w-4 transition group-open:rotate-180" /></summary>
                  <div className="pb-2 pl-3">{themes.map((th) => <Link key={th.slug} href={u(`/holidays/${th.slug}`)} className="block rounded-lg px-3 py-2 text-sm text-ink-600 dark:text-ink-300">{th.name}</Link>)}<Link href={u('/holidays')} className="block rounded-lg px-3 py-2 text-sm font-semibold text-brand-700 dark:text-brand-300">{t('All themes →', 'সব থিম →')}</Link></div></details>
                <Link href={u('/cruises')} className="block rounded-xl px-3 py-3 font-semibold text-ink-800 hover:bg-ink-50 dark:text-white dark:hover:bg-ink-800">{t('Cruises', 'ক্রুজ')}</Link>
                {(menus['mobile'] ?? []).map((m, k) => <Link key={k} href={u(m.url ?? '/')} className="block rounded-xl px-3 py-3 font-semibold text-ink-800 hover:bg-ink-50 dark:text-white dark:hover:bg-ink-800">{m.label}</Link>)}
              </nav>
            </Drawer>
          </div>
        </div>
      </header>
    </>
  );
}
