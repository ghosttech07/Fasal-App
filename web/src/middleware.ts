import { NextResponse, type NextRequest } from 'next/server';
import { ACCESS_COOKIE, REFRESH_COOKIE, clearTokenCookies, refreshTokens, setTokenCookies } from '@/lib/session';

const PUBLIC = ['/login', '/otp'];

/** Route guard: signed-out visitors go to /login; an expired access cookie is renewed before the page renders. */
export async function middleware(req: NextRequest) {
  const isPublic = PUBLIC.includes(req.nextUrl.pathname);
  const access = req.cookies.get(ACCESS_COOKIE)?.value;
  const refresh = req.cookies.get(REFRESH_COOKIE)?.value;

  if (isPublic) return access || refresh ? NextResponse.redirect(new URL('/', req.url)) : NextResponse.next();
  if (access) return NextResponse.next();

  const tokens = refresh ? await refreshTokens(refresh) : null;
  if (!tokens) {
    const res = NextResponse.redirect(new URL('/login', req.url));
    if (refresh) clearTokenCookies(res);
    return res;
  }
  // Hand the new access token to this same render as well as to the browser.
  req.cookies.set(ACCESS_COOKIE, tokens.accessToken);
  const res = NextResponse.next({ request: { headers: req.headers } });
  setTokenCookies(res, tokens);
  return res;
}

export const config = {
  matcher: ['/((?!api/|_next/|favicon.ico|icon|manifest).*)'],
};
