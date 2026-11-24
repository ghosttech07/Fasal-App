import { env } from '../env';
import { logger } from '../lib/logger';
import { hmac, randomToken } from '../lib/crypto';

/**
 * Third-party adapters (docs §9). Only mock implementations exist yet; the env schema refuses to boot
 * with a real provider selected but no credentials, and refuses mocks in prod.
 */

export interface SmsProvider {
  send(phoneE164: string, text: string): Promise<void>;
}

export interface PaymentProvider {
  /** Validates a UPI VPA and returns the bank-registered name (FR-05). */
  verifyVpa(vpa: string): Promise<{ valid: boolean; registeredName?: string }>;
  /** Collects premium. Mock succeeds instantly; real gateways return a pending intent + webhook. */
  collectPremium(input: { amountPaise: number; reference: string }): Promise<{ status: 'SUCCESS' | 'FAILED'; gatewayRef: string }>;
  /** Sends a payout to a UPI ID. idempotencyKey makes a retry of the same payout a no-op at the gateway (NFR-16). */
  sendPayout(input: { amountPaise: number; vpa: string; idempotencyKey: string }): Promise<{ status: 'SUCCESS' | 'FAILED'; utr?: string; reason?: string }>;
}

export interface WeatherProvider {
  readonly sourceCode: string;
  /** Daily rainfall (mm) for a grid cell and date. */
  dailyRainMm(gridCellId: number, date: string): number;
  /** Long-term mean daily rainfall for the date (baseline climatology, FS-0704). */
  normalRainMm(gridCellId: number, date: string): number;
}

const consoleSms: SmsProvider = {
  async send(phoneE164, text) {
    // Dev only: the OTP is visible in the API log by design (build brief 2.1).
    logger.warn({ to: phoneE164.slice(0, 3) + '******' + phoneE164.slice(-4) }, `[SMS] ${text}`);
  },
};

const mockPayments: PaymentProvider = {
  async verifyVpa(vpa) {
    // Mock rule: handles starting with "fail" are invalid, everything else verifies.
    if (vpa.startsWith('fail')) return { valid: false };
    const handle = vpa.split('@')[0] ?? '';
    return { valid: true, registeredName: handle.replace(/[._-]+/g, ' ').toUpperCase() };
  },
  async collectPremium({ reference }) {
    return { status: 'SUCCESS', gatewayRef: `MOCKPAY-${reference.slice(0, 8)}-${randomToken().slice(0, 6)}` };
  },
  async sendPayout({ vpa, idempotencyKey }) {
    // Mock rule mirrors verifyVpa: handles starting with "fail" bounce; everything else is credited.
    if (vpa.startsWith('fail')) return { status: 'FAILED', reason: 'vpa_invalid' };
    return { status: 'SUCCESS', utr: `MOCKUTR${hmac(idempotencyKey, 'utr').slice(0, 12).toUpperCase()}` };
  },
};

// Demo fallback only: Marathwada monthly normals (mm), roughly IMD 1991-2020. Real cells use NASA climatology.
const MONTHLY_NORMAL_MM = [4, 3, 8, 9, 20, 140, 190, 180, 170, 70, 25, 8];

const daysInMonth = (y: number, m: number) => new Date(Date.UTC(y, m + 1, 0)).getUTCDate();

/** Local normals per cell (mm/day by month), filled from the database by loadNormals() before use. */
export const cellNormals = new Map<number, number[]>();

const simulator: WeatherProvider = {
  sourceCode: 'SIMULATOR',
  normalRainMm(cell, date) {
    const d = new Date(`${date}T00:00:00Z`);
    const local = cellNormals.get(cell);
    if (local?.length === 12) return local[d.getUTCMonth()]!;
    // Fallback (simulator demo only): Marathwada monthly normals spread over the month.
    return (MONTHLY_NORMAL_MM[d.getUTCMonth()] ?? 0) / daysInMonth(d.getUTCFullYear(), d.getUTCMonth());
  },
  dailyRainMm(cell, date) {
    // Deterministic "normal year": baseline × 0.85–1.15 noise keyed by cell+date, so no triggers fire
    // until a scenario (POST /simulator/scenarios) overrides it.
    const noise = parseInt(hmac(`${cell}:${date}`, 'simulator').slice(0, 8), 16) / 0xffffffff;
    return Math.round(this.normalRainMm(cell, date) * (0.85 + noise * 0.3) * 10) / 10;
  },
};

export const sms: SmsProvider = consoleSms;
export const payments: PaymentProvider = mockPayments;
// WEATHER_PROVIDER=chirps loads real rain (adapters/rain.ts: CHIRPS v3 + NASA POWER); the simulator keeps the climatology normals.
export const weather: WeatherProvider = simulator;
logger.debug({ provider: env.WEATHER_PROVIDER }, 'weather provider');
