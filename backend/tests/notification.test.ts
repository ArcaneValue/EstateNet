import request from 'supertest';
import app from '../src/testApp';
import { prisma } from '../src/utils/database';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';

// Test helper functions - using direct Prisma approach
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

describe('Notification System Tests', () => {
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

    it('should create notification when tenant submits payment claim', async () => {
        // Get initial unread count for manager
        const initialResponse = await request(app)
            .get('/api/notifications')
            .set('Authorization', `Bearer ${managerToken}`)
            .expect(200);

        const initialUnreadCount = initialResponse.body.unreadCount;

        // Create payment claim
        const claimData = {
            leaseId,
            amount: 1000000,
            claimedPaidAt: '2024-01-15T10:00:00.000Z',
            method: 'CASH',
            referenceText: 'Payment via cash'
        };

        await request(app)
            .post('/api/tenant/payment-claims')
            .set('Authorization', `Bearer ${tenantToken}`)
            .send(claimData)
            .expect(201);

        // Check that manager has new notification
        const notificationsResponse = await request(app)
            .get('/api/notifications')
            .set('Authorization', `Bearer ${managerToken}`)
            .expect(200);

        expect(notificationsResponse.body.success).toBe(true);
        expect(notificationsResponse.body.unreadCount).toBe(initialUnreadCount + 1);
        expect(notificationsResponse.body.data).toHaveLength(initialUnreadCount + 1);

        const newNotification = notificationsResponse.body.data[0];
        expect(newNotification.type).toBe('PAYMENT_CLAIM_SUBMITTED');
        expect(newNotification.title).toBe('New Payment Claim');
        expect(newNotification.body).toContain('Test Tenant');
        expect(newNotification.body).toContain('UGX 1,000,000');
        expect(newNotification.readAt).toBeNull();
    });

    it('should mark notification as read and decrease unread count', async () => {
        // Create payment claim to generate notification
        const claimData = {
            leaseId,
            amount: 1000000,
            claimedPaidAt: '2024-01-15T10:00:00.000Z',
            method: 'CASH'
        };

        await request(app)
            .post('/api/tenant/payment-claims')
            .set('Authorization', `Bearer ${tenantToken}`)
            .send(claimData)
            .expect(201);

        // Get notifications
        const notificationsResponse = await request(app)
            .get('/api/notifications')
            .set('Authorization', `Bearer ${managerToken}`)
            .expect(200);

        const notification = notificationsResponse.body.data[0];
        const initialUnreadCount = notificationsResponse.body.unreadCount;

        // Mark notification as read
        const markReadResponse = await request(app)
            .patch(`/api/notifications/${notification.id}/read`)
            .set('Authorization', `Bearer ${managerToken}`)
            .expect(200);

        expect(markReadResponse.body.success).toBe(true);
        expect(markReadResponse.body.data.readAt).not.toBeNull();

        // Check unread count decreased
        const updatedNotificationsResponse = await request(app)
            .get('/api/notifications')
            .set('Authorization', `Bearer ${managerToken}`)
            .expect(200);

        expect(updatedNotificationsResponse.body.unreadCount).toBe(initialUnreadCount - 1);
    });

    it('should only allow users to access their own notifications', async () => {
        // Create another manager
        const otherManagerEmail = `other-manager-${Date.now()}@test.com`;
        const otherManagerResponse = await createTestUser('Other Manager', otherManagerEmail, 'MANAGER');
        const otherManagerToken = otherManagerResponse.token;

        // Create payment claim to generate notification for first manager
        const claimData = {
            leaseId,
            amount: 1000000,
            claimedPaidAt: '2024-01-15T10:00:00.000Z',
            method: 'CASH'
        };

        await request(app)
            .post('/api/tenant/payment-claims')
            .set('Authorization', `Bearer ${tenantToken}`)
            .send(claimData)
            .expect(201);

        // First manager should see the notification
        const firstManagerNotifications = await request(app)
            .get('/api/notifications')
            .set('Authorization', `Bearer ${managerToken}`)
            .expect(200);

        expect(firstManagerNotifications.body.data.length).toBeGreaterThan(0);

        // Other manager should not see the notification
        const otherManagerNotifications = await request(app)
            .get('/api/notifications')
            .set('Authorization', `Bearer ${otherManagerToken}`)
            .expect(200);

        expect(otherManagerNotifications.body.unreadCount).toBe(0);
        expect(otherManagerNotifications.body.data).toHaveLength(0);
    });

    it('should prevent unauthorized users from marking notifications as read', async () => {
        // Create payment claim to generate notification
        const claimData = {
            leaseId,
            amount: 1000000,
            claimedPaidAt: '2024-01-15T10:00:00.000Z',
            method: 'CASH'
        };

        await request(app)
            .post('/api/tenant/payment-claims')
            .set('Authorization', `Bearer ${tenantToken}`)
            .send(claimData)
            .expect(201);

        // Get notification ID
        const notificationsResponse = await request(app)
            .get('/api/notifications')
            .set('Authorization', `Bearer ${managerToken}`)
            .expect(200);

        const notificationId = notificationsResponse.body.data[0].id;

        // Try to mark notification as read using tenant token (should fail)
        const markReadResponse = await request(app)
            .patch(`/api/notifications/${notificationId}/read`)
            .set('Authorization', `Bearer ${tenantToken}`)
            .expect(500);

        expect(markReadResponse.body.success).toBe(false);
        expect(markReadResponse.body.message).toContain('Not authorized');
    });

    it('should create notification when manager verifies payment claim', async () => {
        // Create payment claim
        const claimData = {
            leaseId,
            amount: 1000000,
            claimedPaidAt: '2024-01-15T10:00:00.000Z',
            method: 'CASH'
        };

        const claimResponse = await request(app)
            .post('/api/tenant/payment-claims')
            .set('Authorization', `Bearer ${tenantToken}`)
            .send(claimData)
            .expect(201);

        const claimId = claimResponse.body.data.id;

        // Get initial tenant notification count
        const initialTenantNotifications = await request(app)
            .get('/api/notifications')
            .set('Authorization', `Bearer ${tenantToken}`)
            .expect(200);

        const initialTenantUnreadCount = initialTenantNotifications.body.unreadCount;

        // Verify the claim
        await request(app)
            .post(`/api/manager/payment-claims/${claimId}/verify`)
            .set('Authorization', `Bearer ${managerToken}`)
            .send({
                decision: 'VERIFIED',
                note: 'Payment verified successfully'
            })
            .expect(200);

        // Check tenant received verification notification
        const updatedTenantNotifications = await request(app)
            .get('/api/notifications')
            .set('Authorization', `Bearer ${tenantToken}`)
            .expect(200);

        expect(updatedTenantNotifications.body.unreadCount).toBe(initialTenantUnreadCount + 1);

        const verificationNotification = updatedTenantNotifications.body.data[0];
        expect(verificationNotification.type).toBe('PAYMENT_CLAIM_VERIFIED');
        expect(verificationNotification.title).toBe('Payment Claim Verified');
        expect(verificationNotification.body).toContain('UGX 1,000,000');
        expect(verificationNotification.body).toContain('verified');
    });

    it('should create notification when manager rejects payment claim', async () => {
        // Create payment claim
        const claimData = {
            leaseId,
            amount: 1000000,
            claimedPaidAt: '2024-01-15T10:00:00.000Z',
            method: 'CASH'
        };

        const claimResponse = await request(app)
            .post('/api/tenant/payment-claims')
            .set('Authorization', `Bearer ${tenantToken}`)
            .send(claimData)
            .expect(201);

        const claimId = claimResponse.body.data.id;

        // Get initial tenant notification count
        const initialTenantNotifications = await request(app)
            .get('/api/notifications')
            .set('Authorization', `Bearer ${tenantToken}`)
            .expect(200);

        const initialTenantUnreadCount = initialTenantNotifications.body.unreadCount;

        // Reject the claim
        await request(app)
            .post(`/api/manager/payment-claims/${claimId}/verify`)
            .set('Authorization', `Bearer ${managerToken}`)
            .send({
                decision: 'REJECTED',
                note: 'Payment could not be verified'
            })
            .expect(200);

        // Check tenant received rejection notification
        const updatedTenantNotifications = await request(app)
            .get('/api/notifications')
            .set('Authorization', `Bearer ${tenantToken}`)
            .expect(200);

        expect(updatedTenantNotifications.body.unreadCount).toBe(initialTenantUnreadCount + 1);

        const rejectionNotification = updatedTenantNotifications.body.data[0];
        expect(rejectionNotification.type).toBe('PAYMENT_CLAIM_REJECTED');
        expect(rejectionNotification.title).toBe('Payment Claim Rejected');
        expect(rejectionNotification.body).toContain('UGX 1,000,000');
        expect(rejectionNotification.body).toContain('rejected');
    });
});
