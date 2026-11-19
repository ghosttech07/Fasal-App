import {
  applyBasisPoints,
  formatPaise,
  groupIndian,
  percentToBasisPoints,
  rupeesToPaise,
} from '../money';

describe('groupIndian', () => {
  it.each([
    ['0', '0'],
    ['999', '999'],
    ['1000', '1,000'],
    ['15000', '15,000'],
    ['123456', '1,23,456'],
    ['1234567', '12,34,567'],
    ['123456789', '12,34,56,789'],
  ])('%s → %s', (input, expected) => {
    expect(groupIndian(input)).toBe(expected);
  });

  it('rejects non-digits', () => {
    expect(() => groupIndian('12a')).toThrow(RangeError);
  });
});

describe('formatPaise', () => {
  it('formats the docs example payout (₹1,500)', () => {
    expect(formatPaise(150_000)).toBe('₹1,500');
  });

  it('formats lakhs with paise when non-zero', () => {
    expect(formatPaise(12_345_650)).toBe('₹1,23,456.50');
  });

  it('supports showPaise always/never and no symbol', () => {
    expect(formatPaise(150_000, { showPaise: 'always' })).toBe('₹1,500.00');
    expect(formatPaise(150_099, { showPaise: 'never' })).toBe('₹1,500');
    expect(formatPaise(5, { symbol: false, showPaise: 'always' })).toBe('0.05');
  });

  it('formats negatives and zero', () => {
    expect(formatPaise(-75_000)).toBe('-₹750');
    expect(formatPaise(0)).toBe('₹0');
  });

  it('rejects non-integers', () => {
    expect(() => formatPaise(10.5)).toThrow(RangeError);
  });
});

describe('rupeesToPaise', () => {
  it('converts and rounds half away from zero', () => {
    expect(rupeesToPaise(750)).toBe(75_000);
    expect(rupeesToPaise(1.005)).toBe(101); // 1.005 * 100 = 100.4999… in binary floats
    expect(rupeesToPaise(0.1 + 0.2)).toBe(30);
    expect(rupeesToPaise(-2.5)).toBe(-250);
    expect(Object.is(rupeesToPaise(-0), 0)).toBe(true);
  });

  it('rejects non-finite input', () => {
    expect(() => rupeesToPaise(Number.NaN)).toThrow(RangeError);
  });
});

describe('basis points', () => {
  it('computes the docs example: 25% of phase weight 40% of ₹15,000 = ₹1,500', () => {
    const si = rupeesToPaise(15_000);
    const phase = applyBasisPoints(si, percentToBasisPoints(40));
    expect(applyBasisPoints(phase, percentToBasisPoints(25))).toBe(150_000);
  });

  it('computes a 5% premium', () => {
    expect(applyBasisPoints(1_500_000, 500)).toBe(75_000);
  });

  it('rejects negatives and non-integers', () => {
    expect(() => applyBasisPoints(-1, 100)).toThrow(RangeError);
    expect(() => applyBasisPoints(100, 1.5)).toThrow(RangeError);
    expect(() => percentToBasisPoints(Infinity)).toThrow(RangeError);
  });
});
