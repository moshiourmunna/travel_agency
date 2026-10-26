'use client';
import { useSite } from './SiteContext';
import { KEYS, toast, useCompare, useWishlist, write } from './store';

export function WishButton({ id, kind = 'tour', label, className = '', children }: { id: string; kind?: string; label: string; className?: string; children: React.ReactNode }) {
  const list = useWishlist();
  const { msg } = useSite();
  const key = `${kind}:${id}`;
  const on = list.includes(key);
  return (
    <button
      type="button"
      className={`grid h-9 w-9 place-items-center rounded-full bg-white/90 text-ink-700 shadow-sm backdrop-blur transition hover:scale-110 hover:text-rose-600 aria-pressed:text-rose-600 dark:bg-ink-900/90 dark:text-ink-200 ${className}`}
      data-wish={key}
      aria-pressed={on}
      aria-label={label}
      onClick={(e) => {
        e.preventDefault();
        e.stopPropagation();
        write(KEYS.wish, on ? list.filter((x) => x !== key) : [...list, key]);
        toast(on ? msg.removed : msg.added);
        // Signed in → keep the account wishlist in step (best effort; the portal re-syncs on the next visit).
        if (/(?:^|;\s*)musafir_name=[^;]+/.test(document.cookie) && ['tour', 'cruise', 'activity', 'hotel'].includes(kind)) {
          void fetch('/api/me/wishlist', { method: 'POST', headers: { 'Content-Type': 'application/json', Accept: 'application/json' }, body: JSON.stringify(on ? { remove: { kind, slug: id } } : { items: [{ kind, slug: id }] }) }).catch(() => null);
        }
      }}
    >
      {children}
    </button>
  );
}

export function WishCount({ className }: { className: string }) {
  const n = useWishlist().length;
  const { lang } = useSite();
  return <span data-wish-count className={`${className} ${n ? '' : 'hidden'}`}>{lang === 'bn' ? String(n).replace(/\d/g, (d) => '০১২৩৪৫৬৭৮৯'[+d]) : n}</span>;
}

export function CompareCheck({ id, label }: { id: string; label: string }) {
  const list = useCompare();
  const { msg } = useSite();
  return (
    <label className="relative z-10 inline-flex cursor-pointer items-center gap-1.5 text-xs font-semibold text-ink-500 dark:text-ink-300">
      <input
        type="checkbox"
        className="check"
        data-compare={id}
        checked={list.includes(id)}
        onChange={(e) => {
          if (e.target.checked) {
            if (list.length >= 3) { toast(msg.compareMax, 'error'); return; }
            write(KEYS.compare, [...list, id]);
          } else write(KEYS.compare, list.filter((x) => x !== id));
        }}
      />{' '}
      {label}
    </label>
  );
}
