/*
  Warnings:

  - The `billingStatus` column on the `users` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - A unique constraint covering the columns `[paymentClaimId]` on the table `payments` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateEnum
CREATE TYPE "PaymentClaimStatus" AS ENUM ('PENDING', 'VERIFIED', 'REJECTED');

-- CreateEnum
CREATE TYPE "PaymentClaimDecision" AS ENUM ('VERIFIED', 'REJECTED');

-- CreateEnum
CREATE TYPE "BillingStatus" AS ENUM ('CURRENT', 'OVERDUE', 'RESTRICTED', 'SUSPENDED');

-- DropIndex
DROP INDEX "payments_billingPeriod_propertyId_idx";

-- AlterTable
ALTER TABLE "payments" ADD COLUMN     "leaseId" TEXT,
ADD COLUMN     "paymentClaimId" TEXT;

-- AlterTable
ALTER TABLE "users" ADD COLUMN     "createdByOwnerId" TEXT,
DROP COLUMN "billingStatus",
ADD COLUMN     "billingStatus" "BillingStatus" DEFAULT 'CURRENT';

-- CreateTable
CREATE TABLE "payment_claims" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "leaseId" TEXT NOT NULL,
    "managerId" TEXT NOT NULL,
    "amount" INTEGER NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'UGX',
    "claimedPaidAt" TIMESTAMP(3) NOT NULL,
    "billingPeriod" TEXT NOT NULL,
    "method" TEXT NOT NULL,
    "referenceText" TEXT,
    "status" "PaymentClaimStatus" NOT NULL DEFAULT 'PENDING',
    "flagged" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "payment_claims_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "payment_claim_verifications" (
    "id" TEXT NOT NULL,
    "claimId" TEXT NOT NULL,
    "managerId" TEXT NOT NULL,
    "decision" "PaymentClaimDecision" NOT NULL,
    "note" TEXT,
    "decidedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "payment_claim_verifications_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "audit_logs" (
    "id" TEXT NOT NULL,
    "entityType" TEXT NOT NULL,
    "entityId" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "performedByUserId" TEXT NOT NULL,
    "previousState" JSONB,
    "newState" JSONB NOT NULL,
    "metadata" JSONB,
    "ipAddress" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "audit_logs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "payment_claims_managerId_status_idx" ON "payment_claims"("managerId", "status");

-- CreateIndex
CREATE INDEX "payment_claims_tenantId_status_idx" ON "payment_claims"("tenantId", "status");

-- CreateIndex
CREATE INDEX "payment_claims_tenantId_createdAt_idx" ON "payment_claims"("tenantId", "createdAt");

-- CreateIndex
CREATE INDEX "payment_claims_leaseId_billingPeriod_status_idx" ON "payment_claims"("leaseId", "billingPeriod", "status");

-- CreateIndex
CREATE UNIQUE INDEX "payment_claim_verifications_claimId_key" ON "payment_claim_verifications"("claimId");

-- CreateIndex
CREATE INDEX "audit_logs_entityId_entityType_createdAt_idx" ON "audit_logs"("entityId", "entityType", "createdAt");

-- CreateIndex
CREATE INDEX "audit_logs_performedByUserId_createdAt_idx" ON "audit_logs"("performedByUserId", "createdAt");

-- CreateIndex
CREATE INDEX "payments_propertyId_status_idx" ON "payments"("propertyId", "status");

-- CreateIndex
CREATE INDEX "payments_status_paymentDate_idx" ON "payments"("status", "paymentDate");

-- CreateIndex
CREATE INDEX "payments_leaseId_idx" ON "payments"("leaseId");

-- CreateIndex
CREATE UNIQUE INDEX "payments_paymentClaimId_key" ON "payments"("paymentClaimId");

-- AddForeignKey
ALTER TABLE "users" ADD CONSTRAINT "users_createdByOwnerId_fkey" FOREIGN KEY ("createdByOwnerId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payments" ADD CONSTRAINT "payments_leaseId_fkey" FOREIGN KEY ("leaseId") REFERENCES "leases"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payment_claims" ADD CONSTRAINT "payment_claims_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenant_identities"("tenantId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payment_claims" ADD CONSTRAINT "payment_claims_leaseId_fkey" FOREIGN KEY ("leaseId") REFERENCES "leases"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payment_claims" ADD CONSTRAINT "payment_claims_managerId_fkey" FOREIGN KEY ("managerId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payment_claim_verifications" ADD CONSTRAINT "payment_claim_verifications_claimId_fkey" FOREIGN KEY ("claimId") REFERENCES "payment_claims"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payment_claim_verifications" ADD CONSTRAINT "payment_claim_verifications_managerId_fkey" FOREIGN KEY ("managerId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_performedByUserId_fkey" FOREIGN KEY ("performedByUserId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
