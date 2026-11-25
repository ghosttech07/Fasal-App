-- AlterTable
ALTER TABLE "Plot" ADD COLUMN     "cropNdvi" DOUBLE PRECISION,
ADD COLUMN     "cropSceneAt" TIMESTAMP(3),
ADD COLUMN     "cropStatus" TEXT;
