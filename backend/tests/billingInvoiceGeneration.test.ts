/// <reference types="jest" />
/**
 * Unit tests for billing invoice generation logic (Option A snapshot-at-periodStart)
 * Tests that invoices only include leases ACTIVE at the start of the billing period
 */

// ─── Mock prisma before any imports ──────────────────────────────────────────

const mockPrisma = {
  lease: {
    findMany: jest.fn(),
  },
  user: {
    findFirst: jest.fn(),
  },
  invoice: {
    findFirst: jest.fn(),
    create: jest.fn(),
  },
};

jest.mock('../src/utils/database', () => ({
  prisma: mockPrisma,
}));

// ─── Import modules after mocking ────────────────────────────────────────────

import { ensureMonthlyInvoicesForAllManagers, getPeriodDates, getBillingPeriod } from '../src/services/billingScheduler';

describe('Billing Invoice Generation - Option A Snapshot', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('getPeriodDates', () => {
    test('produces correct Kampala timezone boundaries', () => {
      const { periodStart, periodEnd } = getPeriodDates('2026-02');

      // Should be Feb 1, 2026 00:00:00 and Feb 28, 2026 23:59:59.999 in Kampala time (UTC+3)
      expect(periodStart.toISOString()).toBe('2026-01-31T21:00:00.000Z'); // Feb 1 00:00 Kampala = Jan 31 21:00 UTC
      expect(periodEnd.toISOString()).toBe('2026-02-28T20:59:59.999Z');   // Feb 28 23:59 Kampala = Feb 28 20:59 UTC
    });
  });

  describe('getBillingPeriod and getPeriodDates consistency', () => {
    test('getBillingPeriod and getPeriodDates cannot disagree for edge timestamps', () => {
      // Test edge cases around month boundaries in Kampala timezone
      const testCases = [
        // End of January in UTC (should be February 1 in Kampala UTC+3)
        new Date('2026-01-31T21:00:00.000Z'), // Feb 1 00:00 Kampala
        new Date('2026-01-31T21:30:00.000Z'), // Feb 1 00:30 Kampala
        new Date('2026-01-31T22:59:59.999Z'), // Feb 1 01:59 Kampala

        // End of February in UTC (should be March 1 in Kampala UTC+3)
        new Date('2026-02-28T21:00:00.000Z'), // Mar 1 00:00 Kampala
        new Date('2026-02-28T21:30:00.000Z'), // Mar 1 00:30 Kampala
        new Date('2026-02-28T22:59:59.999Z'), // Mar 1 01:59 Kampala

        // Mid-month timestamps
        new Date('2026-02-15T12:00:00.000Z'), // Feb 15 15:00 Kampala
        new Date('2026-03-10T09:00:00.000Z'), // Mar 10 12:00 Kampala
      ];

      testCases.forEach(testDate => {
        const period = getBillingPeriod(testDate);
        const { periodStart, periodEnd } = getPeriodDates(period);

        // Verify that testDate falls within the period boundaries
        // periodStart <= testDate < nextPeriodStart
        expect(testDate.getTime()).toBeGreaterThanOrEqual(periodStart.getTime());
        expect(testDate.getTime()).toBeLessThanOrEqual(periodEnd.getTime());

        // Also verify the next period would not include this date
        const [year, month] = period.split('-').map(Number);
        const nextMonth = month === 12 ? 1 : month + 1;
        const nextYear = month === 12 ? year + 1 : year;
        const nextPeriod = `${nextYear}-${nextMonth.toString().padStart(2, '0')}`;
        const { periodStart: nextPeriodStart } = getPeriodDates(nextPeriod);

        expect(testDate.getTime()).toBeLessThan(nextPeriodStart.getTime());
      });
    });
  });

  describe('Option A Snapshot Behavior', () => {
    test('includes only leases ACTIVE at periodStart, excludes mid-month starts', async () => {
      const testDate = new Date('2026-02-15T12:00:00.000Z'); // Mid-February
      const { periodStart, periodEnd } = getPeriodDates('2026-02');

      // Mock leases with different timing scenarios
      const mockLeases = [
        // Lease A: Started before period, active at periodStart - SHOULD BE INCLUDED
        {
          id: 'lease-a',
          propertyId: 'prop-1',
          unitId: 'unit-1',
          rentAmount: 800000,
          startDate: new Date('2026-01-15T00:00:00.000Z'), // Started in January
          endDate: null, // Still active
          status: 'ACTIVE',
          property: { managerId: 'mgr-1', manager: { role: 'MANAGER' } }
        },
        // Lease B: Started after periodStart (mid-month) - SHOULD BE EXCLUDED
        {
          id: 'lease-b',
          propertyId: 'prop-1',
          unitId: 'unit-2',
          rentAmount: 900000,
          startDate: new Date('2026-02-10T00:00:00.000Z'), // Started mid-February
          endDate: null,
          status: 'ACTIVE',
          property: { managerId: 'mgr-1', manager: { role: 'MANAGER' } }
        },
        // Lease C: Ended before periodStart - SHOULD BE EXCLUDED
        {
          id: 'lease-c',
          propertyId: 'prop-1',
          unitId: 'unit-3',
          rentAmount: 700000,
          startDate: new Date('2025-12-01T00:00:00.000Z'), // Started in December
          endDate: new Date('2026-01-30T00:00:00.000Z'), // Ended before February
          status: 'ACTIVE',
          property: { managerId: 'mgr-1', manager: { role: 'MANAGER' } }
        }
      ];

      // Mock manager discovery query - should only return lease A
      mockPrisma.lease.findMany.mockResolvedValueOnce([mockLeases[0]]); // Only lease A matches snapshot criteria

      // Mock manager lookup
      mockPrisma.user.findFirst.mockResolvedValue({ role: 'MANAGER' });

      // Mock existing invoice check
      mockPrisma.invoice.findFirst.mockResolvedValue(null);

      // Mock per-manager lease query - should only return lease A
      mockPrisma.lease.findMany.mockResolvedValueOnce([{
        ...mockLeases[0],
        tenantId: 'tenant-1',
        property: { id: 'prop-1' },
        unit: { id: 'unit-1' },
        tenantIdentity: { tenantId: 'tenant-1' }
      }]);

      // Mock invoice creation
      const mockInvoice = {
        id: 'inv-001',
        managerId: 'mgr-1',
        subtotalAmount: 800000, // Only lease A's rent
        feeAmount: 31920, // 3.99% of 800000
        status: 'DUE'
      };
      mockPrisma.invoice.create.mockResolvedValue(mockInvoice);

      const result = await ensureMonthlyInvoicesForAllManagers(testDate);

      // Verify manager discovery query uses snapshot-at-periodStart logic
      expect(mockPrisma.lease.findMany).toHaveBeenNthCalledWith(1, {
        where: {
          status: 'ACTIVE',
          startDate: { lte: periodStart }, // Must start before or at periodStart
          OR: [
            { endDate: null },
            { endDate: { gte: periodStart } } // Must not end before periodStart
          ]
        },
        include: {
          property: {
            include: {
              manager: true
            }
          }
        }
      });

      // Verify per-manager query uses same snapshot logic
      expect(mockPrisma.lease.findMany).toHaveBeenNthCalledWith(2, {
        where: {
          status: 'ACTIVE',
          property: { managerId: 'mgr-1' },
          startDate: { lte: periodStart }, // Must start before or at periodStart
          OR: [
            { endDate: null },
            { endDate: { gte: periodStart } } // Must not end before periodStart
          ]
        },
        include: {
          property: true,
          unit: true,
          tenantIdentity: true
        }
      });

      // Verify invoice creation with correct amounts (only lease A included)
      expect(mockPrisma.invoice.create).toHaveBeenCalledWith({
        data: {
          managerId: 'mgr-1',
          periodStart,
          periodEnd,
          subtotalAmount: 800000, // Only lease A's 800000, not lease B's 900000
          feeRateBps: 399,
          feeAmount: 31920, // 3.99% of 800000
          status: 'DUE',
          dueDate: expect.any(Date),
          lines: {
            create: [{
              propertyId: 'prop-1',
              unitId: 'unit-1',
              rentAmount: 800000,
              tenantId: 'tenant-1',
              leaseId: 'lease-a'
            }]
          }
        }
      });

      expect(result.invoicesCreatedCount).toBe(1);
    });

    test('excludes leases that start exactly at periodStart + 1 second', async () => {
      const testDate = new Date('2026-02-15T12:00:00.000Z');
      const { periodStart } = getPeriodDates('2026-02');

      // Lease that starts 1 second after periodStart - should be excluded
      const lateStartLease = {
        id: 'lease-late',
        propertyId: 'prop-1',
        unitId: 'unit-1',
        rentAmount: 800000,
        startDate: new Date(periodStart.getTime() + 1000), // 1 second after periodStart
        endDate: null,
        status: 'ACTIVE',
        property: { managerId: 'mgr-1', manager: { role: 'MANAGER' } }
      };

      // Mock empty results - lease should not be found by snapshot query
      mockPrisma.lease.findMany.mockResolvedValue([]);

      const result = await ensureMonthlyInvoicesForAllManagers(testDate);

      // Verify the query excludes leases starting after periodStart
      expect(mockPrisma.lease.findMany).toHaveBeenCalledWith({
        where: {
          status: 'ACTIVE',
          startDate: { lte: periodStart }, // Late start lease fails this condition
          OR: [
            { endDate: null },
            { endDate: { gte: periodStart } }
          ]
        },
        include: {
          property: {
            include: {
              manager: true
            }
          }
        }
      });

      expect(result.invoicesCreatedCount).toBe(0);
    });

    test('includes leases that end exactly at periodStart', async () => {
      const testDate = new Date('2026-02-15T12:00:00.000Z');
      const { periodStart, periodEnd } = getPeriodDates('2026-02');

      // Lease that ends exactly at periodStart - should be included
      const borderlineLease = {
        id: 'lease-borderline',
        propertyId: 'prop-1',
        unitId: 'unit-1',
        rentAmount: 800000,
        startDate: new Date('2026-01-01T00:00:00.000Z'),
        endDate: periodStart, // Ends exactly at periodStart
        status: 'ACTIVE',
        property: { managerId: 'mgr-1', manager: { role: 'MANAGER' } }
      };

      mockPrisma.lease.findMany.mockResolvedValueOnce([borderlineLease]);
      mockPrisma.user.findFirst.mockResolvedValue({ role: 'MANAGER' });
      mockPrisma.invoice.findFirst.mockResolvedValue(null);
      mockPrisma.lease.findMany.mockResolvedValueOnce([{
        ...borderlineLease,
        tenantId: 'tenant-1',
        property: { id: 'prop-1' },
        unit: { id: 'unit-1' },
        tenantIdentity: { tenantId: 'tenant-1' }
      }]);

      const mockInvoice = {
        id: 'inv-001',
        managerId: 'mgr-1',
        subtotalAmount: 800000,
        feeAmount: 31920,
        status: 'DUE'
      };
      mockPrisma.invoice.create.mockResolvedValue(mockInvoice);

      const result = await ensureMonthlyInvoicesForAllManagers(testDate);

      // Verify lease is included (endDate >= periodStart condition satisfied)
      expect(mockPrisma.invoice.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            subtotalAmount: 800000,
            lines: {
              create: [{
                propertyId: 'prop-1',
                unitId: 'unit-1',
                rentAmount: 800000,
                tenantId: 'tenant-1',
                leaseId: 'lease-borderline'
              }]
            }
          })
        })
      );

      expect(result.invoicesCreatedCount).toBe(1);
    });
  });
});
