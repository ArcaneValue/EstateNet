import React, { useState } from 'react';
import {
    TouchableOpacity,
    Text,
    StyleSheet,
    ViewStyle,
    TextStyle,
    ActivityIndicator,
    View,
} from 'react-native';
import { useTheme } from '../theme/ThemeContext';

interface ButtonProps {
    title: string;
    onPress: () => void;
    variant?: 'primary' | 'secondary' | 'outline' | 'ghost' | 'accent' | 'pill' | 'soft';
    size?: 'small' | 'medium' | 'large' | 'compact';
    disabled?: boolean;
    loading?: boolean;
    fullWidth?: boolean;
    style?: ViewStyle;
    textStyle?: TextStyle;
    icon?: React.ReactNode;
    iconPosition?: 'left' | 'right';
}

export const Button: React.FC<ButtonProps> = ({
    title,
    onPress,
    variant = 'primary',
    size = 'medium',
    disabled = false,
    loading = false,
    fullWidth = false,
    style,
    textStyle,
    icon,
    iconPosition = 'left',
}) => {
    const { colors, borderRadius, spacing, typography, shadows } = useTheme();
    const [isPressed, setIsPressed] = useState(false);

    const getButtonStyle = (): ViewStyle => {
        const baseStyle: ViewStyle = {
            borderRadius: borderRadius.md,
            alignItems: 'center',
            justifyContent: 'center',
            flexDirection: 'row',
            gap: spacing.sm,
        };

        if (fullWidth) {
            baseStyle.width = '100%';
        }

        // Size variations
        const sizeStyles = {
            small: {
                paddingVertical: spacing.sm + 2,
                paddingHorizontal: spacing.base,
                borderRadius: borderRadius.sm,
            },
            medium: {
                paddingVertical: spacing.md + 2,
                paddingHorizontal: spacing.lg,
                borderRadius: borderRadius.md,
            },
            large: {
                paddingVertical: spacing.base,
                paddingHorizontal: spacing.xl,
                borderRadius: borderRadius.md,
            },
            compact: {
                paddingVertical: spacing.xs,
                paddingHorizontal: spacing.base,
                borderRadius: borderRadius.full,
            },
        };

        // Variant variations - Option C: Outlined style with filled states
        const variantStyles: Record<string, ViewStyle> = {
            primary: {
                backgroundColor: isPressed ? colors.primaryLight : colors.primary,
                borderWidth: 2,
                borderColor: colors.primary,
                ...shadows.sm,
            },
            secondary: {
                backgroundColor: isPressed ? colors.primaryLight : 'transparent',
                borderWidth: 2,
                borderColor: colors.primary,
            },
            outline: {
                backgroundColor: isPressed ? colors.background : 'transparent',
                borderWidth: 2,
                borderColor: colors.borderStrong,
            },
            ghost: {
                backgroundColor: isPressed ? colors.background : 'transparent',
                borderWidth: 0,
            },
            accent: {
                backgroundColor: isPressed ? colors.accentLight : colors.accent,
                borderWidth: 2,
                borderColor: colors.accent,
                ...shadows.sm,
            },
            pill: {
                backgroundColor: isPressed ? colors.surface2 : colors.surface,
                borderWidth: 1,
                borderColor: colors.border,
                borderRadius: borderRadius.full,
            },
            soft: {
                backgroundColor: colors.primary + '12',
                borderWidth: 0,
                borderRadius: borderRadius.full,
            },
        };

        return {
            ...baseStyle,
            ...sizeStyles[size],
            ...variantStyles[variant],
            opacity: disabled ? 0.5 : 1,
        };
    };

    const getTextStyle = (): TextStyle => {
        const sizeTextStyles = {
            small: typography.buttonSmall,
            medium: typography.button,
            large: { ...typography.button, fontSize: 16 },
            compact: { ...typography.bodySmall, fontWeight: '600' },
        };

        const variantTextStyles: Record<string, TextStyle> = {
            primary: { color: colors.textOnPrimary, fontWeight: '600' },
            secondary: { color: isPressed ? colors.textOnPrimary : colors.primary, fontWeight: '600' },
            outline: { color: colors.text, fontWeight: '600' },
            ghost: { color: colors.primary, fontWeight: '600' },
            accent: { color: colors.textOnAccent, fontWeight: '600' },
            pill: { color: colors.text, fontWeight: '600' },
            soft: { color: colors.primary, fontWeight: '600' },
        };

        return {
            ...sizeTextStyles[size],
            ...variantTextStyles[variant],
        } as TextStyle;
    };

    const getIconColor = (): string => {
        switch (variant) {
            case 'primary':
                return colors.textOnPrimary;
            case 'secondary':
                return isPressed ? colors.textOnPrimary : colors.primary;
            case 'outline':
                return colors.text;
            case 'ghost':
                return colors.primary;
            case 'accent':
                return colors.textOnAccent;
            case 'pill':
                return colors.text;
            case 'soft':
                return colors.primary;
            default:
                return colors.textOnPrimary;
        }
    };

    return (
        <TouchableOpacity
            onPress={onPress}
            disabled={disabled || loading}
            style={[getButtonStyle(), style]}
            activeOpacity={0.9}
            onPressIn={() => setIsPressed(true)}
            onPressOut={() => setIsPressed(false)}
        >
            {loading ? (
                <ActivityIndicator
                    color={
                        variant === 'primary' || variant === 'accent'
                            ? colors.textOnPrimary
                            : colors.primary
                    }
                />
            ) : (
                <>
                    {icon && iconPosition === 'left' && (
                        <View style={{ marginRight: spacing.xs }}>{icon}</View>
                    )}
                    <Text style={[getTextStyle(), textStyle]}>{title}</Text>
                    {icon && iconPosition === 'right' && (
                        <View style={{ marginLeft: spacing.xs }}>{icon}</View>
                    )}
                </>
            )}
        </TouchableOpacity>
    );
};
