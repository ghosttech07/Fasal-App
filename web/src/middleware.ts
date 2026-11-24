import { NextResponse, type NextRequest } from 'next/server';
import {
  ACCESS_COOKIE,
  REFRESH_COOKIE,
  clearTokenCookies,
  refreshTokens,
  setTokenCookies,
} from '@/lib/session';
import {
  STAFF_ACCESS_COOKIE,
  STAFF_REFRESH_COOKIE,
  clearStaffCookies,
  refreshStaffTokens,
  setStaffCookies,
} from '@/lib/staff-session';

const PUBLIC = ['/login', '/otp', '/start'];

/**
 * Route guard: signed-out visitors opening the home page see the public landing page (/welcome) first,
 * any other private page sends them to /login; an expired access cookie is renewed before the page renders.
 */
export async function middleware(req: NextRequest) {
  if (req.nextUrl.pathname === '/admin' || req.nextUrl.pathname.startsWith('/admin/'))
    return staffGuard(req);
  const isPublic = PUBLIC.includes(req.nextUrl.pathname);
  const access = req.cookies.get(ACCESS_COOKIE)?.value;
  const refresh = req.cookies.get(REFRESH_COOKIE)?.value;

  // Opening the website (typed address, bookmark, shared link) always shows the landing page first,
  // signed in or not. Moves inside the app carry a same-site Referer and go straight to the app home.
  if (req.nextUrl.pathname === '/' && !cameFromSite(req))
    return NextResponse.redirect(new URL('/welcome', req.url));

  if (isPublic)
    return access || refresh ? NextResponse.redirect(new URL('/', req.url)) : NextResponse.next();
  if (access) return NextResponse.next();

  const tokens = refresh ? await refreshTokens(refresh) : null;
  if (!tokens) {
    const to = req.nextUrl.pathname === '/' ? '/welcome' : '/login';
    const res = NextResponse.redirect(new URL(to, req.url));
    if (refresh) clearTokenCookies(res);
    return res;
  }
  // Hand the new access token to this same render as well as to the browser.
  req.cookies.set(ACCESS_COOKIE, tokens.accessToken);
  const res = NextResponse.next({ request: { headers: req.headers } });
  setTokenCookies(res, tokens);
  return res;
}

/** Admin portal guard: its own staff session (password + authenticator code), never the farmer one. */
async function staffGuard(req: NextRequest) {
  const onLogin = req.nextUrl.pathname === '/admin/login';
  const access = req.cookies.get(STAFF_ACCESS_COOKIE)?.value;
  const refresh = req.cookies.get(STAFF_REFRESH_COOKIE)?.value;
  if (access)
    return onLogin ? NextResponse.redirect(new URL('/admin', req.url)) : NextResponse.next();
  const tokens = refresh ? await refreshStaffTokens(refresh) : null;
  if (!tokens) {
    if (onLogin) return NextResponse.next();
    const res = NextResponse.redirect(new URL('/admin/login', req.url));
    if (refresh) clearStaffCookies(res);
    return res;
  }
  if (onLogin) {
    const res = NextResponse.redirect(new URL('/admin', req.url));
    setStaffCookies(res, tokens);
    return res;
  }
  req.cookies.set(STAFF_ACCESS_COOKIE, tokens.accessToken);
  const res = NextResponse.next({ request: { headers: req.headers } });
  setStaffCookies(res, tokens);
  return res;
}

function cameFromSite(req: NextRequest): boolean {
  const ref = req.headers.get('referer');
  if (!ref) return false;
  try {
    return new URL(ref).origin === req.nextUrl.origin;
  } catch {
    return false;
  }
}

export const config = {
  // welcome/ is the static public landing page and its media: no session needed.
  matcher: ['/((?!api/|_next/|welcome|favicon.ico|icon|manifest).*)'],
};
