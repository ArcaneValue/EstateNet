import React from 'react';
import { View, Text, ViewStyle } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../theme/ThemeContext';

interface InfoBannerProps {
    icon: keyof typeof Ionicons.glyphMap;
    title: string;
    message: string;
    variant?: 'info' | 'warning' | 'success' | 'error';
    style?: ViewStyle;
}

export const InfoBanner: React.FC<InfoBannerProps> = ({
    icon,
    title,
    message,
    variant = 'info',
    style,
}) => {
    const { colors, spacing, typography, borderRadius } = useTheme();

    const variantConfig = {
        info: {
            backgroundColor: colors.infoLight,
            borderColor: colors.info,
            iconColor: colors.info,
            textColor: colors.info,
        },
        warning: {
            backgroundColor: colors.warningLight,
            borderColor: colors.warning,
            iconColor: colors.warning,
            textColor: colors.warning,
        },
        success: {
            backgroundColor: colors.successLight,
            borderColor: colors.success,
            iconColor: colors.success,
            textColor: colors.success,
        },
        error: {
            backgroundColor: colors.errorLight,
            borderColor: colors.error,
            iconColor: colors.error,
            textColor: colors.error,
        },
    };

    const config = variantConfig[variant];

    return (
        <View
            style={[
                {
                    backgroundColor: config.backgroundColor,
                    borderLeftWidth: 4,
                    borderLeftColor: config.borderColor,
                    padding: spacing.md,
                    borderRadius: borderRadius.sm,
                    flexDirection: 'row',
                    alignItems: 'flex-start',
                },
                style,
            ]}
        >
            <Ionicons
                name={icon}
                size={20}
                color={config.iconColor}
                style={{ marginRight: spacing.sm, marginTop: 2 }}
            />
            <View style={{ flex: 1 }}>
                <Text
                    style={[
                        typography.bodySmall,
                        {
                            color: config.textColor,
                            fontWeight: '600',
                            marginBottom: spacing.xs,
                        },
                    ]}
                >
                    {title}
                </Text>
                <Text
                    style={[
                        typography.bodySmall,
                        {
                            color: config.textColor,
                            lineHeight: 18,
                        },
                    ]}
                >
                    {message}
                </Text>
            </View>
        </View>
    );
};
