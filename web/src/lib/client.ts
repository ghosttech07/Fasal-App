/** Browser-side JSON POST to our own Next.js routes. Throws an ApiError carrying the API's problem code. */
export class ApiError extends Error {
  constructor(
    public code: string,
    public status: number,
  ) {
    super(code);
  }
}

export const post = <T>(url: string, body?: unknown) => send<T>('POST', url, body);
export const patch = <T>(url: string, body?: unknown) => send<T>('PATCH', url, body);
export const get = <T>(url: string) => send<T>('GET', url);

async function send<T>(method: string, url: string, body?: unknown): Promise<T> {
  let r: Response;
  try {
    r = await fetch(url, {
      method,
      headers: { 'content-type': 'application/json' },
      body: body === undefined ? undefined : JSON.stringify(body),
    });
  } catch {
    throw new ApiError('network', 0);
  }
  if (r.status === 204) return undefined as T;
  const data = await r.json().catch(() => ({}));
  if (!r.ok) throw new ApiError((data as { code?: string }).code ?? 'unknown', r.status);
  return data as T;
}

/** Plain-language messages for API problem codes (frontend spec §3: specific, with the way out). */
export function messageFor(e: unknown): string {
  const code =
    e instanceof ApiError
      ? e.status === 429 && e.code === 'unknown'
        ? 'busy'
        : e.code
      : 'unknown';
  if (code === 'busy') return 'Too many tries. Wait a minute, then try again.';
  switch (code) {
    case 'network':
      return 'No internet connection. Check your signal and try again.';
    case 'otp_rate_limited':
      return 'Too many codes asked for this number. Wait an hour, then try again.';
    case 'otp_invalid':
      return 'That code is not right. Check the SMS and try again.';
    case 'otp_expired':
      return 'This code has expired. Ask for a new one.';
    case 'otp_attempts_exceeded':
      return 'Too many wrong codes. Ask for a new one.';
    case 'validation_failed':
      return 'Please check what you entered.';
    case 'id_already_registered':
      return 'This ID is already registered to another account. One person can have one account.';
    case 'gps_accuracy_too_low':
      return 'The GPS signal is too weak. Move to open ground in your field and try again.';
    case 'vpa_invalid':
      return 'We could not find this UPI ID. Check the spelling, for example name@okaxis.';
    case 'already_insured':
      return 'This field already has this cover for the season.';
    case 'product_not_eligible':
      return 'This cover is not available for your crop or district.';
    case 'payment_failed':
      return 'The payment did not go through. No money was taken. Try again.';
    case 'plot_not_found':
    case 'policy_not_found':
      return 'We could not find this. Go back and try again.';
    case 'role_not_supported':
      return 'This number belongs to a field agent. Agent sign-in is coming soon.';
    default:
      return 'Something went wrong on our side. Try again in a minute.';
  }
}

/** sessionStorage can throw (private mode, blocked storage); the OTP hand-off must not crash the page. */
export const handoff = {
  get(key: string): string | null {
    try {
      return sessionStorage.getItem(key);
    } catch {
      return null;
    }
  },
  set(key: string, value: string) {
    try {
      sessionStorage.setItem(key, value);
    } catch {
      /* the OTP screen falls back to asking for the number again */
    }
  },
};

/** "9886671800" → "+91 98866 71800" */
export const formatPhone = (digits: string) => `+91 ${digits.slice(0, 5)} ${digits.slice(5)}`;
