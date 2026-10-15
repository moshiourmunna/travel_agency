import { Link, usePage } from '@inertiajs/react';
import {
  BadgeDollarSign, Boxes, Briefcase, Building2, CalendarClock, ClipboardList, CreditCard, FileText, Globe, HelpCircle, Hotel, Image as ImageIcon, Inbox,
  LayoutDashboard, LogOut, Luggage, MapPin, Menu, Moon, Plane, Plug, ScrollText, Settings2, ShieldCheck, Star, Stamp, Sun, UserRound, Users, UsersRound, ExternalLink,
} from 'lucide-react';
import * as React from 'react';
import { toast, Toaster } from 'sonner';
import { DialogRoot, DialogTrigger, SheetContent } from '@/components/ui/dialog';
import { useT } from '@/lib/i18n';
import { cn } from '@/lib/utils';
import type { SharedProps } from '@/types';

const RES_ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  packages: Boxes, prices: BadgeDollarSign, hotels: Hotel, flights: Plane, 'visa-types': Stamp, agents: Briefcase, users: UsersRound, posts: FileText,
  faqs: HelpCircle, gallery: ImageIcon, team: UserRound, reviews: Star, branches: MapPin,
};

type NavItem = { href: string; label: string; icon: React.ComponentType<{ className?: string }>; active: boolean; testid?: string };

function useNav(): { group: string; items: NavItem[] }[] {
  const { props, url } = usePage<SharedProps>();
  const t = useT();
  const path = url.split('?')[0];
  const on = (p: string, exact = false) => (exact ? path === p : path === p || path.startsWith(p + '/'));
  const m = props.modules;
  const ops: NavItem[] = [
    { href: '/admin/bookings', label: t('Bookings'), icon: ClipboardList, active: on('/admin/bookings') },
    { href: '/admin/customers', label: t('Customers'), icon: Users, active: on('/admin/customers') },
    { href: '/admin/pilgrims', label: t('Pilgrims'), icon: Luggage, active: on('/admin/pilgrims') },
    { href: '/admin/payments', label: t('Payments'), icon: CreditCard, active: on('/admin/payments') },
  ];
  if (m.preregistration) ops.push({ href: '/admin/pre-registrations', label: t('Pre-registrations'), icon: CalendarClock, active: on('/admin/pre-registrations') });
  if (m.agents) ops.push({ href: '/admin/commissions', label: t('Commissions'), icon: Building2, active: on('/admin/commissions') || on('/admin/agents') });
  ops.push({ href: '/admin/inbox', label: t('Enquiries & Visa desk'), icon: Inbox, active: on('/admin/inbox') });
  const sys: NavItem[] = [
    { href: '/admin/settings', label: t('Languages · Modules · Licences'), icon: Settings2, active: on('/admin/settings') },
    { href: '/admin/integrations', label: t('Integrations'), icon: Plug, active: on('/admin/integrations') },
  ];
  if (props.auth.user?.isOwner) sys.push({ href: '/admin/audit-log', label: t('Audit log'), icon: ShieldCheck, active: on('/admin/audit-log') });
  return [
    { group: '', items: [{ href: '/admin', label: t('Dashboard'), icon: LayoutDashboard, active: on('/admin', true) }] },
    { group: t('Operations'), items: ops },
    { group: t('Catalogue & content'), items: props.nav.resources.map((r) => ({ href: `/admin/manage/${r.key}`, label: t(r.label), icon: RES_ICONS[r.key] ?? ScrollText, active: on(`/admin/manage/${r.key}`) })) },
    { group: t('System'), items: sys },
  ];
}

function NavLinks({ onNavigate }: { onNavigate?: () => void }) {
  const groups = useNav();
  return (
    <nav aria-label="Admin" className="flex-1 space-y-4 px-3 py-4">
      {groups.map((g, i) => (
        <div key={i}>
          {g.group && <p className="mb-1 px-3 text-[11px] font-semibold uppercase tracking-wider text-white/45">{g.group}</p>}
          <ul className="space-y-0.5">
            {g.items.map((it) => (
              <li key={it.href}>
                <Link href={it.href} onClick={onNavigate} aria-current={it.active ? 'page' : undefined}
                  className={cn('flex min-h-9 items-center gap-2.5 rounded-lg px-3 py-1.5 text-[13.5px] text-white/80 hover:bg-white/10 hover:text-white', it.active && 'bg-white/15 font-medium text-white')}>
                  <it.icon className="size-4 shrink-0 opacity-80" /><span className="truncate">{it.label}</span>
                </Link>
              </li>
            ))}
          </ul>
        </div>
      ))}
    </nav>
  );
}

function Brand() {
  const { site } = usePage<SharedProps>().props;
  return (
    <Link href="/admin" className="flex items-center gap-2 border-b border-white/10 px-5 py-4">
      <img src="/assets/logo-white.svg" alt={site.name} className="h-8 w-auto max-w-[180px]" />
    </Link>
  );
}

function LogoutForm({ className }: { className?: string }) {
  const t = useT();
  const token = typeof document !== 'undefined' ? document.querySelector<HTMLMetaElement>('meta[name=csrf-token]')?.content ?? '' : '';
  return (
    <form method="post" action="/logout" className={className}>
      <input type="hidden" name="_token" value={token} />
      <button type="submit" className="flex w-full min-h-9 items-center gap-2.5 rounded-lg px-3 py-1.5 text-[13.5px] text-white/80 hover:bg-white/10 hover:text-white"><LogOut className="size-4" />{t('Logout')}</button>
    </form>
  );
}

function SideFooter() {
  const t = useT();
  return (
    <div className="space-y-0.5 border-t border-white/10 px-3 py-3">
      <a href="/" className="flex min-h-9 items-center gap-2.5 rounded-lg px-3 py-1.5 text-[13.5px] text-white/80 hover:bg-white/10 hover:text-white"><ExternalLink className="size-4" />{t('Back to site')}</a>
      <LogoutForm />
    </div>
  );
}

export function LanguageSwitcher() {
  const { languages, locale } = usePage<SharedProps>().props;
  if (languages.length < 2) return null;
  return (
    <div className="flex items-center rounded-lg border border-[var(--border)] bg-[var(--card)] p-0.5" role="group" aria-label="Language">
      <Globe className="mx-1.5 hidden size-4 text-[var(--muted)] sm:block" aria-hidden />
      {languages.map((l) => (
        <a key={l.code} href={`/lang/${l.code}`} hrefLang={l.code} lang={l.code} title={l.native} aria-current={l.code === locale ? 'true' : undefined}
          className={cn('inline-flex h-8 min-w-8 items-center justify-center rounded-md px-2 text-xs font-semibold', l.code === locale ? 'bg-brand-600 text-white' : 'text-[var(--muted)] hover:text-[var(--fg)]')}>
          {l.label}
        </a>
      ))}
    </div>
  );
}

export function ThemeToggle() {
  const t = useT();
  const [dark, setDark] = React.useState(() => typeof document !== 'undefined' && document.documentElement.classList.contains('dark'));
  const toggle = () => {
    const next = !dark;
    setDark(next);
    document.documentElement.classList.toggle('dark', next);
    try { localStorage.setItem('adm-theme', next ? 'dark' : 'light'); } catch { /* private mode */ }
  };
  return (
    <button type="button" onClick={toggle} aria-pressed={dark} aria-label={t('Dark mode')} title={t('Dark mode')}
      className="inline-flex size-9 items-center justify-center rounded-lg border border-[var(--border)] bg-[var(--card)] text-[var(--muted)] hover:text-[var(--fg)]">
      {dark ? <Sun className="size-4" /> : <Moon className="size-4" />}
    </button>
  );
}

/** Flash messages and the first validation error become toasts (role=status, polite). */
function useFlashToasts() {
  const { flash, errors } = usePage<SharedProps>().props;
  React.useEffect(() => { if (flash?.ok) toast.success(flash.ok); }, [flash?.ok, flash]);
  React.useEffect(() => { if (flash?.err) toast.error(flash.err); }, [flash?.err, flash]);
  React.useEffect(() => { const first = errors && Object.values(errors)[0]; if (first) toast.error(first); }, [errors]);
}

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const { auth, dir } = usePage<SharedProps>().props;
  const t = useT();
  const [open, setOpen] = React.useState(false);
  useFlashToasts();
  React.useEffect(() => { document.documentElement.dir = dir; }, [dir]);
  return (
    <div className="min-h-dvh">
      <a href="#main" className="sr-only focus:not-sr-only focus:fixed focus:start-3 focus:top-3 focus:z-[60] focus:rounded-lg focus:bg-brand-600 focus:px-3 focus:py-2 focus:text-white">{t('Skip to content')}</a>
      <aside className="fixed inset-y-0 start-0 z-30 hidden w-64 flex-col overflow-y-auto bg-brand-900 text-white lg:flex no-print" aria-label={t('Menu')}>
        <Brand />
        <NavLinks />
        <SideFooter />
      </aside>
      <div className="lg:ps-64">
        <header className="sticky top-0 z-20 flex h-14 items-center gap-2 border-b border-[var(--border)] bg-[var(--bg)]/90 px-3 backdrop-blur sm:px-5 no-print">
          <DialogRoot open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <button type="button" className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-[var(--border)] bg-[var(--card)] px-2.5 text-sm lg:hidden" aria-label={t('Menu')} data-testid="menu-toggle">
                <Menu className="size-4" /><span className="hidden sm:inline">{t('Menu')}</span>
              </button>
            </DialogTrigger>
            <SheetContent label={t('Menu')}><Brand /><NavLinks onNavigate={() => setOpen(false)} /><SideFooter /></SheetContent>
          </DialogRoot>
          <div className="flex-1" />
          <LanguageSwitcher />
          <ThemeToggle />
          <div className="flex size-9 items-center justify-center rounded-full bg-gold-500 text-xs font-bold text-white" title={auth.user?.name} aria-label={auth.user?.name}>{auth.user?.initials}</div>
        </header>
        <main id="main" className="mx-auto w-full max-w-[1600px] px-3 py-5 sm:px-5 lg:px-8">{children}</main>
      </div>
      <Toaster position="top-center" richColors closeButton dir={dir} />
    </div>
  );
}
