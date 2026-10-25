import Link from 'next/link';
import { Icon } from '@/components/icons/Icon';
import { AppBadges, type AppLinks } from '@/components/ui/AppBadges';
import { NewsletterForm } from '@/components/client/Forms';
import { CookieSettingsButton } from '@/components/client/Widgets';
import type { I18n } from '@/lib/i18n';
import type { MenuItem } from './Header';

const PAY = [['bKash', '#E2136E'], ['Nagad', '#C4161C'], ['Rocket', '#8C3494'], ['VISA', '#1A1F71'], ['Mastercard', '#EB001B'], ['AMEX', '#2E77BC'], ['SSLCOMMERZ', '#0F6CB6']];

export function Footer({ i, company, social, app, menus, menuNames }: { i: I18n; company: Record<string, any>; app: AppLinks; social: { key: string; url: string }[]; menus: Record<string, MenuItem[]>; menuNames: Record<string, string> }) {
  const { t, u, d } = i;
  const NAMES: Record<string, string> = { facebook: 'Facebook', instagram: 'Instagram', youtube: 'YouTube', linkedin: 'LinkedIn', whatsapp: 'WhatsApp', 'x-logo': 'X', tiktok: 'TikTok' };
  const col = (loc: string, title: string) => (
    <div key={loc}><h3 className="text-sm font-bold text-white">{menuNames[loc] ?? title}</h3><ul className="mt-4 space-y-2.5 text-sm">
      {(menus[loc] ?? []).map((m, k) => <li key={k}><Link className="hover:text-white" href={u(m.url ?? '/')}>{m.label}</Link></li>)}</ul></div>
  );
  return (
    <footer className="relative overflow-hidden bg-ink-950 text-ink-300" aria-labelledby="footer-h">
      <h2 id="footer-h" className="sr-only">{t('Footer', 'ফুটার')}</h2>
      <div className="pattern-dots pointer-events-none absolute inset-0 opacity-40" />
      <div className="wrap relative">
        <div className="grid gap-6 border-b border-white/10 py-10 md:grid-cols-[1.2fr_1fr] md:items-center">
          <div><p className="text-2xl font-extrabold text-white">{t('Get travel deals before anyone else', 'সবার আগে ট্রাভেল অফার পান')}</p><p className="mt-1 text-sm text-ink-400">{t('One email a fortnight. Flash fares, cruise deals and new tours. Unsubscribe anytime.', 'দুই সপ্তাহে একটি ইমেইল — ফ্ল্যাশ ভাড়া, ক্রুজ অফার ও নতুন ট্যুর। যেকোনো সময় আনসাবস্ক্রাইব করা যায়।')}</p></div>
          <NewsletterForm labels={{ email: t('Email address', 'ইমেইল ঠিকানা'), placeholder: t('you@example.com', 'আপনার@ইমেইল.com'), invalid: t('Please enter a valid email.', 'সঠিক ইমেইল দিন।'), submit: t('Subscribe', 'সাবস্ক্রাইব'), success: t('Subscribed! Please check your inbox to confirm.', 'সাবস্ক্রাইব সম্পন্ন! নিশ্চিত করতে ইনবক্স দেখুন।'), already: t('You are already subscribed.', 'আপনি আগেই সাবস্ক্রাইব করেছেন।') }} />
        </div>
        <div className="grid gap-10 py-12 sm:grid-cols-2 lg:grid-cols-[1.5fr_1fr_1fr_1fr_1.3fr]">
          <div>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/brand/logo-dark.svg" alt={t('Musafir — মুসাফির', 'মুসাফির — Musafir')} className="h-12 w-auto" width={260} height={54} loading="lazy" />
            <p className="mt-4 max-w-xs text-sm leading-6 text-ink-400">{company.about_short}</p>
            <div className="mt-5 flex gap-2">
              {social.filter((s) => s.url).map((s) => (
                <a key={s.key} href={s.url} target="_blank" rel="noopener" className="grid h-10 w-10 place-items-center rounded-xl bg-white/5 text-ink-300 transition hover:bg-brand-600 hover:text-white" aria-label={NAMES[s.key] ?? s.key}><Icon name={s.key} className="h-[18px] w-[18px]" /></a>
              ))}
            </div>
          </div>
          {col('footer-1', t('Travel', 'ভ্রমণ'))}
          {col('footer-2', t('Holidays', 'হলিডে'))}
          {col('footer-3', t('Company', 'প্রতিষ্ঠান'))}
          <div><h3 className="text-sm font-bold text-white">{t('Head office', 'প্রধান কার্যালয়')}</h3>
            <address className="mt-4 space-y-3 text-sm not-italic">
              <p className="flex gap-2"><Icon name="map-pin" className="mt-0.5 h-4 w-4 shrink-0 text-brand-400" /><span>{company.address}</span></p>
              <p className="flex gap-2"><Icon name="phone" className="mt-0.5 h-4 w-4 shrink-0 text-brand-400" /><a className="hover:text-white" href={`tel:${company.hotline_tel}`}>{d(company.hotline)}</a></p>
              <p className="flex gap-2"><Icon name="mail" className="mt-0.5 h-4 w-4 shrink-0 text-brand-400" /><a className="hover:text-white" href={`mailto:${company.email}`}>{company.email}</a></p>
              <p className="flex gap-2"><Icon name="clock-3" className="mt-0.5 h-4 w-4 shrink-0 text-brand-400" /><span>{company.hours}</span></p>
            </address>
            <div className="mt-5 flex gap-2"><AppBadges i={i} links={app} variant="footer" /></div>
          </div>
        </div>
        <div className="flex flex-col gap-5 border-t border-white/10 py-6 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex flex-wrap items-center gap-2" aria-label={t('Accreditations', 'স্বীকৃতি')}>
            {(company.licences ?? []).map((l: { name: string; number: string }, k: number) => <span key={k} className="rounded-lg border border-white/10 px-2.5 py-1 text-[11px] font-semibold text-ink-300">{l.name} <span className="text-ink-500">#{d(l.number)}</span></span>)}
          </div>
          <div className="flex flex-wrap items-center gap-1.5" aria-label={t('Payment methods', 'পেমেন্ট মাধ্যম')}>
            {PAY.map(([p, c]) => <span key={p} className="rounded-md bg-white px-2 py-1 text-[11px] font-extrabold tracking-tight" style={{ color: c }}>{p}</span>)}
          </div>
        </div>
        <div className="flex flex-col gap-3 border-t border-white/10 py-6 pb-24 text-xs text-ink-400 sm:flex-row sm:items-center sm:justify-between lg:pb-6">
          <p>© {d(new Date().getFullYear())} {company.name}. {t('All rights reserved.', 'সর্বস্বত্ব সংরক্ষিত।')}</p>
          <nav className="flex flex-wrap gap-x-4 gap-y-1" aria-label={t('Legal', 'আইনি')}>
            {(menus['legal'] ?? []).map((m, k) => <Link key={k} className="hover:text-white" href={u(m.url ?? '/')}>{m.label}</Link>)}
            <CookieSettingsButton label={t('Cookie settings', 'কুকি সেটিংস')} />
          </nav>
        </div>
      </div>
    </footer>
  );
}
