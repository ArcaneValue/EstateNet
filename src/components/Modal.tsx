import React, { useEffect, useRef } from 'react';
import {
    Modal as RNModal,
    View,
    Text,
    TouchableOpacity,
    StyleSheet,
    ScrollView,
    Animated,
    Dimensions,
    KeyboardAvoidingView,
    Platform,
    Pressable,
} from 'react-native';
import { useTheme } from '../theme/ThemeContext';
import { Ionicons } from '@expo/vector-icons';

const { height: SCREEN_HEIGHT } = Dimensions.get('window');

interface ModalProps {
    visible: boolean;
    onClose: () => void;
    title?: string;
    children: React.ReactNode;
    size?: 'small' | 'medium' | 'large' | 'full';
    showCloseButton?: boolean;
}

export const Modal: React.FC<ModalProps> = ({
    visible,
    onClose,
    title,
    children,
    size = 'medium',
    showCloseButton = true,
}) => {
    const { colors, spacing, typography, borderRadius, shadows } = useTheme();
    const slideAnim = useRef(new Animated.Value(SCREEN_HEIGHT)).current;
    const fadeAnim = useRef(new Animated.Value(0)).current;

    useEffect(() => {
        if (visible) {
            Animated.parallel([
                Animated.timing(fadeAnim, {
                    toValue: 1,
                    duration: 200,
                    useNativeDriver: true,
                }),
                Animated.spring(slideAnim, {
                    toValue: 0,
                    damping: 20,
                    stiffness: 150,
                    useNativeDriver: true,
                }),
            ]).start();
        } else {
            Animated.parallel([
                Animated.timing(fadeAnim, {
                    toValue: 0,
                    duration: 150,
                    useNativeDriver: true,
                }),
                Animated.timing(slideAnim, {
                    toValue: SCREEN_HEIGHT,
                    duration: 200,
                    useNativeDriver: true,
                }),
            ]).start();
        }
    }, [visible]);

    const sizeStyles = {
        small: { maxHeight: SCREEN_HEIGHT * 0.4 },
        medium: { maxHeight: SCREEN_HEIGHT * 0.6 },
        large: { maxHeight: SCREEN_HEIGHT * 0.85 },
        full: { height: '100%' as const },
    };

    return (
        <RNModal
            visible={visible}
            transparent
            animationType="none"
            onRequestClose={onClose}
            statusBarTranslucent
        >
            <KeyboardAvoidingView
                behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                style={styles.keyboardView}
            >
                <Animated.View
                    style={[
                        styles.overlay,
                        {
                            backgroundColor: colors.overlay,
                            opacity: fadeAnim,
                        },
                    ]}
                >
                    <Pressable style={StyleSheet.absoluteFill} onPress={onClose} />
                </Animated.View>

                <Animated.View
                    style={[
                        styles.modalContainer,
                        {
                            backgroundColor: colors.surface,
                            borderTopLeftRadius: size === 'full' ? 0 : borderRadius['2xl'],
                            borderTopRightRadius: size === 'full' ? 0 : borderRadius['2xl'],
                            borderWidth: size === 'full' ? 0 : 1,
                            borderBottomWidth: 0,
                            borderColor: colors.border,
                            transform: [{ translateY: slideAnim }],
                            ...sizeStyles[size],
                            ...shadows.xl,
                        },
                    ]}
                >
                    {/* Accent Header Bar */}
                    <View
                        style={[
                            styles.accentBar,
                            {
                                backgroundColor: colors.accent,
                                borderTopLeftRadius: size === 'full' ? 0 : borderRadius['2xl'],
                                borderTopRightRadius: size === 'full' ? 0 : borderRadius['2xl'],
                            },
                        ]}
                    />

                    {/* Drag Handle */}
                    {size !== 'full' && (
                        <View style={styles.handleContainer}>
                            <View
                                style={[
                                    styles.handle,
                                    { backgroundColor: colors.borderStrong },
                                ]}
                            />
                        </View>
                    )}

                    {/* Header */}
                    {(title || showCloseButton) && (
                        <View
                            style={[
                                styles.header,
                                {
                                    borderBottomColor: colors.border,
                                    paddingHorizontal: spacing.lg,
                                    paddingTop: spacing.sm,
                                    paddingBottom: spacing.base,
                                },
                            ]}
                        >
                            {title && (
                                <Text style={[typography.h3, { color: colors.text, flex: 1, fontWeight: '700' }]}>
                                    {title}
                                </Text>
                            )}
                            {showCloseButton && (
                                <TouchableOpacity
                                    onPress={onClose}
                                    style={[
                                        styles.closeButton,
                                        {
                                            backgroundColor: colors.background,
                                            borderRadius: borderRadius.full,
                                        },
                                    ]}
                                >
                                    <Ionicons name="close" size={20} color={colors.textSecondary} />
                                </TouchableOpacity>
                            )}
                        </View>
                    )}

                    {/* Content */}
                    <ScrollView
                        style={styles.content}
                        contentContainerStyle={{ padding: spacing.lg, paddingBottom: spacing.xl }}
                        showsVerticalScrollIndicator={false}
                        bounces={false}
                    >
                        {children}
                    </ScrollView>
                </Animated.View>
            </KeyboardAvoidingView>
        </RNModal>
    );
};

const styles = StyleSheet.create({
    keyboardView: {
        flex: 1,
        justifyContent: 'flex-end',
    },
    overlay: {
        ...StyleSheet.absoluteFillObject,
    },
    modalContainer: {
        width: '100%',
        overflow: 'hidden',
    },
    accentBar: {
        height: 4,
        width: '100%',
    },
    handleContainer: {
        alignItems: 'center',
        paddingVertical: 12,
    },
    handle: {
        width: 40,
        height: 4,
        borderRadius: 2,
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        borderBottomWidth: 1,
    },
    closeButton: {
        padding: 8,
        marginLeft: 12,
    },
    content: {
        flex: 1,
    },
});
