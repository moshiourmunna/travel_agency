import 'server-only';
import { apiData } from './api';
import type { Lang } from './format';
import type { Image } from './types';

/** Media-library lookups by seed key (layout/decorative images). */
export const Img = {
  key: async (key: string, lang: Lang): Promise<Image> => apiData<Image>(`media/${key}`, { lang, tags: ['media'], revalidate: 3600, allow404: true }).catch(() => null),
};
