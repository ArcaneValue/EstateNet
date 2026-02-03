/*
  Warnings:

  - Added the required column `ownerId` to the `properties` table without a default value. This is not possible if the table is not empty.

*/
-- AlterEnum
ALTER TYPE "UserRole" ADD VALUE 'OWNER';

-- DropForeignKey
ALTER TABLE "properties" DROP CONSTRAINT IF EXISTS "properties_managerId_fkey";

-- AlterTable - Add ownerId as nullable first
ALTER TABLE "properties" ADD COLUMN "ownerId" TEXT;

-- Update existing properties to set a default owner (first MANAGER user or create placeholder)
-- This handles the 11 existing rows
UPDATE "properties" SET "ownerId" = (SELECT "id" FROM "users" WHERE "role" = 'MANAGER' LIMIT 1) WHERE "ownerId" IS NULL;

-- If no manager exists, we'll leave it nullable for now and the application must handle this
-- Make ownerId NOT NULL after data migration
ALTER TABLE "properties" ALTER COLUMN "ownerId" SET NOT NULL;

-- AlterTable - managerId becomes nullable
ALTER TABLE "properties" ALTER COLUMN "managerId" DROP NOT NULL;

-- CreateTable
CREATE TABLE "owner_manager_invitations" (
    "id" TEXT NOT NULL,
    "propertyId" TEXT NOT NULL,
    "ownerId" TEXT NOT NULL,
    "managerEmail" TEXT NOT NULL,
    "managerId" TEXT,
    "status" "InvitationStatus" NOT NULL DEFAULT 'PENDING',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "respondedAt" TIMESTAMP(3),

    CONSTRAINT "owner_manager_invitations_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "properties" ADD CONSTRAINT "properties_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "properties" ADD CONSTRAINT "properties_managerId_fkey" FOREIGN KEY ("managerId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "owner_manager_invitations" ADD CONSTRAINT "owner_manager_invitations_propertyId_fkey" FOREIGN KEY ("propertyId") REFERENCES "properties"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "owner_manager_invitations" ADD CONSTRAINT "owner_manager_invitations_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "owner_manager_invitations" ADD CONSTRAINT "owner_manager_invitations_managerId_fkey" FOREIGN KEY ("managerId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
