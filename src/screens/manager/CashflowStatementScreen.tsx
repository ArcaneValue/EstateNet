import React, { useState, useMemo } from 'react';
import { View, Text, ScrollView, TouchableOpacity, Alert, Platform, FlatList } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '../../theme/ThemeContext';
import { usePayments } from '../../context/PaymentContext';
import { useProperties } from '../../context/PropertyContext';
import { useTenants } from '../../context/TenantContext';
import { Button } from '../../components/Button';
import { Modal } from '../../components/Modal';
import { Ionicons } from '@expo/vector-icons';
import { PDFExportService } from '../../services/pdfExportService';
import DateTimePicker from '@react-native-community/datetimepicker';

interface CashflowItem {
    id: string;
    label: string;
    amount: number;
    transactions: Array<{
        date: string;
        description: string;
        amount: number;
    }>;
}

export const CashflowStatementScreen: React.FC<any> = ({ navigation }) => {
    const { colors, spacing, typography, borderRadius } = useTheme();
    const { payments } = usePayments();
    const { properties } = useProperties();
    const { getTenantByTenantId } = useTenants();

    const [dateRange, setDateRange] = useState<'this_month' | 'last_month' | 'custom'>('this_month');
    const [selectedProperty, setSelectedProperty] = useState<string>('all');
    const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set());
    const [showTransactionModal, setShowTransactionModal] = useState(false);
    const [selectedTransactions, setSelectedTransactions] = useState<any[]>([]);
    const [selectedLabel, setSelectedLabel] = useState<string>('');

    // Custom date range state
    const [showCustomDateModal, setShowCustomDateModal] = useState(false);
    const [customStartDate, setCustomStartDate] = useState(new Date());
    const [customEndDate, setCustomEndDate] = useState(new Date());
    const [showStartPicker, setShowStartPicker] = useState(false);
    const [showEndPicker, setShowEndPicker] = useState(false);

    // PDF Preview state
    const [showPdfPreview, setShowPdfPreview] = useState(false);
    const [pdfHtml, setPdfHtml] = useState('');

    // Calculate date range based on selection
    const getDateRange = () => {
        const now = new Date();
        let startDate: Date;
        let endDate: Date;

        if (dateRange === 'this_month') {
            startDate = new Date(now.getFullYear(), now.getMonth(), 1);
            endDate = new Date(now.getFullYear(), now.getMonth() + 1, 0);
        } else if (dateRange === 'last_month') {
            startDate = new Date(now.getFullYear(), now.getMonth() - 1, 1);
            endDate = new Date(now.getFullYear(), now.getMonth(), 0);
        } else {
            startDate = customStartDate;
            endDate = customEndDate;
        }

        return { startDate, endDate };
    };

    const { startDate, endDate } = getDateRange();

    const formatDateRange = () => {
        const options: Intl.DateTimeFormatOptions = { month: 'short', day: 'numeric', year: 'numeric' };
        return `${startDate.toLocaleDateString('en-US', options)} - ${endDate.toLocaleDateString('en-US', options)}`;
    };

    // Operating Activities
    const operatingActivities: CashflowItem[] = useMemo(() => {
        // Filter payments by date range and property
        const filteredPayments = payments.filter(p => {
            const paymentDate = new Date(p.paymentDate);
            const inDateRange = paymentDate >= startDate && paymentDate <= endDate;
            const inProperty = selectedProperty === 'all' || p.propertyId === selectedProperty;
            return inDateRange && inProperty;
        });

        const rentReceived = filteredPayments.reduce((sum, p) => sum + p.amount, 0);
        return [
            {
                id: 'rent-1',
                label: 'Rent Received',
                amount: rentReceived,
                transactions: filteredPayments.slice(0, 5).map(p => ({
                    date: new Date(p.paymentDate).toLocaleDateString(),
                    description: `Rent from ${getTenantByTenantId(p.tenantId)?.name || `Tenant ID: ${p.tenantId}`} - ${properties.find(prop => prop.id === p.propertyId)?.name || 'N/A'} (${p.unitId || 'N/A'})`,
                    amount: p.amount,
                })),
            },
            {
                id: 'maintenance-paid',
                label: 'Maintenance Payments',
                amount: -450000,
                transactions: [
                    { date: 'Jan 15, 2026', description: 'Roof inspection', amount: -150000 },
                    { date: 'Jan 18, 2026', description: 'Door repairs', amount: -300000 },
                ],
            },
            {
                id: 'utilities-paid',
                label: 'Utilities Paid',
                amount: -280000,
                transactions: [
                    { date: 'Jan 5, 2026', description: 'Water bill', amount: -150000 },
                    { date: 'Jan 8, 2026', description: 'Electricity bill', amount: -130000 },
                ],
            },
            {
                id: 'mgmt-fees-paid',
                label: 'Management Fees Paid',
                amount: -200000,
                transactions: [
                    { date: 'Jan 1, 2026', description: 'Monthly management fee', amount: -200000 },
                ],
            },
        ];
    }, [payments, properties, getTenantByTenantId, startDate, endDate, selectedProperty]);

    // Calculate investing activities filtered by date range and property
    const investingActivities: CashflowItem[] = useMemo(() => {
        // Create mock investing transactions that can be filtered
        const allInvestingTransactions = [
            { date: new Date('2026-01-10'), description: 'Unit renovation - Sunset Apartments', propertyId: 'sunset', property: 'Sunset Apartments', amount: -800000, category: 'renovations' },
            { date: new Date('2026-01-12'), description: 'CCTV system installation', propertyId: 'all', property: 'All Properties', amount: -150000, category: 'equipment' },
            { date: new Date('2025-12-15'), description: 'Property purchase - Kololo Heights', propertyId: 'kololo', property: 'Kololo Heights', amount: -2000000, category: 'property-purchase' },
            { date: new Date('2025-12-20'), description: 'Kitchen appliances - Sunset Apartments', propertyId: 'sunset', property: 'Sunset Apartments', amount: -300000, category: 'equipment' },
            { date: new Date('2025-11-25'), description: 'Landscaping - All Properties', propertyId: 'all', property: 'All Properties', amount: -200000, category: 'renovations' },
        ];

        // Filter investing transactions by date range and property
        const filteredInvesting = allInvestingTransactions.filter(investment => {
            const inDateRange = investment.date >= startDate && investment.date <= endDate;
            const inProperty = selectedProperty === 'all' || investment.propertyId === selectedProperty;
            return inDateRange && inProperty;
        });

        // Group investing activities by category
        const investingByCategory = filteredInvesting.reduce((acc, investment) => {
            if (!acc[investment.category]) {
                acc[investment.category] = {
                    label: investment.category === 'renovations' ? 'Major Renovations' :
                        investment.category === 'equipment' ? 'Equipment & Fixtures' :
                            'Property Purchases',
                    amount: 0,
                    transactions: []
                };
            }
            acc[investment.category].amount += investment.amount;
            acc[investment.category].transactions.push({
                date: investment.date.toLocaleDateString(),
                description: investment.description,
                amount: investment.amount,
            });
            return acc;
        }, {} as Record<string, { label: string; amount: number; transactions: any[] }>);

        // Convert to expected format
        return Object.entries(investingByCategory).map(([category, data], index) => ({
            id: `${category}-1`,
            label: data.label,
            amount: data.amount,
            transactions: data.transactions,
        }));
    }, [startDate, endDate, selectedProperty]);

    // Calculate financing activities filtered by date range and property
    const financingActivities: CashflowItem[] = useMemo(() => {
        // Create mock financing transactions that can be filtered
        const allFinancingTransactions = [
            { date: new Date('2026-01-05'), description: 'Monthly loan payment', propertyId: 'all', property: 'All Properties', amount: -500000, category: 'loan-repayments' },
            { date: new Date('2026-01-20'), description: 'Owner withdrawal', propertyId: 'all', property: 'All Properties', amount: -1000000, category: 'owner-withdrawals' },
            { date: new Date('2025-12-05'), description: 'Monthly loan payment', propertyId: 'all', property: 'All Properties', amount: -500000, category: 'loan-repayments' },
            { date: new Date('2025-12-15'), description: 'Owner withdrawal', propertyId: 'all', property: 'All Properties', amount: -800000, category: 'owner-withdrawals' },
            { date: new Date('2025-11-10'), description: 'Bank loan received', propertyId: 'all', property: 'All Properties', amount: 2000000, category: 'loans-received' },
        ];

        // Filter financing transactions by date range and property
        const filteredFinancing = allFinancingTransactions.filter(financing => {
            const inDateRange = financing.date >= startDate && financing.date <= endDate;
            const inProperty = selectedProperty === 'all' || financing.propertyId === selectedProperty;
            return inDateRange && inProperty;
        });

        // Group financing activities by category
        const financingByCategory = filteredFinancing.reduce((acc, financing) => {
            if (!acc[financing.category]) {
                acc[financing.category] = {
                    label: financing.category === 'loan-repayments' ? 'Loan Repayments' :
                        financing.category === 'owner-withdrawals' ? 'Owner Withdrawals' :
                            'Loans Received',
                    amount: 0,
                    transactions: []
                };
            }
            acc[financing.category].amount += financing.amount;
            acc[financing.category].transactions.push({
                date: financing.date.toLocaleDateString(),
                description: financing.description,
                amount: financing.amount,
            });
            return acc;
        }, {} as Record<string, { label: string; amount: number; transactions: any[] }>);

        // Convert to expected format
        return Object.entries(financingByCategory).map(([category, data], index) => ({
            id: `${category}-1`,
            label: data.label,
            amount: data.amount,
            transactions: data.transactions,
        }));
    }, [startDate, endDate, selectedProperty]);

    const operatingCashFlow = operatingActivities.reduce((sum, item) => sum + item.amount, 0);
    const investingCashFlow = investingActivities.reduce((sum, item) => sum + item.amount, 0);
    const financingCashFlow = financingActivities.reduce((sum, item) => sum + item.amount, 0);

    const openingBalance = 5000000;
    const netCashFlow = operatingCashFlow + investingCashFlow + financingCashFlow;
    const closingBalance = openingBalance + netCashFlow;

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

    const handleDateRangeSelect = (range: 'this_month' | 'last_month' | 'custom') => {
        if (range === 'custom') {
            setShowCustomDateModal(true);
        }
        setDateRange(range);
    };

    const handleStartDateChange = (event: any, selectedDate?: Date) => {
        setShowStartPicker(false);
        if (event.type !== 'dismissed' && selectedDate) {
            setCustomStartDate(selectedDate);
        }
    };

    const handleEndDateChange = (event: any, selectedDate?: Date) => {
        setShowEndPicker(false);
        if (event.type !== 'dismissed' && selectedDate) {
            setCustomEndDate(selectedDate);
            // Auto-close modal when end date is selected
            setShowCustomDateModal(false);
        }
    };

    const handleExportPDF = async () => {
        try {
            const propertyName = selectedProperty === 'all' ? 'All Properties' :
                properties.find(p => p.id === selectedProperty)?.name || 'Unknown Property';

            const reportData = PDFExportService.createCashflowData(
                propertyName,
                formatDateRange(),
                operatingActivities,
                investingActivities,
                financingActivities,
                openingBalance,
                netCashFlow,
                closingBalance
            );

            await PDFExportService.generateFinancialPDF(reportData);
        } catch (error) {
            Alert.alert('Export Failed', 'Failed to generate PDF. Please try again.');
        }
    };


    const CashflowSection = ({
        title,
        items,
        color,
        totalAmount,
    }: {
        title: string;
        items: CashflowItem[];
        color: string;
        totalAmount: number;
    }) => (
        <View style={{ marginBottom: spacing.lg }}>
            <View
                style={{
                    backgroundColor: color + '10',
                    borderLeftWidth: 4,
                    borderLeftColor: color,
                    paddingVertical: spacing.md,
                    paddingHorizontal: spacing.lg,
                    borderRadius: borderRadius.md,
                    marginBottom: spacing.lg,
                }}
            >
                <Text style={[typography.bodySmall, { color: colors.textSecondary, marginBottom: spacing.xs }]}>
                    {title}
                </Text>
                <Text style={[typography.h3, { color: color, fontWeight: '700' }]}>
                    UGX {totalAmount.toLocaleString()}
                </Text>
            </View>

            {items.map(item => (
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
                            <Text style={[typography.h4, { color: item.amount >= 0 ? colors.success : colors.error, fontWeight: '700' }]}>
                                {item.amount >= 0 ? '+' : ''}UGX {item.amount.toLocaleString()}
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
                                        borderLeftColor: color,
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
                                        <Text style={[typography.bodySmall, { color: txn.amount >= 0 ? colors.success : colors.error, fontWeight: '600' }]}>
                                            {txn.amount >= 0 ? '+' : ''}UGX {txn.amount.toLocaleString()}
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
    );

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
                                Cashflow Statement
                            </Text>
                            <Text style={[typography.bodySmall, { color: colors.textSecondary, marginTop: spacing.xs }]}>
                                Actual cash movement analysis
                            </Text>
                        </View>
                    </View>
                </View>

                {/* Filters */}
                <View style={{ paddingHorizontal: spacing.lg, marginBottom: spacing.lg }}>
                    <View>
                        <Text style={[typography.bodySmall, { color: colors.textSecondary, marginBottom: spacing.sm }]}>
                            Period
                        </Text>
                        <View style={{ flexDirection: 'row', gap: spacing.sm }}>
                            {(['this_month', 'last_month', 'custom'] as const).map(range => (
                                <TouchableOpacity
                                    key={range}
                                    onPress={() => handleDateRangeSelect(range)}
                                    style={{
                                        flex: 1,
                                        paddingVertical: spacing.sm,
                                        paddingHorizontal: spacing.md,
                                        borderRadius: borderRadius.md,
                                        backgroundColor: dateRange === range ? colors.primary : colors.surface,
                                        borderWidth: 1,
                                        borderColor: dateRange === range ? colors.primary : colors.border,
                                    }}
                                >
                                    <Text
                                        style={[
                                            typography.bodySmall,
                                            {
                                                color: dateRange === range ? '#FFFFFF' : colors.text,
                                                textAlign: 'center',
                                                fontWeight: '600',
                                            },
                                        ]}
                                    >
                                        {range === 'this_month' ? 'This Month' : range === 'last_month' ? 'Last Month' : 'Custom'}
                                    </Text>
                                </TouchableOpacity>
                            ))}
                        </View>
                        {/* Show selected date range */}
                        <View style={{ marginTop: spacing.sm, backgroundColor: colors.surface, padding: spacing.sm, borderRadius: borderRadius.sm }}>
                            <Text style={[typography.bodySmall, { color: colors.textSecondary, textAlign: 'center' }]}>
                                {formatDateRange()}
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

                {/* Operating Activities */}
                <View style={{ paddingHorizontal: spacing.lg }}>
                    <CashflowSection
                        title="OPERATING ACTIVITIES"
                        items={operatingActivities}
                        color={colors.info}
                        totalAmount={operatingCashFlow}
                    />
                </View>

                {/* Investing Activities */}
                <View style={{ paddingHorizontal: spacing.lg }}>
                    <CashflowSection
                        title="INVESTING ACTIVITIES"
                        items={investingActivities}
                        color={colors.warning}
                        totalAmount={investingCashFlow}
                    />
                </View>

                {/* Financing Activities */}
                <View style={{ paddingHorizontal: spacing.lg }}>
                    <CashflowSection
                        title="FINANCING ACTIVITIES"
                        items={financingActivities}
                        color={colors.error}
                        totalAmount={financingCashFlow}
                    />
                </View>

                {/* Cash Balance Summary */}
                <View style={{ paddingHorizontal: spacing.lg, marginBottom: spacing.lg }}>
                    <View
                        style={{
                            backgroundColor: colors.surface,
                            borderWidth: 1,
                            borderColor: colors.border,
                            borderRadius: borderRadius.lg,
                            padding: spacing.lg,
                        }}
                    >
                        <View style={{ marginBottom: spacing.md }}>
                            <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: spacing.sm }}>
                                <Text style={[typography.bodySmall, { color: colors.textSecondary }]}>
                                    Opening Cash Balance
                                </Text>
                                <Text style={[typography.body, { color: colors.text, fontWeight: '600' }]}>
                                    UGX {openingBalance.toLocaleString()}
                                </Text>
                            </View>
                            <View style={{ height: 1, backgroundColor: colors.divider }} />
                        </View>

                        <View style={{ marginBottom: spacing.md }}>
                            <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: spacing.sm }}>
                                <Text style={[typography.bodySmall, { color: colors.textSecondary }]}>
                                    Net Cash Movement
                                </Text>
                                <Text
                                    style={[
                                        typography.body,
                                        { color: netCashFlow >= 0 ? colors.success : colors.error, fontWeight: '600' },
                                    ]}
                                >
                                    {netCashFlow >= 0 ? '+' : ''}UGX {netCashFlow.toLocaleString()}
                                </Text>
                            </View>
                            <View style={{ height: 1, backgroundColor: colors.divider }} />
                        </View>

                        <View>
                            <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: spacing.sm }}>
                                <Text style={[typography.body, { color: colors.text, fontWeight: '600' }]}>
                                    Closing Cash Balance
                                </Text>
                                <Text
                                    style={[
                                        typography.h3,
                                        { color: closingBalance >= 0 ? colors.success : colors.error, fontWeight: '700' },
                                    ]}
                                >
                                    UGX {closingBalance.toLocaleString()}
                                </Text>
                            </View>
                        </View>
                    </View>
                </View>

                {/* Cashflow Status */}
                <View style={{ paddingHorizontal: spacing.lg, marginBottom: spacing.lg }}>
                    <View
                        style={{
                            backgroundColor: netCashFlow >= 0 ? colors.success + '15' : colors.warning + '15',
                            borderLeftWidth: 4,
                            borderLeftColor: netCashFlow >= 0 ? colors.success : colors.warning,
                            paddingVertical: spacing.md,
                            paddingHorizontal: spacing.lg,
                            borderRadius: borderRadius.md,
                            flexDirection: 'row',
                            alignItems: 'center',
                            gap: spacing.md,
                        }}
                    >
                        <Ionicons
                            name={netCashFlow >= 0 ? 'trending-up' : 'trending-down'}
                            size={24}
                            color={netCashFlow >= 0 ? colors.success : colors.warning}
                        />
                        <View style={{ flex: 1 }}>
                            <Text style={[typography.bodySmall, { color: colors.text, fontWeight: '600' }]}>
                                {netCashFlow >= 0 ? 'Positive Cashflow' : 'Negative Cashflow'}
                            </Text>
                            <Text style={[typography.bodySmall, { color: colors.textSecondary, marginTop: spacing.xs }]}>
                                {netCashFlow >= 0
                                    ? 'Cash position improving'
                                    : 'Cash outflows exceed inflows'}
                            </Text>
                        </View>
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
                                <Text
                                    style={[
                                        typography.body,
                                        { color: txn.amount >= 0 ? colors.success : colors.error, fontWeight: '700' },
                                    ]}
                                >
                                    {txn.amount >= 0 ? '+' : ''}UGX {txn.amount.toLocaleString()}
                                </Text>
                            </View>
                            <Text style={[typography.bodySmall, { color: colors.textSecondary }]}>
                                {txn.date}
                            </Text>
                        </View>
                    ))}
                </ScrollView>
            </Modal>

            {/* Custom Date Range Modal */}
            <Modal
                visible={showCustomDateModal}
                onClose={() => setShowCustomDateModal(false)}
                title="Select Custom Period"
                size="medium"
            >
                <View style={{ paddingBottom: spacing.lg }}>
                    {/* Start Date */}
                    <View style={{ marginBottom: spacing.lg }}>
                        <Text style={[typography.body, { color: colors.text, fontWeight: '600', marginBottom: spacing.sm }]}>
                            Start Date
                        </Text>
                        <TouchableOpacity
                            onPress={() => setShowStartPicker(true)}
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
                            <Text style={[typography.body, { color: colors.text }]}>
                                {customStartDate.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
                            </Text>
                            <Ionicons name="calendar-outline" size={20} color={colors.primary} />
                        </TouchableOpacity>
                    </View>

                    {/* End Date */}
                    <View style={{ marginBottom: spacing.lg }}>
                        <Text style={[typography.body, { color: colors.text, fontWeight: '600', marginBottom: spacing.sm }]}>
                            End Date
                        </Text>
                        <TouchableOpacity
                            onPress={() => setShowEndPicker(true)}
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
                            <Text style={[typography.body, { color: colors.text }]}>
                                {customEndDate.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
                            </Text>
                            <Ionicons name="calendar-outline" size={20} color={colors.primary} />
                        </TouchableOpacity>
                    </View>

                    <Button
                        title="Apply Date Range"
                        onPress={() => setShowCustomDateModal(false)}
                        variant="primary"
                    />
                </View>
            </Modal>

            {/* Date Pickers - Rendered outside modal for proper display */}
            {showStartPicker && (
                <DateTimePicker
                    value={customStartDate}
                    mode="date"
                    display="default"
                    onChange={handleStartDateChange}
                    maximumDate={new Date()}
                />
            )}
            {showEndPicker && (
                <DateTimePicker
                    value={customEndDate}
                    mode="date"
                    display="default"
                    onChange={handleEndDateChange}
                    minimumDate={customStartDate}
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
                            <Text style={[typography.h3, { color: colors.text, marginTop: spacing.sm }]}>Cashflow Statement</Text>
                            <Text style={[typography.bodySmall, { color: colors.textSecondary }]}>
                                {formatDateRange()}
                            </Text>
                        </View>

                        {/* Summary */}
                        <View style={{ gap: spacing.md }}>
                            <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                                <Text style={[typography.body, { color: colors.text }]}>Operating Cashflow</Text>
                                <Text style={[typography.body, { color: operatingCashFlow >= 0 ? colors.success : colors.error, fontWeight: '700' }]}>
                                    {operatingCashFlow >= 0 ? '+' : ''}UGX {operatingCashFlow.toLocaleString()}
                                </Text>
                            </View>
                            <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                                <Text style={[typography.body, { color: colors.text }]}>Investing Cashflow</Text>
                                <Text style={[typography.body, { color: investingCashFlow >= 0 ? colors.success : colors.error, fontWeight: '700' }]}>
                                    {investingCashFlow >= 0 ? '+' : ''}UGX {investingCashFlow.toLocaleString()}
                                </Text>
                            </View>
                            <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                                <Text style={[typography.body, { color: colors.text }]}>Financing Cashflow</Text>
                                <Text style={[typography.body, { color: financingCashFlow >= 0 ? colors.success : colors.error, fontWeight: '700' }]}>
                                    {financingCashFlow >= 0 ? '+' : ''}UGX {financingCashFlow.toLocaleString()}
                                </Text>
                            </View>
                            <View style={{ height: 1, backgroundColor: colors.border }} />
                            <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                                <Text style={[typography.h4, { color: colors.text }]}>Closing Balance</Text>
                                <Text style={[typography.h4, { color: closingBalance >= 0 ? colors.success : colors.error }]}>
                                    UGX {closingBalance.toLocaleString()}
                                </Text>
                            </View>
                        </View>

                        {/* File Info */}
                        <View style={{ marginTop: spacing.lg, padding: spacing.md, backgroundColor: colors.background, borderRadius: borderRadius.sm }}>
                            <Text style={[typography.bodySmall, { color: colors.textSecondary, textAlign: 'center' }]}>
                                PDF will include detailed breakdown of all cash activities
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
