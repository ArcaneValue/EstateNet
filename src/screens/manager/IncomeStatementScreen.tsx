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

interface IncomeItem {
    id: string;
    category: 'rent' | 'late_fees' | 'other';
    label: string;
    amount: number;
    transactions: Array<{
        date: string;
        tenant: string;
        property: string;
        unit: string;
        amount: number;
    }>;
}

interface ExpenseItem {
    id: string;
    category: 'maintenance' | 'repairs' | 'utilities' | 'management' | 'other';
    label: string;
    amount: number;
    transactions: Array<{
        date: string;
        description: string;
        property: string;
        amount: number;
    }>;
}

export const IncomeStatementScreen: React.FC<any> = ({ navigation }) => {
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

    // Calculate expenses filtered by date range and property
    const expenseData: ExpenseItem[] = useMemo(() => {
        // Create mock expense transactions that can be filtered
        const allExpenseTransactions = [
            { date: new Date('2026-01-15'), description: 'Roof inspection', propertyId: 'sunset', property: 'Sunset Apartments', amount: 150000, category: 'maintenance' },
            { date: new Date('2026-01-18'), description: 'Door repairs', propertyId: 'kololo', property: 'Kololo Heights', amount: 300000, category: 'maintenance' },
            { date: new Date('2026-01-10'), description: 'Plumbing repair', propertyId: 'sunset', property: 'Sunset Apartments', amount: 320000, category: 'repairs' },
            { date: new Date('2026-01-05'), description: 'Water bill', propertyId: 'kololo', property: 'Kololo Heights', amount: 150000, category: 'utilities' },
            { date: new Date('2026-01-08'), description: 'Electricity bill', propertyId: 'sunset', property: 'Sunset Apartments', amount: 130000, category: 'utilities' },
            { date: new Date('2026-01-01'), description: 'Monthly management fee', propertyId: 'all', property: 'All Properties', amount: 200000, category: 'management' },
            { date: new Date('2025-12-15'), description: 'Window repairs', propertyId: 'sunset', property: 'Sunset Apartments', amount: 180000, category: 'repairs' },
            { date: new Date('2025-12-20'), description: 'HVAC maintenance', propertyId: 'kololo', property: 'Kololo Heights', amount: 220000, category: 'maintenance' },
            { date: new Date('2025-12-05'), description: 'Gas bill', propertyId: 'kololo', property: 'Kololo Heights', amount: 120000, category: 'utilities' },
            { date: new Date('2025-12-01'), description: 'Monthly management fee', propertyId: 'all', property: 'All Properties', amount: 200000, category: 'management' },
        ];

        // Filter expense transactions by date range and property
        const filteredExpenses = allExpenseTransactions.filter(expense => {
            const inDateRange = expense.date >= startDate && expense.date <= endDate;
            const inProperty = selectedProperty === 'all' || expense.propertyId === selectedProperty;
            return inDateRange && inProperty;
        });

        // Group expenses by category
        const expensesByCategory = filteredExpenses.reduce((acc, expense) => {
            if (!acc[expense.category]) {
                acc[expense.category] = {
                    label: expense.category.charAt(0).toUpperCase() + expense.category.slice(1),
                    amount: 0,
                    transactions: []
                };
            }
            acc[expense.category].amount += expense.amount;
            acc[expense.category].transactions.push({
                date: expense.date.toLocaleDateString(),
                description: expense.description,
                property: expense.property,
                amount: expense.amount,
            });
            return acc;
        }, {} as Record<string, { label: string; amount: number; transactions: any[] }>);

        // Convert to expected format
        return Object.entries(expensesByCategory).map(([category, data], index) => ({
            id: `${category}-1`,
            category: category as 'maintenance' | 'repairs' | 'utilities' | 'management',
            label: data.label,
            amount: data.amount,
            transactions: data.transactions,
        }));
    }, [startDate, endDate, selectedProperty, dateRange]);

    // Calculate income from payments filtered by date range and property
    const incomeData: IncomeItem[] = useMemo(() => {
        // Filter payments by date range
        const filteredPayments = payments.filter(p => {
            const paymentDate = new Date(p.paymentDate);
            const inDateRange = paymentDate >= startDate && paymentDate <= endDate;
            const inProperty = selectedProperty === 'all' || p.propertyId === selectedProperty;
            return inDateRange && inProperty;
        });

        const rentCollected = filteredPayments.reduce((sum, p) => sum + p.amount, 0);
        return [
            {
                id: 'rent-1',
                category: 'rent',
                label: 'Rent Collected',
                amount: rentCollected,
                transactions: filteredPayments.map(p => ({
                    date: new Date(p.paymentDate).toLocaleDateString(),
                    tenant: getTenantByTenantId(p.tenantId)?.name || `Tenant ID: ${p.tenantId}`,
                    property: properties.find(prop => prop.id === p.propertyId)?.name || 'N/A',
                    unit: p.unitId || 'N/A',
                    amount: p.amount,
                })),
            },
            {
                id: 'late-1',
                category: 'late_fees',
                label: 'Late Fees',
                amount: dateRange === 'this_month' ? 50000 : dateRange === 'last_month' ? 35000 : 25000,
                transactions: [
                    { date: 'Jan 20, 2026', tenant: 'David Brown', property: 'Sunset Apartments', unit: 'Unit 301', amount: 50000 },
                ],
            },
            {
                id: 'other-1',
                category: 'other',
                label: 'Other Income',
                amount: 0,
                transactions: [],
            },
        ];
    }, [payments, properties, getTenantByTenantId, startDate, endDate, selectedProperty, dateRange]);

    const totalIncome = incomeData.reduce((sum, item) => sum + item.amount, 0);
    const totalExpenses = expenseData.reduce((sum, item) => sum + item.amount, 0);
    const netIncome = totalIncome - totalExpenses;

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

            const reportData = PDFExportService.createIncomeStatementData(
                propertyName,
                formatDateRange(),
                incomeData,
                expenseData
            );

            await PDFExportService.generateFinancialPDF(reportData);
        } catch (error) {
            Alert.alert('Export Failed', 'Failed to generate PDF. Please try again.');
        }
    };


    const handleExportCSV = () => {
        const csvContent = [
            'Income Statement',
            `Period: ${formatDateRange()}`,
            '',
            'INCOME',
            ...incomeData.map(item => `${item.label},UGX ${item.amount}`),
            `Total Income,UGX ${totalIncome}`,
            '',
            'EXPENSES',
            ...expenseData.map(item => `${item.label},UGX ${item.amount}`),
            `Total Expenses,UGX ${totalExpenses}`,
            '',
            `NET INCOME,UGX ${netIncome}`,
        ].join('\n');

        Share.share({
            message: csvContent,
            title: 'Income Statement CSV',
        });
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
                                Income Statement
                            </Text>
                            <Text style={[typography.bodySmall, { color: colors.textSecondary, marginTop: spacing.xs }]}>
                                Financial performance overview
                            </Text>
                        </View>
                    </View>
                </View>

                {/* Filters */}
                <View style={{ paddingHorizontal: spacing.lg, marginBottom: spacing.lg }}>
                    {/* Date Range Selector */}
                    <View style={{ marginBottom: spacing.md }}>
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
                    <View>
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

                {/* Income Section */}
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
                            TOTAL INCOME
                        </Text>
                        <Text style={[typography.h2, { color: colors.success, fontWeight: '700' }]}>
                            UGX {totalIncome.toLocaleString()}
                        </Text>
                    </View>

                    {incomeData.map(item => (
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
                                    <Text style={[typography.h4, { color: colors.success, fontWeight: '700' }]}>
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
                                                borderLeftColor: colors.primary,
                                                paddingVertical: spacing.sm,
                                                paddingHorizontal: spacing.md,
                                                marginTop: spacing.xs,
                                                borderRadius: borderRadius.sm,
                                            }}
                                        >
                                            <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: spacing.xs }}>
                                                <Text style={[typography.bodySmall, { color: colors.text, fontWeight: '500' }]}>
                                                    {txn.tenant || txn.description}
                                                </Text>
                                                <Text style={[typography.bodySmall, { color: colors.success, fontWeight: '600' }]}>
                                                    UGX {txn.amount.toLocaleString()}
                                                </Text>
                                            </View>
                                            <Text style={[typography.bodySmall, { color: colors.textSecondary, fontSize: 11 }]}>
                                                {txn.date} • {txn.property}
                                            </Text>
                                        </View>
                                    ))}
                                    {item.transactions.length > 3 && (
                                        <TouchableOpacity
                                            onPress={() => handleViewTransactions(item.label, item.transactions)}
                                            style={{ marginTop: spacing.sm }}
                                        >
                                            <Text style={[typography.bodySmall, { color: colors.primary, fontWeight: '600' }]}>
                                                View all {item.transactions.length} transactions →
                                            </Text>
                                        </TouchableOpacity>
                                    )}
                                </View>
                            )}
                        </View>
                    ))}
                </View>

                {/* Expenses Section */}
                <View style={{ paddingHorizontal: spacing.lg, marginBottom: spacing.lg }}>
                    <View
                        style={{
                            backgroundColor: colors.error + '10',
                            borderLeftWidth: 4,
                            borderLeftColor: colors.error,
                            paddingVertical: spacing.md,
                            paddingHorizontal: spacing.lg,
                            borderRadius: borderRadius.md,
                            marginBottom: spacing.lg,
                        }}
                    >
                        <Text style={[typography.bodySmall, { color: colors.textSecondary, marginBottom: spacing.xs }]}>
                            TOTAL EXPENSES
                        </Text>
                        <Text style={[typography.h2, { color: colors.error, fontWeight: '700' }]}>
                            UGX {totalExpenses.toLocaleString()}
                        </Text>
                    </View>

                    {expenseData.map(item => (
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
                                    <Text style={[typography.h4, { color: colors.error, fontWeight: '700' }]}>
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
                                    {item.transactions.slice(0, 3).map((txn, idx) => (
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
                                                <Text style={[typography.bodySmall, { color: colors.text, fontWeight: '500' }]}>
                                                    {txn.description}
                                                </Text>
                                                <Text style={[typography.bodySmall, { color: colors.error, fontWeight: '600' }]}>
                                                    UGX {txn.amount.toLocaleString()}
                                                </Text>
                                            </View>
                                            <Text style={[typography.bodySmall, { color: colors.textSecondary, fontSize: 11 }]}>
                                                {txn.date} • {txn.property}
                                            </Text>
                                        </View>
                                    ))}
                                    {item.transactions.length > 3 && (
                                        <TouchableOpacity
                                            onPress={() => handleViewTransactions(item.label, item.transactions)}
                                            style={{ marginTop: spacing.sm }}
                                        >
                                            <Text style={[typography.bodySmall, { color: colors.primary, fontWeight: '600' }]}>
                                                View all {item.transactions.length} transactions →
                                            </Text>
                                        </TouchableOpacity>
                                    )}
                                </View>
                            )}
                        </View>
                    ))}
                </View>

                {/* Net Income Section */}
                <View style={{ paddingHorizontal: spacing.lg, marginBottom: spacing.lg }}>
                    <View
                        style={{
                            backgroundColor: netIncome >= 0 ? colors.success + '15' : colors.error + '15',
                            borderWidth: 2,
                            borderColor: netIncome >= 0 ? colors.success : colors.error,
                            borderRadius: borderRadius.lg,
                            paddingVertical: spacing.lg,
                            paddingHorizontal: spacing.lg,
                            alignItems: 'center',
                        }}
                    >
                        <Text style={[typography.bodySmall, { color: colors.textSecondary, marginBottom: spacing.sm }]}>
                            NET INCOME
                        </Text>
                        <Text style={[typography.h1, { color: netIncome >= 0 ? colors.success : colors.error, fontWeight: '800' }]}>
                            UGX {netIncome.toLocaleString()}
                        </Text>
                        <Text style={[typography.bodySmall, { color: colors.textSecondary, marginTop: spacing.sm }]}>
                            {totalIncome.toLocaleString()} − {totalExpenses.toLocaleString()}
                        </Text>
                    </View>
                </View>

                {/* Export Actions */}
                <View style={{ paddingHorizontal: spacing.lg, marginBottom: spacing.xl, gap: spacing.sm }}>
                    <Button
                        title="Export as PDF"
                        onPress={handleExportPDF}
                        variant="outline"
                        icon={<Ionicons name="document-outline" size={16} color={colors.primary} />}
                    />
                    <Button
                        title="Export as CSV"
                        onPress={handleExportCSV}
                        variant="outline"
                        icon={<Ionicons name="download-outline" size={16} color={colors.primary} />}
                    />
                </View>
            </ScrollView>

            {/* Transactions Modal */}
            <Modal
                visible={showTransactionModal}
                onClose={() => setShowTransactionModal(false)}
                title={`${selectedLabel} Transactions`}
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
                                    {txn.tenant || txn.description}
                                </Text>
                                <Text style={[typography.body, { color: colors.text, fontWeight: '700' }]}>
                                    UGX {txn.amount.toLocaleString()}
                                </Text>
                            </View>
                            <Text style={[typography.bodySmall, { color: colors.textSecondary }]}>
                                {txn.date}
                            </Text>
                            <Text style={[typography.bodySmall, { color: colors.textSecondary }]}>
                                {txn.property} {txn.unit ? `• ${txn.unit}` : ''}
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
                            <Text style={[typography.h3, { color: colors.text, marginTop: spacing.sm }]}>Income Statement</Text>
                            <Text style={[typography.bodySmall, { color: colors.textSecondary }]}>
                                {formatDateRange()}
                            </Text>
                        </View>

                        {/* Summary */}
                        <View style={{ gap: spacing.md }}>
                            <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                                <Text style={[typography.body, { color: colors.text }]}>Total Income</Text>
                                <Text style={[typography.body, { color: colors.success, fontWeight: '700' }]}>UGX {totalIncome.toLocaleString()}</Text>
                            </View>
                            <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                                <Text style={[typography.body, { color: colors.text }]}>Total Expenses</Text>
                                <Text style={[typography.body, { color: colors.error, fontWeight: '700' }]}>UGX {totalExpenses.toLocaleString()}</Text>
                            </View>
                            <View style={{ height: 1, backgroundColor: colors.border }} />
                            <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                                <Text style={[typography.h4, { color: colors.text }]}>Net Income</Text>
                                <Text style={[typography.h4, { color: netIncome >= 0 ? colors.success : colors.error }]}>
                                    UGX {netIncome.toLocaleString()}
                                </Text>
                            </View>
                        </View>

                        {/* File Info */}
                        <View style={{ marginTop: spacing.lg, padding: spacing.md, backgroundColor: colors.background, borderRadius: borderRadius.sm }}>
                            <Text style={[typography.bodySmall, { color: colors.textSecondary, textAlign: 'center' }]}>
                                PDF will include detailed breakdown of all income and expense categories
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
