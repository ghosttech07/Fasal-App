import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import { API_URL } from '@/lib/session';
import { STAFF_ACCESS_COOKIE } from '@/lib/staff-session';

/** Staff change their own password; the API checks the current one and the session. */
export async function POST(req: Request) {
  const token = (await cookies()).get(STAFF_ACCESS_COOKIE)?.value;
  if (!token) return NextResponse.json({ code: 'staff_session_required' }, { status: 401 });
  try {
    const r = await fetch(`${API_URL}/api/v1/staff/password`, {
      method: 'POST',
      headers: { 'content-type': 'application/json', authorization: `Bearer ${token}` },
      body: await req.text(),
      cache: 'no-store',
    });
    return new NextResponse(await r.text(), {
      status: r.status,
      headers: { 'content-type': 'application/json' },
    });
  } catch {
    return NextResponse.json({ code: 'network' }, { status: 503 });
  }
}
