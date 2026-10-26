import { NextResponse, type NextRequest } from 'next/server';
import { isLang } from '@/lib/format';
import { authHeaders, clearSession, sameOrigin, setSession } from '@/lib/session';

const API = (process.env.API_URL || 'http://127.0.0.1:8000').replace(/\/$/, '');
const MAP: Record<string, string> = { login: 'auth/login', register: 'auth/register', 'otp-send': 'auth/otp/send', 'otp-verify': 'auth/otp/verify', reset: 'auth/reset', 'login-verify': 'auth/login/verify', 'login-resend': 'auth/login/resend' };
const json = (body: unknown, status = 200) => NextResponse.json(body, { status, headers: { 'Cache-Control': 'no-store' } });

/** Sign-in / register / OTP / reset: Laravel returns a token which we keep in an httpOnly cookie; the browser only gets the user. */
export async function POST(req: NextRequest, ctx: RouteContext<'/api/auth/[action]'>) {
  const { action } = await ctx.params;
  if (!sameOrigin(req)) return json({ message: 'Forbidden' }, 403);
  const lang = req.nextUrl.searchParams.get('lang') ?? 'en';
  if (action === 'logout') {
    const h = await authHeaders();
    if (h.Authorization) await fetch(`${API}/api/v1/auth/logout`, { method: 'POST', headers: { Accept: 'application/json', ...h }, cache: 'no-store' }).catch(() => null);
    const res = json({ data: { ok: true } });
    clearSession(res);
    return res;
  }
  const path = MAP[action];
  if (!path) return json({ message: 'Not found' }, 404);
  const body = await req.text();
  if (body.length > 8_000) return json({ message: 'Payload too large' }, 413);
  const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || '';
  const r = await fetch(`${API}/api/v1/${path}?lang=${isLang(lang) ? lang : 'en'}`, {
    method: 'POST', body, cache: 'no-store',
    headers: { Accept: 'application/json', 'Content-Type': 'application/json', 'User-Agent': req.headers.get('user-agent') ?? '', ...(ip ? { 'X-Forwarded-For': ip } : {}) },
  });
  const j = await r.json().catch(() => ({}));
  if (!r.ok || !j?.data?.token) return json(j, r.status);
  const res = json({ data: { user: j.data.user } });
  setSession(res, j.data.token, j.data.expires_in, j.data.user?.first_name ?? '');
  return res;
}

/** GET /api/auth/logout?next=/en/login — used when a page finds the session expired (clears the cookie, then redirects). */
export async function GET(req: NextRequest, ctx: RouteContext<'/api/auth/[action]'>) {
  const { action } = await ctx.params;
  if (action !== 'logout') return json({ message: 'Not found' }, 404);
  const next = req.nextUrl.searchParams.get('next') ?? '/';
  const res = NextResponse.redirect(new URL(next.startsWith('/') && !next.startsWith('//') ? next : '/', req.url));
  clearSession(res);
  return res;
}
