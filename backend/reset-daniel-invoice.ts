import { prisma } from './src/utils/database';

async function resetDanielInvoice() {
  try {
    console.log('Starting invoice reset for daniel@gmail.com...\n');

    const managerId = 'cmmt07jrw0005uydk3ddcdfzm';
    const invoiceId = 'cmmth5hqq00038qhbc4pa0wx7';

    // Step 1: Delete service payments for this invoice
    console.log('1. Deleting service payments...');
    const deletedPayments = await prisma.servicePayment.deleteMany({
      where: { invoiceId },
    });
    console.log(`   ✅ Deleted ${deletedPayments.count} payment(s)`);

    // Step 2: Delete the invoice
    console.log('2. Deleting invoice...');
    const deletedInvoice = await prisma.invoice.delete({
      where: { id: invoiceId },
    });
    console.log(`   ✅ Deleted invoice: ${deletedInvoice.id}`);

    // Step 3: Create new invoice for current period
    console.log('3. Creating new invoice...');

    const now = new Date();
    const year = now.getFullYear();
    const month = now.getMonth(); // 0-indexed

    // Period: start of current month to end of current month
    const periodStart = new Date(Date.UTC(year, month, 1, 0, 0, 0, 0));
    const periodEnd = new Date(Date.UTC(year, month + 1, 0, 23, 59, 59, 999));

    // Due date: 7 days after period end
    const dueDate = new Date(periodEnd);
    dueDate.setDate(dueDate.getDate() + 7);

    const subtotalAmount = 1000000; // 1,000,000 UGX
    const feeRateBps = 150; // 1.5%
    const feeAmount = Math.round(subtotalAmount * (feeRateBps / 10000));
    const totalAmount = subtotalAmount + feeAmount;

    const newInvoice = await prisma.invoice.create({
      data: {
        managerId,
        periodStart,
        periodEnd,
        subtotalAmount,
        feeRateBps,
        feeAmount,
        status: 'DUE',
        dueDate,
      },
    });

    console.log(`   ✅ Created new invoice: ${newInvoice.id}`);
    console.log(`   Period: ${periodStart.toISOString()} to ${periodEnd.toISOString()}`);
    console.log(`   Subtotal: ${subtotalAmount} UGX`);
    console.log(`   Fee: ${feeAmount} UGX (${feeRateBps / 100}%)`);
    console.log(`   Total: ${totalAmount} UGX`);
    console.log(`   Status: ${newInvoice.status}`);
    console.log(`   Due Date: ${dueDate.toISOString()}`);

    console.log('\n✅ Invoice reset complete!\n');
    console.log('New Invoice Details:');
    console.log(JSON.stringify(newInvoice, null, 2));

  } catch (error) {
    console.error('❌ Error resetting invoice:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

resetDanielInvoice();
