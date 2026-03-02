# Database Index Optimization Review - Production Scale

## Current Indexes Analysis

### PaymentClaim Model
**Existing indexes:**
- `[managerId, status]` - Manager dashboard queries
- `[tenantId, status]` - Tenant claim status lookups  
- `[tenantId, createdAt]` - Rate limiting queries (NEW)

**Required for scale (10K+ tenants, 200+ managers):**
- `[managerId, flagged, status]` - Fraud detection dashboard
- `[status, createdAt]` - Pending claim reminders (48h threshold)
- `[tenantId, status, createdAt]` - Fraud pattern detection
- `[managerId, createdAt]` - Manager activity timeline

### Notification Model
**Existing indexes:**
- `[userId, createdAt]` - User notifications timeline

**Required for scale:**
- `[userId, readAt, createdAt]` - Unread notifications (NULL readAt)
- `[type, createdAt]` - Notification type analytics
- `[userId, type, readAt]` - Filtered notification queries

### AuditLog Model (NEW)
**Existing indexes:**
- `[entityId, entityType, createdAt]` - Entity audit history
- `[performedByUserId, createdAt]` - User action history

**Additional for forensics:**
- `[entityType, action, createdAt]` - Action type analytics
- `[performedByUserId, entityType]` - User activity by entity type

### Invoice Model  
**Existing indexes:**
- None explicitly defined (relies on auto-indexes)

**Required for billing dashboard:**
- `[managerId, status, dueDate]` - Manager billing overview
- `[status, dueDate]` - Overdue invoice processing
- `[managerId, createdAt]` - Invoice history

### User Model
**Required for billing state machine:**
- `[billingStatus, billingGraceUntil]` - Billing enforcement queries
- `[role, billingStatus]` - Manager status analytics

## Performance Impact Analysis

### Query Patterns & Expected Load
1. **Payment Claim Creation**: 1000+ concurrent claims/day
2. **Manager Dashboards**: 200 managers, 50 queries/manager/day  
3. **Rate Limiting Checks**: 5000+ checks/hour (per tenant sliding window)
4. **Fraud Detection**: Real-time pattern analysis on every claim
5. **Audit Queries**: Forensic investigations, 100+ history lookups/day
6. **Billing Overviews**: Manager dashboard, 1000+ queries/day

### Index Strategy
- **Composite indexes** for multi-column WHERE clauses
- **Covering indexes** where possible to avoid table lookups
- **Partial indexes** for status-based queries (PENDING, OVERDUE, etc.)
- **Time-based indexes** for sliding window queries

## Implementation Priority
1. **Critical (Performance)**: PaymentClaim rate limiting & fraud detection
2. **High (Dashboard)**: Manager billing overview & notification queries  
3. **Medium (Analytics)**: Audit log forensics & reporting
4. **Low (Future)**: Advanced reporting & business intelligence

## Storage Impact Estimate
- Base tables: ~2GB (10K tenants, 200 managers, 1 year data)
- Additional indexes: ~500MB (25% overhead)
- AuditLog growth: ~100MB/month (immutable append-only)
- Total estimated: ~3GB first year

## Monitoring & Maintenance
- Query performance monitoring on critical endpoints
- Index usage statistics review monthly
- Slow query log analysis for optimization opportunities
- Automated index health checks in CI/CD pipeline
