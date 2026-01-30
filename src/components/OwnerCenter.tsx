import React from 'react';
import { View, Text, TouchableOpacity, ScrollView, StyleSheet } from 'react-native';
import { useTheme } from '../theme/ThemeContext';
import { useAuth } from '../context/AuthContext';
import { useProperties } from '../context/PropertyContext';
import { Card } from './Card';
import { Button } from './Button';
import { StatusBadge } from './StatusBadge';
import { Ionicons } from '@expo/vector-icons';

interface OwnerCenterProps {
    navigation: any;
}

export const OwnerCenter: React.FC<OwnerCenterProps> = ({ navigation }) => {
    const { colors, spacing, typography, borderRadius } = useTheme();
    const { user } = useAuth();
    const {
        getOwnedProperties,
        getPropertyManagers,
        getPendingAccessRequests,
        getTotalRentCollected,
        getOutstandingRent
    } = useProperties();

    const ownedProperties = user ? getOwnedProperties(user.id) : [];
    const totalPendingRequests = ownedProperties.reduce(
        (total: number, property: any) => total + getPendingAccessRequests(property.id).length,
        0
    );

    const totalManagers = ownedProperties.reduce(
        (total: number, property: any) => total + getPropertyManagers(property.id).length,
        0
    );

    const totalRentCollected = getTotalRentCollected();
    const totalOutstanding = getOutstandingRent();

    const handleNavigateToScreen = (screenName: string) => {
        navigation.navigate(screenName);
    };

    return (
        <Card style={{ marginBottom: spacing.lg }}>
            {/* Header */}
            <View style={{
                flexDirection: 'row' as const,
                alignItems: 'center' as const,
                marginBottom: spacing.lg,
                paddingBottom: spacing.md,
                borderBottomWidth: 1,
                borderBottomColor: colors.divider
            }}>
                <View style={{
                    backgroundColor: colors.primary + '20',
                    width: 48,
                    height: 48,
                    borderRadius: 24,
                    alignItems: 'center' as const,
                    justifyContent: 'center' as const,
                    marginRight: spacing.md,
                }}>
                    <Ionicons name="shield-checkmark" size={24} color={colors.primary} />
                </View>
                <View style={{ flex: 1 }}>
                    <Text style={[typography.h3, { color: colors.text }]}>
                        Owner Center
                    </Text>
                    <Text style={[typography.bodySmall, { color: colors.textSecondary }]}>
                        Manage your property portfolio
                    </Text>
                </View>
                <StatusBadge
                    type="success"
                    label="Owner Mode"
                    size="small"
                />
            </View>

            {/* Metrics Grid */}
            <View style={[styles.metricsGrid, { marginBottom: spacing.lg }]}>
                <TouchableOpacity
                    style={{ flex: 1, marginRight: spacing.sm }}
                    onPress={() => handleNavigateToScreen('OwnerProperties')}
                >
                    <View style={{
                        backgroundColor: colors.surface,
                        padding: spacing.md,
                        borderRadius: 12,
                        alignItems: 'center' as const,
                    }}>
                        <Text style={[typography.h2, { color: colors.primary }]}>
                            {ownedProperties.length}
                        </Text>
                        <Text style={[typography.bodySmall, { color: colors.textSecondary, marginTop: 4 }]}>
                            Owned Properties
                        </Text>
                    </View>
                </TouchableOpacity>

                <TouchableOpacity
                    style={{ flex: 1, marginLeft: spacing.sm }}
                    onPress={() => handleNavigateToScreen('OwnerManagers')}
                >
                    <View style={{
                        backgroundColor: colors.surface,
                        padding: spacing.md,
                        borderRadius: 12,
                        alignItems: 'center' as const,
                    }}>
                        <Text style={[typography.h2, { color: colors.success }]}>
                            {totalManagers}
                        </Text>
                        <Text style={[typography.bodySmall, { color: colors.textSecondary, marginTop: 4 }]}>
                            Property Managers
                        </Text>
                    </View>
                </TouchableOpacity>
            </View>

            {/* Financial Overview */}
            <View style={[styles.metricsGrid, { marginBottom: spacing.lg }]}>
                <TouchableOpacity
                    style={{ flex: 1, marginRight: spacing.sm }}
                    onPress={() => handleNavigateToScreen('OwnerFinancial')}
                >
                    <View style={{
                        backgroundColor: colors.surface,
                        padding: spacing.md,
                        borderRadius: 12,
                        alignItems: 'center' as const,
                    }}>
                        <Text style={[typography.h3, { color: colors.accent }]}>
                            UGX {(totalRentCollected / 1000000).toFixed(1)}M
                        </Text>
                        <Text style={[typography.bodySmall, { color: colors.textSecondary, marginTop: 4 }]}>
                            Rent Collected
                        </Text>
                    </View>
                </TouchableOpacity>

                <TouchableOpacity
                    style={{ flex: 1, marginLeft: spacing.sm }}
                    onPress={() => handleNavigateToScreen('OwnerOutstanding')}
                >
                    <View style={{
                        backgroundColor: colors.surface,
                        padding: spacing.md,
                        borderRadius: 12,
                        alignItems: 'center' as const,
                    }}>
                        <Text style={[typography.h3, { color: colors.error }]}>
                            UGX {(totalOutstanding / 1000000).toFixed(1)}M
                        </Text>
                        <Text style={[typography.bodySmall, { color: colors.textSecondary, marginTop: 4 }]}>
                            Outstanding
                        </Text>
                    </View>
                </TouchableOpacity>
            </View>

            {/* Pending Requests Alert */}
            {totalPendingRequests > 0 && (
                <TouchableOpacity
                    style={{
                        backgroundColor: colors.warningLight,
                        padding: spacing.md,
                        borderRadius: 12,
                        flexDirection: 'row' as const,
                        alignItems: 'center' as const,
                        marginBottom: spacing.lg,
                    }}
                    onPress={() => handleNavigateToScreen('Approvals')}
                >
                    <Ionicons name="notifications" size={20} color={colors.warning} />
                    <View style={{ flex: 1, marginLeft: spacing.md }}>
                        <Text style={[typography.body, { color: colors.warning, fontWeight: '600' }]}>
                            {totalPendingRequests} Pending Request{totalPendingRequests > 1 ? 's' : ''}
                        </Text>
                        <Text style={[typography.bodySmall, { color: colors.warning }]}>
                            Review and approve access requests
                        </Text>
                    </View>
                    <Ionicons name="chevron-forward" size={16} color={colors.warning} />
                </TouchableOpacity>
            )}

            {/* Quick Actions */}
            <View>
                <Text style={[typography.body, { color: colors.text, marginBottom: spacing.md, fontWeight: '600' }]}>
                    Quick Actions
                </Text>
                <View style={styles.actionsGrid}>
                    <TouchableOpacity
                        style={[
                            styles.actionButton,
                            { backgroundColor: colors.surface, borderColor: colors.border }
                        ]}
                        onPress={() => handleNavigateToScreen('Approvals')}
                    >
                        <Ionicons name="checkmark-circle" size={20} color={colors.primary} />
                        <Text style={[typography.bodySmall, { color: colors.text, marginTop: 4 }]}>
                            Approvals
                        </Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                        style={[
                            styles.actionButton,
                            { backgroundColor: colors.surface, borderColor: colors.border }
                        ]}
                        onPress={() => handleNavigateToScreen('OwnerFinancial')}
                    >
                        <Ionicons name="bar-chart" size={20} color={colors.accent} />
                        <Text style={[typography.bodySmall, { color: colors.text, marginTop: 4 }]}>
                            Reports
                        </Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                        style={[
                            styles.actionButton,
                            { backgroundColor: colors.surface, borderColor: colors.border }
                        ]}
                        onPress={() => handleNavigateToScreen('OwnerSettings')}
                    >
                        <Ionicons name="settings" size={20} color={colors.textSecondary} />
                        <Text style={[typography.bodySmall, { color: colors.text, marginTop: 4 }]}>
                            Settings
                        </Text>
                    </TouchableOpacity>
                </View>
            </View>
        </Card>
    );
};

const styles = StyleSheet.create({
    metricsGrid: {
        flexDirection: 'row',
    },
    actionsGrid: {
        flexDirection: 'row',
        justifyContent: 'space-between',
    },
    actionButton: {
        flex: 1,
        alignItems: 'center',
        padding: 12,
        borderRadius: 8,
        borderWidth: 1,
        marginHorizontal: 2,
    },
});
