import type { NextRequest } from 'next/server';
import { forward } from '@/lib/bff';

/** Server-side re-pricing of the traveller's selection (never cached). */
export const POST = (req: NextRequest) => forward(req, 'checkout/quote');
