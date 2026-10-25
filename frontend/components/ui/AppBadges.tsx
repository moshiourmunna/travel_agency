import { Icon } from '@/components/icons/Icon';
import type { I18n } from '@/lib/i18n';

export type AppLinks = { play_url?: string; appstore_url?: string };

/** Store badges. A store without a URL (app not yet published) renders as a non-link "coming soon" badge — never a dead "#" link. */
export function AppBadges({ i, links, variant }: { i: I18n; links: AppLinks; variant: 'footer' | 'promo' }) {
  const stores = [
    { url: links.play_url, icon: 'play', pre: i.t('Get it on', 'ডাউনলোড'), name: 'Google Play' },
    { url: links.appstore_url, icon: 'apple', pre: i.t('Download on', 'ডাউনলোড'), name: 'App Store' },
  ];
  const soon = i.t('Coming soon', 'শীঘ্রই আসছে');
  return (
    <>
      {stores.map((s, k) => {
        const cls = variant === 'footer'
          ? 'flex items-center gap-2 rounded-xl border border-white/10 px-3 py-2 text-xs' + (s.url ? ' hover:border-white/30' : '')
          : k === 0 ? 'btn btn-white' : 'btn border border-white/30 text-white' + (s.url ? ' hover:bg-white/10' : '');
        const body = variant === 'footer'
          ? <><Icon name={s.icon} className="h-4 w-4" /><span><span className="block text-[10px] text-ink-400">{s.url ? s.pre : soon}</span><b className="text-white">{s.name}</b></span></>
          : <><Icon name={s.icon} className="h-4 w-4" /> {s.name}{!s.url && <span className="text-[10px] font-semibold opacity-70">· {soon}</span>}</>;
        return s.url
          ? <a key={k} href={s.url} target="_blank" rel="noopener" className={cls}>{body}</a>
          : <span key={k} className={cls} title={`${s.name} — ${soon}`}>{body}</span>;
      })}
    </>
  );
}
