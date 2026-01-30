import React, { useState, useMemo } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, Share, Alert, Platform, TextInput, FlatList } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '../../theme/ThemeContext';
import { usePayments } from '../../context/PaymentContext';
import { useProperties } from '../../context/PropertyContext';
import { useTenants } from '../../context/TenantContext';
import { Button } from '../../components/Button';
import { Card } from '../../components/Card';
import { Modal } from '../../components/Modal';
import { Ionicons } from '@expo/vector-icons';
import { PDFExportService } from '../../services/pdfExportService';
import DateTimePicker from '@react-native-community/datetimepicker';

interface AssetItem {
    id: string;
    label: string;
    amount: number;
    transactions: Array<{
        date: string;
        description: string;
        amount: number;
    }>;
}

interface LiabilityItem {
    id: string;
    label: string;
    amount: number;
    transactions: Array<{
        date: string;
        description: string;
        amount: number;
    }>;
}

interface EquityItem {
    id: string;
    label: string;
    amount: number;
}

export const FinancialPositionScreen: React.FC<any> = ({ navigation }) => {
    const { colors, spacing, typography, borderRadius } = useTheme();
    const { payments } = usePayments();
    const { properties } = useProperties();

    const [selectedDate, setSelectedDate] = useState<'today' | 'month_end' | 'year_end' | 'custom'>('today');
    const [selectedProperty, setSelectedProperty] = useState<string>('all');
    const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set());
    const [showTransactionModal, setShowTransactionModal] = useState(false);
    const [selectedTransactions, setSelectedTransactions] = useState<any[]>([]);
    const [selectedLabel, setSelectedLabel] = useState<string>('');

    // Custom date state
    const [showCustomDateModal, setShowCustomDateModal] = useState(false);
    const [customDate, setCustomDate] = useState(new Date());
    const [showDatePicker, setShowDatePicker] = useState(false);

    // PDF Preview state
    const [showPdfPreview, setShowPdfPreview] = useState(false);
    const [pdfHtml, setPdfHtml] = useState('');

    // Get the display date based on selection
    const getDisplayDate = () => {
        const now = new Date();
        if (selectedDate === 'today') {
            return now;
        } else if (selectedDate === 'month_end') {
            return new Date(now.getFullYear(), now.getMonth() + 1, 0);
        } else if (selectedDate === 'year_end') {
            return new Date(now.getFullYear(), 11, 31);
        } else {
            return customDate;
        }
    };

    // Calculate date range for filtering
    const getDateRange = () => {
        const now = new Date();
        let startDate: Date;
        let endDate: Date;

        if (selectedDate === 'today') {
            startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
            endDate = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
        } else if (selectedDate === 'month_end') {
            startDate = new Date(now.getFullYear(), now.getMonth(), 1);
            endDate = new Date(now.getFullYear(), now.getMonth() + 1, 0);
        } else if (selectedDate === 'year_end') {
            startDate = new Date(now.getFullYear(), 0, 1);
            endDate = new Date(now.getFullYear(), 11, 31);
        } else {
            startDate = new Date(customDate.getFullYear(), customDate.getMonth(), 1);
            endDate = new Date(customDate.getFullYear(), customDate.getMonth() + 1, 0);
        }

        return { startDate, endDate };
    };

    const { startDate, endDate } = getDateRange();

    const displayDate = getDisplayDate();

    const formatDisplayDate = () => {
        return displayDate.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
    };

    // Calculate assets
    const assetsData: AssetItem[] = useMemo(() => {
        // Filter payments by date range and property
        const filteredPayments = payments.filter(p => {
            const paymentDate = new Date(p.paymentDate);
            const inDateRange = paymentDate >= startDate && paymentDate <= endDate;
            const inProperty = selectedProperty === 'all' || p.propertyId === selectedProperty;
            return inDateRange && inProperty;
        });

        const cashOnHand = filteredPayments.reduce((sum, p) => sum + p.amount, 0);
        return [
            {
                id: 'cash-1',
                label: 'Cash on Hand',
                amount: cashOnHand,
                transactions: filteredPayments.slice(0, 5).map(p => ({
                    date: new Date(p.paymentDate).toLocaleDateString(),
                    description: `Payment received - ${p.paymentMethod}`,
                    amount: p.amount,
                })),
            },
            {
                id: 'receivable-1',
                label: 'Rent Receivable',
                amount: 450000,
                transactions: [
                    { date: 'Jan 20, 2026', description: 'Outstanding from Unit 301', amount: 300000 },
                    { date: 'Jan 15, 2026', description: 'Outstanding from Unit 105', amount: 150000 },
                ],
            },
            {
                id: 'property-1',
                label: 'Property Value',
                amount: 50000000,
                transactions: [
                    { date: 'Jan 1, 2026', description: 'Sunset Apartments valuation', amount: 30000000 },
                    { date: 'Jan 1, 2026', description: 'Kololo Heights valuation', amount: 20000000 },
                ],
            },
            {
                id: 'prepaid-1',
                label: 'Prepaid Expenses',
                amount: 200000,
                transactions: [
                    { date: 'Jan 10, 2026', description: 'Insurance premium (6 months)', amount: 200000 },
                ],
            },
        ];
    }, [payments, startDate, endDate, selectedProperty]);

    // Calculate liabilities filtered by date range and property
    const liabilitiesData: LiabilityItem[] = useMemo(() => {
        // Create mock liability transactions that can be filtered
        const allLiabilityTransactions = [
            { date: new Date('2026-01-18'), description: 'Electricity bill - Sunset Apartments', propertyId: 'sunset', property: 'Sunset Apartments', amount: 130000, category: 'bills' },
            { date: new Date('2026-01-15'), description: 'Water bill - Kololo Heights', propertyId: 'kololo', property: 'Kololo Heights', amount: 150000, category: 'bills' },
            { date: new Date('2026-01-20'), description: 'Internet service', propertyId: 'all', property: 'All Properties', amount: 40000, category: 'bills' },
            { date: new Date('2025-12-01'), description: 'Security deposit - Jane Doe (Unit 101)', propertyId: 'sunset', property: 'Sunset Apartments', amount: 600000, category: 'deposits' },
            { date: new Date('2025-12-05'), description: 'Security deposit - Sarah Johnson (Unit 204)', propertyId: 'kololo', property: 'Kololo Heights', amount: 600000, category: 'deposits' },
            { date: new Date('2025-11-01'), description: 'Property development loan', propertyId: 'all', property: 'All Properties', amount: 5000000, category: 'loans' },
            { date: new Date('2025-12-18'), description: 'Gas bill - Sunset Apartments', propertyId: 'sunset', property: 'Sunset Apartments', amount: 80000, category: 'bills' },
            { date: new Date('2025-12-15'), description: 'Security deposit - Mike Wilson (Unit 305)', propertyId: 'kololo', property: 'Kololo Heights', amount: 600000, category: 'deposits' },
        ];

        // Filter liability transactions by date range and property
        const filteredLiabilities = allLiabilityTransactions.filter(liability => {
            const inDateRange = liability.date >= startDate && liability.date <= endDate;
            const inProperty = selectedProperty === 'all' || liability.propertyId === selectedProperty;
            return inDateRange && inProperty;
        });

        // Group liabilities by category
        const liabilitiesByCategory = filteredLiabilities.reduce((acc, liability) => {
            if (!acc[liability.category]) {
                acc[liability.category] = {
                    label: liability.category === 'bills' ? 'Outstanding Bills' :
                        liability.category === 'deposits' ? 'Tenant Security Deposits' :
                            'Loans & Advances',
                    amount: 0,
                    transactions: []
                };
            }
            acc[liability.category].amount += liability.amount;
            acc[liability.category].transactions.push({
                date: liability.date.toLocaleDateString(),
                description: liability.description,
                amount: liability.amount,
            });
            return acc;
        }, {} as Record<string, { label: string; amount: number; transactions: any[] }>);

        // Convert to expected format
        return Object.entries(liabilitiesByCategory).map(([category, data], index) => ({
            id: `${category}-1`,
            label: data.label,
            amount: data.amount,
            transactions: data.transactions,
        }));
    }, [startDate, endDate, selectedProperty]);

    // Calculate equity based on current period
    const equityData: EquityItem[] = useMemo(() => {
        // Base equity amounts that can be adjusted based on performance
        const baseOwnerEquity = 40000000;
        const baseRetainedEarnings = 3500000;

        // Adjust retained earnings based on current period performance
        const currentPeriodPerformance = assetsData.reduce((sum, item) => sum + item.amount, 0) -
            liabilitiesData.reduce((sum, item) => sum + item.amount, 0) -
            baseOwnerEquity;

        const adjustedRetainedEarnings = Math.max(0, baseRetainedEarnings + currentPeriodPerformance * 0.1);

        return [
            {
                id: 'owner-1',
                label: "Owner's Equity",
                amount: baseOwnerEquity,
            },
            {
                id: 'retained-1',
                label: 'Retained Earnings',
                amount: Math.round(adjustedRetainedEarnings),
            },
        ];
    }, [assetsData, liabilitiesData]);

    const totalAssets = assetsData.reduce((sum, item) => sum + item.amount, 0);
    const totalLiabilities = liabilitiesData.reduce((sum, item) => sum + item.amount, 0);
    const totalEquity = equityData.reduce((sum, item) => sum + item.amount, 0);

    const isBalanced = totalAssets === totalLiabilities + totalEquity;
    const difference = totalAssets - (totalLiabilities + totalEquity);

    const toggleSection = (sectionId: string) => {
        const newSet = new Set(expandedSections);
        if (newSet.has(sectionId)) {
            newSet.delete(sectionId);
        } else {
            newSet.add(sectionId);
        }
        setExpandedSections(newSet);
    };

    const handleViewTransactions = (label: string, transactions: any[]) => {
        setSelectedLabel(label);
        setSelectedTransactions(transactions);
        setShowTransactionModal(true);
    };

    const handleDateSelect = (date: 'today' | 'month_end' | 'year_end' | 'custom') => {
        if (date === 'custom') {
            setShowCustomDateModal(true);
        }
        setSelectedDate(date);
    };

    const handleCustomDateChange = (event: any, selectedDate?: Date) => {
        setShowDatePicker(false);
        if (event.type !== 'dismissed' && selectedDate) {
            setCustomDate(selectedDate);
            // Auto-close modal when date is selected
            setShowCustomDateModal(false);
        }
    };

    const generatePdfHtml = () => {
        const html = `
            <!DOCTYPE html>
            <html>
            <head>
                <meta charset="utf-8">
                <title>Statement of Financial Position</title>
                <style>
                    body { font-family: Arial, sans-serif; padding: 40px; color: #333; }
                    .header { text-align: center; margin-bottom: 30px; border-bottom: 2px solid #1a73e8; padding-bottom: 20px; }
                    .header h1 { color: #1a73e8; margin: 0; font-size: 24px; }
                    .header p { color: #666; margin: 10px 0 0; }
                    .date { background: #f5f5f5; padding: 15px; border-radius: 8px; margin-bottom: 30px; text-align: center; }
                    .section { margin-bottom: 30px; }
                    .section-title { font-size: 18px; font-weight: bold; color: #333; margin-bottom: 15px; padding-bottom: 10px; border-bottom: 1px solid #ddd; }
                    .line-item { display: flex; justify-content: space-between; padding: 10px 0; border-bottom: 1px solid #eee; }
                    .total-row { background: #f9f9f9; padding: 15px; font-weight: bold; font-size: 16px; display: flex; justify-content: space-between; border-radius: 8px; margin-top: 10px; }
                    .assets-total { color: #1a73e8; }
                    .liabilities-total { color: #f9a825; }
                    .equity-total { color: #34a853; }
                    .balance-check { background: ${isBalanced ? '#e8f5e9' : '#ffebee'}; border: 2px solid ${isBalanced ? '#34a853' : '#ea4335'}; padding: 20px; text-align: center; border-radius: 12px; margin-top: 30px; }
                    .balance-check h2 { margin: 0; font-size: 24px; color: ${isBalanced ? '#34a853' : '#ea4335'}; }
                    .footer { margin-top: 40px; text-align: center; color: #999; font-size: 12px; border-top: 1px solid #ddd; padding-top: 20px; }
                </style>
            </head>
            <body>
                <div class="header">
                    <h1>Statement of Financial Position</h1>
                    <p>EstateNet Property Management</p>
                </div>
                
                <div class="date">
                    <strong>As at:</strong> ${formatDisplayDate()}
                </div>
                
                <div class="section">
                    <div class="section-title">Assets</div>
                    ${assetsData.map(item => `
                        <div class="line-item">
                            <span>${item.label}</span>
                            <span>UGX ${item.amount.toLocaleString()}</span>
                        </div>
                    `).join('')}
                    <div class="total-row assets-total">
                        <span>Total Assets</span>
                        <span>UGX ${totalAssets.toLocaleString()}</span>
                    </div>
                </div>
                
                <div class="section">
                    <div class="section-title">Liabilities</div>
                    ${liabilitiesData.map(item => `
                        <div class="line-item">
                            <span>${item.label}</span>
                            <span>UGX ${item.amount.toLocaleString()}</span>
                        </div>
                    `).join('')}
                    <div class="total-row liabilities-total">
                        <span>Total Liabilities</span>
                        <span>UGX ${totalLiabilities.toLocaleString()}</span>
                    </div>
                </div>
                
                <div class="section">
                    <div class="section-title">Equity</div>
                    ${equityData.map(item => `
                        <div class="line-item">
                            <span>${item.label}</span>
                            <span>UGX ${item.amount.toLocaleString()}</span>
                        </div>
                    `).join('')}
                    <div class="total-row equity-total">
                        <span>Total Equity</span>
                        <span>UGX ${totalEquity.toLocaleString()}</span>
                    </div>
                </div>
                
                <div class="balance-check">
                    <p>${isBalanced ? 'Balance Verified ✓' : 'Balance Alert ✗'}</p>
                    <p>Assets: UGX ${totalAssets.toLocaleString()}</p>
                    <p>Liabilities + Equity: UGX ${(totalLiabilities + totalEquity).toLocaleString()}</p>
                </div>
                
                <div class="footer">
                    <p>Generated on ${new Date().toLocaleDateString()} by EstateNet</p>
                </div>
            </body>
            </html>
        `;
        return html;
    };

    const handleExportPDF = async () => {
        try {
            const propertyName = selectedProperty === 'all' ? 'All Properties' :
                properties.find(p => p.id === selectedProperty)?.name || 'Unknown Property';

            const reportData = PDFExportService.createFinancialPositionData(
                propertyName,
                formatDisplayDate(),
                assetsData,
                liabilitiesData,
                equityData
            );

            await PDFExportService.generateFinancialPDF(reportData);
        } catch (error) {
            Alert.alert('Export Failed', 'Failed to generate PDF. Please try again.');
        }
    };


    return (
        <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }}>
            <ScrollView showsVerticalScrollIndicator={false}>
                {/* Header */}
                <View style={{ paddingHorizontal: spacing.lg, paddingVertical: spacing.lg }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: spacing.lg }}>
                        <TouchableOpacity
                            onPress={() => navigation.goBack()}
                            style={{ marginRight: spacing.md }}
                        >
                            <Ionicons name="arrow-back" size={24} color={colors.text} />
                        </TouchableOpacity>
                        <View style={{ flex: 1 }}>
                            <Text style={[typography.h2, { color: colors.text }]}>
                                Statement of Financial Position
                            </Text>
                            <Text style={[typography.bodySmall, { color: colors.textSecondary, marginTop: spacing.xs }]}>
                                Balance sheet as at {new Date().toLocaleDateString()}
                            </Text>
                        </View>
                    </View>
                </View>

                {/* Balance Status */}
                {!isBalanced && (
                    <View style={{ paddingHorizontal: spacing.lg, marginBottom: spacing.lg }}>
                        <View
                            style={{
                                backgroundColor: colors.warning + '15',
                                borderLeftWidth: 4,
                                borderLeftColor: colors.warning,
                                paddingVertical: spacing.md,
                                paddingHorizontal: spacing.lg,
                                borderRadius: borderRadius.md,
                                flexDirection: 'row',
                                alignItems: 'center',
                                gap: spacing.md,
                            }}
                        >
                            <Ionicons name="alert-circle" size={24} color={colors.warning} />
                            <View style={{ flex: 1 }}>
                                <Text style={[typography.bodySmall, { color: colors.text, fontWeight: '600' }]}>
                                    Balance Alert
                                </Text>
                                <Text style={[typography.bodySmall, { color: colors.textSecondary, marginTop: spacing.xs }]}>
                                    Difference: UGX {Math.abs(difference).toLocaleString()}
                                </Text>
                            </View>
                        </View>
                    </View>
                )}

                {/* Filters */}
                <View style={{ paddingHorizontal: spacing.lg, marginBottom: spacing.lg }}>
                    <View>
                        <Text style={[typography.bodySmall, { color: colors.textSecondary, marginBottom: spacing.sm }]}>
                            As at
                        </Text>
                        <View style={{ flexDirection: 'row', gap: spacing.sm, flexWrap: 'wrap' }}>
                            {(['today', 'month_end', 'year_end', 'custom'] as const).map(date => (
                                <TouchableOpacity
                                    key={date}
                                    onPress={() => handleDateSelect(date)}
                                    style={{
                                        flex: date === 'custom' ? 0 : 1,
                                        minWidth: date === 'custom' ? '100%' : undefined,
                                        paddingVertical: spacing.sm,
                                        paddingHorizontal: spacing.md,
                                        borderRadius: borderRadius.md,
                                        backgroundColor: selectedDate === date ? colors.primary : colors.surface,
                                        borderWidth: 1,
                                        borderColor: selectedDate === date ? colors.primary : colors.border,
                                        marginTop: date === 'custom' ? spacing.sm : 0,
                                    }}
                                >
                                    <Text
                                        style={[
                                            typography.bodySmall,
                                            {
                                                color: selectedDate === date ? '#FFFFFF' : colors.text,
                                                textAlign: 'center',
                                                fontWeight: '600',
                                            },
                                        ]}
                                    >
                                        {date === 'today' ? 'Today' : date === 'month_end' ? 'Month End' : date === 'year_end' ? 'Year End' : 'Custom Date'}
                                    </Text>
                                </TouchableOpacity>
                            ))}
                        </View>
                        {/* Show selected date */}
                        <View style={{ marginTop: spacing.sm, backgroundColor: colors.surface, padding: spacing.sm, borderRadius: borderRadius.sm }}>
                            <Text style={[typography.bodySmall, { color: colors.textSecondary, textAlign: 'center' }]}>
                                {formatDisplayDate()}
                            </Text>
                        </View>
                    </View>

                    {/* Property Filter */}
                    <View style={{ marginTop: spacing.md }}>
                        <Text style={[typography.bodySmall, { color: colors.textSecondary, marginBottom: spacing.sm }]}>
                            Property
                        </Text>
                        <FlatList
                            horizontal
                            showsHorizontalScrollIndicator={false}
                            data={[{ id: 'all', name: 'All' }, ...properties]}
                            keyExtractor={(item) => item.id}
                            renderItem={({ item }) => (
                                <TouchableOpacity
                                    onPress={() => setSelectedProperty(item.id)}
                                    style={{
                                        paddingVertical: spacing.sm,
                                        paddingHorizontal: spacing.lg,
                                        borderRadius: borderRadius.md,
                                        backgroundColor: selectedProperty === item.id ? colors.primary : colors.surface,
                                        borderWidth: 1,
                                        borderColor: selectedProperty === item.id ? colors.primary : colors.border,
                                        marginRight: spacing.sm,
                                    }}
                                >
                                    <Text
                                        style={[
                                            typography.bodySmall,
                                            {
                                                color: selectedProperty === item.id ? '#FFFFFF' : colors.text,
                                                textAlign: 'center',
                                                fontWeight: '600',
                                            },
                                        ]}
                                        numberOfLines={1}
                                    >
                                        {item.id === 'all' ? 'All' : item.name.split(' ')[0]}
                                    </Text>
                                </TouchableOpacity>
                            )}
                            scrollEnabled={true}
                            contentContainerStyle={{ paddingHorizontal: spacing.lg - spacing.sm }}
                        />
                    </View>
                </View>

                {/* Assets Section */}
                <View style={{ paddingHorizontal: spacing.lg, marginBottom: spacing.lg }}>
                    <View
                        style={{
                            backgroundColor: colors.info + '10',
                            borderLeftWidth: 4,
                            borderLeftColor: colors.info,
                            paddingVertical: spacing.md,
                            paddingHorizontal: spacing.lg,
                            borderRadius: borderRadius.md,
                            marginBottom: spacing.lg,
                        }}
                    >
                        <Text style={[typography.bodySmall, { color: colors.textSecondary, marginBottom: spacing.xs }]}>
                            TOTAL ASSETS
                        </Text>
                        <Text style={[typography.h2, { color: colors.info, fontWeight: '700' }]}>
                            UGX {totalAssets.toLocaleString()}
                        </Text>
                    </View>

                    {assetsData.map(item => (
                        <View key={item.id} style={{ marginBottom: spacing.md }}>
                            <TouchableOpacity
                                onPress={() => toggleSection(item.id)}
                                style={{
                                    backgroundColor: colors.surface,
                                    borderWidth: 1,
                                    borderColor: colors.border,
                                    borderRadius: borderRadius.md,
                                    padding: spacing.md,
                                    flexDirection: 'row',
                                    justifyContent: 'space-between',
                                    alignItems: 'center',
                                }}
                            >
                                <View style={{ flex: 1 }}>
                                    <Text style={[typography.body, { color: colors.text, fontWeight: '600' }]}>
                                        {item.label}
                                    </Text>
                                </View>
                                <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.md }}>
                                    <Text style={[typography.h4, { color: colors.info, fontWeight: '700' }]}>
                                        UGX {item.amount.toLocaleString()}
                                    </Text>
                                    <Ionicons
                                        name={expandedSections.has(item.id) ? 'chevron-up' : 'chevron-down'}
                                        size={20}
                                        color={colors.textSecondary}
                                    />
                                </View>
                            </TouchableOpacity>

                            {expandedSections.has(item.id) && item.transactions.length > 0 && (
                                <View style={{ marginTop: spacing.sm }}>
                                    {item.transactions.slice(0, 3).map((txn: any, idx) => (
                                        <View
                                            key={idx}
                                            style={{
                                                backgroundColor: colors.surface,
                                                borderLeftWidth: 2,
                                                borderLeftColor: colors.info,
                                                paddingVertical: spacing.sm,
                                                paddingHorizontal: spacing.md,
                                                marginTop: spacing.xs,
                                                borderRadius: borderRadius.sm,
                                            }}
                                        >
                                            <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: spacing.xs }}>
                                                <Text style={[typography.bodySmall, { color: colors.text, fontWeight: '500', flex: 1 }]}>
                                                    {txn.description}
                                                </Text>
                                                <Text style={[typography.bodySmall, { color: colors.info, fontWeight: '600' }]}>
                                                    UGX {txn.amount.toLocaleString()}
                                                </Text>
                                            </View>
                                            <Text style={[typography.bodySmall, { color: colors.textSecondary, fontSize: 11 }]}>
                                                {txn.date}
                                            </Text>
                                        </View>
                                    ))}
                                    {item.transactions.length > 3 && (
                                        <TouchableOpacity
                                            onPress={() => handleViewTransactions(item.label, item.transactions)}
                                            style={{ marginTop: spacing.sm }}
                                        >
                                            <Text style={[typography.bodySmall, { color: colors.primary, fontWeight: '600' }]}>
                                                View all {item.transactions.length} items →
                                            </Text>
                                        </TouchableOpacity>
                                    )}
                                </View>
                            )}
                        </View>
                    ))}
                </View>

                {/* Liabilities Section */}
                <View style={{ paddingHorizontal: spacing.lg, marginBottom: spacing.lg }}>
                    <View
                        style={{
                            backgroundColor: colors.warning + '10',
                            borderLeftWidth: 4,
                            borderLeftColor: colors.warning,
                            paddingVertical: spacing.md,
                            paddingHorizontal: spacing.lg,
                            borderRadius: borderRadius.md,
                            marginBottom: spacing.lg,
                        }}
                    >
                        <Text style={[typography.bodySmall, { color: colors.textSecondary, marginBottom: spacing.xs }]}>
                            TOTAL LIABILITIES
                        </Text>
                        <Text style={[typography.h2, { color: colors.warning, fontWeight: '700' }]}>
                            UGX {totalLiabilities.toLocaleString()}
                        </Text>
                    </View>

                    {liabilitiesData.map(item => (
                        <View key={item.id} style={{ marginBottom: spacing.md }}>
                            <TouchableOpacity
                                onPress={() => toggleSection(item.id)}
                                style={{
                                    backgroundColor: colors.surface,
                                    borderWidth: 1,
                                    borderColor: colors.border,
                                    borderRadius: borderRadius.md,
                                    padding: spacing.md,
                                    flexDirection: 'row',
                                    justifyContent: 'space-between',
                                    alignItems: 'center',
                                }}
                            >
                                <View style={{ flex: 1 }}>
                                    <Text style={[typography.body, { color: colors.text, fontWeight: '600' }]}>
                                        {item.label}
                                    </Text>
                                </View>
                                <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.md }}>
                                    <Text style={[typography.h4, { color: colors.warning, fontWeight: '700' }]}>
                                        UGX {item.amount.toLocaleString()}
                                    </Text>
                                    <Ionicons
                                        name={expandedSections.has(item.id) ? 'chevron-up' : 'chevron-down'}
                                        size={20}
                                        color={colors.textSecondary}
                                    />
                                </View>
                            </TouchableOpacity>

                            {expandedSections.has(item.id) && item.transactions.length > 0 && (
                                <View style={{ marginTop: spacing.sm }}>
                                    {item.transactions.slice(0, 3).map((txn: any, idx) => (
                                        <View
                                            key={idx}
                                            style={{
                                                backgroundColor: colors.surface,
                                                borderLeftWidth: 2,
                                                borderLeftColor: colors.warning,
                                                paddingVertical: spacing.sm,
                                                paddingHorizontal: spacing.md,
                                                marginTop: spacing.xs,
                                                borderRadius: borderRadius.sm,
                                            }}
                                        >
                                            <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: spacing.xs }}>
                                                <Text style={[typography.bodySmall, { color: colors.text, fontWeight: '500', flex: 1 }]}>
                                                    {txn.description}
                                                </Text>
                                                <Text style={[typography.bodySmall, { color: colors.warning, fontWeight: '600' }]}>
                                                    UGX {txn.amount.toLocaleString()}
                                                </Text>
                                            </View>
                                            <Text style={[typography.bodySmall, { color: colors.textSecondary, fontSize: 11 }]}>
                                                {txn.date}
                                            </Text>
                                        </View>
                                    ))}
                                    {item.transactions.length > 3 && (
                                        <TouchableOpacity
                                            onPress={() => handleViewTransactions(item.label, item.transactions)}
                                            style={{ marginTop: spacing.sm }}
                                        >
                                            <Text style={[typography.bodySmall, { color: colors.primary, fontWeight: '600' }]}>
                                                View all {item.transactions.length} items →
                                            </Text>
                                        </TouchableOpacity>
                                    )}
                                </View>
                            )}
                        </View>
                    ))}
                </View>

                {/* Equity Section */}
                <View style={{ paddingHorizontal: spacing.lg, marginBottom: spacing.lg }}>
                    <View
                        style={{
                            backgroundColor: colors.success + '10',
                            borderLeftWidth: 4,
                            borderLeftColor: colors.success,
                            paddingVertical: spacing.md,
                            paddingHorizontal: spacing.lg,
                            borderRadius: borderRadius.md,
                            marginBottom: spacing.lg,
                        }}
                    >
                        <Text style={[typography.bodySmall, { color: colors.textSecondary, marginBottom: spacing.xs }]}>
                            TOTAL EQUITY
                        </Text>
                        <Text style={[typography.h2, { color: colors.success, fontWeight: '700' }]}>
                            UGX {totalEquity.toLocaleString()}
                        </Text>
                    </View>

                    {equityData.map(item => (
                        <View
                            key={item.id}
                            style={{
                                backgroundColor: colors.surface,
                                borderWidth: 1,
                                borderColor: colors.border,
                                borderRadius: borderRadius.md,
                                padding: spacing.md,
                                marginBottom: spacing.md,
                                flexDirection: 'row',
                                justifyContent: 'space-between',
                                alignItems: 'center',
                            }}
                        >
                            <Text style={[typography.body, { color: colors.text, fontWeight: '600' }]}>
                                {item.label}
                            </Text>
                            <Text style={[typography.h4, { color: colors.success, fontWeight: '700' }]}>
                                UGX {item.amount.toLocaleString()}
                            </Text>
                        </View>
                    ))}
                </View>

                {/* Balance Verification */}
                <View style={{ paddingHorizontal: spacing.lg, marginBottom: spacing.xl }}>
                    <View
                        style={{
                            backgroundColor: isBalanced ? colors.success + '15' : colors.error + '15',
                            borderWidth: 2,
                            borderColor: isBalanced ? colors.success : colors.error,
                            borderRadius: borderRadius.lg,
                            paddingVertical: spacing.lg,
                            paddingHorizontal: spacing.lg,
                        }}
                    >
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.md, marginBottom: spacing.md }}>
                            <Ionicons
                                name={isBalanced ? 'checkmark-circle' : 'close-circle'}
                                size={24}
                                color={isBalanced ? colors.success : colors.error}
                            />
                            <Text style={[typography.body, { color: colors.text, fontWeight: '600', flex: 1 }]}>
                                {isBalanced ? 'Balance Verified' : 'Balance Alert'}
                            </Text>
                        </View>
                        <Text style={[typography.bodySmall, { color: colors.textSecondary }]}>
                            Assets: UGX {totalAssets.toLocaleString()}
                        </Text>
                        <Text style={[typography.bodySmall, { color: colors.textSecondary, marginTop: spacing.xs }]}>
                            Liabilities + Equity: UGX {(totalLiabilities + totalEquity).toLocaleString()}
                        </Text>
                    </View>
                </View>

                {/* Export */}
                <View style={{ paddingHorizontal: spacing.lg, marginBottom: spacing.xl }}>
                    <Button
                        title="Export as PDF"
                        onPress={handleExportPDF}
                        variant="outline"
                        icon={<Ionicons name="document-outline" size={16} color={colors.primary} />}
                    />
                </View>
            </ScrollView>

            {/* Transactions Modal */}
            <Modal
                visible={showTransactionModal}
                onClose={() => setShowTransactionModal(false)}
                title={`${selectedLabel} Details`}
                size="large"
            >
                <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: spacing.lg }}>
                    {selectedTransactions.map((txn, idx) => (
                        <View
                            key={idx}
                            style={{
                                backgroundColor: colors.surface,
                                borderWidth: 1,
                                borderColor: colors.border,
                                borderRadius: borderRadius.md,
                                padding: spacing.md,
                                marginBottom: spacing.sm,
                            }}
                        >
                            <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: spacing.sm }}>
                                <Text style={[typography.body, { color: colors.text, fontWeight: '600', flex: 1 }]}>
                                    {txn.description}
                                </Text>
                                <Text style={[typography.body, { color: colors.text, fontWeight: '700' }]}>
                                    UGX {txn.amount.toLocaleString()}
                                </Text>
                            </View>
                            <Text style={[typography.bodySmall, { color: colors.textSecondary }]}>
                                {txn.date}
                            </Text>
                        </View>
                    ))}
                </ScrollView>
            </Modal>

            {/* Custom Date Modal */}
            <Modal
                visible={showCustomDateModal}
                onClose={() => setShowCustomDateModal(false)}
                title="Select Custom Date"
                size="medium"
            >
                <View style={{ paddingBottom: spacing.lg }}>
                    <Text style={[typography.body, { color: colors.text, fontWeight: '600', marginBottom: spacing.sm }]}>
                        Select Date
                    </Text>
                    <TouchableOpacity
                        onPress={() => setShowDatePicker(true)}
                        style={{
                            backgroundColor: colors.surface,
                            borderWidth: 1,
                            borderColor: colors.border,
                            borderRadius: borderRadius.md,
                            padding: spacing.md,
                            flexDirection: 'row',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                            marginBottom: spacing.lg,
                        }}
                    >
                        <Text style={[typography.body, { color: colors.text }]}>
                            {customDate.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
                        </Text>
                        <Ionicons name="calendar-outline" size={20} color={colors.primary} />
                    </TouchableOpacity>
                    <Button
                        title="Apply Date"
                        onPress={() => setShowCustomDateModal(false)}
                        variant="primary"
                    />
                </View>
            </Modal>

            {/* Date Picker - Rendered outside modal for proper display */}
            {showDatePicker && (
                <DateTimePicker
                    value={customDate}
                    mode="date"
                    display="default"
                    onChange={handleCustomDateChange}
                    maximumDate={new Date()}
                />
            )}

            {/* PDF Preview Modal - Summary View */}
            <Modal
                visible={showPdfPreview}
                onClose={() => setShowPdfPreview(false)}
                title="Export Preview"
                size="medium"
            >
                <View style={{ flex: 1 }}>
                    <View style={{ backgroundColor: colors.surface, padding: spacing.lg, borderRadius: borderRadius.md, borderWidth: 1, borderColor: colors.border }}>
                        {/* Header */}
                        <View style={{ alignItems: 'center', marginBottom: spacing.lg, paddingBottom: spacing.md, borderBottomWidth: 1, borderBottomColor: colors.border }}>
                            <Ionicons name="document-text" size={40} color={colors.primary} />
                            <Text style={[typography.h3, { color: colors.text, marginTop: spacing.sm }]}>Balance Sheet</Text>
                            <Text style={[typography.bodySmall, { color: colors.textSecondary }]}>
                                As at: {formatDisplayDate()}
                            </Text>
                        </View>

                        {/* Summary */}
                        <View style={{ gap: spacing.md }}>
                            <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                                <Text style={[typography.body, { color: colors.text }]}>Total Assets</Text>
                                <Text style={[typography.body, { color: colors.info, fontWeight: '700' }]}>UGX {totalAssets.toLocaleString()}</Text>
                            </View>
                            <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                                <Text style={[typography.body, { color: colors.text }]}>Total Liabilities</Text>
                                <Text style={[typography.body, { color: colors.warning, fontWeight: '700' }]}>UGX {totalLiabilities.toLocaleString()}</Text>
                            </View>
                            <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                                <Text style={[typography.body, { color: colors.text }]}>Total Equity</Text>
                                <Text style={[typography.body, { color: colors.success, fontWeight: '700' }]}>UGX {totalEquity.toLocaleString()}</Text>
                            </View>
                            <View style={{ height: 1, backgroundColor: colors.border }} />
                            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                                <Text style={[typography.body, { color: colors.text }]}>Balance Status</Text>
                                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                                    <Ionicons name={isBalanced ? 'checkmark-circle' : 'alert-circle'} size={16} color={isBalanced ? colors.success : colors.error} />
                                    <Text style={[typography.body, { color: isBalanced ? colors.success : colors.error, fontWeight: '600' }]}>
                                        {isBalanced ? 'Balanced' : 'Unbalanced'}
                                    </Text>
                                </View>
                            </View>
                        </View>

                        {/* File Info */}
                        <View style={{ marginTop: spacing.lg, padding: spacing.md, backgroundColor: colors.background, borderRadius: borderRadius.sm }}>
                            <Text style={[typography.bodySmall, { color: colors.textSecondary, textAlign: 'center' }]}>
                                PDF will include detailed breakdown of all assets, liabilities, and equity
                            </Text>
                        </View>
                    </View>

                    {/* Action Buttons */}
                    <View style={{ marginTop: spacing.lg, gap: spacing.sm }}>
                        <Button
                            title="Export PDF"
                            onPress={handleExportPDF}
                            variant="primary"
                            icon={<Ionicons name="document-text-outline" size={16} color="#FFFFFF" />}
                        />
                        <Button
                            title="Cancel"
                            onPress={() => setShowPdfPreview(false)}
                            variant="outline"
                        />
                    </View>
                </View>
            </Modal>
        </SafeAreaView>
    );
};
