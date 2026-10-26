import { redirect } from 'next/navigation';
import { isLang } from '@/lib/format';
import { me } from '@/lib/account';

/** Old mockup URL: open the next upcoming trip (holiday or cruise first), else the bookings list. */
export default async function LegacyBooking({ params }: PageProps<'/[lang]/account/booking'>) {
  const { lang: l } = await params;
  const lang = isLang(l) ? l : 'en';
  const x = await me<any>('bookings', lang, `/${lang}/account/booking`);
  const live = (x.items as any[]).filter((b) => ['confirmed', 'partial', 'pending'].includes(b.status)).sort((a, b) => String(a.travel_start).localeCompare(String(b.travel_start)));
  const pick = live.find((b) => ['tour', 'cruise'].includes(b.kind)) ?? live[0];
  redirect(pick ? `/${lang}/account/bookings/${pick.ref}` : `/${lang}/account/bookings`);
}
