import { NextResponse, type NextRequest } from 'next/server';

const LOCALES = ['en', 'bn'];

/**
 * - "/" and locale-less paths → preferred locale (cookie, then Accept-Language, default en), 308-safe.
 * - Legacy mockup URLs ("/en/tours.html", "/en/index.html") → clean URLs (301) so old links never break.
 */
export function proxy(req: NextRequest) {
  const { pathname, search } = req.nextUrl;
  if (/\.html$/.test(pathname)) {
    const clean = pathname.replace(/\/index\.html$/, '').replace(/\.html$/, '') || '/';
    return NextResponse.redirect(new URL(clean + search, req.url), 301);
  }
  const first = pathname.split('/')[1];
  if (LOCALES.includes(first)) {
    // Pass the locale to segments that receive no params (not-found / error boundaries).
    const headers = new Headers(req.headers);
    headers.set('x-musafir-lang', first);
    return NextResponse.next({ request: { headers } });
  }
  const cookie = req.cookies.get('musafir-lang')?.value;
  const accept = req.headers.get('accept-language') ?? '';
  const lang = cookie && LOCALES.includes(cookie) ? cookie : /^\s*bn\b/i.test(accept) ? 'bn' : 'en';
  return NextResponse.redirect(new URL(`/${lang}${pathname === '/' ? '' : pathname}${search}`, req.url), pathname === '/' ? 307 : 308);
}

export const config = {
  // Skip Next internals, route handlers, metadata files and static assets.
  matcher: ['/((?!_next/|api/|brand/|fonts/|favicon\\.ico|robots\\.txt|sitemap\\.xml|manifest\\.webmanifest|.*\\.(?:png|jpg|jpeg|webp|svg|ico|woff2?|txt|xml|js|css)$).*)'],
};
