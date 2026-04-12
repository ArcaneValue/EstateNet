-- Setup test data for Rasuli manager account
-- Using existing user ID from rasuli@gmail.com
-- Service fee target: 2,000 UGX (1.5% of rent)
-- Rent needed: 2,000 / 0.015 = 133,333 UGX

DO $$
DECLARE
  v_user_id text;
  v_tenant_identity_id text;
BEGIN
  -- Get the actual user ID
  SELECT id INTO v_user_id FROM users WHERE email = 'rasuli@gmail.com';
  
  -- 1. Update manager user details
  UPDATE users
  SET 
    "passwordHash" = '$2b$10$8K1p/a0dL3.I9/qNw5vYe.q3lE4qYOwUZ3xr7.5vYe.q3lE4qYOwU',
    name = 'Rasuli Manager',
    "phoneNumber" = '+256700000001',
    role = 'MANAGER',
    "managerTermsAcceptedAt" = NOW(),
    "billingStatus" = 'CURRENT',
    "payoutPhoneNumber" = '+256700000001'
  WHERE email = 'rasuli@gmail.com';

  -- 2. Create property for Rasuli
  INSERT INTO properties (id, "ownerId", "managerId", name, location, "createdAt", "updatedAt")
  VALUES (
    'rasuli-property-id',
    v_user_id,
    v_user_id,
    'Rasuli Test Apartments',
    'Kampala, Uganda',
    NOW(),
    NOW()
  )
  ON CONFLICT (id) DO UPDATE SET
    name = EXCLUDED.name,
    location = EXCLUDED.location;

  -- 3. Create unit for the property
  INSERT INTO units (id, "propertyId", "unitNumber", "rentAmount", "isOccupied", "createdAt", "updatedAt")
  VALUES (
    'rasuli-unit-id',
    'rasuli-property-id',
    'A101',
    133333,
    true,
    NOW(),
    NOW()
  )
  ON CONFLICT (id) DO UPDATE SET
    "isOccupied" = EXCLUDED."isOccupied",
    "rentAmount" = EXCLUDED."rentAmount";

  -- 4. Create tenant identity (id is required, use cuid-like format)
  v_tenant_identity_id := 'rasuli-tenant-identity-' || substr(md5(random()::text), 1, 10);
  
  INSERT INTO tenant_identities (id, "tenantId", email, name, "phoneNumber", "createdAt", "updatedAt")
  VALUES (
    v_tenant_identity_id,
    'rasuli-tenant-id',
    'rasuli.tenant@gmail.com',
    'Test Tenant',
    '+256700000002',
    NOW(),
    NOW()
  )
  ON CONFLICT ("tenantId") DO UPDATE SET
    email = EXCLUDED.email,
    name = EXCLUDED.name;

  -- 5. Create active lease
  INSERT INTO leases (id, "tenantId", "propertyId", "unitId", "rentAmount", "startDate", "endDate", status, "createdAt", "updatedAt")
  VALUES (
    'rasuli-lease-id',
    'rasuli-tenant-id',
    'rasuli-property-id',
    'rasuli-unit-id',
    133333,
    '2026-04-01',
    NULL,
    'ACTIVE',
    NOW(),
    NOW()
  )
  ON CONFLICT (id) DO UPDATE SET
    "rentAmount" = EXCLUDED."rentAmount",
    "startDate" = EXCLUDED."startDate",
    status = EXCLUDED.status;

  -- 6. Create invoice with DUE status
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
    "createdAt", 
    "updatedAt"
  )
  VALUES (
    'rasuli-invoice-id',
    v_user_id,
    '2026-04-01 00:00:00',
    '2026-04-30 23:59:59.999',
    133333,
    150,
    2000,
    'DUE',
    '2026-05-07 23:59:59.999',
    NOW(),
    NOW()
  )
  ON CONFLICT (id) DO UPDATE SET
    "subtotalAmount" = EXCLUDED."subtotalAmount",
    "feeAmount" = EXCLUDED."feeAmount",
    status = EXCLUDED.status,
    "dueDate" = EXCLUDED."dueDate";

  -- 7. Create invoice line
  INSERT INTO invoice_lines (
    id,
    "invoiceId",
    "propertyId",
    "unitId",
    "tenantId",
    "rentAmount",
    "leaseId",
    "createdAt"
  )
  VALUES (
    'rasuli-invoice-line-id',
    'rasuli-invoice-id',
    'rasuli-property-id',
    'rasuli-unit-id',
    'rasuli-tenant-id',
    133333,
    'rasuli-lease-id',
    NOW()
  )
  ON CONFLICT (id) DO UPDATE SET
    "rentAmount" = EXCLUDED."rentAmount";

  RAISE NOTICE 'Setup complete for user ID: %', v_user_id;
END $$;

-- Verify the setup
SELECT 
  'Manager' as type,
  u.email,
  u.role::text as role,
  u."phoneNumber" as phone
FROM users u
WHERE u.email = 'rasuli@gmail.com'

UNION ALL

SELECT 
  'Invoice' as type,
  i.id as email,
  i.status as role,
  CONCAT('UGX ', i."feeAmount") as phone
FROM invoices i
JOIN users u ON i."managerId" = u.id
WHERE u.email = 'rasuli@gmail.com'

UNION ALL

SELECT 
  'Lease' as type,
  l.id as email,
  l.status::text as role,
  CONCAT('UGX ', l."rentAmount") as phone
FROM leases l
WHERE l."propertyId" = 'rasuli-property-id';
