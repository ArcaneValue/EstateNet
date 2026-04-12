-- Check Donald's lease start date vs current billing period
SELECT 
    l.id as lease_id,
    l."startDate",
    l."endDate",
    l.status,
    l."rentAmount",
    l."createdAt",
    ti.email as tenant_email,
    ti.name as tenant_name,
    p.name as property_name,
    u.email as manager_email,
    u.name as manager_name
FROM leases l
JOIN tenant_identities ti ON l."tenantId" = ti."tenantId"
JOIN properties p ON l."propertyId" = p.id
JOIN users u ON p."managerId" = u.id
WHERE ti.email = 'donald@gmail.com'
ORDER BY l."createdAt" DESC;

-- Show current billing period dates
SELECT 
    TO_CHAR(NOW() AT TIME ZONE 'Africa/Kampala', 'YYYY-MM') as current_period,
    DATE_TRUNC('month', NOW() AT TIME ZONE 'Africa/Kampala') as period_start,
    (DATE_TRUNC('month', NOW() AT TIME ZONE 'Africa/Kampala') + INTERVAL '1 month - 1 second') as period_end,
    NOW() AT TIME ZONE 'Africa/Kampala' as kampala_now;

-- Check if lease qualifies for current period invoice
-- (startDate must be <= period_start for current billing logic)
SELECT 
    l.id,
    l."startDate",
    DATE_TRUNC('month', NOW() AT TIME ZONE 'Africa/Kampala') as period_start,
    CASE 
        WHEN l."startDate" <= DATE_TRUNC('month', NOW() AT TIME ZONE 'Africa/Kampala') 
        THEN 'YES - Qualifies for current period invoice'
        ELSE 'NO - Lease started after period start, will be in NEXT month invoice'
    END as qualifies_for_current_invoice
FROM leases l
JOIN tenant_identities ti ON l."tenantId" = ti."tenantId"
WHERE ti.email = 'donald@gmail.com';
