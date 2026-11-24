import { NextResponse } from 'next/server';
import { API_URL } from '@/lib/session';
import { setStaffCookies, type StaffTokens } from '@/lib/staff-session';

/** Password-only sign-in for the main admin. The session goes into httpOnly cookies only. */
export async function POST(req: Request) {
  let r: Response;
  try {
    r = await fetch(`${API_URL}/api/v1/staff/quick-login`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: await req.text(),
      cache: 'no-store',
    });
  } catch {
    return NextResponse.json({ code: 'network' }, { status: 503 });
  }
  const data = await r.json().catch(() => ({}));
  if (!r.ok) return NextResponse.json(data, { status: r.status });
  const { user, ...tokens } = data as StaffTokens & { user: unknown };
  const res = NextResponse.json({ user });
  setStaffCookies(res, tokens);
  return res;
}
