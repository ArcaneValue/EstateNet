import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function backfillVerifiedClaimsToPayments() {
  console.log('Starting backfill of verified claims to payments...');

  try {
    // Find all verified claims that don't have a corresponding payment
    // Using raw query since schema changes might not be applied yet
    const verifiedClaims = await prisma.$queryRaw`
      SELECT 
        pc.*,
        pcv."decidedAt" as "verificationDecidedAt",
        pcv.note as "verificationNote",
        l."propertyId" as "leasePropertyId",
        l."unitId" as "leaseUnitId"
      FROM payment_claims pc
      LEFT JOIN payment_claim_verifications pcv ON pc.id = pcv."claimId"
      LEFT JOIN leases l ON pc."leaseId" = l.id
      WHERE pc.status = 'VERIFIED'
      AND pc.id NOT IN (
        SELECT COALESCE("paymentClaimId", '') 
        FROM payments 
        WHERE "paymentClaimId" IS NOT NULL
      )
    ` as any[];

    console.log(`Found ${verifiedClaims.length} verified claims to backfill`);

    let insertedCount = 0;
    let skippedCount = 0;

    for (const claim of verifiedClaims) {
      try {
        // Check if lease exists
        if (!claim.leasePropertyId || !claim.leaseUnitId) {
          console.log(`Skipping claim ${claim.id}: No lease found`);
          skippedCount++;
          continue;
        }

        // Create payment record using raw query
        await prisma.$executeRaw`
          INSERT INTO payments (
            id, "tenantId", "propertyId", "unitId", "leaseId", 
            amount, status, "paymentDate", "dueDate", 
            "billingPeriod", "paymentMethod", "transactionId",
            "paymentClaimId", "createdAt", "updatedAt"
          )
          VALUES (
            gen_random_uuid(), ${claim.tenantId}, ${claim.leasePropertyId}, ${claim.leaseUnitId}, ${claim.leaseId},
            ${claim.amount}, 'PAID', ${claim.verificationDecidedAt || claim.updatedAt}, ${claim.claimedPaidAt},
            ${new Date(claim.claimedPaidAt).toISOString().slice(0, 7)}, ${claim.method}, ${claim.referenceText},
            ${claim.id}, NOW(), NOW()
          )
        `;

        console.log(`Created payment for claim ${claim.id}`);
        insertedCount++;
      } catch (error) {
        console.error(`Failed to create payment for claim ${claim.id}:`, error);
        skippedCount++;
      }
    }

    console.log(`\nBackfill complete:`);
    console.log(`- Inserted: ${insertedCount} payments`);
    console.log(`- Skipped: ${skippedCount} claims`);

  } catch (error) {
    console.error('Backfill failed:', error);
  } finally {
    await prisma.$disconnect();
  }
}

// Run the backfill
backfillVerifiedClaimsToPayments()
  .then(() => process.exit(0))
  .catch(() => process.exit(1));
