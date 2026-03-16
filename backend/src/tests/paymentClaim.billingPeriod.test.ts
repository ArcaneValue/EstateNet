/**
 * Payment Claim Billing Period Duplicate Enforcement Tests
 * 
 * Policy: One active claim per lease per billing period (YYYY-MM)
 * 
 * Tests verify:
 * 1. Same lease + same month -> 2nd claim blocked (409)
 * 2. Same lease + different month -> both claims allowed (201)
 * 3. Billing period correctly derived from claimedPaidAt
 */

import request from 'supertest';
import { prisma } from '../utils/database';

const BASE_URL = 'http://localhost:3001';

describe('Payment Claim Billing Period Enforcement', () => {
  let tenantToken: string;
  let tenantId: string;
  let leaseId: string;
  let managerToken: string;

  beforeAll(async () => {
    // Login as tenant
    const tenantLogin = await request(BASE_URL)
      .post('/api/auth/login')
      .send({ email: 'innocent@gmail.com', password: 'Ak47grave' });
    
    tenantToken = tenantLogin.body.data.token;
    tenantId = tenantLogin.body.data.user.tenantId;

    // Login as manager
    const managerLogin = await request(BASE_URL)
      .post('/api/auth/login')
      .send({ email: 'mark@gmail.com', password: 'Ak47grave' });
    
    managerToken = managerLogin.body.data.token;

    // Get an active lease for the tenant
    const lease = await prisma.lease.findFirst({
      where: { tenantId, status: 'ACTIVE' },
      include: { property: true }
    });

    if (!lease) {
      throw new Error('No active lease found for tenant');
    }

    leaseId = lease.id;

    // Clean up any existing claims for this lease to ensure clean test state
    await prisma.paymentClaim.deleteMany({
      where: { leaseId }
    });
  });

  afterAll(async () => {
    // Clean up test claims
    await prisma.paymentClaim.deleteMany({
      where: { leaseId }
    });
  });

  describe('Same Billing Period Enforcement', () => {
    it('should allow first claim for a billing period', async () => {
      const response = await request(BASE_URL)
        .post('/api/tenant/payment-claims')
        .set('Authorization', `Bearer ${tenantToken}`)
        .send({
          leaseId,
          amount: 950000,
          claimedPaidAt: '2026-04-15T08:00:00.000Z', // April 2026
          method: 'BANK_TRANSFER',
          referenceText: 'TEST-APRIL-001'
        });

      expect(response.status).toBe(201);
      expect(response.body.success).toBe(true);
      expect(response.body.data.billingPeriod).toBe('2026-04');
      expect(response.body.data.status).toBe('PENDING');
    });

    it('should block second claim for same billing period (same month)', async () => {
      const response = await request(BASE_URL)
        .post('/api/tenant/payment-claims')
        .set('Authorization', `Bearer ${tenantToken}`)
        .send({
          leaseId,
          amount: 950000,
          claimedPaidAt: '2026-04-20T08:00:00.000Z', // Same month (April 2026)
          method: 'CASH',
          referenceText: 'TEST-APRIL-002'
        });

      expect(response.status).toBe(409);
      expect(response.body.success).toBe(false);
      expect(response.body.code).toBe('DUPLICATE_CLAIM');
      expect(response.body.message).toContain('2026-04');
      expect(response.body.data.billingPeriod).toBe('2026-04');
    });
  });

  describe('Different Billing Period Allowance', () => {
    it('should allow claim for different billing period (different month)', async () => {
      const response = await request(BASE_URL)
        .post('/api/tenant/payment-claims')
        .set('Authorization', `Bearer ${tenantToken}`)
        .send({
          leaseId,
          amount: 950000,
          claimedPaidAt: '2026-05-15T08:00:00.000Z', // May 2026 (different month)
          method: 'MTN',
          referenceText: 'TEST-MAY-001'
        });

      expect(response.status).toBe(201);
      expect(response.body.success).toBe(true);
      expect(response.body.data.billingPeriod).toBe('2026-05');
      expect(response.body.data.status).toBe('PENDING');
    });

    it('should allow claim for yet another billing period', async () => {
      const response = await request(BASE_URL)
        .post('/api/tenant/payment-claims')
        .set('Authorization', `Bearer ${tenantToken}`)
        .send({
          leaseId,
          amount: 950000,
          claimedPaidAt: '2026-06-10T08:00:00.000Z', // June 2026
          method: 'AIRTEL',
          referenceText: 'TEST-JUNE-001'
        });

      expect(response.status).toBe(201);
      expect(response.body.success).toBe(true);
      expect(response.body.data.billingPeriod).toBe('2026-06');
    });
  });

  describe('After Verification - New Period Allowed', () => {
    let aprilClaimId: string;

    beforeAll(async () => {
      // Get the April claim
      const aprilClaim = await prisma.paymentClaim.findFirst({
        where: { leaseId, billingPeriod: '2026-04' }
      });
      aprilClaimId = aprilClaim!.id;
    });

    it('should verify April claim', async () => {
      const response = await request(BASE_URL)
        .post(`/api/manager/payment-claims/${aprilClaimId}/verify`)
        .set('Authorization', `Bearer ${managerToken}`)
        .send({
          decision: 'VERIFIED',
          note: 'Test verification'
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
    });

    it('should still block duplicate for April after verification', async () => {
      const response = await request(BASE_URL)
        .post('/api/tenant/payment-claims')
        .set('Authorization', `Bearer ${tenantToken}`)
        .send({
          leaseId,
          amount: 950000,
          claimedPaidAt: '2026-04-25T08:00:00.000Z', // Still April
          method: 'BANK_TRANSFER',
          referenceText: 'TEST-APRIL-003'
        });

      expect(response.status).toBe(409);
      expect(response.body.code).toBe('DUPLICATE_CLAIM');
      expect(response.body.data.existingStatus).toBe('VERIFIED');
    });

    it('should allow new claim for July (different period)', async () => {
      const response = await request(BASE_URL)
        .post('/api/tenant/payment-claims')
        .set('Authorization', `Bearer ${tenantToken}`)
        .send({
          leaseId,
          amount: 950000,
          claimedPaidAt: '2026-07-15T08:00:00.000Z', // July 2026
          method: 'BANK_TRANSFER',
          referenceText: 'TEST-JULY-001'
        });

      expect(response.status).toBe(201);
      expect(response.body.success).toBe(true);
      expect(response.body.data.billingPeriod).toBe('2026-07');
    });
  });

  describe('After Rejection - Same Period Allowed', () => {
    let mayClaimId: string;

    beforeAll(async () => {
      // Get the May claim
      const mayClaim = await prisma.paymentClaim.findFirst({
        where: { leaseId, billingPeriod: '2026-05' }
      });
      mayClaimId = mayClaim!.id;
    });

    it('should reject May claim', async () => {
      const response = await request(BASE_URL)
        .post(`/api/manager/payment-claims/${mayClaimId}/verify`)
        .set('Authorization', `Bearer ${managerToken}`)
        .send({
          decision: 'REJECTED',
          note: 'Test rejection'
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
    });

    it('should allow new claim for May after rejection', async () => {
      const response = await request(BASE_URL)
        .post('/api/tenant/payment-claims')
        .set('Authorization', `Bearer ${tenantToken}`)
        .send({
          leaseId,
          amount: 950000,
          claimedPaidAt: '2026-05-20T08:00:00.000Z', // May again
          method: 'CASH',
          referenceText: 'TEST-MAY-002'
        });

      expect(response.status).toBe(201);
      expect(response.body.success).toBe(true);
      expect(response.body.data.billingPeriod).toBe('2026-05');
    });
  });

  describe('Billing Period Derivation', () => {
    it('should correctly derive billing period from claimedPaidAt', async () => {
      const testCases = [
        { date: '2026-01-01T00:00:00.000Z', expected: '2026-01' },
        { date: '2026-12-31T23:59:59.999Z', expected: '2026-12' },
        { date: '2025-03-15T12:30:00.000Z', expected: '2025-03' },
      ];

      for (const testCase of testCases) {
        // Clean up first
        await prisma.paymentClaim.deleteMany({
          where: { leaseId, billingPeriod: testCase.expected }
        });

        const response = await request(BASE_URL)
          .post('/api/tenant/payment-claims')
          .set('Authorization', `Bearer ${tenantToken}`)
          .send({
            leaseId,
            amount: 950000,
            claimedPaidAt: testCase.date,
            method: 'BANK_TRANSFER',
            referenceText: `TEST-${testCase.expected}`
          });

        expect(response.status).toBe(201);
        expect(response.body.data.billingPeriod).toBe(testCase.expected);
      }
    });
  });
});
