import React, { useState, useCallback, memo } from 'react';
import {
    TextInput as RNTextInput,
    View,
    Text,
    StyleSheet,
    TextInputProps as RNTextInputProps,
    ViewStyle,
    Platform,
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
    const { colors, spacing, borderRadius, typography } = useTheme();

    // Only use focus state on iOS - Android will use static styling
    const [isFocused, setIsFocused] = useState(false);

    const handleFocus = useCallback((e: any) => {
        if (Platform.OS === 'ios') {
            setIsFocused(true);
        }
        onFocus?.(e);
    }, [onFocus]);

    const handleBlur = useCallback((e: any) => {
        if (Platform.OS === 'ios') {
            setIsFocused(false);
        }
        onBlur?.(e);
    }, [onBlur]);

    // Static styles for Android, dynamic for iOS
    const labelStyle = {
        color: Platform.OS === 'android' ? colors.textSecondary : (isFocused ? colors.accent : colors.textSecondary),
        marginBottom: spacing.sm,
        fontWeight: '600' as const,
        letterSpacing: 0.3,
    };

    const inputContainerStyle = {
        backgroundColor: colors.background,
        borderColor: error ? colors.error : (Platform.OS === 'android' ? colors.border : (isFocused ? colors.accent : colors.border)),
        borderRadius: borderRadius.md,
        paddingHorizontal: spacing.base,
        borderWidth: 2,
    };

    return (
        <View style={[baseStyles.container, { marginBottom: spacing.base }, containerStyle]}>
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
                    baseStyles.inputContainer,
                    inputContainerStyle,
                ]}
            >
                {icon && (
                    <View style={[baseStyles.iconContainer, { marginRight: spacing.sm }]}>
                        {icon}
                    </View>
                )}
                <RNTextInput
                    {...props}
                    style={[
                        typography.body,
                        baseStyles.input,
                        { color: colors.text },
                        style,
                    ]}
                    placeholderTextColor={colors.textTertiary}
                    onFocus={handleFocus}
                    onBlur={handleBlur}
                    // Android-specific props to prevent autofill interference
                    {...(Platform.OS === 'android' && {
                        importantForAutofill: 'no',
                        autoComplete: 'off',
                    })}
                />
                {rightIcon && (
                    <View style={[baseStyles.iconContainer, { marginLeft: spacing.sm }]}>
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

const baseStyles = StyleSheet.create({
    container: {},
    inputContainer: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    input: {
        flex: 1,
        paddingVertical: 14,
    },
    iconContainer: {
        justifyContent: 'center',
        alignItems: 'center',
    },
});

// Use memo with a stable comparison
export const Input = memo(InputComponent, (prevProps, nextProps) => {
    // Only re-render if essential props change
    const keysToCheck: (keyof InputProps)[] = [
        'value', 'onChangeText', 'placeholder', 'label', 'error', 'hint',
        'secureTextEntry', 'keyboardType', 'autoCapitalize', 'editable',
        'multiline', 'numberOfLines', 'maxLength', 'style', 'containerStyle'
    ];

    for (const key of keysToCheck) {
        if (prevProps[key] !== nextProps[key]) {
            return false;
        }
    }
    return true;
});
