-- Clean up test accounts
DELETE FROM tenant_invitations 
WHERE "tenantId" IN (
    SELECT "tenantId" FROM users WHERE email IN ('testmanager@test.com', 'testtenant@test.com')
);

DELETE FROM properties 
WHERE "ownerId" IN (
    SELECT id FROM users WHERE email IN ('testmanager@test.com', 'testtenant@test.com')
) OR "managerId" IN (
    SELECT id FROM users WHERE email IN ('testmanager@test.com', 'testtenant@test.com')
);

DELETE FROM users WHERE email IN ('testmanager@test.com', 'testtenant@test.com');
