import { NextResponse, type NextRequest } from 'next/server';

const API = (process.env.API_URL || 'http://127.0.0.1:8000').replace(/\/$/, '');

/** Live activity time slots for a date (no caching — availability changes). */
export async function GET(req: NextRequest, ctx: RouteContext<'/api/slots/[slug]'>) {
  const { slug } = await ctx.params;
  const date = req.nextUrl.searchParams.get('date') ?? '';
  if (!/^[a-z0-9-]{1,120}$/.test(slug) || !/^\d{4}-\d{2}-\d{2}$/.test(date)) return NextResponse.json({ message: 'Bad request' }, { status: 400 });
  const r = await fetch(`${API}/api/v1/activities/${slug}/slots?date=${date}`, { headers: { Accept: 'application/json', 'X-Forwarded-For': req.headers.get('x-forwarded-for')?.split(',')[0] ?? '' }, cache: 'no-store' });
  return new NextResponse(await r.text(), { status: r.status, headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' } });
}
