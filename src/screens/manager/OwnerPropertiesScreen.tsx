import React, { useState } from 'react';
import { View, Text, FlatList, TouchableOpacity, StyleSheet, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '../../theme/ThemeContext';
import { useAuth } from '../../context/AuthContext';
import { useProperties } from '../../context/PropertyContext';
import { Card } from '../../components/Card';
import { Button } from '../../components/Button';
import { StatusBadge } from '../../components/StatusBadge';
import { Ionicons } from '@expo/vector-icons';

interface OwnerPropertiesScreenProps {
    navigation: any;
}

export const OwnerPropertiesScreen: React.FC<OwnerPropertiesScreenProps> = ({ navigation }) => {
    const { colors, spacing, typography, borderRadius } = useTheme();
    const { user } = useAuth();
    const { getOwnedProperties, getPropertyManagers, getPendingAccessRequests } = useProperties();

    const ownedProperties = user ? getOwnedProperties(user.id) : [];

    const handlePropertyPress = (property: any) => {
        navigation.navigate('ManageAccess', {
            propertyId: property.id,
            propertyName: property.name,
        });
    };

    const handleViewFinancials = (property: any) => {
        navigation.navigate('OwnerFinancial', {
            propertyIds: [property.id],
        });
    };

    const handleViewManagers = (property: any) => {
        navigation.navigate('OwnerManagers', {
            propertyId: property.id,
            propertyName: property.name,
        });
    };

    const renderPropertyItem = ({ item }: { item: any }) => {
        const managers = getPropertyManagers(item.id);
        const pendingRequests = getPendingAccessRequests(item.id);
        const occupiedUnits = item.units.filter((unit: any) => unit.isOccupied).length;
        const totalUnits = item.units.length;
        const occupancyRate = totalUnits > 0 ? (occupiedUnits / totalUnits) * 100 : 0;

        return (
            <Card style={{ marginBottom: spacing.md }}>
                <TouchableOpacity onPress={() => handlePropertyPress(item)}>
                    <View style={styles.propertyHeader}>
                        <View style={{ flex: 1 }}>
                            <Text style={[typography.h3, { color: colors.text, marginBottom: spacing.xs }]}>
                                {item.name}
                            </Text>
                            <Text style={[typography.bodySmall, { color: colors.textSecondary }]}>
                                {item.location}
                            </Text>
                        </View>
                        <StatusBadge
                            type="success"
                            label="Owned"
                            size="small"
                        />
                    </View>

                    <View style={[styles.metricsRow, { marginTop: spacing.md }]}>
                        <View style={styles.metricItem}>
                            <Text style={[typography.h3, { color: colors.primary }]}>
                                {totalUnits}
                            </Text>
                            <Text style={[typography.bodySmall, { color: colors.textSecondary }]}>
                                Total Units
                            </Text>
                        </View>
                        <View style={styles.metricItem}>
                            <Text style={[typography.h3, { color: colors.success }]}>
                                {occupiedUnits}
                            </Text>
                            <Text style={[typography.bodySmall, { color: colors.textSecondary }]}>
                                Occupied
                            </Text>
                        </View>
                        <View style={styles.metricItem}>
                            <Text style={[typography.h3, { color: colors.accent }]}>
                                {occupancyRate.toFixed(0)}%
                            </Text>
                            <Text style={[typography.bodySmall, { color: colors.textSecondary }]}>
                                Occupancy
                            </Text>
                        </View>
                    </View>

                    <View style={[styles.infoRow, { marginTop: spacing.md }]}>
                        <View style={styles.infoItem}>
                            <Ionicons name="people" size={16} color={colors.textSecondary} />
                            <Text style={[typography.bodySmall, { color: colors.textSecondary, marginLeft: spacing.xs }]}>
                                {managers.length} Manager{managers.length !== 1 ? 's' : ''}
                            </Text>
                        </View>
                        <View style={styles.infoItem}>
                            <Ionicons name="business" size={16} color={colors.textSecondary} />
                            <Text style={[typography.bodySmall, { color: colors.textSecondary, marginLeft: spacing.xs }]}>
                                {item.propertyType}
                            </Text>
                        </View>
                        <View style={styles.infoItem}>
                            <Ionicons name="key" size={16} color={colors.textSecondary} />
                            <Text style={[typography.bodySmall, { color: colors.textSecondary, marginLeft: spacing.xs }]}>
                                {item.propertyCode}
                            </Text>
                        </View>
                    </View>

                    {pendingRequests.length > 0 && (
                        <View style={[styles.alertRow, { marginTop: spacing.md }]}>
                            <Ionicons name="notifications" size={16} color={colors.warning} />
                            <Text style={[typography.bodySmall, { color: colors.warning, marginLeft: spacing.xs, flex: 1 }]}>
                                {pendingRequests.length} pending access request{pendingRequests.length > 1 ? 's' : ''}
                            </Text>
                            <TouchableOpacity
                                onPress={() => navigation.navigate('OwnerApprovals')}
                                style={{ marginLeft: spacing.sm }}
                            >
                                <Text style={[typography.bodySmall, { color: colors.primary }]}>
                                    Review
                                </Text>
                            </TouchableOpacity>
                        </View>
                    )}

                    <View style={[styles.actionRow, { marginTop: spacing.md }]}>
                        <TouchableOpacity
                            style={[styles.actionButton, { borderColor: colors.border }]}
                            onPress={() => handleViewManagers(item)}
                        >
                            <Ionicons name="people" size={16} color={colors.textSecondary} />
                            <Text style={[typography.bodySmall, { color: colors.textSecondary, marginLeft: spacing.xs }]}>
                                Managers
                            </Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                            style={[styles.actionButton, { borderColor: colors.border }]}
                            onPress={() => handleViewFinancials(item)}
                        >
                            <Ionicons name="bar-chart" size={16} color={colors.textSecondary} />
                            <Text style={[typography.bodySmall, { color: colors.textSecondary, marginLeft: spacing.xs }]}>
                                Financials
                            </Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                            style={[styles.actionButton, { borderColor: colors.border }]}
                            onPress={() => handlePropertyPress(item)}
                        >
                            <Ionicons name="settings" size={16} color={colors.textSecondary} />
                            <Text style={[typography.bodySmall, { color: colors.textSecondary, marginLeft: spacing.xs }]}>
                                Access
                            </Text>
                        </TouchableOpacity>
                    </View>
                </TouchableOpacity>
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
                        My Properties
                    </Text>
                    <Text style={[typography.bodySmall, { color: colors.textSecondary }]}>
                        {ownedProperties.length} propert{ownedProperties.length !== 1 ? 'ies' : 'y'} owned
                    </Text>
                </View>
                <TouchableOpacity
                    onPress={() => navigation.navigate('OwnerRegistry')}
                    style={{
                        backgroundColor: colors.primary,
                        paddingHorizontal: spacing.md,
                        paddingVertical: spacing.sm,
                        borderRadius: 20,
                        flexDirection: 'row',
                        alignItems: 'center',
                    }}
                >
                    <Ionicons name="qr-code" size={16} color="#FFFFFF" />
                    <Text style={[typography.bodySmall, { color: '#FFFFFF', marginLeft: spacing.xs }]}>
                        Registry
                    </Text>
                </TouchableOpacity>
            </View>

            <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: spacing.base }}>
                {/* Summary Card */}
                <Card style={{ marginBottom: spacing.lg, padding: spacing.md }}>
                    <Text style={[typography.h3, { color: colors.text, marginBottom: spacing.md }]}>
                        Portfolio Overview
                    </Text>
                    <View style={styles.summaryGrid}>
                        <View style={styles.summaryItem}>
                            <Text style={[typography.h2, { color: colors.primary }]}>
                                {ownedProperties.length}
                            </Text>
                            <Text style={[typography.bodySmall, { color: colors.textSecondary }]}>
                                Properties
                            </Text>
                        </View>
                        <View style={styles.summaryItem}>
                            <Text style={[typography.h2, { color: colors.success }]}>
                                {ownedProperties.reduce((total, prop) => total + prop.units.length, 0)}
                            </Text>
                            <Text style={[typography.bodySmall, { color: colors.textSecondary }]}>
                                Total Units
                            </Text>
                        </View>
                        <View style={styles.summaryItem}>
                            <Text style={[typography.h2, { color: colors.accent }]}>
                                {ownedProperties.reduce((total, prop) => {
                                    const occupied = prop.units.filter((unit: any) => unit.isOccupied).length;
                                    return total + occupied;
                                }, 0)}
                            </Text>
                            <Text style={[typography.bodySmall, { color: colors.textSecondary }]}>
                                Occupied
                            </Text>
                        </View>
                    </View>
                </Card>

                {/* Properties List */}
                <Text style={[typography.h3, { color: colors.text, marginBottom: spacing.md }]}>
                    Properties
                </Text>

                {ownedProperties.map((property) => {
                    const managers = getPropertyManagers(property.id);
                    const pendingRequests = getPendingAccessRequests(property.id);
                    const occupiedUnits = property.units.filter((unit: any) => unit.isOccupied).length;
                    const totalUnits = property.units.length;
                    const occupancyRate = totalUnits > 0 ? (occupiedUnits / totalUnits) * 100 : 0;

                    return (
                        <Card key={property.id} style={{ marginBottom: spacing.md }}>
                            <TouchableOpacity onPress={() => handlePropertyPress(property)}>
                                <View style={styles.propertyHeader}>
                                    <View style={{ flex: 1 }}>
                                        <Text style={[typography.h3, { color: colors.text, marginBottom: spacing.xs }]}>
                                            {property.name}
                                        </Text>
                                        <Text style={[typography.bodySmall, { color: colors.textSecondary }]}>
                                            {property.location}
                                        </Text>
                                    </View>
                                    <StatusBadge
                                        type="success"
                                        label="Owned"
                                        size="small"
                                    />
                                </View>

                                <View style={[styles.metricsRow, { marginTop: spacing.md }]}>
                                    <View style={styles.metricItem}>
                                        <Text style={[typography.h3, { color: colors.primary }]}>
                                            {totalUnits}
                                        </Text>
                                        <Text style={[typography.bodySmall, { color: colors.textSecondary }]}>
                                            Total Units
                                        </Text>
                                    </View>
                                    <View style={styles.metricItem}>
                                        <Text style={[typography.h3, { color: colors.success }]}>
                                            {occupiedUnits}
                                        </Text>
                                        <Text style={[typography.bodySmall, { color: colors.textSecondary }]}>
                                            Occupied
                                        </Text>
                                    </View>
                                    <View style={styles.metricItem}>
                                        <Text style={[typography.h3, { color: colors.accent }]}>
                                            {occupancyRate.toFixed(0)}%
                                        </Text>
                                        <Text style={[typography.bodySmall, { color: colors.textSecondary }]}>
                                            Occupancy
                                        </Text>
                                    </View>
                                </View>

                                <View style={[styles.infoRow, { marginTop: spacing.md }]}>
                                    <View style={styles.infoItem}>
                                        <Ionicons name="people" size={16} color={colors.textSecondary} />
                                        <Text style={[typography.bodySmall, { color: colors.textSecondary, marginLeft: spacing.xs }]}>
                                            {managers.length} Manager{managers.length !== 1 ? 's' : ''}
                                        </Text>
                                    </View>
                                    <View style={styles.infoItem}>
                                        <Ionicons name="business" size={16} color={colors.textSecondary} />
                                        <Text style={[typography.bodySmall, { color: colors.textSecondary, marginLeft: spacing.xs }]}>
                                            {property.propertyType}
                                        </Text>
                                    </View>
                                    <View style={styles.infoItem}>
                                        <Ionicons name="key" size={16} color={colors.textSecondary} />
                                        <Text style={[typography.bodySmall, { color: colors.textSecondary, marginLeft: spacing.xs }]}>
                                            {(property as any).propertyCode || 'PROP123'}
                                        </Text>
                                    </View>
                                </View>

                                {pendingRequests.length > 0 && (
                                    <View style={[styles.alertRow, { marginTop: spacing.md }]}>
                                        <Ionicons name="notifications" size={16} color={colors.warning} />
                                        <Text style={[typography.bodySmall, { color: colors.warning, marginLeft: spacing.xs, flex: 1 }]}>
                                            {pendingRequests.length} pending access request{pendingRequests.length > 1 ? 's' : ''}
                                        </Text>
                                        <TouchableOpacity
                                            onPress={() => navigation.navigate('Approvals')}
                                            style={{ marginLeft: spacing.sm }}
                                        >
                                            <Text style={[typography.bodySmall, { color: colors.primary }]}>
                                                Review
                                            </Text>
                                        </TouchableOpacity>
                                    </View>
                                )}

                                <View style={[styles.actionRow, { marginTop: spacing.md }]}>
                                    <TouchableOpacity
                                        style={[styles.actionButton, { borderColor: colors.border }]}
                                        onPress={() => handleViewManagers(property)}
                                    >
                                        <Ionicons name="people" size={16} color={colors.textSecondary} />
                                        <Text style={[typography.bodySmall, { color: colors.textSecondary, marginLeft: spacing.xs }]}>
                                            Managers
                                        </Text>
                                    </TouchableOpacity>
                                    <TouchableOpacity
                                        style={[styles.actionButton, { borderColor: colors.border }]}
                                        onPress={() => handleViewFinancials(property)}
                                    >
                                        <Ionicons name="bar-chart" size={16} color={colors.textSecondary} />
                                        <Text style={[typography.bodySmall, { color: colors.textSecondary, marginLeft: spacing.xs }]}>
                                            Financials
                                        </Text>
                                    </TouchableOpacity>
                                    <TouchableOpacity
                                        style={[styles.actionButton, { borderColor: colors.border }]}
                                        onPress={() => handlePropertyPress(property)}
                                    >
                                        <Ionicons name="settings" size={16} color={colors.textSecondary} />
                                        <Text style={[typography.bodySmall, { color: colors.textSecondary, marginLeft: spacing.xs }]}>
                                            Access
                                        </Text>
                                    </TouchableOpacity>
                                </View>
                            </TouchableOpacity>
                        </Card>
                    );
                })}

                {ownedProperties.length === 0 && (
                    <Card style={{ padding: spacing.xl, alignItems: 'center' }}>
                        <Ionicons name="business" size={48} color={colors.textSecondary} />
                        <Text style={[typography.body, { color: colors.textSecondary, marginTop: spacing.md }]}>
                            No properties owned yet
                        </Text>
                        <Text style={[typography.bodySmall, { color: colors.textSecondary, marginTop: spacing.sm }]}>
                            Properties you own will appear here
                        </Text>
                        <Button
                            title="Create First Property"
                            onPress={() => navigation.navigate('Properties')}
                            variant="primary"
                            style={{ marginTop: spacing.lg }}
                        />
                    </Card>
                )}
            </ScrollView>
        </SafeAreaView>
    );
};

const styles = StyleSheet.create({
    propertyHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
    },
    metricsRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
    },
    metricItem: {
        alignItems: 'center',
        flex: 1,
    },
    infoRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
    },
    infoItem: {
        flexDirection: 'row',
        alignItems: 'center',
        flex: 1,
    },
    alertRow: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#FFF3CD',
        padding: 8,
        borderRadius: 8,
    },
    actionRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
    },
    actionButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 8,
        paddingHorizontal: 12,
        borderRadius: 8,
        borderWidth: 1,
        flex: 1,
        marginHorizontal: 2,
    },
    summaryGrid: {
        flexDirection: 'row',
        justifyContent: 'space-between',
    },
    summaryItem: {
        alignItems: 'center',
        flex: 1,
    },
});
