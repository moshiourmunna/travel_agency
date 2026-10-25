import type { MetadataRoute } from 'next';

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'Musafir — Tours & Travels',
    short_name: 'Musafir',
    start_url: '/en',
    display: 'standalone',
    background_color: '#ffffff',
    theme_color: '#0D6B65',
    icons: [
      { src: '/brand/icon-192.png', sizes: '192x192', type: 'image/png' },
      { src: '/brand/icon-512.png', sizes: '512x512', type: 'image/png' },
      { src: '/brand/icon.svg', sizes: 'any', type: 'image/svg+xml' },
    ],
  };
}
