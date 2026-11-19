import { priceOf } from '../rules/pricing';

const dryspell = { sumInsuredPaise: 750_000, premiumRateBp: 500, subsidyBp: 4000 }; // ₹7,500/acre, 5% premium, 40% sponsor

describe('per-acre pricing', () => {
  it('2 acres: ₹15,000 cover, ₹750 premium, sponsor ₹300, farmer ₹450', () => {
    expect(priceOf(dryspell, 2)).toMatchObject({ sumInsuredPaise: 1_500_000, premiumPaise: 75_000, subsidyPaise: 30_000, netPaise: 45_000 });
  });
  it('scales with the field and rounds to whole rupees', () => {
    expect(priceOf(dryspell, 4).sumInsuredPaise).toBe(3_000_000);
    expect(priceOf({ ...dryspell, sumInsuredPaise: 333_333 }, 1.5).sumInsuredPaise % 100).toBe(0);
  });
});
