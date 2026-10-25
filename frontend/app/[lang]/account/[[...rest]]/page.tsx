import { redirect } from 'next/navigation';

/** Traveller portal entry (M5 replaces this with the signed-in dashboard); signed-out visitors always land on sign-in. */
export default async function Account({ params }: PageProps<'/[lang]/account/[[...rest]]'>) {
  const { lang, rest } = await params;
  redirect(`/${lang}/login?next=${encodeURIComponent(`/${lang}/account${rest?.length ? '/' + rest.join('/') : ''}`)}`);
}
