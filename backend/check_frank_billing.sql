-- Check Frank's account details
SELECT 
    id,
    email,
    name,
    role,
    "termsAcceptedAt",
    "billingStatus",
    "billingGraceUntil",
    "createdAt"
FROM users 
WHERE email = 'frank@gmail.com';

-- Check if Donald's lease exists and is ACTIVE
SELECT 
    l.id as lease_id,
    l."tenantId",
    l."propertyId",
    l."unitId",
    l."rentAmount",
    l.status,
    l."startDate",
    l."endDate",
    l."createdAt",
    p.name as property_name,
    p."managerId",
    u."unitNumber"
FROM leases l
JOIN properties p ON l."propertyId" = p.id
JOIN units u ON l."unitId" = u.id
WHERE l."tenantId" IN (
    SELECT "tenantId" FROM tenant_identities WHERE email = 'donald@gmail.com'
);

-- Check if any invoices exist for Frank
SELECT 
    i.id,
    i."managerId",
    i."periodStart",
    i."periodEnd",
    i."subtotalAmount",
    i."feeAmount",
    i.status,
    i."dueDate",
    i."createdAt"
FROM invoices i
JOIN users u ON i."managerId" = u.id
WHERE u.email = 'frank@gmail.com'
ORDER BY i."periodStart" DESC;

-- Check billing scheduler job locks
SELECT * FROM job_locks WHERE "jobName" = 'daily-billing-tasks';
