import { Request, Response } from 'express';
import { prisma } from '../utils/database';
import { AuthenticatedRequest } from '../middlewares/auth';
import { NotificationService } from '../services/notificationService';
import { paymentClaimEvents } from '../services/eventEmitterService';
import { AuditLogService } from '../services/auditLogService';
import { FraudDetectionService } from '../services/fraudDetectionService';

const notificationService = new NotificationService();

// ─── Tenant Endpoints ──────────────────────────────────────────────────────

export const createPaymentClaim = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { leaseId, amount, claimedPaidAt, method, referenceText } = req.body;

    // Validation
    if (!leaseId || !amount || !claimedPaidAt || !method) {
      res.status(400).json({
        success: false,
        message: 'Lease ID, amount, claimed paid date, and payment method are required'
      });
      return;
    }

    // Validate amount is a positive number
    if (typeof amount !== 'number' || !Number.isFinite(amount) || amount <= 0) {
      res.status(400).json({
        success: false,
        message: 'Amount must be a positive number'
      });
      return;
    }

    if (!req.user?.tenantId) {
      res.status(400).json({
        success: false,
        message: 'Tenant ID not found in user profile'
      });
      return;
    }

    // Get lease with rent amount and verify ownership
    const lease = await prisma.lease.findFirst({
      where: {
        id: leaseId,
        tenantId: req.user.tenantId,
        status: 'ACTIVE'
      },
      include: {
        property: {
          select: { managerId: true }
        }
      }
    });


    if (!lease) {
      res.status(404).json({
        success: false,
        message: 'Active lease not found for this tenant'
      });
      return;
    }

    if (!lease.property.managerId) {
      res.status(400).json({
        success: false,
        message: 'Property does not have an assigned manager'
      });
      return;
    }

    // Validate amount is multiple of rent and within 1-5 months
    const monthlyRent = lease.rentAmount;
    if (amount % monthlyRent !== 0) {
      res.status(400).json({
        success: false,
        message: `Amount must be a multiple of monthly rent (UGX ${monthlyRent.toLocaleString()})`
      });
      return;
    }

    const monthsPaid = amount / monthlyRent;
    if (monthsPaid < 1 || monthsPaid > 5) {
      res.status(400).json({
        success: false,
        message: 'Amount must be between 1-5 months of rent'
      });
      return;
    }

    // Validate method
    const validMethods = ['CASH', 'MTN', 'AIRTEL', 'BANK_TRANSFER'];
    if (!validMethods.includes(method)) {
      res.status(400).json({
        success: false,
        message: 'Invalid payment method. Must be one of: ' + validMethods.join(', ')
      });
      return;
    }

    // Compute billing period from claimedPaidAt (YYYY-MM format)
    const billingPeriod = new Date(claimedPaidAt).toISOString().slice(0, 7);

    // Check for duplicate claims (idempotency protection)
    // Prevent duplicate claims for same tenant, lease, billing period, and active status
    const existingClaim = await (prisma as any).paymentClaim.findFirst({
      where: {
        tenantId: req.user.tenantId,
        leaseId,
        billingPeriod,
        status: {
          in: ['PENDING', 'VERIFIED']
        }
      }
    });

    if (existingClaim) {
      res.status(409).json({
        success: false,
        code: 'DUPLICATE_CLAIM',
        message: `A claim for this lease and billing period (${billingPeriod}) already exists and is pending or verified.`,
        data: {
          existingClaimId: existingClaim.id,
          existingStatus: existingClaim.status,
          billingPeriod: existingClaim.billingPeriod,
          createdAt: existingClaim.createdAt
        }
      });
      return;
    }

    // Run fraud detection check
    const fraudCheck = await FraudDetectionService.checkForFraud(req.user.tenantId, amount);

    // Create payment claim
    const claim = await prisma.paymentClaim.create({
      data: {
        tenantId: req.user.tenantId,
        leaseId,
        managerId: lease.property.managerId,
        amount,
        claimedPaidAt: new Date(claimedPaidAt),
        billingPeriod,
        method,
        referenceText,
        status: 'PENDING',
        flagged: fraudCheck.shouldFlag
      },
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
        }
      }
    });

    // Create notification for manager
    try {
      if (lease.property.managerId) {
        await notificationService.createNotification({
          userId: lease.property.managerId,
          type: 'PAYMENT_CLAIM_SUBMITTED',
          title: 'New Payment Claim',
          body: `${claim.tenantIdentity.name} submitted a payment claim for UGX ${amount.toLocaleString()}`,
          metadata: {
            claimId: claim.id,
            tenantId: req.user.tenantId,
            leaseId,
            amount,
            monthsPaid,
            propertyName: claim.lease.property.name,
            unitNumber: claim.lease.unit.unitNumber
          }
        });
      }
    } catch (notifyError) {
      console.error('Payment claim notification error:', notifyError);
    }

    // Send email notification to manager
    try {
      const EmailService = (await import('../services/emailService')).default;
      await EmailService.sendPaymentSubmittedEmail(claim.id);
    } catch (emailError) {
      console.error('Payment claim email error:', emailError);
      // Don't fail the request if email fails
    }

    // Emit event for future push notification integration
    try {
      paymentClaimEvents.emitPaymentClaimCreated({
        managerId: lease.property.managerId,
        claimId: claim.id,
        tenantId: req.user.tenantId,
        leaseId,
        amount,
        monthsPaid,
        propertyName: claim.lease.property.name,
        unitNumber: claim.lease.unit.unitNumber,
        tenantName: claim.tenantIdentity.name
      });
    } catch (eventError) {
      console.error('Payment claim event emission error:', eventError);
    }

    res.status(201).json({
      success: true,
      message: 'Payment claim submitted successfully',
      data: claim
    });
  } catch (error) {
    console.error('Create payment claim error:', error);
    res.status(500).json({
      success: false,
      message: error instanceof Error ? error.message : 'Internal server error'
    });
  }
};

export const getTenantPaymentClaims = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    if (!req.user?.tenantId) {
      res.status(400).json({
        success: false,
        message: 'Tenant ID not found in user profile'
      });
      return;
    }

    const { status, limit = 20 } = req.query;

    const where: any = { tenantId: req.user.tenantId };
    if (status) {
      where.status = status;
    }

    const claims = await (prisma as any).paymentClaim.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: parseInt(limit as string),
      include: {
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
            decision: true,
            note: true,
            decidedAt: true
          }
        }
      }
    });

    res.json({
      success: true,
      data: claims
    });
  } catch (error) {
    console.error('Get tenant payment claims error:', error);
    res.status(500).json({
      success: false,
      message: error instanceof Error ? error.message : 'Internal server error'
    });
  }
};

// ─── Manager Endpoints ─────────────────────────────────────────────────────

export const getManagerPaymentClaims = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    if (!req.user?.id) {
      res.status(400).json({
        success: false,
        message: 'Manager ID not found in user profile'
      });
      return;
    }

    const { status = 'PENDING', limit = 50 } = req.query;

    const where: any = { managerId: req.user.id };
    if (status) {
      where.status = status;
    }

    const claims = await (prisma as any).paymentClaim.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: parseInt(limit as string),
      include: {
        tenantIdentity: {
          select: {
            name: true,
            email: true,
            phoneNumber: true
          }
        },
        lease: {
          include: {
            property: {
              select: {
                name: true,
                location: true
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
            decision: true,
            note: true,
            decidedAt: true
          }
        }
      }
    });

    res.json({
      success: true,
      data: claims
    });
  } catch (error) {
    console.error('Get manager payment claims error:', error);
    res.status(500).json({
      success: false,
      message: error instanceof Error ? error.message : 'Internal server error'
    });
  }
};

export const verifyPaymentClaim = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { claimId } = req.params;
    const { decision, note } = req.body;

    if (!req.user?.id) {
      res.status(400).json({
        success: false,
        message: 'Manager ID not found in user profile'
      });
      return;
    }

    // Validate decision
    if (!['VERIFIED', 'REJECTED'].includes(decision)) {
      res.status(400).json({
        success: false,
        message: 'Decision must be either VERIFIED or REJECTED'
      });
      return;
    }

    // Get claim and verify ownership
    const claim = await (prisma as any).paymentClaim.findFirst({
      where: {
        id: claimId,
        managerId: req.user.id,
        status: 'PENDING'
      },
      include: {
        lease: {
          select: {
            rentAmount: true,
            propertyId: true,
            unitId: true
          }
        },
        tenantIdentity: {
          select: {
            name: true
          }
        }
      }
    });

    if (!claim) {
      res.status(404).json({
        success: false,
        message: 'Payment claim not found or already processed'
      });
      return;
    }

    if (!claim.lease) {
      res.status(400).json({
        success: false,
        message: 'Lease information not found for this payment claim'
      });
      return;
    }

    console.log('[verifyPaymentClaim] Starting verification', {
      claimId,
      decision,
      managerId: req.user.id
    });

    // Process verification in transaction
    let result;
    try {
      result = await prisma.$transaction(async (tx) => {
        // Create verification record
        const verification = await (tx as any).paymentClaimVerification.create({
          data: {
            claimId,
            managerId: req.user!.id,
            decision,
            note
          }
        });

        // Update claim status
        const updatedClaim = await (tx as any).paymentClaim.update({
          where: { id: claimId },
          data: { status: decision }
        });

        // If verified, allocate payment to rent periods
        if (decision === 'VERIFIED') {
          // Check if payment already exists for this claim (idempotency)
          const existingPayment = await (tx as any).payment.findUnique({
            where: { paymentClaimId: claimId }
          });

          if (!existingPayment) {
            // Create a payment record from the verified claim
            const payment = await (tx as any).payment.create({
              data: {
                tenantId: claim.tenantId,
                propertyId: claim.lease.propertyId,
                unitId: claim.lease.unitId,
                leaseId: claim.leaseId,
                amount: claim.amount,
                paymentDate: verification.decidedAt,
                dueDate: claim.claimedPaidAt,
                paymentMethod: claim.method,
                transactionId: claim.referenceText,
                status: 'PAID',
                billingPeriod: new Date(claim.claimedPaidAt).toISOString().slice(0, 7), // YYYY-MM format
                paymentClaimId: claim.id // Reference to the original claim
              }
            });

            console.log(`Payment record created from claim ${claimId}:`, payment.id);
          } else {
            console.log(`Payment already exists for claim ${claimId}:`, existingPayment.id);
          }
        }

        return { verification, updatedClaim };
      });
    } catch (transactionError) {
      console.error('[verifyPaymentClaim] Transaction error', {
        claimId,
        decision,
        managerId: req.user.id,
        error: transactionError instanceof Error ? transactionError.message : transactionError
      });
      throw transactionError;
    }

    // Create notification for tenant
    try {
      // The tenantId in the claim refers to the tenant's user ID (in the test setup)
      // So we look for a user where either tenantId matches OR id matches (for direct tenant user)
      const tenantUser = await prisma.user.findFirst({
        where: {
          OR: [
            { tenantId: claim.tenantId },
            { id: claim.tenantId }
          ]
        }
      });


      if (tenantUser) {
        await notificationService.createNotification({
          userId: tenantUser.id,
          type: decision === 'VERIFIED' ? 'PAYMENT_CLAIM_VERIFIED' : 'PAYMENT_CLAIM_REJECTED',
          title: decision === 'VERIFIED' ? 'Payment Claim Verified' : 'Payment Claim Rejected',
          body: decision === 'VERIFIED'
            ? `Your payment claim for UGX ${claim.amount.toLocaleString()} has been verified`
            : `Your payment claim for UGX ${claim.amount.toLocaleString()} has been rejected${note ? ': ' + note : ''}`,
          metadata: {
            claimId,
            amount: claim.amount,
            decision,
            note
          }
        });
      }
    } catch (notifyError) {
      console.error('Payment claim verification notification error:', notifyError);
    }

    // Send email notification to tenant if verified
    if (decision === 'VERIFIED') {
      try {
        const EmailService = (await import('../services/emailService')).default;
        await EmailService.sendPaymentVerifiedEmail(claimId);
      } catch (emailError) {
        console.error('Payment verification email error:', emailError);
        // Don't fail the request if email fails
      }
    }

    // Emit event for future push notification integration
    try {
      paymentClaimEvents.emitPaymentClaimVerified({
        tenantId: claim.tenantId,
        claimId,
        managerId: req.user.id,
        decision,
        amount: claim.amount,
        note
      });
    } catch (eventError) {
      console.error('Payment claim verification event emission error:', eventError);
    }

    res.status(200).json({
      success: true,
      message: `Payment claim ${decision.toLowerCase()} successfully`,
      data: {
        claimId: claim.id,
        decision,
        note,
        verifiedAt: result.verification.decidedAt
      }
    });

  } catch (error) {
    console.error('Payment claim verification error:', error);
    res.status(500).json({
      success: false,
      message: error instanceof Error ? error.message : 'Internal server error',
      error: process.env.NODE_ENV !== 'production' ? error : undefined
    });
  }
};

// ─── Audit & History Endpoints ─────────────────────────────────────────────

export const getPaymentClaimHistory = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { claimId } = req.params;

    // Verify the claim exists and manager has access
    const claim = await prisma.paymentClaim.findFirst({
      where: {
        id: claimId,
        managerId: req.user?.id
      }
    });

    if (!claim) {
      res.status(404).json({
        success: false,
        message: 'Payment claim not found or access denied'
      });
      return;
    }

    // Get audit history (will return empty array if audit system not available)
    const auditHistory = await AuditLogService.getPaymentClaimHistory(claimId);

    // Get basic claim timeline from database
    const claimWithVerification = await prisma.paymentClaim.findUnique({
      where: { id: claimId },
      include: {
        verification: true,
        tenantIdentity: {
          select: {
            name: true,
            email: true
          }
        }
      }
    });

    const timeline = [
      {
        action: 'CREATED',
        timestamp: claimWithVerification?.createdAt,
        performedBy: {
          id: claim.tenantId,
          name: claimWithVerification?.tenantIdentity?.name || 'Tenant',
          role: 'TENANT'
        },
        details: {
          amount: claim.amount,
          method: claim.method,
          flagged: claim.flagged
        }
      }
    ];

    if (claimWithVerification?.verification) {
      timeline.push({
        action: claimWithVerification.verification.decision,
        timestamp: claimWithVerification.verification.decidedAt,
        performedBy: {
          id: claimWithVerification.verification.managerId,
          name: 'Manager',
          role: 'MANAGER'
        },
        details: {
          note: claimWithVerification.verification.note
        } as any
      });
    }

    res.status(200).json({
      success: true,
      data: {
        claimId,
        currentStatus: claim.status,
        flagged: claim.flagged,
        timeline,
        auditTrail: auditHistory.length > 0 ? auditHistory : null
      }
    });

  } catch (error) {
    console.error('Get payment claim history error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
};

// ─── Receipt Download Endpoint ─────────────────────────────────────────────

export const downloadReceipt = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { paymentClaimId } = req.params;

    if (!req.user?.id) {
      res.status(401).json({
        success: false,
        message: 'User not authenticated'
      });
      return;
    }

    // Get claim and verify it exists and is verified
    const claim = await (prisma as any).paymentClaim.findUnique({
      where: { id: paymentClaimId },
      select: {
        id: true,
        status: true,
        tenantId: true,
        managerId: true
      }
    });

    if (!claim) {
      res.status(404).json({
        success: false,
        message: 'Payment claim not found'
      });
      return;
    }

    if (claim.status !== 'VERIFIED') {
      res.status(400).json({
        success: false,
        message: 'Receipt is only available for verified payment claims'
      });
      return;
    }

    // Verify user has access (must be tenant or manager of this claim)
    const isTenant = claim.tenantId === req.user.tenantId || claim.tenantId === req.user.id;
    const isManager = claim.managerId === req.user.id;

    if (!isTenant && !isManager) {
      res.status(403).json({
        success: false,
        message: 'Access denied. You do not have permission to download this receipt.'
      });
      return;
    }

    // Generate PDF receipt
    const ReceiptService = (await import('../services/receiptService')).default;
    const pdfBuffer = await ReceiptService.generateReceiptPDF(paymentClaimId);

    // Set response headers for PDF download
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="receipt-${paymentClaimId.substring(0, 8)}.pdf"`);
    res.setHeader('Content-Length', pdfBuffer.length);

    // Send PDF buffer
    res.send(pdfBuffer);

  } catch (error) {
    console.error('Download receipt error:', error);
    res.status(500).json({
      success: false,
      message: error instanceof Error ? error.message : 'Internal server error'
    });
  }
};
