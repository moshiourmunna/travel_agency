import { NextResponse, type NextRequest } from 'next/server';
import { isLang } from '@/lib/format';

const API = (process.env.API_URL || 'http://127.0.0.1:8000').replace(/\/$/, '');

/** Multipart job application (with optional PDF CV) → Laravel. Size-capped before forwarding. */
export async function POST(req: NextRequest, ctx: RouteContext<'/api/careers/[slug]/apply'>) {
  const { slug } = await ctx.params;
  if (!/^[a-z0-9-]{1,120}$/.test(slug)) return NextResponse.json({ message: 'Not found' }, { status: 404 });
  if (Number(req.headers.get('content-length') ?? 0) > 6 * 1024 * 1024) return NextResponse.json({ message: 'File too large', errors: { cv: ['Max 5 MB.'] } }, { status: 413 });
  const lang = req.nextUrl.searchParams.get('lang') ?? 'en';
  const fd = await req.formData();
  const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || req.headers.get('x-real-ip') || '';
  const res = await fetch(`${API}/api/v1/careers/${slug}/apply?lang=${isLang(lang) ? lang : 'en'}`, {
    method: 'POST', body: fd, cache: 'no-store',
    headers: { Accept: 'application/json', ...(ip ? { 'X-Forwarded-For': ip } : {}), 'User-Agent': req.headers.get('user-agent') ?? '' },
  });
  return new NextResponse(await res.text(), { status: res.status, headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' } });
}
