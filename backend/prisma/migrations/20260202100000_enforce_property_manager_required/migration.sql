-- First, backfill any null managerId values to a default manager (if any exist)
-- This ensures the NOT NULL constraint can be applied

-- Update properties with null managerId to use the first MANAGER user
UPDATE "properties" 
SET "managerId" = (
    SELECT "id" FROM "users" WHERE "role" = 'MANAGER' ORDER BY "createdAt" ASC LIMIT 1
)
WHERE "managerId" IS NULL;

-- Now alter the column to NOT NULL
ALTER TABLE "properties" ALTER COLUMN "managerId" SET NOT NULL;
