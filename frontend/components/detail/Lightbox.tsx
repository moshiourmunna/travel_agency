'use client';
import { useEffect, useRef, useState } from 'react';

/**
 * Wraps server-rendered <a data-lightbox href=full data-caption> links and opens them in an accessible <dialog>
 * with prev/next, arrow keys and Esc. Links still work without JS (open the image).
 */
export function LightboxScope({ labels, className, children, closeIcon, prevIcon, nextIcon }: { labels: { viewer: string; close: string; prev: string; next: string }; className?: string; children: React.ReactNode; closeIcon: React.ReactNode; prevIcon: React.ReactNode; nextIcon: React.ReactNode }) {
  const scope = useRef<HTMLDivElement>(null);
  const dlg = useRef<HTMLDialogElement>(null);
  const [items, setItems] = useState<{ src: string; cap: string }[]>([]);
  const [idx, setIdx] = useState(-1);
  useEffect(() => {
    const root = scope.current;
    if (!root) return;
    const onClick = (e: MouseEvent) => {
      const a = (e.target as HTMLElement).closest<HTMLAnchorElement>('a[data-lightbox]');
      if (!a || !root.contains(a) || e.metaKey || e.ctrlKey) return;
      e.preventDefault();
      const all = [...root.querySelectorAll<HTMLAnchorElement>('a[data-lightbox]')];
      setItems(all.map((x) => ({ src: x.href, cap: x.dataset.caption ?? '' })));
      setIdx(all.indexOf(a));
      dlg.current?.showModal();
    };
    root.addEventListener('click', onClick);
    return () => root.removeEventListener('click', onClick);
  }, []);
  const step = (d: number) => setIdx((k) => (k + d + items.length) % items.length);
  const cur = items[idx];
  return (
    <div ref={scope} className={className}>
      {children}
      <dialog ref={dlg} className="w-full max-w-5xl bg-transparent p-0 backdrop:bg-ink-950/90" aria-label={labels.viewer} onClose={() => setIdx(-1)}
        onKeyDown={(e) => { if (e.key === 'ArrowRight') step(1); if (e.key === 'ArrowLeft') step(-1); }}
        onClick={(e) => { if (e.target === dlg.current) dlg.current?.close(); }}>
        {cur ? (
          <div className="relative">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={cur.src} alt={cur.cap} className="max-h-[80vh] w-full rounded-2xl object-contain" width={1600} height={1000} />
            <button type="button" autoFocus onClick={() => dlg.current?.close()} className="absolute right-3 top-3 grid h-10 w-10 place-items-center rounded-full bg-white/90 text-ink-900" aria-label={labels.close}>{closeIcon}</button>
            {items.length > 1 ? (<>
              <button type="button" onClick={() => step(-1)} className="absolute left-3 top-1/2 grid h-11 w-11 -translate-y-1/2 place-items-center rounded-full bg-white/90 text-ink-900" aria-label={labels.prev}>{prevIcon}</button>
              <button type="button" onClick={() => step(1)} className="absolute right-3 top-1/2 grid h-11 w-11 -translate-y-1/2 place-items-center rounded-full bg-white/90 text-ink-900" aria-label={labels.next}>{nextIcon}</button>
            </>) : null}
            <p className="mt-3 text-center text-sm text-white" aria-live="polite">{cur.cap} · {idx + 1}/{items.length}</p>
          </div>
        ) : null}
      </dialog>
    </div>
  );
}
