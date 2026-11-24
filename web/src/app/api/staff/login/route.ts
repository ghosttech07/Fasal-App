import { NextResponse } from 'next/server';
import { API_URL } from '@/lib/session';
import { setChallengeCookie } from '@/lib/staff-session';

/** Step 1 (email + password). The challenge goes into an httpOnly cookie; only the enrolment secret (first sign-in) reaches the page. */
export async function POST(req: Request) {
  let r: Response;
  try {
    r = await fetch(`${API_URL}/api/v1/staff/login`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: await req.text(),
      cache: 'no-store',
    });
  } catch {
    return NextResponse.json({ code: 'network' }, { status: 503 });
  }
  const data = (await r.json().catch(() => ({}))) as {
    challenge?: string;
    expiresIn?: number;
    enroll?: unknown;
  };
  if (!r.ok || !data.challenge) return NextResponse.json(data, { status: r.ok ? 502 : r.status });
  const res = NextResponse.json({ enroll: data.enroll ?? null });
  setChallengeCookie(res, data.challenge, data.expiresIn ?? 300);
  return res;
}
