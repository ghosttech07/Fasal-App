import { cookies } from 'next/headers';
import { findDistrict } from '@fasalshield/shared/geo';
import { STAFF_ACCESS_COOKIE, staffApi, type StaffUser } from './staff-session';

/** Server-side GET against the admin API with the current staff session (middleware keeps it fresh). */
export async function adminGet<T>(path: string): Promise<T | null> {
  const token = (await cookies()).get(STAFF_ACCESS_COOKIE)?.value;
  return staffApi<T>(`admin/${path}`, token);
}

export async function currentStaff(): Promise<StaffUser | null> {
  const token = (await cookies()).get(STAFF_ACCESS_COOKIE)?.value;
  return (await staffApi<{ user: StaffUser }>('staff/me', token))?.user ?? null;
}

/** "MH-LATUR" → "Latur". */
export const districtName = (code: string | null | undefined) =>
  code ? (findDistrict(code)?.district ?? code) : '—';

/** Date and time in India, e.g. "16 Dec, 10:42". */
export function when(iso: string | Date | null | undefined) {
  if (!iso) return '—';
  return new Date(iso).toLocaleString('en-IN', {
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
    timeZone: 'Asia/Kolkata',
  });
}

/** "3 h 10 m" since a moment. */
export function since(iso: string | Date | null | undefined) {
  if (!iso) return '—';
  const m = Math.max(0, Math.round((Date.now() - new Date(iso).getTime()) / 60_000));
  return m < 60
    ? `${m} m`
    : m < 48 * 60
      ? `${Math.floor(m / 60)} h ${m % 60} m`
      : `${Math.floor(m / 1440)} days`;
}

export const STATUS_LABEL: Record<string, { text: string; tone: '' | 'warn' | 'bad' | 'plain' }> = {
  AWAITING_BATCH: { text: 'Waiting for batch', tone: 'warn' },
  OPEN: { text: 'New', tone: 'warn' },
  IN_PROGRESS: { text: 'Being checked', tone: 'plain' },
  RESOLVED: { text: 'Answered', tone: '' },
  FLAGGED: { text: 'Flagged', tone: 'bad' },
  UNVERIFIED: { text: 'Not checked', tone: 'warn' },
  QUEUED: { text: 'In a batch', tone: 'plain' },
  SENT: { text: 'Sent', tone: 'plain' },
  PENDING: { text: 'Pending', tone: 'plain' },
  SUCCESS: { text: 'Credited', tone: '' },
  FAILED_RETRYABLE: { text: 'Failed, will retry', tone: 'bad' },
  ACTION_REQUIRED: { text: 'Action needed', tone: 'bad' },
  REVERSED: { text: 'Reversed', tone: 'bad' },
  CANCELLED: { text: 'Cancelled', tone: 'plain' },
  SUBMITTED: { text: 'Waiting for approval', tone: 'warn' },
  APPROVED: { text: 'Approved', tone: '' },
  REJECTED: { text: 'Rejected', tone: 'bad' },
  DRAFT: { text: 'Draft', tone: 'plain' },
  PENDING_APPROVAL: { text: 'Needs 2nd approval', tone: 'warn' },
  PUBLISHED: { text: 'Published', tone: '' },
  RETIRED: { text: 'Retired', tone: 'plain' },
  DETECTED: { text: 'Detected', tone: 'plain' },
  HELD: { text: 'Held for review', tone: 'warn' },
  PAID: { text: 'Paid', tone: '' },
  ACTIVE: { text: 'Active', tone: '' },
  IN_WAITING: { text: 'Waiting period', tone: 'plain' },
  EXPIRED: { text: 'Ended', tone: 'plain' },
  PENDING_PAYMENT: { text: 'Not paid', tone: 'warn' },
  QUOTED: { text: 'Quoted', tone: 'plain' },
  VERIFIED: { text: 'Verified', tone: '' },
  BASIC: { text: 'Basic', tone: 'plain' },
  NONE: { text: 'None', tone: 'warn' },
  INVALID: { text: 'Invalid', tone: 'bad' },
  DISABLED: { text: 'Disabled', tone: 'bad' },
};

export const FAILURE_LABEL: Record<string, string> = {
  no_upi_id: 'No UPI ID on file',
  vpa_invalid: 'UPI ID rejected by the bank',
  failed: 'Payment failed',
};

export const can = {
  submitPayouts: (r: string) => r === 'CLAIMS_OPS' || r === 'SYS_ADMIN',
  approvePayouts: (r: string) => r === 'PAYOUT_APPROVER' || r === 'SYS_ADMIN',
  editProducts: (r: string) => r === 'PRODUCT_MANAGER' || r === 'SYS_ADMIN',
  simulate: (r: string) => r === 'SYS_ADMIN' || r === 'CLAIMS_OPS' || r === 'PRODUCT_MANAGER',
  manageStaff: (r: string) => r === 'SYS_ADMIN',
  handleCases: (r: string) => r === 'SYS_ADMIN' || r === 'CLAIMS_OPS',
  readCases: (r: string) => r === 'SYS_ADMIN' || r === 'CLAIMS_OPS' || r === 'REGULATOR',
};
