import type { NextRequest } from 'next/server';
import { forward } from '@/lib/bff';

/** Create a pending booking (holds seats for the payment window). */
export const POST = (req: NextRequest) => forward(req, 'bookings');
