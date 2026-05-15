import { prisma } from '../utils/database';

// Cyclical block-based billing: 10,000 UGX per unit in paid blocks
const BILLING_BLOCK_SIZE = 10;
const PAID_BLOCK_FEE_PER_UNIT = 10000; // UGX

/**
 * Calculate billing fee using cyclical block model
 * - Blocks 1, 3, 5... (odd): PAID (10,000 UGX per unit)
 * - Blocks 2, 4, 6... (even): FREE
 */
function calculateCyclicalBillingFee(occupiedUnitCount: number): number {
  let totalFee = 0;
  let remainingUnits = occupiedUnitCount;
  let blockNumber = 1;
  
  while (remainingUnits > 0) {
    const unitsInBlock = Math.min(remainingUnits, BILLING_BLOCK_SIZE);
    const isPaidBlock = blockNumber % 2 === 1; // Odd blocks are paid
    
    if (isPaidBlock) {
      totalFee += unitsInBlock * PAID_BLOCK_FEE_PER_UNIT;
    }
    
    remainingUnits -= unitsInBlock;
    blockNumber++;
  }
  
  return totalFee;
}

/**
 * Recalculate all unpaid invoices (DUE and OVERDUE) with new cyclical billing formula
 */
async function recalculateUnpaidInvoices() {
  console.log('[RecalculateInvoices] Starting recalculation of unpaid invoices...');
  
  try {
    // Get all unpaid invoices
    const unpaidInvoices = await prisma.invoice.findMany({
      where: {
        status: { in: ['DUE', 'OVERDUE'] }
      },
      include: {
        lines: true
      }
    });
    
    console.log(`[RecalculateInvoices] Found ${unpaidInvoices.length} unpaid invoices to recalculate`);
    
    let updatedCount = 0;
    let skippedCount = 0;
    
    for (const invoice of unpaidInvoices) {
      const occupiedUnitCount = invoice.lines.length;
      const newFeeAmount = calculateCyclicalBillingFee(occupiedUnitCount);
      const oldFeeAmount = invoice.feeAmount;
      
      // Update invoice with new fee amount and occupied unit count
      await prisma.invoice.update({
        where: { id: invoice.id },
        data: {
          occupiedUnitCount,
          feeAmount: newFeeAmount
        }
      });
      
      console.log(`[RecalculateInvoices] Invoice ${invoice.id}: ${occupiedUnitCount} units, ${oldFeeAmount} UGX → ${newFeeAmount} UGX`);
      updatedCount++;
    }
    
    console.log(`[RecalculateInvoices] Recalculation complete:`);
    console.log(`  - Updated: ${updatedCount} invoices`);
    console.log(`  - Skipped: ${skippedCount} invoices`);
    
  } catch (error) {
    console.error('[RecalculateInvoices] Error recalculating invoices:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Run the script
recalculateUnpaidInvoices()
  .then(() => {
    console.log('[RecalculateInvoices] Script completed successfully');
    process.exit(0);
  })
  .catch((error) => {
    console.error('[RecalculateInvoices] Script failed:', error);
    process.exit(1);
  });
