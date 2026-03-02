/// <reference types="jest" />
import { describe, it, expect, beforeEach, afterEach } from '@jest/globals';
import request from 'supertest';
import app from '../src/index';
import { prisma } from '../src/utils/database';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';

// Test utilities
const createTestUser = async (role: string, email: string) => {
    const hashedPassword = await bcrypt.hash('TestPass123!', 10);
    const userData: any = {
        email,
        passwordHash: hashedPassword,
        name: `Test ${role}`,
        role: role as any
    };

    // Add billing enforcement fields for managers
    if (role === 'MANAGER') {
        userData.managerTermsAcceptedAt = new Date();
        userData.billingStatus = 'CURRENT';
    }

    const user = await prisma.user.create({
        data: userData
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
            rentAmount: 1000000
        }
    });
};

const createTestLease = async (data: any) => {
    return await prisma.lease.create({
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
    return await prisma.payment.create({
        data: {
            tenantId: data.tenantId,
            propertyId: data.propertyId,
            unitId: data.unitId,
            amount: data.amount,
            status: data.status || 'PAID',
            paymentDate: data.paymentDate,
            dueDate: data.paymentDate,
            paymentMethod: 'BANK_TRANSFER',
            billingPeriod: data.billingPeriod || '2026-02'
        }
    });
};

const getAuthToken = (userId: string, role: string) => {
    return jwt.sign(
        { id: userId, role },
        process.env.JWT_SECRET || 'test-secret',
        { expiresIn: '1h' }
    );
};

describe('Manager Finance Endpoints', () => {
    let managerId: string;
    let propertyId: string;
    let unitId: string;
    let leaseId: string;
    let tenantId: string;
    let authToken: string;

    beforeEach(async () => {
        // Create test manager
        const manager = await createTestUser('MANAGER', `manager-${Date.now()}@test.com`);
        managerId = manager.id;
        authToken = getAuthToken(managerId, 'MANAGER');

        // Create test property
        const property = await createTestProperty(managerId, 'Test Property');
        propertyId = property.id;

        // Create test unit
        const unit = await createTestUnit(propertyId, 'Unit 1A');
        unitId = unit.id;

        // Create test tenant
        const tenant = await createTestUser('TENANT', `tenant-${Date.now()}@test.com`);
        tenantId = tenant.id;

        // Create test lease (active at period start - set before period start to satisfy snapshot semantics)
        const lease = await createTestLease({
            tenantId,
            propertyId,
            unitId,
            rentAmount: 1000000, // 1M UGX
            startDate: new Date('2023-12-31T20:00:00.000Z'), // Before period start for 2024-01
            status: 'ACTIVE'
        });
        leaseId = lease.id;
    });

    afterEach(async () => {
        // Clean up test data
        try {
            await prisma.payment.deleteMany({});
            await prisma.lease.deleteMany({});
            await prisma.unit.deleteMany({});
            await prisma.property.deleteMany({});
            await prisma.tenantIdentity.deleteMany({});
            await prisma.user.deleteMany({});
        } catch (error) {
            console.error('Cleanup error:', error);
        }
    });

    describe('GET /api/manager/finance/rent-collection', () => {
        it('should return rent collection data for current period', async () => {
            // Create test payment for current period
            await createTestPayment({
                tenantId,
                propertyId,
                unitId,
                amount: 800000, // 0.8M UGX (partial payment)
                status: 'PAID',
                paymentDate: new Date('2024-02-15'),
                billingPeriod: '2024-02'
            });

            const response = await request(app)
                .get('/api/manager/finance/rent-collection?period=2024-02')
                .set('Authorization', `Bearer ${authToken}`)
                .expect(200);

            expect(response.body.success).toBe(true);
            expect(response.body.data).toMatchObject({
                totalCollected: 800000,
                period: '2024-02',
                byProperty: expect.arrayContaining([
                    expect.objectContaining({
                        propertyId,
                        propertyName: 'Test Property',
                        expectedRent: 1000000,
                        collectedRent: 800000,
                        collectionRate: 80
                    })
                ]),
                recentPayments: expect.arrayContaining([
                    expect.objectContaining({
                        amount: 800000,
                        tenantName: expect.any(String),
                        propertyName: 'Test Property',
                        status: 'PAID'
                    })
                ])
            });
        });

        it('should return zero for period with no payments', async () => {
            const response = await request(app)
                .get('/api/manager/finance/rent-collection?period=2024-01')
                .set('Authorization', `Bearer ${authToken}`)
                .expect(200);

            expect(response.body.success).toBe(true);
            expect(response.body.data).toMatchObject({
                totalCollected: 0,
                period: '2024-01',
                byProperty: expect.arrayContaining([
                    expect.objectContaining({
                        propertyId,
                        expectedRent: 1000000,
                        collectedRent: 0,
                        collectionRate: 0
                    })
                ]),
                recentPayments: []
            });
        });

        it('should filter by property when propertyId provided', async () => {
            // Create another property and lease
            const property2 = await createTestProperty(managerId, 'Property 2');
            const unit2 = await createTestUnit(property2.id, 'Unit 2A');
            const tenant2 = await createTestUser('TENANT', `tenant2-${Date.now()}-${Math.random()}@test.com`);
            await createTestLease({
                tenantId: tenant2.id,
                propertyId: property2.id,
                unitId: unit2.id,
                rentAmount: 500000,
                startDate: new Date('2024-01-01'),
                status: 'ACTIVE'
            });

            // Create payments for both properties
            await createTestPayment({
                tenantId,
                propertyId,
                unitId,
                amount: 1000000,
                status: 'PAID',
                paymentDate: new Date('2024-02-15'),
                billingPeriod: '2024-02'
            });

            await createTestPayment({
                tenantId: tenant2.id,
                propertyId: property2.id,
                unitId: unit2.id,
                amount: 500000,
                status: 'PAID',
                paymentDate: new Date('2024-02-15'),
                billingPeriod: '2024-02'
            });

            const response = await request(app)
                .get(`/api/manager/finance/rent-collection?period=2024-02&propertyId=${propertyId}`)
                .set('Authorization', `Bearer ${authToken}`)
                .expect(200);

            expect(response.body.success).toBe(true);
            expect(response.body.data.totalCollected).toBe(1000000);
            expect(response.body.data.byProperty).toHaveLength(1);
            expect(response.body.data.byProperty[0].propertyId).toBe(propertyId);
        });

        it('should require manager authentication', async () => {
            await request(app)
                .get('/api/manager/finance/rent-collection')
                .expect(401);
        });
    });

    describe('GET /api/manager/finance/outstanding-rent', () => {
        it('should return outstanding rent data', async () => {
            // Create partial payment (leaving 200k outstanding)
            await createTestPayment({
                tenantId,
                propertyId,
                unitId,
                amount: 800000,
                status: 'PAID',
                paymentDate: new Date('2024-02-15'),
                billingPeriod: '2024-02'
            });

            const response = await request(app)
                .get('/api/manager/finance/outstanding-rent?period=2024-02')
                .set('Authorization', `Bearer ${authToken}`)
                .expect(200);

            expect(response.body.success).toBe(true);
            expect(response.body.data).toMatchObject({
                totalOutstanding: 200000,
                overdueTenantsCount: 1,
                period: '2024-02',
                items: expect.arrayContaining([
                    expect.objectContaining({
                        tenantId,
                        propertyId,
                        unitId,
                        leaseId,
                        expectedRent: 1000000,
                        collectedRent: 800000,
                        amountOutstanding: 200000,
                        tenantName: expect.any(String),
                        propertyName: 'Test Property'
                    })
                ])
            });
        });

        it('should return zero outstanding when fully paid', async () => {
            // Create full payment
            await createTestPayment({
                tenantId,
                propertyId,
                unitId,
                amount: 1000000,
                status: 'PAID',
                paymentDate: new Date('2024-02-15'),
                billingPeriod: '2024-02'
            });

            const response = await request(app)
                .get('/api/manager/finance/outstanding-rent?period=2024-02')
                .set('Authorization', `Bearer ${authToken}`)
                .expect(200);

            expect(response.body.success).toBe(true);
            expect(response.body.data).toMatchObject({
                totalOutstanding: 0,
                overdueTenantsCount: 0,
                period: '2024-02',
                items: []
            });
        });

        it('should use Option A snapshot semantics for lease selection', async () => {
            // Create lease that starts after period start (should not be included)
            const tenant2 = await createTestUser('TENANT', `tenant2-${Date.now()}-${Math.random()}@test.com`);
            const unit2 = await createTestUnit(propertyId, 'Unit 2A');
            await createTestLease({
                tenantId: tenant2.id,
                propertyId,
                unitId: unit2.id,
                rentAmount: 500000,
                startDate: new Date('2024-02-15'), // Starts mid-period
                status: 'ACTIVE'
            });

            const response = await request(app)
                .get('/api/manager/finance/outstanding-rent?period=2024-02')
                .set('Authorization', `Bearer ${authToken}`)
                .expect(200);

            expect(response.body.success).toBe(true);
            // Should only include the lease that was active at period start
            expect(response.body.data.items).toHaveLength(1);
            expect(response.body.data.items[0].tenantId).toBe(tenantId);
        });

        it('should require manager authentication', async () => {
            await request(app)
                .get('/api/manager/finance/outstanding-rent')
                .expect(401);
        });
    });

    describe('Period snapshot logic', () => {
        it('should correctly calculate expected rent based on active leases at period start', async () => {
            // Create lease that ends mid-period
            await prisma.lease.update({
                where: { id: leaseId },
                data: { endDate: new Date('2024-02-15') }
            });

            // This lease should still be included since it was active at period start
            const response = await request(app)
                .get('/api/manager/finance/rent-collection?period=2024-02')
                .set('Authorization', `Bearer ${authToken}`)
                .expect(200);

            expect(response.body.success).toBe(true);
            expect(response.body.data.byProperty[0].expectedRent).toBe(1000000);
        });

        it('should exclude leases that start after period start', async () => {
            // Update lease to start after period
            await prisma.lease.update({
                where: { id: leaseId },
                data: { startDate: new Date('2024-02-15') }
            });

            const response = await request(app)
                .get('/api/manager/finance/rent-collection?period=2024-02')
                .set('Authorization', `Bearer ${authToken}`)
                .expect(200);

            expect(response.body.success).toBe(true);
            expect(response.body.data.byProperty[0].expectedRent).toBe(0);
        });
    });
});
