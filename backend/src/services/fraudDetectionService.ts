import { prisma } from '../utils/database';

export interface FraudCheckResult {
  shouldFlag: boolean;
  reason?: string;
  riskScore: number;
  claimsLast24h: number;
}

export class FraudDetectionService {
  private static readonly FRAUD_THRESHOLD = 3; // >3 claims in 24h triggers fraud flag
  private static readonly WINDOW_24H = 24 * 60 * 60 * 1000; // 24 hours in milliseconds

  /**
   * Check if a payment claim should be flagged for potential fraud
   */
  static async checkForFraud(tenantId: string, claimAmount: number): Promise<FraudCheckResult> {
    try {
      const window24hStart = new Date(Date.now() - this.WINDOW_24H);
      
      // Count claims in the last 24 hours
      const claimsLast24h = await prisma.paymentClaim.count({
        where: {
          tenantId,
          createdAt: {
            gte: window24hStart
          }
        }
      });

      // Calculate risk score (0-100)
      let riskScore = 0;
      
      // Base risk on claim frequency
      if (claimsLast24h >= this.FRAUD_THRESHOLD) {
        riskScore += 40;
      } else if (claimsLast24h >= 2) {
        riskScore += 20;
      }

      // Add risk for high amounts (>500,000 UGX)
      if (claimAmount > 500000) {
        riskScore += 30;
      } else if (claimAmount > 200000) {
        riskScore += 15;
      }

      // Check for pattern of rejected claims (indicates repeated false claims)
      const recentRejected = await prisma.paymentClaim.count({
        where: {
          tenantId,
          status: 'REJECTED',
          createdAt: {
            gte: new Date(Date.now() - (7 * 24 * 60 * 60 * 1000)) // Last 7 days
          }
        }
      });

      if (recentRejected >= 2) {
        riskScore += 25;
      }

      // Determine if should flag
      const shouldFlag = claimsLast24h > this.FRAUD_THRESHOLD || riskScore >= 70;
      
      let reason = '';
      if (claimsLast24h > this.FRAUD_THRESHOLD) {
        reason = `Excessive claim frequency: ${claimsLast24h} claims in 24h (threshold: ${this.FRAUD_THRESHOLD})`;
      } else if (riskScore >= 70) {
        reason = `High risk score: ${riskScore}/100`;
      }

      return {
        shouldFlag,
        reason,
        riskScore,
        claimsLast24h
      };
    } catch (error) {
      console.error('Fraud detection check failed:', error);
      // Fail safe - don't flag on error
      return {
        shouldFlag: false,
        riskScore: 0,
        claimsLast24h: 0
      };
    }
  }

  /**
   * Get fraud statistics for a tenant (for manager review)
   */
  static async getTenantFraudStats(tenantId: string): Promise<{
    totalClaims: number;
    claimsLast24h: number;
    claimsLast7d: number;
    flaggedClaims: number;
    rejectedClaims: number;
    averageClaimAmount: number;
    riskLevel: 'LOW' | 'MEDIUM' | 'HIGH';
  }> {
    try {
      const now = new Date();
      const window24h = new Date(now.getTime() - this.WINDOW_24H);
      const window7d = new Date(now.getTime() - (7 * this.WINDOW_24H));

      const [
        totalClaims,
        claimsLast24h,
        claimsLast7d,
        flaggedClaims,
        rejectedClaims,
        claimAmounts
      ] = await Promise.all([
        prisma.paymentClaim.count({ where: { tenantId } }),
        prisma.paymentClaim.count({ 
          where: { tenantId, createdAt: { gte: window24h } } 
        }),
        prisma.paymentClaim.count({ 
          where: { tenantId, createdAt: { gte: window7d } } 
        }),
        prisma.paymentClaim.count({ 
          where: { tenantId, flagged: true } 
        }),
        prisma.paymentClaim.count({ 
          where: { tenantId, status: 'REJECTED' } 
        }),
        prisma.paymentClaim.findMany({
          where: { tenantId },
          select: { amount: true }
        })
      ]);

      const averageClaimAmount = claimAmounts.length > 0 
        ? Math.round(claimAmounts.reduce((sum, claim) => sum + claim.amount, 0) / claimAmounts.length)
        : 0;

      // Determine risk level
      let riskLevel: 'LOW' | 'MEDIUM' | 'HIGH' = 'LOW';
      if (claimsLast24h > this.FRAUD_THRESHOLD || flaggedClaims > 0 || rejectedClaims >= 3) {
        riskLevel = 'HIGH';
      } else if (claimsLast7d > 5 || rejectedClaims >= 2) {
        riskLevel = 'MEDIUM';
      }

      return {
        totalClaims,
        claimsLast24h,
        claimsLast7d,
        flaggedClaims,
        rejectedClaims,
        averageClaimAmount,
        riskLevel
      };
    } catch (error) {
      console.error('Failed to get tenant fraud stats:', error);
      return {
        totalClaims: 0,
        claimsLast24h: 0,
        claimsLast7d: 0,
        flaggedClaims: 0,
        rejectedClaims: 0,
        averageClaimAmount: 0,
        riskLevel: 'LOW'
      };
    }
  }

  /**
   * Get all flagged claims for manager review
   */
  static async getFlaggedClaims(managerId: string): Promise<any[]> {
    try {
      const flaggedClaims = await prisma.paymentClaim.findMany({
        where: {
          managerId,
          flagged: true,
          status: 'PENDING'
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
          createdAt: 'desc'
        }
      });

      return flaggedClaims.map(claim => ({
        id: claim.id,
        amount: claim.amount,
        method: claim.method,
        flagged: true,
        createdAt: claim.createdAt,
        tenant: claim.tenantIdentity,
        property: claim.lease.property.name,
        unit: claim.lease.unit.unitNumber
      }));
    } catch (error) {
      console.error('Failed to get flagged claims:', error);
      return [];
    }
  }
}
