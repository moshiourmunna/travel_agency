import type { NextConfig } from 'next';
import path from 'node:path';

const origin = (u?: string) => { try { return u ? new URL(u).origin : ''; } catch { return ''; } };
const dev = process.env.NODE_ENV !== 'production';
// Media (images, PDFs) is served by Laravel (APP_URL/storage) or a CDN/S3 → allowed image origins come from env, not hardcoded hosts.
const mediaOrigins = [origin(process.env.API_URL), ...(process.env.MEDIA_ORIGINS ?? '').split(/[\s,]+/).map(origin)].filter(Boolean);

// Static pages are prerendered (ISR), so a per-request nonce is not possible: Next's inline bootstrap scripts need 'unsafe-inline'.
// Everything else is locked to this site + the configured media origins.
const csp = [
  "default-src 'self'",
  `script-src 'self' 'unsafe-inline'${dev ? " 'unsafe-eval'" : ''}`,
  "style-src 'self' 'unsafe-inline'",
  `img-src 'self' data: blob: ${mediaOrigins.join(' ')}`.trim(),
  "font-src 'self' data:",
  `connect-src 'self'${dev ? ' ws:' : ''}`,
  "media-src 'self' " + mediaOrigins.join(' '),
  'frame-src https://www.google.com https://www.openstreetmap.org https://www.youtube-nocookie.com https://www.youtube.com',
  "frame-ancestors 'none'",
  "form-action 'self' https:", // payment gateways may receive a POST
  "base-uri 'self'",
  "object-src 'none'",
  ...((process.env.NEXT_PUBLIC_SITE_URL ?? '').startsWith('https://') ? ['upgrade-insecure-requests'] : []),
].join('; ');

const security = [
  { key: 'Content-Security-Policy', value: csp },
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  { key: 'X-Frame-Options', value: 'DENY' },
  { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
  { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=(), payment=(self), usb=(), interest-cohort=()' },
  { key: 'Cross-Origin-Opener-Policy', value: 'same-origin' },
  // Browsers ignore HSTS on plain http, so this is harmless locally and correct behind HTTPS.
  { key: 'Strict-Transport-Security', value: 'max-age=31536000; includeSubDomains' },
];

// Classic ISR model (fetch cache + tags + on-demand revalidateTag) instead of cacheComponents:
// every public page is prerendered/static HTML (best for SEO) and refreshed by the Laravel admin via /api/revalidate.
const nextConfig: NextConfig = {
  poweredByHeader: false,
  trailingSlash: false,
  compress: true,
  turbopack: { root: path.resolve(__dirname, '..') },
  // Images come pre-sized from the media library (webp 480/800/1600 srcset, see components/ui/Picture.tsx), so the Next
  // optimiser (which needs sharp + a writable cache on the host) is not required — keeps shared hosting/PaaS deploys simple.
  images: { unoptimized: true },
  async headers() {
    return [
      { source: '/:path*', headers: security },
      { source: '/brand/:path*', headers: [{ key: 'Cache-Control', value: 'public, max-age=604800, stale-while-revalidate=86400' }] },
      { source: '/icons.svg', headers: [{ key: 'Cache-Control', value: 'public, max-age=31536000, immutable' }] }, // URL is versioned (?v=hash)
      { source: '/fonts/:path*', headers: [{ key: 'Cache-Control', value: 'public, max-age=31536000, immutable' }] },
    ];
  },
};

export default nextConfig;
