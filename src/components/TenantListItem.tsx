import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { useTheme } from '../theme/ThemeContext';
import { Card } from './Card';
import { StatusBadge } from './StatusBadge';
import { Ionicons } from '@expo/vector-icons';
import { RentStatus } from '../types/types';

interface TenantListItemProps {
    name: string;
    tenantId: string;
    propertyName?: string;
    unitNumber?: string;
    rentAmount: number;
    paymentStatus: RentStatus;
    phoneNumber: string;
    onPress?: () => void;
    showArrow?: boolean;
    clickable?: boolean;
}

export const TenantListItem: React.FC<TenantListItemProps> = ({
    name,
    tenantId,
    propertyName,
    unitNumber,
    rentAmount,
    paymentStatus,
    phoneNumber,
    onPress,
    showArrow = true,
    clickable = true,
}) => {
    const { colors, spacing, typography } = useTheme();

    const getStatusLabel = (status: RentStatus): string => {
        switch (status) {
            case 'current':
                return 'Paid';
            case 'overdue':
                return 'Overdue';
            case 'past_overdue':
                return 'Past Due';
            default:
                return 'Unknown';
        }
    };

    const getStatusType = (status: RentStatus): 'success' | 'warning' | 'error' | 'info' => {
        switch (status) {
            case 'current':
                return 'success';
            case 'overdue':
                return 'warning';
            case 'past_overdue':
                return 'error';
            default:
                return 'info';
        }
    };

    const content = (
        <Card style={{ marginBottom: spacing.md }}>
            <View style={styles.container}>
                {/* Profile Icon */}
                <View
                    style={[
                        styles.profileIcon,
                        { backgroundColor: colors.primary + '20' },
                    ]}
                >
                    <Ionicons name="person" size={24} color={colors.primary} />
                </View>

                {/* Tenant Info */}
                <View style={styles.infoContainer}>
                    <View style={styles.headerRow}>
                        <Text style={[typography.h4, { color: colors.text, flex: 1 }]}>
                            {name}
                        </Text>
                        <StatusBadge
                            label={getStatusLabel(paymentStatus)}
                            type={getStatusType(paymentStatus)}
                        />
                    </View>

                    <Text
                        style={[
                            typography.bodySmall,
                            { color: colors.textSecondary, marginTop: spacing.xs },
                        ]}
                    >
                        ID: {tenantId}
                    </Text>

                    {propertyName && unitNumber && (
                        <View style={[styles.propertyRow, { marginTop: spacing.xs }]}>
                            <Ionicons name="business-outline" size={14} color={colors.textSecondary} />
                            <Text
                                style={[
                                    typography.bodySmall,
                                    { color: colors.textSecondary, marginLeft: 4 },
                                ]}
                            >
                                {propertyName} • Unit {unitNumber}
                            </Text>
                        </View>
                    )}

                    <View style={[styles.detailsRow, { marginTop: spacing.sm }]}>
                        <View style={styles.detail}>
                            <Ionicons name="call-outline" size={14} color={colors.textSecondary} />
                            <Text
                                style={[
                                    typography.bodySmall,
                                    { color: colors.textSecondary, marginLeft: 4 },
                                ]}
                            >
                                {phoneNumber}
                            </Text>
                        </View>
                        <View style={styles.detail}>
                            <Ionicons name="cash-outline" size={14} color={colors.success} />
                            <Text
                                style={[
                                    typography.bodySmall,
                                    { color: colors.success, marginLeft: 4, fontWeight: '600' },
                                ]}
                            >
                                UGX {rentAmount.toLocaleString()}
                            </Text>
                        </View>
                    </View>
                </View>

                {/* Chevron - only show if showArrow is true */}
                {showArrow && <Ionicons name="chevron-forward" size={20} color={colors.textSecondary} />}
            </View>
        </Card>
    );

    if (clickable && onPress) {
        return (
            <TouchableOpacity onPress={onPress} activeOpacity={0.7}>
                {content}
            </TouchableOpacity>
        );
    }

    return content;
};

const styles = StyleSheet.create({
    container: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    profileIcon: {
        width: 48,
        height: 48,
        borderRadius: 24,
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: 12,
    },
    infoContainer: {
        flex: 1,
    },
    headerRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
    },
    propertyRow: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    detailsRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 16,
    },
    detail: {
        flexDirection: 'row',
        alignItems: 'center',
    },
});
