import React from 'react';
import { View, Text, ScrollView } from 'react-native';
import { Modal } from '../../components/Modal';
import { useTheme } from '../../theme/ThemeContext';
import { Ionicons } from '@expo/vector-icons';

interface Message {
    id: string;
    type: 'rent_reminder' | 'payment_confirmation' | 'announcement' | 'maintenance' | 'tenant_message';
    subject: string;
    preview: string;
    fullMessage: string;
    sender: string;
    date: string;
    read: boolean;
    category?: string;
    priority?: 'low' | 'normal' | 'urgent';
    status?: 'sent' | 'delivered' | 'read' | 'replied';
}

interface MessageDetailsModalProps {
    message: Message | null;
    visible: boolean;
    onClose: () => void;
}

export const MessageDetailsModal: React.FC<MessageDetailsModalProps> = ({ message, visible, onClose }) => {
    const { colors, spacing, typography, borderRadius } = useTheme();

    if (!message) return null;

    const getMessageIcon = (type: Message['type']) => {
        switch (type) {
            case 'rent_reminder':
                return 'time';
            case 'payment_confirmation':
                return 'checkmark-circle';
            case 'announcement':
                return 'megaphone';
            case 'maintenance':
                return 'hammer';
            case 'tenant_message':
                return 'send';
            default:
                return 'mail';
        }
    };

    const getMessageColor = (type: Message['type']) => {
        switch (type) {
            case 'rent_reminder':
                return colors.warning;
            case 'payment_confirmation':
                return colors.success;
            case 'announcement':
                return colors.info;
            case 'maintenance':
                return colors.accent;
            case 'tenant_message':
                return colors.primary;
            default:
                return colors.accent;
        }
    };

    const formatDate = (dateString: string) => {
        const date = new Date(dateString);
        return date.toLocaleDateString('en-GB', {
            weekday: 'long',
            day: 'numeric',
            month: 'long',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
        });
    };

    return (
        <Modal visible={visible} onClose={onClose} title="Message Details" size="large">
            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: spacing.lg }}>
                {/* Message Header */}
                <View style={{
                    backgroundColor: getMessageColor(message.type) + '15',
                    padding: spacing.lg,
                    borderRadius: borderRadius.md,
                    marginBottom: spacing.lg,
                    borderLeftWidth: 4,
                    borderLeftColor: getMessageColor(message.type),
                }}>
                    <View style={{ flexDirection: 'row', alignItems: 'flex-start', marginBottom: spacing.md }}>
                        <View style={{
                            backgroundColor: getMessageColor(message.type) + '30',
                            width: 48,
                            height: 48,
                            borderRadius: 24,
                            alignItems: 'center',
                            justifyContent: 'center',
                            marginRight: spacing.md,
                        }}>
                            <Ionicons name={getMessageIcon(message.type)} size={24} color={getMessageColor(message.type)} />
                        </View>
                        <View style={{ flex: 1 }}>
                            <Text style={[typography.h3, { color: colors.text }]}>
                                {message.subject}
                            </Text>
                        </View>
                    </View>

                    {/* Metadata */}
                    <View style={{ marginTop: spacing.md }}>
                        <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: spacing.xs }}>
                            <Ionicons name="person-outline" size={16} color={colors.textSecondary} />
                            <Text style={[typography.bodySmall, { color: colors.textSecondary, marginLeft: spacing.xs }]}>
                                From: <Text style={{ fontWeight: '600', color: colors.text }}>{message.sender}</Text>
                            </Text>
                        </View>
                        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                            <Ionicons name="calendar-outline" size={16} color={colors.textSecondary} />
                            <Text style={[typography.bodySmall, { color: colors.textSecondary, marginLeft: spacing.xs }]}>
                                {formatDate(message.date)}
                            </Text>
                        </View>
                    </View>
                </View>

                {/* Message Content */}
                <View style={{
                    backgroundColor: colors.surface,
                    padding: spacing.lg,
                    borderRadius: borderRadius.md,
                    marginBottom: spacing.lg,
                }}>
                    <Text style={[typography.body, { color: colors.text, lineHeight: 24 }]}>
                        {message.fullMessage}
                    </Text>
                </View>

                {/* Footer Notice */}
                <View style={{
                    backgroundColor: colors.infoLight,
                    padding: spacing.md,
                    borderRadius: borderRadius.md,
                    flexDirection: 'row',
                    alignItems: 'flex-start',
                }}>
                    <Ionicons name="shield-checkmark" size={20} color={colors.info} style={{ marginRight: spacing.sm }} />
                    <Text style={[typography.bodySmall, { color: colors.info, flex: 1, lineHeight: 18 }]}>
                        This is an official message from your property management. For any questions, please contact your property manager directly.
                    </Text>
                </View>
            </ScrollView>
        </Modal>
    );
};
