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

const { height: SCREEN_HEIGHT, width: SCREEN_WIDTH } = Dimensions.get('window');

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
    const scaleAnim = useRef(new Animated.Value(0.8)).current;
    const fadeAnim = useRef(new Animated.Value(0)).current;

    useEffect(() => {
        if (visible) {
            // Reset position before animating
            scaleAnim.setValue(0.8);
            Animated.parallel([
                Animated.timing(fadeAnim, {
                    toValue: 1,
                    duration: 250,
                    useNativeDriver: true,
                }),
                Animated.spring(scaleAnim, {
                    toValue: 1,
                    damping: 20,
                    stiffness: 200,
                    useNativeDriver: true,
                }),
            ]).start();
        } else {
            Animated.parallel([
                Animated.timing(fadeAnim, {
                    toValue: 0,
                    duration: 200,
                    useNativeDriver: true,
                }),
                Animated.timing(scaleAnim, {
                    toValue: 0.8,
                    duration: 200,
                    useNativeDriver: true,
                }),
            ]).start();
        }
    }, [visible, scaleAnim, fadeAnim]);

    const sizeStyles = {
        small: { height: SCREEN_HEIGHT * 0.5, width: SCREEN_WIDTH },
        medium: { height: SCREEN_HEIGHT * 0.65, width: SCREEN_WIDTH },
        large: { height: SCREEN_HEIGHT * 0.9, width: SCREEN_WIDTH },
        full: { height: SCREEN_HEIGHT, width: SCREEN_WIDTH },
    };

    return (
        <RNModal
            visible={visible}
            transparent
            animationType="none"
            onRequestClose={onClose}
            statusBarTranslucent
        >
            <View style={[styles.overlay, { backgroundColor: colors.overlay }]}>
                <Pressable style={StyleSheet.absoluteFill} onPress={onClose} />
            </View>

            <KeyboardAvoidingView
                behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                style={styles.keyboardView}
            >
                <View style={[styles.modalShadow, sizeStyles[size]]}>
                    <Animated.View
                        style={[
                            styles.modalContainer,
                            {
                                backgroundColor: colors.surface,
                                borderTopLeftRadius: borderRadius['2xl'],
                                borderTopRightRadius: borderRadius['2xl'],
                                borderWidth: 1,
                                borderColor: colors.border,
                                transform: [{ scale: scaleAnim }],
                                opacity: fadeAnim,
                            },
                        ]}
                    >
                        {/* Accent Header Bar */}
                        <View
                            style={[
                                styles.accentBar,
                                {
                                    backgroundColor: colors.accent,
                                    borderTopLeftRadius: borderRadius['2xl'],
                                    borderTopRightRadius: borderRadius['2xl'],
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
                            contentContainerStyle={{ padding: spacing.lg, paddingBottom: 120 }}
                            showsVerticalScrollIndicator={false}
                            bounces={false}
                            keyboardShouldPersistTaps="handled"
                        >
                            {children}
                        </ScrollView>
                    </Animated.View>
                </View>
            </KeyboardAvoidingView>
        </RNModal>
    );
};

const styles = StyleSheet.create({
    keyboardView: {
        flex: 1,
        justifyContent: 'flex-end',
        alignItems: 'center',
    },
    overlay: {
        ...StyleSheet.absoluteFillObject,
    },
    modalContainer: {
        flex: 1,
        overflow: 'hidden',
    },
    modalShadow: {
        shadowColor: '#000',
        shadowOffset: {
            width: 0,
            height: -2,
        },
        shadowOpacity: 0.25,
        shadowRadius: 3.84,
        elevation: 5,
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
