import { NextResponse } from 'next/server';
import { API_URL } from '@/lib/session';

/** Ask the API to send an OTP. Passes the API's status and problem body straight through. */
export async function POST(req: Request) {
  const body = await req.text();
  try {
    const r = await fetch(`${API_URL}/api/v1/auth/otp/request`, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'x-forwarded-for': req.headers.get('x-forwarded-for') ?? '',
      },
      body,
      cache: 'no-store',
    });
    return new NextResponse(await r.text(), {
      status: r.status,
      headers: { 'content-type': r.headers.get('content-type') ?? 'application/json' },
    });
  } catch {
    return NextResponse.json({ code: 'network' }, { status: 503 });
  }
}
