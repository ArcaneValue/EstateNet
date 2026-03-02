import { prisma } from '../utils/database';

interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  resetTime: Date;
}

export class RateLimitService {
  private static readonly RATE_LIMIT = 5; // 5 claims per hour per tenant
  private static readonly WINDOW_MS = 60 * 60 * 1000; // 1 hour in milliseconds

  /**
   * Check if tenant can submit a payment claim (5 per hour limit)
   */
  static async checkPaymentClaimRateLimit(tenantId: string): Promise<RateLimitResult> {
    try {
      const windowStart = new Date(Date.now() - this.WINDOW_MS);
      
      // Count claims in the last hour
      const recentClaims = await prisma.paymentClaim.count({
        where: {
          tenantId,
          createdAt: {
            gte: windowStart
          }
        }
      });

      const remaining = Math.max(0, this.RATE_LIMIT - recentClaims);
      const allowed = recentClaims < this.RATE_LIMIT;

      // Calculate reset time (start of next hour)
      const resetTime = new Date();
      resetTime.setHours(resetTime.getHours() + 1, 0, 0, 0);

      return {
        allowed,
        remaining,
        resetTime
      };
    } catch (error) {
      console.error('Rate limit check failed:', error);
      // Fail open - allow the request if we can't check
      return {
        allowed: true,
        remaining: this.RATE_LIMIT,
        resetTime: new Date(Date.now() + this.WINDOW_MS)
      };
    }
  }

  /**
   * Middleware function to enforce payment claim rate limits
   */
  static rateLimitMiddleware() {
    return async (req: any, res: any, next: any) => {
      try {
        // Only apply to tenant payment claim creation
        if (!req.user || req.user.role !== 'TENANT') {
          return next();
        }

        const tenantId = req.user.tenantId || req.user.id;
        const rateLimit = await this.checkPaymentClaimRateLimit(tenantId);

        if (!rateLimit.allowed) {
          const retryAfterSeconds = Math.ceil((rateLimit.resetTime.getTime() - Date.now()) / 1000);
          
          res.set({
            'X-RateLimit-Limit': this.RATE_LIMIT.toString(),
            'X-RateLimit-Remaining': '0',
            'X-RateLimit-Reset': Math.ceil(rateLimit.resetTime.getTime() / 1000).toString(),
            'Retry-After': retryAfterSeconds.toString()
          });

          res.status(429).json({
            success: false,
            code: 'RATE_LIMIT_EXCEEDED',
            message: `Too many payment claims. Limit: ${this.RATE_LIMIT} per hour. Try again in ${Math.ceil(retryAfterSeconds / 60)} minutes.`,
            rateLimit: {
              limit: this.RATE_LIMIT,
              remaining: 0,
              resetTime: rateLimit.resetTime,
              retryAfterSeconds
            }
          });
          return;
        }

        // Add rate limit headers for successful requests
        res.set({
          'X-RateLimit-Limit': this.RATE_LIMIT.toString(),
          'X-RateLimit-Remaining': rateLimit.remaining.toString(),
          'X-RateLimit-Reset': Math.ceil(rateLimit.resetTime.getTime() / 1000).toString()
        });

        next();
      } catch (error) {
        console.error('Rate limit middleware error:', error);
        // Fail open - allow the request
        next();
      }
    };
  }
}
