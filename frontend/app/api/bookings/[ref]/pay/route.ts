import { NextResponse, type NextRequest } from 'next/server';
import { forward } from '@/lib/bff';

/** Start a payment for a booking: returns the gateway redirect (or bank-transfer instructions). */
export async function POST(req: NextRequest, ctx: RouteContext<'/api/bookings/[ref]/pay'>) {
  const { ref } = await ctx.params;
  if (!/^[A-Z]{3}-\d{2}-\d{5}$/.test(ref)) return NextResponse.json({ message: 'Not found' }, { status: 404 });
  return forward(req, `bookings/${ref}/pay`);
}
