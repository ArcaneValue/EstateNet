-- AlterTable
ALTER TABLE "users" ADD COLUMN     "legalAcceptances" JSONB DEFAULT '{}',
ADD COLUMN     "pushToken" TEXT;
