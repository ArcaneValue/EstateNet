import React, { useState } from 'react';
import { View, Text, FlatList, TouchableOpacity, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '../../theme/ThemeContext';
import { Button } from '../../components/Button';
import { Card } from '../../components/Card';
import { PropertyListItem } from '../../components/PropertyListItem';
import { useProperties } from '../../context/PropertyContext';
import { usePayments } from '../../context/PaymentContext';
import { useTenants } from '../../context/TenantContext';
import { Ionicons } from '@expo/vector-icons';

export const RentCollectionScreen: React.FC<any> = ({ navigation }) => {
    const { colors, spacing, typography } = useTheme();
    const { properties } = useProperties();
    const { getRentCollectedByProperty, getPaymentsByProperty } = usePayments();
    const { getTenantsByProperty } = useTenants();
    const [selectedPropertyId, setSelectedPropertyId] = useState<string | null>(null);

    const selectedProperty = properties.find(p => p.id === selectedPropertyId);
    const propertyPayments = selectedPropertyId ? getPaymentsByProperty(selectedPropertyId) : [];

    const renderHeader = () => {
        if (!selectedPropertyId) {
            return (
                <View>
                    {/* Header with Back Button */}
                    <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: spacing.lg }}>
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
                            <Text style={[typography.body, { color: colors.textSecondary, marginTop: spacing.xs }]}>
                                Track rent collected by property
                            </Text>
                        </View>
                    </View>

                    {/* Financial Statement Buttons */}
                    <View style={{ marginBottom: spacing.lg }}>
                        <Text style={[typography.h4, { color: colors.text, marginBottom: spacing.md }]}>
                            Financial Reports
                        </Text>
                        <View style={{ gap: spacing.sm }}>
                            <Button
                                title="Income Statement"
                                onPress={() => navigation.navigate('IncomeStatement')}
                                variant="outline"
                                size="medium"
                                icon={<Ionicons name="document-text-outline" size={20} color={colors.primary} />}
                            />
                            <Button
                                title="Statement of Financial Position"
                                onPress={() => navigation.navigate('FinancialPosition')}
                                variant="outline"
                                size="medium"
                                icon={<Ionicons name="analytics-outline" size={20} color={colors.primary} />}
                            />
                            <Button
                                title="Cashflow Statement"
                                onPress={() => navigation.navigate('CashflowStatement')}
                                variant="outline"
                                size="medium"
                                icon={<Ionicons name="cash-outline" size={20} color={colors.primary} />}
                            />
                        </View>
                    </View>

                    <Text style={[typography.h4, { color: colors.text, marginBottom: spacing.md }]}>
                        Select Property
                    </Text>
                </View>
            );
        }

        return (
            <View>
                {/* Back to Properties */}
                <TouchableOpacity
                    onPress={() => setSelectedPropertyId(null)}
                    style={{ flexDirection: 'row', alignItems: 'center', marginBottom: spacing.lg }}
                >
                    <Ionicons name="arrow-back" size={20} color={colors.primary} />
                    <Text style={[typography.body, { color: colors.primary, marginLeft: spacing.sm }]}>
                        Back to Properties
                    </Text>
                </TouchableOpacity>

                {/* Property Header */}
                <Card style={{ marginBottom: spacing.lg, padding: spacing.lg }}>
                    <Text style={[typography.h3, { color: colors.text }]}>
                        {selectedProperty?.name}
                    </Text>
                    <Text style={[typography.h1, { color: colors.success, marginTop: spacing.md }]}>
                        UGX {(getRentCollectedByProperty(selectedPropertyId) / 1000).toFixed(0)}K
                    </Text>
                    <Text style={[typography.bodySmall, { color: colors.textSecondary, marginTop: spacing.xs }]}>
                        Total Rent Collected
                    </Text>
                </Card>

                {/* Payment Details */}
                <Text style={[typography.h4, { color: colors.text, marginBottom: spacing.md }]}>
                    Payment History
                </Text>
            </View>
        );
    };

    const renderItem = ({ item }: { item: any }) => {
        if (!selectedPropertyId) {
            // Property Item
            const totalRent = getRentCollectedByProperty(item.id);
            return (
                <TouchableOpacity onPress={() => setSelectedPropertyId(item.id)}>
                    <Card style={{ marginBottom: spacing.md, padding: spacing.base }}>
                        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                            <View style={{ flex: 1 }}>
                                <Text style={[typography.h4, { color: colors.text }]}>
                                    {item.name}
                                </Text>
                                <Text style={[typography.bodySmall, { color: colors.textSecondary, marginTop: spacing.xs }]}>
                                    {item.location}
                                </Text>
                            </View>
                            <View style={{ alignItems: 'flex-end' }}>
                                <Text style={[typography.h3, { color: colors.success }]}>
                                    UGX {(totalRent / 1000000).toFixed(1)}M
                                </Text>
                                <Text style={[typography.bodySmall, { color: colors.textSecondary, marginTop: 4 }]}>
                                    Collected
                                </Text>
                            </View>
                        </View>
                    </Card>
                </TouchableOpacity>
            );
        }

        // Payment Item
        const tenant = getTenantsByProperty(selectedPropertyId).find(t => t.tenantId === item.tenantId);
        return (
            <Card style={{ marginBottom: spacing.md, padding: spacing.base }}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                    <View style={{ flex: 1 }}>
                        <Text style={[typography.h4, { color: colors.text }]}>
                            {tenant?.name || 'Unknown Tenant'}
                        </Text>
                        <Text style={[typography.bodySmall, { color: colors.textSecondary, marginTop: spacing.xs }]}>
                            {new Date(item.paymentDate).toLocaleDateString()}
                        </Text>
                        <Text style={[typography.bodySmall, { color: colors.textSecondary }]}>
                            {item.paymentMethod === 'estatenet' ? 'EstateNet' : item.paymentMethod === 'bank_transfer' ? 'Bank Transfer' : 'Cash'}
                        </Text>
                    </View>
                    <View style={{ alignItems: 'flex-end' }}>
                        <Text style={[typography.h3, { color: colors.success }]}>
                            UGX {item.amount.toLocaleString()}
                        </Text>
                    </View>
                </View>
            </Card>
        );
    };

    return (
        <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }}>
            <FlatList
                data={!selectedPropertyId ? properties : propertyPayments}
                renderItem={renderItem}
                keyExtractor={item => item.id}
                ListHeaderComponent={renderHeader()}
                contentContainerStyle={{ padding: spacing.base }}
                showsVerticalScrollIndicator={false}
            />
        </SafeAreaView>
    );
};
