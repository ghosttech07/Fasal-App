import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import { API_URL } from '@/lib/session';
import { STAFF_CHALLENGE_COOKIE, setStaffCookies, type StaffTokens } from '@/lib/staff-session';

/** Step 2 (6-digit code). On success the session goes into httpOnly cookies and the challenge cookie is dropped. */
export async function POST(req: Request) {
  const { code } = (await req.json().catch(() => ({}))) as { code?: string };
  const challenge = (await cookies()).get(STAFF_CHALLENGE_COOKIE)?.value;
  if (!challenge) return NextResponse.json({ code: 'challenge_expired' }, { status: 401 });
  let r: Response;
  try {
    r = await fetch(`${API_URL}/api/v1/staff/mfa`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ challenge, code }),
      cache: 'no-store',
    });
  } catch {
    return NextResponse.json({ code: 'network' }, { status: 503 });
  }
  const data = await r.json().catch(() => ({}));
  if (!r.ok) return NextResponse.json(data, { status: r.status });
  const { user, ...tokens } = data as StaffTokens & { user: unknown };
  const res = NextResponse.json({ user });
  res.cookies.set(STAFF_CHALLENGE_COOKIE, '', { path: '/', maxAge: 0 });
  setStaffCookies(res, tokens);
  return res;
}
