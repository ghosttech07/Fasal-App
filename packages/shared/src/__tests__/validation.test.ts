import {
  indiaLatLngSchema,
  languageCodeSchema,
  maskPhone,
  maskVpa,
  normalizeIndianPhone,
  otpSchema,
  paginationQuerySchema,
  phoneE164IndiaSchema,
  vpaSchema,
} from '../validation/common';

describe('normalizeIndianPhone', () => {
  it.each([
    ['9876543210', '+919876543210'],
    ['09876543210', '+919876543210'],
    ['+919876543210', '+919876543210'],
    ['919876543210', '+919876543210'],
    ['+91 98765 43210', '+919876543210'],
    ['91 98765-43210', '+919876543210'],
  ])('%s → %s', (input, expected) => {
    expect(normalizeIndianPhone(input)).toBe(expected);
  });

  it.each(['5876543210', '987654321', '+14155552671', 'abcdefghij', ''])('rejects %s', (input) => {
    expect(normalizeIndianPhone(input)).toBeNull();
  });
});

describe('phoneE164IndiaSchema', () => {
  it('normalises valid input', () => {
    expect(phoneE164IndiaSchema.parse(' 98765 43210 ')).toBe('+919876543210');
  });

  it('fails with invalid_phone', () => {
    const result = phoneE164IndiaSchema.safeParse('12345');
    expect(result.success).toBe(false);
    expect(result.error?.issues[0]?.message).toBe('invalid_phone');
  });
});

describe('otpSchema', () => {
  it('accepts 6 digits only', () => {
    expect(otpSchema.safeParse('123456').success).toBe(true);
    expect(otpSchema.safeParse('12345').success).toBe(false);
    expect(otpSchema.safeParse('12345a').success).toBe(false);
  });
});

describe('vpaSchema / maskVpa', () => {
  it('accepts and lowercases valid VPAs', () => {
    expect(vpaSchema.parse(' Savita.Patil@OkAxis ')).toBe('savita.patil@okaxis');
    expect(vpaSchema.safeParse('9876543210@ybl').success).toBe(true);
  });

  it.each(['savita', '@okaxis', 'a@b', 'sa vita@okaxis', 'savita@1bank'])('rejects %s', (v) => {
    expect(vpaSchema.safeParse(v).success).toBe(false);
  });

  it('masks handle keeping PSP', () => {
    expect(maskVpa('savita.patil@okaxis')).toBe('sa**********@okaxis');
    expect(maskVpa('ab@ybl')).toBe('ab****@ybl');
    expect(maskVpa('nope')).toBe('****');
  });
});

describe('maskPhone', () => {
  it('keeps country code and last 4', () => {
    expect(maskPhone('+919876543210')).toBe('+91******3210');
    expect(maskPhone('123')).toBe('****');
  });
});

describe('other schemas', () => {
  it('languageCodeSchema accepts the 13 offered languages only', () => {
    expect(languageCodeSchema.safeParse('mr').success).toBe(true);
    expect(languageCodeSchema.safeParse('te').success).toBe(true);
    expect(languageCodeSchema.safeParse('ur').success).toBe(true);
    expect(languageCodeSchema.safeParse('ks').success).toBe(false);
    expect(languageCodeSchema.safeParse('fr').success).toBe(false);
  });

  it('indiaLatLngSchema rejects coordinates outside India', () => {
    expect(indiaLatLngSchema.safeParse({ lat: 18.4, lng: 76.56 }).success).toBe(true); // Latur
    expect(indiaLatLngSchema.safeParse({ lat: 51.5, lng: -0.12 }).success).toBe(false); // London
  });

  it('paginationQuerySchema coerces and defaults limit', () => {
    expect(paginationQuerySchema.parse({})).toEqual({ limit: 20 });
    expect(paginationQuerySchema.parse({ limit: '50', cursor: 'abc' })).toEqual({
      limit: 50,
      cursor: 'abc',
    });
    expect(paginationQuerySchema.safeParse({ limit: '500' }).success).toBe(false);
  });
});
