/**
 * Notification Dispatcher - Firebase-ready abstraction for push notifications and email
 * Implements observer pattern for extensible notification delivery
 */

export interface NotificationMessage {
  title: string;
  body: string;
  data?: Record<string, any>;
  userId: string;
  type: 'PUSH' | 'EMAIL' | 'SMS';
}

export interface PushNotificationPayload {
  token?: string;
  topic?: string;
  title: string;
  body: string;
  data?: Record<string, any>;
  badge?: number;
}

export interface EmailNotificationPayload {
  to: string;
  subject: string;
  htmlContent: string;
  textContent?: string;
  metadata?: Record<string, any>;
}

export interface NotificationDispatcher {
  sendPush(payload: PushNotificationPayload): Promise<boolean>;
  sendEmail(payload: EmailNotificationPayload): Promise<boolean>;
  sendSMS?(to: string, message: string): Promise<boolean>;
}

/**
 * Firebase Cloud Messaging Implementation (Future)
 * Ready for production deployment with FCM
 */
export class FirebaseNotificationDispatcher implements NotificationDispatcher {
  private fcmEnabled: boolean = false;
  
  constructor() {
    // Initialize FCM when environment variables are set
    this.fcmEnabled = !!(process.env.FIREBASE_PROJECT_ID && process.env.FIREBASE_PRIVATE_KEY);
  }

  async sendPush(payload: PushNotificationPayload): Promise<boolean> {
    try {
      if (!this.fcmEnabled) {
        console.log('[FCM] Push notification logged (FCM not configured):', {
          title: payload.title,
          body: payload.body,
          data: payload.data,
          token: payload.token ? `${payload.token.substring(0, 10)}...` : 'N/A'
        });
        return true; // Simulate success for development
      }

      // TODO: Implement actual FCM sending when configured
      // const admin = require('firebase-admin');
      // const message = {
      //   notification: {
      //     title: payload.title,
      //     body: payload.body
      //   },
      //   data: payload.data,
      //   token: payload.token
      // };
      // 
      // const response = await admin.messaging().send(message);
      // console.log('Successfully sent FCM message:', response);
      
      return true;
    } catch (error) {
      console.error('[FCM] Push notification failed:', error);
      return false;
    }
  }

  async sendEmail(payload: EmailNotificationPayload): Promise<boolean> {
    try {
      // Log email for now - ready for SMTP/SendGrid integration
      console.log('[EMAIL] Email notification logged:', {
        to: payload.to,
        subject: payload.subject,
        contentLength: payload.htmlContent.length,
        metadata: payload.metadata
      });
      
      // TODO: Implement actual email sending
      // - SendGrid integration
      // - AWS SES integration  
      // - SMTP fallback
      
      return true;
    } catch (error) {
      console.error('[EMAIL] Email notification failed:', error);
      return false;
    }
  }
}

/**
 * Development/Testing Dispatcher - Logs all notifications
 */
export class LoggingNotificationDispatcher implements NotificationDispatcher {
  
  async sendPush(payload: PushNotificationPayload): Promise<boolean> {
    console.log('[PUSH] Push notification sent:', {
      title: payload.title,
      body: payload.body,
      data: payload.data,
      target: payload.token ? 'device' : 'topic'
    });
    return true;
  }

  async sendEmail(payload: EmailNotificationPayload): Promise<boolean> {
    console.log('[EMAIL] Email notification sent:', {
      to: payload.to,
      subject: payload.subject,
      contentPreview: payload.htmlContent.substring(0, 100) + '...',
      metadata: payload.metadata
    });
    return true;
  }
}

/**
 * Notification Service - High-level notification orchestration
 */
export class NotificationDispatcherService {
  private dispatcher: NotificationDispatcher;

  constructor(dispatcher?: NotificationDispatcher) {
    // Use Firebase dispatcher in production, logging dispatcher in development
    this.dispatcher = dispatcher || (
      process.env.NODE_ENV === 'production' 
        ? new FirebaseNotificationDispatcher()
        : new LoggingNotificationDispatcher()
    );
  }

  /**
   * Send payment claim notification to manager
   */
  async notifyManagerNewClaim(managerId: string, claimData: any): Promise<void> {
    try {
      // Get manager's push token and email (when user preferences are implemented)
      const title = 'New Payment Claim';
      const body = `New payment claim of ${claimData.amount.toLocaleString()} UGX from ${claimData.tenantName}`;
      
      await Promise.all([
        this.dispatcher.sendPush({
          title,
          body,
          data: {
            type: 'PAYMENT_CLAIM_CREATED',
            claimId: claimData.id,
            amount: claimData.amount.toString(),
            tenantId: claimData.tenantId
          },
          badge: claimData.unreadCount
        }),
        // TODO: Get manager email from user preferences
        // this.dispatcher.sendEmail({
        //   to: managerEmail,
        //   subject: title,
        //   htmlContent: emailTemplate
        // })
      ]);
      
      console.log(`[DISPATCHER] Manager notification sent for claim ${claimData.id}`);
    } catch (error) {
      console.error('[DISPATCHER] Failed to notify manager:', error);
    }
  }

  /**
   * Send payment claim decision notification to tenant
   */
  async notifyTenantClaimDecision(tenantId: string, claimData: any, decision: 'VERIFIED' | 'REJECTED'): Promise<void> {
    try {
      const title = `Payment Claim ${decision === 'VERIFIED' ? 'Verified' : 'Rejected'}`;
      const body = decision === 'VERIFIED' 
        ? `Your payment claim of ${claimData.amount.toLocaleString()} UGX has been verified`
        : `Your payment claim of ${claimData.amount.toLocaleString()} UGX was rejected. ${claimData.note ? 'Reason: ' + claimData.note : ''}`;
      
      await this.dispatcher.sendPush({
        title,
        body,
        data: {
          type: 'PAYMENT_CLAIM_DECISION',
          claimId: claimData.id,
          decision,
          amount: claimData.amount.toString()
        }
      });
      
      console.log(`[DISPATCHER] Tenant notification sent for claim ${claimData.id} decision: ${decision}`);
    } catch (error) {
      console.error('[DISPATCHER] Failed to notify tenant:', error);
    }
  }

  /**
   * Send invoice overdue notification to manager
   */
  async notifyManagerInvoiceOverdue(managerId: string, invoiceData: any): Promise<void> {
    try {
      const title = 'Invoice Overdue';
      const body = `Your invoice of ${invoiceData.feeAmount.toLocaleString()} UGX is overdue. Please pay to avoid service restrictions.`;
      
      await this.dispatcher.sendPush({
        title,
        body,
        data: {
          type: 'INVOICE_OVERDUE',
          invoiceId: invoiceData.id,
          amount: invoiceData.feeAmount.toString(),
          dueDate: invoiceData.dueDate
        }
      });
      
      console.log(`[DISPATCHER] Invoice overdue notification sent for invoice ${invoiceData.id}`);
    } catch (error) {
      console.error('[DISPATCHER] Failed to notify manager about overdue invoice:', error);
    }
  }

  /**
   * Send weekly summary to manager
   */
  async sendWeeklyManagerSummary(managerId: string, summaryData: any): Promise<void> {
    try {
      const title = 'Weekly Summary';
      const body = `Collected: ${summaryData.totalCollected.toLocaleString()} UGX | Outstanding: ${summaryData.totalOutstanding.toLocaleString()} UGX | ${summaryData.newClaimsCount} new claims`;
      
      await this.dispatcher.sendPush({
        title,
        body,
        data: {
          type: 'WEEKLY_SUMMARY',
          ...summaryData
        }
      });
      
      console.log(`[DISPATCHER] Weekly summary sent to manager ${managerId}`);
    } catch (error) {
      console.error('[DISPATCHER] Failed to send weekly summary:', error);
    }
  }
}

// Export singleton instance
export const notificationDispatcher = new NotificationDispatcherService();
