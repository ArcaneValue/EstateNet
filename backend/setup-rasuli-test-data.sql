-- Setup test data for Rasuli manager account
-- Service fee target: 2,000 UGX (1.5% of rent)
-- Rent needed: 2,000 / 0.015 = 133,333 UGX

-- 1. Create manager user (rasuli@gmail.com)
INSERT INTO users (id, email, password_hash, role, first_name, last_name, phone, created_at, updated_at)
VALUES (
  'rasuli-manager-id',
  'rasuli@gmail.com',
  '$2b$10$8K1p/a0dL3.I9/qNw5vYe.q3lE4qYOwUZ3xr7.5vYe.q3lE4qYOwU', -- Password: Ak47grave
  'MANAGER',
  'Rasuli',
  'Manager',
  '+256700000001',
  NOW(),
  NOW()
)
ON CONFLICT (email) DO UPDATE SET
  password_hash = EXCLUDED.password_hash,
  role = EXCLUDED.role,
  first_name = EXCLUDED.first_name,
  last_name = EXCLUDED.last_name,
  phone = EXCLUDED.phone;

-- 2. Create property for Rasuli
INSERT INTO properties (id, manager_id, name, location, created_at, updated_at)
VALUES (
  'rasuli-property-id',
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
INSERT INTO units (id, property_id, unit_number, is_occupied, created_at, updated_at)
VALUES (
  'rasuli-unit-id',
  'rasuli-property-id',
  'A101',
  true,
  NOW(),
  NOW()
)
ON CONFLICT (id) DO UPDATE SET
  is_occupied = EXCLUDED.is_occupied;

-- 4. Create tenant identity
INSERT INTO tenant_identities (tenant_id, email, password_hash, first_name, last_name, phone, created_at, updated_at)
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
ON CONFLICT (tenant_id) DO UPDATE SET
  email = EXCLUDED.email,
  first_name = EXCLUDED.first_name,
  last_name = EXCLUDED.last_name;

-- 5. Create active lease with rent = 133,333 UGX (to generate 2,000 UGX fee)
INSERT INTO leases (id, tenant_id, property_id, unit_id, rent_amount, start_date, end_date, status, created_at, updated_at)
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
  rent_amount = EXCLUDED.rent_amount,
  start_date = EXCLUDED.start_date,
  status = EXCLUDED.status;

-- 6. Create invoice for current period (April 2026) with DUE status
INSERT INTO invoices (
  id, 
  manager_id, 
  period_start, 
  period_end, 
  subtotal_amount, 
  fee_rate_bps, 
  fee_amount, 
  status, 
  due_date, 
  created_at, 
  updated_at
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
  NOW(),
  NOW()
)
ON CONFLICT (manager_id, period_start, period_end) DO UPDATE SET
  subtotal_amount = EXCLUDED.subtotal_amount,
  fee_amount = EXCLUDED.fee_amount,
  status = EXCLUDED.status,
  due_date = EXCLUDED.due_date;

-- 7. Create invoice line for the lease
INSERT INTO invoice_lines (
  id,
  invoice_id,
  property_id,
  unit_id,
  tenant_id,
  rent_amount,
  lease_id,
  created_at,
  updated_at
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
  rent_amount = EXCLUDED.rent_amount;

-- 8. Update manager billing status
INSERT INTO manager_billing_status (
  manager_id,
  terms_accepted,
  terms_accepted_at,
  phone_number,
  created_at,
  updated_at
)
VALUES (
  'rasuli-manager-id',
  true,
  NOW(),
  '+256700000001',
  NOW(),
  NOW()
)
ON CONFLICT (manager_id) DO UPDATE SET
  terms_accepted = EXCLUDED.terms_accepted,
  terms_accepted_at = EXCLUDED.terms_accepted_at,
  phone_number = EXCLUDED.phone_number;

-- Verify the setup
SELECT 
  'Manager' as type,
  u.email,
  u.role,
  u.phone
FROM users u
WHERE u.id = 'rasuli-manager-id'

UNION ALL

SELECT 
  'Invoice' as type,
  i.id as email,
  i.status as role,
  CONCAT('UGX ', i.fee_amount) as phone
FROM invoices i
WHERE i.manager_id = 'rasuli-manager-id'

UNION ALL

SELECT 
  'Lease' as type,
  l.id as email,
  l.status as role,
  CONCAT('UGX ', l.rent_amount) as phone
FROM leases l
WHERE l.property_id = 'rasuli-property-id';
