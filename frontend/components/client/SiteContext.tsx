'use client';
import { createContext, useContext } from 'react';
import type { Lang } from '@/lib/format';

export type SiteCtx = { lang: Lang; currencies: { code: string; symbol: string; rate_to_bdt: number | string }[]; msg: Record<string, string> };
const Ctx = createContext<SiteCtx>({ lang: 'en', currencies: [{ code: 'BDT', symbol: '৳', rate_to_bdt: 1 }], msg: {} });
export const SiteProvider = ({ value, children }: { value: SiteCtx; children: React.ReactNode }) => <Ctx.Provider value={value}>{children}</Ctx.Provider>;
export const useSite = () => useContext(Ctx);
