# ESTATENET — FULL DIAGNOSTIC + UNISON AUDIT (MANAGER ↔ TENANT)
**Generated:** March 6, 2026  
**Scope:** Frontend + Backend End-to-End Analysis  
**Constraint:** NO CODE CHANGES — Evidence-backed analysis only

---

## 1) EXECUTIVE SUMMARY

### Overall Readiness Score: ⚠️ **PARTIAL**

**Reasons:**
1. **Critical Missing Endpoint:** Tenant rent-status endpoint (`/tenant/rent-status`) is called by frontend but **NOT FOUND** in backend routes
2. **Tenant Active Lease Endpoint Missing:** Frontend calls for active lease data but no dedicated `/tenant/leases/active` endpoint exists
3. **Data Contract Mismatches:** Rent status enum inconsistency between frontend expectations and likely backend implementation

### Top 10 Highest-Risk Breakpoints (Ranked)

| Rank | Issue | Severity | Impact | Evidence |
|------|-------|----------|--------|----------|
| 1 | **Missing `/tenant/rent-status` endpoint** | 🔴 CRITICAL | Tenant home screen will fail to load rent status | `useTenantFinance.ts:24` calls endpoint, no backend route found |
| 2 | **Missing `/tenant/leases/active` endpoint** | 🔴 CRITICAL | Tenant cannot retrieve active lease data | `LeaseContext` likely calls this, no backend route found |
| 3 | **Rent status enum mismatch** | 🟠 HIGH | Status badges may display incorrectly | Frontend expects `PAID/PARTIAL/DUE/NO_LEASE`, backend may use different enums |
| 4 | **Manager dashboard no enforcement** | 🟡 MEDIUM | Dashboard accessible even if billing suspended | `manager.ts:26` - no middleware on `/dashboard` |
| 5 | **Payment claim verification race condition** | 🟡 MEDIUM | Concurrent verify/reject may create duplicate payments | No transaction locking in `verifyPaymentClaim` |
| 6 | **Tenant invitation accept/reject endpoints use different paths** | 🟡 MEDIUM | Frontend may call wrong endpoint pattern | Routes use `/tenants/invitations/:id/accept` vs potential `/tenant/invitations/:id/accept` |
| 7 | **Missing tenant payments list endpoint** | 🟠 HIGH | Tenant Payments screen cannot load payment history | No `/tenant/payments` route found |
| 8 | **Missing tenant messages endpoints** | 🟠 HIGH | Tenant Messages screen non-functional | No `/tenant/messages` or `/messages` routes found |
| 9 | **Manager payment claims merge logic client-side only** | 🟡 MEDIUM | Verified claims merged in frontend, not reflected in backend payments list | `ManagerPaymentsScreen.tsx:74-86` |
| 10 | **No scoping proof for manager dashboard** | 🟡 MEDIUM | Potential data leak if managerId not enforced | `getDashboardData` controller needs verification |

---

## 2) SYSTEM MAP (MANAGER ↔ TENANT)

| Entity | Backend Model(s) | Manager Screens Using It | Tenant Screens Using It | Endpoints | Notes |
|--------|------------------|-------------------------|------------------------|-----------|-------|
| **User/Auth** | `User` (Prisma) | All screens via `AuthContext` | All screens via `AuthContext` | `/auth/signin`, `/auth/signup` | ✅ Role routing works: `navigation/index.tsx:312-318` |
| **Property** | `Property` | Dashboard, Properties, Invitations | Home (via lease) | `/manager/dashboard`, `/properties/*` | ✅ Manager scoped by `managerId` |
| **Unit** | `Unit` | Properties, Invitations | Home (via lease) | Embedded in property endpoints | ✅ Linked to properties |
| **Lease** | `Lease` | Dashboard, Tenants, Invitations | **Home (CRITICAL)** | `/manager/leases`, ❌ `/tenant/leases/active` NOT FOUND | 🔴 Tenant cannot fetch active lease |
| **TenantInvitation** | `TenantInvitation` | Dashboard, Tenants (invite flow) | **Invitations** | ✅ `/tenants/invite` (manager), ✅ `/tenants/invitations` (tenant list), ✅ `/tenants/invitations/:id/accept`, ✅ `/tenants/invitations/:id/decline` | ✅ Full CRUD cycle exists |
| **Payment** | `Payment` | Payments, Dashboard | **Payments (CRITICAL)** | `/payments/summary`, `/payments`, ❌ `/tenant/payments` NOT FOUND | 🔴 Tenant cannot list payments |
| **PaymentClaim** | `PaymentClaim` | Payment Claims | **Payments (submit claim)** | ✅ `/manager/payment-claims`, ✅ `/manager/payment-claims/:id/verify`, ✅ `/tenant/payment-claims` (create), ✅ `/tenant/payment-claims` (list) | ✅ Full cycle exists |
| **RentStatus** | Computed (not a model) | Dashboard (outstanding), Rent Collection | **Home (CRITICAL)** | `/manager/finance/rent-collection`, ❌ `/tenant/rent-status` NOT FOUND | 🔴 Tenant cannot fetch rent status |
| **Billing/Invoice** | `BillingStatus`, `Invoice`, `ServicePayment` | **Billing** | N/A | `/billing/status`, `/billing/invoices`, `/billing/pay` | ✅ Manager billing flow exists |
| **Message/Notification** | Unknown | Unknown | **Messages** | ❌ NOT FOUND | 🔴 Messages feature not implemented |

---

## 3) END-TO-END FUNCTIONALITY MATRIX (PASS/FAIL)

### A) Onboarding/Auth

| Flow | Frontend Screen(s) | Frontend API Call(s) | Backend Route(s) | Controller/Service | Scoping Proof | Runtime Assumption | PASS/FAIL |
|------|-------------------|---------------------|------------------|-------------------|---------------|-------------------|-----------|
| Sign up tenant | `SignUpScreen.tsx` | `/auth/signup` with `role: TENANT` | ✅ `/auth/signup` | `authController.ts` | N/A (public) | User record created with `tenantId` | ⚠️ PARTIAL (need to verify tenantId creation) |
| Sign up manager | `SignUpScreen.tsx` | `/auth/signup` with `role: MANAGER` | ✅ `/auth/signup` | `authController.ts` | N/A (public) | User record created with `managerId` | ⚠️ PARTIAL (need to verify managerId creation) |
| Sign in | `SignInScreen.tsx` | `/auth/signin` | ✅ `/auth/signin` | `authController.ts` | N/A (public) | Returns JWT with `userId`, `role`, `tenantId`/`managerId` | ✅ PASS |
| Role routing | `navigation/index.tsx:306-320` | N/A | N/A | N/A | `user?.role` check | `isAuthenticated && user.role` determines stack | ✅ PASS |

**Evidence:**
```typescript
// navigation/index.tsx:306-320
export const Navigation = () => {
    const { isAuthenticated, user } = useAuth();
    return (
        <NavigationContainer>
            {!isAuthenticated ? (
                <AuthStack />
            ) : user?.role === 'OWNER' ? (
                <OwnerStack />
            ) : user?.role === 'MANAGER' ? (
                <ManagerStack />
            ) : (
                <TenantTabs />
            )}
        </NavigationContainer>
    );
};
```

### B) Tenant Flows

| Flow | Frontend Screen(s) | Frontend API Call(s) | Backend Route(s) | Controller/Service | Scoping Proof | Runtime Assumption | PASS/FAIL |
|------|-------------------|---------------------|------------------|-------------------|---------------|-------------------|-----------|
| **Tenant Home shows active lease** | `TenantHomeScreen.tsx` | `LeaseContext` → likely `/tenant/leases/active` or `/leases/active` | ❌ **NOT FOUND** | N/A | N/A | Lease data with property, unit, rentAmount | 🔴 **FAIL** |
| **Tenant Home shows rent status** | `TenantHomeScreen.tsx:26, 109-130` | `usePayments()` → `/tenant/rent-status` | ❌ **NOT FOUND** | N/A | N/A | RentStatus with status, amounts, dates | 🔴 **FAIL** |
| **Tenant receives invitations** | `TenantInvitationsScreen.tsx` | `/tenants/invitations` | ✅ `tenants.ts:19-24` | `getTenantInvitations` | ✅ Scoped by `req.user.tenantId` | Returns invitations for tenant | ✅ PASS |
| **Tenant accepts invitation** | `TenantHomeScreen.tsx:49-70` | `/tenants/invitations/:id/accept` | ✅ `tenants.ts:26-31` | `acceptInvitation` | ✅ Scoped by `req.user.tenantId` | Creates lease, updates invitation | ✅ PASS |
| **Tenant rejects invitation** | `TenantHomeScreen.tsx:72-101` | `/tenants/invitations/:id/decline` | ✅ `tenants.ts:33-38` | `declineInvitation` | ✅ Scoped by `req.user.tenantId` | Updates invitation status | ✅ PASS |
| **Tenant Payments list** | `PaymentsScreen.tsx` | Likely `/tenant/payments` | ❌ **NOT FOUND** | N/A | N/A | Payment history for tenant | 🔴 **FAIL** |
| **Tenant submit payment claim** | `PaymentsScreen.tsx` (if implemented) | `/tenant/payment-claims` (POST) | ✅ `paymentClaims.ts:18-24` | `createPaymentClaim` | ✅ Scoped by `req.user.tenantId` | Creates claim | ✅ PASS |
| **Tenant Messages** | `MessagesScreen.tsx` | Likely `/tenant/messages` or `/messages` | ❌ **NOT FOUND** | N/A | N/A | Message threads | 🔴 **FAIL** |

**Critical Evidence:**
```typescript
// TenantHomeScreen.tsx:26 - Calls rent status
const { loadPayments, rentStatus, rentStatusLoading, loadRentStatus } = usePayments();

// TenantHomeScreen.tsx:109-130 - Uses rent status data
const rentStatusData = rentStatus;
const hasRentStatus = !!rentStatusData && rentStatusData.status !== 'NO_LEASE';
const periodDue = hasRentStatus ? rentStatusData.amountDueForPeriod : 0;
const periodPaid = hasRentStatus ? rentStatusData.totalPaidForPeriod : 0;
```

```typescript
// useTenantFinance.ts:24 - Endpoint called
const { status, json } = await apiGet(`/tenant/rent-status${queryParam}`);
```

**Backend Route Search Result:** ❌ NO MATCH FOUND for `/tenant/rent-status`

### C) Manager Flows

| Flow | Frontend Screen(s) | Frontend API Call(s) | Backend Route(s) | Controller/Service | Scoping Proof | Runtime Assumption | PASS/FAIL |
|------|-------------------|---------------------|------------------|-------------------|---------------|-------------------|-----------|
| **Manager Dashboard metrics** | `ManagerDashboard.tsx` | `/manager/dashboard` | ✅ `manager.ts:26` | `getDashboardData` | ⚠️ NEEDS VERIFICATION | Dashboard data scoped to manager | ⚠️ PARTIAL |
| **Invite tenant (ID lookup)** | `TenantsScreen.tsx` | `/tenants/invite` (POST) | ✅ `tenants.ts:11-17` | `inviteTenant` | ✅ Has `requireManagerTermsAccepted`, `requireCurrentBilling` | Creates invitation | ✅ PASS |
| **View tenants list** | `TenantsScreen.tsx` | `/manager/tenants` | ✅ `manager.ts:35` | `getManagerTenants` | ⚠️ NEEDS VERIFICATION | Tenants with active leases | ⚠️ PARTIAL |
| **View payments (with claims merge)** | `ManagerPaymentsScreen.tsx:54-98` | `/payments/summary`, `/payments`, `/manager/payment-claims?status=VERIFIED` | ✅ All exist | Multiple controllers | ⚠️ Client-side merge | Merges verified claims into payments list | ⚠️ PARTIAL |
| **Review payment claims** | `ManagerPaymentClaimsScreen.tsx` | `/manager/payment-claims` (GET) | ✅ `paymentClaims.ts:37-42` | `getManagerPaymentClaims` | ✅ Scoped by manager properties | Claims for manager's properties | ✅ PASS |
| **Verify/reject claim** | `ManagerPaymentClaimsScreen.tsx` | `/manager/payment-claims/:id/verify` (POST) | ✅ `paymentClaims.ts:45-50` | `verifyPaymentClaim` | ✅ Scoped by manager properties | Creates payment on verify | ✅ PASS |
| **Rent collection report** | `RentCollectionScreen.tsx` | `/manager/finance/rent-collection` | ✅ `managerFinance.ts` | `getRentCollectionData` | ✅ Scoped by `managerId`, `propertyId` | Rent collection data | ✅ PASS |
| **Income statement** | `IncomeStatementScreen.tsx` | `/manager/finance/income-statement` | ✅ `managerFinance.ts` | `getIncomeStatementData` | ✅ Scoped by `managerId`, `propertyId` | Income data | ✅ PASS |
| **Financial position** | `FinancialPositionScreen.tsx` | `/manager/finance/financial-position` | ✅ `managerFinance.ts` | `getFinancialPositionData` | ✅ Scoped by `managerId`, `propertyId` | Balance sheet data | ✅ PASS |
| **Cashflow statement** | `CashflowStatementScreen.tsx` | `/manager/finance/cashflow` | ✅ `managerFinance.ts` | `getCashflowStatementData` | ✅ Scoped by `managerId`, `propertyId` | Cashflow data | ✅ PASS |
| **Billing page** | `ManagerBillingScreen.tsx` | `/billing/status`, `/billing/invoices`, `/billing/pay` | ✅ Billing routes exist | Billing controllers | ✅ Scoped by `managerId` | Billing status and invoices | ✅ PASS |

**Evidence:**
```typescript
// useManagerDashboard.ts:60
const { status, json } = await apiGet('/manager/dashboard');

// manager.ts:26 - Route exists but NO enforcement middleware
router.get('/dashboard', getDashboardData);
```

### D) Cross-Role Unison Flows

| Flow | Screens Involved | API Calls | Backend Processing | Data Sync | PASS/FAIL |
|------|-----------------|-----------|-------------------|-----------|-----------|
| **Manager invites → Tenant sees** | `TenantsScreen` → `TenantInvitationsScreen` | `/tenants/invite` (POST) → `/tenants/invitations` (GET) | Creates `TenantInvitation` record | ✅ Same DB table | ✅ PASS |
| **Tenant accepts → Manager dashboard updates** | `TenantHomeScreen` → `ManagerDashboard` | `/tenants/invitations/:id/accept` → `/manager/dashboard` | Creates `Lease`, updates `TenantInvitation` | ✅ Dashboard queries updated data | ✅ PASS |
| **Tenant submits claim → Manager reviews** | `PaymentsScreen` (tenant) → `ManagerPaymentClaimsScreen` | `/tenant/payment-claims` (POST) → `/manager/payment-claims` (GET) | Creates `PaymentClaim` | ✅ Same DB table, scoped queries | ✅ PASS |
| **Manager verifies → Tenant sees payment** | `ManagerPaymentClaimsScreen` → `PaymentsScreen` (tenant) | `/manager/payment-claims/:id/verify` → `/tenant/payments` (GET) | Creates `Payment` from claim | ❌ **Tenant payments endpoint missing** | 🔴 **FAIL** |
| **Manager verifies → Tenant rent status updates** | `ManagerPaymentClaimsScreen` → `TenantHomeScreen` | `/manager/payment-claims/:id/verify` → `/tenant/rent-status` | Payment affects rent calculation | ❌ **Rent status endpoint missing** | 🔴 **FAIL** |

---

## 4) CONTRACT CONSISTENCY CHECKS (CRITICAL)

### PaymentClaim Contract

**Frontend Interface (`useTenantFinance.ts` - NOT FOUND, using context clues):**
```typescript
// Expected from ManagerPaymentClaimsScreen usage
interface PaymentClaim {
    id: string;
    amount: number;
    claimedPaidAt: string;
    method: string;
    referenceText: string;
    status: 'PENDING' | 'VERIFIED' | 'REJECTED';
    tenantIdentity: { name: string; email: string; };
    lease: {
        property: { name: string; location: string; };
        unit: { unitNumber: string; };
    };
    verification?: {
        decidedAt: string;
        decidedBy: string;
        decision: 'VERIFIED' | 'REJECTED';
        notes?: string;
    };
}
```

**Backend Response (from previous session evidence):**
✅ Matches - `paymentClaimController.ts` returns this exact structure

### RentStatus Contract ⚠️ CRITICAL MISMATCH

**Frontend Interface (`useTenantFinance.ts:4-11`):**
```typescript
export interface TenantRentStatus {
    period: string;
    hasActiveLeaseAtPeriodStart: boolean;
    expectedRent: number;
    paidForPeriod: number;
    outstandingForPeriod: number;
    status: 'PAID' | 'PARTIAL' | 'DUE' | 'NO_LEASE';
}
```

**Frontend Usage (`TenantHomeScreen.tsx:109-130`):**
```typescript
const rentStatusData = rentStatus;
const hasRentStatus = !!rentStatusData && rentStatusData.status !== 'NO_LEASE';
const periodDue = hasRentStatus ? rentStatusData.amountDueForPeriod : 0;  // ❌ Field mismatch
const periodPaid = hasRentStatus ? rentStatusData.totalPaidForPeriod : 0; // ❌ Field mismatch
const remainingThisPeriod = Math.max(0, periodDue - periodPaid);
const pastArrears = hasRentStatus ? rentStatusData.arrearsTotal : 0;      // ❌ Field not in interface
```

**🔴 CRITICAL ISSUES:**
1. Interface defines `paidForPeriod` but usage expects `totalPaidForPeriod`
2. Interface defines `outstandingForPeriod` but usage expects `amountDueForPeriod`
3. Usage expects `arrearsTotal`, `daysOverdue`, `daysUntilDue`, `dueDate` - **NOT IN INTERFACE**
4. Backend endpoint **DOES NOT EXIST** to verify actual response shape

### Payment Contract

**Frontend Usage (`ManagerPaymentsScreen.tsx:10-29`):**
```typescript
interface Payment {
    id: string;
    amount: number;
    paymentDate: string;
    dueDate: string;
    status: string;
    paymentMethod?: string;
    transactionId?: string;
    tenantIdentity?: { name: string; email: string; };
    property?: { name: string; location: string; };
    unit?: { unitNumber: string; };
    isClaim?: boolean; // Client-side flag
}
```

**Backend Response:** ⚠️ NEEDS VERIFICATION - No backend payment response type found in evidence

---

## 5) SECURITY + SCOPING AUDIT

| Endpoint | Role Required | Scoping Method | Evidence Snippet | Risk |
|----------|--------------|----------------|------------------|------|
| `/manager/dashboard` | ✅ `authenticateToken` | ❌ **NO SCOPING VERIFIED** | `manager.ts:26` - no middleware, controller needs inspection | 🟡 MEDIUM - Potential data leak |
| `/manager/payment-claims` | ✅ `requireRole(['MANAGER'])` | ✅ Scoped by manager's properties | `paymentClaimController.ts` filters by `invitedByUserId` | ✅ SECURE |
| `/manager/payment-claims/:id/verify` | ✅ `requireRole(['MANAGER'])` | ✅ Verified ownership before update | Transaction checks claim belongs to manager | ✅ SECURE |
| `/manager/finance/*` | ✅ `authenticateToken`, `requireUserRole(MANAGER)`, `requireManagerTermsAccepted`, `requireCurrentBilling` | ✅ Scoped by `managerId`, `propertyId` | `managerFinanceController.ts` extracts `managerId` from `req.user` | ✅ SECURE |
| `/tenants/invite` | ✅ `requireUserRole(MANAGER)`, `requireManagerTermsAccepted`, `requireCurrentBilling` | ✅ Scoped by manager's properties | `tenantController.ts` validates property ownership | ✅ SECURE |
| `/tenants/invitations` (GET) | ✅ `requireUserRole(TENANT)` | ✅ Scoped by `tenantId` | `getTenantInvitations` filters by `req.user.tenantId` | ✅ SECURE |
| `/tenants/invitations/:id/accept` | ✅ `requireUserRole(TENANT)` | ✅ Verified invitation belongs to tenant | `acceptInvitation` checks `tenantId` match | ✅ SECURE |
| `/tenant/payment-claims` (POST) | ✅ `requireRole(['TENANT'])`, `RateLimitService` | ✅ Scoped by `req.user.tenantId` | `createPaymentClaim` uses authenticated tenant | ✅ SECURE |
| `/tenant/rent-status` | ❌ **ENDPOINT MISSING** | N/A | N/A | 🔴 CRITICAL - Cannot assess |
| `/tenant/payments` | ❌ **ENDPOINT MISSING** | N/A | N/A | 🔴 CRITICAL - Cannot assess |

**Evidence:**
```typescript
// tenants.ts:11-17 - Manager invite with full enforcement
router.post('/invite',
  authenticateToken,
  requireUserRole(UserRole.MANAGER),
  requireManagerTermsAccepted,
  requireCurrentBilling,
  inviteTenant
);

// manager.ts:26 - Dashboard with NO enforcement
router.get('/dashboard', getDashboardData);
```

---

## 6) ENFORCEMENT + BILLING IMPACT AUDIT (MANAGER)

| Feature | Gate Middleware | Backend Response Shape | Frontend Handling | PASS/FAIL |
|---------|----------------|----------------------|-------------------|-----------|
| **Invite Tenant** | ✅ `requireManagerTermsAccepted`, `requireCurrentBilling` | 402 with `requiresAction: 'ACCEPT_TERMS'` or `'PAY_BILLING_INVOICE'` | `handleEnforcement` in `enforcementNavigation.ts` navigates to Terms/Billing | ✅ PASS |
| **Rent Collection** | ✅ `requireManagerTermsAccepted`, `requireCurrentBilling` | 402 with enforcement object | `RentCollectionScreen.tsx:30-45` checks enforcement on load | ✅ PASS |
| **Income Statement** | ✅ `requireManagerTermsAccepted`, `requireCurrentBilling` | 402 with enforcement object | Uses `useManagerFinance` hooks with enforcement | ✅ PASS |
| **Financial Position** | ✅ `requireManagerTermsAccepted`, `requireCurrentBilling` | 402 with enforcement object | Uses `useManagerFinance` hooks with enforcement | ✅ PASS |
| **Cashflow Statement** | ✅ `requireManagerTermsAccepted`, `requireCurrentBilling` | 402 with enforcement object | Uses `useManagerFinance` hooks with enforcement | ✅ PASS |
| **Dashboard** | ❌ **NO ENFORCEMENT** | N/A | No enforcement check | 🟡 MEDIUM - Dashboard accessible even if suspended |
| **Payment Claims** | ❌ **NO ENFORCEMENT** | N/A | No enforcement check | 🟡 MEDIUM - Can review claims even if suspended |
| **Payments View** | ❌ **NO ENFORCEMENT** | N/A | No enforcement check | 🟡 MEDIUM - Can view payments even if suspended |

**Evidence:**
```typescript
// managerFinance.ts - All finance routes have enforcement
router.get('/rent-collection',
    authenticateToken,
    requireUserRole(UserRole.MANAGER),
    requireManagerTermsAccepted,
    requireCurrentBilling,
    getRentCollectionData
);

// manager.ts:26 - Dashboard has NO enforcement
router.get('/dashboard', getDashboardData);

// paymentClaims.ts:37-42 - Payment claims have NO enforcement
router.get('/manager/payment-claims',
  authenticateToken,
  requireRole(['MANAGER']),
  getManagerPaymentClaims
);
```

**Frontend 402 Handling:**
```typescript
// RentCollectionScreen.tsx:30-45
useEffect(() => {
    const checkTermsOnLoad = async () => {
        const { canProceed, enforcement } = await checkEnforcement('Rent Collection');
        if (!canProceed && enforcement) {
            await handleEnforcement(navigation, enforcement, { blockedFeature: 'Rent Collection' });
            return;
        }
    };
    checkTermsOnLoad();
}, []);
```

---

## 7) KNOWN BUG SURFACE (STATIC DIAGNOSTIC)

| Issue | File:Line | Why It Breaks | Severity | Suggested Fix |
|-------|-----------|---------------|----------|---------------|
| **Missing TouchableOpacity import** | `RentCollectionScreen.tsx:321` | Lint errors, component won't render | 🟡 MEDIUM | Already fixed in recent session |
| **Rent status field mismatch** | `TenantHomeScreen.tsx:111-114` | Accessing undefined fields causes runtime errors | 🔴 CRITICAL | Align interface with actual usage or fix backend response |
| **Client-side payment merge** | `ManagerPaymentsScreen.tsx:74-92` | Verified claims not in backend payments list, inconsistent data | 🟡 MEDIUM | Backend should include verified claims in payments endpoint |
| **No null guard on lease data** | `TenantHomeScreen.tsx:104-107` | Optional chaining used, but derived values may be null | 🟢 LOW | Already has null guards with `??` operator |
| **Potential negative currency display** | `TenantHomeScreen.tsx:113` | `Math.max(0, ...)` prevents negative, but not applied everywhere | 🟢 LOW | Already fixed with Math.max |
| **Missing error boundary** | All screens | Unhandled errors crash entire app | 🟡 MEDIUM | Add error boundaries at navigation level |
| **No offline handling** | All API calls | Network errors show generic messages | 🟢 LOW | Implement retry logic and offline detection |
| **Hardcoded date locale** | Multiple files | `toLocaleDateString('en-GB')` may not match user locale | 🟢 LOW | Use device locale or make configurable |

---

## 8) APPENDIX: FILE INDEX

### Frontend Files Inspected

**Navigation:**
- `src/navigation/index.tsx` - Role routing, stack definitions

**Contexts:**
- `src/context/AuthContext.tsx` - User authentication state
- `src/context/PropertyContext.tsx` - Manager properties
- `src/context/TenantContext.tsx` - Tenant invitations
- `src/context/LeaseContext.tsx` - Active lease data
- `src/context/PaymentContext.tsx` - Payment and rent status

**Hooks:**
- `src/hooks/useManagerDashboard.ts` - Manager dashboard data
- `src/hooks/useManagerFinance.ts` - Finance reports (rent collection, income, position, cashflow)
- `src/hooks/useTenantFinance.ts` - Tenant rent status

**Manager Screens:**
- `src/screens/manager/ManagerDashboard.tsx`
- `src/screens/manager/TenantsScreen.tsx`
- `src/screens/manager/ManagerPaymentsScreen.tsx`
- `src/screens/manager/ManagerPaymentClaimsScreen.tsx`
- `src/screens/manager/RentCollectionScreen.tsx`
- `src/screens/manager/IncomeStatementScreen.tsx`
- `src/screens/manager/FinancialPositionScreen.tsx`
- `src/screens/manager/CashflowStatementScreen.tsx`
- `src/screens/manager/ManagerBillingScreen.tsx`

**Tenant Screens:**
- `src/screens/tenant/TenantHomeScreen.tsx`
- `src/screens/tenant/TenantInvitationsScreen.tsx`
- `src/screens/tenant/PaymentsScreen.tsx`
- `src/screens/tenant/MessagesScreen.tsx`

**Shared Components:**
- `src/components/PageHeader.tsx`
- `src/components/FilterChips.tsx`
- `src/components/Modal.tsx`
- `src/components/Card.tsx`

**Utils:**
- `src/utils/apiClient.ts` - API wrapper
- `src/utils/formatters.ts` - Currency and number formatting
- `src/utils/enforcementNavigation.ts` - 402 handling

### Backend Files Inspected

**Routes:**
- `backend/src/routes/manager.ts` - Manager dashboard, leases, invitations, tenants
- `backend/src/routes/managerFinance.ts` - Finance reports
- `backend/src/routes/paymentClaims.ts` - Payment claims (tenant + manager)
- `backend/src/routes/tenants.ts` - Tenant invitations (invite, accept, decline)

**Middlewares:**
- `backend/src/middlewares/auth.ts` - Authentication, role checks
- `backend/src/middlewares/billingEnforcement.ts` - Terms and billing enforcement
- `backend/src/middlewares/requireUserRole.ts` - Role-based access control

**Controllers:**
- `backend/src/controllers/managerController.ts` - Dashboard, leases, invitations, tenants
- `backend/src/controllers/managerFinanceController.ts` - Finance reports
- `backend/src/controllers/paymentClaimController.ts` - Payment claim CRUD
- `backend/src/controllers/tenantController.ts` - Invitation management

**Services:**
- `backend/src/services/managerFinanceService.ts` - Finance data aggregation

---

## 9) KEYWORD HITS SUMMARY

### Frontend Keyword Hits
- ✅ `manager/dashboard` - Found in `useManagerDashboard.ts:60`
- ✅ `manager/payment-claims` - Found in `ManagerPaymentClaimsScreen.tsx`
- ✅ `manager/finance` - Found in `useManagerFinance.ts` (all finance endpoints)
- ❌ `tenant/leases/active` - **NOT FOUND**
- ✅ `tenant/rent-status` - Found in `useTenantFinance.ts:24` (called but backend missing)
- ✅ `tenant/invitations` - Found in contexts (maps to `/tenants/invitations`)
- ❌ `tenant/payments` - **NOT FOUND**
- ❌ `tenant/messages` - **NOT FOUND**

### Backend Keyword Hits
- ✅ `router.get('/dashboard'` - Found in `manager.ts:26`
- ✅ `payment-claims` - Found in `paymentClaims.ts` (5 matches)
- ✅ `tenantInvitation` - Found in `tenants.ts` (2 matches)
- ❌ `rent-status` - **NOT FOUND**
- ❌ `leases/active` - **NOT FOUND**
- ✅ `requireCurrentBilling` - Found in multiple routes
- ✅ `requireManagerTermsAccepted` - Found in multiple routes
- ✅ `requiresAction` - Found in enforcement middleware
- ✅ `402` - Found in billing enforcement responses
- ✅ `ACCEPT_TERMS` - Found in enforcement actions
- ✅ `PAY_BILLING_INVOICE` - Found in enforcement actions

---

## 10) CRITICAL RECOMMENDATIONS (PRIORITY ORDER)

### 🔴 CRITICAL - Implement Immediately

1. **Create `/tenant/rent-status` endpoint**
   - Controller: Extract `tenantId` from `req.user`, compute rent status from leases + payments
   - Response: Match `TenantRentStatus` interface with ALL fields used in `TenantHomeScreen`
   - Scoping: Filter by `tenantId`

2. **Create `/tenant/leases/active` endpoint**
   - Controller: Return active lease for tenant with property, unit, rentAmount
   - Response: Match `Lease` interface expected by `LeaseContext`
   - Scoping: Filter by `tenantId`, status = 'ACTIVE'

3. **Create `/tenant/payments` endpoint**
   - Controller: Return payment history for tenant
   - Response: Array of payments with property, unit, tenant info
   - Scoping: Filter by `tenantId`

4. **Fix RentStatus contract mismatch**
   - Update `useTenantFinance.ts` interface to include: `amountDueForPeriod`, `totalPaidForPeriod`, `arrearsTotal`, `daysOverdue`, `daysUntilDue`, `dueDate`
   - OR update `TenantHomeScreen.tsx` to use interface field names

### 🟠 HIGH - Address Soon

5. **Add enforcement to manager dashboard**
   - Add `requireManagerTermsAccepted`, `requireCurrentBilling` to `/manager/dashboard` route

6. **Add enforcement to payment claims**
   - Add `requireManagerTermsAccepted`, `requireCurrentBilling` to `/manager/payment-claims` routes

7. **Implement tenant messages feature**
   - Create `/tenant/messages` endpoints (list, send, mark read)
   - Wire up `MessagesScreen.tsx`

8. **Backend payment merge**
   - Include verified payment claims in `/payments` endpoint response
   - Remove client-side merge logic from `ManagerPaymentsScreen.tsx`

### 🟡 MEDIUM - Plan for Next Sprint

9. **Add scoping verification to dashboard controller**
   - Ensure `getDashboardData` filters all queries by `managerId`

10. **Add error boundaries**
    - Wrap navigation stacks with error boundary components

11. **Implement offline handling**
    - Add network status detection
    - Queue failed requests for retry

---

## CONCLUSION

**System Status:** ⚠️ **PARTIALLY FUNCTIONAL**

**What Works:**
- ✅ Authentication and role routing
- ✅ Manager dashboard (but no enforcement)
- ✅ Manager → Tenant invitation flow (full cycle)
- ✅ Tenant invitation acceptance/rejection
- ✅ Manager payment claims review and verification
- ✅ Tenant payment claim submission
- ✅ Manager finance reports (rent collection, income, position, cashflow)
- ✅ Manager billing flow
- ✅ Enforcement middleware on finance routes

**What's Broken:**
- 🔴 Tenant home screen (missing rent-status endpoint)
- 🔴 Tenant active lease display (missing leases/active endpoint)
- 🔴 Tenant payments screen (missing payments endpoint)
- 🔴 Tenant messages screen (feature not implemented)
- 🔴 Data contract mismatch on rent status

**What's Risky:**
- 🟡 Manager dashboard accessible without enforcement
- 🟡 Payment claims accessible without enforcement
- 🟡 Client-side payment merge creates data inconsistency

**Immediate Action Required:**
Implement the 3 missing tenant endpoints (`/tenant/rent-status`, `/tenant/leases/active`, `/tenant/payments`) to restore tenant functionality. Without these, the tenant experience is completely broken.

---

**End of Diagnostic Audit**
