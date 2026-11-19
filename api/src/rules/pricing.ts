import { applyBasisPoints } from '@fasalshield/shared';

/** Cover scales with the field: per-acre cover × acres, rounded to whole rupees. */
export function priceOf(version: { sumInsuredPaise: number; premiumRateBp: number; subsidyBp: number }, areaAcres: number) {
  const sumInsuredPaise = Math.round((version.sumInsuredPaise * areaAcres) / 100) * 100;
  const premiumPaise = applyBasisPoints(sumInsuredPaise, version.premiumRateBp);
  const subsidyPaise = applyBasisPoints(premiumPaise, version.subsidyBp);
  return { sumInsuredPaise, premiumPaise, subsidyPaise, netPaise: premiumPaise - subsidyPaise, perAcrePaise: version.sumInsuredPaise };
}

