import type { NextResponse } from 'next/server';

/** Express API origin, server-side only. Browsers never call it directly (BFF pattern). */
export const API_URL = process.env.API_URL ?? 'http://localhost:4000';

export const ACCESS_COOKIE = 'fs_at';
export const REFRESH_COOKIE = 'fs_rt';

export type Tokens = { accessToken: string; refreshToken: string; expiresIn: number };

const base = { httpOnly: true, sameSite: 'lax' as const, secure: process.env.NODE_ENV === 'production', path: '/' };
const REFRESH_MAX_AGE = 30 * 24 * 60 * 60; // matches JWT_REFRESH_TTL_SECONDS

/** Tokens live only in httpOnly cookies, so page scripts (and any XSS) never see them. */
export function setTokenCookies(res: NextResponse, t: Tokens) {
  res.cookies.set(ACCESS_COOKIE, t.accessToken, { ...base, maxAge: Math.max(60, t.expiresIn - 30) });
  res.cookies.set(REFRESH_COOKIE, t.refreshToken, { ...base, maxAge: REFRESH_MAX_AGE });
}

export function clearTokenCookies(res: NextResponse) {
  res.cookies.set(ACCESS_COOKIE, '', { ...base, maxAge: 0 });
  res.cookies.set(REFRESH_COOKIE, '', { ...base, maxAge: 0 });
}

/** Rotates the refresh token. Returns null when the session is gone (expired, revoked or reused). */
export async function refreshTokens(refreshToken: string): Promise<Tokens | null> {
  try {
    const r = await fetch(`${API_URL}/api/v1/auth/refresh`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ refreshToken }),
      cache: 'no-store',
    });
    return r.ok ? ((await r.json()) as Tokens) : null;
  } catch {
    return null;
  }
}
