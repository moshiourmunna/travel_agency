import { ApiButton, RowFilter } from '@/components/account/client';
import { accountCtx, accountMetadata, AccountHead, ago } from '@/components/account/page';
import { Empty } from '@/components/account/ui';
import { Icon } from '@/components/icons/Icon';
import { me } from '@/lib/account';

export const generateMetadata = accountMetadata('notifications');

export default async function Notifications({ params }: PageProps<'/[lang]/account/notifications'>) {
  const { lang, i } = await accountCtx(params);
  const { t, u, d } = i;
  const x = await me<any>('notifications', lang, `/${lang}/account/notifications`);
  const n = (k: string) => x.items.filter((z: any) => z.kind === k).length;
  const chips = [{ value: 'all', label: t('All', 'সব'), count: d(x.items.length) },
    ...([['booking', t('Bookings', 'বুকিং')], ['visa', t('Visa', 'ভিসা')], ['traveller', t('Travellers', 'ভ্রমণকারী')], ['review', t('Reviews', 'রিভিউ')], ['offer', t('Offers', 'অফার')]] as [string, string][])
      .filter(([k]) => n(k)).map(([k, l]) => ({ value: k, label: l, count: d(n(k)) }))];
  return (
    <>
      <AccountHead i={i} k="notifications" sub={null}>
        {x.unread ? (
          <ApiButton method="POST" path="notifications/read" body={{}} className="btn btn-outline btn-sm" success={t('All marked as read', 'সব পঠিত হিসেবে চিহ্নিত')}>
            <Icon name="check-check" className="h-4 w-4" /> {t('Mark all read', 'সব পঠিত')}
          </ApiButton>
        ) : null}
        <a href={`${u('/account/settings')}#notif`} className="btn btn-outline btn-sm"><Icon name="settings" className="h-4 w-4" /> {t('Preferences', 'পছন্দ')}</a>
      </AccountHead>
      {x.items.length ? (
        <div id="ntf">
          <RowFilter target="ntf" field="cat" chips={chips} label={t('Filter notifications', 'নোটিফিকেশন ফিল্টার')} placeholder={t('Search notifications…', 'নোটিফিকেশন খুঁজুন…')} />
          <ul className="card divide-y divide-ink-100 dark:divide-ink-800">
            {x.items.map((z: any) => (
              <li key={z.id} className={`flex gap-3 p-4 sm:p-5 ${z.read ? '' : 'bg-brand-50/50 dark:bg-brand-900/10'}`} data-row data-cat={z.kind} data-unread={z.read ? '0' : '1'}>
                <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-white text-brand-700 ring-1 ring-ink-100 dark:bg-ink-900 dark:text-brand-300 dark:ring-ink-800"><Icon name={z.icon || 'bell'} className="h-5 w-5" /></span>
                <div className="min-w-0 flex-1">
                  <p className="font-semibold">{!z.read ? <><span className="mr-1.5 inline-block h-2 w-2 rounded-full bg-accent-500" aria-hidden="true" /><span className="sr-only">{t('Unread:', 'অপঠিত:')} </span></> : null}
                    {z.link ? <a href={z.link.startsWith('/') ? u(z.link) : z.link} className="hover:underline">{z.title}</a> : z.title}</p>
                  <p className="mt-0.5 text-sm muted">{z.body}</p>
                </div>
                <div className="flex shrink-0 flex-col items-end gap-1">
                  <time className="text-xs muted" dateTime={z.at}>{ago(i, z.at)}</time>
                  {!z.read ? (
                    <ApiButton method="POST" path="notifications/read" body={{ id: z.id }} className="icon-btn h-8 w-8" label={`${t('Mark as read', 'পঠিত হিসেবে চিহ্নিত')}: ${z.title}`} success={t('Marked as read', 'পঠিত হিসেবে চিহ্নিত')}>
                      <Icon name="check" className="h-4 w-4" />
                    </ApiButton>
                  ) : null}
                </div>
              </li>
            ))}
          </ul>
          <p className="card mt-3 p-8 text-center text-sm muted" data-rows-empty hidden>{t('Nothing here.', 'এখানে কিছু নেই।')}</p>
        </div>
      ) : <Empty icon="bell" title={t('You are all caught up', 'নতুন কিছু নেই')} sub={t('Trip alerts, payment reminders and offers appear here.', 'ট্রিপ অ্যালার্ট, পেমেন্ট রিমাইন্ডার ও অফার এখানে দেখা যাবে।')} />}
    </>
  );
}
