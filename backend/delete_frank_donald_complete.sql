-- Complete deletion of Frank and Donald including tenant_identities

-- Delete tenant_identities (this stores the email for tenants)
DELETE FROM tenant_identities WHERE email IN ('frank@gmail.com', 'donald@gmail.com');

-- Delete any remaining invitations
DELETE FROM tenant_invitations 
WHERE "tenantId" IN (
    SELECT "tenantId" FROM users WHERE email IN ('frank@gmail.com', 'donald@gmail.com')
) OR "invitedByUserId" IN (
    SELECT id FROM users WHERE email IN ('frank@gmail.com', 'donald@gmail.com')
);

-- Delete leases
DELETE FROM leases 
WHERE "tenantId" IN (
    SELECT "tenantId" FROM users WHERE email IN ('frank@gmail.com', 'donald@gmail.com')
);

-- Delete payments
DELETE FROM payments 
WHERE "tenantId" IN (
    SELECT "tenantId" FROM users WHERE email IN ('frank@gmail.com', 'donald@gmail.com')
);

-- Delete units
DELETE FROM units 
WHERE "propertyId" IN (
    SELECT id FROM properties WHERE "managerId" IN (
        SELECT id FROM users WHERE email IN ('frank@gmail.com', 'donald@gmail.com')
    )
);

-- Delete properties
DELETE FROM properties 
WHERE "managerId" IN (
    SELECT id FROM users WHERE email IN ('frank@gmail.com', 'donald@gmail.com')
) OR "ownerId" IN (
    SELECT id FROM users WHERE email IN ('frank@gmail.com', 'donald@gmail.com')
);

-- Delete notifications
DELETE FROM notifications 
WHERE "userId" IN (
    SELECT id FROM users WHERE email IN ('frank@gmail.com', 'donald@gmail.com')
);

-- Delete users
DELETE FROM users WHERE email IN ('frank@gmail.com', 'donald@gmail.com');
