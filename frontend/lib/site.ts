import 'server-only';
import { cache } from 'react';
import { apiData } from './api';
import type { Lang } from './format';

export type Site = {
  locale: Lang;
  languages: { code: string; name: string; native: string; is_default: boolean }[];
  currencies: { code: string; symbol: string; rate_to_bdt: number }[];
  settings: Record<string, Record<string, any>>;
  menus: Record<string, any[]>;
  menu_names: Record<string, string>;
  categories: { slug: string; icon: string; name: string }[];
  stats: { value: number; suffix: string; label: string; icon?: string }[];
  partners: Record<string, { name: string; code: string; color: string }[]>;
};

export const getSite = cache((lang: Lang) => apiData<Site>('site', { lang, tags: ['site', 'settings', 'menus'] }));

/** Public absolute site URL (for canonical/hreflang/OG): env first, then the admin-managed setting. */
export const siteUrl = (site?: Site) => (process.env.NEXT_PUBLIC_SITE_URL || site?.settings?.seo?.site_url || 'http://localhost:3000').replace(/\/$/, '');
