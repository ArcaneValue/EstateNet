import React, { useState } from 'react';
import { View, Text, TouchableOpacity, ScrollView, ActivityIndicator, Alert } from 'react-native';
import { Picker } from '@react-native-picker/picker';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '../../theme/ThemeContext';
import { Ionicons } from '@expo/vector-icons';
import { useFinancialPosition } from '../../hooks/useManagerFinance';
import { useProperties } from '../../context/PropertyContext';
import { Card } from '../../components/Card';
import { PdfExportPreviewModal } from '../../components/PdfExportPreviewModal';
import { buildFinancialPositionHtml } from '../../utils/pdfReports';

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

    const formatCurrency = (amount: number) => {
        return `UGX ${(amount / 1000000).toFixed(1)}M`;
    };

    const getRecentPeriods = () => {
        const periods: string[] = [];
        const now = new Date();
        for (let i = 0; i < 6; i++) {
            const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
            periods.push(`${date.getFullYear()}-${(date.getMonth() + 1).toString().padStart(2, '0')}`);
        }
        return periods;
    };

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
            <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }}>
                <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
                    <ActivityIndicator size="large" color={colors.primary} />
                    <Text style={[typography.body, { color: colors.textSecondary, marginTop: spacing.md }]}>
                        Loading financial position...
                    </Text>
                </View>
            </SafeAreaView>
        );
    }

    if (error) {
        return (
            <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }}>
                <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', padding: spacing.lg }}>
                    <Ionicons name="alert-circle" size={48} color={colors.error} />
                    <Text style={[typography.h3, { color: colors.error, marginTop: spacing.md, textAlign: 'center' }]}>
                        Error Loading Data
                    </Text>
                    <Text style={[typography.body, { color: colors.textSecondary, marginTop: spacing.sm, textAlign: 'center' }]}>
                        {error}
                    </Text>
                    <TouchableOpacity
                        onPress={() => refetch(selectedPeriod, selectedPropertyId)}
                        style={{
                            backgroundColor: colors.primary,
                            paddingHorizontal: spacing.lg,
                            paddingVertical: spacing.md,
                            borderRadius: 8,
                            marginTop: spacing.lg
                        }}
                    >
                        <Text style={[typography.body, { color: colors.background, fontWeight: '600' }]}>Retry</Text>
                    </TouchableOpacity>
                </View>
            </SafeAreaView>
        );
    }

    return (
        <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }}>
            <ScrollView style={{ flex: 1 }} showsVerticalScrollIndicator={false}>
                <View style={{ padding: spacing.base }}>
                    {/* Header with Back Button */}
                    <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: spacing.lg }}>
                        <TouchableOpacity
                            onPress={() => navigation.goBack()}
                            style={{ marginRight: spacing.md }}
                        >
                            <Ionicons name="arrow-back" size={24} color={colors.text} />
                        </TouchableOpacity>
                        <View style={{ flex: 1 }}>
                            <Text style={[typography.h2, { color: colors.text }]}>
                                Financial Position
                            </Text>
                            <Text style={[typography.body, { color: colors.textSecondary, marginTop: spacing.sm }]}>
                                Period: {data?.period || getCurrentPeriod()}
                            </Text>
                        </View>
                        <TouchableOpacity
                            onPress={handleExportPDF}
                            disabled={exportLoading || !data}
                            style={{
                                backgroundColor: exportLoading || !data ? colors.border : colors.primary,
                                paddingHorizontal: spacing.md,
                                paddingVertical: spacing.sm,
                                borderRadius: 8,
                                flexDirection: 'row',
                                alignItems: 'center'
                            }}
                        >
                            {exportLoading ? (
                                <ActivityIndicator size="small" color={colors.background} style={{ marginRight: spacing.xs }} />
                            ) : (
                                <Ionicons name="download-outline" size={16} color={colors.background} style={{ marginRight: spacing.xs }} />
                            )}
                            <Text style={[typography.bodySmall, { color: colors.background }]}>
                                {exportLoading ? 'Exporting...' : 'Export PDF'}
                            </Text>
                        </TouchableOpacity>
                    </View>

                    <Card style={{ marginBottom: spacing.md, padding: spacing.md, backgroundColor: colors.warning + '15' }}>
                        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                            <Ionicons name="warning-outline" size={18} color={colors.warning} style={{ marginRight: spacing.sm }} />
                            <Text style={[typography.bodySmall, { color: colors.text, flex: 1 }]}>Simplified statement (cash + receivables focus).</Text>
                        </View>
                    </Card>

                    <Card style={{ marginBottom: spacing.lg, padding: spacing.md }}>
                        <Text style={[typography.body, { color: colors.text, fontWeight: '600', marginBottom: spacing.sm }]}>Period</Text>
                        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: spacing.md }}>
                            <TouchableOpacity
                                onPress={() => applyFilters(undefined, selectedPropertyId)}
                                style={{
                                    backgroundColor: !selectedPeriod ? colors.primary : colors.surface,
                                    borderWidth: 1,
                                    borderColor: colors.border,
                                    paddingHorizontal: spacing.md,
                                    paddingVertical: spacing.sm,
                                    borderRadius: 20,
                                    marginRight: spacing.sm,
                                }}
                            >
                                <Text style={[typography.bodySmall, { color: !selectedPeriod ? colors.background : colors.text }]}>Current</Text>
                            </TouchableOpacity>
                            {getRecentPeriods().map((period) => (
                                <TouchableOpacity
                                    key={period}
                                    onPress={() => applyFilters(period, selectedPropertyId)}
                                    style={{
                                        backgroundColor: selectedPeriod === period ? colors.primary : colors.surface,
                                        borderWidth: 1,
                                        borderColor: colors.border,
                                        paddingHorizontal: spacing.md,
                                        paddingVertical: spacing.sm,
                                        borderRadius: 20,
                                        marginRight: spacing.sm,
                                    }}
                                >
                                    <Text style={[typography.bodySmall, { color: selectedPeriod === period ? colors.background : colors.text }]}>{period}</Text>
                                </TouchableOpacity>
                            ))}
                        </ScrollView>

                        <Text style={[typography.body, { color: colors.text, fontWeight: '600', marginBottom: spacing.sm }]}>Property</Text>
                        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                            <TouchableOpacity
                                onPress={() => applyFilters(selectedPeriod, undefined)}
                                style={{
                                    backgroundColor: !selectedPropertyId ? colors.primary : colors.surface,
                                    borderWidth: 1,
                                    borderColor: colors.border,
                                    paddingHorizontal: spacing.md,
                                    paddingVertical: spacing.sm,
                                    borderRadius: 20,
                                    marginRight: spacing.sm,
                                }}
                            >
                                <Text style={[typography.bodySmall, { color: !selectedPropertyId ? colors.background : colors.text }]}>All Properties</Text>
                            </TouchableOpacity>
                            {properties.map((property) => (
                                <TouchableOpacity
                                    key={property.id}
                                    onPress={() => applyFilters(selectedPeriod, property.id)}
                                    style={{
                                        backgroundColor: selectedPropertyId === property.id ? colors.primary : colors.surface,
                                        borderWidth: 1,
                                        borderColor: colors.border,
                                        paddingHorizontal: spacing.md,
                                        paddingVertical: spacing.sm,
                                        borderRadius: 20,
                                        marginRight: spacing.sm,
                                    }}
                                >
                                    <Text style={[typography.bodySmall, { color: selectedPropertyId === property.id ? colors.background : colors.text }]}>{property.name}</Text>
                                </TouchableOpacity>
                            ))}
                        </ScrollView>
                    </Card>

                    {/* Total Assets Summary */}
                    <Card style={{ marginBottom: spacing.lg, padding: spacing.lg }}>
                        <View style={{ alignItems: 'center' }}>
                            <View style={{
                                backgroundColor: colors.primary + '20',
                                width: 80,
                                height: 80,
                                borderRadius: 40,
                                alignItems: 'center',
                                justifyContent: 'center',
                                marginBottom: spacing.md
                            }}>
                                <Ionicons name="pie-chart" size={40} color={colors.primary} />
                            </View>
                            <Text style={[typography.h1, { color: colors.primary, textAlign: 'center' }]}>
                                {formatCurrency(data?.assets.totalAssets || 0)}
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
                                {formatCurrency(data?.assets.current.cashReceivedInPeriod || 0)}
                            </Text>
                        </View>

                        <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: spacing.sm, marginLeft: spacing.md }}>
                            <Text style={[typography.body, { color: colors.text }]}>Rent Receivable</Text>
                            <Text style={[typography.body, { color: colors.warning, fontWeight: '600' }]}>
                                {formatCurrency(data?.assets.current.rentReceivableForPeriod || 0)}
                            </Text>
                        </View>

                        <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: spacing.md, marginLeft: spacing.md }}>
                            <Text style={[typography.body, { color: colors.text, fontWeight: '600' }]}>Total Current Assets</Text>
                            <Text style={[typography.body, { color: colors.primary, fontWeight: '600' }]}>
                                {formatCurrency(data?.assets.current.totalCurrentAssets || 0)}
                            </Text>
                        </View>

                        {/* Non-Current Assets */}
                        <Text style={[typography.body, { color: colors.text, fontWeight: '600', marginBottom: spacing.sm }]}>
                            Non-Current Assets
                        </Text>

                        <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: spacing.sm, marginLeft: spacing.md }}>
                            <Text style={[typography.body, { color: colors.text }]}>Property, Plant & Equipment</Text>
                            <Text style={[typography.body, { color: colors.textSecondary }]}>
                                {formatCurrency(data?.assets.nonCurrent.propertyPlantEquipment || 0)}
                            </Text>
                        </View>

                        <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: spacing.sm, marginLeft: spacing.md }}>
                            <Text style={[typography.body, { color: colors.text, fontWeight: '600' }]}>Total Non-Current Assets</Text>
                            <Text style={[typography.body, { color: colors.textSecondary, fontWeight: '600' }]}>
                                {formatCurrency(data?.assets.nonCurrent.totalNonCurrentAssets || 0)}
                            </Text>
                        </View>

                        <Text style={[typography.bodySmall, { color: colors.textSecondary, marginLeft: spacing.md, fontStyle: 'italic' }]}>
                            {data?.assets.nonCurrent.description}
                        </Text>

                        <View style={{ height: 2, backgroundColor: colors.primary, marginVertical: spacing.md }} />

                        <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                            <Text style={[typography.h3, { color: colors.text }]}>Total Assets</Text>
                            <Text style={[typography.h3, { color: colors.primary }]}>
                                {formatCurrency(data?.assets.totalAssets || 0)}
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
                                {formatCurrency(data?.liabilities.current.accountsPayable || 0)}
                            </Text>
                        </View>

                        <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: spacing.md, marginLeft: spacing.md }}>
                            <Text style={[typography.body, { color: colors.text, fontWeight: '600' }]}>Total Current Liabilities</Text>
                            <Text style={[typography.body, { color: colors.textSecondary, fontWeight: '600' }]}>
                                {formatCurrency(data?.liabilities.current.totalCurrentLiabilities || 0)}
                            </Text>
                        </View>

                        {/* Non-Current Liabilities */}
                        <Text style={[typography.body, { color: colors.text, fontWeight: '600', marginBottom: spacing.sm }]}>
                            Non-Current Liabilities
                        </Text>

                        <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: spacing.sm, marginLeft: spacing.md }}>
                            <Text style={[typography.body, { color: colors.text }]}>Long-term Debt</Text>
                            <Text style={[typography.body, { color: colors.textSecondary }]}>
                                {formatCurrency(data?.liabilities.nonCurrent.longTermDebt || 0)}
                            </Text>
                        </View>

                        <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: spacing.sm, marginLeft: spacing.md }}>
                            <Text style={[typography.body, { color: colors.text, fontWeight: '600' }]}>Total Non-Current Liabilities</Text>
                            <Text style={[typography.body, { color: colors.textSecondary, fontWeight: '600' }]}>
                                {formatCurrency(data?.liabilities.nonCurrent.totalNonCurrentLiabilities || 0)}
                            </Text>
                        </View>

                        <Text style={[typography.bodySmall, { color: colors.textSecondary, marginLeft: spacing.md, fontStyle: 'italic' }]}>
                            {data?.liabilities.description}
                        </Text>

                        <View style={{ height: 1, backgroundColor: colors.border, marginVertical: spacing.md }} />

                        <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                            <Text style={[typography.body, { color: colors.text, fontWeight: '600' }]}>Total Liabilities</Text>
                            <Text style={[typography.body, { color: colors.textSecondary, fontWeight: '600' }]}>
                                {formatCurrency(data?.liabilities.totalLiabilities || 0)}
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
                                {formatCurrency(data?.equity.retainedEarnings || 0)}
                            </Text>
                        </View>

                        <View style={{ height: 1, backgroundColor: colors.border, marginVertical: spacing.sm }} />

                        <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                            <Text style={[typography.body, { color: colors.text, fontWeight: '600' }]}>Total Equity</Text>
                            <Text style={[typography.body, { color: colors.success, fontWeight: '600' }]}>
                                {formatCurrency(data?.equity.totalEquity || 0)}
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
                                {formatCurrency(totalAssets)}
                            </Text>
                        </View>

                        <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: spacing.sm }}>
                            <Text style={[typography.body, { color: colors.text }]}>Total Liabilities + Equity</Text>
                            <Text style={[typography.body, { color: colors.primary, fontWeight: '600' }]}>
                                {formatCurrency(totalLiabilitiesAndEquity)}
                            </Text>
                        </View>

                        <View style={{ height: 2, backgroundColor: colors.primary, marginVertical: spacing.sm }} />

                        <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                            <Text style={[typography.body, { color: colors.text, fontWeight: '600' }]}>Balance</Text>
                            <Text style={[typography.body, { color: isBalanced ? colors.success : colors.error, fontWeight: '600' }]}>
                                {isBalanced ? '✓ Balanced' : `⚠ Not balanced (${formatCurrency(balanceDifference)})`}
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
        </SafeAreaView>
    );
};
