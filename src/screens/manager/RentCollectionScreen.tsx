import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, TouchableOpacity, ActivityIndicator, Alert } from 'react-native';
import { useTheme } from '../../theme/ThemeContext';
import { Ionicons } from '@expo/vector-icons';
import { useRentCollection } from '../../hooks/useManagerFinance';
import { useProperties } from '../../context/PropertyContext';
import { formatCompactCurrencyUGX } from '../../utils/formatters';
import { Card } from '../../components/Card';
import { PageHeader } from '../../components/PageHeader';
import { FilterChips } from '../../components/FilterChips';
import { PdfExportPreviewModal } from '../../components/PdfExportPreviewModal';
import { buildRentCollectionHtml } from '../../utils/pdfReports';
import { useManagerEnforcement } from '../../hooks/useManagerEnforcement';
import { handleEnforcement } from '../../utils/enforcementNavigation';

export const RentCollectionScreen: React.FC<any> = ({ navigation }) => {
    const { colors, spacing, typography } = useTheme();
    const { properties } = useProperties();
    const [selectedPeriod, setSelectedPeriod] = useState<string>();
    const [selectedPropertyId, setSelectedPropertyId] = useState<string>();
    const [exportLoading, setExportLoading] = useState(false);
    const [showPreviewModal, setShowPreviewModal] = useState(false);
    const [previewHtml, setPreviewHtml] = useState('');
    const [previewFileName, setPreviewFileName] = useState('');

    const { checkEnforcement, checking: checkingEnforcement } = useManagerEnforcement();
    const { data, loading, error, refetch } = useRentCollection(selectedPeriod, selectedPropertyId);

    // Check enforcement on screen load
    useEffect(() => {
        const checkTermsOnLoad = async () => {
            const { canProceed, enforcement } = await checkEnforcement('Rent Collection');

            if (!canProceed && enforcement) {
                if (__DEV__) {
                    console.log('[RentCollectionScreen] Enforcement blocked access');
                }
                // Navigate to billing/terms screen
                await handleEnforcement(navigation, enforcement, { blockedFeature: 'Rent Collection' });
                return;
            }
        };

        checkTermsOnLoad();
    }, []);

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

    const handlePeriodChange = (period: string) => {
        setSelectedPeriod(period);
        refetch(period, selectedPropertyId);
    };

    const handlePropertyChange = (propertyId: string) => {
        const newPropertyId = propertyId === 'all' ? undefined : propertyId;
        setSelectedPropertyId(newPropertyId);
        refetch(selectedPeriod, newPropertyId);
    };

    const handleExportPDF = () => {
        if (!data) {
            Alert.alert('Export Error', 'No data available to export');
            return;
        }

        try {
            const propertyName = selectedPropertyId
                ? properties.find(p => p.id === selectedPropertyId)?.name || 'Selected Property'
                : 'All Properties';
            const period = selectedPeriod || getCurrentPeriod();

            const { html, fileName } = buildRentCollectionHtml(data, {
                period: `Period: ${period}`,
                propertyName,
                generatedAt: new Date().toLocaleString(),
            });

            setPreviewHtml(html);
            setPreviewFileName(fileName);
            setShowPreviewModal(true);
        } catch (error) {
            Alert.alert('Export Failed', 'Failed to generate PDF preview. Please try again.');
        }
    };


    const formatDate = (dateString: string) => {
        return new Date(dateString).toLocaleDateString('en-UG', {
            day: 'numeric',
            month: 'short',
            year: 'numeric'
        });
    };

    const renderPropertyItem = ({ item }: { item: any }) => (
        <Card style={{ marginBottom: spacing.md, padding: spacing.md }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                <View style={{ flex: 1 }}>
                    <Text style={[typography.body, { color: colors.text, fontWeight: '600' }]}>
                        {item.propertyName}
                    </Text>
                    <Text style={[typography.bodySmall, { color: colors.textSecondary, marginTop: spacing.xs }]}>
                        Expected: {formatCompactCurrencyUGX(item.expectedRent)}
                    </Text>
                    <Text style={[typography.bodySmall, { color: colors.success, marginTop: spacing.xs }]}>
                        Collected: {formatCompactCurrencyUGX(item.collectedRent)}
                    </Text>
                </View>
                <View style={{ alignItems: 'flex-end' }}>
                    <Text style={[typography.h4, { color: item.collectionRate >= 100 ? colors.success : colors.warning }]}>
                        {item.collectionRate}%
                    </Text>
                    <Text style={[typography.bodySmall, { color: colors.textSecondary }]}>
                        Collection Rate
                    </Text>
                </View>
            </View>
        </Card>
    );

    const renderPaymentItem = ({ item }: { item: any }) => (
        <Card style={{ marginBottom: spacing.sm, padding: spacing.md }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                <View style={{ flex: 1 }}>
                    <Text style={[typography.body, { color: colors.text, fontWeight: '600' }]}>
                        {item.tenantName}
                    </Text>
                    <Text style={[typography.bodySmall, { color: colors.textSecondary }]}>
                        {item.propertyName} - Unit {item.unitNumber}
                    </Text>
                    <Text style={[typography.bodySmall, { color: colors.textSecondary }]}>
                        {formatDate(item.paymentDate)}
                    </Text>
                </View>
                <View style={{ alignItems: 'flex-end' }}>
                    <Text style={[typography.body, { color: colors.success, fontWeight: '600' }]}>
                        {formatCompactCurrencyUGX(item.amount)}
                    </Text>
                    <View style={{
                        backgroundColor: colors.success + '20',
                        paddingHorizontal: spacing.sm,
                        paddingVertical: spacing.xs,
                        borderRadius: 12,
                        marginTop: spacing.xs
                    }}>
                        <Text style={[typography.bodySmall, { color: colors.success }]}>
                            {item.status}
                        </Text>
                    </View>
                </View>
            </View>
        </Card>
    );

    if (loading) {
        return (
            <View style={{ flex: 1, backgroundColor: colors.background }}>
                <PageHeader
                    title="Rent collection"
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
                        Loading rent collection data...
                    </Text>
                </View>
            </View>
        );
    }

    return (
        <View style={{ flex: 1, backgroundColor: colors.background }}>
            <PageHeader
                title="Rent collection"
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
                                onSelect={(value) => handlePeriodChange(value || currentPeriod)}
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
                                onSelect={(value) => handlePropertyChange(value || 'all')}
                                allowClear={false}
                            />
                        </View>
                    </Card>

                    {/* Hero Card - Total Collected */}
                    <Card style={{ marginBottom: spacing.lg, padding: spacing.xl }}>
                        <View style={{ alignItems: 'center' }}>
                            <Ionicons name="cash" size={48} color={colors.success} style={{ marginBottom: spacing.md }} />
                            <Text style={[typography.h1, { color: colors.success, textAlign: 'center', marginBottom: spacing.xs }]}>
                                {formatCompactCurrencyUGX(data?.totalCollected || 0)}
                            </Text>
                            <Text style={[typography.body, { color: colors.textSecondary, textAlign: 'center' }]}>
                                Total Collected
                            </Text>
                        </View>
                    </Card>

                    {/* Property Breakdown */}
                    <View style={{ marginBottom: spacing.lg }}>
                        <Text style={[typography.h3, { color: colors.text, marginBottom: spacing.md }]}>
                            By Property
                        </Text>
                        {data?.byProperty && data.byProperty.length > 0 ? (
                            <>
                                {data.byProperty.map((item) => (
                                    <View key={item.propertyId}>
                                        {renderPropertyItem({ item })}
                                    </View>
                                ))}
                            </>
                        ) : (
                            <Card style={{ padding: spacing.lg }}>
                                <Text style={[typography.body, { color: colors.textSecondary, textAlign: 'center' }]}>
                                    No properties found for this period
                                </Text>
                            </Card>
                        )}
                    </View>

                    {/* Recent Payments */}
                    <View style={{ marginBottom: spacing.lg }}>
                        <Text style={[typography.h3, { color: colors.text, marginBottom: spacing.md }]}>
                            Recent Payments
                        </Text>
                        {data?.recentPayments && data.recentPayments.length > 0 ? (
                            <>
                                {data.recentPayments.map((item) => (
                                    <View key={item.id}>
                                        {renderPaymentItem({ item })}
                                    </View>
                                ))}
                            </>
                        ) : (
                            <Card style={{ padding: spacing.lg }}>
                                <Text style={[typography.body, { color: colors.textSecondary, textAlign: 'center' }]}>
                                    No recent payments found
                                </Text>
                            </Card>
                        )}
                    </View>

                    {/* Financial Reports Navigation */}
                    <View style={{ marginBottom: spacing.xl }}>
                        <Text style={[typography.h3, { color: colors.text, marginBottom: spacing.md }]}>
                            Financial Reports
                        </Text>

                        <Card style={{ marginBottom: spacing.sm }}>
                            <TouchableOpacity
                                onPress={() => navigation.navigate('IncomeStatement')}
                                style={{ padding: spacing.md }}
                            >
                                <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                                    <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                                        <Ionicons name="document-text-outline" size={20} color={colors.primary} style={{ marginRight: spacing.md }} />
                                        <Text style={[typography.body, { color: colors.text }]}>Income Statement</Text>
                                    </View>
                                    <Ionicons name="chevron-forward" size={16} color={colors.textSecondary} />
                                </View>
                            </TouchableOpacity>
                        </Card>

                        <Card style={{ marginBottom: spacing.sm }}>
                            <TouchableOpacity
                                onPress={() => navigation.navigate('FinancialPosition')}
                                style={{ padding: spacing.md }}
                            >
                                <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                                    <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                                        <Ionicons name="analytics-outline" size={20} color={colors.primary} style={{ marginRight: spacing.md }} />
                                        <Text style={[typography.body, { color: colors.text }]}>Financial Position</Text>
                                    </View>
                                    <Ionicons name="chevron-forward" size={16} color={colors.textSecondary} />
                                </View>
                            </TouchableOpacity>
                        </Card>

                        <Card>
                            <TouchableOpacity
                                onPress={() => navigation.navigate('CashflowStatement')}
                                style={{ padding: spacing.md }}
                            >
                                <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                                    <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                                        <Ionicons name="cash-outline" size={20} color={colors.primary} style={{ marginRight: spacing.md }} />
                                        <Text style={[typography.body, { color: colors.text }]}>Cashflow Statement</Text>
                                    </View>
                                    <Ionicons name="chevron-forward" size={16} color={colors.textSecondary} />
                                </View>
                            </TouchableOpacity>
                        </Card>
                    </View>
                </View>
            </ScrollView>

            <PdfExportPreviewModal
                visible={showPreviewModal}
                title="Rent Collection Report"
                html={previewHtml}
                fileName={previewFileName}
                onClose={() => setShowPreviewModal(false)}
            />
        </View>
    );
};
