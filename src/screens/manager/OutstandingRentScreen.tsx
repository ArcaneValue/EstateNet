import React, { useState } from 'react';
import { View, Text, TouchableOpacity, ScrollView, FlatList, ActivityIndicator, Alert } from 'react-native';
import { Picker } from '@react-native-picker/picker';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '../../theme/ThemeContext';
import { Ionicons } from '@expo/vector-icons';
import { useOutstandingRent } from '../../hooks/useManagerFinance';
import { useProperties } from '../../context/PropertyContext';
import { Card } from '../../components/Card';
import { PdfExportPreviewModal } from '../../components/PdfExportPreviewModal';
import { buildOutstandingRentHtml } from '../../utils/pdfReports';

export const OutstandingRentScreen: React.FC<any> = ({ navigation }) => {
    const { colors, spacing, typography } = useTheme();
    const { properties } = useProperties();
    const [selectedPeriod, setSelectedPeriod] = useState<string>();
    const [selectedPropertyId, setSelectedPropertyId] = useState<string>();
    const [exportLoading, setExportLoading] = useState(false);
    const [showPreviewModal, setShowPreviewModal] = useState(false);
    const [previewHtml, setPreviewHtml] = useState('');
    const [previewFileName, setPreviewFileName] = useState('');

    const { data, loading, error, refetch } = useOutstandingRent(selectedPeriod, selectedPropertyId);

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

            const { html, fileName } = buildOutstandingRentHtml(data, {
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

    const formatDate = (dateString: string | null) => {
        if (!dateString) return 'No payments yet';
        return new Date(dateString).toLocaleDateString('en-UG', {
            day: 'numeric',
            month: 'short',
            year: 'numeric'
        });
    };

    const handleMessageTenant = (item: any) => {
        // Messaging feature not yet implemented
        Alert.alert(
            'Messaging Not Available',
            'The messaging feature is not yet implemented. Please contact tenants directly via phone or other means.',
            [{ text: 'OK', style: 'default' }]
        );
    };

    const renderOutstandingItem = ({ item }: { item: any }) => (
        <Card style={{ marginBottom: spacing.md, padding: spacing.md }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <View style={{ flex: 1, marginRight: spacing.md }}>
                    <Text style={[typography.body, { color: colors.text, fontWeight: '600' }]}>
                        {item.tenantName}
                    </Text>
                    <Text style={[typography.bodySmall, { color: colors.textSecondary, marginTop: spacing.xs }]}>
                        {item.propertyName} - Unit {item.unitNumber}
                    </Text>
                    {item.tenantPhone && (
                        <Text style={[typography.bodySmall, { color: colors.textSecondary, marginTop: spacing.xs }]}>
                            📞 {item.tenantPhone}
                        </Text>
                    )}
                    <Text style={[typography.bodySmall, { color: colors.textSecondary, marginTop: spacing.xs }]}>
                        Expected: {formatCurrency(item.expectedRent)}
                    </Text>
                    <Text style={[typography.bodySmall, { color: colors.success, marginTop: spacing.xs }]}>
                        Paid: {formatCurrency(item.collectedRent)}
                    </Text>
                    <Text style={[typography.bodySmall, { color: colors.textSecondary, marginTop: spacing.xs }]}>
                        Last Payment: {formatDate(item.lastPaymentAt)}
                    </Text>
                </View>
                <View style={{ alignItems: 'flex-end' }}>
                    <Text style={[typography.h4, { color: colors.error, marginBottom: spacing.sm }]}>
                        {formatCurrency(item.amountOutstanding)}
                    </Text>
                    <TouchableOpacity
                        onPress={() => handleMessageTenant(item)}
                        style={{
                            backgroundColor: colors.primary,
                            paddingHorizontal: spacing.md,
                            paddingVertical: spacing.sm,
                            borderRadius: 8,
                            flexDirection: 'row',
                            alignItems: 'center'
                        }}
                    >
                        <Ionicons name="chatbubble-outline" size={16} color={colors.background} style={{ marginRight: spacing.xs }} />
                        <Text style={[typography.bodySmall, { color: colors.background }]}>Message</Text>
                    </TouchableOpacity>
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
                        Loading outstanding rent data...
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
                                Outstanding Rent
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

                    {/* Summary Cards */}
                    <View style={{ flexDirection: 'row', marginBottom: spacing.lg }}>
                        <Card style={{ flex: 1, marginRight: spacing.sm, padding: spacing.md }}>
                            <View style={{ alignItems: 'center' }}>
                                <View style={{
                                    backgroundColor: colors.error + '20',
                                    width: 60,
                                    height: 60,
                                    borderRadius: 30,
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    marginBottom: spacing.sm
                                }}>
                                    <Ionicons name="alert-circle" size={30} color={colors.error} />
                                </View>
                                <Text style={[typography.h3, { color: colors.error, textAlign: 'center' }]}>
                                    {formatCurrency(data?.totalOutstanding || 0)}
                                </Text>
                                <Text style={[typography.bodySmall, { color: colors.textSecondary, textAlign: 'center' }]}>
                                    Total Outstanding
                                </Text>
                            </View>
                        </Card>

                        <Card style={{ flex: 1, marginLeft: spacing.sm, padding: spacing.md }}>
                            <View style={{ alignItems: 'center' }}>
                                <View style={{
                                    backgroundColor: colors.warning + '20',
                                    width: 60,
                                    height: 60,
                                    borderRadius: 30,
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    marginBottom: spacing.sm
                                }}>
                                    <Ionicons name="people" size={30} color={colors.warning} />
                                </View>
                                <Text style={[typography.h3, { color: colors.warning, textAlign: 'center' }]}>
                                    {data?.overdueTenantsCount || 0}
                                </Text>
                                <Text style={[typography.bodySmall, { color: colors.textSecondary, textAlign: 'center' }]}>
                                    Overdue Tenants
                                </Text>
                            </View>
                        </Card>
                    </View>

                    {/* Outstanding Items List */}
                    <View style={{ marginBottom: spacing.lg }}>
                        <Text style={[typography.h3, { color: colors.text, marginBottom: spacing.md }]}>
                            Outstanding Payments
                        </Text>
                        {data?.items && data.items.length > 0 ? (
                            <FlatList
                                data={data.items}
                                renderItem={renderOutstandingItem}
                                keyExtractor={(item) => `${item.tenantId}-${item.unitId}`}
                                scrollEnabled={false}
                            />
                        ) : (
                            <Card style={{ padding: spacing.lg }}>
                                <View style={{ alignItems: 'center' }}>
                                    <Ionicons name="checkmark-circle" size={48} color={colors.success} style={{ marginBottom: spacing.md }} />
                                    <Text style={[typography.h3, { color: colors.success, textAlign: 'center', marginBottom: spacing.sm }]}>
                                        All Caught Up!
                                    </Text>
                                    <Text style={[typography.body, { color: colors.textSecondary, textAlign: 'center' }]}>
                                        No outstanding rent payments for this period
                                    </Text>
                                </View>
                            </Card>
                        )}
                    </View>
                </View>
            </ScrollView>

            <PdfExportPreviewModal
                visible={showPreviewModal}
                title="Outstanding Rent Report"
                html={previewHtml}
                fileName={previewFileName}
                onClose={() => setShowPreviewModal(false)}
            />
        </SafeAreaView>
    );
};
