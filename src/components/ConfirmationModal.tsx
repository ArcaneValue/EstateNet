import React from 'react';
import { Modal, View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { useTheme } from '../theme/ThemeContext';

interface ConfirmationModalProps {
    visible: boolean;
    title: string;
    message: string;
    confirmText?: string;
    cancelText?: string;
    onConfirm: () => void;
    onCancel: () => void;
    confirmButtonColor?: string;
}

export const ConfirmationModal: React.FC<ConfirmationModalProps> = ({
    visible,
    title,
    message,
    confirmText = 'Confirm',
    cancelText = 'Cancel',
    onConfirm,
    onCancel,
    confirmButtonColor,
}) => {
    const { colors, spacing, typography, borderRadius } = useTheme();

    return (
        <Modal
            visible={visible}
            transparent
            animationType="fade"
            onRequestClose={onCancel}
        >
            <TouchableOpacity
                style={styles.overlay}
                activeOpacity={1}
                onPress={onCancel}
            >
                <TouchableOpacity
                    activeOpacity={1}
                    onPress={(e) => e.stopPropagation()}
                    style={[
                        styles.modalContainer,
                        {
                            backgroundColor: colors.surface,
                            borderRadius: borderRadius.lg,
                            padding: spacing.xl,
                        },
                    ]}
                >
                    <Text
                        style={[
                            typography.h3,
                            {
                                color: colors.text,
                                marginBottom: spacing.md,
                                textAlign: 'center',
                            },
                        ]}
                    >
                        {title}
                    </Text>

                    <Text
                        style={[
                            typography.body,
                            {
                                color: colors.textSecondary,
                                marginBottom: spacing.xl,
                                textAlign: 'center',
                            },
                        ]}
                    >
                        {message}
                    </Text>

                    <View style={styles.buttonContainer}>
                        <TouchableOpacity
                            onPress={onCancel}
                            style={[
                                styles.button,
                                {
                                    backgroundColor: colors.background,
                                    borderColor: colors.border,
                                    borderWidth: 1,
                                    borderRadius: borderRadius.md,
                                    paddingVertical: spacing.md,
                                    flex: 1,
                                    marginRight: spacing.sm,
                                },
                            ]}
                        >
                            <Text
                                style={[
                                    typography.button,
                                    {
                                        color: colors.text,
                                        textAlign: 'center',
                                    },
                                ]}
                            >
                                {cancelText}
                            </Text>
                        </TouchableOpacity>

                        <TouchableOpacity
                            onPress={onConfirm}
                            style={[
                                styles.button,
                                {
                                    backgroundColor: confirmButtonColor || colors.error,
                                    borderRadius: borderRadius.md,
                                    paddingVertical: spacing.md,
                                    flex: 1,
                                    marginLeft: spacing.sm,
                                },
                            ]}
                        >
                            <Text
                                style={[
                                    typography.button,
                                    {
                                        color: '#FFFFFF',
                                        textAlign: 'center',
                                    },
                                ]}
                            >
                                {confirmText}
                            </Text>
                        </TouchableOpacity>
                    </View>
                </TouchableOpacity>
            </TouchableOpacity>
        </Modal>
    );
};

const styles = StyleSheet.create({
    overlay: {
        flex: 1,
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        justifyContent: 'center',
        alignItems: 'center',
        padding: 20,
    },
    modalContainer: {
        width: '100%',
        maxWidth: 400,
    },
    buttonContainer: {
        flexDirection: 'row',
        justifyContent: 'space-between',
    },
    button: {
        alignItems: 'center',
        justifyContent: 'center',
    },
});
