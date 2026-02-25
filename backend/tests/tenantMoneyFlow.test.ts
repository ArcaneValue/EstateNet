/// <reference types="jest" />
import { describe, it, expect, beforeEach, afterEach, afterAll } from '@jest/globals';
import request from 'supertest';
import app from '../src/testApp';
import { prisma } from '../src/utils/database';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import { getCurrentBillingPeriod, validateBillingPeriod } from '../src/utils/billingPeriodHelpers';

// Test utilities
const createTestUser = async (role: string, email: string) => {
    const hashedPassword = await bcrypt.hash('TestPass123!', 10);
    const user = await prisma.user.create({
        data: {
            email,
            passwordHash: hashedPassword,
            name: `Test ${role}`,
            role: role as any
        }
    });

    if (role === 'TENANT') {
        await prisma.tenantIdentity.create({
            data: {
                tenantId: user.id,
                name: user.name,
                email: user.email
            }
        });
    }
    return user;
};

const createTestProperty = async (managerId: string, name: string) => {
    return await prisma.property.create({
        data: {
            name,
            location: 'Test Location',
            ownerId: managerId,
            managerId
        }
    });
};

const createTestUnit = async (propertyId: string, unitNumber: string) => {
    return await prisma.unit.create({
        data: {
            unitNumber,
            propertyId,
            rentAmount: 800000
        }
    });
};

const createTestLease = async (data: any) => {
    return await (prisma as any).lease.create({
        data: {
            tenantId: data.tenantId,
            propertyId: data.propertyId,
            unitId: data.unitId,
            rentAmount: data.rentAmount,
            startDate: data.startDate,
            status: data.status || 'ACTIVE'
        }
    });
};

const createTestPayment = async (data: any) => {
    return await (prisma as any).payment.create({
        data: {
            tenantId: data.tenantId,
            propertyId: data.propertyId,
            unitId: data.unitId,
            amount: data.amount,
            status: data.status || 'PAID',
            paymentDate: data.paymentDate,
            dueDate: data.dueDate,
            billingPeriod: data.billingPeriod,
            paymentMethod: data.paymentMethod || 'MOBILE_MONEY'
        }
    });
};

const getAuthToken = (userId: string, role: string) => {
    return jwt.sign(
        { id: userId, role, tenantId: role === 'TENANT' ? userId : undefined },
        process.env.JWT_SECRET || 'test-secret',
        { expiresIn: '1h' }
    );
};

describe('Tenant Money Flow', () => {
    let managerId: string;
    let tenantId: string;
    let propertyId: string;
    let unitId: string;
    let leaseId: string;
    let tenantAuthToken: string;
    let managerAuthToken: string;

    // Global cleanup after all tests
    afterAll(async () => {
        await prisma.$disconnect();
    });

    beforeEach(async () => {
        // Create test users
        const manager = await createTestUser('MANAGER', `manager-${Date.now()}@test.com`);
        managerId = manager.id;
        managerAuthToken = getAuthToken(managerId, 'MANAGER');

        const tenant = await createTestUser('TENANT', `tenant-${Date.now()}@test.com`);
        tenantId = tenant.id;
        tenantAuthToken = getAuthToken(tenantId, 'TENANT');

        // Create property and unit
        const property = await createTestProperty(managerId, 'Test Property');
        propertyId = property.id;

        const unit = await createTestUnit(propertyId, 'Unit 1A');
        unitId = unit.id;

        // Create lease - ensure it's active before the test periods
        const lease = await createTestLease({
            tenantId,
            propertyId,
            unitId,
            rentAmount: 800000,
            startDate: new Date('2023-12-01'), // Start before test periods
            status: 'ACTIVE'
        });
        leaseId = lease.id;
    });

    afterEach(async () => {
        try {
            // Delete in correct order to avoid foreign key constraints
            await (prisma as any).payment.deleteMany({});
            await (prisma as any).lease.deleteMany({});
            await (prisma as any).invoiceLine.deleteMany({});
            await (prisma as any).invoice.deleteMany({});
            await (prisma as any).unit.deleteMany({});
            await (prisma as any).property.deleteMany({});
            await (prisma as any).tenantIdentity.deleteMany({});
            await (prisma as any).user.deleteMany({});
        } catch (error) {
            console.error('Cleanup error:', error);
        }
    });

    describe('Billing Period Helpers', () => {
        it('should validate billing period format', () => {
            expect(validateBillingPeriod('2024-01')).toBe(true);
            expect(validateBillingPeriod('2024-12')).toBe(true);
            expect(validateBillingPeriod('invalid')).toBe(false);
            expect(validateBillingPeriod('2024-1')).toBe(false);
            expect(validateBillingPeriod('24-01')).toBe(false);
        });

        it('should get current billing period', () => {
            const period = getCurrentBillingPeriod();
            expect(validateBillingPeriod(period)).toBe(true);
        });
    });

    describe('Payment Creation with billingPeriod', () => {
        it('should create payment with explicit billingPeriod', async () => {
            const response = await request(app)
                .post('/api/payments')
                .set('Authorization', `Bearer ${tenantAuthToken}`)
                .send({
                    amount: 300000,
                    paymentDate: '2024-02-15',
                    dueDate: '2024-02-01',
                    billingPeriod: '2024-02',
                    paymentMethod: 'MOBILE_MONEY'
                });

            expect(response.status).toBe(201);
            expect(response.body.success).toBe(true);
            expect(response.body.data.billingPeriod).toBe('2024-02');
        });

        it('should create payment with default billingPeriod when not provided', async () => {
            const response = await request(app)
                .post('/api/payments')
                .set('Authorization', `Bearer ${tenantAuthToken}`)
                .send({
                    amount: 300000,
                    paymentDate: '2024-02-15',
                    dueDate: '2024-02-01',
                    paymentMethod: 'MOBILE_MONEY'
                });

            expect(response.status).toBe(201);
            expect(response.body.success).toBe(true);
            expect(response.body.data.billingPeriod).toBeDefined();
            expect(validateBillingPeriod(response.body.data.billingPeriod)).toBe(true);
        });

        it('should reject invalid billingPeriod format', async () => {
            const response = await request(app)
                .post('/api/payments')
                .set('Authorization', `Bearer ${tenantAuthToken}`)
                .send({
                    amount: 300000,
                    paymentDate: '2024-02-15',
                    dueDate: '2024-02-01',
                    billingPeriod: 'invalid-format',
                    paymentMethod: 'MOBILE_MONEY'
                });

            expect(response.status).toBe(500);
            expect(response.body.success).toBe(false);
            expect(response.body.message).toContain('Invalid billingPeriod format');
        });
    });

    describe('Tenant Rent Status', () => {
        it('should return NO_LEASE when tenant has no active lease', async () => {
            // Delete the lease to simulate no active lease
            await (prisma as any).lease.delete({ where: { id: leaseId } });

            const response = await request(app)
                .get('/api/tenant/rent-status?period=2024-02')
                .set('Authorization', `Bearer ${tenantAuthToken}`);

            expect(response.status).toBe(200);
            expect(response.body.success).toBe(true);
            expect(response.body.data.status).toBe('NO_LEASE');
            expect(response.body.data.hasActiveLeaseAtPeriodStart).toBe(false);
        });

        it('should return DUE when no payments made', async () => {
            const response = await request(app)
                .get('/api/tenant/rent-status?period=2024-02')
                .set('Authorization', `Bearer ${tenantAuthToken}`);

            expect(response.status).toBe(200);
            expect(response.body.success).toBe(true);
            expect(response.body.data.status).toBe('DUE');
            expect(response.body.data.expectedRent).toBe(800000);
            expect(response.body.data.paidForPeriod).toBe(0);
            expect(response.body.data.outstandingForPeriod).toBe(800000);
        });

        it('should return PARTIAL when partial payment made', async () => {
            // Create partial payment
            await createTestPayment({
                tenantId,
                propertyId,
                unitId,
                amount: 300000,
                billingPeriod: '2024-02',
                paymentDate: new Date('2024-02-15'),
                dueDate: new Date('2024-02-01'),
                status: 'PAID'
            });

            const response = await request(app)
                .get('/api/tenant/rent-status?period=2024-02')
                .set('Authorization', `Bearer ${tenantAuthToken}`);

            expect(response.status).toBe(200);
            expect(response.body.success).toBe(true);
            expect(response.body.data.status).toBe('PARTIAL');
            expect(response.body.data.expectedRent).toBe(800000);
            expect(response.body.data.paidForPeriod).toBe(300000);
            expect(response.body.data.outstandingForPeriod).toBe(500000);
        });

        it('should return PAID when full payment made', async () => {
            // Create full payment
            await createTestPayment({
                tenantId,
                propertyId,
                unitId,
                amount: 800000,
                billingPeriod: '2024-02',
                paymentDate: new Date('2024-02-15'),
                dueDate: new Date('2024-02-01'),
                status: 'PAID'
            });

            const response = await request(app)
                .get('/api/tenant/rent-status?period=2024-02')
                .set('Authorization', `Bearer ${tenantAuthToken}`);

            expect(response.status).toBe(200);
            expect(response.body.success).toBe(true);
            expect(response.body.data.status).toBe('PAID');
            expect(response.body.data.expectedRent).toBe(800000);
            expect(response.body.data.paidForPeriod).toBe(800000);
            expect(response.body.data.outstandingForPeriod).toBe(0);
        });
    });

    describe('Manager Finance with billingPeriod Attribution', () => {
        beforeEach(async () => {
            // Create payments for different periods
            await createTestPayment({
                tenantId,
                propertyId,
                unitId,
                amount: 300000,
                billingPeriod: '2024-01',
                paymentDate: new Date('2024-02-15'), // Payment date in different month
                dueDate: new Date('2024-01-01'),
                status: 'PAID'
            });

            await createTestPayment({
                tenantId,
                propertyId,
                unitId,
                amount: 500000,
                billingPeriod: '2024-02',
                paymentDate: new Date('2024-01-15'), // Payment date in different month
                dueDate: new Date('2024-02-01'),
                status: 'PAID'
            });
        });

        it('should use billingPeriod for rent collection (not paymentDate)', async () => {
            const response = await request(app)
                .get('/api/manager/finance/rent-collection?period=2024-01')
                .set('Authorization', `Bearer ${managerAuthToken}`);

            expect(response.status).toBe(200);
            expect(response.body.success).toBe(true);
            expect(response.body.data.totalCollected).toBe(300000); // Only 2024-01 payment
        });

        it('should use billingPeriod for outstanding rent calculation', async () => {
            const response = await request(app)
                .get('/api/manager/finance/outstanding-rent?period=2024-01')
                .set('Authorization', `Bearer ${managerAuthToken}`);

            expect(response.status).toBe(200);
            expect(response.body.success).toBe(true);
            expect(response.body.data.totalOutstanding).toBe(500000); // 800000 - 300000
            expect(response.body.data.items[0].collectedRent).toBe(300000);
            expect(response.body.data.items[0].amountOutstanding).toBe(500000);
        });
    });
});
