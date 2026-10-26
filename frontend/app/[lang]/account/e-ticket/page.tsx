import { redirect } from 'next/navigation';
import { isLang } from '@/lib/format';
import { me } from '@/lib/account';

/** Old mockup URL: the next flight's e-ticket, else the bookings list filtered to flights. */
export default async function LegacyTicket({ params }: PageProps<'/[lang]/account/e-ticket'>) {
  const { lang: l } = await params;
  const lang = isLang(l) ? l : 'en';
  const x = await me<any>('bookings', lang, `/${lang}/account/e-ticket`);
  const f = (x.items as any[]).filter((b) => b.kind === 'flight' && ['confirmed', 'partial'].includes(b.status)).sort((a, b) => String(a.travel_start).localeCompare(String(b.travel_start)))[0];
  redirect(f ? `/${lang}/account/bookings/${f.ref}/ticket` : `/${lang}/account/bookings`);
}
