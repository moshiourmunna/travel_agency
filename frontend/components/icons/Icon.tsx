import { ICONS } from './data';

const ALIASES: Record<string, string> = { passport: 'book-user' };

/** Lucide icon (inline SVG, identical markup to the mockup). Unknown names render nothing rather than break the page. */
export function Icon({ name, className = 'h-5 w-5', strokeWidth }: { name: string | null | undefined; className?: string; strokeWidth?: number }) {
  if (!name) return null;
  const def = ICONS[ALIASES[name] ?? name];
  if (!def) return null;
  const [body, filled] = def;
  return filled ? (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className={className} aria-hidden="true" focusable="false" dangerouslySetInnerHTML={{ __html: body }} />
  ) : (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={strokeWidth ?? 2}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
      focusable="false"
      dangerouslySetInnerHTML={{ __html: body }}
    />
  );
}
