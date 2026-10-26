'use client';
import { useSyncExternalStore } from 'react';

/** Tiny localStorage-backed stores shared by islands (same keys as the mockup, so saved state carries over). */
const listeners = new Map<string, Set<() => void>>();
const cache = new Map<string, { raw: string | null; val: unknown }>();

export function read<T>(key: string, fallback: T): T {
  if (typeof window === 'undefined') return fallback;
  let raw: string | null = null;
  try { raw = localStorage.getItem(key); } catch {}
  const hit = cache.get(key);
  if (hit && hit.raw === raw) return hit.val as T;
  let val: T = fallback;
  try { val = raw === null ? fallback : (JSON.parse(raw) as T); } catch {}
  cache.set(key, { raw, val });
  return val;
}

export function write<T>(key: string, v: T) {
  try { localStorage.setItem(key, JSON.stringify(v)); } catch {}
  listeners.get(key)?.forEach((l) => l());
}

function subscribe(key: string, cb: () => void) {
  if (!listeners.has(key)) listeners.set(key, new Set());
  listeners.get(key)!.add(cb);
  const onStorage = (e: StorageEvent) => e.key === key && cb();
  window.addEventListener('storage', onStorage);
  return () => { listeners.get(key)!.delete(cb); window.removeEventListener('storage', onStorage); };
}

export function useStored<T>(key: string, fallback: T): T {
  return useSyncExternalStore((cb) => subscribe(key, cb), () => read(key, fallback), () => fallback);
}

export const KEYS = { wish: 'musafir-wishlist', compare: 'musafir-compare', currency: 'musafir-cur', theme: 'musafir-theme', consent: 'musafir-consent', plan: 'musafir-plan', view: 'musafir-view' } as const;
const EMPTY: string[] = [];
export const useWishlist = () => useStored<string[]>(KEYS.wish, EMPTY);
export const useCompare = () => useStored<string[]>(KEYS.compare, EMPTY);
export const useCurrency = () => useStored<string>(KEYS.currency, 'BDT');

/* toasts */
type Toast = { id: number; msg: string; type?: 'error' };
let toasts: Toast[] = [];
const toastSubs = new Set<() => void>();
export function toast(msg: string, type?: 'error') {
  const id = Date.now() + Math.random();
  toasts = [...toasts, { id, msg, type }];
  toastSubs.forEach((l) => l());
  setTimeout(() => { toasts = toasts.filter((t) => t.id !== id); toastSubs.forEach((l) => l()); }, 3100);
}
export const useToasts = () => useSyncExternalStore((cb) => (toastSubs.add(cb), () => toastSubs.delete(cb)), () => toasts, () => EMPTY as unknown as Toast[]);
