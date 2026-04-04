-- Delete George and Annabel accounts and all related data from LOCALHOST database
-- This script handles foreign key constraints by deleting in the correct order

-- Get user IDs first
DO $$
DECLARE
    george_id TEXT;
    annabel_id TEXT;
BEGIN
    -- Find George's user ID
    SELECT id INTO george_id FROM users WHERE LOWER(email) = 'george@gmail.com';
    
    -- Find Annabel's user ID
    SELECT id INTO annabel_id FROM users WHERE LOWER(email) = 'annabel@gmail.com';
    
    -- Delete related data for these users
    
    -- 1. Delete invoice lines for properties owned/managed by these users
    DELETE FROM invoice_lines WHERE "propertyId" IN (
        SELECT id FROM properties WHERE "ownerId" = george_id OR "managerId" = george_id
    );
    
    -- 2. Delete service payments (must be before invoices due to FK)
    DELETE FROM service_payments WHERE "managerId" IN (george_id, annabel_id);
    
    -- 3. Delete invoices for these users
    DELETE FROM invoices WHERE "managerId" IN (george_id, annabel_id);
    
    -- 4. Delete payment claim verifications (must be before payment_claims)
    DELETE FROM payment_claim_verifications WHERE "managerId" IN (george_id, annabel_id);
    
    -- 5. Delete payment claims (must be before leases due to FK)
    DELETE FROM payment_claims WHERE "managerId" IN (george_id, annabel_id);
    DELETE FROM payment_claims WHERE "leaseId" IN (
        SELECT id FROM leases WHERE "tenantId" = annabel_id
    );
    DELETE FROM payment_claims WHERE "leaseId" IN (
        SELECT id FROM leases WHERE "unitId" IN (
            SELECT id FROM units WHERE "propertyId" IN (
                SELECT id FROM properties WHERE "ownerId" = george_id OR "managerId" = george_id
            )
        )
    );
    
    -- 6. Delete payments (must be before leases)
    DELETE FROM payments WHERE "tenantId" = annabel_id;
    DELETE FROM payments WHERE "leaseId" IN (
        SELECT id FROM leases WHERE "tenantId" = annabel_id
    );
    DELETE FROM payments WHERE "leaseId" IN (
        SELECT id FROM leases WHERE "unitId" IN (
            SELECT id FROM units WHERE "propertyId" IN (
                SELECT id FROM properties WHERE "ownerId" = george_id OR "managerId" = george_id
            )
        )
    );
    
    -- 7. Delete leases (must be before units)
    DELETE FROM leases WHERE "tenantId" = annabel_id;
    DELETE FROM leases WHERE "unitId" IN (
        SELECT id FROM units WHERE "propertyId" IN (
            SELECT id FROM properties WHERE "ownerId" = george_id OR "managerId" = george_id
        )
    );
    
    -- 8. Delete tenant invitations
    DELETE FROM tenant_invitations WHERE "invitedByUserId" IN (george_id, annabel_id) OR "tenantId" = annabel_id;
    
    -- 9. Delete owner-manager invitations
    DELETE FROM owner_manager_invitations WHERE "ownerId" = george_id OR "managerId" IN (george_id, annabel_id);
    
    -- 10. Delete messages
    DELETE FROM messages WHERE "fromUserId" IN (george_id, annabel_id) OR "toUserId" IN (george_id, annabel_id);
    
    -- 11. Delete notifications
    DELETE FROM notifications WHERE "userId" IN (george_id, annabel_id);
    
    -- 12. Delete audit logs
    DELETE FROM audit_logs WHERE "performedByUserId" IN (george_id, annabel_id);
    
    -- 13. Delete units for properties owned/managed by George
    DELETE FROM units WHERE "propertyId" IN (
        SELECT id FROM properties WHERE "ownerId" = george_id OR "managerId" = george_id
    );
    
    -- 14. Delete properties owned or managed by George
    DELETE FROM properties WHERE "ownerId" = george_id OR "managerId" = george_id;
    
    -- 15. Delete tenant identity for Annabel
    DELETE FROM tenant_identities WHERE "tenantId" = annabel_id;
    
    -- 16. Finally, delete the user accounts
    DELETE FROM users WHERE id IN (george_id, annabel_id);
    
    RAISE NOTICE 'Deleted George (%) and Annabel (%) accounts and all related data', george_id, annabel_id;
END $$;
