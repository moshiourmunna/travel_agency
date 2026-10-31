import { usePage } from '@inertiajs/react';
import type { Shared } from './types';

const BN_DIGITS = '০১২৩৪৫৬৭৮৯';
export const bnDigits = (s: string) => s.replace(/[0-9]/g, (d) => BN_DIGITS[+d]);

/** Indian / Bangladeshi grouping: 12,34,567 */
export function group(n: number, decimals = 0): string {
  const neg = n < 0;
  const [int, dec] = Math.abs(n).toFixed(decimals).split('.');
  const last3 = int.slice(-3);
  const rest = int.slice(0, -3).replace(/\B(?=(\d{2})+(?!\d))/g, ',');
  return (neg ? '-' : '') + (rest ? rest + ',' + last3 : last3) + (dec && +dec ? '.' + dec : '');
}

export function useLocale(): 'en' | 'bn' {
  return (usePage().props as unknown as Shared).locale ?? 'en';
}

/** Translator + formatters bound to the admin language. */
export function useT() {
  const lang = useLocale();
  const bn = lang === 'bn';
  const d = (s: string | number) => (bn ? bnDigits(String(s)) : String(s));
  return {
    lang,
    bn,
    t: (en: string, bnText?: string) => (bn && bnText ? bnText : en),
    d,
    num: (n: number | null | undefined) => (n === null || n === undefined || Number.isNaN(+n) ? '—' : d(group(+n, Number.isInteger(+n) ? 0 : 2))),
    money: (n: number | null | undefined) => (n === null || n === undefined ? '—' : '৳ ' + d(group(Math.round(+n)))),
    date: (iso: string | null | undefined, withTime = false) => {
      if (!iso) return '—';
      const dt = new Date(iso.length === 10 ? iso + 'T00:00:00' : iso.replace(' ', 'T'));
      if (Number.isNaN(dt.getTime())) return iso;
      const s = dt.toLocaleString(bn ? 'bn-BD' : 'en-GB', { day: 'numeric', month: 'short', year: 'numeric', ...(withTime ? { hour: '2-digit', minute: '2-digit' } : {}), timeZone: 'Asia/Dhaka' });
      return s;
    },
    ago: (iso: string | null | undefined) => {
      if (!iso) return '—';
      const diff = (Date.now() - new Date(iso).getTime()) / 1000;
      const r = (v: number, en: string, b: string) => (bn ? `${bnDigits(String(v))} ${b} আগে` : `${v} ${en}${v === 1 ? '' : 's'} ago`);
      if (diff < 60) return bn ? 'এইমাত্র' : 'just now';
      if (diff < 3600) return r(Math.floor(diff / 60), 'minute', 'মিনিট');
      if (diff < 86400) return r(Math.floor(diff / 3600), 'hour', 'ঘণ্টা');
      if (diff < 86400 * 30) return r(Math.floor(diff / 86400), 'day', 'দিন');
      return new Date(iso).toLocaleDateString(bn ? 'bn-BD' : 'en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
    },
  };
}

export const bytes = (n: number | null | undefined) => (!n ? '—' : n < 1024 ? n + ' B' : n < 1048576 ? (n / 1024).toFixed(0) + ' KB' : (n / 1048576).toFixed(1) + ' MB');
