import { Response } from 'express';
import { generatePdfFromHtml, createSampleReportHtml } from '../utils/pdf';
import { AuthenticatedRequest } from '../middlewares/auth';
import { PaymentService } from '../services/paymentService';

const paymentService = new PaymentService();

export const getSamplePdf = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const html = createSampleReportHtml();
    const pdfBuffer = await generatePdfFromHtml(html);

    // Set response headers for PDF download
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', 'attachment; filename="estatenet-sample-report.pdf"');
    res.setHeader('Content-Length', pdfBuffer.length);

    res.status(200).send(pdfBuffer);
  } catch (error) {
    console.error('Generate sample PDF error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to generate PDF report'
    });
  }
};

export const getFinancialStatements = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    if (req.user?.role !== 'MANAGER' && req.user?.role !== 'OWNER') {
      res.status(403).json({
        success: false,
        message: 'Only managers and owners can access financial statements'
      });
      return;
    }

    const { propertyId, period } = req.query;
    const summary = await paymentService.getPaymentSummary(propertyId as string);

    // Basic financial statements derived from payments
    const financialStatements = {
      incomeStatement: {
        totalRentIncome: summary.totalRent,
        totalExpenses: 0, // TODO: Implement expenses model
        netIncome: summary.netIncome,
        period: period || 'current'
      },
      balanceSheet: {
        totalAssets: summary.totalOutstanding, // Simplified
        totalLiabilities: 0, // TODO: Implement liabilities
        equity: summary.netIncome,
        period: period || 'current'
      },
      cashflowStatement: {
        operatingCashflow: summary.totalPaid,
        investingCashflow: 0, // TODO: Implement investments
        financingCashflow: 0, // TODO: Implement financing
        netCashflow: summary.totalPaid,
        period: period || 'current'
      }
    };

    res.status(200).json({
      success: true,
      data: financialStatements
    });
  } catch (error) {
    console.error('Get financial statements error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
};

/*
Postman examples:

GET /api/reports/sample-pdf
(no body needed)
- Returns a PDF file for download

GET /api/reports/financial-statements
(no query params for all properties)
GET /api/reports/financial-statements?propertyId=property-id&period=2024-01
*/
