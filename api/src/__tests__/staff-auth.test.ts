import {
  base32Decode,
  base32Encode,
  hashPassword,
  newTotpSecret,
  totpAt,
  verifyPassword,
  verifyTotp,
  TOTP_PERIOD,
} from '../lib/staff-auth';

describe('staff passwords', () => {
  it('accepts the right password and rejects others', () => {
    const h = hashPassword('correct horse battery');
    expect(h.startsWith('scrypt$')).toBe(true);
    expect(verifyPassword('correct horse battery', h)).toBe(true);
    expect(verifyPassword('correct horse batterY', h)).toBe(false);
  });
  it('never matches a missing hash', () => {
    expect(verifyPassword('anything at all', null)).toBe(false);
  });
  it('salts every hash', () => {
    expect(hashPassword('same password here')).not.toBe(hashPassword('same password here'));
  });
});

describe('TOTP (RFC 6238)', () => {
  // RFC 6238 Appendix B test secret "12345678901234567890" (SHA1), 8-digit vectors truncated to 6.
  const rfcSecret = base32Encode(Buffer.from('12345678901234567890'));
  it('matches the RFC test vectors', () => {
    expect(totpAt(rfcSecret, Math.floor(59 / TOTP_PERIOD))).toBe('287082');
    expect(totpAt(rfcSecret, Math.floor(1111111109 / TOTP_PERIOD))).toBe('081804');
    expect(totpAt(rfcSecret, Math.floor(1234567890 / TOTP_PERIOD))).toBe('005924');
  });
  it('round-trips base32', () => {
    const buf = Buffer.from('fasalshield-secret!');
    expect(base32Decode(base32Encode(buf)).equals(buf)).toBe(true);
  });
  it('accepts the current code and one step of drift, not two', () => {
    const s = newTotpSecret();
    const now = 1_800_000_000_000;
    const step = Math.floor(now / 1000 / TOTP_PERIOD);
    expect(verifyTotp(s, totpAt(s, step), now)).toBe(step);
    expect(verifyTotp(s, totpAt(s, step - 1), now)).toBe(step - 1);
    expect(verifyTotp(s, totpAt(s, step - 2), now)).toBeNull();
    expect(verifyTotp(s, '12345', now)).toBeNull();
  });
});
