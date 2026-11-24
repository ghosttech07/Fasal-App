import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  devIndicators: false, // the floating dev badge covers the thumb-zone action bar
  poweredByHeader: false,
  // shortcut: lets the dev server be previewed through a temporary Cloudflare tunnel; remove once deployed.
  allowedDevOrigins: ['*.trycloudflare.com'],
  // The public landing page is a static file in public/welcome/; serve it at the clean address /welcome.
  // Browser-side security: no framing (clickjacking), HTTPS only, no MIME sniffing, only our own and the
  // listed map/font hosts. shortcut: scripts allow 'unsafe-inline' for Next's inline bootstrap; move to nonces later.
  async headers() {
    const dev = process.env.NODE_ENV !== 'production';
    const csp = [
      "default-src 'self'",
      `script-src 'self' 'unsafe-inline'${dev ? " 'unsafe-eval'" : ''}`,
      "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
      "font-src 'self' https://fonts.gstatic.com data:",
      "img-src 'self' data: blob: https://*.tile.openstreetmap.org https://tile.openstreetmap.org",
      "media-src 'self'",
      `connect-src 'self' https://nominatim.openstreetmap.org${dev ? ' ws:' : ''}`,
      "frame-ancestors 'none'",
      "base-uri 'self'",
      "form-action 'self'",
      "object-src 'none'",
    ].join('; ');
    return [
      {
        source: '/:path*',
        headers: [
          { key: 'Content-Security-Policy', value: csp },
          {
            key: 'Strict-Transport-Security',
            value: 'max-age=63072000; includeSubDomains; preload',
          },
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'X-Frame-Options', value: 'DENY' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          {
            key: 'Permissions-Policy',
            value: 'geolocation=(self), camera=(), microphone=(), payment=(), usb=()',
          },
          { key: 'Cross-Origin-Opener-Policy', value: 'same-origin' },
        ],
      },
    ];
  },
  async rewrites() {
    return [{ source: '/welcome', destination: '/welcome/index.html' }];
  },
};

export default nextConfig;
