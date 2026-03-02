import { prisma } from '../utils/database';
import { notificationDispatcher } from './notificationDispatcher';

export interface PendingClaimReminder {
  claimId: string;
  tenantId: string;
  managerId: string;
  amount: number;
  method: string;
  createdAt: Date;
  hoursOld: number;
  property: string;
  unit: string;
  tenantName: string;
}

export class TenantReminderService {
  private static readonly REMINDER_THRESHOLD_HOURS = 48; // 48 hours

  /**
   * Find all payment claims that are pending and older than 48 hours
   */
  static async findPendingClaimsForReminder(): Promise<PendingClaimReminder[]> {
    try {
      const thresholdTime = new Date(Date.now() - (this.REMINDER_THRESHOLD_HOURS * 60 * 60 * 1000));

      const pendingClaims = await prisma.paymentClaim.findMany({
        where: {
          status: 'PENDING',
          createdAt: {
            lte: thresholdTime
          }
        },
        include: {
          tenantIdentity: {
            select: {
              name: true,
              email: true
            }
          },
          lease: {
            include: {
              property: {
                select: {
                  name: true
                }
              },
              unit: {
                select: {
                  unitNumber: true
                }
              }
            }
          }
        },
        orderBy: {
          createdAt: 'asc'
        }
      });

      return pendingClaims.map(claim => {
        const hoursOld = Math.floor((Date.now() - claim.createdAt.getTime()) / (1000 * 60 * 60));

        return {
          claimId: claim.id,
          tenantId: claim.tenantId,
          managerId: claim.managerId,
          amount: claim.amount,
          method: claim.method,
          createdAt: claim.createdAt,
          hoursOld,
          property: claim.lease.property.name,
          unit: claim.lease.unit.unitNumber,
          tenantName: claim.tenantIdentity.name
        };
      });

    } catch (error) {
      console.error('Failed to find pending claims for reminder:', error);
      return [];
    }
  }

  /**
   * Send reminder notifications to managers about stale pending claims
   */
  static async sendPendingClaimReminders(): Promise<void> {
    try {
      console.log('[TENANT_REMINDER] Checking for pending claims requiring manager attention...');

      const pendingClaims = await this.findPendingClaimsForReminder();

      if (pendingClaims.length === 0) {
        console.log('[TENANT_REMINDER] No pending claims require reminders');
        return;
      }

      console.log(`[TENANT_REMINDER] Found ${pendingClaims.length} claims pending for >48h`);

      // Group claims by manager
      const claimsByManager = pendingClaims.reduce((groups, claim) => {
        if (!groups[claim.managerId]) {
          groups[claim.managerId] = [];
        }
        groups[claim.managerId].push(claim);
        return groups;
      }, {} as Record<string, PendingClaimReminder[]>);

      // Send reminders to each manager
      for (const [managerId, claims] of Object.entries(claimsByManager)) {
        await this.sendManagerReminder(managerId, claims);
      }

      console.log(`[TENANT_REMINDER] Sent reminders to ${Object.keys(claimsByManager).length} managers`);

    } catch (error) {
      console.error('[TENANT_REMINDER] Failed to send pending claim reminders:', error);
    }
  }

  /**
   * Send reminder notification to a specific manager about their pending claims
   */
  private static async sendManagerReminder(managerId: string, claims: PendingClaimReminder[]): Promise<void> {
    try {
      const totalAmount = claims.reduce((sum, claim) => sum + claim.amount, 0);
      const oldestClaim = claims[0]; // Claims are sorted by createdAt ASC

      const title = `${claims.length} Pending Payment Claims Require Attention`;
      let body = '';

      if (claims.length === 1) {
        body = `Payment claim from ${oldestClaim.tenantName} (${oldestClaim.amount.toLocaleString()} UGX) has been pending for ${oldestClaim.hoursOld} hours`;
      } else {
        body = `${claims.length} payment claims totaling ${totalAmount.toLocaleString()} UGX are pending review. Oldest: ${oldestClaim.hoursOld} hours`;
      }

      // Send push notification via dispatcher
      await notificationDispatcher.notifyManagerNewClaim(managerId, {
        id: claims[0].claimId,
        amount: totalAmount,
        tenantName: claims.length === 1 ? claims[0].tenantName : `${claims.length} tenants`,
        tenantId: claims[0].tenantId,
        unreadCount: claims.length
      });

      // Also send direct push notification
      const FirebaseDispatcher = require('./notificationDispatcher').FirebaseNotificationDispatcher;
      const dispatcher = new FirebaseDispatcher();
      await dispatcher.sendPush({
        title,
        body,
        data: {
          type: 'PENDING_CLAIMS_REMINDER',
          count: claims.length.toString(),
          totalAmount: totalAmount.toString(),
          oldestHours: oldestClaim.hoursOld.toString(),
          claims: claims.map(c => ({
            id: c.claimId,
            tenantName: c.tenantName,
            amount: c.amount.toString(),
            hoursOld: c.hoursOld.toString()
          }))
        }
      });

      // Log for development/debugging
      console.log(`[TENANT_REMINDER] Reminder sent to manager ${managerId} for ${claims.length} pending claims`);

      // Optionally create in-app notification record
      await prisma.notification.create({
        data: {
          userId: managerId,
          title,
          body,
          type: 'PENDING_CLAIMS_REMINDER',
          metadata: {
            referenceId: claims[0].claimId,
            claimCount: claims.length,
            totalAmount: totalAmount
          }
        }
      });

    } catch (error) {
      console.error(`[TENANT_REMINDER] Failed to send reminder to manager ${managerId}:`, error);
    }
  }

  /**
   * Get statistics about pending claims for monitoring
   */
  static async getPendingClaimStats(): Promise<{
    totalPending: number;
    pendingOver24h: number;
    pendingOver48h: number;
    pendingOver72h: number;
    averageHoursPending: number;
    managersPendingReview: number;
  }> {
    try {
      const now = new Date();
      const h24Ago = new Date(now.getTime() - (24 * 60 * 60 * 1000));
      const h48Ago = new Date(now.getTime() - (48 * 60 * 60 * 1000));
      const h72Ago = new Date(now.getTime() - (72 * 60 * 60 * 1000));

      const [
        totalPending,
        pendingOver24h,
        pendingOver48h,
        pendingOver72h,
        allPendingClaims,
        uniqueManagers
      ] = await Promise.all([
        prisma.paymentClaim.count({
          where: { status: 'PENDING' }
        }),
        prisma.paymentClaim.count({
          where: {
            status: 'PENDING',
            createdAt: { lte: h24Ago }
          }
        }),
        prisma.paymentClaim.count({
          where: {
            status: 'PENDING',
            createdAt: { lte: h48Ago }
          }
        }),
        prisma.paymentClaim.count({
          where: {
            status: 'PENDING',
            createdAt: { lte: h72Ago }
          }
        }),
        prisma.paymentClaim.findMany({
          where: { status: 'PENDING' },
          select: { createdAt: true }
        }),
        prisma.paymentClaim.findMany({
          where: { status: 'PENDING' },
          select: { managerId: true },
          distinct: ['managerId']
        })
      ]);

      // Calculate average hours pending
      const totalHoursPending = allPendingClaims.reduce((sum, claim) => {
        const hoursPending = (now.getTime() - claim.createdAt.getTime()) / (1000 * 60 * 60);
        return sum + hoursPending;
      }, 0);

      const averageHoursPending = allPendingClaims.length > 0
        ? Math.round(totalHoursPending / allPendingClaims.length)
        : 0;

      return {
        totalPending,
        pendingOver24h,
        pendingOver48h,
        pendingOver72h,
        averageHoursPending,
        managersPendingReview: uniqueManagers.length
      };

    } catch (error) {
      console.error('Failed to get pending claim stats:', error);
      return {
        totalPending: 0,
        pendingOver24h: 0,
        pendingOver48h: 0,
        pendingOver72h: 0,
        averageHoursPending: 0,
        managersPendingReview: 0
      };
    }
  }

  /**
   * Check if reminder system should run (every 6 hours)
   */
  static shouldRunReminders(): boolean {
    const hour = new Date().getHours();
    return hour % 6 === 0; // Run at 0:00, 6:00, 12:00, 18:00
  }

  /**
   * Manual trigger for testing purposes
   */
  static async triggerReminders(): Promise<void> {
    console.log('[TENANT_REMINDER] Manual reminder trigger activated');
    await this.sendPendingClaimReminders();
  }
}
