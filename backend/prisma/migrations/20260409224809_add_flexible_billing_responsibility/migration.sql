/*
  Warnings:

  - You are about to drop the column `managerId` on the `invoices` table. All the data in the column will be lost.
  - You are about to drop the column `billingResponsibility` on the `properties` table. All the data in the column will be lost.
  - A unique constraint covering the columns `[billedUserId,periodStart,periodEnd]` on the table `invoices` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `billedUserId` to the `invoices` table without a default value. This is not possible if the table is not empty.
  - Added the required column `billedUserId` to the `properties` table without a default value. This is not possible if the table is not empty.

*/

-- Step 1: Add billedUserId columns as nullable first
ALTER TABLE "properties" ADD COLUMN "billedUserId" TEXT;
ALTER TABLE "invoices" ADD COLUMN "billedUserId" TEXT;

-- Step 2: Migrate existing data for properties
-- If managerId exists, use it; otherwise use ownerId
UPDATE "properties" 
SET "billedUserId" = COALESCE("managerId", "ownerId");

-- Step 3: Migrate existing data for invoices
-- Copy managerId to billedUserId
UPDATE "invoices" 
SET "billedUserId" = "managerId";

-- Step 4: Make billedUserId required
ALTER TABLE "properties" ALTER COLUMN "billedUserId" SET NOT NULL;
ALTER TABLE "invoices" ALTER COLUMN "billedUserId" SET NOT NULL;

-- Step 5: Add billingTermsAcceptedAt to users
ALTER TABLE "users" ADD COLUMN "billingTermsAcceptedAt" TIMESTAMP(3);

-- Step 6: Drop old constraints and columns
ALTER TABLE "invoices" DROP CONSTRAINT "invoices_managerId_fkey";
DROP INDEX "invoices_managerId_periodStart_periodEnd_key";
ALTER TABLE "invoices" DROP COLUMN "managerId";
ALTER TABLE "properties" DROP COLUMN "billingResponsibility";

-- Step 7: Create new unique constraint
CREATE UNIQUE INDEX "invoices_billedUserId_periodStart_periodEnd_key" ON "invoices"("billedUserId", "periodStart", "periodEnd");

-- Step 8: Add foreign keys
ALTER TABLE "properties" ADD CONSTRAINT "properties_billedUserId_fkey" FOREIGN KEY ("billedUserId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "invoices" ADD CONSTRAINT "invoices_billedUserId_fkey" FOREIGN KEY ("billedUserId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
