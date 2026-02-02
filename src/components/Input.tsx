import React, { useState, useCallback, useMemo } from 'react';
import {
    TextInput as RNTextInput,
    View,
    Text,
    StyleSheet,
    TextInputProps as RNTextInputProps,
    ViewStyle,
    Animated,
} from 'react-native';
import { useTheme } from '../theme/ThemeContext';

interface InputProps extends RNTextInputProps {
    label?: string;
    error?: string;
    hint?: string;
    icon?: React.ReactNode;
    rightIcon?: React.ReactNode;
    containerStyle?: ViewStyle;
}

const InputComponent: React.FC<InputProps> = ({
    label,
    error,
    hint,
    icon,
    rightIcon,
    containerStyle,
    style,
    onFocus,
    onBlur,
    ...props
}) => {
    const { colors, spacing, borderRadius, typography, shadows } = useTheme();
    const [isFocused, setIsFocused] = useState(false);

    // Memoize dynamic styles to prevent re-renders
    const labelStyle = useMemo(() => ({
        color: isFocused ? colors.accent : colors.textSecondary,
        marginBottom: spacing.sm,
        fontWeight: '600' as const,
        letterSpacing: 0.3,
    }), [isFocused, colors.accent, colors.textSecondary, spacing.sm]);

    const containerStyleMemo = useMemo(() => ({
        backgroundColor: isFocused ? colors.surface : colors.background,
        borderColor: error ? colors.error : isFocused ? colors.accent : colors.border,
        borderRadius: borderRadius.md,
        paddingHorizontal: spacing.base,
        borderWidth: 2,
    }), [isFocused, error, colors.surface, colors.background, colors.error, colors.accent, colors.border, borderRadius.md, spacing.base]);

    const getBorderColor = () => {
        if (error) return colors.error;
        if (isFocused) return colors.accent;
        return colors.border;
    };

    const getBackgroundColor = () => {
        if (isFocused) return colors.surface;
        return colors.background;
    };

    const handleFocus = useCallback((e: any) => {
        setIsFocused(true);
        onFocus?.(e);
    }, [onFocus]);

    const handleBlur = useCallback((e: any) => {
        setIsFocused(false);
        onBlur?.(e);
    }, [onBlur]);

    return (
        <View style={[styles.container, { marginBottom: spacing.base }, containerStyle]}>
            {label && (
                <Text
                    style={labelStyle}
                    pointerEvents="none"
                >
                    {label}
                </Text>
            )}

            <View
                style={[
                    styles.inputContainer,
                    containerStyleMemo,
                    isFocused && shadows.sm,
                ]}
            >
                {icon && (
                    <View style={[styles.iconContainer, { marginRight: spacing.sm }]}>
                        {icon}
                    </View>
                )}
                <RNTextInput
                    {...props}
                    style={[
                        typography.body,
                        inputStyle,
                        style,
                    ]}
                    placeholderTextColor={colors.textTertiary}
                    onFocus={handleFocus}
                    onBlur={handleBlur}
                />
                {rightIcon && (
                    <View style={[styles.iconContainer, { marginLeft: spacing.sm }]}>
                        {rightIcon}
                    </View>
                )}
            </View>

            {(error || hint) && (
                <Text
                    style={[
                        typography.bodySmall,
                        {
                            color: error ? colors.error : colors.textTertiary,
                            marginTop: spacing.xs,
                            marginLeft: spacing.xs,
                        },
                    ]}
                >
                    {error || hint}
                </Text>
            )}
        </View>
    );
};

const styles = StyleSheet.create({
    container: {},
    inputContainer: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    input: {
        flex: 1,
    },
    iconContainer: {
        justifyContent: 'center',
        alignItems: 'center',
    },
});

// Static input style
const inputStyle = {
    flex: 1,
    paddingVertical: 14,
};

// Export memoized version to prevent unnecessary re-renders
export const Input = React.memo(InputComponent);
