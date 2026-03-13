import React, { useState } from 'react';
import {
    View,
    Text,
    Modal,
    TouchableOpacity,
    TextInput,
    KeyboardAvoidingView,
    Platform,
    ScrollView,
} from 'react-native';
import { useTheme } from '../theme/ThemeContext';
import { Button } from './Button';
import { Ionicons } from '@expo/vector-icons';

interface MobileMoneyPaymentModalProps {
    visible: boolean;
    amount: number;
    onClose: () => void;
    onSubmit: (phoneNumber: string, network: 'MTN' | 'AIRTEL') => void;
    error?: string | null;
}

export const MobileMoneyPaymentModal: React.FC<MobileMoneyPaymentModalProps> = ({
    visible,
    amount,
    onClose,
    onSubmit,
    error,
}) => {
    const { colors, spacing, typography, borderRadius } = useTheme();
    const [phoneNumber, setPhoneNumber] = useState('');
    const [network, setNetwork] = useState<'MTN' | 'AIRTEL'>('MTN');

    const handleSubmit = () => {
        if (!phoneNumber.trim()) {
            return;
        }
        onSubmit(phoneNumber.trim(), network);
    };

    const handleClose = () => {
        setPhoneNumber('');
        onClose();
    };

    return (
        <Modal
            visible={visible}
            transparent
            animationType="slide"
            onRequestClose={handleClose}
        >
            <KeyboardAvoidingView
                behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                style={{ flex: 1 }}
            >
                <TouchableOpacity
                    activeOpacity={1}
                    onPress={handleClose}
                    style={{
                        flex: 1,
                        backgroundColor: 'rgba(0,0,0,0.5)',
                        justifyContent: 'flex-end',
                    }}
                >
                    <TouchableOpacity activeOpacity={1} onPress={(e) => e.stopPropagation()}>
                        <View
                            style={{
                                backgroundColor: colors.background,
                                borderTopLeftRadius: borderRadius.xl,
                                borderTopRightRadius: borderRadius.xl,
                                paddingTop: spacing.lg,
                                paddingBottom: spacing.xl,
                                paddingHorizontal: spacing.lg,
                                maxHeight: '80%',
                            }}
                        >
                            <ScrollView showsVerticalScrollIndicator={false}>
                                {/* Header */}
                                <View
                                    style={{
                                        flexDirection: 'row',
                                        justifyContent: 'space-between',
                                        alignItems: 'center',
                                        marginBottom: spacing.lg,
                                    }}
                                >
                                    <Text style={[typography.h3, { color: colors.text }]}>
                                        Mobile Money Payment
                                    </Text>
                                    <TouchableOpacity onPress={handleClose}>
                                        <Ionicons name="close" size={28} color={colors.textSecondary} />
                                    </TouchableOpacity>
                                </View>

                                {/* Amount Display */}
                                <View
                                    style={{
                                        backgroundColor: colors.primary + '10',
                                        padding: spacing.lg,
                                        borderRadius: borderRadius.lg,
                                        marginBottom: spacing.lg,
                                        alignItems: 'center',
                                    }}
                                >
                                    <Text style={[typography.bodySmall, { color: colors.textSecondary, marginBottom: spacing.xs }]}>
                                        Amount to Pay
                                    </Text>
                                    <Text style={[typography.h1, { color: colors.primary, fontSize: 32 }]}>
                                        UGX {amount.toLocaleString()}
                                    </Text>
                                </View>

                                {/* Network Selection */}
                                <Text style={[typography.body, { color: colors.text, marginBottom: spacing.sm, fontWeight: '600' }]}>
                                    Select Network
                                </Text>
                                <View style={{ flexDirection: 'row', marginBottom: spacing.lg, gap: spacing.md }}>
                                    {(['MTN', 'AIRTEL'] as const).map((net) => {
                                        const selected = network === net;
                                        const netColor = net === 'MTN' ? '#FFCC00' : '#ED1C24';
                                        return (
                                            <TouchableOpacity
                                                key={net}
                                                onPress={() => setNetwork(net)}
                                                style={{
                                                    flex: 1,
                                                    paddingVertical: spacing.md,
                                                    borderRadius: borderRadius.lg,
                                                    borderWidth: 2,
                                                    borderColor: selected ? netColor : colors.border,
                                                    backgroundColor: selected ? netColor + '15' : colors.surface,
                                                    alignItems: 'center',
                                                }}
                                            >
                                                <Text
                                                    style={[
                                                        typography.body,
                                                        {
                                                            color: selected ? (net === 'MTN' ? '#000' : '#ED1C24') : colors.textSecondary,
                                                            fontWeight: selected ? '700' : '500',
                                                        },
                                                    ]}
                                                >
                                                    {net === 'MTN' ? 'MTN MoMo' : 'Airtel Money'}
                                                </Text>
                                            </TouchableOpacity>
                                        );
                                    })}
                                </View>

                                {/* Phone Number Input */}
                                <Text style={[typography.body, { color: colors.text, marginBottom: spacing.sm, fontWeight: '600' }]}>
                                    Mobile Money Number
                                </Text>
                                <TextInput
                                    style={{
                                        borderWidth: 1,
                                        borderColor: colors.border,
                                        borderRadius: borderRadius.lg,
                                        padding: spacing.md,
                                        color: colors.text,
                                        fontSize: 16,
                                        backgroundColor: colors.surface,
                                        marginBottom: spacing.sm,
                                    }}
                                    placeholder="e.g. 0771234567"
                                    placeholderTextColor={colors.textSecondary}
                                    value={phoneNumber}
                                    onChangeText={setPhoneNumber}
                                    keyboardType="phone-pad"
                                    autoFocus
                                />

                                {/* Error Message */}
                                {!!error && (
                                    <View
                                        style={{
                                            backgroundColor: colors.error + '10',
                                            padding: spacing.sm,
                                            borderRadius: borderRadius.md,
                                            marginBottom: spacing.md,
                                            flexDirection: 'row',
                                            alignItems: 'center',
                                        }}
                                    >
                                        <Ionicons name="alert-circle" size={16} color={colors.error} />
                                        <Text style={[typography.bodySmall, { color: colors.error, marginLeft: spacing.xs, flex: 1 }]}>
                                            {error}
                                        </Text>
                                    </View>
                                )}

                                {/* Info Text */}
                                <View
                                    style={{
                                        backgroundColor: colors.info + '10',
                                        padding: spacing.md,
                                        borderRadius: borderRadius.md,
                                        marginBottom: spacing.lg,
                                    }}
                                >
                                    <Text style={[typography.bodySmall, { color: colors.text }]}>
                                        You will receive a payment prompt on your phone. Enter your Mobile Money PIN to complete the payment.
                                    </Text>
                                </View>

                                {/* Action Buttons */}
                                <View style={{ flexDirection: 'row', gap: spacing.md }}>
                                    <Button
                                        title="Cancel"
                                        onPress={handleClose}
                                        variant="outline"
                                        style={{ flex: 1 }}
                                    />
                                    <Button
                                        title="Send Payment Prompt"
                                        onPress={handleSubmit}
                                        variant="primary"
                                        style={{ flex: 2 }}
                                        disabled={!phoneNumber.trim()}
                                    />
                                </View>
                            </ScrollView>
                        </View>
                    </TouchableOpacity>
                </TouchableOpacity>
            </KeyboardAvoidingView>
        </Modal>
    );
};
