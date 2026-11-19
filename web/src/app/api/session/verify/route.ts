import { NextResponse } from 'next/server';
import { API_URL, setTokenCookies, type Tokens } from '@/lib/session';

/** Verify the OTP; on success the tokens go into httpOnly cookies and only the user summary reaches the browser. */
export async function POST(req: Request) {
  const body = await req.text();
  let r: Response;
  try {
    r = await fetch(`${API_URL}/api/v1/auth/otp/verify`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body,
      cache: 'no-store',
    });
  } catch {
    return NextResponse.json({ code: 'network' }, { status: 503 });
  }
  const data = await r.json().catch(() => ({}));
  if (!r.ok) return NextResponse.json(data, { status: r.status });

  const { user, ...tokens } = data as Tokens & { user: { role: string; isNew: boolean } };
  if (user?.role !== 'FARMER') return NextResponse.json({ code: 'role_not_supported' }, { status: 403 });
  const res = NextResponse.json({ user });
  setTokenCookies(res, tokens);
  return res;
}
