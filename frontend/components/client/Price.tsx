'use client';
import { bdt, digits } from '@/lib/format';
import { useSite } from './SiteContext';
import { useCurrency } from './store';

const SYM: Record<string, string> = { BDT: '৳\u00a0', USD: 'US$\u00a0', EUR: '€\u00a0' };

/** A BDT amount; shown converted (approx.) when the visitor picked another display currency. SSR always renders BDT. */
export function Price({ value }: { value: number | null | undefined }) {
  const { lang, currencies } = useSite();
  const cur = useCurrency();
  if (value == null) return null;
  const rate = Number(currencies.find((c) => c.code === cur)?.rate_to_bdt ?? 0);
  if (cur === 'BDT' || !rate) return <>{bdt(value, lang)}</>;
  return <>{(SYM[cur] ?? cur + '\u00a0') + digits(Math.round(value / rate).toLocaleString('en-US'), lang)}</>;
}
