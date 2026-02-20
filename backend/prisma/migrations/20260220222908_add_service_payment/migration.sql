/*
  Warnings:

  - You are about to drop the column `feeAmount` on the `payments` table. All the data in the column will be lost.
  - You are about to drop the column `flwTransactionId` on the `payments` table. All the data in the column will be lost.
  - You are about to drop the column `netAmount` on the `payments` table. All the data in the column will be lost.
  - You are about to drop the column `payoutRef` on the `payments` table. All the data in the column will be lost.
  - You are about to drop the column `payoutStatus` on the `payments` table. All the data in the column will be lost.
  - You are about to drop the column `provider` on the `payments` table. All the data in the column will be lost.
  - You are about to drop the column `txRef` on the `payments` table. All the data in the column will be lost.

*/
-- DropIndex
DROP INDEX "payments_txRef_key";

-- AlterTable
ALTER TABLE "payments" DROP COLUMN "feeAmount",
DROP COLUMN "flwTransactionId",
DROP COLUMN "netAmount",
DROP COLUMN "payoutRef",
DROP COLUMN "payoutStatus",
DROP COLUMN "provider",
DROP COLUMN "txRef";

-- AlterTable
ALTER TABLE "users" ADD COLUMN     "billingGraceUntil" TIMESTAMP(3),
ADD COLUMN     "billingStatus" TEXT,
ADD COLUMN     "managerTermsAcceptedAt" TIMESTAMP(3);

-- CreateTable
CREATE TABLE "invoices" (
    "id" TEXT NOT NULL,
    "managerId" TEXT NOT NULL,
    "periodStart" TIMESTAMP(3) NOT NULL,
    "periodEnd" TIMESTAMP(3) NOT NULL,
    "subtotalAmount" INTEGER NOT NULL,
    "feeRateBps" INTEGER NOT NULL,
    "feeAmount" INTEGER NOT NULL,
    "status" TEXT NOT NULL,
    "dueDate" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "invoices_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "invoice_lines" (
    "id" TEXT NOT NULL,
    "invoiceId" TEXT NOT NULL,
    "propertyId" TEXT NOT NULL,
    "unitId" TEXT NOT NULL,
    "rentAmount" INTEGER NOT NULL,
    "tenantId" TEXT,
    "leaseId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "invoice_lines_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "service_payments" (
    "id" TEXT NOT NULL,
    "invoiceId" TEXT NOT NULL,
    "managerId" TEXT NOT NULL,
    "amount" INTEGER NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'UGX',
    "provider" TEXT NOT NULL,
    "network" TEXT NOT NULL,
    "phoneNumber" TEXT NOT NULL,
    "externalRef" TEXT NOT NULL,
    "providerRequestId" TEXT,
    "providerTxId" TEXT,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "failureReason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "service_payments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "job_locks" (
    "id" TEXT NOT NULL,
    "jobName" TEXT NOT NULL,
    "lockedUntil" TIMESTAMP(3) NOT NULL,
    "lockedBy" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "job_locks_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "invoices_managerId_periodStart_periodEnd_key" ON "invoices"("managerId", "periodStart", "periodEnd");

-- CreateIndex
CREATE UNIQUE INDEX "service_payments_externalRef_key" ON "service_payments"("externalRef");

-- CreateIndex
CREATE UNIQUE INDEX "job_locks_jobName_key" ON "job_locks"("jobName");

-- AddForeignKey
ALTER TABLE "invoices" ADD CONSTRAINT "invoices_managerId_fkey" FOREIGN KEY ("managerId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "invoice_lines" ADD CONSTRAINT "invoice_lines_invoiceId_fkey" FOREIGN KEY ("invoiceId") REFERENCES "invoices"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "invoice_lines" ADD CONSTRAINT "invoice_lines_propertyId_fkey" FOREIGN KEY ("propertyId") REFERENCES "properties"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "invoice_lines" ADD CONSTRAINT "invoice_lines_unitId_fkey" FOREIGN KEY ("unitId") REFERENCES "units"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "invoice_lines" ADD CONSTRAINT "invoice_lines_leaseId_fkey" FOREIGN KEY ("leaseId") REFERENCES "leases"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "service_payments" ADD CONSTRAINT "service_payments_invoiceId_fkey" FOREIGN KEY ("invoiceId") REFERENCES "invoices"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "service_payments" ADD CONSTRAINT "service_payments_managerId_fkey" FOREIGN KEY ("managerId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
