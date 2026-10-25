'use client';
import { useEffect } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { KEYS, useCompare, useWishlist, write } from './store';

/**
 * Bridges device-local lists (localStorage) to server-rendered pages: puts the stored ids into `?ids=` so the
 * server can render real cards. `follow` keeps the URL in sync as the list changes (wishlist); otherwise only
 * an empty URL is filled (compare links stay shareable).
 */
export function StoredIds({ store, current, follow = false }: { store: 'wish' | 'compare'; current: string; follow?: boolean }) {
  const wish = useWishlist();
  const cmp = useCompare();
  const ids = (store === 'wish' ? wish : cmp).join(',');
  const router = useRouter();
  const path = usePathname();
  useEffect(() => {
    if (ids === current) return;
    if (!follow && current) return;
    router.replace(ids ? `${path}?ids=${encodeURIComponent(ids)}` : path, { scroll: false });
  }, [ids, current, follow, path, router]);
  return null;
}

export function SeedButton({ ids, className, children }: { ids: string[]; className: string; children: React.ReactNode }) {
  return <button type="button" className={className} onClick={() => write(KEYS.wish, ids)}>{children}</button>;
}
