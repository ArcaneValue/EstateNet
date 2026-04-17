import React, { useState } from 'react';
import {
    View,
    Text,
    Modal,
    TextInput,
    TouchableOpacity,
    StyleSheet,
    Alert
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../theme/ThemeContext';

interface SecurityCodeModalProps {
    visible: boolean;
    onClose: () => void;
    onSuccess: () => void;
}

const SECURITY_CODE = '2468097531';

export const SecurityCodeModal: React.FC<SecurityCodeModalProps> = ({ visible, onClose, onSuccess }) => {
    const { colors } = useTheme();
    const [code, setCode] = useState('');

    const handleVerify = () => {
        if (code === SECURITY_CODE) {
            setCode('');
            onSuccess();
        } else {
            Alert.alert('Access Denied', 'Invalid security code');
            setCode('');
        }
    };

    const handleClose = () => {
        setCode('');
        onClose();
    };

    return (
        <Modal
            visible={visible}
            transparent
            animationType="fade"
            onRequestClose={handleClose}
        >
            <View style={styles.overlay}>
                <View style={[styles.modalContainer, { backgroundColor: colors.surface }]}>
                    <View style={styles.header}>
                        <View style={[styles.iconContainer, { backgroundColor: colors.error + '15' }]}>
                            <Ionicons name="lock-closed" size={32} color={colors.error} />
                        </View>
                        <Text style={[styles.title, { color: colors.text }]}>Security Verification</Text>
                        <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
                            Enter the security code to create a new admin
                        </Text>
                    </View>

                    <View style={styles.form}>
                        <View style={[styles.inputWrapper, { backgroundColor: colors.background, borderColor: colors.border }]}>
                            <Ionicons name="key-outline" size={20} color={colors.textSecondary} />
                            <TextInput
                                style={[styles.input, { color: colors.text }]}
                                placeholder="Enter security code"
                                placeholderTextColor={colors.textTertiary}
                                value={code}
                                onChangeText={setCode}
                                keyboardType="number-pad"
                                maxLength={10}
                                secureTextEntry
                            />
                        </View>
                    </View>

                    <View style={styles.actions}>
                        <TouchableOpacity
                            style={[styles.button, styles.cancelButton, { backgroundColor: colors.background }]}
                            onPress={handleClose}
                        >
                            <Text style={[styles.buttonText, { color: colors.textSecondary }]}>Cancel</Text>
                        </TouchableOpacity>

                        <TouchableOpacity
                            style={[styles.button, styles.verifyButton, { backgroundColor: colors.primary }]}
                            onPress={handleVerify}
                        >
                            <Text style={styles.verifyButtonText}>Verify</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </View>
        </Modal>
    );
};

const styles = StyleSheet.create({
    overlay: {
        flex: 1,
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        justifyContent: 'center',
        alignItems: 'center',
        padding: 20
    },
    modalContainer: {
        width: '100%',
        maxWidth: 400,
        borderRadius: 16,
        padding: 24,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
        elevation: 8
    },
    header: {
        alignItems: 'center',
        marginBottom: 24
    },
    iconContainer: {
        width: 64,
        height: 64,
        borderRadius: 32,
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 16
    },
    title: {
        fontSize: 24,
        fontWeight: 'bold',
        marginBottom: 8
    },
    subtitle: {
        fontSize: 14,
        textAlign: 'center',
        lineHeight: 20
    },
    form: {
        marginBottom: 24
    },
    inputWrapper: {
        flexDirection: 'row',
        alignItems: 'center',
        borderWidth: 1,
        borderRadius: 8,
        paddingHorizontal: 12,
        height: 48
    },
    input: {
        flex: 1,
        marginLeft: 8,
        fontSize: 16
    },
    actions: {
        flexDirection: 'row',
        gap: 12
    },
    button: {
        flex: 1,
        height: 48,
        borderRadius: 8,
        alignItems: 'center',
        justifyContent: 'center'
    },
    cancelButton: {
        borderWidth: 1,
        borderColor: '#e0e0e0'
    },
    verifyButton: {
        // backgroundColor set dynamically
    },
    buttonText: {
        fontSize: 16,
        fontWeight: '600'
    },
    verifyButtonText: {
        fontSize: 16,
        fontWeight: '600',
        color: '#fff'
    }
});
