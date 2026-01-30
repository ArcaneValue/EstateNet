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

        const generateExecutiveSummary = (): string => {
            if (data.title === 'Income Statement') {
                return `
          <div class="executive-summary">
            <div class="summary-grid">
              <div class="summary-item">
                <div class="summary-label">Total Income</div>
                <div class="summary-value positive">${formatCurrency(data.executiveSummary.totalIncome || 0)}</div>
              </div>
              <div class="summary-item">
                <div class="summary-label">Total Expenses</div>
                <div class="summary-value negative">${formatCurrency(data.executiveSummary.totalExpenses || 0)}</div>
              </div>
              <div class="summary-item total">
                <div class="summary-label">Net Income</div>
                <div class="summary-value ${(data.executiveSummary.netIncome || 0) >= 0 ? 'positive' : 'negative'}">
                  ${formatAmount(data.executiveSummary.netIncome || 0)}
                </div>
              </div>
            </div>
          </div>
        `;
            } else if (data.title === 'Statement of Financial Position') {
                return `
          <div class="executive-summary">
            <div class="summary-grid">
              <div class="summary-item">
                <div class="summary-label">Total Assets</div>
                <div class="summary-value">${formatCurrency(data.executiveSummary.totalAssets || 0)}</div>
              </div>
              <div class="summary-item">
                <div class="summary-label">Total Liabilities</div>
                <div class="summary-value">${formatCurrency(data.executiveSummary.totalLiabilities || 0)}</div>
              </div>
              <div class="summary-item total">
                <div class="summary-label">Owner's Equity</div>
                <div class="summary-value">${formatCurrency(data.executiveSummary.ownersEquity || 0)}</div>
              </div>
            </div>
          </div>
        `;
            } else if (data.title === 'Cashflow Statement') {
                return `
          <div class="executive-summary">
            <div class="summary-grid">
              <div class="summary-item">
                <div class="summary-label">Opening Cash Balance</div>
                <div class="summary-value">${formatCurrency(data.executiveSummary.openingCashBalance || 0)}</div>
              </div>
              <div class="summary-item">
                <div class="summary-label">Net Cash Movement</div>
                <div class="summary-value ${(data.executiveSummary.netCashMovement || 0) >= 0 ? 'positive' : 'negative'}">
                  ${formatAmount(data.executiveSummary.netCashMovement || 0)}
                </div>
              </div>
              <div class="summary-item total">
                <div class="summary-label">Closing Cash Balance</div>
                <div class="summary-value">${formatCurrency(data.executiveSummary.closingCashBalance || 0)}</div>
              </div>
            </div>
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
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            color: #333;
            line-height: 1.4;
            margin: 0;
            padding: 0;
            background: white;
          }
          
          .header {
            text-align: center;
            margin-bottom: 40px;
            border-bottom: 3px solid #1a73e8;
            padding-bottom: 20px;
          }
          
          .logo {
            font-size: 24px;
            font-weight: bold;
            color: #1a73e8;
            margin-bottom: 10px;
          }
          
          .report-title {
            font-size: 28px;
            font-weight: bold;
            color: #333;
            margin: 10px 0;
          }
          
          .report-meta {
            font-size: 14px;
            color: #666;
            margin: 5px 0;
          }
          
          .executive-summary {
            background: linear-gradient(135deg, #f8f9fa 0%, #e9ecef 100%);
            border: 2px solid #1a73e8;
            border-radius: 12px;
            padding: 25px;
            margin: 30px 0;
            box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
          }
          
          .summary-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
            gap: 20px;
          }
          
          .summary-item {
            text-align: center;
            padding: 15px;
            background: white;
            border-radius: 8px;
            box-shadow: 0 2px 4px rgba(0, 0, 0, 0.05);
          }
          
          .summary-item.total {
            grid-column: span 2;
            background: #1a73e8;
            color: white;
          }
          
          .summary-label {
            font-size: 12px;
            font-weight: 600;
            text-transform: uppercase;
            letter-spacing: 0.5px;
            margin-bottom: 8px;
            opacity: 0.8;
          }
          
          .summary-item.total .summary-label {
            opacity: 1;
          }
          
          .summary-value {
            font-size: 20px;
            font-weight: bold;
          }
          
          .summary-item.total .summary-value {
            font-size: 24px;
          }
          
          .positive {
            color: #34a853;
          }
          
          .negative {
            color: #ea4335;
          }
          
          .section {
            margin: 30px 0;
            page-break-inside: avoid;
          }
          
          .section-title {
            font-size: 18px;
            font-weight: bold;
            color: #333;
            margin-bottom: 15px;
            padding-bottom: 8px;
            border-bottom: 2px solid #1a73e8;
          }
          
          .section-subtitle {
            font-size: 14px;
            color: #666;
            margin-bottom: 15px;
            font-style: italic;
          }
          
          .financial-table {
            width: 100%;
            border-collapse: collapse;
            margin: 15px 0;
          }
          
          .financial-table th {
            background: #1a73e8;
            color: white;
            padding: 12px;
            text-align: left;
            font-weight: 600;
            font-size: 14px;
          }
          
          .financial-table td {
            padding: 10px 12px;
            border-bottom: 1px solid #e0e0e0;
            font-size: 13px;
          }
          
          .line-item:hover {
            background: #f8f9fa;
          }
          
          .main-item {
            background: #f8f9fa;
            font-weight: 600;
          }
          
          .main-item td {
            padding-top: 15px;
            border-top: 2px solid #dee2e6;
          }
          
          .sub-item {
            font-size: 12px;
            color: #666;
          }
          
          .sub-label {
            padding-left: 25px;
          }
          
          .subtotal {
            background: #e9ecef;
            font-weight: 600;
          }
          
          .subtotal-label {
            font-weight: 600;
            padding-left: 15px;
          }
          
          .total-row {
            background: #1a73e8;
            color: white;
            font-weight: bold;
          }
          
          .total-row td {
            padding: 15px 12px;
            border: none;
          }
          
          .amount {
            text-align: right;
            font-family: 'Courier New', monospace;
            font-weight: 500;
          }
          
          .footer {
            margin-top: 50px;
            padding-top: 20px;
            border-top: 1px solid #ddd;
            text-align: center;
            font-size: 11px;
            color: #999;
          }
          
          .disclaimer {
            margin-top: 10px;
            font-size: 10px;
            font-style: italic;
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
        ${generateExecutiveSummary()}
        
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
}
