import request from 'supertest';
import app from '../src/testApp';
import { prisma } from '../src/utils/database';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';

// Test helper functions - using direct Prisma approach like managerFinance.test.ts
async function createTestUser(name: string, email: string, role: string) {
    const hashedPassword = await bcrypt.hash('Password123', 10);
    const userData: any = {
        email,
        passwordHash: hashedPassword,
        name,
        role: role as any,
        phoneNumber: role === 'TENANT' ? '+256700000002' : '+256700000001'
    };

    // Add billing enforcement fields for managers in test environment
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

        return {
            userId: user.id,
            tenantId: user.id,
            token: getAuthToken(user.id, user.role, user.id)
        };
    }

    return {
        userId: user.id,
        token: getAuthToken(user.id, user.role)
    };
}

const getAuthToken = (userId: string, role: string, tenantId?: string) => {
    const payload: any = { id: userId, role };
    if (role === 'TENANT' && tenantId) {
        payload.tenantId = tenantId;
    }
    return jwt.sign(
        payload,
        process.env.JWT_SECRET || 'test-secret-key-for-financial-statements-testing',
        { expiresIn: '1h' }
    );
};

describe('Payment Claim Idempotency Tests', () => {
    let managerToken: string;
    let managerId: string;
    let propertyId: string;
    let unitId: string;
    let tenantId: string;
    let tenantToken: string;
    let leaseId: string;

    beforeEach(async () => {
        // Create manager user directly with Prisma
        const uniqueManagerEmail = `manager-${Date.now()}@test.com`;
        const managerResponse = await createTestUser('Test Manager', uniqueManagerEmail, 'MANAGER');
        managerId = managerResponse.userId;
        managerToken = managerResponse.token;

        // Create property
        const propertyResponse = await request(app)
            .post('/api/properties')
            .set('Authorization', `Bearer ${managerToken}`)
            .send({ name: 'Test Property', location: 'Test Location' });

        propertyId = propertyResponse.body.data.id;

        // Create unit
        const unitResponse = await request(app)
            .post(`/api/properties/${propertyId}/units`)
            .set('Authorization', `Bearer ${managerToken}`)
            .send({ unitNumber: 'Unit 1', rentAmount: 1000000 });

        unitId = unitResponse.body.data.id;

        // Create tenant directly with Prisma
        const uniqueTenantEmail = `tenant-${Date.now()}@test.com`;
        const tenantResponse = await createTestUser('Test Tenant', uniqueTenantEmail, 'TENANT');
        tenantId = (tenantResponse as any).tenantId;
        tenantToken = tenantResponse.token;

        // Create lease
        const leaseData = {
            tenantId,
            propertyId,
            unitId,
            rentAmount: 1000000,
            startDate: '2023-12-01T00:00:00.000Z'
        };

        const leaseResponse = await request(app)
            .post('/api/leases')
            .set('Authorization', `Bearer ${managerToken}`)
            .send(leaseData);

        leaseId = leaseResponse.body.data.id;
    });

    afterEach(async () => {
        // Clean up test data in correct order due to foreign key constraints
        try {
            await (prisma as any).paymentClaimVerification.deleteMany({});
            await (prisma as any).paymentClaim.deleteMany({});
            await (prisma as any).notification.deleteMany({});
            await prisma.lease.deleteMany({});
            await prisma.unit.deleteMany({});
            await prisma.property.deleteMany({});
            await prisma.tenantIdentity.deleteMany({});
            await prisma.user.deleteMany({});
        } catch (error) {
            console.error('Cleanup error:', error);
        }
    });

    it('should prevent duplicate claims for same lease when status is PENDING', async () => {
        const claimData = {
            leaseId,
            amount: 1000000,
            claimedPaidAt: '2024-01-15T10:00:00.000Z',
            method: 'CASH',
            referenceText: 'First payment claim'
        };

        // Create first claim - should succeed
        const firstResponse = await request(app)
            .post('/api/tenant/payment-claims')
            .set('Authorization', `Bearer ${tenantToken}`)
            .send(claimData)
            .expect(201);

        expect(firstResponse.body.success).toBe(true);
        expect(firstResponse.body.data.status).toBe('PENDING');

        // Attempt to create second claim - should fail with 409
        const secondResponse = await request(app)
            .post('/api/tenant/payment-claims')
            .set('Authorization', `Bearer ${tenantToken}`)
            .send({
                ...claimData,
                referenceText: 'Second payment claim attempt'
            })
            .expect(409);

        expect(secondResponse.body.success).toBe(false);
        expect(secondResponse.body.code).toBe('DUPLICATE_CLAIM');
        expect(secondResponse.body.message).toContain('A claim for this lease already exists');
        expect(secondResponse.body.data.existingClaimId).toBe(firstResponse.body.data.id);
        expect(secondResponse.body.data.existingStatus).toBe('PENDING');
    });

    it('should prevent duplicate claims for same lease when status is VERIFIED', async () => {
        const claimData = {
            leaseId,
            amount: 1000000,
            claimedPaidAt: '2024-01-15T10:00:00.000Z',
            method: 'CASH',
            referenceText: 'Payment claim to be verified'
        };

        // Create claim
        const claimResponse = await request(app)
            .post('/api/tenant/payment-claims')
            .set('Authorization', `Bearer ${tenantToken}`)
            .send(claimData)
            .expect(201);

        const claimId = claimResponse.body.data.id;

        // Verify the claim
        await request(app)
            .post(`/api/manager/payment-claims/${claimId}/verify`)
            .set('Authorization', `Bearer ${managerToken}`)
            .send({
                decision: 'VERIFIED',
                note: 'Payment verified successfully'
            })
            .expect(200);

        // Attempt to create another claim for same lease - should fail with 409
        const duplicateResponse = await request(app)
            .post('/api/tenant/payment-claims')
            .set('Authorization', `Bearer ${tenantToken}`)
            .send({
                ...claimData,
                referenceText: 'Attempt to create another claim'
            })
            .expect(409);

        expect(duplicateResponse.body.success).toBe(false);
        expect(duplicateResponse.body.code).toBe('DUPLICATE_CLAIM');
        expect(duplicateResponse.body.data.existingStatus).toBe('VERIFIED');
    });

    it('should allow new claim after previous claim was REJECTED', async () => {
        const claimData = {
            leaseId,
            amount: 1000000,
            claimedPaidAt: '2024-01-15T10:00:00.000Z',
            method: 'CASH',
            referenceText: 'Payment claim to be rejected'
        };

        // Create first claim
        const firstClaimResponse = await request(app)
            .post('/api/tenant/payment-claims')
            .set('Authorization', `Bearer ${tenantToken}`)
            .send(claimData)
            .expect(201);

        const claimId = firstClaimResponse.body.data.id;

        // Reject the claim
        await request(app)
            .post(`/api/manager/payment-claims/${claimId}/verify`)
            .set('Authorization', `Bearer ${managerToken}`)
            .send({
                decision: 'REJECTED',
                note: 'Payment not verified'
            })
            .expect(200);

        // Create new claim for same lease - should succeed since previous was rejected
        const secondClaimResponse = await request(app)
            .post('/api/tenant/payment-claims')
            .set('Authorization', `Bearer ${tenantToken}`)
            .send({
                ...claimData,
                referenceText: 'New payment claim after rejection'
            })
            .expect(201);

        expect(secondClaimResponse.body.success).toBe(true);
        expect(secondClaimResponse.body.data.status).toBe('PENDING');
        expect(secondClaimResponse.body.data.id).not.toBe(claimId);
    });

    it('should validate amount is positive and within 1-5 months range', async () => {
        // Test negative amount
        await request(app)
            .post('/api/tenant/payment-claims')
            .set('Authorization', `Bearer ${tenantToken}`)
            .send({
                leaseId,
                amount: -1000000,
                claimedPaidAt: '2024-01-15T10:00:00.000Z',
                method: 'CASH'
            })
            .expect(400);

        // Test zero amount
        await request(app)
            .post('/api/tenant/payment-claims')
            .set('Authorization', `Bearer ${tenantToken}`)
            .send({
                leaseId,
                amount: 0,
                claimedPaidAt: '2024-01-15T10:00:00.000Z',
                method: 'CASH'
            })
            .expect(400);

        // Test amount exceeding 5 months (6 months)
        await request(app)
            .post('/api/tenant/payment-claims')
            .set('Authorization', `Bearer ${tenantToken}`)
            .send({
                leaseId,
                amount: 6000000, // 6 months rent
                claimedPaidAt: '2024-01-15T10:00:00.000Z',
                method: 'CASH'
            })
            .expect(400);

        // Test valid amount (3 months)
        await request(app)
            .post('/api/tenant/payment-claims')
            .set('Authorization', `Bearer ${tenantToken}`)
            .send({
                leaseId,
                amount: 3000000, // 3 months rent
                claimedPaidAt: '2024-01-15T10:00:00.000Z',
                method: 'CASH'
            })
            .expect(201);
    });

    it('should validate required fields are present', async () => {
        // Missing leaseId
        await request(app)
            .post('/api/tenant/payment-claims')
            .set('Authorization', `Bearer ${tenantToken}`)
            .send({
                amount: 1000000,
                claimedPaidAt: '2024-01-15T10:00:00.000Z',
                method: 'CASH'
            })
            .expect(400);

        // Missing amount
        await request(app)
            .post('/api/tenant/payment-claims')
            .set('Authorization', `Bearer ${tenantToken}`)
            .send({
                leaseId,
                claimedPaidAt: '2024-01-15T10:00:00.000Z',
                method: 'CASH'
            })
            .expect(400);

        // Missing claimedPaidAt
        await request(app)
            .post('/api/tenant/payment-claims')
            .set('Authorization', `Bearer ${tenantToken}`)
            .send({
                leaseId,
                amount: 1000000,
                method: 'CASH'
            })
            .expect(400);

        // Missing method
        await request(app)
            .post('/api/tenant/payment-claims')
            .set('Authorization', `Bearer ${tenantToken}`)
            .send({
                leaseId,
                amount: 1000000,
                claimedPaidAt: '2024-01-15T10:00:00.000Z'
            })
            .expect(400);
    });
});
