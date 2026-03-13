import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useTheme } from '../theme/ThemeContext';
import { Card } from './Card';

interface MetricCardProps {
    value: string | number;
    label: string;
    icon?: React.ReactNode;
    trend?: {
        value: string;
        isPositive: boolean;
    };
    color?: string;
    variant?: 'default' | 'glass' | 'accent' | 'compact';
    subtitle?: string;
    rightAccessory?: React.ReactNode;
}

export const MetricCard: React.FC<MetricCardProps> = ({
    value,
    label,
    icon,
    trend,
    color,
    variant = 'default',
    subtitle,
    rightAccessory,
}) => {
    const { colors, spacing, typography, borderRadius, shadows } = useTheme();

    const isCompact = variant === 'compact';
    const cardVariant = variant === 'accent' ? 'default' : variant === 'glass' ? 'glass' : 'default';

    if (isCompact) {
        return (
            <Card
                variant="default"
                style={styles.compactContainer}
            >
                <View style={styles.compactContent}>
                    {icon && (
                        <View
                            style={[
                                styles.compactIconContainer,
                                {
                                    backgroundColor: color ? `${color}15` : colors.primary + '15',
                                    borderRadius: borderRadius.md,
                                }
                            ]}
                        >
                            {icon}
                        </View>
                    )}
                    <View style={{ flex: 1 }}>
                        <Text
                            style={[
                                typography.bodySmall,
                                {
                                    color: colors.textSecondary,
                                    textTransform: 'uppercase',
                                    letterSpacing: 0.8,
                                    fontSize: 10,
                                    fontWeight: '600',
                                },
                            ]}
                        >
                            {label}
                        </Text>
                        <Text
                            style={[
                                {
                                    fontSize: 24,
                                    fontWeight: '700',
                                    color: color || colors.text,
                                    marginTop: 4,
                                    letterSpacing: -0.5,
                                },
                            ]}
                        >
                            {value}
                        </Text>
                        {subtitle && (
                            <Text
                                style={[
                                    typography.bodySmall,
                                    {
                                        color: colors.textTertiary,
                                        marginTop: 2,
                                        fontSize: 11,
                                    },
                                ]}
                            >
                                {subtitle}
                            </Text>
                        )}
                    </View>
                    {rightAccessory && (
                        <View style={{ marginLeft: spacing.sm }}>
                            {rightAccessory}
                        </View>
                    )}
                </View>
            </Card>
        );
    }

    return (
        <Card
            variant={cardVariant}
            accentTop={variant === 'accent'}
            style={styles.container}
        >
            <View style={styles.header}>
                {icon && (
                    <View
                        style={[
                            styles.iconContainer,
                            {
                                backgroundColor: color ? `${color}10` : colors.surface,
                                borderRadius: borderRadius.md,
                            }
                        ]}
                    >
                        {icon}
                    </View>
                )}
                {trend && (
                    <View
                        style={[
                            styles.trendBadge,
                            {
                                backgroundColor: trend.isPositive ? colors.successLight : colors.errorLight,
                                borderRadius: borderRadius.full,
                            },
                        ]}
                    >
                        <Text
                            style={[
                                styles.trendText,
                                { color: trend.isPositive ? colors.success : colors.error },
                            ]}
                        >
                            {trend.isPositive ? '↑' : '↓'} {trend.value}
                        </Text>
                    </View>
                )}
            </View>

            <Text
                style={[
                    {
                        fontSize: 32,
                        fontWeight: '700',
                        color: color || colors.text,
                        marginTop: spacing.md,
                        letterSpacing: -1,
                    },
                ]}
            >
                {value}
            </Text>

            {subtitle && (
                <Text
                    style={[
                        typography.bodySmall,
                        {
                            color: colors.textTertiary,
                            marginTop: 4,
                        },
                    ]}
                >
                    {subtitle}
                </Text>
            )}

            <Text
                style={[
                    typography.bodySmall,
                    {
                        color: colors.textSecondary,
                        marginTop: spacing.xs,
                        textTransform: 'uppercase',
                        letterSpacing: 0.8,
                        fontSize: 11,
                        fontWeight: '600',
                    },
                ]}
            >
                {label}
            </Text>
        </Card>
    );
};

const styles = StyleSheet.create({
    container: {
        minHeight: 140,
    },
    compactContainer: {
        minHeight: 90,
    },
    compactContent: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    compactIconContainer: {
        width: 36,
        height: 36,
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: 12,
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    iconContainer: {
        width: 40,
        height: 40,
        alignItems: 'center',
        justifyContent: 'center',
    },
    trendBadge: {
        paddingHorizontal: 8,
        paddingVertical: 4,
    },
    trendText: {
        fontSize: 11,
        fontWeight: '700',
    },
});
