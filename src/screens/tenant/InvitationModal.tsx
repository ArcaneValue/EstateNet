import React from 'react';
import { View, Text, ScrollView } from 'react-native';
import { Modal } from '../../components';
import { Button } from '../../components/Button';
import { useTheme } from '../../theme/ThemeContext';
import { Ionicons } from '@expo/vector-icons';
import { TenantInvitation } from '../../context/TenantContext';

interface InvitationModalProps {
    invitation: TenantInvitation | null;
    visible: boolean;
    onAccept: (invitationId: string) => void;
    onReject: (invitationId: string) => void;
    isProcessing?: boolean;
}

export const InvitationModal: React.FC<InvitationModalProps> = ({
    invitation,
    visible,
    onAccept,
    onReject,
    isProcessing = false,
}) => {
    const { colors, spacing, typography, borderRadius } = useTheme();

    if (!invitation) return null;

    return (
        <Modal
            visible={visible}
            onClose={() => { }}
            title="Invitation"
            size="medium"
        >
            <ScrollView showsVerticalScrollIndicator={false}>
                {/* Icon */}
                <View style={{ alignItems: 'center', marginBottom: spacing.lg }}>
                    <View
                        style={{
                            backgroundColor: colors.primary + '20',
                            width: 80,
                            height: 80,
                            borderRadius: 40,
                            alignItems: 'center',
                            justifyContent: 'center',
                        }}
                    >
                        <Ionicons name="mail-open" size={40} color={colors.primary} />
                    </View>
                </View>

                {/* Message */}
                <View style={{ marginBottom: spacing.lg, alignItems: 'center' }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: spacing.md }}>
                        <Text style={[typography.h3, { color: colors.text, textAlign: 'center' }]}>
                            You're Invited!
                        </Text>
                        <View style={{
                            marginLeft: spacing.sm,
                            paddingHorizontal: spacing.sm,
                            paddingVertical: spacing.xs,
                            backgroundColor: colors.warning + '20',
                            borderRadius: borderRadius.sm
                        }}>
                            <Text style={[typography.caption, { color: colors.warning, fontWeight: '600' }]}>
                                {invitation.status.toUpperCase()}
                            </Text>
                        </View>
                    </View>
                    <Text style={[typography.body, { color: colors.textSecondary, textAlign: 'center', lineHeight: 24 }]}>
                        Property Manager is inviting you to join{'\n'}
                        <Text style={{ fontWeight: '700', color: colors.text }}>
                            {invitation.propertyName}
                        </Text>
                        {'\n'}as a tenant
                    </Text>
                </View>

                {/* Details Card */}
                <View
                    style={{
                        backgroundColor: colors.surface,
                        borderWidth: 1,
                        borderColor: colors.border,
                        borderRadius: borderRadius.md,
                        padding: spacing.lg,
                        marginBottom: spacing.lg,
                    }}
                >
                    {/* Unit */}
                    <View style={{ marginBottom: spacing.md }}>
                        <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: spacing.xs }}>
                            <Ionicons name="home-outline" size={18} color={colors.primary} style={{ marginRight: spacing.sm }} />
                            <Text style={[typography.bodySmall, { color: colors.textSecondary }]}>
                                Unit
                            </Text>
                        </View>
                        <Text style={[typography.h4, { color: colors.text }]}>
                            {invitation.unitNumber}
                        </Text>
                    </View>

                    <View style={{ height: 1, backgroundColor: colors.border, marginVertical: spacing.md }} />

                    {/* Rent Amount */}
                    <View style={{ marginBottom: spacing.md }}>
                        <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: spacing.xs }}>
                            <Ionicons name="cash-outline" size={18} color={colors.primary} style={{ marginRight: spacing.sm }} />
                            <Text style={[typography.bodySmall, { color: colors.textSecondary }]}>
                                Monthly Rent
                            </Text>
                        </View>
                        <Text style={[typography.h4, { color: colors.text }]}>
                            UGX {invitation.rentAmount.toLocaleString()}
                        </Text>
                    </View>

                    <View style={{ height: 1, backgroundColor: colors.border, marginVertical: spacing.md }} />

                    {/* Property */}
                    <View style={{ marginBottom: spacing.md }}>
                        <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: spacing.xs }}>
                            <Ionicons name="location-outline" size={18} color={colors.primary} style={{ marginRight: spacing.sm }} />
                            <Text style={[typography.bodySmall, { color: colors.textSecondary }]}>
                                Property
                            </Text>
                        </View>
                        <Text style={[typography.h4, { color: colors.text }]}>
                            {invitation.propertyName}
                        </Text>
                        {invitation.propertyLocation && (
                            <Text style={[typography.body, { color: colors.textSecondary, marginTop: 4 }]}>
                                {invitation.propertyLocation}
                            </Text>
                        )}
                    </View>

                    <View style={{ height: 1, backgroundColor: colors.border, marginVertical: spacing.md }} />

                    {/* Invitation Date */}
                    <View>
                        <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: spacing.xs }}>
                            <Ionicons name="calendar-outline" size={18} color={colors.primary} style={{ marginRight: spacing.sm }} />
                            <Text style={[typography.bodySmall, { color: colors.textSecondary }]}>
                                Invited On
                            </Text>
                        </View>
                        <Text style={[typography.h4, { color: colors.text }]}>
                            {new Date(invitation.createdAt).toLocaleDateString('en-GB', {
                                day: 'numeric',
                                month: 'long',
                                year: 'numeric'
                            })}
                        </Text>
                    </View>
                </View>

                {/* Info Message */}
                <View
                    style={{
                        backgroundColor: colors.infoLight,
                        borderLeftWidth: 4,
                        borderLeftColor: colors.info,
                        padding: spacing.md,
                        borderRadius: borderRadius.sm,
                        marginBottom: spacing.lg,
                    }}
                >
                    <Text style={[typography.bodySmall, { color: colors.info, lineHeight: 18 }]}>
                        By accepting this invitation, you'll be able to view your rent details, make payments, and communicate with your property manager.
                    </Text>
                </View>

                {/* Action Buttons */}
                <View style={{ gap: spacing.sm }}>
                    <Button
                        title={isProcessing ? 'Processing...' : 'Accept Invitation'}
                        onPress={() => onAccept(invitation.id)}
                        variant="primary"
                        disabled={isProcessing}
                        icon={<Ionicons name="checkmark-circle" size={16} color="#FFFFFF" />}
                    />
                    <Button
                        title="Decline"
                        onPress={() => onReject(invitation.id)}
                        variant="outline"
                        disabled={isProcessing}
                        icon={<Ionicons name="close-circle" size={16} color={colors.error} />}
                    />
                </View>
            </ScrollView>
        </Modal>
    );
};
