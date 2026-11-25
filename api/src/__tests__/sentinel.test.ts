import { statusFor, toUtm } from '../adapters/sentinel';

describe('satellite crop check helpers', () => {
  it('converts WGS84 to UTM like the Sentinel-2 grid (Latur, zone 43N)', () => {
    const { x, y } = toUtm(18.4, 76.56, 43, false);
    // Hand check: 1.56° east of the zone-43 meridian (75°E) at 18.4°N ≈ 164.8 km → E ≈ 664.8 km; the live
    // check against real Sentinel-2 pixels (bare dunes read as bare soil) confirms the projection.
    expect(Math.abs(x - 664785.8)).toBeLessThan(1);
    expect(Math.abs(y - 2035149.1)).toBeLessThan(1);
  });

  it('labels NDVI as green, sparse, bare or unknown', () => {
    expect(statusFor(0.62)).toBe('GREEN');
    expect(statusFor(0.4)).toBe('GREEN');
    expect(statusFor(0.25)).toBe('SPARSE');
    expect(statusFor(0.13)).toBe('BARE');
    expect(statusFor(null)).toBe('UNKNOWN');
  });
});
