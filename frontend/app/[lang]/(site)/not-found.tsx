import type { Metadata } from 'next';
import { NotFoundView } from '@/components/client/NotFoundView';
import { Icon } from '@/components/icons/Icon';
import { getI18n } from '@/lib/i18n';

export const metadata: Metadata = { title: '404 — Page not found · Musafir', robots: { index: false, follow: true } };

/** Localised 404 (admin-editable strings via the UI dictionary). Must stay free of request APIs so pages remain static. */
export default async function NotFound() {
  const copy = Object.fromEntries(await Promise.all((['en', 'bn'] as const).map(async (l) => {
    const { t } = await getI18n(l);
    return [l, {
      kicker: t('Error 404', 'ত্রুটি ৪০৪'), title: t('Looks like this road leads nowhere', 'মনে হচ্ছে এই পথ কোথাও যায়নি'),
      text: t('The page may have moved. Try searching or head back to the start.', 'পাতাটি সরানো হতে পারে। খুঁজে দেখুন বা শুরুতে ফিরে যান।'),
      searchLabel: t('Search tours', 'ট্যুর খুঁজুন'), placeholder: t('Where to?', 'কোথায়?'), search: t('Search', 'খুঁজুন'),
      home: t('Home', 'হোম'), deals: t('Deals', 'ডিল'), contact: t('Contact', 'যোগাযোগ'),
    }] as const;
  })));
  // <title> rendered in the tree too: Next drops the metadata title of a not-found page after hydration (axe document-title).
  return <><title>404 — Page not found · Musafir</title><NotFoundView copy={copy as any} icon={<Icon name="search" className="h-4 w-4" />} /></>;
}
