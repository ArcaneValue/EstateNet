import { prisma } from '../utils/database';

export interface AuditLogData {
  entityType: string;
  entityId: string;
  action: string;
  performedByUserId: string;
  previousState?: any;
  newState: any;
  metadata?: any;
  ipAddress?: string;
}

export class AuditLogService {
  
  /**
   * Create an immutable audit log entry
   * Never update or delete audit logs - append only for legal compliance
   */
  static async createAuditLog(data: AuditLogData): Promise<void> {
    try {
      await prisma.auditLog.create({
        data: {
          entityType: data.entityType,
          entityId: data.entityId,
          action: data.action,
          performedByUserId: data.performedByUserId,
          previousState: data.previousState || null,
          newState: data.newState,
          metadata: data.metadata || null,
          ipAddress: data.ipAddress || null,
          createdAt: new Date()
        }
      });
    } catch (error) {
      console.error('Failed to create audit log:', error);
      // Don't throw - audit logging should not break business operations
    }
  }

  /**
   * Log payment claim creation
   */
  static async logPaymentClaimCreated(
    claimId: string, 
    claimData: any, 
    performedByUserId: string, 
    ipAddress?: string
  ): Promise<void> {
    await this.createAuditLog({
      entityType: 'PAYMENT_CLAIM',
      entityId: claimId,
      action: 'CREATED',
      performedByUserId,
      newState: claimData,
      metadata: {
        tenantId: claimData.tenantId,
        leaseId: claimData.leaseId,
        amount: claimData.amount,
        method: claimData.method
      },
      ipAddress
    });
  }

  /**
   * Log payment claim verification/rejection
   */
  static async logPaymentClaimVerified(
    claimId: string,
    previousState: any,
    newState: any,
    decision: 'VERIFIED' | 'REJECTED',
    performedByUserId: string,
    managerNote?: string,
    ipAddress?: string
  ): Promise<void> {
    await this.createAuditLog({
      entityType: 'PAYMENT_CLAIM',
      entityId: claimId,
      action: decision,
      performedByUserId,
      previousState,
      newState,
      metadata: {
        decision,
        managerNote,
        amount: newState.amount,
        tenantId: newState.tenantId
      },
      ipAddress
    });
  }

  /**
   * Get audit history for a specific payment claim
   */
  static async getPaymentClaimHistory(claimId: string): Promise<any[]> {
    try {
      const auditLogs = await prisma.auditLog.findMany({
        where: {
          entityType: 'PAYMENT_CLAIM',
          entityId: claimId
        },
        include: {
          performedByUser: {
            select: {
              id: true,
              name: true,
              role: true
            }
          }
        },
        orderBy: {
          createdAt: 'asc'
        }
      });

      return auditLogs.map(log => ({
        id: log.id,
        action: log.action,
        performedBy: log.performedByUser,
        previousState: log.previousState,
        newState: log.newState,
        metadata: log.metadata,
        ipAddress: log.ipAddress,
        createdAt: log.createdAt
      }));
    } catch (error) {
      console.error('Failed to get payment claim history:', error);
      return [];
    }
  }

  /**
   * Get audit history for a specific user (for compliance investigations)
   */
  static async getUserAuditHistory(
    userId: string, 
    limit: number = 100
  ): Promise<any[]> {
    try {
      const auditLogs = await prisma.auditLog.findMany({
        where: {
          performedByUserId: userId
        },
        include: {
          performedByUser: {
            select: {
              id: true,
              name: true,
              role: true
            }
          }
        },
        orderBy: {
          createdAt: 'desc'
        },
        take: limit
      });

      return auditLogs.map(log => ({
        id: log.id,
        entityType: log.entityType,
        entityId: log.entityId,
        action: log.action,
        metadata: log.metadata,
        ipAddress: log.ipAddress,
        createdAt: log.createdAt
      }));
    } catch (error) {
      console.error('Failed to get user audit history:', error);
      return [];
    }
  }
}
