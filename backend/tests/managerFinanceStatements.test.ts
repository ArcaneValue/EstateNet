import request from 'supertest';
import app from '../src/testApp';
import { prisma } from '../src/utils/database';

// Test helper functions
async function createTestUser(name: string, email: string, role: string) {
    if (role === 'TENANT') {
        const tenantResponse = await request(app)
            .post('/api/auth/register-tenant')
            .send({
                name,
                email,
                password: 'Password123',
                phoneNumber: '+256700000002'
            });

        if (!tenantResponse.body.success) {
            throw new Error(`Tenant registration failed: ${JSON.stringify(tenantResponse.body)}`);
        }

        return {
            token: tenantResponse.body.token,
            userId: tenantResponse.body.userId,
            tenantId: tenantResponse.body.tenantId
        };
    }

    const response = await request(app)
        .post('/api/auth/register/manager')
        .send({
            name,
            email,
            password: 'Password123',
            phoneNumber: '+256700000001'
        });

    if (!response.body.success) {
        throw new Error(`Manager registration failed: ${JSON.stringify(response.body)}`);
    }

    return {
        token: response.body.token,
        userId: response.body.userId
    };
}

async function createTestProperty(token: string, name: string, location: string) {
    const response = await request(app)
        .post('/api/properties')
        .set('Authorization', `Bearer ${token}`)
        .send({ name, location });

    if (!response.body.success || !response.body.property) {
        throw new Error(`Property creation failed: ${JSON.stringify(response.body)}`);
    }

    return {
        propertyId: response.body.property.id
    };
}

async function createTestUnit(token: string, propertyId: string, unitNumber: string, rentAmount: number) {
    const response = await request(app)
        .post(`/api/properties/${propertyId}/units`)
        .set('Authorization', `Bearer ${token}`)
        .send({ unitNumber, rentAmount });

    return {
        unitId: response.body.unit.id
    };
}

async function createTestLease(token: string, leaseData: any) {
    const response = await request(app)
        .post('/api/leases')
        .set('Authorization', `Bearer ${token}`)
        .send(leaseData);

    return {
        leaseId: response.body.lease.id
    };
}

async function createTestPayment(tenantId: string, propertyId: string, unitId: string, amount: number, billingPeriod: string, paymentDate: string) {
    await prisma.payment.create({
        data: {
            tenantId,
            propertyId,
            unitId,
            amount,
            status: 'PAID',
            billingPeriod,
            paymentDate: new Date(paymentDate),
            dueDate: new Date(paymentDate)
        }
    });
}

describe('Manager Finance Statements API', () => {
    let managerToken: string;
    let managerId: string;
    let propertyId: string;
    let unitId: string;
    let tenantId: string;
    let leaseId: string;

    beforeAll(async () => {
        // Create manager user with unique email
        const uniqueEmail = `manager-${Date.now()}@test.com`;
        const managerResponse = await createTestUser('manager', uniqueEmail, 'MANAGER');
        managerToken = managerResponse.token;
        managerId = managerResponse.userId;

        // Accept manager terms and get new token
        const termsResponse = await request(app)
            .post('/api/manager/terms/accept')
            .set('Authorization', `Bearer ${managerToken}`);

        if (!termsResponse.body.success) {
            throw new Error(`Terms acceptance failed: ${JSON.stringify(termsResponse.body)}`);
        }

        if (termsResponse.body.data && termsResponse.body.data.token) {
            managerToken = termsResponse.body.data.token; // Use the new token
        } else {
            throw new Error(`No new token returned from terms acceptance: ${JSON.stringify(termsResponse.body)}`);
        }

        // Create property
        const propertyResponse = await createTestProperty(managerToken, 'Test Property', 'Test Location');
        propertyId = propertyResponse.propertyId;

        // Create unit
        const unitResponse = await createTestUnit(managerToken, propertyId, 'Unit 1', 800000);
        unitId = unitResponse.unitId;

        // Create tenant with unique email
        const uniqueTenantEmail = `tenant-${Date.now()}@test.com`;
        const tenantResponse = await createTestUser('tenant', uniqueTenantEmail, 'TENANT');
        tenantId = tenantResponse.tenantId;

        // Create lease
        const leaseResponse = await createTestLease(managerToken, {
            tenantId,
            propertyId,
            unitId,
            rentAmount: 800000,
            startDate: '2023-12-01T00:00:00.000Z'
        });
        leaseId = leaseResponse.leaseId;

        // Create test payments for different periods
        await createTestPayment(tenantId, propertyId, unitId, 800000, '2024-01', '2024-01-15T10:00:00.000Z');
        await createTestPayment(tenantId, propertyId, unitId, 400000, '2024-02', '2024-02-10T10:00:00.000Z');
        await createTestPayment(tenantId, propertyId, unitId, 800000, '2024-02', '2024-02-20T10:00:00.000Z');
    });

    afterAll(async () => {
        // Clean up test data in correct order to avoid foreign key constraints
        try {
            await prisma.payment.deleteMany({
                where: { tenantId }
            });
            await prisma.lease.deleteMany({
                where: { tenantId }
            });
            await prisma.invoiceLine.deleteMany({
                where: { tenantId }
            });
            await prisma.unit.deleteMany({
                where: { propertyId }
            });
            await prisma.property.deleteMany({
                where: { managerId }
            });
            await prisma.tenantIdentity.deleteMany({
                where: { tenantId }
            });
            await prisma.user.deleteMany({
                where: {
                    OR: [
                        { id: managerId },
                        { email: { contains: 'tenant' } }
                    ]
                }
            });
        } catch (error) {
            console.error('Cleanup error:', error);
        } finally {
            await prisma.$disconnect();
        }
    });

    describe('GET /api/manager/finance/cashflow', () => {
        it('should return cashflow statement data for current period', async () => {
            const response = await request(app)
                .get('/api/manager/finance/cashflow')
                .set('Authorization', `Bearer ${managerToken}`)
                .expect(200);

            expect(response.body.success).toBe(true);
            expect(response.body.data).toHaveProperty('period');
            expect(response.body.data).toHaveProperty('operatingActivities');
            expect(response.body.data).toHaveProperty('investingActivities');
            expect(response.body.data).toHaveProperty('financingActivities');
            expect(response.body.data).toHaveProperty('netCashflow');
            expect(response.body.data).toHaveProperty('disclaimer');

            // Check operating activities structure
            expect(response.body.data.operatingActivities).toHaveProperty('inflows');
            expect(response.body.data.operatingActivities).toHaveProperty('outflows');
            expect(response.body.data.operatingActivities).toHaveProperty('netOperatingCashflow');
            expect(response.body.data.operatingActivities.inflows).toHaveProperty('rentCollected');
            expect(response.body.data.operatingActivities.inflows).toHaveProperty('description');
        });

        it('should return cashflow statement data for specific period', async () => {
            const response = await request(app)
                .get('/api/manager/finance/cashflow?period=2024-02')
                .set('Authorization', `Bearer ${managerToken}`)
                .expect(200);

            expect(response.body.success).toBe(true);
            expect(response.body.data.period).toBe('2024-02');
            // Should have rent collected from February payments (1.2M total)
            expect(response.body.data.operatingActivities.inflows.rentCollected).toBe(1200000);
            expect(response.body.data.netCashflow).toBe(1200000);
        });

        it('should return cashflow statement data for specific property', async () => {
            const response = await request(app)
                .get(`/api/manager/finance/cashflow?propertyId=${propertyId}`)
                .set('Authorization', `Bearer ${managerToken}`)
                .expect(200);

            expect(response.body.success).toBe(true);
            expect(response.body.data).toHaveProperty('operatingActivities');
        });

        it('should require manager authentication', async () => {
            await request(app)
                .get('/api/manager/finance/cashflow')
                .expect(401);
        });
    });

    describe('GET /api/manager/finance/income-statement', () => {
        it('should return income statement data for current period', async () => {
            const response = await request(app)
                .get('/api/manager/finance/income-statement')
                .set('Authorization', `Bearer ${managerToken}`)
                .expect(200);

            expect(response.body.success).toBe(true);
            expect(response.body.data).toHaveProperty('period');
            expect(response.body.data).toHaveProperty('revenue');
            expect(response.body.data).toHaveProperty('expenses');
            expect(response.body.data).toHaveProperty('netIncome');
            expect(response.body.data).toHaveProperty('disclaimer');

            // Check revenue structure
            expect(response.body.data.revenue).toHaveProperty('rentIncome');
            expect(response.body.data.revenue).toHaveProperty('otherIncome');
            expect(response.body.data.revenue).toHaveProperty('totalRevenue');

            // Check expenses structure
            expect(response.body.data.expenses).toHaveProperty('operatingExpenses');
            expect(response.body.data.expenses).toHaveProperty('maintenanceExpenses');
            expect(response.body.data.expenses).toHaveProperty('administrativeExpenses');
            expect(response.body.data.expenses).toHaveProperty('totalExpenses');
            expect(response.body.data.expenses).toHaveProperty('description');
        });

        it('should return income statement data for specific period', async () => {
            const response = await request(app)
                .get('/api/manager/finance/income-statement?period=2024-01')
                .set('Authorization', `Bearer ${managerToken}`)
                .expect(200);

            expect(response.body.success).toBe(true);
            expect(response.body.data.period).toBe('2024-01');
            // Should have rent income from January payment (800K)
            expect(response.body.data.revenue.rentIncome).toBe(800000);
            expect(response.body.data.revenue.totalRevenue).toBe(800000);
            expect(response.body.data.netIncome).toBe(800000);
        });

        it('should require manager authentication', async () => {
            await request(app)
                .get('/api/manager/finance/income-statement')
                .expect(401);
        });
    });

    describe('GET /api/manager/finance/financial-position', () => {
        it('should return financial position data for current period', async () => {
            const response = await request(app)
                .get('/api/manager/finance/financial-position')
                .set('Authorization', `Bearer ${managerToken}`)
                .expect(200);

            expect(response.body.success).toBe(true);
            expect(response.body.data).toHaveProperty('period');
            expect(response.body.data).toHaveProperty('assets');
            expect(response.body.data).toHaveProperty('liabilities');
            expect(response.body.data).toHaveProperty('equity');
            expect(response.body.data).toHaveProperty('disclaimer');

            // Check assets structure
            expect(response.body.data.assets).toHaveProperty('current');
            expect(response.body.data.assets).toHaveProperty('nonCurrent');
            expect(response.body.data.assets).toHaveProperty('totalAssets');
            expect(response.body.data.assets.current).toHaveProperty('cashReceivedInPeriod');
            expect(response.body.data.assets.current).toHaveProperty('rentReceivableForPeriod');
            expect(response.body.data.assets.current).toHaveProperty('totalCurrentAssets');

            // Check liabilities structure
            expect(response.body.data.liabilities).toHaveProperty('current');
            expect(response.body.data.liabilities).toHaveProperty('nonCurrent');
            expect(response.body.data.liabilities).toHaveProperty('totalLiabilities');

            // Check equity structure
            expect(response.body.data.equity).toHaveProperty('retainedEarnings');
            expect(response.body.data.equity).toHaveProperty('totalEquity');

            // Balance sheet should balance: Assets = Liabilities + Equity
            const totalAssets = response.body.data.assets.totalAssets;
            const totalLiabilities = response.body.data.liabilities.totalLiabilities;
            const totalEquity = response.body.data.equity.totalEquity;
            expect(totalAssets).toBe(totalLiabilities + totalEquity);
        });

        it('should return financial position data for specific period', async () => {
            const response = await request(app)
                .get('/api/manager/finance/financial-position?period=2024-02')
                .set('Authorization', `Bearer ${managerToken}`)
                .expect(200);

            expect(response.body.success).toBe(true);
            expect(response.body.data.period).toBe('2024-02');
            // Should have cash received from February payments (1.2M)
            expect(response.body.data.assets.current.cashReceivedInPeriod).toBe(1200000);
        });

        it('should require manager authentication', async () => {
            await request(app)
                .get('/api/manager/finance/financial-position')
                .expect(401);
        });
    });

    describe('Data Consistency', () => {
        it('should have consistent data across all financial statements for the same period', async () => {
            const period = '2024-02';

            // Get all three financial statements for the same period
            const [cashflowResponse, incomeResponse, positionResponse] = await Promise.all([
                request(app)
                    .get(`/api/manager/finance/cashflow?period=${period}`)
                    .set('Authorization', `Bearer ${managerToken}`),
                request(app)
                    .get(`/api/manager/finance/income-statement?period=${period}`)
                    .set('Authorization', `Bearer ${managerToken}`),
                request(app)
                    .get(`/api/manager/finance/financial-position?period=${period}`)
                    .set('Authorization', `Bearer ${managerToken}`)
            ]);

            expect(cashflowResponse.status).toBe(200);
            expect(incomeResponse.status).toBe(200);
            expect(positionResponse.status).toBe(200);

            const cashflowData = cashflowResponse.body.data;
            const incomeData = incomeResponse.body.data;
            const positionData = positionResponse.body.data;

            // All should have the same period
            expect(cashflowData.period).toBe(period);
            expect(incomeData.period).toBe(period);
            expect(positionData.period).toBe(period);

            // Rent collected in cashflow should equal rent income in income statement
            expect(cashflowData.operatingActivities.inflows.rentCollected)
                .toBe(incomeData.revenue.rentIncome);

            // Cash received in financial position should equal rent collected in cashflow
            expect(positionData.assets.current.cashReceivedInPeriod)
                .toBe(cashflowData.operatingActivities.inflows.rentCollected);

            // Net income should equal net cashflow (since no expenses tracked yet)
            expect(incomeData.netIncome).toBe(cashflowData.netCashflow);
        });
    });
});
