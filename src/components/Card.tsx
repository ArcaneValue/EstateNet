import React from 'react';
import { View, StyleSheet, ViewStyle, Platform } from 'react-native';
import { BlurView } from 'expo-blur';
import { useTheme } from '../theme/ThemeContext';

interface CardProps {
    children: React.ReactNode;
    style?: ViewStyle;
    variant?: 'default' | 'glass' | 'outlined' | 'elevated' | 'surface2';
    noPadding?: boolean;
    accentTop?: boolean;
    padding?: number;
}

export const Card: React.FC<CardProps> = ({
    children,
    style,
    variant = 'default',
    noPadding = false,
    accentTop = false,
    padding,
}) => {
    const { colors, borderRadius, shadows, spacing, isDark } = useTheme();

    const getCardStyle = (): ViewStyle => {
        const baseStyle: ViewStyle = {
            borderRadius: borderRadius.lg,
            padding: noPadding ? 0 : (padding !== undefined ? padding : spacing.base),
            overflow: 'hidden',
        };

        switch (variant) {
            case 'glass':
                return {
                    ...baseStyle,
                    backgroundColor: colors.surfaceGlass,
                    borderWidth: 1,
                    borderColor: colors.glassBorder,
                    ...shadows.glass,
                };
            case 'outlined':
                return {
                    ...baseStyle,
                    backgroundColor: colors.surface,
                    borderWidth: 1.5,
                    borderColor: colors.border,
                };
            case 'elevated':
                return {
                    ...baseStyle,
                    backgroundColor: colors.surface,
                    borderWidth: 1,
                    borderColor: colors.borderLight,
                    ...shadows.lg,
                };
            case 'surface2':
                return {
                    ...baseStyle,
                    backgroundColor: colors.surface2,
                    borderWidth: 0,
                    ...shadows.sm,
                };
            default:
                return {
                    ...baseStyle,
                    backgroundColor: colors.surface,
                    borderWidth: 0,
                    ...shadows.sm,
                };
        }
    };

    const cardContent = (
        <>
            {accentTop && (
                <View
                    style={{
                        position: 'absolute',
                        top: 0,
                        left: 0,
                        right: 0,
                        height: 4,
                        backgroundColor: colors.accent,
                        borderTopLeftRadius: borderRadius.lg,
                        borderTopRightRadius: borderRadius.lg,
                    }}
                />
            )}
            <View style={accentTop ? { paddingTop: spacing.xs } : undefined}>
                {children}
            </View>
        </>
    );

    if (variant === 'glass' && Platform.OS === 'ios') {
        return (
            <View style={[getCardStyle(), style]}>
                <BlurView
                    intensity={isDark ? 40 : 60}
                    tint={isDark ? 'dark' : 'light'}
                    style={StyleSheet.absoluteFill}
                />
                <View style={{ padding: noPadding ? 0 : spacing.base }}>
                    {cardContent}
                </View>
            </View>
        );
    }

    return (
        <View style={[getCardStyle(), style]}>
            {cardContent}
        </View>
    );
};

const styles = StyleSheet.create({});
