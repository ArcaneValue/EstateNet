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
    variant?: 'default' | 'glass' | 'accent';
}

export const MetricCard: React.FC<MetricCardProps> = ({
    value,
    label,
    icon,
    trend,
    color,
    variant = 'default',
}) => {
    const { colors, spacing, typography, borderRadius } = useTheme();

    const cardVariant = variant === 'accent' ? 'default' : variant === 'glass' ? 'glass' : 'default';

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
                                backgroundColor: colors.background,
                                borderRadius: borderRadius.md,
                                borderWidth: 1,
                                borderColor: colors.border,
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
                    typography.metric,
                    {
                        color: color || colors.text,
                        marginTop: spacing.md,
                    },
                ]}
            >
                {value}
            </Text>

            <Text
                style={[
                    typography.metricLabel,
                    {
                        color: colors.textSecondary,
                        marginTop: spacing.xs,
                        textTransform: 'uppercase',
                        letterSpacing: 0.5,
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
        minHeight: 130,
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    iconContainer: {
        width: 44,
        height: 44,
        alignItems: 'center',
        justifyContent: 'center',
    },
    trendBadge: {
        paddingHorizontal: 10,
        paddingVertical: 5,
    },
    trendText: {
        fontSize: 12,
        fontWeight: '700',
    },
});
