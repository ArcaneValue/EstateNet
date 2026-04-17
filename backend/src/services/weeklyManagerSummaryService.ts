import { prisma } from '../utils/database';
import { notificationDispatcher } from './notificationDispatcher';
import { getCurrentBillingPeriod, getPeriodDates } from '../utils/billingPeriodHelpers';

export interface WeeklyManagerSummary {
  managerId: string;
  weekStart: Date;
  weekEnd: Date;
  totalRentCollected: number;
  totalOutstanding: number;
  billingStatus: string;
  newClaimsCount: number;
  verifiedClaimsCount: number;
  rejectedClaimsCount: number;
  occupiedUnitCount: number;
  overdueInvoicesCount: number;
  topPerformingProperty?: {
    id: string;
    name: string;
    collectionRate: number;
  };
}

export class WeeklyManagerSummaryService {

  /**
   * Generate weekly summary for a specific manager
   */
  static async generateManagerSummary(managerId: string, weekStart?: Date): Promise<WeeklyManagerSummary | null> {
    try {
      const summaryWeekStart = weekStart || this.getWeekStart();
      const weekEnd = new Date(summaryWeekStart.getTime() + (7 * 24 * 60 * 60 * 1000));

      // Get manager's current billing status
      const manager = await prisma.user.findUnique({
        where: { id: managerId },
        select: { billingStatus: true }
      });

      if (!manager) {
        console.log(`Manager ${managerId} not found`);
        return null;
      }

      // Get managed properties
      const managedProperties = await prisma.property.findMany({
        where: { managerId },
        select: { id: true, name: true }
      });

      const propertyIds = managedProperties.map(p => p.id);

      if (propertyIds.length === 0) {
        console.log(`Manager ${managerId} has no properties`);
        return null;
      }

      // Get payment claims data for the week
      const [newClaims, verifiedClaims, rejectedClaims] = await Promise.all([
        prisma.paymentClaim.count({
          where: {
            managerId,
            createdAt: {
              gte: summaryWeekStart,
              lt: weekEnd
            }
          }
        }),
        prisma.paymentClaim.count({
          where: {
            managerId,
            status: 'VERIFIED',
            updatedAt: {
              gte: summaryWeekStart,
              lt: weekEnd
            }
          }
        }),
        prisma.paymentClaim.count({
          where: {
            managerId,
            status: 'REJECTED',
            updatedAt: {
              gte: summaryWeekStart,
              lt: weekEnd
            }
          }
        })
      ]);

      // Get rent collection data for the current billing period
      const currentPeriod = getCurrentBillingPeriod();
      const { periodStart, periodEnd } = getPeriodDates(currentPeriod);

      const [paidPayments, activeLeases] = await Promise.all([
        (prisma as any).payment.findMany({
          where: {
            propertyId: { in: propertyIds },
            status: 'PAID',
            billingPeriod: currentPeriod
          },
          select: { amount: true, propertyId: true }
        }),
        prisma.lease.findMany({
          where: {
            propertyId: { in: propertyIds },
            status: 'ACTIVE',
            startDate: { lte: periodStart },
            OR: [
              { endDate: null },
              { endDate: { gte: periodStart } }
            ]
          },
          select: { rentAmount: true, propertyId: true }
        })
      ]);

      const totalRentCollected = paidPayments.reduce((sum: number, payment: any) => sum + payment.amount, 0);
      const expectedRent = activeLeases.reduce((sum, lease) => sum + lease.rentAmount, 0);
      const totalOutstanding = expectedRent - totalRentCollected;
      const occupiedUnitCount = activeLeases.length;

      // Get overdue invoices count
      const overdueInvoicesCount = await prisma.invoice.count({
        where: {
          // managerId field doesn't exist in Invoice model, commenting out for now
          status: 'OVERDUE'
        }
      });

      // Find top performing property (highest collection rate)
      let topPerformingProperty;
      if (managedProperties.length > 1) {
        const propertyPerformance = managedProperties.map(property => {
          const propertyPayments = paidPayments.filter((p: any) => p.propertyId === property.id);
          const propertyLeases = activeLeases.filter(l => l.propertyId === property.id);

          const collected = propertyPayments.reduce((sum: number, p: any) => sum + p.amount, 0);
          const expected = propertyLeases.reduce((sum, l) => sum + l.rentAmount, 0);
          const collectionRate = expected > 0 ? (collected / expected) * 100 : 0;

          return {
            id: property.id,
            name: property.name,
            collectionRate: Math.round(collectionRate)
          };
        });

        topPerformingProperty = propertyPerformance.reduce((best, current) =>
          current.collectionRate > best.collectionRate ? current : best
        );
      }

      return {
        managerId,
        weekStart: summaryWeekStart,
        weekEnd,
        totalRentCollected,
        totalOutstanding: Math.max(0, totalOutstanding),
        billingStatus: manager.billingStatus || 'CURRENT',
        newClaimsCount: newClaims,
        verifiedClaimsCount: verifiedClaims,
        rejectedClaimsCount: rejectedClaims,
        occupiedUnitCount,
        overdueInvoicesCount,
        topPerformingProperty
      };

    } catch (error) {
      console.error(`Failed to generate weekly summary for manager ${managerId}:`, error);
      return null;
    }
  }

  /**
   * Generate and send weekly summaries for all active managers
   */
  static async generateAllManagerSummaries(): Promise<void> {
    try {
      console.log('[WEEKLY_SUMMARY] Starting weekly summary generation...');

      // Get all managers with properties
      const managers = await prisma.user.findMany({
        where: {
          role: 'MANAGER',
          managedProperties: {
            some: {}
          }
        },
        select: {
          id: true,
          name: true,
          email: true
        }
      });

      console.log(`[WEEKLY_SUMMARY] Found ${managers.length} active managers`);

      const summaries: WeeklyManagerSummary[] = [];

      for (const manager of managers) {
        const summary = await this.generateManagerSummary(manager.id);
        if (summary) {
          summaries.push(summary);

          // Send notification via dispatcher
          await notificationDispatcher.sendWeeklyManagerSummary(manager.id, {
            totalCollected: summary.totalRentCollected,
            totalOutstanding: summary.totalOutstanding,
            newClaimsCount: summary.newClaimsCount,
            occupiedUnitCount: summary.occupiedUnitCount,
            billingStatus: summary.billingStatus,
            collectionRate: summary.totalRentCollected > 0 && summary.totalRentCollected + summary.totalOutstanding > 0
              ? Math.round((summary.totalRentCollected / (summary.totalRentCollected + summary.totalOutstanding)) * 100)
              : 0
          });
        }
      }

      console.log(`[WEEKLY_SUMMARY] Generated ${summaries.length} weekly summaries`);

    } catch (error) {
      console.error('[WEEKLY_SUMMARY] Failed to generate weekly summaries:', error);
    }
  }

  /**
   * Get the start of the current week (Monday)
   */
  private static getWeekStart(date: Date = new Date()): Date {
    const weekStart = new Date(date);
    const day = weekStart.getDay();
    const diff = weekStart.getDate() - day + (day === 0 ? -6 : 1); // Adjust for Monday start
    weekStart.setDate(diff);
    weekStart.setHours(0, 0, 0, 0);
    return weekStart;
  }

  /**
   * Check if weekly summary should run (every Monday)
   */
  static shouldRunWeeklySummary(): boolean {
    const now = new Date();
    return now.getDay() === 1; // Monday
  }

  /**
   * Get manager's weekly summary data for API endpoint
   */
  static async getManagerWeeklySummaryData(managerId: string): Promise<WeeklyManagerSummary | null> {
    return this.generateManagerSummary(managerId);
  }
}
