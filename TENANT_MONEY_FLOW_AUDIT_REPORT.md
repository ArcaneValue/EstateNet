# EstateNet Tenant Money Flow Audit Report

**Date:** February 23, 2026  
**Scope:** End-to-End Tenant Money Flow Analysis  
**Status:** EXTRACTION COMPLETE - GAPS IDENTIFIED

---

## 1) Prisma Models Analysis

### Payment Model
**File:** `backend/prisma/schema.prisma` **Lines:** 178-198

```prisma
model Payment {
  id            String        @id @default(cuid())
  tenantId      String        // references TenantIdentity.tenantId
  propertyId    String
  unitId        String
  amount        Int
  status        PaymentStatus @default(PENDING)
  paymentMethod String?
  transactionId String?
  paymentDate   DateTime
  dueDate       DateTime
  createdAt     DateTime      @default(now())
  updatedAt     DateTime      @updatedAt

  // Relations
  tenantIdentity TenantIdentity @relation(fields: [tenantId], references: [tenantId], onDelete: Cascade)
  property       Property       @relation(fields: [propertyId], references: [id], onDelete: Cascade)
  unit           Unit           @relation(fields: [unitId], references: [id], onDelete: Cascade)
}
```

**PaymentStatus Enum** - Lines 87-93:
- `PENDING`, `SUCCESS`, `FAILED`, `PAID`, `OVERDUE`

**Answer:** Payment represents tenant rent payments. Links via `tenantId` → `TenantIdentity.tenantId`, `propertyId` → `Property.id`, `unitId` → `Unit.id`. No direct `managerId` link - derived through `Property.managerId`.

### ServicePayment Model
**File:** `backend/prisma/schema.prisma` **Lines:** 297-318

```prisma
model ServicePayment {
  id                String   @id @default(cuid())
  invoiceId         String   // Manager service fee payments
  managerId         String
  amount            Int
  currency          String   @default("UGX")
  provider          String   // 'MOCK' | 'YO'
  network           String   // 'MTN' | 'AIRTEL'
  phoneNumber       String
  externalRef       String   @unique
  status            String   @default("PENDING")
  // ... other fields
}
```

**Answer:** ServicePayment is for manager service fees, NOT tenant rent payments.

### Invoice + InvoiceLine Models
**File:** `backend/prisma/schema.prisma` **Lines:** 255-295

```prisma
model Invoice {
  id            String   @id @default(cuid())
  managerId     String   // Manager billing invoice
  periodStart   DateTime
  periodEnd     DateTime
  subtotalAmount Int
  feeRateBps    Int      // 399 = 3.99%
  feeAmount     Int
  status        String   // 'DUE' | 'PAID' | 'OVERDUE'
  dueDate       DateTime
  paidAt        DateTime?
}

model InvoiceLine {
  id          String   @id @default(cuid())
  invoiceId   String
  propertyId  String
  unitId      String
  rentAmount  Int      // Expected rent for billing calculation
  tenantId    String?
  leaseId     String?
}
```

**Answer:** Invoice/InvoiceLine are for manager billing, not tenant rent tracking.

### Lease Model
**File:** `backend/prisma/schema.prisma` **Lines:** 136-156

```prisma
model Lease {
  id        String     @id @default(cuid())
  tenantId  String     // references TenantIdentity.tenantId
  propertyId String
  unitId    String
  rentAmount Int       // Monthly rent amount
  startDate DateTime   @default(now())
  endDate   DateTime?
  status    LeaseStatus @default(ACTIVE)
}
```

**LeaseStatus Enum** - Lines 73-77: `ACTIVE`, `ENDED`, `EVICTED`

### TenantIdentity Model
**File:** `backend/prisma/schema.prisma` **Lines:** 48-65

```prisma
model TenantIdentity {
  id           String   @id @default(cuid())
  tenantId     String   @unique  // The actual tenant identifier
  name         String
  email        String   @unique
  phoneNumber  String?
  // Relations
  user User?
  leases Lease[]
  payments Payment[]
}
```

### User Model (Billing Fields)
**File:** `backend/prisma/schema.prisma` **Lines:** 10-46

```prisma
model User {
  id           String   @id @default(cuid())
  email        String   @unique
  passwordHash String
  name         String
  phoneNumber  String?
  role         UserRole @default(TENANT)
  tenantId     String?  @unique  // Links to TenantIdentity.tenantId
  
  // Manager billing fields (NOT tenant rent)
  managerTermsAcceptedAt DateTime?
  billingStatus         String? // 'CURRENT' | 'OVERDUE'
  billingGraceUntil     DateTime?
}
```

### Message/Notification Models
**File:** `backend/prisma/schema.prisma` **Lines:** 200-235

```prisma
model Message {
  id         String   @id @default(cuid())
  fromUserId String
  toUserId   String
  leaseId    String?  // Can link to lease for rent reminders
  subject    String?
  body       String
  createdAt  DateTime @default(now())
  readAt     DateTime?
}

model Notification {
  id        String   @id @default(cuid())
  userId    String
  type      String   // Could include payment reminders
  title     String
  body      String
  metadata  Json?
  createdAt DateTime @default(now())
  readAt    DateTime?
}
```

---

## 2) Tenant Payment Backend Endpoints

### Payment Routes
**File:** `backend/src/routes/payments.ts` **Lines:** 1-29

| Method | Path | Role | Handler | Purpose |
|--------|------|------|---------|---------|
| POST | `/api/payments` | TENANT | `recordPayment` | Record tenant rent payment |
| GET | `/api/payments` | TENANT/MANAGER | `getPayments` | Get payment history |
| GET | `/api/payments/summary` | MANAGER | `getPaymentSummary` | Get payment summary |

### Payment Collection Routes
**File:** `backend/src/routes/paymentCollection.ts` **Lines:** 1-28

| Method | Path | Role | Handler | Purpose |
|--------|------|------|---------|---------|
| POST | `/api/payments/initiate` | TENANT | `initiatePayment` | Initiate payment flow |
| GET | `/api/payments/:id` | ANY | `getPaymentById` | Get payment details |
| POST | `/api/payments/simulate-success/:paymentId` | ANY | `simulatePaymentSuccess` | Dev testing |

### Payment Controller Implementation
**File:** `backend/src/controllers/paymentController.ts` **Lines:** 10-76

**recordPayment Handler:**
- **Request Body:** `{ amount, paymentDate, dueDate, paymentMethod?, transactionId? }`
- **Response:** `{ success: true, data: payment }`
- **Logic:** 
  - Validates tenant has active lease (Lines 44-57)
  - Derives `propertyId`, `unitId` from active lease
  - Computes `dueDate` based on lease start date and billing period (Lines 59-72)
  - Creates payment with status `PAID` (Line 38)
  - Sends notification to tenant (Lines 44-62)

**getPayments Handler:**
- **Tenant Scope:** Only own payments via `req.user.tenantId` (Lines 91-108)
- **Manager Scope:** Payments for managed properties with optional filters (Lines 112-172)

### Payment Service Implementation
**File:** `backend/src/services/paymentService.ts` **Lines:** 42-96

**recordPayment Logic:**
- Gets tenant's active lease (Lines 44-53)
- Computes billing period due date using lease start date (Lines 59-62)
- **Key Logic:** `getBillingPeriodForDate()` and `getDueDateForPeriod()` (Lines 8-19)

**Status Changes:** 
- Payments created with status `PAID` immediately (Line 69)
- **NO webhook/polling/cron status updates found**

---

## 3) Manager Finance Implementation Semantics

### Rent Collection Endpoint
**File:** `backend/src/services/managerFinanceService.ts` **Lines:** 67-176

**GET /api/manager/finance/rent-collection**

**Tables Queried:**
- `Property` - Manager's owned properties (Lines 77-83)
- `Lease` - Active leases at period start (Lines 97-112)
- `Payment` - PAID payments in period (Lines 115-131)

**Expected Rent Computation:**
- **Option A Snapshot:** Leases active at `periodStart` (Lines 101-105)
- **Logic:** `startDate <= periodStart AND (endDate IS NULL OR endDate >= periodStart)`
- **Sum:** `activeLeases.reduce((sum, lease) => sum + lease.rentAmount, 0)` (Line 134)

**Collected Rent Computation:**
- **Filter:** `status = 'PAID' AND paymentDate BETWEEN periodStart AND periodEnd` (Lines 117-122)
- **Sum:** `paidPayments.reduce((sum, payment) => sum + payment.amount, 0)` (Line 135)

**Period Computation:**
- **Kampala Timezone:** UTC+3 offset handling (Lines 47-55)
- **Format:** `YYYY-MM` (Lines 46, 64)

### Outstanding Rent Endpoint
**File:** `backend/src/services/managerFinanceService.ts` **Lines:** 178-288

**GET /api/manager/finance/outstanding-rent**

**Tables Queried:**
- `Property` - Manager's owned properties (Lines 188-194)
- `Lease` - Active leases at period start (Lines 208-229)
- `Payment` - PAID payments for each tenant (Lines 235-248)

**Outstanding Computation:**
- **Per Tenant:** `Math.max(0, expectedRent - collectedRent)` (Line 252)
- **Expected:** `lease.rentAmount` (Line 251)
- **Collected:** Sum of PAID payments for tenant in period (Line 250)

**Assumptions/Limitations:**
- **Monthly Only:** Period format `YYYY-MM`, no custom date ranges
- **No Partial Allocations:** Payments summed, not allocated to specific months
- **Simple Outstanding:** Expected - Collected, no proration or complex rules

---

## 4) Tenant-Facing Money UI

### PaymentsScreen
**File:** `src/screens/tenant/PaymentsScreen.tsx` **Lines:** 1-433

**Navigation Route:** `Payments` (Tab screen)
**File:** `src/navigation/index.tsx` **Lines:** 266-270

**Features:**
- Payment history display (Lines 46, 83-86)
- Record new payment form (Lines 103-149)
- Payment method selection (Lines 61-65)
- Active lease integration (Lines 88-94)

**API Calls:**
- `GET /payments` - Load payment history (Line 83)
- `GET /tenant/me/active-lease` - Load active lease (Line 89)
- `POST /payments` - Record payment (Line 130)

### TenantHomeScreen Rent Status
**File:** `src/screens/tenant/TenantHomeScreen.tsx` **Lines:** 105-128

**Rent Status Display:**
- `rentStatus` from `usePayments()` context (Line 24)
- Shows: `amountDueForPeriod`, `totalPaidForPeriod`, `arrearsTotal` (Lines 109-112)
- Status labels: `PAID`, `NOT_DUE`, `NO_LEASE` (Lines 113-127)

**Navigation Wiring:**
- **Route:** `TenantHome` (Tab screen)
- **File:** `src/navigation/index.tsx` **Lines:** 256-262

### TenantProfileScreen
**File:** `src/screens/tenant/TenantProfileScreen.tsx` **Lines:** 49, 212

**Rent Display:**
- Shows monthly rent from active lease: `UGX {monthlyRent.toLocaleString()}/month` (Line 212)

---

## 5) Money Flow Truth Table (Repo-Backed)

### A) What defines rent due for a tenant in a month?

**Source:** `backend/src/services/managerFinanceService.ts` Lines 97-112, 208-229

**Definition:**
- **Active Lease at Period Start** (Option A snapshot semantics)
- **Condition:** `lease.status = 'ACTIVE' AND lease.startDate <= periodStart AND (lease.endDate IS NULL OR lease.endDate >= periodStart)`
- **Amount:** `lease.rentAmount` (monthly rent from lease)
- **Period:** Kampala timezone month boundaries (`YYYY-MM`)

### B) What defines rent paid for that tenant/month?

**Source:** `backend/src/services/managerFinanceService.ts` Lines 115-131, 235-248

**Definition:**
- **PAID Payments in Period:** `payment.status = 'PAID' AND payment.paymentDate BETWEEN periodStart AND periodEnd`
- **Scope:** Payments linked to tenant via `payment.tenantId = lease.tenantId`
- **Amount:** Sum of `payment.amount` for all PAID payments

### C) Is there allocation of payments to months, or just sums?

**Answer:** **JUST SUMS** - No allocation logic found.

**Evidence:**
- Payment service sums all PAID payments in date range (Lines 235-250 in managerFinanceService.ts)
- No month-specific allocation or payment splitting
- Outstanding calculation: `expectedRent - totalPaidInPeriod` (Line 252)

### D) Can a tenant overpay / prepay? How handled?

**Answer:** **YES, but NO special handling found.**

**Evidence:**
- Payment recording allows any amount (Lines 109-113 in PaymentsScreen.tsx)
- No validation against lease rent amount
- Outstanding calculation uses `Math.max(0, expected - collected)` (Line 252) - prevents negative outstanding
- **GAP:** No prepayment tracking or credit system

### E) How is "outstanding" computed and where is it used?

**Source:** `backend/src/services/managerFinanceService.ts` Lines 252, 274

**Computation:**
```typescript
const amountOutstanding = Math.max(0, expectedRent - collectedRent);
```

**Used In:**
- Manager Outstanding Rent screen (OutstandingRentScreen.tsx)
- Manager dashboard metrics
- **NOT FOUND:** Tenant-facing outstanding amount display

---

## 6) Minimum Required Changes Checklist

### Backend Changes

#### Models (No changes needed)
- ✅ Payment model sufficient for basic rent tracking
- ✅ Lease model provides rent amount and period logic
- ✅ Relationships properly established

#### Endpoints to Add/Change

**Add:**
- `GET /api/tenant/rent-status` - Tenant's current rent status (due, paid, outstanding)
- `POST /api/tenant/payments/validate` - Validate payment amount against lease

**Enhance:**
- `POST /api/payments` - Add validation against lease rent amount
- `GET /api/payments` - Add period filtering for tenant

#### Allocation Logic
**Current Gap:** No month-to-month payment allocation

**Required:**
- Payment allocation service to assign payments to specific billing periods
- Prepayment credit tracking
- Arrears calculation across multiple periods

#### Tests to Add
- Unit tests for payment allocation logic
- Integration tests for tenant rent status calculation
- Edge cases: overpayment, partial payment, multi-month arrears

### Frontend Changes

#### Screens/Hooks Needed

**Tenant Screens:**
- ✅ PaymentsScreen exists but needs enhancement
- **Add:** Rent status widget showing current due/paid/outstanding
- **Add:** Payment validation before submission

**Manager Screens:**
- ✅ OutstandingRentScreen and RentCollectionScreen implemented
- **No changes needed** - manager-only is sufficient for this lane

#### Hooks to Add/Enhance
- `useRentStatus()` - Tenant's current rent status
- `usePaymentValidation()` - Validate payment amounts
- Enhance `usePayments()` - Add period filtering

### E2E Verification

#### Required E2E Script
**File:** `backend/verify-tenant-money-flow-e2e.ps1`

**Test Scenarios:**
1. **Month 1:** Tenant pays full rent, verify status = PAID
2. **Month 2:** Tenant pays partial rent, verify outstanding amount
3. **Month 2:** Tenant pays remaining + next month, verify prepayment handling
4. **Cross-verification:** Manager and tenant views show consistent data

**Verification Points:**
- Due amount calculation (lease snapshot)
- Payment recording and status updates  
- Outstanding calculation accuracy
- Manager vs tenant data consistency

---

## Lane A Implementation Plan (Minimum Changes)

### Phase 1: Backend Foundation
- [ ] Create `TenantRentStatusService` with period-based calculations
- [ ] Add `GET /api/tenant/rent-status` endpoint
- [ ] Add payment validation logic in `PaymentService.recordPayment()`
- [ ] Create unit tests for rent status calculations

### Phase 2: Frontend Enhancement  
- [ ] Create `useRentStatus()` hook for tenant rent status
- [ ] Add rent status widget to TenantHomeScreen
- [ ] Enhance PaymentsScreen with payment validation
- [ ] Add period filtering to payment history

### Phase 3: Payment Allocation (Optional)
- [ ] Design payment allocation algorithm
- [ ] Implement prepayment credit tracking
- [ ] Add multi-period arrears calculation
- [ ] Update outstanding calculation logic

### Phase 4: E2E Verification
- [ ] Create `verify-tenant-money-flow-e2e.ps1` script
- [ ] Test 2-month payment scenarios with partial payments
- [ ] Verify manager-tenant data consistency
- [ ] Add automated regression tests

### Phase 5: Production Readiness
- [ ] Add error handling for edge cases
- [ ] Implement payment retry mechanisms  
- [ ] Add audit logging for payment transactions
- [ ] Performance optimization for large payment datasets

---

**Report Prepared By:** Cascade AI Assistant  
**Analysis Period:** February 2026  
**Next Action:** Implement Phase 1 backend foundation changes
