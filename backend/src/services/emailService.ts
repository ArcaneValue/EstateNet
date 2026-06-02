import nodemailer from 'nodemailer';
import { prisma } from '../utils/database';

interface EmailConfig {
  host: string;
  port: number;
  secure: boolean;
  auth: {
    user: string;
    pass: string;
  };
}

class EmailService {
  private transporter: nodemailer.Transporter | null = null;
  private lastEmailSent: Map<string, number> = new Map();
  private readonly RATE_LIMIT_MS = 60000; // 1 minute between duplicate emails

  private getTransporter(): nodemailer.Transporter {
    if (this.transporter) {
      return this.transporter;
    }

    const config: EmailConfig = {
      host: process.env.SMTP_HOST || 'smtp.gmail.com',
      port: parseInt(process.env.SMTP_PORT || '587'),
      secure: process.env.SMTP_SECURE === 'true',
      auth: {
        user: process.env.SMTP_USER || '',
        pass: process.env.SMTP_PASS || ''
      }
    };

    this.transporter = nodemailer.createTransport(config);
    return this.transporter;
  }

  private canSendEmail(key: string): boolean {
    const lastSent = this.lastEmailSent.get(key);
    if (!lastSent) return true;

    const timeSinceLastEmail = Date.now() - lastSent;
    return timeSinceLastEmail > this.RATE_LIMIT_MS;
  }

  private markEmailSent(key: string): void {
    this.lastEmailSent.set(key, Date.now());
  }

  async sendPaymentSubmittedEmail(claimId: string): Promise<void> {
    try {
      // Rate limiting check
      const rateLimitKey = `payment_submitted_${claimId}`;
      if (!this.canSendEmail(rateLimitKey)) {
        console.log(`[EmailService] Rate limit: Skipping duplicate email for claim ${claimId}`);
        return;
      }

      // Fetch claim details with all necessary relations
      const claim = await (prisma as any).paymentClaim.findUnique({
        where: { id: claimId },
        include: {
          tenantIdentity: {
            select: {
              name: true,
              email: true
            }
          },
          lease: {
            include: {
              property: {
                select: {
                  name: true
                }
              },
              unit: {
                select: {
                  unitNumber: true
                }
              }
            }
          },
          manager: {
            select: {
              name: true,
              email: true
            }
          }
        }
      });

      if (!claim) {
        console.error(`[EmailService] Claim ${claimId} not found`);
        return;
      }

      if (!claim.manager?.email) {
        console.log(`[EmailService] Manager email not found for claim ${claimId}`);
        return;
      }

      const managerEmail = claim.manager.email;
      const tenantName = claim.tenantIdentity?.name || 'Unknown Tenant';
      const amount = claim.amount.toLocaleString();
      const propertyName = claim.lease?.property?.name || 'Unknown Property';
      const unitNumber = claim.lease?.unit?.unitNumber || 'Unknown Unit';
      const method = claim.method?.replace('_', ' ') || 'Unknown Method';
      const claimedDate = new Date(claim.claimedPaidAt).toLocaleDateString();

      const subject = `New Payment Claim - ${tenantName} - UGX ${amount}`;

      const htmlContent = `
        <!DOCTYPE html>
        <html>
        <head>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background-color: #4CAF50; color: white; padding: 20px; text-align: center; }
            .content { background-color: #f9f9f9; padding: 20px; border: 1px solid #ddd; }
            .detail-row { margin: 10px 0; }
            .label { font-weight: bold; color: #555; }
            .value { color: #333; }
            .footer { margin-top: 20px; padding: 20px; text-align: center; color: #777; font-size: 12px; }
            .button { display: inline-block; padding: 12px 24px; background-color: #4CAF50; color: white; text-decoration: none; border-radius: 4px; margin-top: 15px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>New Payment Claim Submitted</h1>
            </div>
            <div class="content">
              <p>Hello ${claim.manager.name},</p>
              <p>A new payment claim has been submitted and requires your verification.</p>
              
              <div class="detail-row">
                <span class="label">Tenant:</span>
                <span class="value">${tenantName}</span>
              </div>
              <div class="detail-row">
                <span class="label">Amount:</span>
                <span class="value">UGX ${amount}</span>
              </div>
              <div class="detail-row">
                <span class="label">Property:</span>
                <span class="value">${propertyName} - Unit ${unitNumber}</span>
              </div>
              <div class="detail-row">
                <span class="label">Payment Method:</span>
                <span class="value">${method}</span>
              </div>
              <div class="detail-row">
                <span class="label">Date Claimed:</span>
                <span class="value">${claimedDate}</span>
              </div>
              <div class="detail-row">
                <span class="label">Status:</span>
                <span class="value" style="color: #FF9800; font-weight: bold;">Pending Verification</span>
              </div>
              
              <p style="margin-top: 20px;">
                <a href="${process.env.FRONTEND_URL || 'http://localhost:8081'}" class="button">
                  Review Payment Claim
                </a>
              </p>
            </div>
            <div class="footer">
              <p>This is an automated notification from EstateNet.</p>
              <p>Please do not reply to this email.</p>
            </div>
          </div>
        </body>
        </html>
      `;

      const textContent = `
New Payment Claim Submitted

Hello ${claim.manager.name},

A new payment claim has been submitted and requires your verification.

Tenant: ${tenantName}
Amount: UGX ${amount}
Property: ${propertyName} - Unit ${unitNumber}
Payment Method: ${method}
Date Claimed: ${claimedDate}
Status: Pending Verification

Please log in to your EstateNet dashboard to review and verify this payment claim.

---
This is an automated notification from EstateNet.
Please do not reply to this email.
      `;

      await this.getTransporter().sendMail({
        from: process.env.SMTP_FROM || 'EstateNet <noreply@estatenet.com>',
        to: managerEmail,
        subject,
        text: textContent,
        html: htmlContent
      });

      this.markEmailSent(rateLimitKey);
      console.log(`[EmailService] Payment submitted email sent to ${managerEmail} for claim ${claimId}`);

    } catch (error) {
      console.error('[EmailService] Error sending payment submitted email:', error);
      throw error;
    }
  }

  async sendPaymentVerifiedEmail(claimId: string): Promise<void> {
    try {
      // Rate limiting check
      const rateLimitKey = `payment_verified_${claimId}`;
      if (!this.canSendEmail(rateLimitKey)) {
        console.log(`[EmailService] Rate limit: Skipping duplicate email for claim ${claimId}`);
        return;
      }

      // Fetch claim details with all necessary relations
      const claim = await (prisma as any).paymentClaim.findUnique({
        where: { id: claimId },
        include: {
          tenantIdentity: {
            select: {
              name: true,
              email: true
            }
          },
          lease: {
            include: {
              property: {
                select: {
                  name: true
                }
              },
              unit: {
                select: {
                  unitNumber: true
                }
              }
            }
          },
          verification: {
            select: {
              decidedAt: true
            }
          }
        }
      });

      if (!claim) {
        console.error(`[EmailService] Claim ${claimId} not found`);
        return;
      }

      if (!claim.tenantIdentity?.email) {
        console.log(`[EmailService] Tenant email not found for claim ${claimId}`);
        return;
      }

      const tenantEmail = claim.tenantIdentity.email;
      const tenantName = claim.tenantIdentity.name || 'Valued Tenant';
      const amount = claim.amount.toLocaleString();
      const propertyName = claim.lease?.property?.name || 'Unknown Property';
      const unitNumber = claim.lease?.unit?.unitNumber || 'Unknown Unit';
      const verificationDate = claim.verification?.decidedAt
        ? new Date(claim.verification.decidedAt).toLocaleDateString()
        : new Date().toLocaleDateString();
      const receiptUrl = `${process.env.FRONTEND_URL || 'http://localhost:8081'}/api/receipts/${claimId}`;

      const subject = `Payment Verified - UGX ${amount}`;

      const htmlContent = `
        <!DOCTYPE html>
        <html>
        <head>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background-color: #4CAF50; color: white; padding: 20px; text-align: center; }
            .content { background-color: #f9f9f9; padding: 20px; border: 1px solid #ddd; }
            .detail-row { margin: 10px 0; }
            .label { font-weight: bold; color: #555; }
            .value { color: #333; }
            .success-badge { background-color: #4CAF50; color: white; padding: 8px 16px; border-radius: 4px; display: inline-block; margin: 15px 0; }
            .footer { margin-top: 20px; padding: 20px; text-align: center; color: #777; font-size: 12px; }
            .button { display: inline-block; padding: 12px 24px; background-color: #2196F3; color: white; text-decoration: none; border-radius: 4px; margin-top: 15px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>✓ Payment Verified</h1>
            </div>
            <div class="content">
              <p>Dear ${tenantName},</p>
              <p>Great news! Your payment claim has been verified and recorded in the system.</p>
              
              <div class="success-badge">STATUS: VERIFIED</div>
              
              <div class="detail-row">
                <span class="label">Amount:</span>
                <span class="value">UGX ${amount}</span>
              </div>
              <div class="detail-row">
                <span class="label">Property:</span>
                <span class="value">${propertyName} - Unit ${unitNumber}</span>
              </div>
              <div class="detail-row">
                <span class="label">Verification Date:</span>
                <span class="value">${verificationDate}</span>
              </div>
              
              <p style="margin-top: 20px;">
                <a href="${receiptUrl}" class="button">
                  Download Receipt
                </a>
              </p>
              
              <p style="margin-top: 20px; color: #555;">
                Thank you for your prompt payment. Your receipt is available for download using the button above.
              </p>
            </div>
            <div class="footer">
              <p>This is an automated notification from EstateNet.</p>
              <p>Please do not reply to this email.</p>
            </div>
          </div>
        </body>
        </html>
      `;

      const textContent = `
Payment Verified

Dear ${tenantName},

Great news! Your payment claim has been verified and recorded in the system.

STATUS: VERIFIED

Amount: UGX ${amount}
Property: ${propertyName} - Unit ${unitNumber}
Verification Date: ${verificationDate}

Download your receipt: ${receiptUrl}

Thank you for your prompt payment.

---
This is an automated notification from EstateNet.
Please do not reply to this email.
      `;

      await this.getTransporter().sendMail({
        from: process.env.SMTP_FROM || 'EstateNet <noreply@estatenet.com>',
        to: tenantEmail,
        subject,
        text: textContent,
        html: htmlContent
      });

      this.markEmailSent(rateLimitKey);
      console.log(`[EmailService] Payment verified email sent to ${tenantEmail} for claim ${claimId}`);

    } catch (error) {
      console.error('[EmailService] Error sending payment verified email:', error);
      throw error;
    }
  }

  async sendFeedbackStatusUpdateEmail(postId: string, newStatus: string): Promise<void> {
    try {
      const rateLimitKey = `feedback_status_${postId}_${newStatus}`;
      if (!this.canSendEmail(rateLimitKey)) {
        console.log(`[EmailService] Rate limit: Skipping duplicate email for post ${postId}`);
        return;
      }

      const post = await (prisma as any).forumPost.findUnique({
        where: { id: postId },
        include: {
          author: {
            select: {
              name: true,
              email: true
            }
          }
        }
      });

      if (!post || !post.author?.email) {
        console.log(`[EmailService] Post or author email not found for post ${postId}`);
        return;
      }

      const statusLabels: Record<string, string> = {
        OPEN: 'Open',
        IN_PROGRESS: 'In Progress',
        RESOLVED: 'Resolved'
      };

      const statusColors: Record<string, string> = {
        OPEN: '#FF9800',
        IN_PROGRESS: '#2196F3',
        RESOLVED: '#4CAF50'
      };

      const statusLabel = statusLabels[newStatus] || newStatus;
      const statusColor = statusColors[newStatus] || '#1F3A5F';

      const subject = `Feedback Update: ${post.title}`;

      const htmlContent = `
        <!DOCTYPE html>
        <html>
        <head>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background-color: #1F3A5F; color: white; padding: 20px; text-align: center; }
            .content { background-color: #f9f9f9; padding: 20px; border: 1px solid #ddd; }
            .status-badge { display: inline-block; padding: 8px 16px; background-color: ${statusColor}; color: white; border-radius: 4px; font-weight: bold; margin: 15px 0; }
            .detail-row { margin: 10px 0; }
            .label { font-weight: bold; color: #555; }
            .value { color: #333; }
            .footer { margin-top: 20px; padding: 20px; text-align: center; color: #777; font-size: 12px; }
            .button { display: inline-block; padding: 12px 24px; background-color: #1F3A5F; color: white; text-decoration: none; border-radius: 4px; margin-top: 15px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>Feedback Status Update</h1>
            </div>
            <div class="content">
              <p>Hello ${post.author.name},</p>
              <p>Your feedback has been updated:</p>
              
              <div class="detail-row">
                <span class="label">Title:</span>
                <span class="value">${post.title}</span>
              </div>
              
              <div class="status-badge">Status: ${statusLabel}</div>
              
              <p style="margin-top: 20px;">
                Thank you for your feedback! We'll keep you updated on any progress.
              </p>
              
              <p style="margin-top: 20px;">
                <a href="${process.env.FRONTEND_URL || 'http://localhost:8081'}" class="button">
                  View Feedback
                </a>
              </p>
            </div>
            <div class="footer">
              <p>This is an automated notification from EstateNet.</p>
              <p>Please do not reply to this email.</p>
            </div>
          </div>
        </body>
        </html>
      `;

      const textContent = `
Feedback Status Update

Hello ${post.author.name},

Your feedback has been updated:

Title: ${post.title}
Status: ${statusLabel}

Thank you for your feedback! We'll keep you updated on any progress.

---
This is an automated notification from EstateNet.
Please do not reply to this email.
      `;

      await this.getTransporter().sendMail({
        from: process.env.SMTP_FROM || 'EstateNet <noreply@estatenet.com>',
        to: post.author.email,
        subject,
        text: textContent,
        html: htmlContent
      });

      this.markEmailSent(rateLimitKey);
      console.log(`[EmailService] Feedback status update email sent to ${post.author.email} for post ${postId}`);

    } catch (error) {
      console.error('[EmailService] Error sending feedback status update email:', error);
      throw error;
    }
  }

  async sendAdminResponseEmail(postId: string, commentId: string): Promise<void> {
    try {
      const rateLimitKey = `admin_response_${postId}_${commentId}`;
      if (!this.canSendEmail(rateLimitKey)) {
        console.log(`[EmailService] Rate limit: Skipping duplicate email for comment ${commentId}`);
        return;
      }

      const comment = await (prisma as any).forumComment.findUnique({
        where: { id: commentId },
        include: {
          post: {
            include: {
              author: {
                select: {
                  name: true,
                  email: true
                }
              }
            }
          },
          author: {
            select: {
              name: true
            }
          }
        }
      });

      if (!comment || !comment.post?.author?.email) {
        console.log(`[EmailService] Comment or post author email not found for comment ${commentId}`);
        return;
      }

      const subject = `Admin Response: ${comment.post.title}`;

      const htmlContent = `
        <!DOCTYPE html>
        <html>
        <head>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background-color: #1F3A5F; color: white; padding: 20px; text-align: center; }
            .content { background-color: #f9f9f9; padding: 20px; border: 1px solid #ddd; }
            .admin-badge { display: inline-block; padding: 4px 12px; background-color: #FF6B35; color: white; border-radius: 12px; font-size: 12px; font-weight: bold; margin-bottom: 10px; }
            .response-box { background-color: white; padding: 15px; border-left: 4px solid #1F3A5F; margin: 15px 0; }
            .detail-row { margin: 10px 0; }
            .label { font-weight: bold; color: #555; }
            .value { color: #333; }
            .footer { margin-top: 20px; padding: 20px; text-align: center; color: #777; font-size: 12px; }
            .button { display: inline-block; padding: 12px 24px; background-color: #1F3A5F; color: white; text-decoration: none; border-radius: 4px; margin-top: 15px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>Admin Response Received</h1>
            </div>
            <div class="content">
              <p>Hello ${comment.post.author.name},</p>
              <p>An admin has responded to your feedback:</p>
              
              <div class="detail-row">
                <span class="label">Your Feedback:</span>
                <span class="value">${comment.post.title}</span>
              </div>
              
              <div class="admin-badge">ADMIN RESPONSE</div>
              
              <div class="response-box">
                <p style="margin: 0;">${comment.content}</p>
              </div>
              
              <p style="margin-top: 20px;">
                <a href="${process.env.FRONTEND_URL || 'http://localhost:8081'}" class="button">
                  View Full Discussion
                </a>
              </p>
            </div>
            <div class="footer">
              <p>This is an automated notification from EstateNet.</p>
              <p>Please do not reply to this email.</p>
            </div>
          </div>
        </body>
        </html>
      `;

      const textContent = `
Admin Response Received

Hello ${comment.post.author.name},

An admin has responded to your feedback:

Your Feedback: ${comment.post.title}

ADMIN RESPONSE:
${comment.content}

View the full discussion at: ${process.env.FRONTEND_URL || 'http://localhost:8081'}

---
This is an automated notification from EstateNet.
Please do not reply to this email.
      `;

      await this.getTransporter().sendMail({
        from: process.env.SMTP_FROM || 'EstateNet <noreply@estatenet.com>',
        to: comment.post.author.email,
        subject,
        text: textContent,
        html: htmlContent
      });

      this.markEmailSent(rateLimitKey);
      console.log(`[EmailService] Admin response email sent to ${comment.post.author.email} for comment ${commentId}`);

    } catch (error) {
      console.error('[EmailService] Error sending admin response email:', error);
      throw error;
    }
  }

  async sendPolicyUpdateEmail(email: string, name: string, documentType: string, newVersion: string, effectiveDate: string): Promise<void> {
    try {
      const rateLimitKey = `policy_update_${email}_${documentType}_${newVersion}`;
      if (!this.canSendEmail(rateLimitKey)) {
        console.log(`[EmailService] Rate limit: Skipping duplicate policy update email for ${email}`);
        return;
      }

      const docLabel = documentType === 'privacyPolicy' ? 'Privacy Policy' : 'Terms of Service';
      const formattedDate = new Date(effectiveDate).toLocaleDateString('en-GB', {
        day: 'numeric', month: 'long', year: 'numeric'
      });

      const subject = `[EstateNet] ${docLabel} Updated — Effective ${formattedDate}`;

      const htmlContent = `
        <!DOCTYPE html>
        <html>
        <head>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background-color: #1a73e8; color: white; padding: 20px; text-align: center; }
            .content { background-color: #f9f9f9; padding: 20px; border: 1px solid #ddd; }
            .footer { margin-top: 20px; padding: 20px; text-align: center; color: #777; font-size: 12px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>${docLabel} Updated</h1>
            </div>
            <div class="content">
              <p>Hello ${name},</p>
              <p>EstateNet has updated its <strong>${docLabel}</strong> (version ${newVersion}).</p>
              <p>The updated document will take effect on <strong>${formattedDate}</strong>.</p>
              <p>You can review the changes by visiting your account settings in the EstateNet app.</p>
              <p>By continuing to use EstateNet after ${formattedDate}, you agree to the updated ${docLabel}.</p>
              <p>If you do not agree with these changes, you may delete your account or cease using the Service.</p>
            </div>
            <div class="footer">
              <p>This is an automated notification from EstateNet.</p>
              <p>Please do not reply to this email.</p>
            </div>
          </div>
        </body>
        </html>
      `;

      const textContent = `
${docLabel} Updated

Hello ${name},

EstateNet has updated its ${docLabel} (version ${newVersion}).

The updated document will take effect on ${formattedDate}.

You can review the changes by visiting your account settings in the EstateNet app.

By continuing to use EstateNet after ${formattedDate}, you agree to the updated ${docLabel}.

If you do not agree with these changes, you may delete your account or cease using the Service.

---
This is an automated notification from EstateNet.
Please do not reply to this email.
      `;

      await this.getTransporter().sendMail({
        from: process.env.SMTP_FROM || 'EstateNet <noreply@estatenet.com>',
        to: email,
        subject,
        text: textContent,
        html: htmlContent,
      });

      this.markEmailSent(rateLimitKey);
      console.log(`[EmailService] Policy update email sent to ${email} for ${docLabel} v${newVersion}`);
    } catch (error) {
      console.error('[EmailService] Error sending policy update email:', error);
      throw error;
    }
  }
}

export default new EmailService();
