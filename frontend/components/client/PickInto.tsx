'use client';
import { useEffect } from 'react';

/** Delegated click handler: any `[data-pick]` link copies its value into the `target` select/input (e.g. "Get this plan" → quote form). */
export function PickInto({ target }: { target: string }) {
  useEffect(() => {
    const on = (e: MouseEvent) => {
      const a = (e.target as HTMLElement).closest<HTMLElement>('[data-pick]');
      const el = document.getElementById(target) as HTMLSelectElement | HTMLInputElement | null;
      if (!a || !el) return;
      el.value = a.dataset.pick ?? '';
      setTimeout(() => (document.getElementById('in-name') ?? el).focus({ preventScroll: true }), 350);
    };
    document.addEventListener('click', on);
    return () => document.removeEventListener('click', on);
  }, [target]);
  return null;
}
