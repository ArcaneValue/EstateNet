export interface ReportMeta {
  period: string;
  propertyName: string;
  generatedAt: string;
}

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

const generateBaseHTML = (data: ReportData): string => {
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
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
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
          padding: 20px;
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

// Helper function to generate timestamp for file naming
const generateTimestamp = (): string => {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  const hours = String(now.getHours()).padStart(2, '0');
  const minutes = String(now.getMinutes()).padStart(2, '0');
  return `${year}${month}${day}-${hours}${minutes}`;
};

// Helper function to sanitize property name for file system
const sanitizeFileName = (name: string): string => {
  return name.replace(/[^a-zA-Z0-9\s]/g, '').replace(/\s+/g, '');
};

// Generate filename following the pattern: EstateNet_<ReportType>_<Period>_<PropertyOrAll>_<YYYYMMDD-HHMM>.pdf
const generateFileName = (reportType: string, period: string, propertyName: string): string => {
  const cleanReportType = reportType.replace(/\s+/g, '');
  const cleanPeriod = period.replace(/[^a-zA-Z0-9]/g, '');
  const cleanProperty = sanitizeFileName(propertyName) || 'AllProperties';
  const timestamp = generateTimestamp();

  return `EstateNet_${cleanReportType}_${cleanPeriod}_${cleanProperty}_${timestamp}.pdf`;
};

export const buildRentCollectionHtml = (data: any, meta: ReportMeta): { html: string; fileName: string } => {
  const totalCollected = data.totalCollected || 0;
  const outstandingAmount = data.outstandingAmount || 0;

  const reportData: ReportData = {
    title: 'Rent Collection Report',
    propertyName: meta.propertyName,
    dateRange: meta.period,
    generatedAt: meta.generatedAt,
    executiveSummary: {
      totalIncome: totalCollected,
      totalExpenses: outstandingAmount,
      netIncome: totalCollected,
    },
    sections: [
      {
        title: 'Collection Summary',
        items: [
          { label: 'Total Rent Due', amount: totalCollected + outstandingAmount },
          { label: 'Amount Collected', amount: totalCollected },
          { label: 'Outstanding Amount', amount: outstandingAmount },
        ],
        total: totalCollected,
        showTotal: true,
      },
      ...(data.properties ? [{
        title: 'By Property',
        items: data.properties.map((prop: any) => ({
          label: prop.name,
          amount: prop.collected || 0,
          subItems: prop.units?.map((unit: any) => ({
            label: `Unit ${unit.unitNumber} - ${unit.tenantName || 'Vacant'}`,
            amount: unit.rentPaid || 0,
          })) || [],
        })),
      }] : []),
      ...(data.recentPayments ? [{
        title: 'Recent Payments',
        subtitle: 'Last 10 payments received',
        items: data.recentPayments.slice(0, 10).map((payment: any) => ({
          label: `${payment.tenantName} - Unit ${payment.unitNumber}`,
          amount: payment.amount,
        })),
      }] : []),
    ],
  };

  const html = generateBaseHTML(reportData);
  const fileName = generateFileName('RentCollection', meta.period, meta.propertyName);

  return { html, fileName };
};

export const buildOutstandingRentHtml = (data: any, meta: ReportMeta): { html: string; fileName: string } => {
  const totalOutstanding = data.totalOutstanding || 0;
  const amountCollected = data.totalCollected || 0;

  const reportData: ReportData = {
    title: 'Outstanding Rent Report',
    propertyName: meta.propertyName,
    dateRange: meta.period,
    generatedAt: meta.generatedAt,
    executiveSummary: {
      totalExpenses: totalOutstanding,
      totalIncome: amountCollected,
      netIncome: -totalOutstanding,
    },
    sections: [
      {
        title: 'Outstanding Summary',
        items: [
          { label: 'Total Outstanding', amount: totalOutstanding },
          { label: 'Number of Tenants', amount: data.tenantCount || 0 },
          { label: 'Average Outstanding per Tenant', amount: data.tenantCount ? totalOutstanding / data.tenantCount : 0 },
        ],
        total: totalOutstanding,
        showTotal: true,
      },
      ...(data.tenants ? [{
        title: 'Outstanding by Tenant',
        items: data.tenants.map((tenant: any) => ({
          label: `${tenant.name} - Unit ${tenant.unitNumber}`,
          amount: tenant.outstanding,
          subItems: tenant.breakdown ? tenant.breakdown.map((item: any) => ({
            label: `${item.period} (Due: ${new Date(item.dueDate).toLocaleDateString()})`,
            amount: item.amount,
          })) : [],
        })),
      }] : []),
    ],
  };

  const html = generateBaseHTML(reportData);
  const fileName = generateFileName('OutstandingRent', meta.period, meta.propertyName);

  return { html, fileName };
};

export const buildIncomeStatementHtml = (data: any, meta: ReportMeta): { html: string; fileName: string } => {
  // Handle the actual API data structure
  const totalIncome = data.revenue?.totalRevenue || 0;
  const totalExpenses = data.expenses?.totalExpenses || 0;
  const netIncome = data.netIncome || (totalIncome - totalExpenses);

  const reportData: ReportData = {
    title: 'Income Statement',
    propertyName: meta.propertyName,
    dateRange: meta.period,
    generatedAt: meta.generatedAt,
    executiveSummary: {
      totalIncome,
      totalExpenses,
      netIncome,
    },
    sections: [
      {
        title: 'Revenue',
        items: [
          { label: 'Total Revenue', amount: totalIncome },
        ],
        total: totalIncome,
        showTotal: true,
      },
      {
        title: 'Expenses',
        items: [
          { label: 'Total Expenses', amount: totalExpenses },
        ],
        total: totalExpenses,
        showTotal: true,
      },
      {
        title: 'Net Income',
        items: [
          { label: 'Net Income', amount: netIncome },
        ],
        total: netIncome,
        showTotal: false,
      },
    ],
  };

  const html = generateBaseHTML(reportData);
  const fileName = generateFileName('IncomeStatement', meta.period, meta.propertyName);

  return { html, fileName };
};

export const buildCashflowHtml = (data: any, meta: ReportMeta): { html: string; fileName: string } => {
  const openingBalance = data.openingCashBalance || 0;
  const closingBalance = data.closingCashBalance || 0;
  const netMovement = closingBalance - openingBalance;

  const reportData: ReportData = {
    title: 'Cashflow Statement',
    propertyName: meta.propertyName,
    dateRange: meta.period,
    generatedAt: meta.generatedAt,
    executiveSummary: {
      openingCashBalance: openingBalance,
      netCashMovement: netMovement,
      closingCashBalance: closingBalance,
    },
    sections: [
      {
        title: 'Operating Activities',
        items: (data.operating || []).map((item: any) => ({
          label: item.label,
          amount: item.amount,
        })),
        total: data.operating?.reduce((sum: number, item: any) => sum + item.amount, 0) || 0,
        showTotal: true,
      },
      {
        title: 'Investing Activities',
        items: (data.investing || []).map((item: any) => ({
          label: item.label,
          amount: item.amount,
        })),
        total: data.investing?.reduce((sum: number, item: any) => sum + item.amount, 0) || 0,
        showTotal: true,
      },
      {
        title: 'Financing Activities',
        items: (data.financing || []).map((item: any) => ({
          label: item.label,
          amount: item.amount,
        })),
        total: data.financing?.reduce((sum: number, item: any) => sum + item.amount, 0) || 0,
        showTotal: true,
      },
    ],
  };

  const html = generateBaseHTML(reportData);
  const fileName = generateFileName('CashflowStatement', meta.period, meta.propertyName);

  return { html, fileName };
};

export const buildFinancialPositionHtml = (data: any, meta: ReportMeta): { html: string; fileName: string } => {
  // Extract values from the actual API structure (nested object, not array)
  const totalAssets = data.assets?.totalAssets || 0;
  const totalLiabilities = data.liabilities?.totalLiabilities || 0;
  const ownersEquity = data.equity?.totalEquity || 0;

  const reportData: ReportData = {
    title: 'Financial Position',
    propertyName: meta.propertyName,
    dateRange: meta.period,
    generatedAt: meta.generatedAt,
    executiveSummary: {
      totalAssets,
      totalLiabilities,
      ownersEquity,
    },
    sections: [
      {
        title: 'Assets',
        items: [
          {
            label: 'Current Assets',
            amount: data.assets?.current?.totalCurrentAssets || 0,
            subItems: [
              {
                label: 'Cash Received in Period',
                amount: data.assets?.current?.cashReceivedInPeriod || 0,
              },
              {
                label: 'Rent Receivable for Period',
                amount: data.assets?.current?.rentReceivableForPeriod || 0,
              },
            ],
          },
          {
            label: 'Non-Current Assets',
            amount: data.assets?.nonCurrent?.totalNonCurrentAssets || 0,
            subItems: [
              {
                label: 'Property, Plant & Equipment',
                amount: data.assets?.nonCurrent?.propertyPlantEquipment || 0,
              },
            ],
          },
        ],
        total: totalAssets,
        showTotal: true,
      },
      {
        title: 'Liabilities',
        items: [
          {
            label: 'Current Liabilities',
            amount: data.liabilities?.current?.totalCurrentLiabilities || 0,
            subItems: [
              {
                label: 'Accounts Payable',
                amount: data.liabilities?.current?.accountsPayable || 0,
              },
            ],
          },
          {
            label: 'Non-Current Liabilities',
            amount: data.liabilities?.nonCurrent?.totalNonCurrentLiabilities || 0,
            subItems: [
              {
                label: 'Long-term Debt',
                amount: data.liabilities?.nonCurrent?.longTermDebt || 0,
              },
            ],
          },
        ],
        total: totalLiabilities,
        showTotal: true,
      },
      {
        title: 'Equity',
        items: [
          {
            label: 'Retained Earnings',
            amount: data.equity?.retainedEarnings || 0
          },
        ],
        total: ownersEquity,
        showTotal: true,
      },
    ],
  };

  const html = generateBaseHTML(reportData);
  const fileName = generateFileName('FinancialPosition', meta.period, meta.propertyName);

  return { html, fileName };
};
