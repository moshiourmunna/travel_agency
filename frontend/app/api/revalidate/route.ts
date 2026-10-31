import { timingSafeEqual } from 'node:crypto';
import { revalidateTag } from 'next/cache';
import { NextResponse, type NextRequest } from 'next/server';

const same = (a: string, b: string) => {
  const x = Buffer.from(a);
  const y = Buffer.from(b);
  return x.length === y.length && timingSafeEqual(x, y);
};

/**
 * Called by Laravel after every admin save: POST {tags: ["tours", "tour:slug"], expire: 0} with header X-Revalidate-Secret.
 * expire 0 → the tagged entries expire immediately, so the very next request renders fresh content (no stale-while-revalidate).
 * Without expire the default 'max' profile is used (stale served once while the page regenerates in the background).
 */
export async function POST(req: NextRequest) {
  const secret = process.env.REVALIDATE_SECRET;
  if (!secret || !same(req.headers.get('x-revalidate-secret') ?? '', secret)) return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
  const body = await req.json().catch(() => ({}));
  const tags: string[] = Array.isArray(body.tags) && body.tags.length ? body.tags.filter((t: unknown) => typeof t === 'string' && t.length <= 200).slice(0, 50) : ['all'];
  const expire = typeof body.expire === 'number' && body.expire >= 0 ? Math.floor(body.expire) : null;
  for (const t of tags) revalidateTag(t, expire === null ? 'max' : { expire });
  return NextResponse.json({ revalidated: tags, expire, at: Date.now() });
}
