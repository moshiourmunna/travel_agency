import type { NextConfig } from 'next';
import path from 'node:path';

// Classic ISR model (fetch cache + tags + on-demand revalidateTag) instead of cacheComponents:
// every public page is prerendered/static HTML (best for SEO) and refreshed by the Laravel admin via /api/revalidate.
const nextConfig: NextConfig = {
  poweredByHeader: false,
  trailingSlash: false,
  turbopack: { root: path.resolve(__dirname, '..') },
  images: { unoptimized: true },
};

export default nextConfig;
