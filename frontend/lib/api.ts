import 'server-only';
import { notFound } from 'next/navigation';
import { connection } from 'next/server';
import type { Lang } from './format';

const API = (process.env.API_URL || 'http://127.0.0.1:8000').replace(/\/$/, '');
const SSR = process.env.REVALIDATE_SECRET || '';

export class ApiError extends Error {
  constructor(public status: number, message: string, public body?: unknown) {
    super(message);
  }
}

type Opts = { lang: Lang; tags?: string[]; revalidate?: number | false; query?: Record<string, string | number | boolean | undefined | null>; allow404?: boolean };

/**
 * GET from the Laravel API with Next's data cache. Every response is tagged (e.g. "tours", "tour:slug", "site")
 * so the admin can purge exactly what changed via /api/revalidate. A 404 renders the not-found page.
 */
export async function api<T = any>(path: string, { lang, tags = [], revalidate = 300, query, allow404 }: Opts): Promise<T> {
  const qs = new URLSearchParams({ lang });
  for (const [k, v] of Object.entries(query ?? {})) if (v !== undefined && v !== null && v !== '') qs.set(k, String(v));
  const url = `${API}/api/v1/${path.replace(/^\//, '')}${path.includes('?') ? '&' : '?'}${qs}`;
  let res: Response;
  try {
    res = await fetch(url, {
      headers: { Accept: 'application/json', 'Accept-Language': lang, 'X-Musafir-Ssr': SSR },
      next: { tags: ['all', ...tags], revalidate },
    });
  } catch (e) {
    // API not reachable while building (CI / build machine without the backend): don't fail the build — this page
    // opts into request-time rendering instead (fetches stay cached by tag). Rebuild with the API up to pre-render again.
    if (process.env.NEXT_PHASE === 'phase-production-build') await connection();
    throw e;
  }
  if (res.status === 404) {
    if (allow404) return null as T;
    notFound();
  }
  if (!res.ok) throw new ApiError(res.status, `API ${res.status} for ${path}`);
  return res.json() as Promise<T>;
}

/** Same as api() but returns `data` directly. */
export async function apiData<T = any>(path: string, opts: Opts): Promise<T> {
  const r = await api<{ data: T }>(path, opts);
  return r?.data as T;
}

/** Uncached POST from server actions/route handlers. */
export async function apiPost<T = any>(path: string, body: unknown, lang: Lang, extraHeaders: Record<string, string> = {}): Promise<{ status: number; body: T }> {
  const res = await fetch(`${API}/api/v1/${path.replace(/^\//, '')}?lang=${lang}`, {
    method: 'POST',
    headers: { Accept: 'application/json', 'Content-Type': 'application/json', 'Accept-Language': lang, ...extraHeaders },
    body: JSON.stringify(body),
    cache: 'no-store',
  });
  return { status: res.status, body: (await res.json().catch(() => ({}))) as T };
}

/** Uncached GET (live data such as a booking receipt); returns null on 404 instead of the not-found page. */
export async function apiFresh<T = any>(path: string, lang: Lang, query: Record<string, string> = {}, extraHeaders: Record<string, string> = {}): Promise<T | null> {
  const qs = new URLSearchParams({ lang, ...query });
  const res = await fetch(`${API}/api/v1/${path.replace(/^\//, '')}?${qs}`, { headers: { Accept: 'application/json', 'Accept-Language': lang, ...extraHeaders }, cache: 'no-store' });
  if (res.status === 404 || res.status === 403) return null;
  if (!res.ok) throw new ApiError(res.status, `API ${res.status} for ${path}`);
  return res.json() as Promise<T>;
}
