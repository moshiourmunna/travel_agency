import type { Lang } from './format';

/** Next `n` months as {value: "2026-12", label: "December 2026"} in Asia/Dhaka — replaces the mockup's hard-coded month lists. */
export function nextMonths(lang: Lang, n = 6, from = new Date()) {
  const fmt = new Intl.DateTimeFormat(lang === 'bn' ? 'bn-BD' : 'en-GB', { month: 'long', year: 'numeric', timeZone: 'Asia/Dhaka' });
  const y = Number(new Intl.DateTimeFormat('en', { year: 'numeric', timeZone: 'Asia/Dhaka' }).format(from));
  const m = Number(new Intl.DateTimeFormat('en', { month: 'numeric', timeZone: 'Asia/Dhaka' }).format(from)) - 1;
  return Array.from({ length: n }, (_, k) => {
    const d = new Date(Date.UTC(y, m + k, 15));
    return { value: `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}`, label: fmt.format(d) };
  });
}
