/*
  Warnings:

  - You are about to drop the column `isOccupied` on the `units` table. All the data in the column will be lost.

*/
-- AlterEnum
ALTER TYPE "InvitationStatus" ADD VALUE 'CANCELLED';

-- AlterTable
ALTER TABLE "units" DROP COLUMN "isOccupied";
