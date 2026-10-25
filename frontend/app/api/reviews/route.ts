import { NextResponse } from 'next/server';

/**
 * Review submission BFF. Reviews are only accepted from signed-in travellers with a completed booking;
 * traveller sessions arrive in M5 (portal auth), so until then every submission is answered 401 → the
 * dialog shows the "sign in to continue" state.
 */
export async function POST() {
  return NextResponse.json({ message: 'Sign in required' }, { status: 401, headers: { 'Cache-Control': 'no-store' } });
}
