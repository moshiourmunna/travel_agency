import { revalidateTag } from 'next/cache';
import { NextResponse, type NextRequest } from 'next/server';

/** Called by Laravel after admin saves: POST {tags: ["tours","tour:slug"]} with header X-Revalidate-Secret. */
export async function POST(req: NextRequest) {
  const secret = process.env.REVALIDATE_SECRET;
  if (!secret || req.headers.get('x-revalidate-secret') !== secret) return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
  const body = await req.json().catch(() => ({}));
  const tags: string[] = Array.isArray(body.tags) && body.tags.length ? body.tags.filter((t: unknown) => typeof t === 'string').slice(0, 50) : ['all'];
  for (const t of tags) revalidateTag(t, 'max');
  return NextResponse.json({ revalidated: tags, at: Date.now() });
}
