import React, { useState } from 'react';
import { View, Text, TouchableOpacity, ScrollView, FlatList, ActivityIndicator, Alert } from 'react-native';
import { Picker } from '@react-native-picker/picker';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '../../theme/ThemeContext';
import { Ionicons } from '@expo/vector-icons';
import { useRentCollection } from '../../hooks/useManagerFinance';
import { useProperties } from '../../context/PropertyContext';
import { Card } from '../../components/Card';
import { PdfExportPreviewModal } from '../../components/PdfExportPreviewModal';
import { buildRentCollectionHtml } from '../../utils/pdfReports';

export const RentCollectionScreen: React.FC<any> = ({ navigation }) => {
    const { colors, spacing, typography } = useTheme();
    const { properties } = useProperties();
    const [selectedPeriod, setSelectedPeriod] = useState<string>();
    const [selectedPropertyId, setSelectedPropertyId] = useState<string>();
    const [exportLoading, setExportLoading] = useState(false);
    const [showPreviewModal, setShowPreviewModal] = useState(false);
    const [previewHtml, setPreviewHtml] = useState('');
    const [previewFileName, setPreviewFileName] = useState('');

    const { data, loading, error, refetch } = useRentCollection(selectedPeriod, selectedPropertyId);

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

    const formatCurrency = (amount: number) => {
        return `UGX ${(amount / 1000000).toFixed(1)}M`;
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
                        Expected: {formatCurrency(item.expectedRent)}
                    </Text>
                    <Text style={[typography.bodySmall, { color: colors.success, marginTop: spacing.xs }]}>
                        Collected: {formatCurrency(item.collectedRent)}
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
                        {formatCurrency(item.amount)}
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
            <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }}>
                <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
                    <ActivityIndicator size="large" color={colors.primary} />
                    <Text style={[typography.body, { color: colors.textSecondary, marginTop: spacing.md }]}>
                        Loading rent collection data...
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
                                Rent Collection
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

                    {/* Filter Controls */}
                    <Card style={{ marginBottom: spacing.lg, padding: spacing.md }}>
                        <Text style={[typography.body, { color: colors.text, fontWeight: '600', marginBottom: spacing.md }]}>Filters</Text>

                        <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                            <View style={{ flex: 1, marginRight: spacing.sm }}>
                                <Text style={[typography.bodySmall, { color: colors.textSecondary, marginBottom: spacing.xs }]}>Period</Text>
                                <View style={{
                                    borderWidth: 1,
                                    borderColor: colors.border,
                                    borderRadius: 8,
                                    backgroundColor: colors.surface
                                }}>
                                    <Picker
                                        selectedValue={selectedPeriod || currentPeriod}
                                        onValueChange={handlePeriodChange}
                                        style={{ color: colors.text }}
                                    >
                                        {periodOptions.map((option) => (
                                            <Picker.Item
                                                key={option.value}
                                                label={option.label}
                                                value={option.value}
                                            />
                                        ))}
                                    </Picker>
                                </View>
                            </View>

                            <View style={{ flex: 1, marginLeft: spacing.sm }}>
                                <Text style={[typography.bodySmall, { color: colors.textSecondary, marginBottom: spacing.xs }]}>Property</Text>
                                <View style={{
                                    borderWidth: 1,
                                    borderColor: colors.border,
                                    borderRadius: 8,
                                    backgroundColor: colors.surface
                                }}>
                                    <Picker
                                        selectedValue={selectedPropertyId || 'all'}
                                        onValueChange={handlePropertyChange}
                                        style={{ color: colors.text }}
                                    >
                                        <Picker.Item label="All Properties" value="all" />
                                        {properties.map((property) => (
                                            <Picker.Item
                                                key={property.id}
                                                label={property.name}
                                                value={property.id}
                                            />
                                        ))}
                                    </Picker>
                                </View>
                            </View>
                        </View>
                    </Card>

                    {/* Total Collected Summary */}
                    <Card style={{ marginBottom: spacing.lg, padding: spacing.lg }}>
                        <View style={{ alignItems: 'center' }}>
                            <View style={{
                                backgroundColor: colors.success + '20',
                                width: 80,
                                height: 80,
                                borderRadius: 40,
                                alignItems: 'center',
                                justifyContent: 'center',
                                marginBottom: spacing.md
                            }}>
                                <Ionicons name="cash" size={40} color={colors.success} />
                            </View>
                            <Text style={[typography.h1, { color: colors.success, textAlign: 'center' }]}>
                                {formatCurrency(data?.totalCollected || 0)}
                            </Text>
                            <Text style={[typography.body, { color: colors.textSecondary, textAlign: 'center' }]}>
                                Total Rent Collected
                            </Text>
                        </View>
                    </Card>

                    {/* Property Breakdown */}
                    <View style={{ marginBottom: spacing.lg }}>
                        <Text style={[typography.h3, { color: colors.text, marginBottom: spacing.md }]}>
                            By Property
                        </Text>
                        {data?.byProperty && data.byProperty.length > 0 ? (
                            <FlatList
                                data={data.byProperty}
                                renderItem={renderPropertyItem}
                                keyExtractor={(item) => item.propertyId}
                                scrollEnabled={false}
                            />
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
                            <FlatList
                                data={data.recentPayments}
                                renderItem={renderPaymentItem}
                                keyExtractor={(item) => item.id}
                                scrollEnabled={false}
                            />
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

                        <TouchableOpacity
                            onPress={() => navigation.navigate('IncomeStatement')}
                            style={{
                                backgroundColor: colors.surface,
                                padding: spacing.md,
                                borderRadius: 12,
                                marginBottom: spacing.sm,
                                borderWidth: 1,
                                borderColor: colors.border,
                            }}
                        >
                            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                                    <Ionicons name="document-text-outline" size={20} color={colors.primary} style={{ marginRight: spacing.md }} />
                                    <Text style={[typography.body, { color: colors.text }]}>Income Statement</Text>
                                </View>
                                <Ionicons name="chevron-forward" size={16} color={colors.textSecondary} />
                            </View>
                        </TouchableOpacity>

                        <TouchableOpacity
                            onPress={() => navigation.navigate('FinancialPosition')}
                            style={{
                                backgroundColor: colors.surface,
                                padding: spacing.md,
                                borderRadius: 12,
                                marginBottom: spacing.sm,
                                borderWidth: 1,
                                borderColor: colors.border,
                            }}
                        >
                            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                                    <Ionicons name="analytics-outline" size={20} color={colors.primary} style={{ marginRight: spacing.md }} />
                                    <Text style={[typography.body, { color: colors.text }]}>Financial Position</Text>
                                </View>
                                <Ionicons name="chevron-forward" size={16} color={colors.textSecondary} />
                            </View>
                        </TouchableOpacity>

                        <TouchableOpacity
                            onPress={() => navigation.navigate('CashflowStatement')}
                            style={{
                                backgroundColor: colors.surface,
                                padding: spacing.md,
                                borderRadius: 12,
                                marginBottom: spacing.sm,
                                borderWidth: 1,
                                borderColor: colors.border,
                            }}
                        >
                            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                                    <Ionicons name="cash-outline" size={20} color={colors.primary} style={{ marginRight: spacing.md }} />
                                    <Text style={[typography.body, { color: colors.text }]}>Cashflow Statement</Text>
                                </View>
                                <Ionicons name="chevron-forward" size={16} color={colors.textSecondary} />
                            </View>
                        </TouchableOpacity>
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
        </SafeAreaView>
    );
};
