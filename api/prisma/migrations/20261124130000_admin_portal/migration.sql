-- Admin portal: maker-checker payout batches and four-eyes product versions.
CREATE TABLE "PayoutBatch" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'SUBMITTED',
    "count" INTEGER NOT NULL,
    "totalPaise" INTEGER NOT NULL,
    "submittedById" TEXT NOT NULL,
    "submittedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "approvedById" TEXT,
    "approvedAt" TIMESTAMP(3),
    "note" TEXT,
    CONSTRAINT "PayoutBatch_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "PayoutBatch_code_key" ON "PayoutBatch"("code");

ALTER TABLE "Payout" ADD COLUMN "failureReason" TEXT;
ALTER TABLE "Payout" ADD COLUMN "batchId" TEXT;
ALTER TABLE "Payout" ADD CONSTRAINT "Payout_batchId_fkey" FOREIGN KEY ("batchId") REFERENCES "PayoutBatch"("id") ON DELETE SET NULL ON UPDATE CASCADE;
CREATE INDEX "Payout_status_idx" ON "Payout"("status");

ALTER TABLE "ProductVersion" ADD COLUMN "submittedById" TEXT;
ALTER TABLE "ProductVersion" ADD COLUMN "approvedById" TEXT;
ALTER TABLE "ProductVersion" ADD COLUMN "reviewNote" TEXT;
ALTER TABLE "ProductVersion" ADD COLUMN "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;
