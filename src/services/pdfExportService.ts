import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';

export interface ReportData {
  title: string;
  propertyName: string;
  dateRange: string;
  generatedAt: string;
  executiveSummary: {
    totalIncome?: number;
    totalExpenses?: number;
    netIncome?: number;
    totalAssets?: number;
    totalLiabilities?: number;
    ownersEquity?: number;
    openingCashBalance?: number;
    netCashMovement?: number;
    closingCashBalance?: number;
  };
  sections: ReportSection[];
}

export interface ReportSection {
  title: string;
  subtitle?: string;
  items: ReportItem[];
  total?: number;
  showTotal?: boolean;
}

export interface ReportItem {
  label: string;
  amount: number;
  subItems?: ReportItem[];
  isSubtotal?: boolean;
}

export class PDFExportService {
  static generateFinancialPDF = async (reportData: ReportData): Promise<void> => {
    const html = this.generateFinancialHTML(reportData);

    try {
      const { uri } = await Print.printToFileAsync({
        html,
        base64: false,
      });

      await Sharing.shareAsync(uri, {
        mimeType: 'application/pdf',
        dialogTitle: `Export ${reportData.title}`,
        UTI: 'com.adobe.pdf',
      });
    } catch (error) {
      console.error('PDF generation failed:', error);
      throw new Error('Failed to generate PDF');
    }
  };

  private static generateFinancialHTML = (data: ReportData): string => {
    const formatCurrency = (amount: number): string => {
      return `UGX ${amount.toLocaleString()}`;
    };

    const formatAmount = (amount: number): string => {
      const sign = amount >= 0 ? '+' : '';
      return `${sign}${formatCurrency(Math.abs(amount))}`;
    };

    const generateExecutiveSummary = (data: ReportData): string => {
      const formatCurrency = (amount: number) => `UGX ${(Math.abs(amount) / 1000000).toFixed(1)}M`;
      const formatAmount = (amount: number) => amount >= 0 ? `${formatCurrency(amount)}` : `(${formatCurrency(Math.abs(amount))})`;

      if (data.title === 'Income Statement') {
        return `
          <div class="executive-summary">
            <h3>Executive Summary</h3>
            <table class="summary-table">
              <tr>
                <td class="summary-label">Total Revenue:</td>
                <td class="summary-amount">${formatCurrency(data.executiveSummary.totalIncome || 0)}</td>
              </tr>
              <tr>
                <td class="summary-label">Total Expenses:</td>
                <td class="summary-amount">(${formatCurrency(data.executiveSummary.totalExpenses || 0)})</td>
              </tr>
              <tr class="summary-total">
                <td class="summary-label"><strong>Net Income:</strong></td>
                <td class="summary-amount"><strong>${formatAmount(data.executiveSummary.netIncome || 0)}</strong></td>
              </tr>
            </table>
          </div>
        `;
      } else if (data.title === 'Financial Position') {
        return `
          <div class="executive-summary">
            <h3>Balance Sheet Summary</h3>
            <table class="summary-table">
              <tr>
                <td class="summary-label">Total Assets:</td>
                <td class="summary-amount">${formatCurrency(data.executiveSummary.totalAssets || 0)}</td>
              </tr>
              <tr>
                <td class="summary-label">Total Liabilities:</td>
                <td class="summary-amount">${formatCurrency(data.executiveSummary.totalLiabilities || 0)}</td>
              </tr>
              <tr class="summary-total">
                <td class="summary-label"><strong>Owner's Equity:</strong></td>
                <td class="summary-amount"><strong>${formatCurrency(data.executiveSummary.ownersEquity || 0)}</strong></td>
              </tr>
            </table>
          </div>
        `;
      } else if (data.title === 'Cashflow Statement') {
        return `
          <div class="executive-summary">
            <h3>Cash Flow Summary</h3>
            <table class="summary-table">
              <tr>
                <td class="summary-label">Opening Cash Balance:</td>
                <td class="summary-amount">${formatCurrency(data.executiveSummary.openingCashBalance || 0)}</td>
              </tr>
              <tr>
                <td class="summary-label">Net Cash Movement:</td>
                <td class="summary-amount">${formatAmount(data.executiveSummary.netCashMovement || 0)}</td>
              </tr>
              <tr class="summary-total">
                <td class="summary-label"><strong>Closing Cash Balance:</strong></td>
                <td class="summary-amount"><strong>${formatCurrency(data.executiveSummary.closingCashBalance || 0)}</strong></td>
              </tr>
            </table>
          </div>
        `;
      } else if (data.title === 'Rent Collection Report') {
        return `
          <div class="executive-summary">
            <h3>Collection Summary</h3>
            <table class="summary-table">
              <tr>
                <td class="summary-label">Total Collected:</td>
                <td class="summary-amount">${formatCurrency(data.executiveSummary.totalIncome || 0)}</td>
              </tr>
              <tr>
                <td class="summary-label">Outstanding Amount:</td>
                <td class="summary-amount">(${formatCurrency(data.executiveSummary.totalExpenses || 0)})</td>
              </tr>
              <tr class="summary-total">
                <td class="summary-label"><strong>Collection Rate:</strong></td>
                <td class="summary-amount"><strong>${data.executiveSummary.totalIncome && data.executiveSummary.totalExpenses ?
            ((data.executiveSummary.totalIncome / (data.executiveSummary.totalIncome + data.executiveSummary.totalExpenses)) * 100).toFixed(1) : '0'}%</strong></td>
              </tr>
            </table>
          </div>
        `;
      } else if (data.title === 'Outstanding Rent Report') {
        return `
          <div class="executive-summary">
            <h3>Outstanding Summary</h3>
            <table class="summary-table">
              <tr>
                <td class="summary-label">Total Outstanding:</td>
                <td class="summary-amount">(${formatCurrency(data.executiveSummary.totalExpenses || 0)})</td>
              </tr>
              <tr>
                <td class="summary-label">Amount Collected:</td>
                <td class="summary-amount">${formatCurrency(data.executiveSummary.totalIncome || 0)}</td>
              </tr>
              <tr class="summary-total">
                <td class="summary-label"><strong>Net Outstanding:</strong></td>
                <td class="summary-amount"><strong>${formatAmount(data.executiveSummary.netIncome || 0)}</strong></td>
              </tr>
            </table>
          </div>
        `;
      }
      return '';
    };

    const generateSection = (section: ReportSection): string => {
      const items = section.items.map(item => {
        if (item.subItems && item.subItems.length > 0) {
          const subItems = item.subItems.map(subItem => `
            <tr class="sub-item">
              <td class="sub-label">${subItem.label}</td>
              <td class="amount">${formatCurrency(Math.abs(subItem.amount))}</td>
            </tr>
          `).join('');

          return `
            <tr class="main-item">
              <td class="main-label">${item.label}</td>
              <td class="amount">${formatCurrency(Math.abs(item.amount))}</td>
            </tr>
            ${subItems}
          `;
        } else {
          return `
            <tr class="${item.isSubtotal ? 'subtotal' : 'line-item'}">
              <td class="${item.isSubtotal ? 'subtotal-label' : 'label'}">${item.label}</td>
              <td class="amount">${formatCurrency(Math.abs(item.amount))}</td>
            </tr>
          `;
        }
      }).join('');

      const totalRow = section.showTotal && section.total !== undefined ? `
        <tr class="total-row">
          <td class="total-label">${section.title} Total</td>
          <td class="total-amount">${formatCurrency(Math.abs(section.total))}</td>
        </tr>
      ` : '';

      return `
        <div class="section">
          <h3 class="section-title">${section.title}</h3>
          ${section.subtitle ? `<p class="section-subtitle">${section.subtitle}</p>` : ''}
          <table class="financial-table">
            <thead>
              <tr>
                <th class="description">Description</th>
                <th class="amount">Amount (UGX)</th>
              </tr>
            </thead>
            <tbody>
              ${items}
              ${totalRow}
            </tbody>
          </table>
        </div>
      `;
    };

    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <title>${data.title}</title>
        <style>
          @page {
            size: A4;
            margin: 2cm;
            @bottom-center {
              content: "Page " counter(page) " of " counter(pages);
              font-size: 10px;
              color: #666;
            }
          }
          
          body {
            font-family: 'Times New Roman', Times, serif;
            color: #000;
            line-height: 1.6;
            margin: 0;
            padding: 0;
            background: white;
            font-size: 12pt;
          }
          
          .header {
            text-align: center;
            margin-bottom: 30px;
            border-bottom: 2px solid #000;
            padding-bottom: 15px;
          }
          
          .logo {
            font-size: 18pt;
            font-weight: bold;
            color: #000;
            margin-bottom: 8px;
            text-transform: uppercase;
            letter-spacing: 2px;
          }
          
          .report-title {
            font-size: 16pt;
            font-weight: bold;
            color: #000;
            margin: 8px 0;
            text-transform: uppercase;
          }
          
          .report-meta {
            font-size: 10pt;
            color: #000;
            margin: 3px 0;
          }
          
          .executive-summary {
            background: white;
            border: 1px solid #000;
            padding: 15px;
            margin: 20px 0;
          }
          
          .executive-summary h3 {
            font-size: 14pt;
            font-weight: bold;
            color: #000;
            margin: 0 0 10px 0;
            text-align: center;
            text-transform: uppercase;
          }
          
          .summary-table {
            width: 100%;
            border-collapse: collapse;
            margin: 10px 0;
          }
          
          .summary-table td {
            padding: 8px 12px;
            border-bottom: 1px solid #000;
          }
          
          .summary-label {
            font-size: 11pt;
            font-weight: normal;
            color: #000;
            width: 60%;
          }
          
          .summary-amount {
            font-size: 11pt;
            font-weight: normal;
            color: #000;
            text-align: right;
            width: 40%;
          }
          
          .summary-total td {
            border-top: 2px solid #000;
            border-bottom: 2px solid #000;
            padding-top: 10px;
            padding-bottom: 10px;
          }
          
          .section {
            margin: 30px 0;
            page-break-inside: avoid;
          }
          
          .section-title {
            font-size: 14pt;
            font-weight: bold;
            color: #000;
            margin-bottom: 10px;
            padding-bottom: 5px;
            border-bottom: 1px solid #000;
            text-transform: uppercase;
          }
          
          .section-subtitle {
            font-size: 10pt;
            color: #000;
            margin-bottom: 10px;
            font-style: italic;
          }
          
          .financial-table {
            width: 100%;
            border-collapse: collapse;
            margin: 10px 0;
            border: 1px solid #000;
          }
          
          .financial-table th {
            background: white;
            color: #000;
            padding: 8px 10px;
            text-align: left;
            font-weight: bold;
            font-size: 11pt;
            border-bottom: 2px solid #000;
          }
          
          .financial-table td {
            padding: 6px 10px;
            border-bottom: 1px solid #000;
            font-size: 11pt;
            color: #000;
          }
          
          .main-item {
            background: #f5f5f5;
            font-weight: bold;
          }
          
          .main-item td {
            padding-top: 8px;
            border-top: 1px solid #000;
          }
          
          .sub-item {
            font-size: 10pt;
            color: #000;
          }
          
          .sub-label {
            padding-left: 20px;
            font-style: italic;
          }
          
          .subtotal {
            background: #f5f5f5;
            font-weight: bold;
          }
          
          .subtotal-label {
            font-weight: bold;
            padding-left: 10px;
          }
          
          .total-row {
            background: white;
            color: #000;
            font-weight: bold;
            border-top: 2px solid #000;
            border-bottom: 2px solid #000;
          }
          
          .total-row td {
            padding: 8px 10px;
            font-weight: bold;
          }
          
          .amount {
            text-align: right;
            font-family: 'Times New Roman', Times, serif;
            font-weight: normal;
          }
          
          .total-label {
            font-weight: bold;
          }
          
          .total-amount {
            text-align: right;
            font-weight: bold;
            font-family: 'Times New Roman', Times, serif;
          }
          
          .footer {
            margin-top: 30px;
            padding-top: 15px;
            border-top: 1px solid #000;
            text-align: center;
            font-size: 9pt;
            color: #000;
          }
          
          .disclaimer {
            margin-top: 8px;
            font-size: 8pt;
            font-style: italic;
            color: #000;
          }
          
          @media print {
            .section {
              page-break-inside: avoid;
            }
            
            .executive-summary {
              page-break-inside: avoid;
            }
          }
        </style>
      </head>
      <body>
        <!-- Header -->
        <div class="header">
          <div class="logo">EstateNet</div>
          <div class="report-title">${data.title}</div>
          <div class="report-meta">${data.propertyName}</div>
          <div class="report-meta">${data.dateRange}</div>
          <div class="report-meta">Generated: ${data.generatedAt}</div>
        </div>
        
        <!-- Executive Summary -->
        ${generateExecutiveSummary(data)}
        
        <!-- Detailed Breakdown -->
        ${data.sections.map(section => generateSection(section)).join('')}
        
        <!-- Footer -->
        <div class="footer">
          <div>Generated by EstateNet Property Management System</div>
          <div class="disclaimer">
            This document is electronically generated and serves as an official financial record. 
            For verification purposes, please contact your property manager.
          </div>
        </div>
      </body>
      </html>
    `;
  };

  // Helper methods for creating report data
  static createIncomeStatementData = (
    propertyName: string,
    dateRange: string,
    incomeData: any[],
    expenseData: any[]
  ): ReportData => {
    const totalIncome = incomeData.reduce((sum, item) => sum + item.amount, 0);
    const totalExpenses = expenseData.reduce((sum, item) => sum + Math.abs(item.amount), 0);
    const netIncome = totalIncome - totalExpenses;

    return {
      title: 'Income Statement',
      propertyName,
      dateRange,
      generatedAt: new Date().toLocaleString(),
      executiveSummary: {
        totalIncome,
        totalExpenses,
        netIncome,
      },
      sections: [
        {
          title: 'Income',
          items: incomeData.map(item => ({
            label: item.label,
            amount: item.amount,
            subItems: item.transactions?.map((t: any) => ({
              label: `${t.tenant || t.description} - ${t.property || ''}`,
              amount: t.amount,
            })) || [],
          })),
          total: totalIncome,
          showTotal: true,
        },
        {
          title: 'Expenses',
          items: expenseData.map(item => ({
            label: item.label,
            amount: item.amount,
            subItems: item.transactions?.map((t: any) => ({
              label: t.description,
              amount: t.amount,
            })) || [],
          })),
          total: totalExpenses,
          showTotal: true,
        },
      ],
    };
  };

  static createFinancialPositionData = (
    propertyName: string,
    dateRange: string,
    assetsData: any[],
    liabilitiesData: any[],
    equityData: any[]
  ): ReportData => {
    const totalAssets = assetsData.reduce((sum, item) => sum + item.amount, 0);
    const totalLiabilities = liabilitiesData.reduce((sum, item) => sum + item.amount, 0);
    const ownersEquity = equityData.reduce((sum, item) => sum + item.amount, 0);

    return {
      title: 'Statement of Financial Position',
      propertyName,
      dateRange: `As at ${dateRange}`,
      generatedAt: new Date().toLocaleString(),
      executiveSummary: {
        totalAssets,
        totalLiabilities,
        ownersEquity,
      },
      sections: [
        {
          title: 'Assets',
          items: assetsData.map(item => ({
            label: item.label,
            amount: item.amount,
            subItems: item.transactions?.map((t: any) => ({
              label: t.description,
              amount: t.amount,
            })) || [],
          })),
          total: totalAssets,
          showTotal: true,
        },
        {
          title: 'Liabilities',
          items: liabilitiesData.map(item => ({
            label: item.label,
            amount: item.amount,
            subItems: item.transactions?.map((t: any) => ({
              label: t.description,
              amount: t.amount,
            })) || [],
          })),
          total: totalLiabilities,
          showTotal: true,
        },
        {
          title: "Owner's Equity",
          items: equityData.map(item => ({
            label: item.label,
            amount: item.amount,
          })),
          total: ownersEquity,
          showTotal: true,
        },
      ],
    };
  };

  static createCashflowData = (
    propertyName: string,
    dateRange: string,
    operatingActivities: any[],
    investingActivities: any[],
    financingActivities: any[],
    openingBalance: number,
    netCashFlow: number,
    closingBalance: number
  ): ReportData => {
    const operatingTotal = operatingActivities.reduce((sum, item) => sum + item.amount, 0);
    const investingTotal = investingActivities.reduce((sum, item) => sum + item.amount, 0);
    const financingTotal = financingActivities.reduce((sum, item) => sum + item.amount, 0);

    return {
      title: 'Cashflow Statement',
      propertyName,
      dateRange,
      generatedAt: new Date().toLocaleString(),
      executiveSummary: {
        openingCashBalance: openingBalance,
        netCashMovement: netCashFlow,
        closingCashBalance: closingBalance,
      },
      sections: [
        {
          title: 'Operating Activities',
          items: operatingActivities.map(item => ({
            label: item.label,
            amount: item.amount,
            subItems: item.transactions?.map((t: any) => ({
              label: t.description,
              amount: t.amount,
            })) || [],
          })),
          total: operatingTotal,
          showTotal: true,
        },
        {
          title: 'Investing Activities',
          items: investingActivities.map(item => ({
            label: item.label,
            amount: item.amount,
            subItems: item.transactions?.map((t: any) => ({
              label: t.description,
              amount: t.amount,
            })) || [],
          })),
          total: investingTotal,
          showTotal: true,
        },
        {
          title: 'Financing Activities',
          items: financingActivities.map(item => ({
            label: item.label,
            amount: item.amount,
            subItems: item.transactions?.map((t: any) => ({
              label: t.description,
              amount: t.amount,
            })) || [],
          })),
          total: financingTotal,
          showTotal: true,
        },
      ],
    };
  };

  static createRentCollectionData = (
    propertyName: string,
    dateRange: string,
    totalCollected: number,
    byProperty: any[],
    recentPayments: any[]
  ): ReportData => {
    const totalExpected = byProperty.reduce((sum, prop) => sum + prop.expectedRent, 0);
    const collectionRate = totalExpected > 0 ? ((totalCollected / totalExpected) * 100).toFixed(1) : '0.0';

    return {
      title: 'Rent Collection Report',
      propertyName,
      dateRange,
      generatedAt: new Date().toLocaleString(),
      executiveSummary: {
        totalIncome: totalCollected,
        totalExpenses: totalExpected - totalCollected,
        netIncome: totalCollected,
      },
      sections: [
        {
          title: 'Collection Summary',
          subtitle: `Overall collection rate: ${collectionRate}%`,
          items: [
            { label: 'Total Expected Rent', amount: totalExpected },
            { label: 'Total Collected', amount: totalCollected },
            { label: 'Outstanding Amount', amount: totalExpected - totalCollected },
          ],
          showTotal: false,
        },
        {
          title: 'By Property Breakdown',
          items: byProperty.map(prop => ({
            label: prop.propertyName,
            amount: prop.collectedRent,
            subItems: [
              { label: 'Expected', amount: prop.expectedRent },
              { label: 'Collected', amount: prop.collectedRent },
              { label: `Collection Rate: ${prop.collectionRate}%`, amount: 0 },
            ],
          })),
          total: totalCollected,
          showTotal: true,
        },
        {
          title: 'Recent Payments',
          subtitle: `Last ${recentPayments.length} payments received`,
          items: recentPayments.slice(0, 20).map(payment => ({
            label: `${payment.tenantName} - ${payment.propertyName} Unit ${payment.unitNumber}`,
            amount: payment.amount,
            subItems: [
              { label: `Date: ${new Date(payment.paymentDate).toLocaleDateString()}`, amount: 0 },
              { label: `Status: ${payment.status}`, amount: 0 },
            ],
          })),
          showTotal: false,
        },
      ],
    };
  };

  static createOutstandingRentData = (
    propertyName: string,
    dateRange: string,
    totalOutstanding: number,
    overdueTenantsCount: number,
    outstandingItems: any[]
  ): ReportData => {
    const totalExpected = outstandingItems.reduce((sum, item) => sum + item.expectedRent, 0);
    const totalCollected = outstandingItems.reduce((sum, item) => sum + item.collectedRent, 0);

    return {
      title: 'Outstanding Rent Report',
      propertyName,
      dateRange,
      generatedAt: new Date().toLocaleString(),
      executiveSummary: {
        totalIncome: totalCollected,
        totalExpenses: totalOutstanding,
        netIncome: totalCollected - totalOutstanding,
      },
      sections: [
        {
          title: 'Outstanding Summary',
          items: [
            { label: 'Total Outstanding Amount', amount: totalOutstanding },
            { label: 'Number of Overdue Tenants', amount: overdueTenantsCount },
            { label: 'Total Expected Rent', amount: totalExpected },
            { label: 'Total Collected', amount: totalCollected },
          ],
          showTotal: false,
        },
        {
          title: 'Outstanding by Tenant',
          items: outstandingItems.map(item => ({
            label: `${item.tenantName} - ${item.propertyName} Unit ${item.unitNumber}`,
            amount: item.amountOutstanding,
            subItems: [
              { label: 'Expected Rent', amount: item.expectedRent },
              { label: 'Amount Paid', amount: item.collectedRent },
              { label: 'Outstanding', amount: item.amountOutstanding },
              { label: `Phone: ${item.tenantPhone || 'Not available'}`, amount: 0 },
              { label: `Last Payment: ${item.lastPaymentAt ? new Date(item.lastPaymentAt).toLocaleDateString() : 'No payments yet'}`, amount: 0 },
            ],
          })),
          total: totalOutstanding,
          showTotal: true,
        },
      ],
    };
  };

  // Simplified export methods for direct use in screens
  static exportRentCollection = async (data: any, propertyName: string, period: string): Promise<void> => {
    const reportData = this.createRentCollectionData(
      propertyName,
      `Period: ${period}`,
      data.totalCollected || 0,
      data.byProperty || [],
      data.recentPayments || []
    );
    await this.generateFinancialPDF(reportData);
  };

  static exportOutstandingRent = async (data: any, propertyName: string, period: string): Promise<void> => {
    const reportData = this.createOutstandingRentData(
      propertyName,
      `Period: ${period}`,
      data.totalOutstanding || 0,
      data.overdueTenantsCount || 0,
      data.items || []
    );
    await this.generateFinancialPDF(reportData);
  };

  static exportIncomeStatement = async (data: any, propertyName: string, period: string): Promise<void> => {
    const reportData = this.createIncomeStatementData(
      propertyName,
      `Period: ${period}`,
      data.income?.items || [],
      data.expenses?.items || []
    );
    await this.generateFinancialPDF(reportData);
  };

  static exportFinancialPosition = async (data: any, propertyName: string, period: string): Promise<void> => {
    const reportData = this.createFinancialPositionData(
      propertyName,
      period,
      data.assets?.items || [],
      data.liabilities?.items || [],
      data.equity?.items || []
    );
    await this.generateFinancialPDF(reportData);
  };

  static exportCashflowStatement = async (data: any, propertyName: string, period: string): Promise<void> => {
    const reportData = this.createCashflowData(
      propertyName,
      `Period: ${period}`,
      data.operatingActivities?.items || [],
      data.investingActivities?.items || [],
      data.financingActivities?.items || [],
      data.openingBalance || 0,
      data.netCashFlow || 0,
      data.closingBalance || 0
    );
    await this.generateFinancialPDF(reportData);
  };
}
