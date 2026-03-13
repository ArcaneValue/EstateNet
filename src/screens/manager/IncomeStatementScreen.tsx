import React, { useState } from 'react';
import { View, Text, ScrollView, ActivityIndicator, Alert } from 'react-native';
import { useTheme } from '../../theme/ThemeContext';
import { Ionicons } from '@expo/vector-icons';
import { useIncomeStatement } from '../../hooks/useManagerFinance';
import { useProperties } from '../../context/PropertyContext';
import { Card } from '../../components/Card';
import { PageHeader } from '../../components/PageHeader';
import { FilterChips } from '../../components/FilterChips';
import { PdfExportPreviewModal } from '../../components/PdfExportPreviewModal';
import { buildIncomeStatementHtml } from '../../utils/pdfReports';
import { formatCompactCurrencyUGX } from '../../utils/formatters';

export const IncomeStatementScreen: React.FC<any> = ({ navigation }) => {
    const { colors, spacing, typography } = useTheme();
    const { properties } = useProperties();
    const [selectedPeriod, setSelectedPeriod] = useState<string>();
    const [selectedPropertyId, setSelectedPropertyId] = useState<string>();
    const [exportLoading, setExportLoading] = useState(false);
    const [showPreviewModal, setShowPreviewModal] = useState(false);
    const [previewHtml, setPreviewHtml] = useState('');
    const [previewFileName, setPreviewFileName] = useState('');

    const { data, loading, error, refetch } = useIncomeStatement(selectedPeriod, selectedPropertyId);

    const getCurrentPeriod = () => {
        const now = new Date();
        const year = now.getFullYear();
        const month = now.getMonth() + 1;
        return `${year}-${month.toString().padStart(2, '0')}`;
    };

    const generatePeriodOptions = () => {
        const options = [];
        const now = new Date();
        for (let i = 0; i < 7; i++) {
            const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
            const year = date.getFullYear();
            const month = date.getMonth() + 1;
            const value = `${year}-${month.toString().padStart(2, '0')}`;
            const label = date.toLocaleDateString('en-UG', { month: 'long', year: 'numeric' });
            options.push({ value, label });
        }
        return options;
    };

    const periodOptions = generatePeriodOptions();
    const currentPeriod = getCurrentPeriod();

    const applyFilters = (period?: string, propertyId?: string) => {
        setSelectedPeriod(period);
        setSelectedPropertyId(propertyId);
        refetch(period, propertyId);
    };

    const handleExportPDF = () => {
        console.log('handleExportPDF called');
        console.log('Data available:', !!data);
        console.log('Data content:', data);

        if (!data) {
            Alert.alert('Export Error', 'No data available to export');
            return;
        }

        try {
            const propertyName = selectedPropertyId
                ? properties.find(p => p.id === selectedPropertyId)?.name || 'Selected Property'
                : 'All Properties';
            const period = selectedPeriod || getCurrentPeriod();

            console.log('Calling buildIncomeStatementHtml with:', { propertyName, period });

            // Generate actual HTML using the data
            const { html, fileName } = buildIncomeStatementHtml(data, {
                period: `Period: ${period}`,
                propertyName,
                generatedAt: new Date().toLocaleString(),
            });

            console.log('Setting modal state:', { fileName, htmlLength: html.length });

            setPreviewHtml(html);
            setPreviewFileName(fileName);
            setShowPreviewModal(true);

            console.log('Modal should now be visible');
        } catch (error) {
            console.error('Error in handleExportPDF:', error);
            Alert.alert('Export Failed', 'Failed to generate PDF preview. Please try again.');
        }
    };

    if (loading) {
        return (
            <View style={{ flex: 1, backgroundColor: colors.background }}>
                <PageHeader
                    title="Income statement"
                    onBack={() => navigation.goBack()}
                    rightAction={{
                        iconName: 'download-outline',
                        onPress: handleExportPDF,
                        loading: exportLoading
                    }}
                />
                <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
                    <ActivityIndicator size="large" color={colors.primary} />
                    <Text style={[typography.body, { color: colors.textSecondary, marginTop: spacing.md }]}>
                        Loading income statement...
                    </Text>
                </View>
            </View>
        );
    }

    return (
        <View style={{ flex: 1, backgroundColor: colors.background }}>
            <PageHeader
                title="Income statement"
                onBack={() => navigation.goBack()}
                rightAction={{
                    iconName: 'download-outline',
                    onPress: handleExportPDF,
                    loading: exportLoading
                }}
            />

            <ScrollView style={{ flex: 1 }} showsVerticalScrollIndicator={false}>
                <View style={{ padding: spacing.lg }}>
                    {/* Error Display */}
                    {error && (
                        <Card style={{
                            backgroundColor: colors.error + '10',
                            borderColor: colors.error,
                            borderWidth: 1,
                            marginBottom: spacing.lg
                        }}>
                            <View style={{ padding: spacing.md }}>
                                <Text style={[typography.bodySmall, { color: colors.error }]}>
                                    {error}
                                </Text>
                            </View>
                        </Card>
                    )}

                    {/* Info Banner */}
                    <Card style={{ marginBottom: spacing.lg, padding: spacing.md, backgroundColor: colors.info + '10' }}>
                        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                            <Ionicons name="information-circle" size={18} color={colors.info} style={{ marginRight: spacing.sm }} />
                            <Text style={[typography.bodySmall, { color: colors.text, flex: 1 }]}>Simplified statement (rent collections only)</Text>
                        </View>
                    </Card>

                    {/* Filters Section */}
                    <Card style={{ marginBottom: spacing.lg, padding: spacing.md }}>
                        <Text style={[typography.h3, { color: colors.text, marginBottom: spacing.md }]}>Filters</Text>

                        <View style={{ marginBottom: spacing.md }}>
                            <Text style={[typography.bodySmall, { color: colors.textSecondary, marginBottom: spacing.sm }]}>Period</Text>
                            <FilterChips
                                options={periodOptions}
                                selectedValue={selectedPeriod || currentPeriod}
                                onSelect={(value) => applyFilters(value, selectedPropertyId)}
                                allowClear={false}
                            />
                        </View>

                        <View>
                            <Text style={[typography.bodySmall, { color: colors.textSecondary, marginBottom: spacing.sm }]}>Property</Text>
                            <FilterChips
                                options={[
                                    { label: 'All Properties', value: 'all' },
                                    ...properties.map(p => ({ label: p.name, value: p.id }))
                                ]}
                                selectedValue={selectedPropertyId || 'all'}
                                onSelect={(value) => applyFilters(selectedPeriod, value === 'all' ? undefined : value)}
                                allowClear={false}
                            />
                        </View>
                    </Card>

                    {/* Hero Card - Net Income */}
                    <Card style={{ marginBottom: spacing.lg, padding: spacing.xl }}>
                        <View style={{ alignItems: 'center' }}>
                            <Ionicons name="trending-up" size={48} color={colors.success} style={{ marginBottom: spacing.md }} />
                            <Text style={[typography.h1, { color: colors.success, textAlign: 'center', marginBottom: spacing.xs }]}>
                                {formatCompactCurrencyUGX(data?.netIncome || 0)}
                            </Text>
                            <Text style={[typography.body, { color: colors.textSecondary, textAlign: 'center' }]}>
                                Net Income
                            </Text>
                        </View>
                    </Card>

                    {/* Revenue Section */}
                    <Card style={{ marginBottom: spacing.lg, padding: spacing.lg }}>
                        <Text style={[typography.h3, { color: colors.text, marginBottom: spacing.md }]}>
                            Revenue
                        </Text>

                        <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: spacing.sm }}>
                            <Text style={[typography.body, { color: colors.text }]}>Rent Income</Text>
                            <Text style={[typography.body, { color: colors.success, fontWeight: '600' }]}>
                                {formatCompactCurrencyUGX(data?.revenue.rentIncome || 0)}
                            </Text>
                        </View>

                        <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: spacing.sm }}>
                            <Text style={[typography.body, { color: colors.text }]}>Other Income</Text>
                            <Text style={[typography.body, { color: colors.textSecondary }]}>
                                {formatCompactCurrencyUGX(data?.revenue.otherIncome || 0)}
                            </Text>
                        </View>

                        <View style={{ height: 1, backgroundColor: colors.border, marginVertical: spacing.sm }} />

                        <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                            <Text style={[typography.body, { color: colors.text, fontWeight: '600' }]}>Total Revenue</Text>
                            <Text style={[typography.body, { color: colors.success, fontWeight: '600' }]}>
                                {formatCompactCurrencyUGX(data?.revenue.totalRevenue || 0)}
                            </Text>
                        </View>
                    </Card>

                    {/* Expenses Section */}
                    <Card style={{ marginBottom: spacing.lg, padding: spacing.lg }}>
                        <Text style={[typography.h3, { color: colors.text, marginBottom: spacing.md }]}>
                            Expenses
                        </Text>

                        <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: spacing.sm }}>
                            <Text style={[typography.body, { color: colors.text }]}>Operating Expenses</Text>
                            <Text style={[typography.body, { color: colors.textSecondary }]}>
                                {formatCompactCurrencyUGX(data?.expenses.operatingExpenses || 0)}
                            </Text>
                        </View>

                        <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: spacing.sm }}>
                            <Text style={[typography.body, { color: colors.text }]}>Maintenance Expenses</Text>
                            <Text style={[typography.body, { color: colors.textSecondary }]}>
                                {formatCompactCurrencyUGX(data?.expenses.maintenanceExpenses || 0)}
                            </Text>
                        </View>

                        <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: spacing.sm }}>
                            <Text style={[typography.body, { color: colors.text }]}>Administrative Expenses</Text>
                            <Text style={[typography.body, { color: colors.textSecondary }]}>
                                {formatCompactCurrencyUGX(data?.expenses.administrativeExpenses || 0)}
                            </Text>
                        </View>

                        <View style={{ height: 1, backgroundColor: colors.border, marginVertical: spacing.sm }} />

                        <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                            <Text style={[typography.body, { color: colors.text, fontWeight: '600' }]}>Total Expenses</Text>
                            <Text style={[typography.body, { color: colors.textSecondary, fontWeight: '600' }]}>
                                {formatCompactCurrencyUGX(data?.expenses.totalExpenses || 0)}
                            </Text>
                        </View>

                        <Text style={[typography.bodySmall, { color: colors.textSecondary, marginTop: spacing.sm, fontStyle: 'italic' }]}>
                            {data?.expenses.description}
                        </Text>
                    </Card>

                    {/* Net Income Calculation */}
                    <Card style={{ marginBottom: spacing.lg, padding: spacing.lg, backgroundColor: colors.success + '10' }}>
                        <Text style={[typography.h3, { color: colors.text, marginBottom: spacing.md }]}>
                            Net Income Calculation
                        </Text>

                        <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: spacing.sm }}>
                            <Text style={[typography.body, { color: colors.text }]}>Total Revenue</Text>
                            <Text style={[typography.body, { color: colors.success, fontWeight: '600' }]}>
                                {formatCompactCurrencyUGX(data?.revenue.totalRevenue || 0)}
                            </Text>
                        </View>

                        <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: spacing.sm }}>
                            <Text style={[typography.body, { color: colors.text }]}>Less: Total Expenses</Text>
                            <Text style={[typography.body, { color: colors.error, fontWeight: '600' }]}>
                                ({formatCompactCurrencyUGX(data?.expenses.totalExpenses || 0)})
                            </Text>
                        </View>

                        <View style={{ height: 2, backgroundColor: colors.success, marginVertical: spacing.sm }} />

                        <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                            <Text style={[typography.h3, { color: colors.text }]}>Net Income</Text>
                            <Text style={[typography.h3, { color: colors.success }]}>
                                {formatCompactCurrencyUGX(data?.netIncome || 0)}
                            </Text>
                        </View>
                    </Card>

                    {/* Disclaimer */}
                    <Card style={{ marginBottom: spacing.xl, padding: spacing.lg, backgroundColor: colors.warning + '10' }}>
                        <View style={{ flexDirection: 'row', alignItems: 'flex-start' }}>
                            <Ionicons name="information-circle" size={20} color={colors.warning} style={{ marginRight: spacing.sm, marginTop: 2 }} />
                            <Text style={[typography.bodySmall, { color: colors.text, flex: 1, lineHeight: 20 }]}>
                                {data?.disclaimer}
                            </Text>
                        </View>
                    </Card>
                </View>
            </ScrollView>

            <PdfExportPreviewModal
                visible={showPreviewModal}
                title="Income Statement"
                html={previewHtml}
                fileName={previewFileName}
                onClose={() => setShowPreviewModal(false)}
            />
        </View>
    );
};
