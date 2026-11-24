import type { MetadataRoute } from 'next';

/** Lets Android offer "Install app": opens full-screen from the home screen, like a native app. */
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'FasalShield',
    short_name: 'FasalShield',
    description: 'Crop cover that pays when the rain fails',
    start_url: '/start',
    scope: '/',
    display: 'standalone',
    orientation: 'portrait',
    background_color: '#f3f5f1',
    theme_color: '#123f2c',
    lang: 'en-IN',
    icons: [
      { src: '/icons/icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
      { src: '/icons/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
      { src: '/icons/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
    ],
  };
}
