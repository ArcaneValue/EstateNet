-- Delete all Rasuli test account data
-- Order matters due to foreign key constraints

DO $$
DECLARE
  v_user_id text;
BEGIN
  -- Get the user ID
  SELECT id INTO v_user_id FROM users WHERE email = 'rasuli@gmail.com';
  
  IF v_user_id IS NOT NULL THEN
    -- 1. Delete invoice lines first (references invoice)
    DELETE FROM invoice_lines 
    WHERE "invoiceId" IN (
      SELECT id FROM invoices WHERE "managerId" = v_user_id
    );
    
    -- 2. Delete invoices
    DELETE FROM invoices WHERE "managerId" = v_user_id;
    
    -- 3. Delete leases (references property, unit, tenant)
    DELETE FROM leases WHERE "propertyId" IN (
      SELECT id FROM properties WHERE "managerId" = v_user_id
    );
    
    -- 4. Delete tenant invitations
    DELETE FROM tenant_invitations WHERE "propertyId" IN (
      SELECT id FROM properties WHERE "managerId" = v_user_id
    );
    
    -- 5. Delete units (references property)
    DELETE FROM units WHERE "propertyId" IN (
      SELECT id FROM properties WHERE "managerId" = v_user_id
    );
    
    -- 6. Delete properties
    DELETE FROM properties WHERE "managerId" = v_user_id;
    
    -- 7. Delete tenant identity
    DELETE FROM tenant_identities WHERE "tenantId" = 'rasuli-tenant-id';
    
    -- 8. Delete service payments
    DELETE FROM service_payments WHERE "managerId" = v_user_id;
    
    -- 9. Delete payment claims
    DELETE FROM payment_claims WHERE "managerId" = v_user_id;
    
    -- 10. Delete notifications
    DELETE FROM notifications WHERE "userId" = v_user_id;
    
    -- 11. Delete messages
    DELETE FROM messages WHERE "fromUserId" = v_user_id OR "toUserId" = v_user_id;
    
    -- 12. Delete audit logs (correct column name)
    DELETE FROM audit_logs WHERE "performedByUserId" = v_user_id;
    
    -- 13. Finally, delete the user account
    DELETE FROM users WHERE id = v_user_id;
    
    RAISE NOTICE 'Successfully deleted all data for rasuli@gmail.com (ID: %)', v_user_id;
  ELSE
    RAISE NOTICE 'User rasuli@gmail.com not found';
  END IF;
END $$;

-- Verify deletion
SELECT 
  'Users' as table_name,
  COUNT(*) as remaining_records
FROM users 
WHERE email = 'rasuli@gmail.com'

UNION ALL

SELECT 
  'Properties',
  COUNT(*)
FROM properties 
WHERE id = 'rasuli-property-id'

UNION ALL

SELECT 
  'Invoices',
  COUNT(*)
FROM invoices 
WHERE id = 'rasuli-invoice-id'

UNION ALL

SELECT 
  'Leases',
  COUNT(*)
FROM leases 
WHERE id = 'rasuli-lease-id'

UNION ALL

SELECT 
  'Tenant Identities',
  COUNT(*)
FROM tenant_identities 
WHERE "tenantId" = 'rasuli-tenant-id';
