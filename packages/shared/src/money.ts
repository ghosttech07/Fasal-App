/**
 * Money helpers. All amounts are integer paise (docs §5.2 "Money"); rates are basis points.
 * Formatting is implemented without Intl so it is identical on Node, browsers and Hermes (Android).
 */

export const PAISE_PER_RUPEE = 100;
export const BP_PER_UNIT = 10_000;

function assertSafeInteger(value: number, name: string): void {
  if (!Number.isSafeInteger(value)) {
    throw new RangeError(`${name} must be a safe integer, got ${value}`);
  }
}

/** Converts rupees (may have up to 2 decimals) to integer paise, rounding half away from zero. */
export function rupeesToPaise(rupees: number): number {
  if (!Number.isFinite(rupees)) throw new RangeError(`rupees must be finite, got ${rupees}`);
  // toFixed(6) removes binary float noise first (1.005 * 100 = 100.49999… → "100.500000").
  const scaled = Number((Math.abs(rupees) * PAISE_PER_RUPEE).toFixed(6));
  const paise = Math.sign(rupees) * Math.round(scaled);
  return paise === 0 ? 0 : paise; // normalise -0
}

/** Groups digits the Indian way: 1234567 → "12,34,567". */
export function groupIndian(digits: string): string {
  if (!/^\d+$/.test(digits)) throw new RangeError(`groupIndian expects digits, got "${digits}"`);
  if (digits.length <= 3) return digits;
  const last3 = digits.slice(-3);
  let rest = digits.slice(0, -3);
  const groups: string[] = [];
  while (rest.length > 2) {
    groups.unshift(rest.slice(-2));
    rest = rest.slice(0, -2);
  }
  if (rest.length > 0) groups.unshift(rest);
  return `${groups.join(',')},${last3}`;
}

export interface FormatPaiseOptions {
  /** Show ".00" paise part. Default: only when non-zero. */
  showPaise?: 'always' | 'auto' | 'never';
  /** Prefix with ₹. Default true. */
  symbol?: boolean;
}

/** Formats paise as Indian rupees: 12345650 → "₹1,23,456.50"; 150000 → "₹1,500". */
export function formatPaise(paise: number, options: FormatPaiseOptions = {}): string {
  assertSafeInteger(paise, 'paise');
  const { showPaise = 'auto', symbol = true } = options;
  const negative = paise < 0;
  const abs = Math.abs(paise);
  const rupees = Math.floor(abs / PAISE_PER_RUPEE);
  const remainder = abs % PAISE_PER_RUPEE;

  let out = groupIndian(String(rupees));
  if (showPaise === 'always' || (showPaise === 'auto' && remainder !== 0)) {
    out += `.${String(remainder).padStart(2, '0')}`;
  }
  if (symbol) out = `₹${out}`;
  return negative ? `-${out}` : out;
}

/** Applies a basis-point rate to an amount in paise, rounding half up to the nearest paisa. */
export function applyBasisPoints(amountPaise: number, bp: number): number {
  assertSafeInteger(amountPaise, 'amountPaise');
  assertSafeInteger(bp, 'bp');
  if (amountPaise < 0 || bp < 0) throw new RangeError('amountPaise and bp must be non-negative');
  return Math.round((amountPaise * bp) / BP_PER_UNIT);
}

/** Percentage (e.g. 25 or 2.5) → basis points (2500 / 250). */
export function percentToBasisPoints(percent: number): number {
  if (!Number.isFinite(percent)) throw new RangeError(`percent must be finite, got ${percent}`);
  return Math.round(percent * 100);
}
