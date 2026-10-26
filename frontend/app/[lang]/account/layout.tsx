import type { Metadata } from 'next';
import { AccountShell } from '@/components/account/Shell';
import { me } from '@/lib/account';
import type { Lang } from '@/lib/format';
import { getI18n } from '@/lib/i18n';
import { getSite } from '@/lib/site';

/** Signed-in traveller portal: its own app chrome (sidebar + top bar), never cached, never indexed. */
export const dynamic = 'force-dynamic';
export const metadata: Metadata = { robots: { index: false, follow: false } };

export default async function AccountLayout({ children, params }: LayoutProps<'/[lang]/account'>) {
  const lang = (await params).lang as Lang;
  const [i, site, s] = await Promise.all([getI18n(lang), getSite(lang), me<{ user: any; counts: any }>('summary', lang, `/${lang}/account`)]);
  return <AccountShell i={i} me={s.user} counts={s.counts} company={site.settings.company?.name ?? 'Musafir'}>{children}</AccountShell>;
}
