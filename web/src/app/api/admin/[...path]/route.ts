import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import { API_URL } from '@/lib/session';
import {
  STAFF_ACCESS_COOKIE,
  STAFF_REFRESH_COOKIE,
  clearStaffCookies,
  refreshStaffTokens,
  setStaffCookies,
  type StaffTokens,
} from '@/lib/staff-session';

/**
 * Same-origin proxy for the admin portal: /api/admin/<path> → API /api/v1/admin/<path>, with the staff
 * token from its httpOnly cookie. Only the admin API is reachable through it. Refreshes once on 401.
 */
async function handle(req: Request, ctx: { params: Promise<{ path: string[] }> }) {
  const { path } = await ctx.params;
  const url = new URL(req.url);
  const target = `${API_URL}/api/v1/admin/${path.map(encodeURIComponent).join('/')}${url.search}`;
  const body = req.method === 'GET' || req.method === 'HEAD' ? undefined : await req.text();
  const jar = await cookies();
  const send = (token?: string) =>
    fetch(target, {
      method: req.method,
      headers: {
        'content-type': 'application/json',
        ...(token ? { authorization: `Bearer ${token}` } : {}),
      },
      body,
      cache: 'no-store',
    });

  let fresh: StaffTokens | null = null;
  let r: Response;
  try {
    r = await send(jar.get(STAFF_ACCESS_COOKIE)?.value);
    const rt = jar.get(STAFF_REFRESH_COOKIE)?.value;
    if (r.status === 401 && rt) {
      fresh = await refreshStaffTokens(rt);
      if (fresh) r = await send(fresh.accessToken);
    }
  } catch {
    return NextResponse.json({ code: 'network' }, { status: 503 });
  }
  const res = new NextResponse(r.status === 204 ? null : await r.text(), {
    status: r.status,
    headers: { 'content-type': r.headers.get('content-type') ?? 'application/json' },
  });
  if (fresh) setStaffCookies(res, fresh);
  else if (r.status === 401) clearStaffCookies(res);
  return res;
}

export { handle as GET, handle as POST, handle as PATCH, handle as PUT, handle as DELETE };
