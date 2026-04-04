-- Delete Frank and Donald accounts and all related data

-- First, delete all related data for both users
DELETE FROM tenant_invitations 
WHERE "tenantId" IN (
    SELECT "tenantId" FROM users WHERE email IN ('frank@gmail.com', 'donald@gmail.com')
) OR "invitedByUserId" IN (
    SELECT id FROM users WHERE email IN ('frank@gmail.com', 'donald@gmail.com')
);

DELETE FROM leases 
WHERE "tenantId" IN (
    SELECT "tenantId" FROM users WHERE email IN ('frank@gmail.com', 'donald@gmail.com')
);

DELETE FROM payments 
WHERE "tenantId" IN (
    SELECT "tenantId" FROM users WHERE email IN ('frank@gmail.com', 'donald@gmail.com')
);

DELETE FROM units 
WHERE "propertyId" IN (
    SELECT id FROM properties WHERE "managerId" IN (
        SELECT id FROM users WHERE email IN ('frank@gmail.com', 'donald@gmail.com')
    )
);

DELETE FROM properties 
WHERE "managerId" IN (
    SELECT id FROM users WHERE email IN ('frank@gmail.com', 'donald@gmail.com')
) OR "ownerId" IN (
    SELECT id FROM users WHERE email IN ('frank@gmail.com', 'donald@gmail.com')
);

DELETE FROM notifications 
WHERE "userId" IN (
    SELECT id FROM users WHERE email IN ('frank@gmail.com', 'donald@gmail.com')
);

-- Delete the users
DELETE FROM users WHERE email IN ('frank@gmail.com', 'donald@gmail.com');
