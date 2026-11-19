-- AlterTable
ALTER TABLE "Farmer" ADD COLUMN     "stateCode" TEXT;

-- Existing Marathwada data moves to state-qualified district codes (district names repeat across states).
UPDATE "Farmer" SET "stateCode" = 'MH', "districtCode" = 'MH-' || "districtCode"
  WHERE "districtCode" IN ('LATUR', 'BEED', 'DHARASHIV', 'NANDED');
UPDATE "GridCell" SET "districtCode" = 'MH-' || "districtCode"
  WHERE "districtCode" IN ('LATUR', 'BEED', 'DHARASHIV', 'NANDED');
UPDATE "ProductVersion" SET "eligibleDistricts" = ARRAY(SELECT 'MH-' || d FROM unnest("eligibleDistricts") AS d)
  WHERE "eligibleDistricts" && ARRAY['LATUR', 'BEED', 'DHARASHIV', 'NANDED'];
