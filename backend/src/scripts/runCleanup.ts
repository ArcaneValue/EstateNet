#!/usr/bin/env node

import { cleanupDuplicateInvoices, detectDuplicateInvoices } from './cleanupDuplicateInvoices';

async function main() {
  console.log('=== Invoice Duplicate Cleanup ===');
  
  try {
    // Step 1: Detect duplicates
    console.log('\n1. Detecting duplicate invoices...');
    const duplicates = await detectDuplicateInvoices();
    
    if (duplicates.length === 0) {
      console.log('✅ No duplicate invoices found');
      return;
    }
    
    console.log(`📊 Found ${duplicates.length} duplicate groups:`);
    console.table(duplicates);
    
    // Step 2: Clean up duplicates
    console.log('\n2. Cleaning up duplicates...');
    const result = await cleanupDuplicateInvoices();
    
    console.log(`\n✅ Cleanup complete! Deleted ${result.deletedCount} duplicate invoices`);
    
    // Step 3: Verify cleanup
    console.log('\n3. Verifying cleanup...');
    const remainingDuplicates = await detectDuplicateInvoices();
    
    if (remainingDuplicates.length === 0) {
      console.log('✅ All duplicates removed successfully');
    } else {
      console.log(`⚠️  Still have ${remainingDuplicates.length} duplicate groups`);
      console.table(remainingDuplicates);
    }
    
  } catch (error) {
    console.error('❌ Cleanup failed:', error);
    if (require.main === module) {
      process.exit(1);
    }
    throw error;
  }
}

if (require.main === module) {
  main()
    .then(() => {
      console.log('[RunCleanup] Script finished successfully');
    })
    .catch((error) => {
      console.error('[RunCleanup] Script failed with unhandled error:', error);
      if (error instanceof Error) {
        console.error('[RunCleanup] Error message:', error.message);
        console.error('[RunCleanup] Error stack:', error.stack);
      }
      process.exit(1);
    });
}
