import { z } from 'zod';
import { SUPPORTED_LANGUAGES } from '../constants/languages';
import { ROLES } from '../constants/roles';

/**
 * Shared zod schemas used by API DTOs, the admin forms and the mobile forms,
 * so that validation is identical on every client and on the server.
 */

/** Indian mobile numbers start with 6–9 and have 10 digits. */
const INDIAN_MOBILE_10 = /^[6-9]\d{9}$/;

/**
 * Normalises common Indian phone inputs to E.164 (+91XXXXXXXXXX), or returns null if invalid.
 * Accepts: "9876543210", "09876543210", "+919876543210", "91 98765-43210", "+91 98765 43210".
 */
export function normalizeIndianPhone(input: string): string | null {
  const digits = input.replace(/[\s\-().]/g, '');
  let national: string;
  if (/^\+91\d{10}$/.test(digits)) national = digits.slice(3);
  else if (/^91\d{10}$/.test(digits)) national = digits.slice(2);
  else if (/^0\d{10}$/.test(digits)) national = digits.slice(1);
  else if (/^\d{10}$/.test(digits)) national = digits;
  else return null;
  return INDIAN_MOBILE_10.test(national) ? `+91${national}` : null;
}

/** Accepts loose input, outputs normalised E.164. */
export const phoneE164IndiaSchema = z
  .string()
  .trim()
  .transform((value, ctx) => {
    const normalised = normalizeIndianPhone(value);
    if (!normalised) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'invalid_phone' });
      return z.NEVER;
    }
    return normalised;
  });

export const otpSchema = z.string().regex(/^\d{6}$/, 'invalid_otp');

/** UPI VPA: handle@psp, e.g. savita.patil@okaxis. */
export const VPA_REGEX = /^[a-zA-Z0-9][a-zA-Z0-9._-]{1,255}@[a-zA-Z][a-zA-Z0-9]{1,63}$/;
export const vpaSchema = z.string().trim().toLowerCase().regex(VPA_REGEX, 'invalid_vpa');

/** Masks a VPA for display: "savita.patil@okaxis" → "sa********@okaxis". */
export function maskVpa(vpa: string): string {
  const at = vpa.lastIndexOf('@');
  if (at <= 0) return '****';
  const handle = vpa.slice(0, at);
  const visible = handle.slice(0, Math.min(2, handle.length));
  return `${visible}${'*'.repeat(Math.max(4, handle.length - visible.length))}${vpa.slice(at)}`;
}

/** Masks an E.164 phone: "+919876543210" → "+91******3210". */
export function maskPhone(e164: string): string {
  if (e164.length < 8) return '****';
  return `${e164.slice(0, 3)}${'*'.repeat(e164.length - 7)}${e164.slice(-4)}`;
}

export const uuidSchema = z.string().uuid();

/** Client-generated idempotency/sync id (UUID v4) used by offline queues (NFR-04). */
export const clientIdSchema = uuidSchema;

export const languageCodeSchema = z.enum(SUPPORTED_LANGUAGES);

export const roleSchema = z.enum(ROLES);

/** WGS84 coordinate with plausibility bounds for India (incl. islands). */
export const indiaLatLngSchema = z.object({
  lat: z.number().min(6).max(37.5),
  lng: z.number().min(68).max(97.5),
});

export const paiseSchema = z.number().int().nonnegative().max(Number.MAX_SAFE_INTEGER);

export const basisPointsSchema = z.number().int().min(0).max(10_000);

/** Cursor pagination query shared by list endpoints (docs §8 conventions). */
export const paginationQuerySchema = z.object({
  cursor: z.string().min(1).optional(),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});
export type PaginationQuery = z.infer<typeof paginationQuerySchema>;

/** RFC 9457 problem details shape returned by the API on errors. */
export const problemDetailsSchema = z.object({
  type: z.string(),
  title: z.string(),
  status: z.number().int(),
  detail: z.string().optional(),
  instance: z.string().optional(),
  code: z.string().optional(),
  errors: z.array(z.object({ path: z.string(), message: z.string() })).optional(),
  traceId: z.string().optional(),
});
export type ProblemDetails = z.infer<typeof problemDetailsSchema>;
