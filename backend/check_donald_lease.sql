-- Check Donald's lease and unit occupancy status
SELECT 
    l.id as lease_id,
    l.status as lease_status,
    l."tenantId",
    l."unitId",
    u."unitNumber",
    u."isOccupied",
    ti.name as tenant_name,
    l."createdAt"
FROM leases l
JOIN units u ON l."unitId" = u.id
JOIN tenant_identities ti ON l."tenantId" = ti."tenantId"
WHERE l.status = 'ACTIVE'
ORDER BY l."createdAt" DESC
LIMIT 5;
