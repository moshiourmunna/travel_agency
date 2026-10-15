import { usePage } from '@inertiajs/react';
import type { SharedProps } from '@/types';

/** Laravel-style translation: keys are English strings, :placeholders replaced (also :Placeholder → ucfirst). */
export function translate(dict: Record<string, string> | undefined, key: string, replace?: Record<string, string | number>): string {
  let s = (dict && dict[key]) || key;
  if (replace) {
    // longest keys first, like Laravel, so :to never clobbers :total
    for (const [k, v] of Object.entries(replace).sort((a, b) => b[0].length - a[0].length)) {
      const val = String(v);
      s = s.split(':' + k.charAt(0).toUpperCase() + k.slice(1)).join(val.charAt(0).toUpperCase() + val.slice(1)).split(':' + k).join(val);
    }
  }
  return s;
}

export function useT() {
  const { t } = usePage<SharedProps>().props;
  return (key: string, replace?: Record<string, string | number>) => translate(t, key, replace);
}

export type TFn = ReturnType<typeof useT>;
