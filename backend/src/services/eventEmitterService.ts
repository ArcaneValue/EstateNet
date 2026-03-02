import { EventEmitter } from 'events';

// Event types for payment claim system
export interface PaymentClaimCreatedEvent {
  managerId: string;
  claimId: string;
  tenantId: string;
  leaseId: string;
  amount: number;
  monthsPaid: number;
  propertyName: string;
  unitNumber: string;
  tenantName: string;
}

export interface PaymentClaimVerifiedEvent {
  tenantId: string;
  claimId: string;
  managerId: string;
  decision: 'VERIFIED' | 'REJECTED';
  amount: number;
  note?: string;
}

class PaymentClaimEventEmitter extends EventEmitter {
  private static instance: PaymentClaimEventEmitter;

  private constructor() {
    super();
    this.setMaxListeners(20); // Increase limit for multiple listeners
  }

  public static getInstance(): PaymentClaimEventEmitter {
    if (!PaymentClaimEventEmitter.instance) {
      PaymentClaimEventEmitter.instance = new PaymentClaimEventEmitter();
    }
    return PaymentClaimEventEmitter.instance;
  }

  // Emit when a new payment claim is created
  public emitPaymentClaimCreated(data: PaymentClaimCreatedEvent): void {
    this.emit('PAYMENT_CLAIM_CREATED', data);
    
    // Log for debugging (can be removed in production)
    if (process.env.NODE_ENV !== 'production') {
      console.log(`[Event] PAYMENT_CLAIM_CREATED: managerId=${data.managerId}, claimId=${data.claimId}`);
    }
  }

  // Emit when a payment claim is verified/rejected
  public emitPaymentClaimVerified(data: PaymentClaimVerifiedEvent): void {
    this.emit('PAYMENT_CLAIM_VERIFIED', data);
    
    // Log for debugging (can be removed in production)
    if (process.env.NODE_ENV !== 'production') {
      console.log(`[Event] PAYMENT_CLAIM_VERIFIED: tenantId=${data.tenantId}, decision=${data.decision}`);
    }
  }

  // Future: Add listeners for push notifications
  public onPaymentClaimCreated(callback: (data: PaymentClaimCreatedEvent) => void): void {
    this.on('PAYMENT_CLAIM_CREATED', callback);
  }

  public onPaymentClaimVerified(callback: (data: PaymentClaimVerifiedEvent) => void): void {
    this.on('PAYMENT_CLAIM_VERIFIED', callback);
  }

  // Remove listeners (useful for cleanup in tests)
  public removeAllPaymentClaimListeners(): void {
    this.removeAllListeners('PAYMENT_CLAIM_CREATED');
    this.removeAllListeners('PAYMENT_CLAIM_VERIFIED');
  }
}

// Export singleton instance
export const paymentClaimEvents = PaymentClaimEventEmitter.getInstance();
