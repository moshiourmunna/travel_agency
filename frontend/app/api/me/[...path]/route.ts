import { NextResponse, type NextRequest } from 'next/server';
import { isLang } from '@/lib/format';
import { authHeaders, clearSession, sameOrigin } from '@/lib/session';

const API = (process.env.API_URL || 'http://127.0.0.1:8000').replace(/\/$/, '');

/** Signed-in traveller API proxy: /api/me/<path> → Laravel /api/v1/me/<path> with the token from the httpOnly cookie. */
async function handle(req: NextRequest, ctx: RouteContext<'/api/me/[...path]'>) {
  const { path } = await ctx.params;
  if (!path.every((p) => /^[A-Za-z0-9_-]{1,64}$/.test(p))) return NextResponse.json({ message: 'Not found' }, { status: 404 });
  if (req.method !== 'GET' && !sameOrigin(req)) return NextResponse.json({ message: 'Forbidden' }, { status: 403 });
  const auth = await authHeaders();
  if (!auth.Authorization) return NextResponse.json({ message: 'Please sign in again.' }, { status: 401 });
  const qs = new URLSearchParams(req.nextUrl.searchParams);
  const lang = qs.get('lang') ?? 'en';
  qs.set('lang', isLang(lang) ? lang : 'en');
  const ct = req.headers.get('content-type') ?? '';
  const multipart = ct.startsWith('multipart/form-data');
  const len = Number(req.headers.get('content-length') ?? 0);
  if (len > (multipart ? 11 * 1024 * 1024 : 64_000)) return NextResponse.json({ message: 'Payload too large' }, { status: 413 });
  const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || '';
  const r = await fetch(`${API}/api/v1/me/${path.join('/')}?${qs}`, {
    method: req.method, cache: 'no-store',
    headers: { Accept: 'application/json', ...auth, ...(ip ? { 'X-Forwarded-For': ip } : {}), 'User-Agent': req.headers.get('user-agent') ?? '', ...(req.method !== 'GET' && ct ? { 'Content-Type': ct } : {}) },
    body: req.method === 'GET' || req.method === 'DELETE' && !ct ? undefined : multipart ? await req.arrayBuffer() : await req.text(),
  });
  const res = new NextResponse(r.body, { status: r.status, headers: { 'Content-Type': r.headers.get('content-type') ?? 'application/json', 'Cache-Control': 'no-store, private', ...(r.headers.get('content-disposition') ? { 'Content-Disposition': r.headers.get('content-disposition')! } : {}) } });
  if (r.status === 401) clearSession(res);
  return res;
}

export { handle as GET, handle as POST, handle as PUT, handle as DELETE };
