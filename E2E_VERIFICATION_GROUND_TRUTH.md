# EstateNet E2E Verification - Ground Truth Documentation

## TASK 1: COMPLETE ROUTE & SCREEN MAPPING

### Backend API Routes (Port 3001)

#### Authentication Routes
**Base:** `/api/auth`
**File:** `backend/src/routes/auth.ts`
- `POST /api/auth/login` - User login (all roles) → `authController.login`
- `POST /api/auth/register-owner` - Owner registration → `authController.registerOwner`
- `POST /api/auth/register-manager` - Manager registration → `authController.registerManager`
- `POST /api/auth/register-tenant` - Tenant registration → `authController.registerTenant`
- `GET /api/auth/me` - Get current user → `authController.getCurrentUser`

#### Owner Routes
**Base:** `/api/owner`
**File:** `backend/src/routes/ownerInvitations.ts`
- `POST /api/owner/invitations` - Create manager invitation → `ownerInvitationController.createManagerInvitation` [OWNER only]
- `GET /api/owner/invitations` - Get owner's invitations → `ownerInvitationController.getOwnerInvitations` [OWNER only]
- `DELETE /api/owner/invitations/:id` - Cancel invitation → `ownerInvitationController.cancelInvitation` [OWNER only]
- `GET /api/owner/invitations/manager` - Get manager invitations → `ownerInvitationController.getManagerInvitations` [MANAGER only]
- `POST /api/owner/invitations/manager/:id/accept` - Accept invitation → `ownerInvitationController.acceptInvitation` [MANAGER only]
- `POST /api/owner/invitations/manager/:id/decline` - Decline invitation → `ownerInvitationController.declineInvitation` [MANAGER only]

**File:** `backend/src/routes/ownerBilling.ts`
- Additional owner billing routes mounted at `/api/owner`

#### Manager Routes
**Base:** `/api/manager`
**File:** `backend/src/routes/manager.ts`
- `GET /api/manager/enforcement-check` - Check billing enforcement status → inline handler [MANAGER only]
- `GET /api/manager/dashboard` - Get dashboard data → `managerController.getDashboardData` [MANAGER only]
- `GET /api/manager/leases` - Get manager leases → `managerController.getManagerLeases` [MANAGER only]
- `GET /api/manager/invitations` - Get manager invitations → `managerController.getManagerInvitations` [MANAGER only]
- `GET /api/manager/tenants` - Get manager tenants → `managerController.getManagerTenants` [MANAGER only]

**File:** `backend/src/routes/managerFinance.ts`
**Base:** `/api/manager/finance`
- `GET /api/manager/finance/rent-collection` - Get rent collection data → `managerFinanceController.getRentCollection`
- `GET /api/manager/finance/outstanding-rent` - Get outstanding rent → `managerFinanceController.getOutstandingRent`
- `GET /api/manager/finance/income-statement` - Get income statement → `managerFinanceController.getIncomeStatement`
- Additional finance routes for cashflow, financial position

**File:** `backend/src/routes/managerTerms.ts`
**Base:** `/api/manager`
- Manager terms acceptance routes

**File:** `backend/src/routes/billing.ts`
**Base:** `/api/manager`
- Manager billing routes

#### Property Routes
**Base:** `/api/properties`
**File:** `backend/src/routes/properties.ts`
- `POST /api/properties` - Create property → `propertyController.createProperty` [OWNER/MANAGER, billing enforced]
- `GET /api/properties` - Get all properties → `propertyController.getAllProperties` [authenticated]
- `GET /api/properties/:id` - Get property by ID → `propertyController.getPropertyById`
- `PUT /api/properties/:id` - Update property → `propertyController.updateProperty`
- `DELETE /api/properties/:id` - Delete property → `propertyController.deleteProperty`
- `POST /api/properties/:id/units` - Create unit → `propertyController.createUnit` [billing enforced]
- `GET /api/properties/:id/units` - Get property units → `propertyController.getPropertyUnits`

#### Tenant Routes
**Base:** `/api/tenants`
**File:** `backend/src/routes/tenants.ts`
- `POST /api/tenants/invite` - Invite tenant → `tenantController.inviteTenant` [MANAGER only, billing enforced]
- Additional tenant invitation management routes

**Base:** `/api/tenant`
**File:** `backend/src/routes/tenantMe.ts`
- `GET /api/tenant/me` - Get tenant profile → `tenantMeController.getTenantProfile` [TENANT only]
- `GET /api/tenant/me/active-lease` - Get active lease → `tenantMeController.getActiveLease` [TENANT only]
- `GET /api/tenant/me/rent-status` - Get rent status → `tenantMeController.getRentStatus` [TENANT only]
- `GET /api/tenant/me/message-targets` - Get message targets → `tenantMeController.getMessageTargets` [TENANT only]

#### Lease Routes
**Base:** `/api/leases`
**File:** `backend/src/routes/leases.ts`
- `POST /api/leases` - Create lease → `leaseController.createLease` [MANAGER only, billing enforced]
- `GET /api/leases/:id` - Get lease by ID → `leaseController.getLeaseById`
- Additional lease management routes

#### Payment Claim Routes
**File:** `backend/src/routes/paymentClaims.ts`
**Tenant endpoints:**
- `POST /api/tenant/payment-claims` - Create payment claim → `paymentClaimController.createPaymentClaim` [TENANT only]
- `GET /api/tenant/payment-claims` - Get tenant claims → `paymentClaimController.getTenantPaymentClaims` [TENANT only]

**Manager endpoints:**
- `GET /api/manager/payment-claims` - Get manager claims → `paymentClaimController.getManagerPaymentClaims` [MANAGER only]
- `POST /api/manager/payment-claims/:claimId/verify` - Verify/reject claim → `paymentClaimController.verifyPaymentClaim` [MANAGER only]
- `GET /api/manager/payment-claims/:claimId/history` - Get claim history → `paymentClaimController.getPaymentClaimHistory` [MANAGER only]

#### Payment Routes
**Base:** `/api/payments`
**File:** `backend/src/routes/payments.ts`
- Payment recording and retrieval routes

#### Report Routes
**Base:** `/api/reports`
**File:** `backend/src/routes/reports.ts`
- Financial reporting endpoints

#### Health & Info
- `GET /health` - Health check → inline handler (returns status, timestamp, architecture, version)
- `GET /api` - API info → inline handler (returns endpoint list)

---

### Frontend Screens & Navigation

#### Owner Screens
**Directory:** `src/screens/owner/`
**Navigation:** `OwnerStack` → `OwnerTabs` (bottom tabs)

**Tab Screens:**
1. **Dashboard** - `OwnerDashboardScreen.tsx` (line 36-42 in navigation/index.tsx)
   - Portfolio metrics, quick actions, recent activity
   - Uses `useOwnerApi` hook for data fetching
   
2. **Properties** - `OwnerPropertiesScreen.tsx` (line 175-180)
   - Property list with portfolio summary
   - Navigation to property details
   
3. **Invitations** - `OwnerInvitationsScreen.tsx` (line 182-187)
   - Manager invitation management
   - Create, view, cancel invitations
   
4. **Managers** - `OwnerManagersScreen.tsx` (line 188-194)
   - View assigned managers
   - Manager performance oversight
   
5. **Profile** - `OwnerProfileScreen.tsx` (line 195-201)
   - Owner profile and settings

**Stack Screens (accessible via navigation):**
- `OwnerPropertyDetailScreen.tsx` - Property detail view
- `OwnerSettingsScreen.tsx` - Settings (legacy)
- Additional oversight screens (Financial, Outstanding, Registry)

#### Manager Screens
**Directory:** `src/screens/manager/`
**Navigation:** `ManagerStack` → `ManagerTabs` (bottom tabs)

**Tab Screens:**
1. **Dashboard** - `ManagerDashboard.tsx` (line 88-94)
   - Overview metrics, quick actions
   
2. **Properties** - `PropertiesScreen.tsx` (line 95-101)
   - Property and unit management
   
3. **Tenants** - `TenantsScreen.tsx` (line 102-108)
   - Tenant list and management
   
4. **Billing** - `ManagerBillingScreen.tsx` (line 109-115)
   - Service billing and invoices
   
5. **Profile** - `ProfileScreen.tsx` (line 116-122)
   - Manager profile

**Stack Screens (accessible via navigation):**
- `OutstandingRentScreen.tsx` - Outstanding rent view
- `RentCollectionScreen.tsx` - Rent collection tracking
- `ManagerPaymentsScreen.tsx` - Payment management
- `ManagerPaymentClaimsScreen.tsx` - Payment claim verification
- `ManagerTermsScreen.tsx` - Terms acceptance
- `IncomeStatementScreen.tsx` - Income statement report
- `FinancialPositionScreen.tsx` - Financial position report
- `CashflowStatementScreen.tsx` - Cashflow statement report
- Supporting modals: `InviteTenantModal.tsx`, `RecordPaymentModal.tsx`, etc.

#### Tenant Screens
**Directory:** `src/screens/tenant/`
**Navigation:** `TenantTabs` (bottom tabs only)

**Tab Screens:**
1. **Home** - `TenantHomeScreen.tsx` (line 252-258)
   - Active lease details, rent status
   
2. **Invitations** - `TenantInvitationsScreen.tsx` (line 259-266)
   - View and accept/decline invitations
   
3. **Payments** - `PaymentsScreen.tsx` (line 267-273)
   - Submit payment claims, view history
   
4. **Messages** - `MessagesScreen.tsx` (line 274-281)
   - Inbox for manager communications
   
5. **Profile** - `TenantProfileScreen.tsx` (line 282-288)
   - Tenant profile

**Supporting Components:**
- `InvitationModal.tsx` - Invitation details
- `PaymentHistoryModal.tsx` - Payment history view
- `MessageDetailsModal.tsx` - Message details

#### Authentication Screens
**Directory:** `src/screens/auth/`
**Navigation:** `AuthStack`

- `SplashScreen.tsx` - App splash
- `WelcomeScreen.tsx` - Welcome/onboarding
- `RoleSelectionScreen.tsx` - Role selection
- `TermsScreen.tsx` - Terms and conditions
- `SignInScreen.tsx` - Login
- `SignUpScreen.tsx` - Registration

---

### API Client Configuration
**File:** `src/config/api.ts` (lines 24-42)

**Base URL Resolution Priority:**
1. `EXPO_PUBLIC_API_URL` environment variable (highest priority)
2. Platform-specific defaults:
   - Web: `http://localhost:3001/api`
   - Android: `http://10.0.2.2:3001/api`
   - iOS: `http://localhost:3001/api`

**AuthContext Usage:**
**File:** `src/context/AuthContext.tsx`
- `signIn` (line 119-150) - Uses `POST /api/auth/login`
- `signUp` (line 152-197) - Uses role-specific registration endpoints
- `refreshMe` (line 90-117) - Uses `GET /api/auth/me`
- Token stored in AsyncStorage, attached to all authenticated requests

---

### Database Schema (Key Models)
**File:** `backend/prisma/schema.prisma`

**User** (line 10-49)
- Roles: OWNER, MANAGER, TENANT
- Billing fields for managers (termsAcceptedAt, billingStatus, billingGraceUntil)

**Property** (line 117-137)
- ownerId (required), managerId (optional)
- Relations: units, leases, payments, invitations

**Unit** (line 139-156)
- propertyId, unitNumber, rentAmount
- Unique constraint: [propertyId, unitNumber]

**Lease** (line 158-180)
- tenantId (references TenantIdentity.tenantId), propertyId, unitId
- Status: ACTIVE, ENDED, EVICTED
- rentAmount, startDate, endDate

**PaymentClaim** (line 353-378)
- tenantId, leaseId, managerId, amount, method, referenceText
- Status: PENDING, VERIFIED, REJECTED
- flagged (fraud detection)

**Payment** (line 202-231)
- tenantId, propertyId, unitId, leaseId, amount
- Status: PENDING, SUCCESS, FAILED, PAID, OVERDUE
- paymentClaimId (unique, links to claim)
- billingPeriod (YYYY-MM format)

**PaymentClaimVerification** (line 380-393)
- claimId (unique), managerId, decision (VERIFIED/REJECTED), note

**OwnerManagerInvitation** (line 270-286)
- propertyId, ownerId, managerEmail, managerId (set on accept)
- Status: PENDING, ACCEPTED, DECLINED, EXPIRED, CANCELLED

---

## Environment Setup Verification Checklist

- [ ] Backend running on port 3001
- [ ] `GET http://localhost:3001/health` returns 200 OK
- [ ] PostgreSQL database running (Docker container `estatenet-postgres`)
- [ ] Frontend configured with `EXPO_PUBLIC_API_URL=http://localhost:3001/api`
- [ ] Test accounts seeded:
  - Owner: `kazoora@gmail.com` / `Ak47grave`
  - Manager: `mark@gmail.com` / `Ak47grave`
  - Tenant: `innocent@gmail.com` / `Ak47grave`

---

**Next Steps:**
- Task 2: Define deterministic test script with exact data flows
- Task 3: Decide automation vs manual approach
- Tasks 4-6: Execute verification and compile PASS/FAIL table
