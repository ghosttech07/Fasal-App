import { NextResponse } from 'next/server';
import { isLanguageCode } from '@fasalshield/shared';
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
  if (user?.role !== 'FARMER' && user?.role !== 'AGENT')
    return NextResponse.json({ code: 'role_not_supported' }, { status: 403 });
  const res = NextResponse.json({ user });
  setTokenCookies(res, tokens);
  await applySavedLanguage(req, res, user.role, tokens.accessToken);
  return res;
}

/**
 * A farmer enrolled by an agent (or signing in on a new phone) gets the app in the language saved on
 * their profile, unless this phone already chose one. Best effort: failure just keeps the current language.
 */
async function applySavedLanguage(
  req: Request,
  res: NextResponse,
  role: string,
  accessToken: string,
) {
  if (role !== 'FARMER' || /(?:^|;\s*)fs_lang=/.test(req.headers.get('cookie') ?? '')) return;
  try {
    const r = await fetch(`${API_URL}/api/v1/me`, {
      headers: { authorization: `Bearer ${accessToken}` },
      cache: 'no-store',
    });
    const me = (await r.json()) as { language?: string };
    if (r.ok && isLanguageCode(me.language) && me.language !== 'en')
      res.cookies.set('fs_lang', me.language, { path: '/', maxAge: 31_536_000, sameSite: 'lax' });
  } catch {
    /* keep the phone's current language */
  }
}
