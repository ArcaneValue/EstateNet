# EstateNet E2E Test Script - Deterministic User Stories

## Test Environment Prerequisites

### Backend
- PostgreSQL running: `docker ps | grep estatenet-postgres`
- Backend server: `cd backend && npm run dev` (port 3001)
- Health check: `curl http://localhost:3001/health` → expect 200 OK

### Frontend
- Environment variable set: `EXPO_PUBLIC_API_URL=http://localhost:3001/api`
- Frontend running: `npm start` (web or mobile)

### Test Data (Existing Accounts)
```
Owner:   kazoora@gmail.com / Ak47grave
Manager: mark@gmail.com / Ak47grave  
Tenant:  innocent@gmail.com / Ak47grave
```

---

## STORY 1: OWNER WORKFLOWS

### 1.1 Owner Sign In
**API:** `POST /api/auth/login`
**Screen:** `SignInScreen.tsx` → `OwnerDashboardScreen.tsx`

**Steps:**
1. Navigate to Sign In screen
2. Enter email: `kazoora@gmail.com`
3. Enter password: `Ak47grave`
4. Tap "Sign In"

**Expected:**
- HTTP 200 response with `{ success: true, data: { token, user } }`
- `user.role === 'OWNER'`
- Navigation to Owner Dashboard
- Token stored in AsyncStorage

**API Validation:**
```powershell
$body = @{ email = 'kazoora@gmail.com'; password = 'Ak47grave' } | ConvertTo-Json
$response = Invoke-RestMethod -Uri 'http://localhost:3001/api/auth/login' -Method Post -Body $body -ContentType 'application/json'
# Expect: $response.success -eq $true
# Expect: $response.data.user.role -eq 'OWNER'
```

---

### 1.2 Owner Dashboard - View Metrics
**API:** `GET /api/properties`, `GET /api/owner/invitations`
**Screen:** `OwnerDashboardScreen.tsx`

**Steps:**
1. Observe dashboard loads
2. Verify portfolio metrics displayed:
   - Total Properties count
   - Active Managers count
   - Pending Invitations count

**Expected:**
- Dashboard shows accurate counts from backend
- Quick actions visible: "Add Property", "Invite Manager", "View Financial"
- Recent activity list populated

**API Validation:**
```powershell
$headers = @{ Authorization = 'Bearer <OWNER_TOKEN>' }
$properties = Invoke-RestMethod -Uri 'http://localhost:3001/api/properties' -Headers $headers
$invitations = Invoke-RestMethod -Uri 'http://localhost:3001/api/owner/invitations' -Headers $headers
# Expect: counts match UI display
```

---

### 1.3 Owner Invites Manager
**API:** `POST /api/owner/invitations`
**Screen:** `OwnerDashboardScreen.tsx` → Invite Manager modal

**Test Data:**
- Property ID: (use existing property from step 1.2, or create new)
- Manager Email: `mark@gmail.com`

**Steps:**
1. Tap "Invite Manager" quick action
2. Select property from dropdown
3. Enter manager email: `mark@gmail.com`
4. Tap "Send Invitation"

**Expected:**
- HTTP 201 response with invitation object
- Invitation status: `PENDING`
- Invitation appears in Owner Invitations list
- Manager receives invitation (visible in Manager account)

**API Validation:**
```powershell
$headers = @{ Authorization = 'Bearer <OWNER_TOKEN>' }
$body = @{ 
    propertyId = '<PROPERTY_ID>'
    managerEmail = 'mark@gmail.com'
} | ConvertTo-Json
$invitation = Invoke-RestMethod -Uri 'http://localhost:3001/api/owner/invitations' -Method Post -Headers $headers -Body $body -ContentType 'application/json'
# Expect: $invitation.data.status -eq 'PENDING'
# Store: $invitationId = $invitation.data.id
```

---

### 1.4 Owner Views Managers
**API:** `GET /api/properties` (includes manager assignments)
**Screen:** `OwnerManagersScreen.tsx`

**Steps:**
1. Navigate to "Managers" tab
2. View list of managers assigned to properties

**Expected:**
- List shows managers with:
  - Manager name
  - Assigned properties count
  - Contact information
- No tenant PII visible (only property-level data)

**API Validation:**
```powershell
$headers = @{ Authorization = 'Bearer <OWNER_TOKEN>' }
$properties = Invoke-RestMethod -Uri 'http://localhost:3001/api/properties' -Headers $headers
# Expect: properties with managerId populated show manager details
# Expect: no tenant-specific data in response
```

---

## STORY 2: MANAGER WORKFLOWS

### 2.1 Manager Sign In
**API:** `POST /api/auth/login`
**Screen:** `SignInScreen.tsx` → `ManagerDashboard.tsx`

**Steps:**
1. Sign out as Owner
2. Navigate to Sign In
3. Enter email: `mark@gmail.com`
4. Enter password: `Ak47grave`
5. Tap "Sign In"

**Expected:**
- HTTP 200 response
- `user.role === 'MANAGER'`
- Navigation to Manager Dashboard
- Token stored in AsyncStorage

**API Validation:**
```powershell
$body = @{ email = 'mark@gmail.com'; password = 'Ak47grave' } | ConvertTo-Json
$response = Invoke-RestMethod -Uri 'http://localhost:3001/api/auth/login' -Method Post -Body $body -ContentType 'application/json'
# Store: $managerToken = $response.data.token
# Store: $managerId = $response.data.user.id
```

---

### 2.2 Manager Accepts Invitation
**API:** `GET /api/owner/invitations/manager`, `POST /api/owner/invitations/manager/:id/accept`
**Screen:** Manager dashboard or invitations view

**Steps:**
1. Check for pending invitations
2. Accept invitation from Owner (created in step 1.3)

**Expected:**
- Invitation status changes to `ACCEPTED`
- Property now shows in Manager's property list
- Property.managerId updated to Manager's ID

**API Validation:**
```powershell
$headers = @{ Authorization = 'Bearer <MANAGER_TOKEN>' }
$invitations = Invoke-RestMethod -Uri 'http://localhost:3001/api/owner/invitations/manager' -Headers $headers
# Find pending invitation
$invitationId = $invitations.data[0].id

$accept = Invoke-RestMethod -Uri "http://localhost:3001/api/owner/invitations/manager/$invitationId/accept" -Method Post -Headers $headers
# Expect: $accept.data.status -eq 'ACCEPTED'
```

---

### 2.3 Manager Creates Property
**API:** `POST /api/properties`
**Screen:** `PropertiesScreen.tsx` → Create Property modal

**Test Data:**
- Property Name: `QA Test Property`
- Location: `Kampala, Uganda`

**Steps:**
1. Navigate to "Properties" tab
2. Tap "Add Property"
3. Enter property name: `QA Test Property`
4. Enter location: `Kampala, Uganda`
5. Tap "Create"

**Expected:**
- HTTP 201 response with property object
- Property appears in Manager's property list
- Property.ownerId = Manager.id
- Property.managerId = Manager.id

**API Validation:**
```powershell
$headers = @{ Authorization = 'Bearer <MANAGER_TOKEN>' }
$body = @{ 
    name = 'QA Test Property'
    location = 'Kampala, Uganda'
} | ConvertTo-Json
$property = Invoke-RestMethod -Uri 'http://localhost:3001/api/properties' -Method Post -Headers $headers -Body $body -ContentType 'application/json'
# Store: $propertyId = $property.data.id
# Expect: $property.data.managerId -eq $managerId
```

---

### 2.4 Manager Creates Units (2 units)
**API:** `POST /api/properties/:id/units`
**Screen:** Property detail → Add Unit modal

**Test Data:**
- Unit 1: Number = `A1`, Rent = 950000
- Unit 2: Number = `A2`, Rent = 1200000

**Steps:**
1. Navigate to property detail
2. Tap "Add Unit"
3. Enter unit number: `A1`
4. Enter rent amount: `950000`
5. Tap "Create"
6. Repeat for Unit A2 with rent `1200000`

**Expected:**
- HTTP 201 for each unit
- Units appear in property unit list
- Unique constraint enforced: [propertyId, unitNumber]

**API Validation:**
```powershell
$headers = @{ Authorization = 'Bearer <MANAGER_TOKEN>' }

# Unit 1
$body1 = @{ unitNumber = 'A1'; rentAmount = 950000 } | ConvertTo-Json
$unit1 = Invoke-RestMethod -Uri "http://localhost:3001/api/properties/$propertyId/units" -Method Post -Headers $headers -Body $body1 -ContentType 'application/json'
# Store: $unit1Id = $unit1.data.id

# Unit 2
$body2 = @{ unitNumber = 'A2'; rentAmount = 1200000 } | ConvertTo-Json
$unit2 = Invoke-RestMethod -Uri "http://localhost:3001/api/properties/$propertyId/units" -Method Post -Headers $headers -Body $body2 -ContentType 'application/json'
# Store: $unit2Id = $unit2.data.id
```

---

### 2.5 Manager Invites Tenant
**API:** `POST /api/tenants/invite`
**Screen:** `TenantsScreen.tsx` → Invite Tenant modal

**Test Data:**
- Tenant Email: `innocent@gmail.com`
- Property: (use $propertyId from 2.3)
- Unit: (use $unit1Id from 2.4)
- Rent Amount: 950000

**Steps:**
1. Navigate to "Tenants" tab
2. Tap "Invite Tenant"
3. Enter tenant email: `innocent@gmail.com`
4. Select property and unit
5. Confirm rent amount: `950000`
6. Tap "Send Invitation"

**Expected:**
- HTTP 201 response with invitation
- TenantInvitation created with status `PENDING`
- Tenant receives invitation (visible in Tenant account)

**API Validation:**
```powershell
$headers = @{ Authorization = 'Bearer <MANAGER_TOKEN>' }
$body = @{ 
    email = 'innocent@gmail.com'
    propertyId = $propertyId
    unitId = $unit1Id
    rentAmount = 950000
} | ConvertTo-Json
$tenantInvite = Invoke-RestMethod -Uri 'http://localhost:3001/api/tenants/invite' -Method Post -Headers $headers -Body $body -ContentType 'application/json'
# Store: $tenantInvitationId = $tenantInvite.data.id
```

---

### 2.6 Manager Creates Lease
**API:** `POST /api/leases`
**Screen:** Lease creation modal or tenant detail

**Test Data:**
- Tenant ID: (from tenant account, e.g., `TN-MW5IEZ2V`)
- Property ID: $propertyId
- Unit ID: $unit1Id
- Rent Amount: 950000
- Start Date: Current date
- Status: `ACTIVE`

**Steps:**
1. Navigate to tenant or unit detail
2. Tap "Create Lease"
3. Select tenant, property, unit
4. Enter rent amount: `950000`
5. Set start date (default: today)
6. Tap "Create Lease"

**Expected:**
- HTTP 201 response with lease object
- Lease.status = `ACTIVE`
- Lease visible in Manager leases list
- Unit marked as occupied

**API Validation:**
```powershell
$headers = @{ Authorization = 'Bearer <MANAGER_TOKEN>' }
$body = @{ 
    tenantId = 'TN-MW5IEZ2V'  # Innocent's tenant ID
    propertyId = $propertyId
    unitId = $unit1Id
    rentAmount = 950000
    startDate = (Get-Date).ToString('yyyy-MM-dd')
    status = 'ACTIVE'
} | ConvertTo-Json
$lease = Invoke-RestMethod -Uri 'http://localhost:3001/api/leases' -Method Post -Headers $headers -Body $body -ContentType 'application/json'
# Store: $leaseId = $lease.data.id
# Expect: $lease.data.status -eq 'ACTIVE'
```

---

### 2.7 Manager Views Finance Baseline
**API:** `GET /api/manager/finance/rent-collection`, `GET /api/manager/finance/outstanding-rent`
**Screen:** `RentCollectionScreen.tsx`, `OutstandingRentScreen.tsx`

**Steps:**
1. Navigate to Finance → Rent Collection
2. Select current period (e.g., `2026-03`)
3. Note baseline values:
   - Expected Rent
   - Collected Rent
   - Outstanding Rent

**Expected:**
- Rent Collection shows property-level breakdown
- Outstanding Rent shows tenant-level arrears
- Before any payments: collectedRent = 0, outstandingRent = expectedRent

**API Validation:**
```powershell
$headers = @{ Authorization = 'Bearer <MANAGER_TOKEN>' }
$period = '2026-03'

$rentCollection = Invoke-RestMethod -Uri "http://localhost:3001/api/manager/finance/rent-collection?period=$period" -Headers $headers
$outstanding = Invoke-RestMethod -Uri "http://localhost:3001/api/manager/finance/outstanding-rent?period=$period" -Headers $headers

# Store baseline for comparison after payment verification
# Expect: $rentCollection.data.items[0].collectedRent -eq 0 (before payments)
```

---

## STORY 3: TENANT WORKFLOWS

### 3.1 Tenant Sign In
**API:** `POST /api/auth/login`
**Screen:** `SignInScreen.tsx` → `TenantHomeScreen.tsx`

**Steps:**
1. Sign out as Manager
2. Navigate to Sign In
3. Enter email: `innocent@gmail.com`
4. Enter password: `Ak47grave`
5. Tap "Sign In"

**Expected:**
- HTTP 200 response
- `user.role === 'TENANT'`
- Navigation to Tenant Home
- Token stored in AsyncStorage

**API Validation:**
```powershell
$body = @{ email = 'innocent@gmail.com'; password = 'Ak47grave' } | ConvertTo-Json
$response = Invoke-RestMethod -Uri 'http://localhost:3001/api/auth/login' -Method Post -Body $body -ContentType 'application/json'
# Store: $tenantToken = $response.data.token
# Store: $tenantId = $response.data.user.tenantId
```

---

### 3.2 Tenant Views Active Lease
**API:** `GET /api/tenant/me/active-lease`, `GET /api/tenant/me/rent-status`
**Screen:** `TenantHomeScreen.tsx`

**Steps:**
1. Observe Tenant Home screen
2. Verify lease details displayed:
   - Property name
   - Unit number
   - Monthly rent
   - Lease start date
   - Rent status (balance, overdue amount)

**Expected:**
- Active lease data matches lease created in step 2.6
- Property name: `QA Test Property`
- Unit number: `A1`
- Rent amount: `950000`
- Current balance shows expected rent

**API Validation:**
```powershell
$headers = @{ Authorization = 'Bearer <TENANT_TOKEN>' }

$activeLease = Invoke-RestMethod -Uri 'http://localhost:3001/api/tenant/me/active-lease' -Headers $headers
$rentStatus = Invoke-RestMethod -Uri 'http://localhost:3001/api/tenant/me/rent-status' -Headers $headers

# Expect: $activeLease.data.property.name -eq 'QA Test Property'
# Expect: $activeLease.data.unit.unitNumber -eq 'A1'
# Expect: $activeLease.data.rentAmount -eq 950000
```

---

### 3.3 Tenant Submits Payment Claim
**API:** `POST /api/tenant/payment-claims`
**Screen:** `PaymentsScreen.tsx` → Submit Payment modal

**Test Data:**
- Lease ID: $leaseId (from step 2.6)
- Amount: 950000 (1 month rent)
- Claimed Paid At: 2026-03-05
- Method: `BANK_TRANSFER`
- Reference: `QA-REF-001`

**Steps:**
1. Navigate to "Payments" tab
2. Tap "Submit Payment Claim"
3. Confirm lease auto-selected
4. Enter amount: `950000`
5. Select payment date: `2026-03-05`
6. Select method: `BANK_TRANSFER`
7. Enter reference: `QA-REF-001`
8. Tap "Submit"

**Expected:**
- HTTP 201 response with payment claim
- Claim status: `PENDING`
- Claim appears in tenant payment history
- Manager receives notification (claim pending review)

**API Validation:**
```powershell
$headers = @{ Authorization = 'Bearer <TENANT_TOKEN>' }
$body = @{ 
    leaseId = $leaseId
    amount = 950000
    claimedPaidAt = '2026-03-05T08:00:00.000Z'
    method = 'BANK_TRANSFER'
    referenceText = 'QA-REF-001'
} | ConvertTo-Json
$claim = Invoke-RestMethod -Uri 'http://localhost:3001/api/tenant/payment-claims' -Method Post -Headers $headers -Body $body -ContentType 'application/json'
# Store: $claimId = $claim.data.id
# Expect: $claim.data.status -eq 'PENDING'
```

---

### 3.4 Tenant Views Payment History
**API:** `GET /api/tenant/payment-claims`
**Screen:** `PaymentsScreen.tsx` → Payment History modal

**Steps:**
1. Tap "View History" or payment list
2. Verify claim from step 3.3 appears

**Expected:**
- Claim listed with:
  - Amount: 950000
  - Status: `PENDING`
  - Method: `BANK_TRANSFER`
  - Reference: `QA-REF-001`
  - Submission date

**API Validation:**
```powershell
$headers = @{ Authorization = 'Bearer <TENANT_TOKEN>' }
$claims = Invoke-RestMethod -Uri 'http://localhost:3001/api/tenant/payment-claims' -Headers $headers
# Expect: $claims.data[0].id -eq $claimId
# Expect: $claims.data[0].status -eq 'PENDING'
```

---

## STORY 4: CROSS-ROLE CONSISTENCY (PAYMENT VERIFICATION)

### 4.1 Manager Views Pending Claim
**API:** `GET /api/manager/payment-claims`
**Screen:** `ManagerPaymentClaimsScreen.tsx`

**Steps:**
1. Sign in as Manager (step 2.1)
2. Navigate to Payment Claims screen
3. Verify claim from step 3.3 appears in pending list

**Expected:**
- Claim visible with:
  - Tenant name: `Innocent`
  - Amount: 950000
  - Method: `BANK_TRANSFER`
  - Reference: `QA-REF-001`
  - Property: `QA Test Property`
  - Unit: `A1`
  - Status: `PENDING`

**API Validation:**
```powershell
$headers = @{ Authorization = 'Bearer <MANAGER_TOKEN>' }
$managerClaims = Invoke-RestMethod -Uri 'http://localhost:3001/api/manager/payment-claims' -Headers $headers
# Expect: claim with $claimId present
# Expect: tenant metadata matches
```

---

### 4.2 Manager Verifies Claim
**API:** `POST /api/manager/payment-claims/:claimId/verify`
**Screen:** `ManagerPaymentClaimsScreen.tsx` → Claim detail → Verify

**Test Data:**
- Decision: `VERIFIED`
- Note: `Rent received via bank transfer`

**Steps:**
1. Tap on pending claim
2. Review claim details
3. Tap "Verify" or "Approve"
4. Enter note: `Rent received via bank transfer`
5. Confirm verification

**Expected:**
- HTTP 200 response
- Claim status changes to `VERIFIED`
- **Payment record created:**
  - Payment.status = `PAID`
  - Payment.paymentClaimId = $claimId
  - Payment.leaseId = $leaseId
  - Payment.amount = 950000
  - Payment.billingPeriod = `2026-03`
- Tenant receives notification
- Audit timeline includes VERIFIED event

**API Validation:**
```powershell
$headers = @{ Authorization = 'Bearer <MANAGER_TOKEN>' }
$body = @{ 
    decision = 'VERIFIED'
    note = 'Rent received via bank transfer'
} | ConvertTo-Json
$verify = Invoke-RestMethod -Uri "http://localhost:3001/api/manager/payment-claims/$claimId/verify" -Method Post -Headers $headers -Body $body -ContentType 'application/json'
# Expect: $verify.success -eq $true
```

---

### 4.3 Data Correctness Check: Payment Created
**Database Query or API Check**

**Validation:**
1. Payment record exists with paymentClaimId = $claimId
2. Payment.status = `PAID`
3. Payment.leaseId = $leaseId
4. Payment.amount = 950000
5. Payment.billingPeriod = `2026-03`

**SQL Query:**
```sql
SELECT id, status, paymentClaimId, leaseId, amount, billingPeriod 
FROM "payments" 
WHERE "paymentClaimId" = '<CLAIM_ID>';
```

**Expected Result:**
- 1 row returned
- All fields match claim data

---

### 4.4 Data Correctness Check: Rent Collected Updated
**API:** `GET /api/manager/finance/rent-collection?period=2026-03`

**Validation:**
1. Compare with baseline from step 2.7
2. collectedRent increased by 950000
3. outstandingRent decreased by 950000
4. collectionRate updated

**API Validation:**
```powershell
$headers = @{ Authorization = 'Bearer <MANAGER_TOKEN>' }
$rentCollectionAfter = Invoke-RestMethod -Uri 'http://localhost:3001/api/manager/finance/rent-collection?period=2026-03' -Headers $headers

# Compare with baseline from step 2.7
# Expect: collectedRent increased by 950000
# Expect: property shows updated collection rate
```

---

### 4.5 Data Correctness Check: Income Statement
**API:** `GET /api/manager/finance/income-statement?period=2026-03`

**Validation:**
1. Payment amount (950000) appears in rental income
2. No duplicate entries
3. Period matches (2026-03)

**API Validation:**
```powershell
$headers = @{ Authorization = 'Bearer <MANAGER_TOKEN>' }
$incomeStatement = Invoke-RestMethod -Uri 'http://localhost:3001/api/manager/finance/income-statement?period=2026-03' -Headers $headers

# Expect: revenue.rentIncome includes 950000
# Verify no duplicates by checking payment count
```

---

### 4.6 Data Correctness Check: Tenant Rent Status
**API:** `GET /api/tenant/me/rent-status`

**Validation:**
1. currentBalance decreased by 950000
2. lastPaymentAt updated
3. Status reflects payment

**API Validation:**
```powershell
$headers = @{ Authorization = 'Bearer <TENANT_TOKEN>' }
$rentStatusAfter = Invoke-RestMethod -Uri 'http://localhost:3001/api/tenant/me/rent-status' -Headers $headers

# Compare with baseline from step 3.2
# Expect: currentBalance reduced by 950000
```

---

### 4.7 Tenant Sees Verification
**API:** `GET /api/tenant/payment-claims`
**Screen:** `PaymentsScreen.tsx` → Payment History

**Steps:**
1. Sign in as Tenant
2. Navigate to Payments → History
3. Verify claim status updated

**Expected:**
- Claim status: `VERIFIED`
- Verification note visible: `Rent received via bank transfer`
- Verification timestamp present

**API Validation:**
```powershell
$headers = @{ Authorization = 'Bearer <TENANT_TOKEN>' }
$claimsAfter = Invoke-RestMethod -Uri 'http://localhost:3001/api/tenant/payment-claims' -Headers $headers
# Expect: claim with $claimId has status 'VERIFIED'
```

---

### 4.8 Audit Timeline Check
**API:** `GET /api/manager/payment-claims/:claimId/history`

**Validation:**
1. Timeline includes CREATED event (tenant submission)
2. Timeline includes VERIFIED event (manager approval)
3. Timestamps accurate
4. Performer IDs correct

**API Validation:**
```powershell
$headers = @{ Authorization = 'Bearer <MANAGER_TOKEN>' }
$history = Invoke-RestMethod -Uri "http://localhost:3001/api/manager/payment-claims/$claimId/history" -Headers $headers

# Expect: timeline with 2 events (CREATED, VERIFIED)
# Expect: VERIFIED event has manager ID and note
```

---

## STORY 5: REJECTION FLOW

### 5.1 Tenant Submits Second Claim
**API:** `POST /api/tenant/payment-claims`

**Test Data:**
- Lease ID: $leaseId
- Amount: 950000
- Claimed Paid At: 2026-03-15
- Method: `CASH`
- Reference: `QA-REF-002`

**Steps:**
1. Sign in as Tenant
2. Submit new payment claim (different reference)

**Expected:**
- HTTP 201 response
- New claim created with status `PENDING`

**API Validation:**
```powershell
$headers = @{ Authorization = 'Bearer <TENANT_TOKEN>' }
$body = @{ 
    leaseId = $leaseId
    amount = 950000
    claimedPaidAt = '2026-03-15T08:00:00.000Z'
    method = 'CASH'
    referenceText = 'QA-REF-002'
} | ConvertTo-Json
$claim2 = Invoke-RestMethod -Uri 'http://localhost:3001/api/tenant/payment-claims' -Method Post -Headers $headers -Body $body -ContentType 'application/json'
# Store: $claim2Id = $claim2.data.id
```

---

### 5.2 Manager Rejects Claim
**API:** `POST /api/manager/payment-claims/:claimId/verify`

**Test Data:**
- Decision: `REJECTED`
- Note: `Duplicate payment - already verified for this period`

**Steps:**
1. Sign in as Manager
2. Navigate to Payment Claims
3. Select second claim
4. Tap "Reject"
5. Enter note: `Duplicate payment - already verified for this period`
6. Confirm rejection

**Expected:**
- HTTP 200 response
- Claim status changes to `REJECTED`
- **No payment record created**
- Tenant receives notification
- Audit timeline includes REJECTED event

**API Validation:**
```powershell
$headers = @{ Authorization = 'Bearer <MANAGER_TOKEN>' }
$body = @{ 
    decision = 'REJECTED'
    note = 'Duplicate payment - already verified for this period'
} | ConvertTo-Json
$reject = Invoke-RestMethod -Uri "http://localhost:3001/api/manager/payment-claims/$claim2Id/verify" -Method Post -Headers $headers -Body $body -ContentType 'application/json'
# Expect: $reject.success -eq $true
```

---

### 5.3 Verify No Payment Created for Rejected Claim
**Database Query**

**SQL Query:**
```sql
SELECT COUNT(*) 
FROM "payments" 
WHERE "paymentClaimId" = '<CLAIM2_ID>';
```

**Expected Result:**
- Count = 0 (no payment for rejected claim)

---

### 5.4 Tenant Sees Rejection
**API:** `GET /api/tenant/payment-claims`

**Validation:**
- Second claim status: `REJECTED`
- Rejection note visible
- Rent status unchanged (no balance reduction)

**API Validation:**
```powershell
$headers = @{ Authorization = 'Bearer <TENANT_TOKEN>' }
$claimsAfter = Invoke-RestMethod -Uri 'http://localhost:3001/api/tenant/payment-claims' -Headers $headers
# Expect: claim with $claim2Id has status 'REJECTED'
```

---

## STORY 6: OWNER OVERSIGHT AFTER ACTIVITY

### 6.1 Owner Refreshes Dashboard
**API:** `GET /api/properties`, `GET /api/owner/invitations`
**Screen:** `OwnerDashboardScreen.tsx`

**Steps:**
1. Sign in as Owner
2. Navigate to Dashboard
3. Observe updated metrics

**Expected:**
- Properties count reflects accepted manager assignments
- Invitations count shows pending/accepted status
- Recent activity includes manager acceptance, lease creation
- **No tenant PII visible** (only property-level aggregates)

**API Validation:**
```powershell
$headers = @{ Authorization = 'Bearer <OWNER_TOKEN>' }
$properties = Invoke-RestMethod -Uri 'http://localhost:3001/api/properties' -Headers $headers
$invitations = Invoke-RestMethod -Uri 'http://localhost:3001/api/owner/invitations' -Headers $headers

# Expect: invitation from step 1.3 shows status 'ACCEPTED'
# Expect: no tenant names/emails in property response
```

---

### 6.2 Owner Views Property Detail
**API:** `GET /api/properties/:id`
**Screen:** `OwnerPropertyDetailScreen.tsx`

**Steps:**
1. Navigate to Properties tab
2. Select property (managed by Mark)
3. View property details

**Expected:**
- Property name, location
- Manager name: `mark@gmail.com` or display name
- Unit count
- Occupancy rate
- **No individual tenant details** (only aggregates)

**API Validation:**
```powershell
$headers = @{ Authorization = 'Bearer <OWNER_TOKEN>' }
$propertyDetail = Invoke-RestMethod -Uri "http://localhost:3001/api/properties/$propertyId" -Headers $headers

# Expect: managerId present
# Expect: units listed
# Expect: no tenant-specific lease data
```

---

## TASK 4: DATA CORRECTNESS VALIDATION SUMMARY

### Idempotency Check
**Test:** Attempt to verify same claim twice

**Steps:**
1. Manager attempts to verify already-verified claim ($claimId)

**Expected:**
- HTTP 404 or 400 (claim not in PENDING status)
- No duplicate payment created

**API Validation:**
```powershell
$headers = @{ Authorization = 'Bearer <MANAGER_TOKEN>' }
$body = @{ decision = 'VERIFIED'; note = 'Duplicate attempt' } | ConvertTo-Json
try {
    Invoke-RestMethod -Uri "http://localhost:3001/api/manager/payment-claims/$claimId/verify" -Method Post -Headers $headers -Body $body -ContentType 'application/json'
} catch {
    # Expect: 404 or 400 error
}
```

### Payment-Claim Linkage
**SQL Query:**
```sql
SELECT p.id, p.status, p.paymentClaimId, p.leaseId, p.amount, pc.status AS claimStatus
FROM "payments" p
JOIN "payment_claims" pc ON p."paymentClaimId" = pc.id
WHERE pc.id = '<CLAIM_ID>';
```

**Expected:**
- Payment exists
- Payment.paymentClaimId = PaymentClaim.id
- Payment.status = 'PAID'
- PaymentClaim.status = 'VERIFIED'

### No Duplicate Payments
**SQL Query:**
```sql
SELECT COUNT(*) 
FROM "payments" 
WHERE "referenceText" = 'QA-REF-001';
```

**Expected:**
- Count = 1 (only one payment per reference)

---

## TASK 5: RBAC & SECURITY VALIDATION

### 5.1 Tenant Cannot Access Manager Endpoints
**Test:** Tenant token hitting manager-only endpoint

**API Validation:**
```powershell
$headers = @{ Authorization = 'Bearer <TENANT_TOKEN>' }
try {
    Invoke-RestMethod -Uri 'http://localhost:3001/api/manager/dashboard' -Headers $headers
} catch {
    # Expect: HTTP 403 Forbidden
}
```

**Expected:** HTTP 403

---

### 5.2 Manager Cannot Access Owner Endpoints
**Test:** Manager token hitting owner-only endpoint

**API Validation:**
```powershell
$headers = @{ Authorization = 'Bearer <MANAGER_TOKEN>' }
try {
    Invoke-RestMethod -Uri 'http://localhost:3001/api/owner/invitations' -Headers $headers
} catch {
    # Expect: HTTP 403 Forbidden
}
```

**Expected:** HTTP 403

---

### 5.3 Owner Cannot Access Tenant Endpoints
**Test:** Owner token hitting tenant-only endpoint

**API Validation:**
```powershell
$headers = @{ Authorization = 'Bearer <OWNER_TOKEN>' }
try {
    Invoke-RestMethod -Uri 'http://localhost:3001/api/tenant/me' -Headers $headers
} catch {
    # Expect: HTTP 403 Forbidden
}
```

**Expected:** HTTP 403

---

### 5.4 Cross-Tenant Claim Access
**Test:** Tenant A cannot access Tenant B's claims

**Setup:**
- Create second tenant account
- Submit claim as Tenant B
- Attempt to access Tenant B's claim with Tenant A token

**Expected:** HTTP 403 or 404 (claim not found for this tenant)

---

### 5.5 Manager Can Only Verify Own Claims
**Test:** Manager A cannot verify claims for Manager B's properties

**Expected:** HTTP 403 or 404 (claim not found for this manager)

---

## TASK 6: RELIABILITY CHECKS

### 6.1 App Refresh Persistence
**Test:** Refresh app, verify user stays logged in

**Steps:**
1. Sign in as any role
2. Refresh browser or restart app
3. Verify user remains authenticated

**Expected:**
- Token persists in AsyncStorage
- `AuthContext.refreshMe()` called on app load
- User navigated to correct role dashboard

---

### 6.2 Deterministic Results
**Test:** Repeat entire flow with fresh data

**Expected:**
- Same inputs produce same outputs
- No race conditions
- Consistent database state

---

## EXECUTION NOTES

### Manual Test Execution
- Use this script as a checklist
- Execute each step in order
- Record actual results in PASS/FAIL table
- Capture screenshots for failures
- Note any deviations from expected behavior

### API-Assisted Execution
- Use PowerShell commands provided
- Store tokens and IDs as variables
- Run SQL queries for database validation
- Log all API responses

### Automation Consideration
- Playwright for web UI testing
- API tests can be automated with Jest/Supertest
- Database assertions via Prisma client
- Mobile testing requires manual execution or Detox/Appium

---

**Next Step:** Execute this script and compile PASS/FAIL table (Task 6)
