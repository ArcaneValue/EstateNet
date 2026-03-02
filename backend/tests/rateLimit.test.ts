/**
 * Rate Limiting Tests
 * Tests the 5 claims per hour rate limiting system for tenants
 */

import request from 'supertest';
import jwt from 'jsonwebtoken';
import createTestApp from '../src/testApp';
import { prisma } from '../src/utils/database';
import { RateLimitService } from '../src/services/rateLimitService';
import bcrypt from 'bcryptjs';
import {
  uniqueEmail,
  createTenantIdentity,
  createUserForTenant,
  createLeaseForTenant,
  createPropertyWithUnit
} from './helpers/testDataFactory';

const app = createTestApp;

describe('Rate Limiting System', () => {
  let managerId: string;
  let tenantId: string;
  let tenantIdentityId: string;
  let leaseId: string;
  let tenantToken: string;
  let managerToken: string;

  beforeAll(async () => {
    // Create manager
    const manager = await createUserForTenant('MANAGER', '', {
      managerTermsAcceptedAt: new Date(),
      billingStatus: 'CURRENT'
    });
    managerId = manager.id;

    // Create tenant identity first
    const tenantIdentity = await createTenantIdentity({
      name: 'Rate Limit Test Tenant',
      email: uniqueEmail('ratelimit-tenant')
    });

    // Create tenant user
    const tenant = await createUserForTenant('TENANT', tenantIdentity.tenantId);
    tenantId = tenant.id;
    tenantIdentityId = tenantIdentity.tenantId;

    // Create property, unit, and lease
    const { property, unit } = await createPropertyWithUnit(
      managerId,
      managerId,
      {
        propertyName: 'Rate Limit Test Property',
        unitNumber: '101-A'
      }
    );

    // Create lease
    const lease = await createLeaseForTenant(tenantIdentityId, property.id, unit.id, {
      rentAmount: 500000
    });
    leaseId = lease.id;

    // Generate tokens
    managerToken = jwt.sign(
      { id: managerId, role: 'MANAGER' },
      process.env.JWT_SECRET || 'test-secret-key-for-financial-statements-testing',
      { expiresIn: '1h' }
    );

    tenantToken = jwt.sign(
      { id: tenantId, role: 'TENANT', tenantId: tenantIdentityId },
      process.env.JWT_SECRET || 'test-secret-key-for-financial-statements-testing',
      { expiresIn: '1h' }
    );
  });

  describe('Rate Limit Service', () => {
    beforeEach(async () => {
      // Clean up previous claims to reset rate limit
      await prisma.paymentClaim.deleteMany({});
    });

    it('should allow claims within rate limit', async () => {
      const rateLimitCheck = await RateLimitService.checkPaymentClaimRateLimit(managerId);

      expect(rateLimitCheck.allowed).toBe(true);
      expect(rateLimitCheck.remaining).toBe(5); // 5 claims per hour limit
    });

    it('should track claim count correctly', async () => {
      // Create 3 test claims
      for (let i = 0; i < 3; i++) {
        await prisma.paymentClaim.create({
          data: {
            tenantId: tenantIdentityId,
            leaseId,
            managerId,
            amount: 100000 + i * 10000,
            claimedPaidAt: new Date(),
            method: 'CASH',
            status: 'PENDING',
            flagged: false
          }
        });
      }

      const rateLimitCheck = await RateLimitService.checkPaymentClaimRateLimit(tenantIdentityId);

      expect(rateLimitCheck.allowed).toBe(true);
      expect(rateLimitCheck.remaining).toBe(2); // 5 - 3 = 2 remaining
    });

    it('should block claims when limit exceeded', async () => {
      // Create 5 test claims to hit the limit
      for (let i = 0; i < 5; i++) {
        await prisma.paymentClaim.create({
          data: {
            tenantId: tenantIdentityId,
            leaseId,
            managerId,
            amount: 100000 + i * 10000,
            claimedPaidAt: new Date(),
            method: 'CASH',
            status: 'PENDING',
            flagged: false
          }
        });
      }

      const rateLimitCheck = await RateLimitService.checkPaymentClaimRateLimit(tenantIdentityId);

      expect(rateLimitCheck.allowed).toBe(false);
      expect(rateLimitCheck.remaining).toBe(0);
    });

    it('should reset limit after time window', async () => {
      // Create claims with old timestamp (>1 hour ago)
      const oldTimestamp = new Date(Date.now() - 2 * 60 * 60 * 1000); // 2 hours ago

      for (let i = 0; i < 5; i++) {
        await prisma.paymentClaim.create({
          data: {
            tenantId: tenantIdentityId,
            leaseId,
            managerId,
            amount: 100000 + i * 10000,
            claimedPaidAt: oldTimestamp,
            method: 'CASH',
            status: 'PENDING',
            flagged: false,
            createdAt: oldTimestamp
          }
        });
      }

      const rateLimitCheck = await RateLimitService.checkPaymentClaimRateLimit(tenantIdentityId);

      // Should allow new claims since old ones are outside the 1-hour window
      expect(rateLimitCheck.allowed).toBe(true);
      expect(rateLimitCheck.remaining).toBe(5);
    });

    afterEach(async () => {
      // Clean up claims created by service tests
      await prisma.paymentClaim.deleteMany({});
    });
  });

  describe('Rate Limit Middleware', () => {
    let testLeases: string[] = [];

    beforeEach(async () => {
      // Clean up previous claims and verifications
      await prisma.paymentClaim.deleteMany({
        where: { tenantId: tenantIdentityId }
      });
      await prisma.paymentClaimVerification.deleteMany({
        where: {
          claim: {
            tenantId: tenantIdentityId
          }
        }
      });

      // Create multiple leases for rate limit testing
      testLeases = [];
      for (let i = 0; i < 6; i++) {
        const { property, unit } = await createPropertyWithUnit(
          managerId,
          managerId,
          {
            propertyName: `Rate Limit Test Property ${i}`,
            unitNumber: `${i + 1}01-A`
          }
        );

        const lease = await createLeaseForTenant(tenantIdentityId, property.id, unit.id, {
          rentAmount: 500000
        });
        testLeases.push(lease.id);
      }
    });

    it('should allow first 5 claims across different leases', async () => {
      // Submit 5 claims on different leases - all should succeed
      for (let i = 0; i < 5; i++) {
        const response = await request(app)
          .post('/api/tenant/payment-claims')
          .set('Authorization', `Bearer ${tenantToken}`)
          .send({
            leaseId: testLeases[i],
            amount: 500000,
            claimedPaidAt: new Date().toISOString(),
            method: 'CASH',
            referenceText: `Rate limit test claim ${i + 1}`
          });

        expect(response.status).toBe(201);
        expect(response.headers['x-ratelimit-limit']).toBe('5');
        expect(parseInt(response.headers['x-ratelimit-remaining'])).toBe(5 - i);
      }
    });

    it('should reject duplicate claims with 409', async () => {
      // First claim should succeed
      const firstResponse = await request(app)
        .post('/api/tenant/payment-claims')
        .set('Authorization', `Bearer ${tenantToken}`)
        .send({
          leaseId: testLeases[0],
          amount: 500000,
          claimedPaidAt: new Date().toISOString(),
          method: 'CASH',
          referenceText: 'Duplicate test 1'
        });

      expect(firstResponse.status).toBe(201);

      // Second claim on same lease should fail with duplicate
      const duplicateResponse = await request(app)
        .post('/api/tenant/payment-claims')
        .set('Authorization', `Bearer ${tenantToken}`)
        .send({
          leaseId: testLeases[0],
          amount: 500000,
          claimedPaidAt: new Date().toISOString(),
          method: 'CASH',
          referenceText: 'Duplicate test 2'
        });

      expect(duplicateResponse.status).toBe(409);
      expect(duplicateResponse.body.code).toBe('DUPLICATE_CLAIM');
    });

    it('should return 429 when rate limit exceeded', async () => {
      // Submit 5 claims (within limit) on different leases
      for (let i = 0; i < 5; i++) {
        const response = await request(app)
          .post('/api/tenant/payment-claims')
          .set('Authorization', `Bearer ${tenantToken}`)
          .send({
            leaseId: testLeases[i],
            amount: 500000,
            claimedPaidAt: new Date().toISOString(),
            method: 'CASH',
            referenceText: `Rate limit setup ${i + 1}`
          });

        expect(response.status).toBe(201);
        expect(response.headers['x-ratelimit-limit']).toBe('5');
        expect(parseInt(response.headers['x-ratelimit-remaining'])).toBe(5 - i);
      }

      // 6th claim should be rate limited
      const response = await request(app)
        .post('/api/tenant/payment-claims')
        .set('Authorization', `Bearer ${tenantToken}`)
        .send({
          leaseId: testLeases[5],
          amount: 500000,
          claimedPaidAt: new Date().toISOString(),
          method: 'CASH',
          referenceText: 'Rate limit exceeded test'
        });

      expect(response.status).toBe(429);
      expect(response.body.success).toBe(false);
      expect(response.body.code).toBe('RATE_LIMIT_EXCEEDED');
      expect(response.body.message).toContain('Too many payment claims');
      expect(response.body.rateLimit).toHaveProperty('limit');
      expect(response.body.rateLimit).toHaveProperty('remaining');
      expect(response.body.rateLimit).toHaveProperty('resetTime');
      expect(response.body.rateLimit).toHaveProperty('retryAfterSeconds');
    });

    it('should not apply rate limiting to managers', async () => {
      const managerToken = jwt.sign(
        { id: managerId, role: 'MANAGER' },
        process.env.JWT_SECRET || 'test-secret-key-for-financial-statements-testing',
        { expiresIn: '1h' }
      );

      // Manager endpoints should not be rate limited
      const response = await request(app)
        .get('/api/manager/payment-claims')
        .set('Authorization', `Bearer ${managerToken}`);

      expect(response.status).toBe(200);
      // No rate limit headers should be present for managers
      expect(response.headers['x-ratelimit-limit']).toBeUndefined();
    });

    it('should handle rate limit gracefully on service errors', async () => {
      // Test with invalid tenant ID to trigger error handling
      const invalidToken = jwt.sign(
        { id: 'invalid-id', role: 'TENANT', tenantId: 'invalid-id' },
        process.env.JWT_SECRET || 'test-secret-key-for-financial-statements-testing',
        { expiresIn: '1h' }
      );

      const response = await request(app)
        .post('/api/tenant/payment-claims')
        .set('Authorization', `Bearer ${invalidToken}`)
        .send({
          leaseId,
          amount: 500000,
          claimedPaidAt: new Date().toISOString(), // Current date
          method: 'CASH',
          referenceText: 'Error handling test'
        });

      // Should fail for other reasons (invalid data), not rate limiting
      expect(response.status).not.toBe(429);
    });

    afterEach(async () => {
      // Clean up claims after each rate limit test
      await prisma.paymentClaim.deleteMany({ where: { leaseId } });
    });
  });

  describe('Rate Limit Performance', () => {
    it('should handle rate limit checks efficiently', async () => {
      const startTime = Date.now();

      // Run 100 concurrent rate limit checks
      const checks = Array.from({ length: 100 }, () =>
        RateLimitService.checkPaymentClaimRateLimit(tenantIdentityId)
      );

      const results = await Promise.all(checks);
      const endTime = Date.now();

      // All checks should complete in reasonable time
      expect(endTime - startTime).toBeLessThan(5000); // 5 seconds max

      // All checks should return same result for same tenant
      const firstResult = results[0];
      results.forEach(result => {
        expect(result.allowed).toBe(firstResult.allowed);
        expect(result.remaining).toBe(firstResult.remaining);
      });
    });

    it('should handle multiple tenant rate limits independently', async () => {
      // Create another tenant
      const tenant2Identity = await createTenantIdentity({
        name: 'Rate Limit Test Tenant 2',
        email: uniqueEmail('ratelimit-tenant2')
      });

      const tenant2 = await createUserForTenant('TENANT', tenant2Identity.tenantId, {
        name: 'Rate Limit Test Tenant 2'
      });

      const tenant1Check = await RateLimitService.checkPaymentClaimRateLimit(tenantIdentityId);
      const tenant2Check = await RateLimitService.checkPaymentClaimRateLimit(tenant2Identity.tenantId);

      // Both tenants should have independent limits
      expect(tenant1Check.allowed).toBe(true);
      expect(tenant2Check.allowed).toBe(true);
      expect(tenant1Check.remaining).toBe(5);
      expect(tenant2Check.remaining).toBe(5);

      // Cleanup
      await prisma.user.delete({ where: { id: tenant2.id } });
    });
  });

  afterAll(async () => {
    // Cleanup test data - filter out undefined values
    const userIds = [managerId, tenantId].filter((id): id is string => id !== undefined);

    await prisma.paymentClaim.deleteMany({});
    if (leaseId) await prisma.lease.deleteMany({ where: { id: leaseId } });
    if (managerId) {
      const properties = await prisma.property.findMany({ where: { managerId }, select: { id: true } });
      if (properties.length > 0) {
        await prisma.unit.deleteMany({ where: { propertyId: { in: properties.map(p => p.id) } } });
        await prisma.property.deleteMany({ where: { managerId } });
      }
    }
    if (tenantIdentityId) await prisma.tenantIdentity.deleteMany({ where: { tenantId: tenantIdentityId } });
    if (userIds.length > 0) await prisma.user.deleteMany({ where: { id: { in: userIds } } });
  });
});
