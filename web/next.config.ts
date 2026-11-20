import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  devIndicators: false, // the floating dev badge covers the thumb-zone action bar
  poweredByHeader: false,
  // shortcut: lets the dev server be previewed through a temporary Cloudflare tunnel; remove once deployed.
  allowedDevOrigins: ['*.trycloudflare.com'],
  // The public landing page is a static file in public/welcome/; serve it at the clean address /welcome.
  async rewrites() {
    return [{ source: '/welcome', destination: '/welcome/index.html' }];
  },
};

export default nextConfig;
