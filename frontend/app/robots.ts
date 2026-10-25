import type { MetadataRoute } from 'next';

export default function robots(): MetadataRoute.Robots {
  const base = (process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000').replace(/\/$/, '');
  const indexable = process.env.SITE_INDEXABLE !== 'false';
  return {
    rules: indexable
      ? [{ userAgent: '*', allow: '/', disallow: ['/en/account', '/bn/account', '/en/booking', '/bn/booking', '/en/checkout', '/bn/checkout', '/api/', '/*?*sort=', '/*?*page='] }]
      : [{ userAgent: '*', disallow: '/' }],
    sitemap: `${base}/sitemap.xml`,
    host: base,
  };
}
