import PDFDocument from 'pdfkit';
import { prisma } from '../utils/database';

class ReceiptService {
  async generateReceiptPDF(paymentClaimId: string): Promise<Buffer> {
    try {
      // Fetch claim details with all necessary relations
      const claim = await (prisma as any).paymentClaim.findUnique({
        where: { id: paymentClaimId },
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
          manager: {
            select: {
              name: true
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
        throw new Error(`Payment claim ${paymentClaimId} not found`);
      }

      if (claim.status !== 'VERIFIED') {
        throw new Error(`Payment claim ${paymentClaimId} is not verified`);
      }

      // Create PDF document
      const doc = new PDFDocument({
        size: 'A4',
        margins: { top: 50, bottom: 50, left: 50, right: 50 }
      });

      // Buffer to store PDF
      const chunks: Buffer[] = [];
      doc.on('data', (chunk) => chunks.push(chunk));

      // Generate receipt ID
      const receiptId = `RCP-${paymentClaimId.substring(0, 8).toUpperCase()}`;
      const verificationDate = claim.verification?.decidedAt 
        ? new Date(claim.verification.decidedAt)
        : new Date();

      // Header
      doc.fontSize(24)
         .font('Helvetica-Bold')
         .text('PAYMENT RECEIPT', { align: 'center' })
         .moveDown(0.5);

      doc.fontSize(10)
         .font('Helvetica')
         .text('EstateNet Property Management', { align: 'center' })
         .moveDown(2);

      // Receipt ID and Date
      doc.fontSize(10)
         .font('Helvetica-Bold')
         .text(`Receipt ID: ${receiptId}`, 50, doc.y)
         .font('Helvetica')
         .text(`Date: ${verificationDate.toLocaleDateString()}`, { align: 'right' })
         .moveDown(2);

      // Horizontal line
      doc.moveTo(50, doc.y)
         .lineTo(545, doc.y)
         .stroke()
         .moveDown(1);

      // Tenant Information Section
      doc.fontSize(12)
         .font('Helvetica-Bold')
         .text('TENANT INFORMATION', 50, doc.y)
         .moveDown(0.5);

      doc.fontSize(10)
         .font('Helvetica')
         .text(`Name: ${claim.tenantIdentity?.name || 'N/A'}`, 50, doc.y)
         .moveDown(0.3)
         .text(`Email: ${claim.tenantIdentity?.email || 'N/A'}`, 50, doc.y)
         .moveDown(0.3);

      if (claim.tenantIdentity?.phoneNumber) {
        doc.text(`Phone: ${claim.tenantIdentity.phoneNumber}`, 50, doc.y)
           .moveDown(1.5);
      } else {
        doc.moveDown(1.5);
      }

      // Property Information Section
      doc.fontSize(12)
         .font('Helvetica-Bold')
         .text('PROPERTY INFORMATION', 50, doc.y)
         .moveDown(0.5);

      doc.fontSize(10)
         .font('Helvetica')
         .text(`Property: ${claim.lease?.property?.name || 'N/A'}`, 50, doc.y)
         .moveDown(0.3)
         .text(`Unit Number: ${claim.lease?.unit?.unitNumber || 'N/A'}`, 50, doc.y)
         .moveDown(0.3);

      if (claim.lease?.property?.location) {
        doc.text(`Location: ${claim.lease.property.location}`, 50, doc.y)
           .moveDown(1.5);
      } else {
        doc.moveDown(1.5);
      }

      // Payment Details Section
      doc.fontSize(12)
         .font('Helvetica-Bold')
         .text('PAYMENT DETAILS', 50, doc.y)
         .moveDown(0.5);

      doc.fontSize(10)
         .font('Helvetica')
         .text(`Amount Paid: UGX ${claim.amount.toLocaleString()}`, 50, doc.y)
         .moveDown(0.3)
         .text(`Payment Method: ${claim.method?.replace('_', ' ') || 'N/A'}`, 50, doc.y)
         .moveDown(0.3)
         .text(`Date Paid: ${new Date(claim.claimedPaidAt).toLocaleDateString()}`, 50, doc.y)
         .moveDown(0.3)
         .text(`Verification Date: ${verificationDate.toLocaleDateString()}`, 50, doc.y)
         .moveDown(0.3);

      if (claim.referenceText) {
        doc.text(`Reference: ${claim.referenceText}`, 50, doc.y)
           .moveDown(1.5);
      } else {
        doc.moveDown(1.5);
      }

      // Manager Information
      if (claim.manager?.name) {
        doc.fontSize(12)
           .font('Helvetica-Bold')
           .text('VERIFIED BY', 50, doc.y)
           .moveDown(0.5);

        doc.fontSize(10)
           .font('Helvetica')
           .text(`Property Manager: ${claim.manager.name}`, 50, doc.y)
           .moveDown(2);
      }

      // Amount Summary Box
      const boxY = doc.y;
      doc.rect(50, boxY, 495, 60)
         .fillAndStroke('#f0f0f0', '#000000')
         .fill('#000000');

      doc.fontSize(14)
         .font('Helvetica-Bold')
         .text('TOTAL AMOUNT PAID', 60, boxY + 15)
         .fontSize(18)
         .text(`UGX ${claim.amount.toLocaleString()}`, 60, boxY + 35)
         .moveDown(3);

      // Footer
      const footerY = 750;
      doc.moveTo(50, footerY)
         .lineTo(545, footerY)
         .stroke();

      doc.fontSize(9)
         .font('Helvetica')
         .text('This is an official receipt from EstateNet Property Management System', 50, footerY + 10, {
           align: 'center',
           width: 495
         })
         .moveDown(0.3)
         .text(`Generated on ${new Date().toLocaleString()}`, {
           align: 'center',
           width: 495
         });

      // Finalize PDF
      doc.end();

      // Wait for PDF to be fully generated
      return new Promise((resolve, reject) => {
        doc.on('end', () => {
          const pdfBuffer = Buffer.concat(chunks);
          resolve(pdfBuffer);
        });
        doc.on('error', reject);
      });

    } catch (error) {
      console.error('[ReceiptService] Error generating receipt PDF:', error);
      throw error;
    }
  }
}

export default new ReceiptService();
