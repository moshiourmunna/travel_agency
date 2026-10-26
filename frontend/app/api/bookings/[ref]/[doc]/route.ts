import { NextResponse, type NextRequest } from 'next/server';
import { authHeaders } from '@/lib/session';

const API = (process.env.API_URL || 'http://127.0.0.1:8000').replace(/\/$/, '');

/** Invoice / e-voucher PDF for a booking (guest key or signed-in owner). Streams from Laravel, never cached. */
export async function GET(req: NextRequest, ctx: RouteContext<'/api/bookings/[ref]/[doc]'>) {
  const { ref, doc } = await ctx.params;
  const key = req.nextUrl.searchParams.get('key') ?? '';
  if (!/^[A-Z]{3}-\d{2}-\d{5}$/.test(ref) || !['invoice', 'voucher'].includes(doc) || !/^[0-9A-Z]{0,26}$/.test(key)) return NextResponse.json({ message: 'Not found' }, { status: 404 });
  const r = await fetch(`${API}/api/v1/bookings/${ref}/${doc}.pdf?key=${key}`, { headers: { Accept: 'application/pdf', ...(await authHeaders()) }, cache: 'no-store' });
  if (!r.ok) return NextResponse.json({ message: 'Not found' }, { status: r.status === 404 ? 404 : 502 });
  return new NextResponse(r.body, { status: 200, headers: { 'Content-Type': 'application/pdf', 'Content-Disposition': r.headers.get('content-disposition') ?? 'inline', 'Cache-Control': 'private, no-store', 'X-Robots-Tag': 'noindex' } });
}
