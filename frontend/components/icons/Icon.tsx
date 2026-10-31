import { ICON_NAMES, SPRITE } from './sprite';

const ALIASES: Record<string, string> = { passport: 'book-user' };

/**
 * Lucide icon drawn from the cached sprite (public/icons.svg, generated from data.ts by tooling/gen/sprite.mjs).
 * <use> keeps every page's HTML/RSC payload small instead of repeating the path markup. Unknown names render nothing.
 */
export function Icon({ name, className = 'h-5 w-5', strokeWidth }: { name: string | null | undefined; className?: string; strokeWidth?: number }) {
  if (!name) return null;
  const id = ALIASES[name] ?? name;
  const filled = ICON_NAMES[id];
  if (filled === undefined) return null;
  return filled ? (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className={className} aria-hidden="true" focusable="false"><use href={`${SPRITE}#${id}`} /></svg>
  ) : (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={strokeWidth ?? 2} strokeLinecap="round" strokeLinejoin="round"
      className={className} aria-hidden="true" focusable="false"><use href={`${SPRITE}#${id}`} /></svg>
  );
}
