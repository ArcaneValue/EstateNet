import React, { useState } from 'react';
import { View, Text, FlatList, TouchableOpacity, StyleSheet, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '../../theme/ThemeContext';
import { useAuth } from '../../context/AuthContext';
import { useProperties } from '../../context/PropertyContext';
import { usePayments } from '../../context/PaymentContext';
import { Card } from '../../components/Card';
import { Button } from '../../components/Button';
import { StatusBadge } from '../../components/StatusBadge';
import { Ionicons } from '@expo/vector-icons';

interface OwnerOutstandingScreenProps {
    navigation: any;
}

export const OwnerOutstandingScreen: React.FC<OwnerOutstandingScreenProps> = ({ navigation }) => {
    const { colors, spacing, typography, borderRadius } = useTheme();
    const { user } = useAuth();
    const { getOwnedProperties } = useProperties();
    const { payments } = usePayments();

    const [selectedProperty, setSelectedProperty] = useState<string | null>(null);
    const [sortBy, setSortBy] = useState<'amount' | 'days' | 'property'>('amount');

    const ownedProperties = user ? getOwnedProperties(user.id) : [];

    // Calculate outstanding rent across all owned properties
    const outstandingData = ownedProperties.reduce((data: any[], property) => {
        const occupiedUnits = property.units.filter((unit: any) => unit.isOccupied);

        occupiedUnits.forEach((unit: any) => {
            // Mock outstanding calculation - in real app, this would come from payment data
            const daysOverdue = Math.floor(Math.random() * 90) + 1;
            const outstandingAmount = unit.rentAmount * (1 + (daysOverdue * 0.01)); // 1% penalty per day

            data.push({
                id: `${property.id}-${unit.id}`,
                propertyId: property.id,
                propertyName: property.name,
                propertyCode: (property as any).propertyCode || 'PROP123',
                unitId: unit.id,
                unitNumber: unit.unitNumber,
                tenantName: `Tenant ${unit.id.slice(-4)}`, // Mock tenant name
                tenantEmail: `tenant${unit.id.slice(-4)}@example.com`,
                rentAmount: unit.rentAmount,
                outstandingAmount,
                daysOverdue,
                dueDate: new Date(Date.now() - (daysOverdue * 24 * 60 * 60 * 1000)),
                lastPaymentDate: new Date(Date.now() - ((daysOverdue + 30) * 24 * 60 * 60 * 1000)),
            });
        });

        return data;
    }, []);

    // Filter and sort data
    const filteredData = selectedProperty
        ? outstandingData.filter(item => item.propertyId === selectedProperty)
        : outstandingData;

    const sortedData = [...filteredData].sort((a, b) => {
        switch (sortBy) {
            case 'amount':
                return b.outstandingAmount - a.outstandingAmount;
            case 'days':
                return b.daysOverdue - a.daysOverdue;
            case 'property':
                return a.propertyName.localeCompare(b.propertyName);
            default:
                return 0;
        }
    });

    // Calculate totals
    const totalOutstanding = filteredData.reduce((sum, item) => sum + item.outstandingAmount, 0);
    const totalTenants = filteredData.length;
    const averageDaysOverdue = totalTenants > 0
        ? Math.round(filteredData.reduce((sum, item) => sum + item.daysOverdue, 0) / totalTenants)
        : 0;

    const handleSendReminder = (item: any) => {
        alert(`Reminder sent to ${item.tenantName} for ${item.propertyName} - Unit ${item.unitNumber}`);
    };

    const handleContactTenant = (item: any) => {
        alert(`Opening message with ${item.tenantName}`);
    };

    const handleViewPaymentHistory = (item: any) => {
        navigation.navigate('Payments', {
            tenantId: item.tenantEmail,
            propertyId: item.propertyId,
        });
    };

    const getOverdueStatus = (days: number) => {
        if (days <= 7) return { type: 'warning' as const, label: '1-7 days' };
        if (days <= 30) return { type: 'error' as const, label: '8-30 days' };
        return { type: 'error' as const, label: '30+ days' };
    };

    const formatCurrency = (amount: number) => {
        return `UGX ${(amount / 1000000).toFixed(1)}M`;
    };

    const renderOutstandingItem = ({ item }: { item: any }) => {
        const status = getOverdueStatus(item.daysOverdue);

        return (
            <Card style={{ marginBottom: spacing.md }}>
                <View style={styles.outstandingItem}>
                    <View style={{ flex: 1 }}>
                        <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: spacing.sm }}>
                            <Text style={[typography.body, { color: colors.text, fontWeight: '600' }]}>
                                {item.propertyName} - Unit {item.unitNumber}
                            </Text>
                            <StatusBadge
                                type={status.type}
                                label={status.label}
                                size="small"
                                style={{ marginLeft: spacing.sm }}
                            />
                        </View>

                        <Text style={[typography.bodySmall, { color: colors.textSecondary }]}>
                            {item.tenantName} • {item.tenantEmail}
                        </Text>

                        <View style={styles.financialRow}>
                            <View style={styles.financialItem}>
                                <Text style={[typography.bodySmall, { color: colors.textSecondary }]}>
                                    Monthly Rent
                                </Text>
                                <Text style={[typography.body, { color: colors.text, fontWeight: '600' }]}>
                                    {formatCurrency(item.rentAmount)}
                                </Text>
                            </View>
                            <View style={styles.financialItem}>
                                <Text style={[typography.bodySmall, { color: colors.textSecondary }]}>
                                    Outstanding
                                </Text>
                                <Text style={[typography.body, { color: colors.error, fontWeight: '600' }]}>
                                    {formatCurrency(item.outstandingAmount)}
                                </Text>
                            </View>
                        </View>

                        <View style={styles.dateRow}>
                            <View style={styles.dateItem}>
                                <Ionicons name="calendar" size={12} color={colors.textSecondary} />
                                <Text style={[typography.bodySmall, { color: colors.textSecondary, marginLeft: 4 }]}>
                                    Due: {item.dueDate.toLocaleDateString()}
                                </Text>
                            </View>
                            <View style={styles.dateItem}>
                                <Ionicons name="time" size={12} color={colors.error} />
                                <Text style={[typography.bodySmall, { color: colors.error, marginLeft: 4 }]}>
                                    {item.daysOverdue} days overdue
                                </Text>
                            </View>
                        </View>
                    </View>

                    <View style={styles.actionButtons}>
                        <TouchableOpacity
                            style={[styles.actionButton, { borderColor: colors.primary }]}
                            onPress={() => handleSendReminder(item)}
                        >
                            <Ionicons name="notifications" size={16} color={colors.primary} />
                        </TouchableOpacity>
                        <TouchableOpacity
                            style={[styles.actionButton, { borderColor: colors.accent }]}
                            onPress={() => handleContactTenant(item)}
                        >
                            <Ionicons name="mail" size={16} color={colors.accent} />
                        </TouchableOpacity>
                        <TouchableOpacity
                            style={[styles.actionButton, { borderColor: colors.border }]}
                            onPress={() => handleViewPaymentHistory(item)}
                        >
                            <Ionicons name="receipt" size={16} color={colors.textSecondary} />
                        </TouchableOpacity>
                    </View>
                </View>
            </Card>
        );
    };

    return (
        <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }}>
            {/* Header */}
            <View style={{
                flexDirection: 'row',
                alignItems: 'center',
                padding: spacing.base,
                borderBottomWidth: 1,
                borderBottomColor: colors.divider,
            }}>
                <TouchableOpacity
                    onPress={() => navigation.goBack()}
                    style={{ marginRight: spacing.sm }}
                >
                    <Ionicons name="arrow-back" size={24} color={colors.text} />
                </TouchableOpacity>
                <View style={{ flex: 1 }}>
                    <Text style={[typography.h2, { color: colors.text }]}>
                        Outstanding Rent
                    </Text>
                    <Text style={[typography.bodySmall, { color: colors.textSecondary }]}>
                        {ownedProperties.length} propert{ownedProperties.length !== 1 ? 'ies' : 'y'} • {totalTenants} tenant{totalTenants !== 1 ? 's' : ''}
                    </Text>
                </View>
            </View>

            <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: spacing.base }}>
                {/* Summary Cards */}
                <View style={[styles.summaryGrid, { marginBottom: spacing.lg }]}>
                    <Card style={{ ...styles.summaryCard, backgroundColor: colors.errorLight, marginRight: 6 }}>
                        <View style={styles.summaryContent}>
                            <Ionicons name="alert-circle" size={24} color={colors.error} />
                            <Text style={[typography.h2, { color: colors.error, marginTop: spacing.sm }]}>
                                {formatCurrency(totalOutstanding)}
                            </Text>
                            <Text style={[typography.bodySmall, { color: colors.error, marginTop: spacing.xs }]}>
                                Total Outstanding
                            </Text>
                        </View>
                    </Card>

                    <Card style={{ ...styles.summaryCard, backgroundColor: colors.warningLight, marginLeft: 6 }}>
                        <View style={styles.summaryContent}>
                            <Ionicons name="people" size={24} color={colors.warning} />
                            <Text style={[typography.h2, { color: colors.warning, marginTop: spacing.sm }]}>
                                {totalTenants}
                            </Text>
                            <Text style={[typography.bodySmall, { color: colors.warning, marginTop: spacing.xs }]}>
                                Tenants Owed
                            </Text>
                        </View>
                    </Card>
                </View>

                <Card style={{ ...styles.summaryCard, backgroundColor: colors.accent + '15', marginBottom: spacing.lg }}>
                    <View style={styles.summaryContent}>
                        <Ionicons name="time" size={24} color={colors.accent} />
                        <Text style={[typography.h2, { color: colors.accent, marginTop: spacing.sm }]}>
                            {averageDaysOverdue}
                        </Text>
                        <Text style={[typography.bodySmall, { color: colors.accent, marginTop: spacing.xs }]}>
                            Avg Days Overdue
                        </Text>
                    </View>
                </Card>

                {/* Filters */}
                <Card style={{ marginBottom: spacing.lg, padding: spacing.md }}>
                    <Text style={[typography.h3, { color: colors.text, marginBottom: spacing.md }]}>
                        Filters & Sorting
                    </Text>

                    {/* Property Filter */}
                    <View style={{ marginBottom: spacing.md }}>
                        <Text style={[typography.bodySmall, { color: colors.textSecondary, marginBottom: spacing.sm }]}>
                            Property
                        </Text>
                        <View style={styles.filterRow}>
                            <TouchableOpacity
                                style={[
                                    styles.filterChip,
                                    {
                                        backgroundColor: !selectedProperty ? colors.primary : colors.surface,
                                        borderColor: colors.border
                                    }
                                ]}
                                onPress={() => setSelectedProperty(null)}
                            >
                                <Text style={[
                                    typography.bodySmall,
                                    { color: !selectedProperty ? '#FFFFFF' : colors.text }
                                ]}>
                                    All Properties
                                </Text>
                            </TouchableOpacity>
                            {ownedProperties.map((property) => (
                                <TouchableOpacity
                                    key={property.id}
                                    style={[
                                        styles.filterChip,
                                        {
                                            backgroundColor: selectedProperty === property.id ? colors.primary : colors.surface,
                                            borderColor: colors.border
                                        }
                                    ]}
                                    onPress={() => setSelectedProperty(property.id)}
                                >
                                    <Text style={[
                                        typography.bodySmall,
                                        { color: selectedProperty === property.id ? '#FFFFFF' : colors.text }
                                    ]}>
                                        {property.name}
                                    </Text>
                                </TouchableOpacity>
                            ))}
                        </View>
                    </View>

                    {/* Sort Options */}
                    <View>
                        <Text style={[typography.bodySmall, { color: colors.textSecondary, marginBottom: spacing.sm }]}>
                            Sort By
                        </Text>
                        <View style={styles.filterRow}>
                            {[
                                { key: 'amount', label: 'Amount' },
                                { key: 'days', label: 'Days Overdue' },
                                { key: 'property', label: 'Property' },
                            ].map((option) => (
                                <TouchableOpacity
                                    key={option.key}
                                    style={[
                                        styles.filterChip,
                                        {
                                            backgroundColor: sortBy === option.key ? colors.primary : colors.surface,
                                            borderColor: colors.border
                                        }
                                    ]}
                                    onPress={() => setSortBy(option.key as any)}
                                >
                                    <Text style={[
                                        typography.bodySmall,
                                        { color: sortBy === option.key ? '#FFFFFF' : colors.text }
                                    ]}>
                                        {option.label}
                                    </Text>
                                </TouchableOpacity>
                            ))}
                        </View>
                    </View>
                </Card>

                {/* Outstanding List */}
                <Text style={[typography.h3, { color: colors.text, marginBottom: spacing.md }]}>
                    Outstanding Payments ({sortedData.length})
                </Text>

                {sortedData.map((item) => {
                    const status = getOverdueStatus(item.daysOverdue);

                    return (
                        <Card key={item.id} style={{ marginBottom: spacing.md }}>
                            <View style={styles.outstandingItem}>
                                <View style={{ flex: 1 }}>
                                    <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: spacing.sm }}>
                                        <Text style={[typography.body, { color: colors.text, fontWeight: '600' }]}>
                                            {item.propertyName} - Unit {item.unitNumber}
                                        </Text>
                                        <StatusBadge
                                            type={status.type}
                                            label={status.label}
                                            size="small"
                                            style={{ marginLeft: spacing.sm }}
                                        />
                                    </View>

                                    <Text style={[typography.bodySmall, { color: colors.textSecondary }]}>
                                        {item.tenantName} • {item.tenantEmail}
                                    </Text>

                                    <View style={styles.financialRow}>
                                        <View style={styles.financialItem}>
                                            <Text style={[typography.bodySmall, { color: colors.textSecondary }]}>
                                                Monthly Rent
                                            </Text>
                                            <Text style={[typography.body, { color: colors.text, fontWeight: '600' }]}>
                                                {formatCurrency(item.rentAmount)}
                                            </Text>
                                        </View>
                                        <View style={styles.financialItem}>
                                            <Text style={[typography.bodySmall, { color: colors.textSecondary }]}>
                                                Outstanding
                                            </Text>
                                            <Text style={[typography.body, { color: colors.error, fontWeight: '600' }]}>
                                                {formatCurrency(item.outstandingAmount)}
                                            </Text>
                                        </View>
                                    </View>

                                    <View style={styles.dateRow}>
                                        <View style={styles.dateItem}>
                                            <Ionicons name="calendar" size={12} color={colors.textSecondary} />
                                            <Text style={[typography.bodySmall, { color: colors.textSecondary, marginLeft: 4 }]}>
                                                Due: {item.dueDate.toLocaleDateString()}
                                            </Text>
                                        </View>
                                        <View style={styles.dateItem}>
                                            <Ionicons name="time" size={12} color={colors.error} />
                                            <Text style={[typography.bodySmall, { color: colors.error, marginLeft: 4 }]}>
                                                {item.daysOverdue} days overdue
                                            </Text>
                                        </View>
                                    </View>
                                </View>

                                <View style={styles.actionButtons}>
                                    <TouchableOpacity
                                        style={[styles.actionButton, { borderColor: colors.primary }]}
                                        onPress={() => handleSendReminder(item)}
                                    >
                                        <Ionicons name="notifications" size={16} color={colors.primary} />
                                    </TouchableOpacity>
                                    <TouchableOpacity
                                        style={[styles.actionButton, { borderColor: colors.accent }]}
                                        onPress={() => handleContactTenant(item)}
                                    >
                                        <Ionicons name="mail" size={16} color={colors.accent} />
                                    </TouchableOpacity>
                                    <TouchableOpacity
                                        style={[styles.actionButton, { borderColor: colors.border }]}
                                        onPress={() => handleViewPaymentHistory(item)}
                                    >
                                        <Ionicons name="receipt" size={16} color={colors.textSecondary} />
                                    </TouchableOpacity>
                                </View>
                            </View>
                        </Card>
                    );
                })}

                {sortedData.length === 0 && (
                    <Card style={{ padding: spacing.xl, alignItems: 'center' }}>
                        <Ionicons name="checkmark-circle" size={48} color={colors.success} />
                        <Text style={[typography.body, { color: colors.textSecondary, marginTop: spacing.md }]}>
                            No outstanding payments
                        </Text>
                        <Text style={[typography.bodySmall, { color: colors.textSecondary, marginTop: spacing.sm }]}>
                            All tenants are up to date with their rent
                        </Text>
                    </Card>
                )}
            </ScrollView>
        </SafeAreaView>
    );
};

const styles = StyleSheet.create({
    summaryGrid: {
        flexDirection: 'row',
    },
    summaryCard: {
        flex: 1,
        padding: 16,
    },
    summaryContent: {
        alignItems: 'center',
    },
    outstandingItem: {
        flexDirection: 'row',
        alignItems: 'flex-start',
    },
    financialRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginTop: 8,
        marginBottom: 8,
    },
    financialItem: {
        alignItems: 'center',
        flex: 1,
    },
    dateRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
    },
    dateItem: {
        flexDirection: 'row',
        alignItems: 'center',
        flex: 1,
    },
    actionButtons: {
        flexDirection: 'row',
        gap: 8,
        marginLeft: 12,
    },
    actionButton: {
        width: 36,
        height: 36,
        borderRadius: 18,
        borderWidth: 1,
        alignItems: 'center',
        justifyContent: 'center',
    },
    filterRow: {
        flexDirection: 'row',
        flexWrap: 'wrap',
    },
    filterChip: {
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 16,
        borderWidth: 1,
        marginRight: 8,
        marginBottom: 8,
    },
});
