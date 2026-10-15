import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/** ৳ 8,45,000 – South-Asian digit grouping, identical to PHP money(). */
export function money(amount: number | string | null | undefined, symbol = '৳ '): string {
  const n = Math.round(Number(amount ?? 0));
  const neg = n < 0;
  let s = String(Math.abs(n));
  if (s.length > 3) {
    const last3 = s.slice(-3);
    const rest = s.slice(0, -3).replace(/\B(?=(\d{2})+(?!\d))/g, ',');
    s = rest + ',' + last3;
  }
  return symbol + (neg ? '-' : '') + s;
}

export function num(n: number | null | undefined): string {
  return money(n, '');
}

/** Build a query string, dropping empty values. */
export function query(params: Record<string, unknown>): string {
  const q = new URLSearchParams();
  Object.entries(params).forEach(([k, v]) => {
    if (v !== undefined && v !== null && v !== '') q.set(k, String(v));
  });
  const s = q.toString();
  return s ? `?${s}` : '';
}

export function clean<T extends Record<string, unknown>>(o: T): Partial<T> {
  return Object.fromEntries(Object.entries(o).filter(([, v]) => v !== '' && v !== null && v !== undefined)) as Partial<T>;
}

export const ucfirst = (s?: string | null) => (s ? s.charAt(0).toUpperCase() + s.slice(1).replace(/_/g, ' ') : '');
