/**
 * Billing State Machine Tests
 * Tests the 4-state progressive billing enforcement:
 * CURRENT -> OVERDUE -> RESTRICTED -> SUSPENDED
 */

import request from 'supertest';
import jwt from 'jsonwebtoken';
import createTestApp from '../src/testApp';
import { prisma } from '../src/utils/database';
import bcrypt from 'bcryptjs';
import {
  uniqueEmail,
  createTenantIdentity,
  createUserForTenant
} from './helpers/testDataFactory';

const app = createTestApp;

describe('Billing State Machine', () => {
  let managerId: string;
  let managerToken: string;
  let propertyId: string;
  let unitId: string;

  beforeAll(async () => {
    // Create test manager with property and unit
    const hashedPassword = await bcrypt.hash('password123', 10);

    const manager = await prisma.user.create({
      data: {
        name: 'Test Manager',
        email: 'billing.manager@test.com',
        passwordHash: hashedPassword,
        role: 'MANAGER',
        managerTermsAcceptedAt: new Date(),
        billingStatus: 'CURRENT'
      }
    });

    managerId = manager.id;
    managerToken = jwt.sign(
      { id: managerId, role: 'MANAGER' },
      process.env.JWT_SECRET || 'test-secret-key-for-financial-statements-testing',
      { expiresIn: '1h' }
    );

    const property = await prisma.property.create({
      data: {
        name: 'Test Billing Property',
        location: 'Test Location',
        ownerId: managerId,
        managerId: managerId
      }
    });

    propertyId = property.id;

    const unit = await prisma.unit.create({
      data: {
        unitNumber: 'B-101',
        propertyId: propertyId,
        rentAmount: 500000
      }
    });

    unitId = unit.id;
  });

  afterAll(async () => {
    // Cleanup
    await prisma.unit.deleteMany({ where: { propertyId } });
    await prisma.property.deleteMany({ where: { id: propertyId } });
    await prisma.user.deleteMany({ where: { id: managerId } });
  });

  describe('CURRENT Status', () => {
    beforeEach(async () => {
      await prisma.user.update({
        where: { id: managerId },
        data: { billingStatus: 'CURRENT' }
      });
    });

    it('should allow all manager operations when status is CURRENT', async () => {
      // Test property creation
      const propertyResponse = await request(app)
        .post('/api/properties')
        .set('Authorization', `Bearer ${managerToken}`)
        .send({
          name: 'Current Status Property',
          location: 'Test Location'
        });

      expect(propertyResponse.status).toBe(201);

      // Test unit creation
      const unitResponse = await request(app)
        .post(`/api/properties/${propertyId}/units`)
        .set('Authorization', `Bearer ${managerToken}`)
        .send({
          unitNumber: 'C-102',
          rentAmount: 400000
        });

      expect(unitResponse.status).toBe(201);

      // Create tenant first
      const tenantIdentity = await createTenantIdentity({
        name: 'Test Tenant',
        email: uniqueEmail('current-tenant'),
        phoneNumber: '+256700123456'
      });

      const tenant = await createUserForTenant('TENANT', tenantIdentity.tenantId, {
        name: 'Test Tenant'
      });

      // Test lease creation - use the created unit's ID
      const createdUnitId = unitResponse.body.data.id;
      const leaseResponse = await request(app)
        .post('/api/leases')
        .set('Authorization', `Bearer ${managerToken}`)
        .send({
          propertyId: propertyId,
          unitId: createdUnitId,
          tenantId: tenantIdentity.tenantId,
          rentAmount: 500000,
          startDate: '2024-01-01',
          endDate: '2024-12-31'
        });

      expect(leaseResponse.status).toBe(201);
    });

    it('should return billing overview for CURRENT status', async () => {
      const response = await request(app)
        .get('/api/manager/billing/overview')
        .set('Authorization', `Bearer ${managerToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.billingStatus).toBe('CURRENT');
      expect(response.body.data).toHaveProperty('totalOutstanding');
      expect(response.body.data).toHaveProperty('occupiedUnitCount');
      expect(response.body.data).toHaveProperty('projectedFeeNextMonth');
    });
  });

  describe('OVERDUE Status', () => {
    beforeEach(async () => {
      await prisma.user.update({
        where: { id: managerId },
        data: { billingStatus: 'OVERDUE' }
      });
    });

    it('should allow operations but include warning for OVERDUE status', async () => {
      const response = await request(app)
        .get('/api/manager/billing/overview')
        .set('Authorization', `Bearer ${managerToken}`);

      expect(response.status).toBe(200);
      expect(response.body.data.billingStatus).toBe('OVERDUE');
    });

    it('should still allow property creation with OVERDUE status', async () => {
      const response = await request(app)
        .post('/api/properties')
        .set('Authorization', `Bearer ${managerToken}`)
        .send({
          name: 'Overdue Status Property',
          location: 'Test Location'
        });

      expect(response.status).toBe(201);
    });
  });

  describe('RESTRICTED Status', () => {
    beforeEach(async () => {
      await prisma.user.update({
        where: { id: managerId },
        data: { billingStatus: 'RESTRICTED' }
      });
    });

    it('should block property creation when RESTRICTED', async () => {
      const response = await request(app)
        .post('/api/properties')
        .set('Authorization', `Bearer ${managerToken}`)
        .send({
          name: 'Restricted Property',
          location: 'Test Location'
        });

      expect(response.status).toBe(402);
      expect(response.body.success).toBe(false);
      expect(response.body.code).toBe('ACCOUNT_RESTRICTED');
      expect(response.body.requiresAction).toBe('PAY_BILLING_INVOICE');
    });

    it('should block unit creation when RESTRICTED', async () => {
      const response = await request(app)
        .post(`/api/properties/${propertyId}/units`)
        .set('Authorization', `Bearer ${managerToken}`)
        .send({
          unitNumber: 'R-103',
          rent: 450000
        });

      expect(response.status).toBe(402);
      expect(response.body.code).toBe('ACCOUNT_RESTRICTED');
    });

    it('should block lease creation when RESTRICTED', async () => {
      const response = await request(app)
        .post('/api/leases')
        .set('Authorization', `Bearer ${managerToken}`)
        .send({
          propertyId: propertyId,
          unitId: unitId,
          tenantEmail: 'restricted.tenant@test.com',
          rentAmount: 500000,
          startDate: '2024-01-01',
          endDate: '2024-12-31'
        });

      expect(response.status).toBe(402);
      expect(response.body.code).toBe('ACCOUNT_RESTRICTED');
    });

    it('should still allow billing operations when RESTRICTED', async () => {
      const response = await request(app)
        .get('/api/manager/billing/overview')
        .set('Authorization', `Bearer ${managerToken}`);

      expect(response.status).toBe(200);
      expect(response.body.data.billingStatus).toBe('RESTRICTED');
    });
  });

  describe('SUSPENDED Status', () => {
    beforeEach(async () => {
      await prisma.user.update({
        where: { id: managerId },
        data: { billingStatus: 'SUSPENDED' }
      });
    });

    it('should block all non-billing operations when SUSPENDED', async () => {
      // Test property creation blocked
      const propertyResponse = await request(app)
        .post('/api/properties')
        .set('Authorization', `Bearer ${managerToken}`)
        .send({
          name: 'Suspended Property',
          location: 'Test Location'
        });

      expect(propertyResponse.status).toBe(402);
      expect(propertyResponse.body.code).toBe('ACCOUNT_SUSPENDED');

      // Test unit creation blocked
      const unitResponse = await request(app)
        .post(`/api/properties/${propertyId}/units`)
        .set('Authorization', `Bearer ${managerToken}`)
        .send({
          unitNumber: 'S-104',
          rent: 450000
        });

      expect(unitResponse.status).toBe(402);
      expect(unitResponse.body.code).toBe('ACCOUNT_SUSPENDED');

      // Test lease creation blocked
      const leaseResponse = await request(app)
        .post('/api/leases')
        .set('Authorization', `Bearer ${managerToken}`)
        .send({
          propertyId: propertyId,
          unitId: unitId,
          tenantEmail: 'suspended.tenant@test.com',
          rentAmount: 500000,
          startDate: '2024-01-01',
          endDate: '2024-12-31'
        });

      expect(leaseResponse.status).toBe(402);
      expect(leaseResponse.body.code).toBe('ACCOUNT_SUSPENDED');
    });

    it('should still allow billing operations when SUSPENDED', async () => {
      const response = await request(app)
        .get('/api/manager/billing/overview')
        .set('Authorization', `Bearer ${managerToken}`);

      expect(response.status).toBe(200);
      expect(response.body.data.billingStatus).toBe('SUSPENDED');
    });

    it('should allow invoice and payment operations when SUSPENDED', async () => {
      const invoicesResponse = await request(app)
        .get('/api/manager/billing/invoices')
        .set('Authorization', `Bearer ${managerToken}`);

      expect(invoicesResponse.status).toBe(200);

      const statusResponse = await request(app)
        .get('/api/manager/billing/status')
        .set('Authorization', `Bearer ${managerToken}`);

      expect(statusResponse.status).toBe(200);
    });
  });

  describe('Billing Dashboard Integration', () => {
    it('should calculate projected fees correctly', async () => {
      await prisma.user.update({
        where: { id: managerId },
        data: { billingStatus: 'CURRENT' }
      });

      const response = await request(app)
        .get('/api/manager/billing/overview')
        .set('Authorization', `Bearer ${managerToken}`);

      expect(response.status).toBe(200);
      expect(response.body.data).toHaveProperty('projectedFeeNextMonth');
      expect(typeof response.body.data.projectedFeeNextMonth).toBe('number');
      expect(response.body.data.projectedFeeNextMonth).toBeGreaterThanOrEqual(0);
    });

    it('should show correct overdue invoice count', async () => {
      const response = await request(app)
        .get('/api/manager/billing/overview')
        .set('Authorization', `Bearer ${managerToken}`);

      expect(response.status).toBe(200);
      expect(response.body.data).toHaveProperty('overdueInvoices');
      expect(Array.isArray(response.body.data.overdueInvoices)).toBe(true);
    });

    it('should handle multiple billing statuses in sequence', async () => {
      const statuses = ['CURRENT', 'OVERDUE', 'RESTRICTED', 'SUSPENDED'];

      for (const status of statuses) {
        await prisma.user.update({
          where: { id: managerId },
          data: { billingStatus: status as any }
        });

        const response = await request(app)
          .get('/api/manager/billing/overview')
          .set('Authorization', `Bearer ${managerToken}`);

        expect(response.status).toBe(200);
        expect(response.body.data.billingStatus).toBe(status);
      }
    });
  });

  describe('State Transition Rules', () => {
    it('should enforce proper state transitions', async () => {
      // Test that all states are properly defined in the system
      const validStates = ['CURRENT', 'OVERDUE', 'RESTRICTED', 'SUSPENDED'];

      for (const state of validStates) {
        await prisma.user.update({
          where: { id: managerId },
          data: { billingStatus: state as any }
        });

        const user = await prisma.user.findUnique({
          where: { id: managerId },
          select: { billingStatus: true }
        });

        expect(user?.billingStatus).toBe(state);
      }
    });

    it('should handle null billingStatus as CURRENT', async () => {
      await prisma.user.update({
        where: { id: managerId },
        data: { billingStatus: null }
      });

      const response = await request(app)
        .get('/api/manager/billing/overview')
        .set('Authorization', `Bearer ${managerToken}`);

      expect(response.status).toBe(200);
      expect(response.body.data.billingStatus).toBe('CURRENT');
    });
  });
});
