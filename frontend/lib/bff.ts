import 'server-only';
import { NextResponse, type NextRequest } from 'next/server';
import { isLang } from './format';
import { authHeaders } from './session';

const API = (process.env.API_URL || 'http://127.0.0.1:8000').replace(/\/$/, '');

/** Forward a browser POST to Laravel (same-origin for the browser; client IP passed on for per-IP throttling). */
export async function forward(req: NextRequest, path: string) {
  const lang = req.nextUrl.searchParams.get('lang') ?? 'en';
  const body = await req.text();
  if (body.length > 64_000) return NextResponse.json({ message: 'Payload too large' }, { status: 413 });
  const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || req.headers.get('x-real-ip') || '';
  const res = await fetch(`${API}/api/v1/${path}?lang=${isLang(lang) ? lang : 'en'}`, {
    method: 'POST',
    headers: { Accept: 'application/json', 'Content-Type': 'application/json', ...(ip ? { 'X-Forwarded-For': ip } : {}), 'User-Agent': req.headers.get('user-agent') ?? '', ...(await authHeaders()) },
    body,
    cache: 'no-store',
  });
  return new NextResponse(await res.text(), { status: res.status, headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' } });
}
