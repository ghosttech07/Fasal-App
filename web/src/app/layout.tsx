import type { Metadata, Viewport } from 'next';
import { Barlow, Barlow_Semi_Condensed } from 'next/font/google';
import './globals.css';
import './screens.css';
import 'leaflet/dist/leaflet.css';
import { Splash } from '@/components/splash';
import { NetStatus } from '@/components/net-status';
import { RegisterSW } from '@/components/register-sw';
import { cookies } from 'next/headers';
import { asLang, dictFor, LANG_COOKIE, makeT } from '@/i18n';
import { isRtl } from '@fasalshield/shared';
import { LangProvider } from '@/i18n/client';

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
  icons: { apple: '/icons/icon-180.png' },
  appleWebApp: { capable: true, title: 'FasalShield', statusBarStyle: 'default' },
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
  themeColor: '#123F2C',
};

export default async function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  const raw = (await cookies()).get(LANG_COOKIE)?.value;
  const lang = asLang(raw);
  return (
    <html
      lang={lang}
      dir={isRtl(lang) ? 'rtl' : 'ltr'}
      className={`${body.variable} ${figures.variable}`}
      suppressHydrationWarning
    >
      <body>
        {/* Before paint: skip the opening animation when this load came from inside the app (e.g. after sign-in); arriving from the landing page still plays it. */}
        <script
          dangerouslySetInnerHTML={{
            __html:
              "try{var r=document.referrer&&new URL(document.referrer);if(location.pathname.indexOf('/admin')===0||(r&&r.origin===location.origin&&r.pathname.indexOf('/welcome')!==0))document.documentElement.dataset.splash='skip'}catch(e){}",
          }}
        />
        {process.env.NEXT_PUBLIC_DEMO === '1' ? (
          <div className="demo-strip">{makeT(dictFor(lang))('c.demo')}</div>
        ) : null}
        <LangProvider value={{ lang, dict: dictFor(lang), chosen: !!raw }}>
          <NetStatus />
          <RegisterSW />
          <Splash />
          {children}
        </LangProvider>
      </body>
    </html>
  );
}
