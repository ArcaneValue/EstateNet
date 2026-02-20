/*
  Warnings:

  - A unique constraint covering the columns `[txRef]` on the table `payments` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "PaymentStatus" ADD VALUE 'SUCCESS';
ALTER TYPE "PaymentStatus" ADD VALUE 'FAILED';

-- AlterTable
ALTER TABLE "payments" ADD COLUMN     "feeAmount" INTEGER,
ADD COLUMN     "flwTransactionId" TEXT,
ADD COLUMN     "netAmount" INTEGER,
ADD COLUMN     "payoutRef" TEXT,
ADD COLUMN     "payoutStatus" TEXT,
ADD COLUMN     "provider" TEXT,
ADD COLUMN     "txRef" TEXT;

-- AlterTable
ALTER TABLE "users" ADD COLUMN     "payoutNetwork" TEXT,
ADD COLUMN     "payoutPhoneNumber" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "payments_txRef_key" ON "payments"("txRef");
