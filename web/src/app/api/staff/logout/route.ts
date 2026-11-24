import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import { API_URL } from '@/lib/session';
import { STAFF_REFRESH_COOKIE, clearStaffCookies } from '@/lib/staff-session';

/** Ends the staff session on the server (whole refresh family) and clears the cookies. */
export async function POST() {
  const refreshToken = (await cookies()).get(STAFF_REFRESH_COOKIE)?.value;
  if (refreshToken) {
    await fetch(`${API_URL}/api/v1/staff/logout`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ refreshToken }),
      cache: 'no-store',
    }).catch(() => undefined);
  }
  const res = new NextResponse(null, { status: 204 });
  clearStaffCookies(res);
  return res;
}
