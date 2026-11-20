import type { Metadata, Viewport } from 'next';
import { Barlow, Barlow_Semi_Condensed } from 'next/font/google';
import './globals.css';
import './screens.css';
import 'leaflet/dist/leaflet.css';
import { Splash } from '@/components/splash';
import { NetStatus } from '@/components/net-status';

// Self-hosted at build time by next/font: no third-party font request on the farmer's data plan.
const body = Barlow({
  subsets: ['latin'],
  weight: ['400', '500', '600'],
  variable: '--font-body',
  display: 'optional', // no late font swap: if the font is not ready at first paint, this visit keeps the fallback
});
const figures = Barlow_Semi_Condensed({
  subsets: ['latin'],
  weight: ['500', '600'],
  variable: '--font-figures',
  display: 'optional', // no late font swap: if the font is not ready at first paint, this visit keeps the fallback
});

export const metadata: Metadata = {
  title: 'FasalShield',
  description: 'Crop cover that pays when the rain fails',
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
  themeColor: '#123F2C',
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className={`${body.variable} ${figures.variable}`} suppressHydrationWarning>
      <body>
        {/* Before paint: skip the opening animation when this load came from inside the app (e.g. after sign-in); arriving from the landing page still plays it. */}
        <script
          dangerouslySetInnerHTML={{
            __html:
              "try{var r=document.referrer&&new URL(document.referrer);if(r&&r.origin===location.origin&&r.pathname.indexOf('/welcome')!==0)document.documentElement.dataset.splash='skip'}catch(e){}",
          }}
        />
        {process.env.NEXT_PUBLIC_DEMO === '1' ? (
          <div className="demo-strip">Demo · test data only, no real money</div>
        ) : null}
        <NetStatus />
        <Splash />
        {children}
      </body>
    </html>
  );
}
