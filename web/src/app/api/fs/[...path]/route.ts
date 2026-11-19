import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import { ACCESS_COOKIE, API_URL, REFRESH_COOKIE, clearTokenCookies, refreshTokens, setTokenCookies, type Tokens } from '@/lib/session';

/**
 * Same-origin proxy for browser calls: /api/fs/<path> → API /api/v1/<path>, with the bearer token
 * taken from the httpOnly cookie. Refreshes once on 401 and replays.
 */
async function handle(req: Request, ctx: { params: Promise<{ path: string[] }> }) {
  const { path } = await ctx.params;
  const url = new URL(req.url);
  const target = `${API_URL}/api/v1/${path.map(encodeURIComponent).join('/')}${url.search}`;
  const body = req.method === 'GET' || req.method === 'HEAD' ? undefined : await req.text();
  const jar = await cookies();

  const send = (token?: string) =>
    fetch(target, {
      method: req.method,
      headers: { 'content-type': 'application/json', ...(token ? { authorization: `Bearer ${token}` } : {}) },
      body,
      cache: 'no-store',
    });

  let fresh: Tokens | null = null;
  let r: Response;
  try {
    r = await send(jar.get(ACCESS_COOKIE)?.value);
    const rt = jar.get(REFRESH_COOKIE)?.value;
    if (r.status === 401 && rt) {
      fresh = await refreshTokens(rt);
      if (fresh) r = await send(fresh.accessToken);
    }
  } catch {
    return NextResponse.json({ code: 'network' }, { status: 503 });
  }

  const res = new NextResponse(r.status === 204 ? null : await r.text(), {
    status: r.status,
    headers: { 'content-type': r.headers.get('content-type') ?? 'application/json' },
  });
  if (fresh) setTokenCookies(res, fresh);
  else if (r.status === 401) clearTokenCookies(res);
  return res;
}

export { handle as GET, handle as POST, handle as PATCH, handle as PUT, handle as DELETE };
