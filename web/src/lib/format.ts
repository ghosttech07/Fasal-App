export type Json = Record<string, unknown>;

const inr = new Intl.NumberFormat('en-IN', { maximumFractionDigits: 0 });

/** 1500000 paise → "₹15,000" (whole rupees, Indian grouping). */
export const rupees = (paise: number) => `₹${inr.format(Math.round(paise / 100))}`;

/** "2026-11-01" → "1 Nov" (or "1 Nov 2026" with year). */
export function day(iso: string | Date, year = false) {
  const d = typeof iso === 'string' ? new Date(iso.length === 10 ? `${iso}T00:00:00Z` : iso) : iso;
  return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', ...(year ? { year: 'numeric' } : {}), timeZone: 'Asia/Kolkata' });
}

export const num1 = (n: number) => (Number.isInteger(n) ? String(n) : n.toFixed(1));

export const DISTRICTS = [
  ['LATUR', 'Latur'],
  ['BEED', 'Beed'],
  ['DHARASHIV', 'Dharashiv'],
  ['NANDED', 'Nanded'],
] as const;

const PHASES: Record<string, string> = { P1_SOWING: 'Sowing', P2_GROWTH: 'Growth', P3_GRAIN: 'Grain filling', P1_SEASON: 'Whole season' };
export const phaseName = (id: string) => PHASES[id] ?? id.replace(/^P\d_/, '').toLowerCase();

export const en = (names: unknown) => (names as { en?: string } | null)?.en ?? '';

/** Days between two ISO dates (UTC midnight), inclusive of the start day. */
export const daysBetween = (from: string, to: string) => Math.round((Date.parse(`${to}T00:00:00Z`) - Date.parse(`${from}T00:00:00Z`)) / 86_400_000) + 1;

export const todayIso = () => new Date().toISOString().slice(0, 10);

// ---- API shapes used by the screens ----
export type Me = {
  farmerCode: string;
  name: string | null;
  districtCode: string | null;
  village: string | null;
  consents: string[];
  wallet: { handleMasked: string; verifiedName: string | null; status: string } | null;
  plotCount: number;
  onboarding: { consent: boolean; profile: boolean; plot: boolean; wallet: boolean };
};

export type Slab = { level: number; threshold: number; payoutPctOfPhase: number };
export type PhaseStatus = {
  phaseId: string;
  from: string;
  to: string;
  state: 'UPCOMING' | 'IN_PROGRESS' | 'COMPLETE';
  daysElapsed: number;
  observedMm: number;
  normalMm: number;
  indexValue: number | null;
  triggeredLevel: number;
};
export type Policy = {
  id: string;
  policyNumber: string | null;
  status: string;
  cropCode: string;
  names: unknown;
  peril: 'DROUGHT' | 'FLOOD';
  indexType: 'DROUGHT_RAIN_DEFICIT' | 'FLOOD_EXCESS_RAIN';
  rollingDays: number | null;
  sumInsuredPaise: number;
  premiumPaise: number;
  subsidyPaise: number;
  paidOutPaise: number;
  coverStart: string | null;
  coverEnd: string | null;
  plot: { areaAcres: number | null; gridCellId: number };
  phasePlan: { id: string; from: string; to: string; weightPct: number; amountPaise: number }[];
  phases: PhaseStatus[];
  slabs: Slab[];
  triggerEvents: {
    id: string;
    phaseId: string;
    slabLevel: number;
    indexValue: number;
    threshold: number;
    payoutAmountPaise: number;
    payoutStatus: string | null;
    detectedAt: string;
    slaDueAt: string | null;
  }[];
};

/** Next onboarding step, or null when set-up is complete. */
export function nextSetupStep(me: Me): string | null {
  if (!me.onboarding.consent || !me.onboarding.profile) return '/setup/about';
  if (!me.onboarding.plot) return '/setup/field';
  if (!me.onboarding.wallet) return '/setup/upi';
  return null;
}

export const PAYOUT_WORDS: Record<string, string> = {
  AWAITING_BATCH: 'Approved, sending soon',
  QUEUED: 'Sending',
  SENT: 'Sent to your bank',
  SUCCESS: 'Received',
  ACTION_REQUIRED: 'Update your UPI ID',
};
