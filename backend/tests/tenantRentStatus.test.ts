import { PrismaClient } from '@prisma/client';
import { RentService } from '../src/services/rentService';

const prisma = new PrismaClient();
const rentService = new RentService();

describe('TenantRentStatus - Complete Contract Tests', () => {
  let testTenantId: string;
  let testPropertyId: string;
  let testUnitId: string;
  let testLeaseId: string;

  beforeAll(async () => {
    // Clean up any existing test data
    await prisma.$executeRaw`DELETE FROM payments WHERE "tenantId" LIKE 'test-tenant-%'`;
    await prisma.$executeRaw`DELETE FROM leases WHERE "tenantId" LIKE 'test-tenant-%'`;
    await prisma.$executeRaw`DELETE FROM tenant_identities WHERE "tenantId" LIKE 'test-tenant-%'`;
  });

  afterAll(async () => {
    // Clean up test data
    await prisma.$executeRaw`DELETE FROM payments WHERE "tenantId" LIKE 'test-tenant-%'`;
    await prisma.$executeRaw`DELETE FROM leases WHERE "tenantId" LIKE 'test-tenant-%'`;
    await prisma.$executeRaw`DELETE FROM tenant_identities WHERE "tenantId" LIKE 'test-tenant-%'`;
    await prisma.$disconnect();
  });

  describe('Scenario 1: No Active Lease', () => {
    it('should return NO_LEASE status with all amounts zero', async () => {
      const nonExistentTenantId = 'test-tenant-no-lease';

      const result = await rentService.getTenantRentStatus(nonExistentTenantId);

      expect(result).toMatchObject({
        leaseId: null,
        propertyId: null,
        unitId: null,
        rentAmount: null,
        totalPaidForPeriod: 0,
        amountDueForPeriod: 0,
        arrearsTotal: 0,
        status: 'NO_LEASE',
        daysUntilDue: null,
        daysOverdue: null,
      });
      expect(result.billingPeriod).toMatch(/^\d{4}-\d{2}$/); // YYYY-MM format
      expect(result.dueDate).toBeNull();
    });
  });

  describe('Scenario 2: Active Lease - Before Due Date - No Payments', () => {
    beforeAll(async () => {
      testTenantId = 'test-tenant-not-due';

      // Create tenant identity
      await (prisma as any).tenantIdentity.create({
        data: {
          tenantId: testTenantId,
          name: 'Test Tenant Not Due',
          email: 'notdue@test.com',
          phoneNumber: '1234567890',
        },
      });

      // Create property and unit (simplified - assumes they exist or create minimal)
      const property = await (prisma as any).property.findFirst();
      const unit = await (prisma as any).unit.findFirst();

      if (!property || !unit) {
        throw new Error('Test requires at least one property and unit in database');
      }

      testPropertyId = property.id;
      testUnitId = unit.id;

      // Create lease that started on the 25th of current month (so due date is 25th, likely in future)
      const now = new Date();
      const leaseStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 25, 0, 0, 0, 0));
      // If today is after the 25th, use last month's 25th
      if (now.getUTCDate() >= 25) {
        leaseStart.setUTCMonth(leaseStart.getUTCMonth() - 1);
      }

      const lease = await (prisma as any).lease.create({
        data: {
          tenantId: testTenantId,
          propertyId: testPropertyId,
          unitId: testUnitId,
          rentAmount: 1200000,
          startDate: leaseStart,
          status: 'ACTIVE',
        },
      });
      testLeaseId = lease.id;
    });

    it('should return NOT_DUE or OVERDUE status based on due date', async () => {
      const result = await rentService.getTenantRentStatus(testTenantId);

      expect(result).toMatchObject({
        leaseId: testLeaseId,
        propertyId: testPropertyId,
        unitId: testUnitId,
        rentAmount: 1200000,
        totalPaidForPeriod: 0,
        amountDueForPeriod: 1200000,
        arrearsTotal: 0, // No prior months
      });
      // Status should be NOT_DUE or OVERDUE depending on current date vs due date
      expect(['NOT_DUE', 'OVERDUE']).toContain(result.status);
      expect(result.dueDate).not.toBeNull();
    });
  });

  describe('Scenario 3: Active Lease - After Due Date - No Payments', () => {
    beforeAll(async () => {
      testTenantId = 'test-tenant-overdue';

      // Create tenant identity
      await (prisma as any).tenantIdentity.create({
        data: {
          tenantId: testTenantId,
          name: 'Test Tenant Overdue',
          email: 'overdue@test.com',
          phoneNumber: '1234567891',
        },
      });

      const property = await (prisma as any).property.findFirst();
      const unit = await (prisma as any).unit.findFirst();
      testPropertyId = property.id;
      testUnitId = unit.id;

      // Create lease that started on the 1st of current month (so due date is 1st, likely in past)
      const now = new Date();
      const leaseStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1, 0, 0, 0, 0));

      const lease = await (prisma as any).lease.create({
        data: {
          tenantId: testTenantId,
          propertyId: testPropertyId,
          unitId: testUnitId,
          rentAmount: 1500000,
          startDate: leaseStart,
          status: 'ACTIVE',
        },
      });
      testLeaseId = lease.id;
    });

    it('should return OVERDUE or NOT_DUE status based on due date', async () => {
      const result = await rentService.getTenantRentStatus(testTenantId);

      expect(result).toMatchObject({
        leaseId: testLeaseId,
        propertyId: testPropertyId,
        unitId: testUnitId,
        rentAmount: 1500000,
        totalPaidForPeriod: 0,
        amountDueForPeriod: 1500000,
      });
      // Status should be OVERDUE or NOT_DUE depending on current date vs due date
      expect(['OVERDUE', 'NOT_DUE']).toContain(result.status);
      expect(result.dueDate).not.toBeNull();
    });
  });

  describe('Scenario 4: Active Lease - Partial Payment', () => {
    beforeAll(async () => {
      testTenantId = 'test-tenant-partial';

      // Create tenant identity
      await (prisma as any).tenantIdentity.create({
        data: {
          tenantId: testTenantId,
          name: 'Test Tenant Partial',
          email: 'partial@test.com',
          phoneNumber: '1234567892',
        },
      });

      const property = await (prisma as any).property.findFirst();
      const unit = await (prisma as any).unit.findFirst();
      testPropertyId = property.id;
      testUnitId = unit.id;

      // Create lease
      const tenDaysAgo = new Date();
      tenDaysAgo.setUTCDate(tenDaysAgo.getUTCDate() - 10);
      tenDaysAgo.setUTCHours(0, 0, 0, 0);

      const lease = await (prisma as any).lease.create({
        data: {
          tenantId: testTenantId,
          propertyId: testPropertyId,
          unitId: testUnitId,
          rentAmount: 1000000,
          startDate: tenDaysAgo,
          status: 'ACTIVE',
        },
      });
      testLeaseId = lease.id;

      // Create partial payment (60% of rent)
      const now = new Date();
      const year = now.getUTCFullYear();
      const month = now.getUTCMonth();
      const periodStart = new Date(Date.UTC(year, month, 1));
      const currentPeriod = `${year}-${String(month + 1).padStart(2, '0')}`;

      await (prisma as any).payment.create({
        data: {
          tenantId: testTenantId,
          propertyId: testPropertyId,
          unitId: testUnitId,
          leaseId: testLeaseId,
          amount: 600000,
          paymentDate: new Date(),
          dueDate: periodStart,
          billingPeriod: currentPeriod,
          status: 'PAID',
        },
      });
    });

    it('should return PARTIAL or NOT_DUE status with correct amounts', async () => {
      const result = await rentService.getTenantRentStatus(testTenantId);

      expect(result).toMatchObject({
        leaseId: testLeaseId,
        propertyId: testPropertyId,
        unitId: testUnitId,
        rentAmount: 1000000,
        totalPaidForPeriod: 600000,
        amountDueForPeriod: 1000000,
      });
      // Status should be PARTIAL or NOT_DUE (partial payment made)
      expect(['PARTIAL', 'NOT_DUE']).toContain(result.status);
      expect(result.dueDate).not.toBeNull();
    });
  });

  describe('Scenario 5: Active Lease - Full Payment', () => {
    beforeAll(async () => {
      testTenantId = 'test-tenant-paid';

      // Create tenant identity
      await (prisma as any).tenantIdentity.create({
        data: {
          tenantId: testTenantId,
          name: 'Test Tenant Paid',
          email: 'paid@test.com',
          phoneNumber: '1234567893',
        },
      });

      const property = await (prisma as any).property.findFirst();
      const unit = await (prisma as any).unit.findFirst();
      testPropertyId = property.id;
      testUnitId = unit.id;

      // Create lease
      const tenDaysAgo = new Date();
      tenDaysAgo.setUTCDate(tenDaysAgo.getUTCDate() - 10);
      tenDaysAgo.setUTCHours(0, 0, 0, 0);

      const lease = await (prisma as any).lease.create({
        data: {
          tenantId: testTenantId,
          propertyId: testPropertyId,
          unitId: testUnitId,
          rentAmount: 800000,
          startDate: tenDaysAgo,
          status: 'ACTIVE',
        },
      });
      testLeaseId = lease.id;

      // Create full payment
      const now = new Date();
      const year = now.getUTCFullYear();
      const month = now.getUTCMonth();
      const periodStart = new Date(Date.UTC(year, month, 1));
      const currentPeriod = `${year}-${String(month + 1).padStart(2, '0')}`;

      await (prisma as any).payment.create({
        data: {
          tenantId: testTenantId,
          propertyId: testPropertyId,
          unitId: testUnitId,
          leaseId: testLeaseId,
          amount: 800000,
          paymentDate: new Date(),
          dueDate: periodStart,
          billingPeriod: currentPeriod,
          status: 'PAID',
        },
      });
    });

    it('should return PAID status with zero outstanding', async () => {
      const result = await rentService.getTenantRentStatus(testTenantId);

      expect(result).toMatchObject({
        leaseId: testLeaseId,
        propertyId: testPropertyId,
        unitId: testUnitId,
        rentAmount: 800000,
        totalPaidForPeriod: 800000,
        amountDueForPeriod: 800000,
        status: 'PAID',
        daysOverdue: 0,
      });
      expect(result.dueDate).not.toBeNull();
    });
  });

  describe('Scenario 6: Active Lease - With Arrears from Prior Periods', () => {
    beforeAll(async () => {
      testTenantId = 'test-tenant-arrears';

      // Create tenant identity
      await (prisma as any).tenantIdentity.create({
        data: {
          tenantId: testTenantId,
          name: 'Test Tenant Arrears',
          email: 'arrears@test.com',
          phoneNumber: '1234567894',
        },
      });

      const property = await (prisma as any).property.findFirst();
      const unit = await (prisma as any).unit.findFirst();
      testPropertyId = property.id;
      testUnitId = unit.id;

      // Create lease that started 3 months ago
      const threeMonthsAgo = new Date();
      threeMonthsAgo.setUTCMonth(threeMonthsAgo.getUTCMonth() - 3);
      threeMonthsAgo.setUTCDate(1);
      threeMonthsAgo.setUTCHours(0, 0, 0, 0);

      const lease = await (prisma as any).lease.create({
        data: {
          tenantId: testTenantId,
          propertyId: testPropertyId,
          unitId: testUnitId,
          rentAmount: 1000000,
          startDate: threeMonthsAgo,
          status: 'ACTIVE',
        },
      });
      testLeaseId = lease.id;

      // Create payment for only 1 of the 3 prior months
      const twoMonthsAgo = new Date();
      twoMonthsAgo.setUTCMonth(twoMonthsAgo.getUTCMonth() - 2);
      twoMonthsAgo.setUTCDate(1);
      twoMonthsAgo.setUTCHours(0, 0, 0, 0);
      const twoMonthsAgoPeriod = `${twoMonthsAgo.getUTCFullYear()}-${String(twoMonthsAgo.getUTCMonth() + 1).padStart(2, '0')}`;

      await (prisma as any).payment.create({
        data: {
          tenantId: testTenantId,
          propertyId: testPropertyId,
          unitId: testUnitId,
          leaseId: testLeaseId,
          amount: 1000000,
          paymentDate: twoMonthsAgo,
          dueDate: twoMonthsAgo,
          billingPeriod: twoMonthsAgoPeriod,
          status: 'PAID',
        },
      });
    });

    it('should calculate arrears from unpaid prior periods', async () => {
      const result = await rentService.getTenantRentStatus(testTenantId);

      expect(result).toMatchObject({
        leaseId: testLeaseId,
        propertyId: testPropertyId,
        unitId: testUnitId,
        rentAmount: 1000000,
        totalPaidForPeriod: 0, // No payment for current period
        amountDueForPeriod: 1000000,
      });

      // Should have arrears: 3 months expected, only 1 paid = 2 months unpaid
      expect(result.arrearsTotal).toBeGreaterThan(0);
      expect(result.arrearsTotal).toBeLessThanOrEqual(2000000); // Max 2 months
      expect(result.status).toMatch(/OVERDUE|NOT_DUE/); // Depends on current date vs due date
    });
  });

  describe('Response Contract Validation', () => {
    it('should always return all 12 required fields', async () => {
      const result = await rentService.getTenantRentStatus('any-tenant-id');

      // Verify all fields exist
      expect(result).toHaveProperty('leaseId');
      expect(result).toHaveProperty('propertyId');
      expect(result).toHaveProperty('unitId');
      expect(result).toHaveProperty('rentAmount');
      expect(result).toHaveProperty('billingPeriod');
      expect(result).toHaveProperty('dueDate');
      expect(result).toHaveProperty('totalPaidForPeriod');
      expect(result).toHaveProperty('amountDueForPeriod');
      expect(result).toHaveProperty('arrearsTotal');
      expect(result).toHaveProperty('status');
      expect(result).toHaveProperty('daysUntilDue');
      expect(result).toHaveProperty('daysOverdue');

      // Verify types
      expect(typeof result.billingPeriod).toBe('string');
      expect(typeof result.totalPaidForPeriod).toBe('number');
      expect(typeof result.amountDueForPeriod).toBe('number');
      expect(typeof result.arrearsTotal).toBe('number');
      expect(['PAID', 'PARTIAL', 'OVERDUE', 'NOT_DUE', 'NO_LEASE']).toContain(result.status);
    });
  });

  describe('Scenario 7: Period Parameter Support', () => {
    beforeAll(async () => {
      testTenantId = 'test-tenant-period';

      // Create tenant identity
      await (prisma as any).tenantIdentity.create({
        data: {
          tenantId: testTenantId,
          name: 'Test Tenant Period',
          email: 'period@test.com',
          phoneNumber: '1234567895',
        },
      });

      const property = await (prisma as any).property.findFirst();
      const unit = await (prisma as any).unit.findFirst();
      testPropertyId = property.id;
      testUnitId = unit.id;

      // Create lease that started 2 months ago
      const twoMonthsAgo = new Date();
      twoMonthsAgo.setUTCMonth(twoMonthsAgo.getUTCMonth() - 2);
      twoMonthsAgo.setUTCDate(1);
      twoMonthsAgo.setUTCHours(0, 0, 0, 0);

      const lease = await (prisma as any).lease.create({
        data: {
          tenantId: testTenantId,
          propertyId: testPropertyId,
          unitId: testUnitId,
          rentAmount: 900000,
          startDate: twoMonthsAgo,
          status: 'ACTIVE',
        },
      });
      testLeaseId = lease.id;

      // Create payment for last month with billingPeriod set
      const lastMonth = new Date();
      lastMonth.setUTCMonth(lastMonth.getUTCMonth() - 1);
      const lastMonthPeriod = `${lastMonth.getUTCFullYear()}-${String(lastMonth.getUTCMonth() + 1).padStart(2, '0')}`;

      await (prisma as any).payment.create({
        data: {
          tenantId: testTenantId,
          propertyId: testPropertyId,
          unitId: testUnitId,
          leaseId: testLeaseId,
          amount: 900000,
          paymentDate: lastMonth,
          dueDate: lastMonth,
          billingPeriod: lastMonthPeriod,
          status: 'PAID',
        },
      });
    });

    it('should return data for requested prior period', async () => {
      const lastMonth = new Date();
      lastMonth.setUTCMonth(lastMonth.getUTCMonth() - 1);
      const requestedPeriod = `${lastMonth.getUTCFullYear()}-${String(lastMonth.getUTCMonth() + 1).padStart(2, '0')}`;

      const result = await rentService.getTenantRentStatus(testTenantId, requestedPeriod);

      expect(result.billingPeriod).toBe(requestedPeriod);
      expect(result.totalPaidForPeriod).toBe(900000);
      expect(result.status).toBe('PAID');
    });

    it('should default to current period when no period provided', async () => {
      const now = new Date();
      const currentPeriod = `${now.getUTCFullYear()}-${String(now.getUTCMonth() + 1).padStart(2, '0')}`;

      const result = await rentService.getTenantRentStatus(testTenantId);

      expect(result.billingPeriod).toBe(currentPeriod);
      expect(result.totalPaidForPeriod).toBe(0); // No payment for current month
    });

    it('should reject invalid period format', async () => {
      const result = await rentService.getTenantRentStatus(testTenantId, 'invalid-period');

      // Should default to current period
      const now = new Date();
      const currentPeriod = `${now.getUTCFullYear()}-${String(now.getUTCMonth() + 1).padStart(2, '0')}`;
      expect(result.billingPeriod).toBe(currentPeriod);
    });
  });

  describe('Scenario 8: Payment Aggregation - Multiple Payments Same Period', () => {
    beforeAll(async () => {
      testTenantId = 'test-tenant-billing-period';

      // Create tenant identity
      await (prisma as any).tenantIdentity.create({
        data: {
          tenantId: testTenantId,
          name: 'Test Tenant Billing Period',
          email: 'billingperiod@test.com',
          phoneNumber: '1234567896',
        },
      });

      const property = await (prisma as any).property.findFirst();
      const unit = await (prisma as any).unit.findFirst();
      testPropertyId = property.id;
      testUnitId = unit.id;

      // Create lease
      const tenDaysAgo = new Date();
      tenDaysAgo.setUTCDate(tenDaysAgo.getUTCDate() - 10);
      tenDaysAgo.setUTCHours(0, 0, 0, 0);

      const lease = await (prisma as any).lease.create({
        data: {
          tenantId: testTenantId,
          propertyId: testPropertyId,
          unitId: testUnitId,
          rentAmount: 1100000,
          startDate: tenDaysAgo,
          status: 'ACTIVE',
        },
      });
      testLeaseId = lease.id;

      const now = new Date();
      const currentPeriod = `${now.getUTCFullYear()}-${String(now.getUTCMonth() + 1).padStart(2, '0')}`;

      // Payment 1: First partial payment
      await (prisma as any).payment.create({
        data: {
          tenantId: testTenantId,
          propertyId: testPropertyId,
          unitId: testUnitId,
          leaseId: testLeaseId,
          amount: 500000,
          paymentDate: new Date(),
          dueDate: new Date(),
          billingPeriod: currentPeriod,
          status: 'PAID',
        },
      });

      // Payment 2: Second partial payment for same period
      await (prisma as any).payment.create({
        data: {
          tenantId: testTenantId,
          propertyId: testPropertyId,
          unitId: testUnitId,
          leaseId: testLeaseId,
          amount: 300000,
          paymentDate: new Date(),
          dueDate: new Date(),
          billingPeriod: currentPeriod,
          status: 'PAID',
        },
      });
    });

    it('should aggregate multiple payments for same billing period', async () => {
      const result = await rentService.getTenantRentStatus(testTenantId);

      // Should count both payments: 500000 + 300000 = 800000
      expect(result.totalPaidForPeriod).toBe(800000);
      // Status should be PARTIAL or NOT_DUE (partial payment made, not full)
      expect(['PARTIAL', 'NOT_DUE']).toContain(result.status);
    });
  });

  describe('Guard Test 1: No Double-Count for totalPaidForPeriod', () => {
    beforeAll(async () => {
      testTenantId = 'test-tenant-no-double-count';

      // Create tenant identity
      await (prisma as any).tenantIdentity.create({
        data: {
          tenantId: testTenantId,
          name: 'Test Tenant No Double Count',
          email: 'nodoublecount@test.com',
          phoneNumber: '1234567898',
        },
      });

      const property = await (prisma as any).property.findFirst();
      const unit = await (prisma as any).unit.findFirst();
      testPropertyId = property.id;
      testUnitId = unit.id;

      // Create lease
      const tenDaysAgo = new Date();
      tenDaysAgo.setUTCDate(tenDaysAgo.getUTCDate() - 10);
      tenDaysAgo.setUTCHours(0, 0, 0, 0);

      const lease = await (prisma as any).lease.create({
        data: {
          tenantId: testTenantId,
          propertyId: testPropertyId,
          unitId: testUnitId,
          rentAmount: 1000000,
          startDate: tenDaysAgo,
          status: 'ACTIVE',
        },
      });
      testLeaseId = lease.id;

      const now = new Date();
      const currentPeriod = `${now.getUTCFullYear()}-${String(now.getUTCMonth() + 1).padStart(2, '0')}`;

      // Payment 1: Has billingPeriod set
      await (prisma as any).payment.create({
        data: {
          tenantId: testTenantId,
          propertyId: testPropertyId,
          unitId: testUnitId,
          leaseId: testLeaseId,
          amount: 400000,
          paymentDate: new Date(),
          dueDate: new Date(),
          billingPeriod: currentPeriod,
          status: 'PAID',
        },
      });

      // Payment 2: Also has billingPeriod set (same period)
      await (prisma as any).payment.create({
        data: {
          tenantId: testTenantId,
          propertyId: testPropertyId,
          unitId: testUnitId,
          leaseId: testLeaseId,
          amount: 300000,
          paymentDate: new Date(),
          dueDate: new Date(),
          billingPeriod: currentPeriod,
          status: 'PAID',
        },
      });
    });

    it('should count each payment exactly once, not double', async () => {
      const result = await rentService.getTenantRentStatus(testTenantId);

      // Should count both payments exactly once: 400000 + 300000 = 700000
      // NOT 1400000 (double-counted) or any other value
      expect(result.totalPaidForPeriod).toBe(700000);
      expect(result.amountDueForPeriod).toBe(1000000);
    });
  });

  describe('Guard Test 2: Arrears Excludes Target Period Payments', () => {
    beforeAll(async () => {
      testTenantId = 'test-tenant-arrears-guard';

      // Create tenant identity
      await (prisma as any).tenantIdentity.create({
        data: {
          tenantId: testTenantId,
          name: 'Test Tenant Arrears Guard',
          email: 'arrearsguard@test.com',
          phoneNumber: '1234567899',
        },
      });

      const property = await (prisma as any).property.findFirst();
      const unit = await (prisma as any).unit.findFirst();
      testPropertyId = property.id;
      testUnitId = unit.id;

      // Create lease that started 3 months ago
      const threeMonthsAgo = new Date();
      threeMonthsAgo.setUTCMonth(threeMonthsAgo.getUTCMonth() - 3);
      threeMonthsAgo.setUTCDate(1);
      threeMonthsAgo.setUTCHours(0, 0, 0, 0);

      const lease = await (prisma as any).lease.create({
        data: {
          tenantId: testTenantId,
          propertyId: testPropertyId,
          unitId: testUnitId,
          rentAmount: 500000,
          startDate: threeMonthsAgo,
          status: 'ACTIVE',
        },
      });
      testLeaseId = lease.id;

      // Create payment ONLY in current period (no prior period payments)
      const now = new Date();
      const currentPeriod = `${now.getUTCFullYear()}-${String(now.getUTCMonth() + 1).padStart(2, '0')}`;

      await (prisma as any).payment.create({
        data: {
          tenantId: testTenantId,
          propertyId: testPropertyId,
          unitId: testUnitId,
          leaseId: testLeaseId,
          amount: 500000,
          paymentDate: new Date(),
          dueDate: new Date(),
          billingPeriod: currentPeriod,
          status: 'PAID',
        },
      });
    });

    it('should calculate arrears from prior periods only, not subtract current period payment', async () => {
      const result = await rentService.getTenantRentStatus(testTenantId);

      // Lease started 3 months ago, current period is 4th month
      // Prior months: 3
      // Expected: 3 * 500000 = 1500000
      // Paid before current: 0
      // Arrears: 1500000 (should NOT subtract the 500000 paid in current period)
      expect(result.arrearsTotal).toBe(1500000);
      expect(result.totalPaidForPeriod).toBe(500000); // Current period paid
      expect(result.status).toBe('PAID'); // Current period fully paid
    });
  });

  describe('Guard Test 3: Historical Period Days Are Null', () => {
    beforeAll(async () => {
      testTenantId = 'test-tenant-historical-days';

      // Create tenant identity
      await (prisma as any).tenantIdentity.create({
        data: {
          tenantId: testTenantId,
          name: 'Test Tenant Historical Days',
          email: 'historicaldays@test.com',
          phoneNumber: '1234567900',
        },
      });

      const property = await (prisma as any).property.findFirst();
      const unit = await (prisma as any).unit.findFirst();
      testPropertyId = property.id;
      testUnitId = unit.id;

      // Create lease that started 2 months ago
      const twoMonthsAgo = new Date();
      twoMonthsAgo.setUTCMonth(twoMonthsAgo.getUTCMonth() - 2);
      twoMonthsAgo.setUTCDate(1);
      twoMonthsAgo.setUTCHours(0, 0, 0, 0);

      const lease = await (prisma as any).lease.create({
        data: {
          tenantId: testTenantId,
          propertyId: testPropertyId,
          unitId: testUnitId,
          rentAmount: 800000,
          startDate: twoMonthsAgo,
          status: 'ACTIVE',
        },
      });
      testLeaseId = lease.id;

      // Create payment for last month
      const lastMonth = new Date();
      lastMonth.setUTCMonth(lastMonth.getUTCMonth() - 1);
      const lastMonthPeriod = `${lastMonth.getUTCFullYear()}-${String(lastMonth.getUTCMonth() + 1).padStart(2, '0')}`;

      await (prisma as any).payment.create({
        data: {
          tenantId: testTenantId,
          propertyId: testPropertyId,
          unitId: testUnitId,
          leaseId: testLeaseId,
          amount: 800000,
          paymentDate: lastMonth,
          dueDate: lastMonth,
          billingPeriod: lastMonthPeriod,
          status: 'PAID',
        },
      });
    });

    it('should return null for days when querying historical period', async () => {
      // Query last month (historical)
      const lastMonth = new Date();
      lastMonth.setUTCMonth(lastMonth.getUTCMonth() - 1);
      const historicalPeriod = `${lastMonth.getUTCFullYear()}-${String(lastMonth.getUTCMonth() + 1).padStart(2, '0')}`;

      const result = await rentService.getTenantRentStatus(testTenantId, historicalPeriod);

      // Days should be null for historical queries
      expect(result.daysUntilDue).toBeNull();
      expect(result.daysOverdue).toBeNull();

      // But other fields should still be accurate
      expect(result.billingPeriod).toBe(historicalPeriod);
      expect(result.totalPaidForPeriod).toBe(800000);
      expect(result.status).toBe('PAID');
      expect(result.dueDate).not.toBeNull(); // Due date still computed
    });

    it('should return calculated days when querying current period', async () => {
      // Query current month (not historical)
      const result = await rentService.getTenantRentStatus(testTenantId);

      // Days should be calculated for current period
      // At least one of them should be a number (not null)
      const hasDaysCalculated =
        typeof result.daysUntilDue === 'number' ||
        typeof result.daysOverdue === 'number';

      expect(hasDaysCalculated).toBe(true);
    });

    it('should return OVERDUE for historical unpaid period with null days', async () => {
      // Create a new tenant with unpaid historical period
      const unpaidTenantId = 'test-tenant-historical-unpaid';

      await (prisma as any).tenantIdentity.create({
        data: {
          tenantId: unpaidTenantId,
          name: 'Test Tenant Historical Unpaid',
          email: 'historicalunpaid@test.com',
          phoneNumber: '1234567901',
        },
      });

      const property = await (prisma as any).property.findFirst();
      const unit = await (prisma as any).unit.findFirst();

      // Create lease that started 2 months ago
      const twoMonthsAgo = new Date();
      twoMonthsAgo.setUTCMonth(twoMonthsAgo.getUTCMonth() - 2);
      twoMonthsAgo.setUTCDate(1);
      twoMonthsAgo.setUTCHours(0, 0, 0, 0);

      await (prisma as any).lease.create({
        data: {
          tenantId: unpaidTenantId,
          propertyId: property.id,
          unitId: unit.id,
          rentAmount: 600000,
          startDate: twoMonthsAgo,
          status: 'ACTIVE',
        },
      });

      // Query last month (historical) - NO payment created
      const lastMonth = new Date();
      lastMonth.setUTCMonth(lastMonth.getUTCMonth() - 1);
      const historicalPeriod = `${lastMonth.getUTCFullYear()}-${String(lastMonth.getUTCMonth() + 1).padStart(2, '0')}`;

      const result = await rentService.getTenantRentStatus(unpaidTenantId, historicalPeriod);

      // Historical unpaid period should be OVERDUE (not NOT_DUE)
      expect(result.status).toBe('OVERDUE');
      expect(result.daysUntilDue).toBeNull();
      expect(result.daysOverdue).toBeNull();
      expect(result.totalPaidForPeriod).toBe(0);
      expect(result.billingPeriod).toBe(historicalPeriod);
    });
  });

  describe('Scenario 9: Arrears Calculation Consistency', () => {
    beforeAll(async () => {
      testTenantId = 'test-tenant-arrears-consistent';

      // Create tenant identity
      await (prisma as any).tenantIdentity.create({
        data: {
          tenantId: testTenantId,
          name: 'Test Tenant Arrears Consistent',
          email: 'arrearsconsistent@test.com',
          phoneNumber: '1234567897',
        },
      });

      const property = await (prisma as any).property.findFirst();
      const unit = await (prisma as any).unit.findFirst();
      testPropertyId = property.id;
      testUnitId = unit.id;

      // Create lease that started 4 months ago
      const fourMonthsAgo = new Date();
      fourMonthsAgo.setUTCMonth(fourMonthsAgo.getUTCMonth() - 4);
      fourMonthsAgo.setUTCDate(1);
      fourMonthsAgo.setUTCHours(0, 0, 0, 0);

      const lease = await (prisma as any).lease.create({
        data: {
          tenantId: testTenantId,
          propertyId: testPropertyId,
          unitId: testUnitId,
          rentAmount: 1000000,
          startDate: fourMonthsAgo,
          status: 'ACTIVE',
        },
      });
      testLeaseId = lease.id;

      // Pay for month 1 and month 3 only (skip month 2)
      const month1 = new Date(fourMonthsAgo);
      const month1Period = `${month1.getUTCFullYear()}-${String(month1.getUTCMonth() + 1).padStart(2, '0')}`;

      await (prisma as any).payment.create({
        data: {
          tenantId: testTenantId,
          propertyId: testPropertyId,
          unitId: testUnitId,
          leaseId: testLeaseId,
          amount: 1000000,
          paymentDate: month1,
          dueDate: month1,
          billingPeriod: month1Period,
          status: 'PAID',
        },
      });

      const month3 = new Date(fourMonthsAgo);
      month3.setUTCMonth(month3.getUTCMonth() + 2);
      const month3Period = `${month3.getUTCFullYear()}-${String(month3.getUTCMonth() + 1).padStart(2, '0')}`;

      await (prisma as any).payment.create({
        data: {
          tenantId: testTenantId,
          propertyId: testPropertyId,
          unitId: testUnitId,
          leaseId: testLeaseId,
          amount: 1000000,
          paymentDate: month3,
          dueDate: month3,
          billingPeriod: month3Period,
          status: 'PAID',
        },
      });
    });

    it('should calculate arrears correctly for current period', async () => {
      const result = await rentService.getTenantRentStatus(testTenantId);

      // Lease started 4 months ago, current period is 5th month
      // Prior months: 4 (months 1, 2, 3, 4)
      // Expected: 4 * 1000000 = 4000000
      // Paid: 2 * 1000000 = 2000000 (month 1 and month 3)
      // Arrears: 2000000 (months 2 and 4 unpaid)
      expect(result.arrearsTotal).toBe(2000000);
      expect(result.totalPaidForPeriod).toBe(0); // Current month unpaid
    });

    it('should not double-count arrears when querying prior period', async () => {
      // Query month 2 (which was NOT paid) - one month after lease start
      const threeMonthsAgo = new Date();
      threeMonthsAgo.setUTCMonth(threeMonthsAgo.getUTCMonth() - 3);
      const month2Period = `${threeMonthsAgo.getUTCFullYear()}-${String(threeMonthsAgo.getUTCMonth() + 1).padStart(2, '0')}`;

      const result = await rentService.getTenantRentStatus(testTenantId, month2Period);

      // Prior months: 1 (month 1 only, since month 2 is the target period)
      // Expected: 1 * 1000000 = 1000000
      // Paid: 1 * 1000000 = 1000000 (month 1 was paid)
      // Arrears: 0 (all prior months paid)
      expect(result.arrearsTotal).toBe(0);
      expect(result.totalPaidForPeriod).toBe(0); // Month 2 was NOT paid
      expect(['OVERDUE', 'NOT_DUE']).toContain(result.status);
    });
  });
});
