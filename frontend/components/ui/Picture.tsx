import type { Image } from '@/lib/types';

/** Dimmed full-bleed hero backgrounds sit under a dark overlay, so phones get a smaller variant (keeps mobile LCP down). */
export const DIMMED_HERO_SIZES = '(min-width: 768px) 100vw, 55vw';

/** Responsive <img> from a media-library payload (webp srcset 480/800/1600, original as fallback). */
export function Picture({ img, alt, className, sizes = '(min-width: 1024px) 33vw, (min-width: 640px) 50vw, 100vw', priority = false, width = 640, height = 400 }: {
  img: Image | undefined; alt?: string; className?: string; sizes?: string; priority?: boolean; width?: number; height?: number;
}) {
  if (!img) return <span className={`block bg-ink-100 dark:bg-ink-800 ${className ?? ''}`} aria-hidden="true" />;
  const srcSet = img.srcset?.map((s) => `${s.url} ${s.w}w`).join(', ');
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={img.srcset?.[1]?.url ?? img.src}
      srcSet={srcSet || undefined}
      sizes={srcSet ? sizes : undefined}
      alt={alt ?? ''}
      className={className}
      width={width}
      height={height}
      loading={priority ? 'eager' : 'lazy'}
      decoding={priority ? 'sync' : 'async'}
      fetchPriority={priority ? 'high' : undefined}
    />
  );
}
