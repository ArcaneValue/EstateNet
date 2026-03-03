import request from 'supertest';
import { PrismaClient } from '@prisma/client';
import app from '../../src/testApp';

const prisma = new PrismaClient();

describe('Payment Claim Verification -> Payment Creation', () => {
  let managerToken: string;
  let tenantToken: string;
  let managerId: string;
  let tenantId: string;
  let propertyId: string;
  let unitId: string;
  let leaseId: string;
  let claimId: string;

  beforeAll(async () => {
    // Create test manager
    const managerResponse = await request(app)
      .post('/api/auth/register')
      .send({
        email: 'manager@test.com',
        password: 'password123',
        name: 'Test Manager',
        role: 'MANAGER'
      });

    managerToken = managerResponse.body.data.token;
    managerId = managerResponse.body.data.user.id;

    // Create test property
    const property = await prisma.property.create({
      data: {
        name: 'Test Property',
        location: 'Test Location',
        ownerId: managerId,
        managerId: managerId
      }
    });
    propertyId = property.id;

    // Create test unit
    const unit = await prisma.unit.create({
      data: {
        propertyId,
        unitNumber: 'A101',
        rentAmount: 300000
      }
    });
    unitId = unit.id;

    // Create test tenant
    const tenantResponse = await request(app)
      .post('/api/auth/register')
      .send({
        email: 'tenant@test.com',
        password: 'password123',
        name: 'Test Tenant',
        role: 'TENANT'
      });

    tenantToken = tenantResponse.body.data.token;
    tenantId = tenantResponse.body.data.user.tenantId;

    // Create tenant identity
    await prisma.tenantIdentity.create({
      data: {
        tenantId,
        name: 'Test Tenant',
        email: 'tenant@test.com',
        phoneNumber: '+1234567890'
      }
    });

    // Create lease
    const lease = await prisma.lease.create({
      data: {
        tenantId,
        propertyId,
        unitId,
        rentAmount: 300000,
        status: 'ACTIVE'
      }
    });
    leaseId = lease.id;
  });

  afterAll(async () => {
    // Cleanup
    await prisma.$executeRaw`DELETE FROM payments WHERE paymentClaimId IS NOT NULL`;
    await prisma.paymentClaimVerification.deleteMany({});
    await prisma.paymentClaim.deleteMany({});
    await prisma.lease.deleteMany({ where: { id: leaseId } });
    await prisma.unit.deleteMany({ where: { id: unitId } });
    await prisma.property.deleteMany({ where: { id: propertyId } });
    await prisma.tenantIdentity.deleteMany({ where: { tenantId } });
    await prisma.user.deleteMany({ where: { email: { in: ['manager@test.com', 'tenant@test.com'] } } });
    await prisma.$disconnect();
  });

  it('should create a payment when claim is verified', async () => {
    // Create a payment claim
    const claimResponse = await request(app)
      .post('/api/tenant/payment-claims')
      .set('Authorization', `Bearer ${tenantToken}`)
      .send({
        leaseId,
        amount: 300000,
        method: 'CASH',
        referenceText: 'REF001',
        claimedPaidAt: new Date().toISOString()
      });

    expect(claimResponse.status).toBe(201);
    claimId = claimResponse.body.data.id;

    // Verify the claim
    const verifyResponse = await request(app)
      .post(`/api/manager/payment-claims/${claimId}/verify`)
      .set('Authorization', `Bearer ${managerToken}`)
      .send({
        decision: 'VERIFIED',
        note: 'Payment verified'
      });

    expect(verifyResponse.status).toBe(200);
    expect(verifyResponse.body.data.decision).toBe('VERIFIED');

    // Check that payment was created using raw query
    const payments = await prisma.$queryRaw`
      SELECT * FROM payments WHERE paymentClaimId = ${claimId}
    ` as any[];

    expect(payments).toHaveLength(1);
    const payment = payments[0];
    expect(payment.amount).toBe(300000);
    expect(payment.status).toBe('PAID');
    expect(payment.tenantId).toBe(tenantId);
    expect(payment.propertyId).toBe(propertyId);
    expect(payment.unitId).toBe(unitId);
    expect(payment.leaseId).toBe(leaseId);
    expect(payment.paymentMethod).toBe('CASH');
    expect(payment.transactionId).toBe('REF001');
  });

  it('should be idempotent - verifying same claim twice should not create duplicate payments', async () => {
    // Create a new claim
    const claimResponse = await request(app)
      .post('/api/tenant/payment-claims')
      .set('Authorization', `Bearer ${tenantToken}`)
      .send({
        leaseId,
        amount: 300000,
        method: 'MTN',
        referenceText: 'REF002',
        claimedPaidAt: new Date().toISOString()
      });

    const newClaimId = claimResponse.body.data.id;

    // Verify the claim first time
    await request(app)
      .post(`/api/manager/payment-claims/${newClaimId}/verify`)
      .set('Authorization', `Bearer ${managerToken}`)
      .send({
        decision: 'VERIFIED',
        note: 'First verification'
      });

    // Try to verify again (should fail since claim is no longer PENDING)
    const secondVerifyResponse = await request(app)
      .post(`/api/manager/payment-claims/${newClaimId}/verify`)
      .set('Authorization', `Bearer ${managerToken}`)
      .send({
        decision: 'VERIFIED',
        note: 'Second verification'
      });

    expect(secondVerifyResponse.status).toBe(404);

    // Check that only one payment exists
    const payments = await prisma.$queryRaw`
      SELECT * FROM payments WHERE paymentClaimId = ${newClaimId}
    ` as any[];

    expect(payments).toHaveLength(1);
  });

  it('should include verified claim payment in rent collection report', async () => {
    // Get rent collection data
    const rentCollectionResponse = await request(app)
      .get('/api/manager/finance/rent-collection')
      .set('Authorization', `Bearer ${managerToken}`)
      .query({
        period: new Date().toISOString().slice(0, 7) // Current period YYYY-MM
      });

    expect(rentCollectionResponse.status).toBe(200);
    const data = rentCollectionResponse.body.data;

    // The verified payment should be included in the totals
    expect(data.totalCollected).toBeGreaterThan(0);
    expect(data.payments).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          amount: 300000,
          status: 'PAID',
          paymentClaimId: claimId
        })
      ])
    );
  });

  it('should include verified claim payment in income statement', async () => {
    // Get income statement data
    const incomeStatementResponse = await request(app)
      .get('/api/manager/finance/income-statement')
      .set('Authorization', `Bearer ${managerToken}`)
      .query({
        period: new Date().toISOString().slice(0, 7) // Current period YYYY-MM
      });

    expect(incomeStatementResponse.status).toBe(200);
    const data = incomeStatementResponse.body.data;

    // The verified payment should be included in rent income
    expect(data.revenue.rentIncome).toBeGreaterThanOrEqual(300000);
  });
});
