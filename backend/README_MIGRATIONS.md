# EstateNet Backend - Lease Model Implementation

## Migration Instructions

### Step 1: Generate Prisma Client
```bash
npm run db:generate
```

### Step 2: Create Database Migration
```bash
npm run db:migrate -- --name add-lease-model
```

### Step 3: Apply Migration to Database
```bash
npm run db:push
```

### Step 4: (Optional) Reset Database if Needed
```bash
npm run db:reset
```

## New Models Added

### Property
- Basic property information (name, location)
- Related to Units, Leases, and TenantInvitations

### Unit
- Individual rental units within properties
- Tracks occupancy status and rent amount
- Related to Leases and TenantInvitations

### Lease
- Active rental agreements between tenants and units
- Tracks lease status (ACTIVE, ENDED, EVICTED)
- Links to TenantIdentity, Property, and Unit

### TenantInvitation
- Invitation system for tenants to accept leases
- Tracks invitation status (PENDING, ACCEPTED, DECLINED, EXPIRED)
- Links to TenantIdentity, Property, Unit, and inviting User

## New API Endpoints

### Properties (Manager Only)
- `POST /api/properties` - Create property with optional units
- `GET /api/properties/:id` - Get property by ID

### Tenants
- `POST /api/tenants/invite` - Invite tenant to unit (Manager only)
- `POST /api/tenants/invitations/:id/accept` - Accept invitation (Tenant only)
- `POST /api/tenants/invitations/:id/decline` - Decline invitation (Tenant only)

### Leases
- `GET /api/leases/me/active-lease` - Get tenant's active lease (Tenant only)
- `POST /api/leases/:id/end` - End lease (Manager only)

### Reports
- `GET /api/reports/sample-pdf` - Generate sample PDF report

## Authentication & Authorization

### Role-Based Access Control
- **MANAGER**: Can create properties, invite tenants, end leases
- **TENANT**: Can view their active lease, accept/decline invitations

### Middleware
- `authenticateToken` - Validates JWT tokens
- `requireUserRole(role)` - Enforces role-based access

## PDF Export Foundation

### Puppeteer Integration
- Uses Puppeteer for HTML to PDF conversion
- Optimized for server environment
- Sample report template included

### Usage
```typescript
import { generatePdfFromHtml, createSampleReportHtml } from '../utils/pdf';

const html = createSampleReportHtml();
const pdfBuffer = await generatePdfFromHtml(html);
```

## Database Schema Changes

### New Enums
- `LeaseStatus`: ACTIVE, ENDED, EVICTED
- `InvitationStatus`: PENDING, ACCEPTED, DECLINED, EXPIRED

### Relationships
- Property → Units (1:N)
- Property → Leases (1:N)
- Property → TenantInvitations (1:N)
- Unit → Leases (1:N)
- Unit → TenantInvitations (1:N)
- TenantIdentity → Leases (1:N)
- TenantIdentity → TenantInvitations (1:N)
- User → TenantInvitations (1:N)

## Testing with Postman

### Create Property (Manager)
```json
POST /api/properties
{
  "name": "Sunrise Apartments",
  "location": "Kampala, Nakasero",
  "units": [
    {
      "unitNumber": "101",
      "rentAmount": 1200000
    },
    {
      "unitNumber": "102",
      "rentAmount": 1400000
    }
  ]
}
```

### Invite Tenant (Manager)
```json
POST /api/tenants/invite
{
  "tenantId": "T12345",
  "propertyId": "property-id-here",
  "unitId": "unit-id-here",
  "rentAmount": 1200000
}
```

### Accept Invitation (Tenant)
```json
POST /api/tenants/invitations/invitation-id-here/accept
```

### Get Active Lease (Tenant)
```json
GET /api/leases/me/active-lease
```

### End Lease (Manager)
```json
POST /api/leases/lease-id-here/end
{
  "reason": "ENDED"
}
```

### Generate Sample PDF
```json
GET /api/reports/sample-pdf
```

## Dependencies Added

- `puppeteer`: For PDF generation from HTML templates

## Notes

- All endpoints return consistent `{ success, message, data }` format
- Proper error handling with appropriate HTTP status codes
- Input validation on all required fields
- Role-based access control enforced on all endpoints
- Database transactions ensure data consistency
- PDF generation includes proper error handling and cleanup
