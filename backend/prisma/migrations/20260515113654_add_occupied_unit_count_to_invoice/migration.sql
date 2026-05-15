-- AlterTable
ALTER TABLE "invoices" ADD COLUMN     "occupiedUnitCount" INTEGER,
ALTER COLUMN "feeRateBps" DROP NOT NULL;
