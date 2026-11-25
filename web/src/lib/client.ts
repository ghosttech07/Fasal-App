import type { Key } from '@/i18n';

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

/** Plain-language messages for API problem codes (frontend spec §3: specific, with the way out), in the farmer's language. */
const KNOWN = new Set([
  'network',
  'otp_rate_limited',
  'otp_invalid',
  'otp_expired',
  'otp_attempts_exceeded',
  'validation_failed',
  'id_already_registered',
  'gps_accuracy_too_low',
  'vpa_invalid',
  'already_insured',
  'product_not_eligible',
  'payment_failed',
  'role_not_supported',
  'too_many_open_grievances',
]);
export function messageFor(e: unknown, t: (key: Key) => string): string {
  const code =
    e instanceof ApiError
      ? e.status === 429 && e.code === 'unknown'
        ? 'busy'
        : e.code
      : 'unknown';
  if (code === 'busy') return t('err.busy');
  if (code === 'plot_not_found' || code === 'policy_not_found') return t('err.not_found');
  return KNOWN.has(code) ? t(`err.${code}` as Key) : t('err.unknown');
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
