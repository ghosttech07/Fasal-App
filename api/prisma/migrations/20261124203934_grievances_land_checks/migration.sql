-- AlterTable
ALTER TABLE "Plot" ADD COLUMN     "checkNote" TEXT,
ADD COLUMN     "checkedAt" TIMESTAMP(3),
ADD COLUMN     "checkedById" TEXT,
ADD COLUMN     "surveyNo" TEXT;

-- CreateTable
CREATE TABLE "Grievance" (
    "id" TEXT NOT NULL,
    "ticketNo" TEXT NOT NULL,
    "farmerId" TEXT NOT NULL,
    "policyId" TEXT,
    "category" TEXT NOT NULL,
    "messageEnc" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'OPEN',
    "response" TEXT,
    "dueAt" TIMESTAMP(3) NOT NULL,
    "handledById" TEXT,
    "resolvedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Grievance_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Grievance_ticketNo_key" ON "Grievance"("ticketNo");

-- CreateIndex
CREATE INDEX "Grievance_status_dueAt_idx" ON "Grievance"("status", "dueAt");

-- CreateIndex
CREATE INDEX "Grievance_farmerId_createdAt_idx" ON "Grievance"("farmerId", "createdAt");

-- CreateIndex
CREATE INDEX "Plot_verificationStatus_idx" ON "Plot"("verificationStatus");

-- CreateIndex
CREATE INDEX "Plot_gridCellId_surveyNo_idx" ON "Plot"("gridCellId", "surveyNo");

-- AddForeignKey
ALTER TABLE "Grievance" ADD CONSTRAINT "Grievance_farmerId_fkey" FOREIGN KEY ("farmerId") REFERENCES "Farmer"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
