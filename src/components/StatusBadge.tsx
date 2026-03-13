import React from 'react';
import { View, Text, StyleSheet, ViewStyle } from 'react-native';
import { useTheme } from '../theme/ThemeContext';

type StatusType = 'success' | 'warning' | 'error' | 'info';
type PredefinedStatus =
    | 'available'
    | 'occupied'
    | 'pending'
    | 'overdue'
    | 'paid'
    | 'unpaid'
    | 'current'
    | 'past_overdue'
    | 'NOT_DUE'
    | 'PAID'
    | 'PENDING'
    | 'OVERDUE'
    | 'NO_LEASE'
    | 'ACCEPTED'
    | 'DECLINED'
    | 'INVITED';

interface StatusBadgeProps {
    status?: PredefinedStatus;
    label?: string;
    type?: StatusType;
    size?: 'small' | 'medium' | 'large';
    variant?: 'filled' | 'outlined' | 'subtle';
    style?: ViewStyle;
}

export const StatusBadge: React.FC<StatusBadgeProps> = ({
    status,
    label,
    type,
    size = 'medium',
    variant = 'subtle',
    style
}) => {
    const { colors, borderRadius, spacing, typography } = useTheme();

    const statusConfig: Record<PredefinedStatus, { label: string; color: string; backgroundColor: string }> = {
        available: {
            label: 'Available',
            color: colors.available,
            backgroundColor: colors.successLight,
        },
        occupied: {
            label: 'Occupied',
            color: colors.occupied,
            backgroundColor: colors.infoLight,
        },
        pending: {
            label: 'Pending',
            color: colors.pending,
            backgroundColor: colors.warningLight,
        },
        overdue: {
            label: 'Overdue',
            color: colors.overdue,
            backgroundColor: colors.errorLight,
        },
        past_overdue: {
            label: 'Past Due',
            color: colors.error,
            backgroundColor: colors.errorLight,
        },
        paid: {
            label: 'Paid',
            color: colors.success,
            backgroundColor: colors.successLight,
        },
        unpaid: {
            label: 'Unpaid',
            color: colors.error,
            backgroundColor: colors.errorLight,
        },
        current: {
            label: 'Current',
            color: colors.success,
            backgroundColor: colors.successLight,
        },
        // Rent status mappings with human-friendly labels
        NOT_DUE: {
            label: 'Paid up',
            color: colors.success,
            backgroundColor: colors.successLight,
        },
        PAID: {
            label: 'Paid',
            color: colors.success,
            backgroundColor: colors.successLight,
        },
        PENDING: {
            label: 'Pending',
            color: colors.warning,
            backgroundColor: colors.warningLight,
        },
        OVERDUE: {
            label: 'Overdue',
            color: colors.error,
            backgroundColor: colors.errorLight,
        },
        NO_LEASE: {
            label: 'No lease',
            color: colors.textSecondary,
            backgroundColor: colors.border,
        },
        ACCEPTED: {
            label: 'Accepted',
            color: colors.success,
            backgroundColor: colors.successLight,
        },
        DECLINED: {
            label: 'Declined',
            color: colors.error,
            backgroundColor: colors.errorLight,
        },
        INVITED: {
            label: 'Invited',
            color: colors.info,
            backgroundColor: colors.infoLight,
        },
    };

    const typeConfig: Record<StatusType, { color: string; backgroundColor: string }> = {
        success: { color: colors.success, backgroundColor: colors.successLight },
        warning: { color: colors.warning, backgroundColor: colors.warningLight },
        error: { color: colors.error, backgroundColor: colors.errorLight },
        info: { color: colors.info, backgroundColor: colors.infoLight },
    };

    const config = status
        ? statusConfig[status]
        : type
            ? { label: label || '', ...typeConfig[type] }
            : statusConfig.paid;

    const sizeConfig = {
        small: {
            paddingH: spacing.sm,
            paddingV: spacing.xs,
            dotSize: 6,
            fontSize: typography.caption,
        },
        medium: {
            paddingH: spacing.md,
            paddingV: spacing.sm - 2,
            dotSize: 8,
            fontSize: typography.bodySmall,
        },
        large: {
            paddingH: spacing.base,
            paddingV: spacing.sm,
            dotSize: 10,
            fontSize: typography.body,
        },
    };

    const currentSize = sizeConfig[size];

    const getVariantStyle = (): ViewStyle => {
        switch (variant) {
            case 'filled':
                return {
                    backgroundColor: config.color,
                    borderWidth: 0,
                };
            case 'outlined':
                return {
                    backgroundColor: 'transparent',
                    borderWidth: 1.5,
                    borderColor: config.color,
                };
            case 'subtle':
            default:
                return {
                    backgroundColor: config.backgroundColor,
                    borderWidth: 1,
                    borderColor: config.color + '30',
                };
        }
    };

    const getTextColor = () => {
        if (variant === 'filled') return '#FFFFFF';
        return config.color;
    };

    return (
        <View
            style={[
                styles.badge,
                {
                    borderRadius: borderRadius.full,
                    paddingHorizontal: currentSize.paddingH,
                    paddingVertical: currentSize.paddingV,
                },
                getVariantStyle(),
                style,
            ]}
        >
            {variant !== 'filled' && (
                <View
                    style={[
                        styles.dot,
                        {
                            backgroundColor: config.color,
                            width: currentSize.dotSize,
                            height: currentSize.dotSize,
                            marginRight: spacing.xs,
                        },
                    ]}
                />
            )}
            <Text
                style={[
                    currentSize.fontSize,
                    {
                        color: getTextColor(),
                        fontWeight: '700',
                        letterSpacing: 0.3,
                    },
                ]}
            >
                {config.label}
            </Text>
        </View>
    );
};

const styles = StyleSheet.create({
    badge: {
        flexDirection: 'row',
        alignItems: 'center',
        alignSelf: 'flex-start',
    },
    dot: {
        borderRadius: 999,
    },
});
