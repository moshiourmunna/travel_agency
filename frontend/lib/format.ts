/** Locale formatting identical to the mockup (core.py / app.js): Bengali digits, lakh grouping, ৳ prefix. */
export const LOCALES = ['en', 'bn'] as const;
export type Lang = (typeof LOCALES)[number];
export const isLang = (v: string): v is Lang => (LOCALES as readonly string[]).includes(v);

const BN = ['০', '১', '২', '৩', '৪', '৫', '৬', '৭', '৮', '৯'];
export const digits = (s: string | number | null | undefined, lang: Lang): string => {
  const v = String(s ?? '');
  return lang === 'bn' ? v.replace(/\d/g, (d) => BN[+d]) : v;
};

/** 1234567 -> "12,34,567" (South-Asian grouping, as in the mockup). */
export const groupLakh = (n: number): string => {
  const neg = n < 0;
  const s = String(Math.abs(Math.round(n)));
  if (s.length <= 3) return (neg ? '-' : '') + s;
  const last = s.slice(-3);
  const rest = s.slice(0, -3).replace(/\B(?=(\d{2})+(?!\d))/g, ',');
  return (neg ? '-' : '') + rest + ',' + last;
};
export const num = (n: number | null | undefined, lang: Lang) => digits(groupLakh(n ?? 0), lang);
export const bdt = (n: number | null | undefined, lang: Lang) => '৳\u00a0' + num(n, lang);

const MONTHS = {
  en: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'],
  bn: ['জানুয়ারি', 'ফেব্রুয়ারি', 'মার্চ', 'এপ্রিল', 'মে', 'জুন', 'জুলাই', 'আগস্ট', 'সেপ্টেম্বর', 'অক্টোবর', 'নভেম্বর', 'ডিসেম্বর'],
};
const WDAYS = { en: ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'], bn: ['রবি', 'সোম', 'মঙ্গল', 'বুধ', 'বৃহস্পতি', 'শুক্র', 'শনি'] };

/** "2026-11-12" -> "12 Nov 2026" (fmt short -> "Thu, 12 Nov"). Pure string maths: no timezone drift. */
export const fmtDate = (iso: string | null | undefined, lang: Lang, fmt: 'long' | 'short' = 'long'): string => {
  if (!iso) return '';
  const [y, m, d] = iso.slice(0, 10).split('-').map(Number);
  if (fmt === 'short') {
    const wd = new Date(Date.UTC(y, m - 1, d)).getUTCDay();
    return digits(`${WDAYS[lang][wd]}, ${d} ${MONTHS[lang][m - 1]}`, lang);
  }
  return digits(`${d} ${MONTHS[lang][m - 1]} ${y}`, lang);
};

/** Localised internal href: ("/tours", "bn") -> "/bn/tours". External/anchor links untouched. */
export const href = (lang: Lang, path: string): string => {
  if (!path) return `/${lang}`;
  if (/^(https?:|mailto:|tel:|#)/.test(path)) return path;
  const p = path.startsWith('/') ? path : '/' + path;
  return p === '/' ? `/${lang}` : `/${lang}${p}`;
};

export const pctOff = (price: number, was?: number | null) => (was && was > price ? Math.round(((was - price) / was) * 100) : 0);
