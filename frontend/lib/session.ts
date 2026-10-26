import 'server-only';
import { cookies } from 'next/headers';
import type { NextRequest, NextResponse } from 'next/server';

/** httpOnly cookie holding the traveller's Sanctum token (never readable by page JavaScript). */
export const SESSION_COOKIE = 'musafir_session';
/** Non-sensitive hint for static pages (header shows "Hi, Farhana" instead of "Sign in"). */
export const NAME_COOKIE = 'musafir_name';

const secure = () => process.env.NODE_ENV === 'production' && !/^http:\/\//.test(process.env.SITE_URL || process.env.NEXT_PUBLIC_SITE_URL || '');

/** Authorization header for API calls made on behalf of the signed-in traveller (empty when signed out). */
export async function authHeaders(): Promise<Record<string, string>> {
  const t = (await cookies()).get(SESSION_COOKIE)?.value;
  return t ? { Authorization: `Bearer ${t}` } : {};
}

export async function hasSession(): Promise<boolean> {
  return !!(await cookies()).get(SESSION_COOKIE)?.value;
}

export function setSession(res: NextResponse, token: string, maxAge: number, firstName: string) {
  res.cookies.set(SESSION_COOKIE, token, { httpOnly: true, secure: secure(), sameSite: 'lax', path: '/', maxAge });
  res.cookies.set(NAME_COOKIE, firstName.slice(0, 40), { httpOnly: false, secure: secure(), sameSite: 'lax', path: '/', maxAge });
}

export function clearSession(res: NextResponse) {
  res.cookies.set(SESSION_COOKIE, '', { httpOnly: true, secure: secure(), sameSite: 'lax', path: '/', maxAge: 0 });
  res.cookies.set(NAME_COOKIE, '', { path: '/', maxAge: 0 });
}

/** Reject cross-site writes: browsers always send Origin on POST/PUT/DELETE; it must match this site. */
export function sameOrigin(req: NextRequest): boolean {
  const origin = req.headers.get('origin');
  if (!origin) return req.method === 'GET' || req.method === 'HEAD';
  try {
    const host = req.headers.get('x-forwarded-host') ?? req.headers.get('host');
    return new URL(origin).host === host;
  } catch { return false; }
}
