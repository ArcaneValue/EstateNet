import React, { useState } from 'react';
import { View, Text, FlatList, TextInput, Alert, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '../../theme/ThemeContext';
import { TenantListItem } from '../../components/TenantListItem';
import { Modal } from '../../components/Modal';
import { Button } from '../../components/Button';
import { Input } from '../../components/Input';
import { useTenants } from '../../context/TenantContext';
import { useProperties } from '../../context/PropertyContext';
import { Tenant } from '../../types/types';
import { InviteTenantModal } from './InviteTenantModal';
import { Ionicons } from '@expo/vector-icons';
import { useMessages } from '../../context/MessageContext';
import { apiGet } from '../../utils/apiClient';

export const TenantsScreen: React.FC<any> = ({ navigation }) => {
    const { colors, spacing, typography, borderRadius } = useTheme();
    const { myTenants } = useTenants();
    const { properties } = useProperties();
    const { sendMessage } = useMessages();
    const [selectedTenant, setSelectedTenant] = useState<Tenant | null>(null);
    const [searchQuery, setSearchQuery] = useState('');
    const [showMessageModal, setShowMessageModal] = useState(false);
    const [showReminderModal, setShowReminderModal] = useState(false);
    const [showInviteModal, setShowInviteModal] = useState(false);
    const [messageText, setMessageText] = useState('');
    const [reminderText, setReminderText] = useState('Your rent payment is due. Please make the payment at your earliest convenience.');

    const [isSendingMessage, setIsSendingMessage] = useState(false);

    const filteredTenants = myTenants.filter(tenant =>
        tenant.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        tenant.tenantId.toLowerCase().includes(searchQuery.toLowerCase())
    );

    const getPropertyName = (propertyId?: string) => {
        return properties.find(p => p.id === propertyId)?.name || 'Unknown Property';
    };

    const getUnitNumber = (propertyId?: string, unitId?: string) => {
        const property = properties.find(p => p.id === propertyId);
        return property?.units.find(u => u.id === unitId)?.unitNumber || '?';
    };

    const handleSendTenantMessage = async () => {
        if (!selectedTenant || !messageText.trim()) {
            return;
        }

        try {
            setIsSendingMessage(true);

            // Resolve tenant userId from tenantId via identities endpoint
            const { status, json } = await apiGet(`/identities/${selectedTenant.tenantId}`);
            const payload: any = json;

            if (status !== 200 || !payload || payload.success === false || !payload.data?.user) {
                Alert.alert(
                    'Cannot send message',
                    'Unable to resolve the tenant account for messaging. Please ensure this tenant has accepted an invitation and linked their account.',
                );
                return;
            }

            const toUserId: string = payload.data.user.id;

            const ok = await sendMessage({
                toUserId,
                body: messageText.trim(),
                subject: 'Message from your property manager',
            });

            if (ok) {
                Alert.alert('Message Sent', `Your message has been sent to ${selectedTenant.name}`);
                setShowMessageModal(false);
                setMessageText('');
            } else {
                Alert.alert('Error', 'Failed to send message. Please try again.');
            }
        } catch (error: any) {
            Alert.alert('Error', error?.message || 'Failed to send message. Please try again.');
        } finally {
            setIsSendingMessage(false);
        }
    };

    return (
        <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }}>
            <ScrollView
                style={{ flex: 1 }}
                contentContainerStyle={{ padding: spacing.base, paddingBottom: spacing.xl }}
                showsVerticalScrollIndicator={false}
            >
                {/* Header */}
                <View style={{ marginBottom: spacing.lg }}>
                    <Text style={[typography.h2, { color: colors.text }]}>
                        Tenants
                    </Text>
                    <Text style={[typography.body, { color: colors.textSecondary, marginTop: spacing.sm }]}>
                        Manage your tenants
                    </Text>
                </View>

                {/* Search */}
                <Input
                    placeholder="Search by name or ID"
                    value={searchQuery}
                    onChangeText={setSearchQuery}
                    icon={<Ionicons name="search" size={20} color={colors.textSecondary} />}
                    style={{ marginBottom: spacing.lg }}
                />

                {/* Summary */}
                <View style={{ flexDirection: 'row', gap: spacing.sm, marginBottom: spacing.lg }}>
                    <View style={{ flex: 1, backgroundColor: colors.surface, padding: spacing.base, borderRadius: 12 }}>
                        <Text style={[typography.h3, { color: colors.text }]}>{myTenants.length}</Text>
                        <Text style={[typography.bodySmall, { color: colors.textSecondary, marginTop: 4 }]}>Total Tenants</Text>
                    </View>
                    <View style={{ flex: 1, backgroundColor: colors.surface, padding: spacing.base, borderRadius: 12 }}>
                        <Text style={[typography.h3, { color: colors.success }]}>
                            {myTenants.filter(t => t.paymentStatus === 'current').length}
                        </Text>
                        <Text style={[typography.bodySmall, { color: colors.textSecondary, marginTop: 4 }]}>Up to Date</Text>
                    </View>
                </View>

                {/* Invite Tenant Button */}
                <Button
                    title="Invite Tenant"
                    onPress={() => setShowInviteModal(true)}
                    variant="primary"
                    size="large"
                    style={{ marginBottom: spacing.lg }}
                    icon={<Ionicons name="person-add" size={18} color="#FFFFFF" />}
                />

                {/* Tenants List */}
                <View style={{ flex: 1 }}>
                    {filteredTenants.map((item) => (
                        <TenantListItem
                            key={item.id}
                            name={item.name}
                            tenantId={item.tenantId}
                            propertyName={getPropertyName(item.propertyId)}
                            unitNumber={getUnitNumber(item.propertyId, item.unitId)}
                            rentAmount={item.rentAmount}
                            paymentStatus={item.paymentStatus}
                            phoneNumber={item.phoneNumber}
                            onPress={() => setSelectedTenant(item)}
                        />
                    ))}
                </View>
            </ScrollView>

            {/* Tenant Details Modal */}
            {selectedTenant && (
                <Modal
                    visible={!!selectedTenant}
                    onClose={() => setSelectedTenant(null)}
                    title="Tenant Details"
                    size="large"
                >
                    <View>
                        <View style={{ alignItems: 'center', marginBottom: spacing.lg }}>
                            <View style={{ backgroundColor: colors.primary + '20', width: 80, height: 80, borderRadius: 40, alignItems: 'center', justifyContent: 'center' }}>
                                <Ionicons name="person" size={40} color={colors.primary} />
                            </View>
                            <Text style={[typography.h2, { color: colors.text, marginTop: spacing.md }]}>
                                {selectedTenant.name}
                            </Text>
                            <Text style={[typography.body, { color: colors.textSecondary, marginTop: spacing.xs }]}>
                                ID: {selectedTenant.tenantId}
                            </Text>
                        </View>

                        <View style={{ backgroundColor: colors.surface, padding: spacing.base, borderRadius: 12, marginBottom: spacing.lg }}>
                            <Text style={[typography.h4, { color: colors.text, marginBottom: spacing.md }]}>Contact Information</Text>
                            <InfoRow label="Email" value={selectedTenant.email} colors={colors} typography={typography} />
                            <InfoRow label="Phone" value={selectedTenant.phoneNumber} colors={colors} typography={typography} />
                        </View>

                        <View style={{ backgroundColor: colors.surface, padding: spacing.base, borderRadius: 12, marginBottom: spacing.lg }}>
                            <Text style={[typography.h4, { color: colors.text, marginBottom: spacing.md }]}>Rental Information</Text>
                            <InfoRow label="Property" value={getPropertyName(selectedTenant.propertyId)} colors={colors} typography={typography} />
                            <InfoRow label="Unit" value={getUnitNumber(selectedTenant.propertyId, selectedTenant.unitId)} colors={colors} typography={typography} />
                            <InfoRow label="Monthly Rent" value={`UGX ${selectedTenant.rentAmount.toLocaleString()}`} colors={colors} typography={typography} />
                            <InfoRow label="Payment Status" value={selectedTenant.paymentStatus.toUpperCase()} colors={colors} typography={typography} />
                            {selectedTenant.amountOwed > 0 && (
                                <InfoRow label="Amount Owed" value={`UGX ${selectedTenant.amountOwed.toLocaleString()}`} colors={colors} typography={typography} />
                            )}
                        </View>

                        <View style={{ flexDirection: 'row', gap: spacing.sm }}>
                            <Button
                                title="Send Message"
                                onPress={() => setShowMessageModal(true)}
                                variant="outline"
                                size="medium"
                                style={{ flex: 1 }}
                                icon={<Ionicons name="chatbubble" size={16} color={colors.primary} />}
                            />
                            <Button
                                title="Send Reminder"
                                onPress={() => setShowReminderModal(true)}
                                variant="primary"
                                size="medium"
                                style={{ flex: 1 }}
                                icon={<Ionicons name="notifications" size={16} color="#FFFFFF" />}
                            />
                        </View>
                    </View>
                </Modal>
            )}

            {/* Send Message Modal */}
            {selectedTenant && (
                <Modal
                    visible={showMessageModal}
                    onClose={() => {
                        setShowMessageModal(false);
                        setMessageText('');
                    }}
                    title="Send Message"
                    size="medium"
                >
                    <View>
                        <View style={{ alignItems: 'center', marginBottom: spacing.lg }}>
                            <View style={{ backgroundColor: colors.primary + '20', width: 60, height: 60, borderRadius: 30, alignItems: 'center', justifyContent: 'center' }}>
                                <Ionicons name="chatbubble" size={28} color={colors.primary} />
                            </View>
                            <Text style={[typography.h4, { color: colors.text, marginTop: spacing.md }]}>
                                Message to {selectedTenant.name}
                            </Text>
                        </View>

                        <TextInput
                            style={{
                                backgroundColor: colors.surface,
                                borderWidth: 2,
                                borderColor: colors.border,
                                borderRadius: borderRadius.md,
                                padding: spacing.md,
                                color: colors.text,
                                minHeight: 120,
                                textAlignVertical: 'top',
                                marginBottom: spacing.lg,
                            }}
                            placeholder="Type your message here..."
                            placeholderTextColor={colors.textTertiary}
                            value={messageText}
                            onChangeText={setMessageText}
                            multiline
                        />

                        <Button
                            title="Send Message"
                            onPress={handleSendTenantMessage}
                            variant="primary"
                            size="large"
                            disabled={!messageText.trim() || isSendingMessage}
                            icon={<Ionicons name="send" size={18} color="#FFFFFF" />}
                        />
                    </View>
                </Modal>
            )}

            {/* Send Reminder Modal */}
            {selectedTenant && (
                <Modal
                    visible={showReminderModal}
                    onClose={() => {
                        setShowReminderModal(false);
                        setReminderText('Your rent payment is due. Please make the payment at your earliest convenience.');
                    }}
                    title="Send Reminder"
                    size="medium"
                >
                    <View>
                        <View style={{ alignItems: 'center', marginBottom: spacing.lg }}>
                            <View style={{ backgroundColor: colors.warning + '20', width: 60, height: 60, borderRadius: 30, alignItems: 'center', justifyContent: 'center' }}>
                                <Ionicons name="notifications" size={28} color={colors.warning} />
                            </View>
                            <Text style={[typography.h4, { color: colors.text, marginTop: spacing.md }]}>
                                Reminder to {selectedTenant.name}
                            </Text>
                        </View>

                        <View style={{ backgroundColor: colors.surface, padding: spacing.md, borderRadius: borderRadius.md, marginBottom: spacing.md }}>
                            <Text style={[typography.bodySmall, { color: colors.textSecondary, marginBottom: spacing.xs }]}>
                                Tenant Info
                            </Text>
                            <Text style={[typography.body, { color: colors.text }]}>
                                {selectedTenant.name} • {getPropertyName(selectedTenant.propertyId)}
                            </Text>
                            {selectedTenant.amountOwed > 0 && (
                                <Text style={[typography.body, { color: colors.error, fontWeight: '600', marginTop: spacing.xs }]}>
                                    Outstanding: UGX {selectedTenant.amountOwed.toLocaleString()}
                                </Text>
                            )}
                        </View>

                        <Text style={[typography.bodySmall, { color: colors.textSecondary, marginBottom: spacing.xs, fontWeight: '600' }]}>
                            Reminder Message
                        </Text>
                        <TextInput
                            style={{
                                backgroundColor: colors.surface,
                                borderWidth: 2,
                                borderColor: colors.border,
                                borderRadius: borderRadius.md,
                                padding: spacing.md,
                                color: colors.text,
                                minHeight: 100,
                                textAlignVertical: 'top',
                                marginBottom: spacing.lg,
                            }}
                            placeholder="Enter reminder message..."
                            placeholderTextColor={colors.textTertiary}
                            value={reminderText}
                            onChangeText={setReminderText}
                            multiline
                        />

                        <Button
                            title="Send Reminder"
                            onPress={() => {
                                Alert.alert('Reminder Sent', `Payment reminder has been sent to ${selectedTenant.name}`);
                                setShowReminderModal(false);
                            }}
                            variant="primary"
                            size="large"
                            icon={<Ionicons name="send" size={18} color="#FFFFFF" />}
                        />
                    </View>
                </Modal>
            )}

            {/* Invite Tenant Modal */}
            <InviteTenantModal
                visible={showInviteModal}
                onClose={() => setShowInviteModal(false)}
            />
        </SafeAreaView>
    );
};

const InfoRow = ({ label, value, colors, typography }: any) => (
    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 12 }}>
        <Text style={[typography.body, { color: colors.textSecondary }]}>{label}</Text>
        <Text style={[typography.body, { color: colors.text, fontWeight: '600', flex: 1, textAlign: 'right' }]}>{value}</Text>
    </View>
);
