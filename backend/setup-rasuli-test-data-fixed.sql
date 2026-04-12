-- Setup test data for Rasuli manager account
-- Service fee target: 2,000 UGX (1.5% of rent)
-- Rent needed: 2,000 / 0.015 = 133,333 UGX

-- 1. Create manager user (rasuli@gmail.com)
INSERT INTO "User" (id, email, "passwordHash", name, "phoneNumber", role, "createdAt", "updatedAt")
VALUES (
  'rasuli-manager-id',
  'rasuli@gmail.com',
  '$2b$10$8K1p/a0dL3.I9/qNw5vYe.q3lE4qYOwUZ3xr7.5vYe.q3lE4qYOwU', -- Password: Ak47grave
  'Rasuli Manager',
  '+256700000001',
  'MANAGER',
  NOW(),
  NOW()
)
ON CONFLICT (email) DO UPDATE SET
  "passwordHash" = EXCLUDED."passwordHash",
  role = EXCLUDED.role,
  name = EXCLUDED.name,
  "phoneNumber" = EXCLUDED."phoneNumber";

-- 2. Create property for Rasuli
INSERT INTO properties (id, "ownerId", "managerId", name, location, "createdAt", "updatedAt")
VALUES (
  'rasuli-property-id',
  'rasuli-manager-id',
  'rasuli-manager-id',
  'Rasuli Test Apartments',
  'Kampala, Uganda',
  NOW(),
  NOW()
)
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  location = EXCLUDED.location;

-- 3. Create unit for the property
INSERT INTO units (id, "propertyId", "unitNumber", "isOccupied", "createdAt", "updatedAt")
VALUES (
  'rasuli-unit-id',
  'rasuli-property-id',
  'A101',
  true,
  NOW(),
  NOW()
)
ON CONFLICT (id) DO UPDATE SET
  "isOccupied" = EXCLUDED."isOccupied";

-- 4. Create tenant identity
INSERT INTO tenant_identities ("tenantId", email, "passwordHash", "firstName", "lastName", phone, "createdAt", "updatedAt")
VALUES (
  'rasuli-tenant-id',
  'rasuli.tenant@gmail.com',
  '$2b$10$8K1p/a0dL3.I9/qNw5vYe.q3lE4qYOwUZ3xr7.5vYe.q3lE4qYOwU',
  'Test',
  'Tenant',
  '+256700000002',
  NOW(),
  NOW()
)
ON CONFLICT ("tenantId") DO UPDATE SET
  email = EXCLUDED.email,
  "firstName" = EXCLUDED."firstName",
  "lastName" = EXCLUDED."lastName";

-- 5. Create active lease with rent = 133,333 UGX (to generate 2,000 UGX fee)
INSERT INTO leases (id, "tenantId", "propertyId", "unitId", "rentAmount", "startDate", "endDate", status, "createdAt", "updatedAt")
VALUES (
  'rasuli-lease-id',
  'rasuli-tenant-id',
  'rasuli-property-id',
  'rasuli-unit-id',
  133333, -- This will generate 133,333 * 0.015 = 1,999.995 ≈ 2,000 UGX fee
  '2026-04-01', -- Start of current month
  NULL,
  'ACTIVE',
  NOW(),
  NOW()
)
ON CONFLICT (id) DO UPDATE SET
  "rentAmount" = EXCLUDED."rentAmount",
  "startDate" = EXCLUDED."startDate",
  status = EXCLUDED.status;

-- 6. Create invoice for current period (April 2026) with DUE status
INSERT INTO invoices (
  id, 
  "managerId", 
  "periodStart", 
  "periodEnd", 
  "subtotalAmount", 
  "feeRateBps", 
  "feeAmount", 
  status, 
  "dueDate",
  "lineCount",
  "createdAt", 
  "updatedAt"
)
VALUES (
  'rasuli-invoice-id',
  'rasuli-manager-id',
  '2026-04-01 00:00:00',
  '2026-04-30 23:59:59.999',
  133333,
  150, -- 1.5% = 150 basis points
  2000, -- Target fee amount
  'DUE', -- DUE status so Pay Now button appears
  '2026-05-07 23:59:59.999', -- Due 7 days after period end
  1,
  NOW(),
  NOW()
)
ON CONFLICT (id) DO UPDATE SET
  "subtotalAmount" = EXCLUDED."subtotalAmount",
  "feeAmount" = EXCLUDED."feeAmount",
  status = EXCLUDED.status,
  "dueDate" = EXCLUDED."dueDate";

-- 7. Create invoice line for the lease
INSERT INTO invoice_lines (
  id,
  "invoiceId",
  "propertyId",
  "unitId",
  "tenantId",
  "rentAmount",
  "leaseId",
  "createdAt",
  "updatedAt"
)
VALUES (
  'rasuli-invoice-line-id',
  'rasuli-invoice-id',
  'rasuli-property-id',
  'rasuli-unit-id',
  'rasuli-tenant-id',
  133333,
  'rasuli-lease-id',
  NOW(),
  NOW()
)
ON CONFLICT (id) DO UPDATE SET
  "rentAmount" = EXCLUDED."rentAmount";

-- 8. Update manager billing status (accept terms)
UPDATE "User"
SET 
  "managerTermsAcceptedAt" = NOW(),
  "billingStatus" = 'CURRENT',
  "payoutPhoneNumber" = '+256700000001'
WHERE id = 'rasuli-manager-id';

-- Verify the setup
SELECT 
  'Manager' as type,
  u.email,
  u.role,
  u."phoneNumber" as phone
FROM "User" u
WHERE u.id = 'rasuli-manager-id'

UNION ALL

SELECT 
  'Invoice' as type,
  i.id as email,
  i.status as role,
  CONCAT('UGX ', i."feeAmount") as phone
FROM invoices i
WHERE i."managerId" = 'rasuli-manager-id'

UNION ALL

SELECT 
  'Lease' as type,
  l.id as email,
  l.status as role,
  CONCAT('UGX ', l."rentAmount") as phone
FROM leases l
WHERE l."propertyId" = 'rasuli-property-id';
