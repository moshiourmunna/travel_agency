import { accountCtx, accountMetadata, AccountHead } from '@/components/account/page';
import { Empty, Status } from '@/components/account/ui';
import { CopyButton } from '@/components/detail/Actions';
import { Icon } from '@/components/icons/Icon';
import { Avatar } from '@/components/ui/basics';
import { me } from '@/lib/account';
import { getSite } from '@/lib/site';

export const generateMetadata = accountMetadata('referrals');

export default async function Referrals({ params }: PageProps<'/[lang]/account/referrals'>) {
  const { lang, i } = await accountCtx(params);
  const { t, d, bdt, date } = i;
  const [x, site] = await Promise.all([me<any>('referrals', lang, `/${lang}/account/referrals`), getSite(lang)]);
  const brand = site.settings.company?.short_name || 'Musafir';
  const share = lang === 'bn' ? `${brand}-এ ${bdt(x.friend_discount)} ছাড় পেতে আমার কোড ${x.code} ব্যবহার করুন:` : `Use my code ${x.code} for ${bdt(x.friend_discount)} off at ${brand}:`;
  return (
    <>
      <AccountHead i={i} k="referrals" sub={lang === 'bn' ? `বন্ধুদের প্রথম ট্রিপে ${bdt(x.friend_discount)} ছাড় দিন, তারা ভ্রমণ করলে আপনি পাবেন ${bdt(x.reward)}।` : `Give friends ${bdt(x.friend_discount)} off their first trip and get ${bdt(x.reward)} when they travel.`} />
      <section className="card overflow-hidden">
        <div className="grid gap-6 p-5 sm:p-8 lg:grid-cols-2 lg:items-center">
          <div>
            <h2 className="text-2xl font-extrabold">{t('Share your code', 'আপনার কোড শেয়ার করুন')}</h2>
            <p className="mt-2 muted">{lang === 'bn'
              ? `আপনার বন্ধু ${bdt(x.min_total)}-এর বেশি যেকোনো হলিডে বা ক্রুজে ${bdt(x.friend_discount)} ছাড় পাবেন। তাদের ট্রিপের পর আপনার ওয়ালেটে ${bdt(x.reward)}।`
              : `Your friend gets ${bdt(x.friend_discount)} off any holiday or cruise over ${bdt(x.min_total)}. You get ${bdt(x.reward)} in your wallet after their trip.`}</p>
            <div className="mt-5 flex max-w-md items-center gap-2 rounded-2xl border-2 border-dashed border-brand-300 bg-brand-50 p-2 pl-4 dark:border-brand-700 dark:bg-brand-900/30">
              <code className="flex-1 text-lg font-extrabold tracking-wider text-brand-800 dark:text-brand-200" data-referral-code>{x.code}</code>
              <CopyButton value={x.code} label={`${t('Copy', 'কপি')} ${x.code}`} copied={t('Copied!', 'কপি হয়েছে!')} className="btn btn-primary btn-sm"><Icon name="copy" className="h-4 w-4" /> {t('Copy', 'কপি')}</CopyButton>
            </div>
            <div className="mt-4 flex flex-wrap gap-2">
              <a className="btn btn-outline btn-sm" href={`https://wa.me/?text=${encodeURIComponent(`${share} ${x.link}`)}`} target="_blank" rel="noopener"><Icon name="whatsapp" className="h-4 w-4 text-[#1FAF38]" /> WhatsApp</a>
              <a className="btn btn-outline btn-sm" href={`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(x.link)}`} target="_blank" rel="noopener"><Icon name="facebook" className="h-4 w-4 text-[#1877F2]" /> Facebook</a>
              <a className="btn btn-outline btn-sm" href={`mailto:?subject=${encodeURIComponent(brand)}&body=${encodeURIComponent(`${share} ${x.link}`)}`}><Icon name="mail" className="h-4 w-4" /> {t('Email', 'ইমেইল')}</a>
              <CopyButton value={x.link} label={t('Copy invite link', 'আমন্ত্রণ লিংক কপি')} copied={t('Copied!', 'কপি হয়েছে!')} className="btn btn-outline btn-sm"><Icon name="link" className="h-4 w-4" /> {t('Copy link', 'লিংক কপি')}</CopyButton>
            </div>
          </div>
          <dl className="grid grid-cols-3 gap-3 text-center">
            {([[t('Invited', 'আমন্ত্রিত'), d(x.stats.invited)], [t('Travelled', 'ভ্রমণ করেছেন'), d(x.stats.travelled)], [t('Earned', 'অর্জিত'), bdt(x.stats.earned)]] as [string, string][]).map(([l, v]) => (
              <div key={l} className="rounded-2xl bg-ink-50 p-4 dark:bg-ink-850"><dt className="text-xs muted">{l}</dt><dd className="mt-1 text-xl font-extrabold [overflow-wrap:anywhere]">{v}</dd></div>
            ))}
          </dl>
        </div>
      </section>
      <section className="card mt-6 p-4 sm:p-6" aria-labelledby="rf-h">
        <h2 id="rf-h" className="text-lg font-bold">{t('Your referrals', 'আপনার রেফারেল')}</h2>
        {x.items.length ? (
          <ul className="mt-3 divide-y divide-ink-100 dark:divide-ink-800">
            {x.items.map((r: any, k: number) => (
              <li key={k} className="flex items-center gap-3 py-3" data-referral={r.status}>
                <Avatar initials={r.initials} className="h-9 w-9 text-xs" />
                <div className="flex-1"><p className="font-semibold">{r.name}</p><p className="text-xs muted">{t('Joined', 'যোগদান')} {date(r.date)}</p></div>
                {r.status === 'won' ? <span className="font-bold text-emerald-700 dark:text-emerald-400">+{bdt(r.reward)}</span> : <Status t={t} s={r.status === 'joined' ? 'joined' : 'pending'} />}
              </li>
            ))}
          </ul>
        ) : <div className="mt-3"><Empty icon="gift" title={t('No referrals yet', 'এখনও কোনো রেফারেল নেই')} sub={t('Share your code — rewards appear here after your friends travel.', 'কোড শেয়ার করুন — বন্ধুরা ভ্রমণ করলে পুরস্কার এখানে দেখা যাবে।')} /></div>}
      </section>
    </>
  );
}
