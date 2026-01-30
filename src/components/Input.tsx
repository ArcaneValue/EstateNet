import React, { useState } from 'react';
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

export const Input: React.FC<InputProps> = ({
    label,
    error,
    hint,
    icon,
    rightIcon,
    containerStyle,
    style,
    ...props
}) => {
    const { colors, spacing, borderRadius, typography, shadows } = useTheme();
    const [isFocused, setIsFocused] = useState(false);

    const getBorderColor = () => {
        if (error) return colors.error;
        if (isFocused) return colors.accent;
        return colors.border;
    };

    const getBackgroundColor = () => {
        if (isFocused) return colors.surface;
        return colors.background;
    };

    return (
        <View style={[styles.container, { marginBottom: spacing.base }, containerStyle]}>
            {label && (
                <Text
                    style={[
                        typography.bodySmall,
                        {
                            color: isFocused ? colors.accent : colors.textSecondary,
                            marginBottom: spacing.sm,
                            fontWeight: '600',
                            letterSpacing: 0.3,
                        },
                    ]}
                >
                    {label}
                </Text>
            )}

            <View
                style={[
                    styles.inputContainer,
                    {
                        backgroundColor: getBackgroundColor(),
                        borderColor: getBorderColor(),
                        borderRadius: borderRadius.md,
                        paddingHorizontal: spacing.base,
                        borderWidth: 2,
                    },
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
                        {
                            flex: 1,
                            color: colors.text,
                            paddingVertical: spacing.md + 2,
                        },
                        style,
                    ]}
                    placeholderTextColor={colors.textTertiary}
                    onFocus={(e) => {
                        setIsFocused(true);
                        props.onFocus?.(e);
                    }}
                    onBlur={(e) => {
                        setIsFocused(false);
                        props.onBlur?.(e);
                    }}
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
    iconContainer: {
        justifyContent: 'center',
        alignItems: 'center',
    },
});
