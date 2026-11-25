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
  // Terms, privacy and grievance pages are open to everyone, signed in or not.
  if (req.nextUrl.pathname.startsWith('/legal/')) return NextResponse.next();
  const isPublic = PUBLIC.includes(req.nextUrl.pathname);
  const access = req.cookies.get(ACCESS_COOKIE)?.value;
  const refresh = req.cookies.get(REFRESH_COOKIE)?.value;

  // Opening the website (typed address, bookmark, shared link) always shows the landing page first,
  // signed in or not. Moves inside the app carry a same-site Referer and go straight to the app home.
  if (req.nextUrl.pathname === '/' && !cameFromSite(req))
    return NextResponse.redirect(new URL('/welcome', req.url));

  if (isPublic)
    return access || refresh
      ? NextResponse.redirect(new URL(homeFor(access), req.url))
      : NextResponse.next();
  if (access) {
    const wrong = misplaced(req.nextUrl.pathname, access);
    return wrong ? NextResponse.redirect(new URL(wrong, req.url)) : NextResponse.next();
  }

  const tokens = refresh ? await refreshTokens(refresh) : null;
  if (!tokens) {
    const to = req.nextUrl.pathname === '/' ? '/welcome' : '/login';
    const res = NextResponse.redirect(new URL(to, req.url));
    if (refresh) clearTokenCookies(res);
    return res;
  }
  const wrong = misplaced(req.nextUrl.pathname, tokens.accessToken);
  // Hand the new access token to this same render as well as to the browser.
  req.cookies.set(ACCESS_COOKIE, tokens.accessToken);
  const res = wrong
    ? NextResponse.redirect(new URL(wrong, req.url))
    : NextResponse.next({ request: { headers: req.headers } });
  setTokenCookies(res, tokens);
  return res;
}

/**
 * Role from the access token, for routing only (the API verifies the signature and enforces roles itself).
 * Agents use /agent; farmers use everything else.
 */
function roleOf(token: string | undefined): string | null {
  try {
    const part = token?.split('.')[1];
    if (!part) return null;
    return (
      (JSON.parse(atob(part.replace(/-/g, '+').replace(/_/g, '/'))) as { role?: string }).role ??
      null
    );
  } catch {
    return null;
  }
}
const homeFor = (token: string | undefined) => (roleOf(token) === 'AGENT' ? '/agent' : '/');
function misplaced(path: string, token: string): string | null {
  const agentPath = path === '/agent' || path.startsWith('/agent/');
  const agent = roleOf(token) === 'AGENT';
  if (agent && !agentPath) return '/agent';
  if (!agent && agentPath) return '/';
  return null;
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
  matcher: ['/((?!api/|_next/|welcome|favicon.ico|icon|manifest|sw.js|offline.html).*)'],
};
