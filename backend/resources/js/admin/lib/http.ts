import { usePage } from '@inertiajs/react';
import type { Shared } from './types';

function xsrf(): string {
  const m = document.cookie.match(/(?:^|; )XSRF-TOKEN=([^;]+)/);
  return m ? decodeURIComponent(m[1]) : '';
}

export async function getJson<T = any>(url: string): Promise<T> {
  const r = await fetch(url, { headers: { Accept: 'application/json', 'X-Requested-With': 'XMLHttpRequest' }, credentials: 'same-origin' });
  if (!r.ok) throw new Error(`HTTP ${r.status}`);
  return r.json();
}

/** Multipart upload that reports progress (XHR) and returns JSON or throws {message, errors}. */
export function upload<T = any>(url: string, form: FormData, onProgress?: (pct: number) => void): Promise<T> {
  return new Promise((resolve, reject) => {
    const x = new XMLHttpRequest();
    x.open('POST', url);
    x.setRequestHeader('Accept', 'application/json');
    x.setRequestHeader('X-Requested-With', 'XMLHttpRequest');
    x.setRequestHeader('X-XSRF-TOKEN', xsrf());
    x.withCredentials = true;
    x.upload.onprogress = (e) => e.lengthComputable && onProgress?.(Math.round((e.loaded / e.total) * 100));
    x.onload = () => {
      let body: any = {};
      try { body = JSON.parse(x.responseText); } catch { /* not json */ }
      if (x.status >= 200 && x.status < 300) resolve(body);
      else reject({ status: x.status, message: body.message || `HTTP ${x.status}`, errors: body.errors || {} });
    };
    x.onerror = () => reject({ status: 0, message: 'Network error', errors: {} });
    x.send(form);
  });
}

/** Admin URL builder: works for /admin prefix and for a dedicated admin domain at "/". */
export function useAdminUrl() {
  const base = (usePage().props as unknown as Shared).app.base;
  return (p: string) => (base === '/' ? '' : base) + (p.startsWith('/') ? p : '/' + p);
}

export function useCan() {
  const perms = (usePage().props as unknown as Shared).auth?.permissions ?? [];
  return (p: string) => perms.includes(p);
}
