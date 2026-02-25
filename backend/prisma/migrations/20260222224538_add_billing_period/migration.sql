/*
  Warnings:

  - Added the required column `billingPeriod` to the `payments` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "payments" ADD COLUMN     "billingPeriod" TEXT NOT NULL;

-- CreateIndex
CREATE INDEX "payments_billingPeriod_tenantId_idx" ON "payments"("billingPeriod", "tenantId");

-- CreateIndex
CREATE INDEX "payments_billingPeriod_propertyId_idx" ON "payments"("billingPeriod", "propertyId");
