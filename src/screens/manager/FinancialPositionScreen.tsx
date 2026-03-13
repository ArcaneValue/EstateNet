import React, { useState } from 'react';
import { View, Text, ScrollView, ActivityIndicator, Alert } from 'react-native';
import { useTheme } from '../../theme/ThemeContext';
import { Ionicons } from '@expo/vector-icons';
import { useFinancialPosition } from '../../hooks/useManagerFinance';
import { useProperties } from '../../context/PropertyContext';
import { Card } from '../../components/Card';
import { PageHeader } from '../../components/PageHeader';
import { FilterChips } from '../../components/FilterChips';
import { PdfExportPreviewModal } from '../../components/PdfExportPreviewModal';
import { buildFinancialPositionHtml } from '../../utils/pdfReports';
import { formatCompactCurrencyUGX } from '../../utils/formatters';

export const FinancialPositionScreen: React.FC<any> = ({ navigation }) => {
    const { colors, spacing, typography } = useTheme();
    const { properties } = useProperties();
    const [selectedPeriod, setSelectedPeriod] = useState<string>();
    const [selectedPropertyId, setSelectedPropertyId] = useState<string>();
    const [exportLoading, setExportLoading] = useState(false);
    const [showPreviewModal, setShowPreviewModal] = useState(false);
    const [previewHtml, setPreviewHtml] = useState('');
    const [previewFileName, setPreviewFileName] = useState('');

    const { data, loading, error, refetch } = useFinancialPosition(selectedPeriod, selectedPropertyId);

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
        console.log('Financial Position handleExportPDF called');
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

            console.log('Financial Position - Setting modal state');

            // Generate actual HTML using the data
            const { html, fileName } = buildFinancialPositionHtml(data, {
                period: `Period: ${period}`,
                propertyName,
                generatedAt: new Date().toLocaleString(),
            });

            setPreviewHtml(html);
            setPreviewFileName(fileName);
            setShowPreviewModal(true);

            console.log('Financial Position - Modal should now be visible');
        } catch (error) {
            console.error('Error in Financial Position handleExportPDF:', error);
            Alert.alert('Export Failed', 'Failed to generate PDF preview. Please try again.');
        }
    };

    const totalAssets = data?.assets.totalAssets || 0;
    const totalLiabilitiesAndEquity = (data?.liabilities.totalLiabilities || 0) + (data?.equity.totalEquity || 0);
    const balanceDifference = Math.abs(totalAssets - totalLiabilitiesAndEquity);
    const isBalanced = balanceDifference < 0.01;

    if (loading) {
        return (
            <View style={{ flex: 1, backgroundColor: colors.background }}>
                <PageHeader
                    title="Financial position"
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
                        Loading financial position...
                    </Text>
                </View>
            </View>
        );
    }


    return (
        <View style={{ flex: 1, backgroundColor: colors.background }}>
            <PageHeader
                title="Financial position"
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

                    {/* Hero Card - Total Assets */}
                    <Card style={{ marginBottom: spacing.lg, padding: spacing.xl }}>
                        <View style={{ alignItems: 'center' }}>
                            <Ionicons name="analytics" size={48} color={colors.primary} style={{ marginBottom: spacing.md }} />
                            <Text style={[typography.h1, { color: colors.primary, textAlign: 'center', marginBottom: spacing.xs }]}>
                                {formatCompactCurrencyUGX(data?.assets.totalAssets || 0)}
                            </Text>
                            <Text style={[typography.body, { color: colors.textSecondary, textAlign: 'center' }]}>
                                Total Assets
                            </Text>
                        </View>
                    </Card>

                    {/* Assets Section */}
                    <Card style={{ marginBottom: spacing.lg, padding: spacing.lg }}>
                        <Text style={[typography.h3, { color: colors.text, marginBottom: spacing.md }]}>
                            Assets
                        </Text>

                        {/* Current Assets */}
                        <Text style={[typography.body, { color: colors.text, fontWeight: '600', marginBottom: spacing.sm }]}>
                            Current Assets
                        </Text>

                        <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: spacing.sm, marginLeft: spacing.md }}>
                            <Text style={[typography.body, { color: colors.text }]}>Cash Received in Period</Text>
                            <Text style={[typography.body, { color: colors.success, fontWeight: '600' }]}>
                                {formatCompactCurrencyUGX(data?.assets.current.cashReceivedInPeriod || 0)}
                            </Text>
                        </View>

                        <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: spacing.sm, marginLeft: spacing.md }}>
                            <Text style={[typography.body, { color: colors.text }]}>Rent Receivable</Text>
                            <Text style={[typography.body, { color: colors.warning, fontWeight: '600' }]}>
                                {formatCompactCurrencyUGX(data?.assets.current.rentReceivableForPeriod || 0)}
                            </Text>
                        </View>

                        <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: spacing.md, marginLeft: spacing.md }}>
                            <Text style={[typography.body, { color: colors.text, fontWeight: '600' }]}>Total Current Assets</Text>
                            <Text style={[typography.body, { color: colors.primary, fontWeight: '600' }]}>
                                {formatCompactCurrencyUGX(data?.assets.current.totalCurrentAssets || 0)}
                            </Text>
                        </View>

                        {/* Non-Current Assets */}
                        <Text style={[typography.body, { color: colors.text, fontWeight: '600', marginBottom: spacing.sm }]}>
                            Non-Current Assets
                        </Text>

                        <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: spacing.sm, marginLeft: spacing.md }}>
                            <Text style={[typography.body, { color: colors.text }]}>Property, Plant & Equipment</Text>
                            <Text style={[typography.body, { color: colors.textSecondary }]}>
                                {formatCompactCurrencyUGX(data?.assets.nonCurrent.propertyPlantEquipment || 0)}
                            </Text>
                        </View>

                        <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: spacing.sm, marginLeft: spacing.md }}>
                            <Text style={[typography.body, { color: colors.text, fontWeight: '600' }]}>Total Non-Current Assets</Text>
                            <Text style={[typography.body, { color: colors.textSecondary, fontWeight: '600' }]}>
                                {formatCompactCurrencyUGX(data?.assets.nonCurrent.totalNonCurrentAssets || 0)}
                            </Text>
                        </View>

                        <Text style={[typography.bodySmall, { color: colors.textSecondary, marginLeft: spacing.md, fontStyle: 'italic' }]}>
                            {data?.assets.nonCurrent.description}
                        </Text>

                        <View style={{ height: 2, backgroundColor: colors.primary, marginVertical: spacing.md }} />

                        <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                            <Text style={[typography.h3, { color: colors.text }]}>Total Assets</Text>
                            <Text style={[typography.h3, { color: colors.primary }]}>
                                {formatCompactCurrencyUGX(data?.assets.totalAssets || 0)}
                            </Text>
                        </View>
                    </Card>

                    {/* Liabilities Section */}
                    <Card style={{ marginBottom: spacing.lg, padding: spacing.lg }}>
                        <Text style={[typography.h3, { color: colors.text, marginBottom: spacing.md }]}>
                            Liabilities
                        </Text>

                        {/* Current Liabilities */}
                        <Text style={[typography.body, { color: colors.text, fontWeight: '600', marginBottom: spacing.sm }]}>
                            Current Liabilities
                        </Text>

                        <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: spacing.sm, marginLeft: spacing.md }}>
                            <Text style={[typography.body, { color: colors.text }]}>Accounts Payable</Text>
                            <Text style={[typography.body, { color: colors.textSecondary }]}>
                                {formatCompactCurrencyUGX(data?.liabilities.current.accountsPayable || 0)}
                            </Text>
                        </View>

                        <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: spacing.md, marginLeft: spacing.md }}>
                            <Text style={[typography.body, { color: colors.text, fontWeight: '600' }]}>Total Current Liabilities</Text>
                            <Text style={[typography.body, { color: colors.textSecondary, fontWeight: '600' }]}>
                                {formatCompactCurrencyUGX(data?.liabilities.current.totalCurrentLiabilities || 0)}
                            </Text>
                        </View>

                        {/* Non-Current Liabilities */}
                        <Text style={[typography.body, { color: colors.text, fontWeight: '600', marginBottom: spacing.sm }]}>
                            Non-Current Liabilities
                        </Text>

                        <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: spacing.sm, marginLeft: spacing.md }}>
                            <Text style={[typography.body, { color: colors.text }]}>Long-term Debt</Text>
                            <Text style={[typography.body, { color: colors.textSecondary }]}>
                                {formatCompactCurrencyUGX(data?.liabilities.nonCurrent.longTermDebt || 0)}
                            </Text>
                        </View>

                        <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: spacing.sm, marginLeft: spacing.md }}>
                            <Text style={[typography.body, { color: colors.text, fontWeight: '600' }]}>Total Non-Current Liabilities</Text>
                            <Text style={[typography.body, { color: colors.textSecondary, fontWeight: '600' }]}>
                                {formatCompactCurrencyUGX(data?.liabilities.nonCurrent.totalNonCurrentLiabilities || 0)}
                            </Text>
                        </View>

                        <Text style={[typography.bodySmall, { color: colors.textSecondary, marginLeft: spacing.md, fontStyle: 'italic' }]}>
                            {data?.liabilities.description}
                        </Text>

                        <View style={{ height: 1, backgroundColor: colors.border, marginVertical: spacing.md }} />

                        <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                            <Text style={[typography.body, { color: colors.text, fontWeight: '600' }]}>Total Liabilities</Text>
                            <Text style={[typography.body, { color: colors.textSecondary, fontWeight: '600' }]}>
                                {formatCompactCurrencyUGX(data?.liabilities.totalLiabilities || 0)}
                            </Text>
                        </View>
                    </Card>

                    {/* Equity Section */}
                    <Card style={{ marginBottom: spacing.lg, padding: spacing.lg }}>
                        <Text style={[typography.h3, { color: colors.text, marginBottom: spacing.md }]}>
                            Equity
                        </Text>

                        <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: spacing.sm }}>
                            <Text style={[typography.body, { color: colors.text }]}>Retained Earnings</Text>
                            <Text style={[typography.body, { color: colors.success, fontWeight: '600' }]}>
                                {formatCompactCurrencyUGX(data?.equity.retainedEarnings || 0)}
                            </Text>
                        </View>

                        <View style={{ height: 1, backgroundColor: colors.border, marginVertical: spacing.sm }} />

                        <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                            <Text style={[typography.body, { color: colors.text, fontWeight: '600' }]}>Total Equity</Text>
                            <Text style={[typography.body, { color: colors.success, fontWeight: '600' }]}>
                                {formatCompactCurrencyUGX(data?.equity.totalEquity || 0)}
                            </Text>
                        </View>
                    </Card>

                    {/* Balance Check */}
                    <Card style={{ marginBottom: spacing.lg, padding: spacing.lg, backgroundColor: colors.primary + '10' }}>
                        <Text style={[typography.h3, { color: colors.text, marginBottom: spacing.md }]}>
                            Balance Check
                        </Text>

                        <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: spacing.sm }}>
                            <Text style={[typography.body, { color: colors.text }]}>Total Assets</Text>
                            <Text style={[typography.body, { color: colors.primary, fontWeight: '600' }]}>
                                {formatCompactCurrencyUGX(totalAssets)}
                            </Text>
                        </View>

                        <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: spacing.sm }}>
                            <Text style={[typography.body, { color: colors.text }]}>Total Liabilities + Equity</Text>
                            <Text style={[typography.body, { color: colors.primary, fontWeight: '600' }]}>
                                {formatCompactCurrencyUGX(totalLiabilitiesAndEquity)}
                            </Text>
                        </View>

                        <View style={{ height: 2, backgroundColor: colors.primary, marginVertical: spacing.sm }} />

                        <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                            <Text style={[typography.body, { color: colors.text, fontWeight: '600' }]}>Balance</Text>
                            <Text style={[typography.body, { color: isBalanced ? colors.success : colors.error, fontWeight: '600' }]}>
                                {isBalanced ? '✓ Balanced' : `⚠ Not balanced (${formatCompactCurrencyUGX(balanceDifference)})`}
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
                title="Financial Position"
                html={previewHtml}
                fileName={previewFileName}
                onClose={() => setShowPreviewModal(false)}
            />
        </View>
    );
};
