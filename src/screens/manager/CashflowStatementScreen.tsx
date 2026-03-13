import React, { useState } from 'react';
import { View, Text, ScrollView, ActivityIndicator, Alert } from 'react-native';
import { useTheme } from '../../theme/ThemeContext';
import { Ionicons } from '@expo/vector-icons';
import { useCashflowStatement } from '../../hooks/useManagerFinance';
import { useProperties } from '../../context/PropertyContext';
import { Card } from '../../components/Card';
import { PageHeader } from '../../components/PageHeader';
import { FilterChips } from '../../components/FilterChips';
import { PdfExportPreviewModal } from '../../components/PdfExportPreviewModal';
import { buildCashflowHtml } from '../../utils/pdfReports';
import { formatCompactCurrencyUGX } from '../../utils/formatters';

export const CashflowStatementScreen: React.FC<any> = ({ navigation }) => {
    const { colors, spacing, typography } = useTheme();
    const { properties } = useProperties();
    const [selectedPeriod, setSelectedPeriod] = useState<string>();
    const [selectedPropertyId, setSelectedPropertyId] = useState<string>();
    const [exportLoading, setExportLoading] = useState(false);
    const [showPreviewModal, setShowPreviewModal] = useState(false);
    const [previewHtml, setPreviewHtml] = useState('');
    const [previewFileName, setPreviewFileName] = useState('');

    const { data, loading, error, refetch } = useCashflowStatement(selectedPeriod, selectedPropertyId);

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
        console.log('Cashflow handleExportPDF called');
        console.log('Data available:', !!data);

        if (!data) {
            Alert.alert('Export Error', 'No data available to export');
            return;
        }

        try {
            const propertyName = selectedPropertyId
                ? properties.find(p => p.id === selectedPropertyId)?.name || 'Selected Property'
                : 'All Properties';
            const period = selectedPeriod || getCurrentPeriod();

            console.log('Cashflow - Setting modal state');

            // Generate actual HTML using the data
            const { html, fileName } = buildCashflowHtml(data, {
                period: `Period: ${period}`,
                propertyName,
                generatedAt: new Date().toLocaleString(),
            });

            setPreviewHtml(html);
            setPreviewFileName(fileName);
            setShowPreviewModal(true);

            console.log('Cashflow - Modal should now be visible');
        } catch (error) {
            console.error('Error in Cashflow handleExportPDF:', error);
            Alert.alert('Export Failed', 'Failed to generate PDF preview. Please try again.');
        }
    };

    if (loading) {
        return (
            <View style={{ flex: 1, backgroundColor: colors.background }}>
                <PageHeader
                    title="Cashflow"
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
                        Loading cashflow statement...
                    </Text>
                </View>
            </View>
        );
    }

    return (
        <View style={{ flex: 1, backgroundColor: colors.background }}>
            <PageHeader
                title="Cashflow"
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

                    {/* Hero Card - Net Cashflow */}
                    <Card style={{ marginBottom: spacing.lg, padding: spacing.xl }}>
                        <View style={{ alignItems: 'center' }}>
                            <Ionicons name="cash" size={48} color={colors.success} style={{ marginBottom: spacing.md }} />
                            <Text style={[typography.h1, { color: colors.success, textAlign: 'center', marginBottom: spacing.xs }]}>
                                {formatCompactCurrencyUGX(data?.netCashflow || 0)}
                            </Text>
                            <Text style={[typography.body, { color: colors.textSecondary, textAlign: 'center' }]}>
                                Net Cashflow
                            </Text>
                        </View>
                    </Card>

                    {/* Operating Activities */}
                    <Card style={{ marginBottom: spacing.lg, padding: spacing.lg }}>
                        <Text style={[typography.h3, { color: colors.text, marginBottom: spacing.md }]}>
                            Operating Activities
                        </Text>

                        <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: spacing.sm }}>
                            <Text style={[typography.body, { color: colors.text }]}>Rent Collected</Text>
                            <Text style={[typography.body, { color: colors.success, fontWeight: '600' }]}>
                                {formatCompactCurrencyUGX(data?.operatingActivities.inflows.rentCollected || 0)}
                            </Text>
                        </View>

                        <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: spacing.sm }}>
                            <Text style={[typography.body, { color: colors.text }]}>Expenses</Text>
                            <Text style={[typography.body, { color: colors.textSecondary }]}>
                                {formatCompactCurrencyUGX(data?.operatingActivities.outflows.expenses || 0)}
                            </Text>
                        </View>

                        <View style={{ height: 1, backgroundColor: colors.border, marginVertical: spacing.sm }} />

                        <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                            <Text style={[typography.body, { color: colors.text, fontWeight: '600' }]}>Net Operating Cashflow</Text>
                            <Text style={[typography.body, { color: colors.success, fontWeight: '600' }]}>
                                {formatCompactCurrencyUGX(data?.operatingActivities.netOperatingCashflow || 0)}
                            </Text>
                        </View>
                    </Card>

                    {/* Investing Activities */}
                    <Card style={{ marginBottom: spacing.lg, padding: spacing.lg }}>
                        <Text style={[typography.h3, { color: colors.text, marginBottom: spacing.md }]}>
                            Investing Activities
                        </Text>

                        <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: spacing.sm }}>
                            <Text style={[typography.body, { color: colors.text }]}>Investment Inflows</Text>
                            <Text style={[typography.body, { color: colors.textSecondary }]}>
                                {formatCompactCurrencyUGX(data?.investingActivities.inflows || 0)}
                            </Text>
                        </View>

                        <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: spacing.sm }}>
                            <Text style={[typography.body, { color: colors.text }]}>Investment Outflows</Text>
                            <Text style={[typography.body, { color: colors.textSecondary }]}>
                                {formatCompactCurrencyUGX(data?.investingActivities.outflows || 0)}
                            </Text>
                        </View>

                        <View style={{ height: 1, backgroundColor: colors.border, marginVertical: spacing.sm }} />

                        <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                            <Text style={[typography.body, { color: colors.text, fontWeight: '600' }]}>Net Investing Cashflow</Text>
                            <Text style={[typography.body, { color: colors.textSecondary, fontWeight: '600' }]}>
                                {formatCompactCurrencyUGX(data?.investingActivities.netInvestingCashflow || 0)}
                            </Text>
                        </View>

                        <Text style={[typography.bodySmall, { color: colors.textSecondary, marginTop: spacing.sm, fontStyle: 'italic' }]}>
                            {data?.investingActivities.description}
                        </Text>
                    </Card>

                    {/* Financing Activities */}
                    <Card style={{ marginBottom: spacing.lg, padding: spacing.lg }}>
                        <Text style={[typography.h3, { color: colors.text, marginBottom: spacing.md }]}>
                            Financing Activities
                        </Text>

                        <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: spacing.sm }}>
                            <Text style={[typography.body, { color: colors.text }]}>Financing Inflows</Text>
                            <Text style={[typography.body, { color: colors.textSecondary }]}>
                                {formatCompactCurrencyUGX(data?.financingActivities.inflows || 0)}
                            </Text>
                        </View>

                        <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: spacing.sm }}>
                            <Text style={[typography.body, { color: colors.text }]}>Financing Outflows</Text>
                            <Text style={[typography.body, { color: colors.textSecondary }]}>
                                {formatCompactCurrencyUGX(data?.financingActivities.outflows || 0)}
                            </Text>
                        </View>

                        <View style={{ height: 1, backgroundColor: colors.border, marginVertical: spacing.sm }} />

                        <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                            <Text style={[typography.body, { color: colors.text, fontWeight: '600' }]}>Net Financing Cashflow</Text>
                            <Text style={[typography.body, { color: colors.textSecondary, fontWeight: '600' }]}>
                                {formatCompactCurrencyUGX(data?.financingActivities.netFinancingCashflow || 0)}
                            </Text>
                        </View>

                        <Text style={[typography.bodySmall, { color: colors.textSecondary, marginTop: spacing.sm, fontStyle: 'italic' }]}>
                            {data?.financingActivities.description}
                        </Text>
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
                title="Cashflow Statement"
                html={previewHtml}
                fileName={previewFileName}
                onClose={() => setShowPreviewModal(false)}
            />
        </View>
    );
};
