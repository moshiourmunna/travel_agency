import 'server-only';
import { cache } from 'react';
import { createHash } from 'node:crypto';
import { apiData } from './api';
import { bdt, digits, fmtDate, href, num, type Lang } from './format';

/** Dictionary key = the English string (hashed when longer than 191 chars) — same rule as tooling/export_ui_strings.py. */
export const uiKey = (en: string) => (en.length <= 191 ? en : 'h:' + createHash('sha1').update(en).digest('hex').slice(0, 12));

const dictionary = cache(async (lang: Lang) => apiData<Record<string, string>>(`translations/${lang}`, { lang, tags: ['translations'], revalidate: 3600 }).catch(() => ({}) as Record<string, string>));

export type T = (en: string, bn: string) => string;

/**
 * Server-side translator. Components keep the mockup's inline pairs t('English','বাংলা') for readability;
 * an admin-edited value in the translations table (keyed by the English text) overrides either language.
 */
export async function getI18n(lang: Lang) {
  const dict = await dictionary(lang);
  const t: T = (en, bn) => dict[uiKey(en)] ?? (lang === 'bn' ? bn : en);
  return {
    lang,
    t,
    d: (v: string | number | null | undefined) => digits(v, lang),
    num: (n: number | null | undefined) => num(n, lang),
    bdt: (n: number | null | undefined) => bdt(n, lang),
    date: (iso: string | null | undefined, fmt: 'long' | 'short' = 'long') => fmtDate(iso, lang, fmt),
    u: (path: string) => href(lang, path),
    other: (lang === 'en' ? 'bn' : 'en') as Lang,
  };
}
export type I18n = Awaited<ReturnType<typeof getI18n>>;
