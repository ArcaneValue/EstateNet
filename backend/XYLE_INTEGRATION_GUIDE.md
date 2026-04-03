# XYLE PAYMENT PROVIDER INTEGRATION GUIDE

## Overview

EstateNet backend has been successfully integrated with Xyle Payments for processing manager service fee payments. This guide covers the complete integration, testing, and deployment process.

---

## Integration Components

### 1. Xyle Provider Implementation
**File:** `backend/src/services/paymentProviders/xyleProvider.ts`

Implements the `PaymentProvider` interface with two key methods:
- `initiatePush()` - Initiates mobile money deposit via Xyle API
- `parseWebhook()` - Parses Xyle webhook callbacks

**Key Features:**
- Uses `x-api-key` header for authentication
- Supports MTN and Airtel mobile money
- Comprehensive error handling and logging
- Phone number masking in logs for security
- 30-second timeout for API calls

### 2. Webhook Route
**File:** `backend/src/routes/webhookPayments.ts`

Added route: `POST /api/payments/webhook/xyle`

**Controller:** `handleXyleWebhook` in `backend/src/controllers/servicePaymentController.ts`

Processes Xyle payment confirmations and updates invoice/payment status atomically.

### 3. Provider Registration
**File:** `backend/src/services/paymentProviders/index.ts`

Xyle provider registered in factory function:
```typescript
case 'XYLE':
  return xyleProvider;
```

### 4. Environment Configuration
**File:** `backend/.env`

```env
PAYMENT_PROVIDER=XYLE
XYLE_SANDBOX_API_KEY=xyl_d3c25c7f9b713c79cf9084c06e40e0eebab8256a6e636b2584138a5e861951b6
XYLE_API_URL=https://api.xylepayments.com/sandbox/api/v1
```

### 5. Dependencies
**Installed:** `axios` for HTTP requests to Xyle API

---

## API Flow

### Manager Initiates Payment

```
1. Manager clicks "Pay Invoice" in app
   ↓
2. POST /api/manager/billing/invoices/:invoiceId/pay
   Body: { phoneNumber: "256771234567", network: "MTN" }
   ↓
3. servicePaymentController.initiateInvoicePayment()
   ↓
4. servicePaymentService.initiatePayment()
   ↓
5. xyleProvider.initiatePush()
   → Calls Xyle API: POST /client/transactions
   → Headers: x-api-key: <XYLE_SANDBOX_API_KEY>
   ↓
6. Creates ServicePayment record (status: PENDING)
   ↓
7. Returns { paymentId, externalRef, status: "PENDING" }
```

### Xyle Confirms Payment (Webhook)

```
1. Xyle sends webhook to: POST /api/payments/webhook/xyle
   Body: { reference, transaction_id, status: "SUCCESS" }
   ↓
2. handleXyleWebhook() receives request
   ↓
3. processWebhook() validates and processes
   ↓
4. xyleProvider.parseWebhook() extracts data
   ↓
5. Atomic transaction:
   - Update ServicePayment (status: SUCCESS)
   - Update Invoice (status: PAID, paidAt: now)
   - Update Manager billing status (CURRENT if no overdue)
   ↓
6. Returns { success: true, paymentId, status: "SUCCESS" }
```

---

## Testing

### Unit Tests
**File:** `backend/tests/xyleIntegration.test.ts`

**Test Coverage:**
- Provider factory registration
- initiatePush() request formatting
- parseWebhook() parsing (success/failure)
- Error handling
- Environment variable validation
- Alternative field name handling

**Run Tests:**
```bash
cd backend
npm test -- xyleIntegration.test.ts
```

### Manual Testing with Xyle Sandbox

#### 1. Test Payment Initiation
```bash
# Start backend server
npm run dev

# Make API call (requires valid JWT token)
curl -X POST http://localhost:3001/api/manager/billing/invoices/inv-123/pay \
  -H "Authorization: Bearer <JWT_TOKEN>" \
  -H "Content-Type: application/json" \
  -d '{
    "phoneNumber": "256771234567",
    "network": "MTN"
  }'
```

**Expected Response:**
```json
{
  "success": true,
  "data": {
    "paymentId": "pay-xxx",
    "externalRef": "SPAY-xxx",
    "status": "PENDING",
    "providerRequestId": "xyle-req-xxx"
  }
}
```

#### 2. Test Webhook Processing
```bash
# Simulate Xyle webhook callback
curl -X POST http://localhost:3001/api/payments/webhook/xyle \
  -H "Content-Type: application/json" \
  -d '{
    "reference": "SPAY-xxx",
    "transaction_id": "XYLE-TX-12345",
    "status": "SUCCESS"
  }'
```

**Expected Response:**
```json
{
  "success": true,
  "message": "Webhook processed",
  "data": {
    "paymentId": "pay-xxx",
    "status": "SUCCESS"
  }
}
```

---

## Troubleshooting

### Issue: "Invalid or expired token"

**Possible Causes:**
1. API key is expired or revoked
2. API key is for wrong environment (live vs sandbox)
3. API key not set in environment variables
4. Incorrect header format

**Solution:**
1. Verify key in Xyle dashboard
2. Check `.env` file has correct `XYLE_SANDBOX_API_KEY`
3. Restart backend server after changing `.env`
4. Run diagnostic: `.\xyle-diagnostic-clean.ps1`

### Issue: Webhook not received

**Possible Causes:**
1. Webhook URL not configured in Xyle dashboard
2. Server not publicly accessible
3. Webhook authentication failing

**Solution:**
1. Configure webhook URL in Xyle: `https://your-domain.com/api/payments/webhook/xyle`
2. Use ngrok for local testing: `ngrok http 3001`
3. Check `requireWebhookAuth` middleware configuration

### Issue: Payment stuck in PENDING

**Possible Causes:**
1. Webhook not sent by Xyle
2. Webhook parsing failed
3. Transaction failed on Xyle side

**Solution:**
1. Check Xyle dashboard for transaction status
2. Check backend logs for webhook errors
3. Run timeout cleanup: Service automatically times out after 15 minutes

---

## Security Considerations

### API Key Protection
- ✅ API key stored in `.env` (not committed to git)
- ✅ API key accessed via `process.env.XYLE_SANDBOX_API_KEY`
- ✅ Phone numbers masked in logs
- ✅ No secrets exposed in frontend

### Webhook Security
- ✅ Webhook authentication via `requireWebhookAuth` middleware
- ✅ Idempotency checks prevent duplicate processing
- ✅ Amount validation before marking invoice paid
- ✅ Atomic transactions prevent partial updates

### Production Checklist
- [ ] Replace sandbox key with production key
- [ ] Update `XYLE_API_URL` to production endpoint
- [ ] Configure webhook signature verification (if Xyle provides)
- [ ] Set up monitoring/alerting for failed payments
- [ ] Enable rate limiting on webhook endpoint
- [ ] Set up log aggregation for payment events

---

## Switching Between MOCK and XYLE

### Use MOCK for Development/Testing
```env
PAYMENT_PROVIDER=MOCK
```

### Use XYLE for Sandbox Testing
```env
PAYMENT_PROVIDER=XYLE
XYLE_SANDBOX_API_KEY=xyl_d3c25c7f9b713c79cf9084c06e40e0eebab8256a6e636b2584138a5e861951b6
XYLE_API_URL=https://api.xylepayments.com/sandbox/api/v1
```

### Use XYLE for Production
```env
PAYMENT_PROVIDER=XYLE
XYLE_SANDBOX_API_KEY=<production_key>
XYLE_API_URL=https://api.xylepayments.com/api/v1
```

**No code changes required** - just update environment variables and restart server.

---

## Monitoring & Logging

### Key Log Patterns

**Payment Initiation:**
```
[XyleProvider] Initiating push payment { phoneNumber: "25677***", amount: 1995, ... }
[XyleProvider] Push payment initiated successfully { externalRef: "SPAY-xxx", ... }
```

**Webhook Processing:**
```
[XyleWebhook] Received webhook { headers: {...}, bodyKeys: [...] }
[XyleProvider] Webhook parsed { externalRef: "SPAY-xxx", success: true }
[XyleWebhook] Processing successful { paymentId: "pay-xxx", status: "SUCCESS" }
```

**Errors:**
```
[XyleProvider] Push payment failed { externalRef: "SPAY-xxx", error: "..." }
[XyleWebhook] Processing failed { message: "..." }
```

### Recommended Monitoring
- Track payment success/failure rates
- Monitor webhook processing latency
- Alert on repeated failures
- Track timeout rate for PENDING payments

---

## Database Schema

### ServicePayment Model
```prisma
model ServicePayment {
  id                String   @id @default(cuid())
  invoiceId         String
  managerId         String
  amount            Int                    // Amount in UGX
  currency          String   @default("UGX")
  provider          String                 // "XYLE"
  network           String                 // "MTN" | "AIRTEL"
  phoneNumber       String                 // Manager's phone
  externalRef       String   @unique       // Our reference
  providerRequestId String?                // Xyle request ID
  providerTxId      String?                // Xyle transaction ID
  status            String   @default("PENDING") // PENDING | SUCCESS | FAILED
  failureReason     String?
  createdAt         DateTime @default(now())
  updatedAt         DateTime @updatedAt
}
```

---

## Next Steps

### Phase 1: Sandbox Testing ✅ COMPLETE
- [x] Xyle provider implementation
- [x] Webhook route
- [x] Environment configuration
- [x] Integration tests

### Phase 2: Production Deployment
- [ ] Obtain production Xyle API key
- [ ] Configure production webhook URL
- [ ] Set up webhook signature verification
- [ ] Deploy to production environment
- [ ] Monitor first production transactions

### Phase 3: Enhancements
- [ ] Add retry logic for failed API calls
- [ ] Implement payment status polling (fallback for missing webhooks)
- [ ] Add admin dashboard for payment reconciliation
- [ ] Implement refund functionality
- [ ] Add support for tenant rent payments via Xyle (optional)

---

## Support

### Xyle Support
- Dashboard: https://dashboard.xylepayments.com
- Documentation: https://docs.xylepayments.com
- Support Email: support@xylepayments.com

### EstateNet Backend
- Integration File: `backend/src/services/paymentProviders/xyleProvider.ts`
- Webhook Handler: `backend/src/controllers/servicePaymentController.ts`
- Service Logic: `backend/src/services/servicePaymentService.ts`

---

## Changelog

### 2026-03-30
- ✅ Initial Xyle integration complete
- ✅ Sandbox testing ready
- ✅ Documentation created
- ✅ Integration tests added
