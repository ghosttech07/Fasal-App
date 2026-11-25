import { INDIA_STATES, districtCode, findDistrict , isPlaceEntry, placeKeys } from '../geo/india';

describe('India states and districts', () => {
  it('has every state and union territory, with current district names', () => {
    expect(INDIA_STATES).toHaveLength(36);
    expect(INDIA_STATES.reduce((n, s) => n + s.districts.length, 0)).toBeGreaterThanOrEqual(780);
    const mh = INDIA_STATES.find((s) => s.code === 'MH')!;
    expect(mh.districts).toEqual(expect.arrayContaining(['Latur', 'Beed', 'Dharashiv', 'Nanded', 'Chhatrapati Sambhajinagar']));
  });

  it('builds codes that round-trip and stay unique across states', () => {
    expect(districtCode('MH', 'Latur')).toBe('MH-LATUR');
    expect(findDistrict('MH-DHARASHIV')).toMatchObject({ district: 'Dharashiv', state: { code: 'MH' } });
    expect(findDistrict('MH-NOT_A_PLACE')).toBeNull();
    const all = INDIA_STATES.flatMap((s) => s.districts.map((d) => districtCode(s.code, d)));
    expect(new Set(all).size).toBe(all.length);
    for (const code of all) expect(findDistrict(code)).not.toBeNull();
  });
});

describe('cover eligibility by place', () => {
  it('accepts all-India, whole-state and district entries only', () => {
    expect(isPlaceEntry('*')).toBe(true);
    expect(isPlaceEntry('MH-*')).toBe(true);
    expect(isPlaceEntry('MH-LATUR')).toBe(true);
    expect(isPlaceEntry('XX-*')).toBe(false);
    expect(isPlaceEntry('MH-NOWHERE')).toBe(false);
  });
  it('a district matches itself, its state and all of India', () => {
    expect(placeKeys('TN-MADURAI')).toEqual(['TN-MADURAI', 'TN-*', '*']);
    expect(placeKeys(null)).toEqual(['*']);
  });
});
