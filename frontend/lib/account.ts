import 'server-only';
import { notFound, redirect } from 'next/navigation';
import { ApiError, apiFresh } from './api';
import type { Lang } from './format';
import { authHeaders } from './session';

/** Where an expired / missing session goes: clear the cookie, then sign in and come back. */
export const signInAgain = (lang: Lang, back: string) => `/api/auth/logout?next=${encodeURIComponent(`/${lang}/login?next=${encodeURIComponent(back)}`)}`;

/**
 * GET /api/v1/me/{path} for the signed-in traveller (always fresh — account pages are never cached).
 * 401 → sign in again; 404/403 → the page's not-found (another traveller's booking looks exactly like a missing one).
 */
export async function me<T = any>(path: string, lang: Lang, back: string, query: Record<string, string> = {}): Promise<T> {
  const h = await authHeaders();
  if (!h.Authorization) redirect(signInAgain(lang, back));
  let r: { data: T } | null;
  try {
    r = await apiFresh<{ data: T }>(`me/${path}`, lang, query, h);
  } catch (e) {
    if (e instanceof ApiError && e.status === 401) redirect(signInAgain(lang, back));
    throw e;
  }
  if (!r) notFound();
  return r.data;
}
