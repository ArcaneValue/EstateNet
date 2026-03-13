-- Create Test Tenant Account with Sample Data
-- This creates a complete tenant profile with active lease and payment data
-- 
-- Test Credentials:
-- Email: tenant.test@estatenet.com
-- Password: TestPass123!
-- Tenant ID: TEST123456

-- Note: Run this in your PostgreSQL database or use Prisma Studio

-- 1. Create test user (tenant role)
INSERT INTO "User" (id, email, password, name, "phoneNumber", role, "createdAt", "updatedAt")
VALUES (
    'test-tenant-user-001',
    'tenant.test@estatenet.com',
    '$2b$10$YourHashedPasswordHere', -- You'll need to hash 'TestPass123!' using bcrypt
    'Test Tenant',
    '+256700000001',
    'TENANT',
    NOW(),
    NOW()
) ON CONFLICT (email) DO NOTHING;

-- 2. Create tenant profile
INSERT INTO "Tenant" (id, "userId", "tenantId", "createdAt", "updatedAt")
VALUES (
    'test-tenant-001',
    'test-tenant-user-001',
    'TEST123456',
    NOW(),
    NOW()
) ON CONFLICT (id) DO NOTHING;

-- 3. Create test property (if not exists)
INSERT INTO "Property" (id, name, location, "propertyType", "totalUnits", "managerId", "createdAt", "updatedAt")
VALUES (
    'test-property-001',
    'Sunrise Apartments',
    'Kampala, Uganda',
    'APARTMENT',
    10,
    (SELECT id FROM "User" WHERE role = 'MANAGER' LIMIT 1), -- Uses first manager in DB
    NOW(),
    NOW()
) ON CONFLICT (id) DO NOTHING;

-- 4. Create test unit
INSERT INTO "Unit" (id, "unitNumber", "propertyId", "monthlyRent", "bedrooms", "bathrooms", status, "createdAt", "updatedAt")
VALUES (
    'test-unit-001',
    'A-101',
    'test-property-001',
    500000, -- 500,000 UGX monthly rent
    2,
    1,
    'OCCUPIED',
    NOW(),
    NOW()
) ON CONFLICT (id) DO NOTHING;

-- 5. Create active lease
INSERT INTO "Lease" (
    id,
    "tenantId",
    "propertyId",
    "unitId",
    "startDate",
    "endDate",
    "monthlyRent",
    "securityDeposit",
    status,
    "createdAt",
    "updatedAt"
)
VALUES (
    'test-lease-001',
    'test-tenant-001',
    'test-property-001',
    'test-unit-001',
    '2026-01-01',
    '2026-12-31',
    500000,
    500000,
    'ACTIVE',
    NOW(),
    NOW()
) ON CONFLICT (id) DO NOTHING;

-- 6. Create payment records (mix of paid and pending)
INSERT INTO "Payment" (
    id,
    "leaseId",
    "tenantId",
    amount,
    "dueDate",
    "paidAt",
    status,
    "paymentMethod",
    "createdAt",
    "updatedAt"
)
VALUES 
    -- January - Paid
    (
        'test-payment-jan',
        'test-lease-001',
        'test-tenant-001',
        500000,
        '2026-01-05',
        '2026-01-03',
        'PAID',
        'MOBILE_MONEY',
        NOW(),
        NOW()
    ),
    -- February - Paid
    (
        'test-payment-feb',
        'test-lease-001',
        'test-tenant-001',
        500000,
        '2026-02-05',
        '2026-02-04',
        'PAID',
        'BANK_TRANSFER',
        NOW(),
        NOW()
    ),
    -- March - Pending (current month)
    (
        'test-payment-mar',
        'test-lease-001',
        'test-tenant-001',
        500000,
        '2026-03-05',
        NULL,
        'PENDING',
        NULL,
        NOW(),
        NOW()
    )
ON CONFLICT (id) DO NOTHING;

-- Verification queries
SELECT 'User created:' as info, email, name, role FROM "User" WHERE email = 'tenant.test@estatenet.com';
SELECT 'Tenant created:' as info, "tenantId" FROM "Tenant" WHERE "userId" = 'test-tenant-user-001';
SELECT 'Lease created:' as info, status, "monthlyRent" FROM "Lease" WHERE id = 'test-lease-001';
SELECT 'Payments created:' as info, COUNT(*) as count FROM "Payment" WHERE "tenantId" = 'test-tenant-001';
