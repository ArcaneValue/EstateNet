import { prisma } from '../utils/database';

interface DuplicateGroup {
  managerId: string;
  periodStart: Date;
  periodEnd: Date;
  keep_id: string;
  all_ids: string[];
}

/**
 * Detect duplicate invoices in the database
 * Returns groups of invoices with same (managerId, periodStart, periodEnd)
 */
export const detectDuplicateInvoices = async (): Promise<any[]> => {
  const query = `
    SELECT 
      "managerId",
      "periodStart",
      "periodEnd",
      COUNT(*) as duplicate_count,
      STRING_AGG(id, ', ' ORDER BY "createdAt") as duplicate_ids,
      STRING_AGG("createdAt"::text, ', ' ORDER BY "createdAt") as created_times,
      MIN("createdAt") as earliest_created
    FROM invoices 
    GROUP BY "managerId", "periodStart", "periodEnd"
    HAVING COUNT(*) > 1
    ORDER BY "managerId", "periodStart";
  `;

  try {
    const duplicates = await prisma.$queryRawUnsafe(query) as any[];
    console.log(`[DuplicateDetection] Found ${duplicates.length} duplicate groups`);
    return duplicates;
  } catch (error) {
    console.error('[DuplicateDetection] Error detecting duplicates:', error);
    throw error;
  }
};

/**
 * Clean up duplicate invoices by keeping the earliest created one
 * Safe: only deletes duplicates, never unique rows
 */
export const cleanupDuplicateInvoices = async (): Promise<{ deletedCount: number }> => {
  console.log('[DuplicateCleanup] Starting duplicate invoice cleanup...');

  try {
    // Get duplicates with earliest ID to keep
    const duplicatesQuery = `
      SELECT 
        "managerId",
        "periodStart",
        "periodEnd",
        MIN(id) as keep_id,
        ARRAY_AGG(id ORDER BY "createdAt") as all_ids
      FROM invoices 
      GROUP BY "managerId", "periodStart", "periodEnd"
      HAVING COUNT(*) > 1
    `;

    const duplicateGroups = await prisma.$queryRawUnsafe(duplicatesQuery) as DuplicateGroup[];

    let totalDeleted = 0;

    for (const group of duplicateGroups) {
      const { keep_id, all_ids } = group;
      const idsToDelete = all_ids.filter((id: string) => id !== keep_id);

      if (idsToDelete.length > 0) {
        // Delete duplicates (keep the earliest created)
        const deleteQuery = `
          DELETE FROM invoices 
          WHERE id = ANY(${idsToDelete.map((id: string) => `'${id}'`).join(',')})
          AND id != '${keep_id}'
        `;

        await prisma.$executeRawUnsafe(deleteQuery);
        totalDeleted += idsToDelete.length;

        console.log(`[DuplicateCleanup] Deleted ${idsToDelete.length} duplicates for manager ${group.managerId}, period ${group.periodStart} to ${group.periodEnd}`);
      }
    }

    console.log(`[DuplicateCleanup] Cleanup complete. Deleted ${totalDeleted} duplicate invoices`);
    return { deletedCount: totalDeleted };

  } catch (error) {
    console.error('[DuplicateCleanup] Error during cleanup:', error);
    throw error;
  }
};
