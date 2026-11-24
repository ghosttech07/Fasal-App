import type { NextResponse } from 'next/server';
import { API_URL } from './session';

/** Staff portal cookies: separate from the farmer session so one never unlocks the other. */
export const STAFF_ACCESS_COOKIE = 'fs_sat';
export const STAFF_REFRESH_COOKIE = 'fs_srt';
/** 5-minute proof that the password step passed; never readable by page scripts. */
export const STAFF_CHALLENGE_COOKIE = 'fs_smc';

export type StaffTokens = {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
  sessionEndsAt: string;
};

const base = {
  httpOnly: true,
  sameSite: 'strict' as const, // admin actions never start from another site
  secure: process.env.NODE_ENV === 'production',
  path: '/',
};

export function setStaffCookies(res: NextResponse, t: StaffTokens) {
  const left = Math.max(60, Math.floor((new Date(t.sessionEndsAt).getTime() - Date.now()) / 1000));
  res.cookies.set(STAFF_ACCESS_COOKIE, t.accessToken, {
    ...base,
    maxAge: Math.max(30, t.expiresIn - 15),
  });
  res.cookies.set(STAFF_REFRESH_COOKIE, t.refreshToken, { ...base, maxAge: left });
}

export function clearStaffCookies(res: NextResponse) {
  for (const name of [STAFF_ACCESS_COOKIE, STAFF_REFRESH_COOKIE, STAFF_CHALLENGE_COOKIE])
    res.cookies.set(name, '', { ...base, maxAge: 0 });
}

export function setChallengeCookie(res: NextResponse, challenge: string, seconds: number) {
  res.cookies.set(STAFF_CHALLENGE_COOKIE, challenge, { ...base, maxAge: seconds });
}

/** Rotates the staff refresh token. Null when the session is over (expired, revoked, reused or hard cap reached). */
export async function refreshStaffTokens(refreshToken: string): Promise<StaffTokens | null> {
  try {
    const r = await fetch(`${API_URL}/api/v1/staff/refresh`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ refreshToken }),
      cache: 'no-store',
    });
    return r.ok ? ((await r.json()) as StaffTokens) : null;
  } catch {
    return null;
  }
}

export type StaffUser = {
  id: string;
  email: string;
  name: string | null;
  role: StaffRole;
  mustChangePassword?: boolean;
};
export type StaffRole =
  'PRODUCT_MANAGER' | 'CLAIMS_OPS' | 'PAYOUT_APPROVER' | 'SYS_ADMIN' | 'REINSURER' | 'REGULATOR';

export const ROLE_LABEL: Record<StaffRole, string> = {
  SYS_ADMIN: 'System admin',
  PRODUCT_MANAGER: 'Product manager',
  CLAIMS_OPS: 'Claims ops',
  PAYOUT_APPROVER: 'Payout approver',
  REINSURER: 'Reinsurer (read-only)',
  REGULATOR: 'Regulator (read-only)',
};

/** Server-side call to the API with the staff access token. */
export async function staffApi<T>(
  path: string,
  accessToken: string | undefined,
): Promise<T | null> {
  if (!accessToken) return null;
  try {
    const r = await fetch(`${API_URL}/api/v1/${path}`, {
      headers: { authorization: `Bearer ${accessToken}` },
      cache: 'no-store',
    });
    return r.ok ? ((await r.json()) as T) : null;
  } catch {
    return null;
  }
}
