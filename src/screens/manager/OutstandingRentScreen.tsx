import React from 'react';
import { View, Text, FlatList, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '../../theme/ThemeContext';
import { TenantListItem } from '../../components/TenantListItem';
import { useTenants } from '../../context/TenantContext';
import { useProperties } from '../../context/PropertyContext';
import { Ionicons } from '@expo/vector-icons';

export const OutstandingRentScreen: React.FC<any> = ({ navigation }) => {
    const { colors, spacing, typography } = useTheme();
    const { getOverdueTenants } = useTenants();
    const { properties } = useProperties();

    const { overdue, pastOverdue } = getOverdueTenants();

    const getPropertyName = (propertyId?: string) => {
        return properties.find(p => p.id === propertyId)?.name || 'Unknown Property';
    };

    const getUnitNumber = (propertyId?: string, unitId?: string) => {
        const property = properties.find(p => p.id === propertyId);
        return property?.units.find(u => u.id === unitId)?.unitNumber || '?';
    };

    return (
        <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }}>
            <View style={{ padding: spacing.base }}>
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
                            Outstanding Rent
                        </Text>
                        <Text style={[typography.body, { color: colors.textSecondary, marginTop: spacing.sm }]}>
                            Tenants with overdue payments
                        </Text>
                    </View>
                </View>

                {/* Summary Cards */}
                <View style={{ flexDirection: 'row', marginBottom: spacing.lg, gap: spacing.sm }}>
                    <View style={{ flex: 1, backgroundColor: colors.warningLight, padding: spacing.base, borderRadius: 12 }}>
                        <Text style={[typography.h3, { color: colors.warning }]}>{overdue.length}</Text>
                        <Text style={[typography.bodySmall, { color: colors.textSecondary, marginTop: 4 }]}>Overdue</Text>
                        <Text style={[typography.caption, { color: colors.textSecondary }]}>7-30 days</Text>
                    </View>
                    <View style={{ flex: 1, backgroundColor: colors.errorLight, padding: spacing.base, borderRadius: 12 }}>
                        <Text style={[typography.h3, { color: colors.error }]}>{pastOverdue.length}</Text>
                        <Text style={[typography.bodySmall, { color: colors.textSecondary, marginTop: 4 }]}>Past Due</Text>
                        <Text style={[typography.caption, { color: colors.textSecondary }]}>&gt;30 days</Text>
                    </View>
                </View>

                {/* Overdue Section */}
                {overdue.length > 0 && (
                    <View style={{ marginBottom: spacing.lg }}>
                        <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: spacing.md }}>
                            <Ionicons name="alert-circle" size={20} color={colors.warning} />
                            <Text style={[typography.h3, { color: colors.text, marginLeft: spacing.sm }]}>
                                Overdue (7-30 days)
                            </Text>
                        </View>
                        {overdue.map(tenant => (
                            <TenantListItem
                                key={tenant.id}
                                name={tenant.name}
                                tenantId={tenant.tenantId}
                                propertyName={getPropertyName(tenant.propertyId)}
                                unitNumber={getUnitNumber(tenant.propertyId, tenant.unitId)}
                                rentAmount={tenant.amountOwed}
                                paymentStatus={tenant.paymentStatus}
                                phoneNumber={tenant.phoneNumber}
                                showArrow={false}
                                clickable={false}
                            />
                        ))}
                    </View>
                )}

                {/* Past Overdue Section */}
                {pastOverdue.length > 0 && (
                    <View>
                        <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: spacing.md }}>
                            <Ionicons name="warning" size={20} color={colors.error} />
                            <Text style={[typography.h3, { color: colors.text, marginLeft: spacing.sm }]}>
                                Past Overdue (&gt;30 days)
                            </Text>
                        </View>
                        {pastOverdue.map(tenant => (
                            <TenantListItem
                                key={tenant.id}
                                name={tenant.name}
                                tenantId={tenant.tenantId}
                                propertyName={getPropertyName(tenant.propertyId)}
                                unitNumber={getUnitNumber(tenant.propertyId, tenant.unitId)}
                                rentAmount={tenant.amountOwed}
                                paymentStatus={tenant.paymentStatus}
                                phoneNumber={tenant.phoneNumber}
                                showArrow={false}
                                clickable={false}
                            />
                        ))}
                    </View>
                )}

                {overdue.length === 0 && pastOverdue.length === 0 && (
                    <View style={{ alignItems: 'center', paddingVertical: spacing['3xl'] }}>
                        <View style={{ backgroundColor: colors.successLight, width: 80, height: 80, borderRadius: 40, alignItems: 'center', justifyContent: 'center', marginBottom: spacing.lg }}>
                            <Ionicons name="checkmark-circle" size={48} color={colors.success} />
                        </View>
                        <Text style={[typography.h3, { color: colors.text, textAlign: 'center' }]}>
                            No Outstanding Rent
                        </Text>
                        <Text style={[typography.body, { color: colors.textSecondary, marginTop: spacing.sm, textAlign: 'center' }]}>
                            All tenants are up to date with their payments
                        </Text>
                    </View>
                )}
            </View>
        </SafeAreaView>
    );
};
