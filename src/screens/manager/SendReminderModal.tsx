import React, { useState } from 'react';
import { View, Text, FlatList, TextInput } from 'react-native';
import { Modal } from '../../components/Modal';
import { Button } from '../../components/Button';
import { Input } from '../../components/Input';
import { useTheme } from '../../theme/ThemeContext';
import { useTenants } from '../../context/TenantContext';
import { useProperties } from '../../context/PropertyContext';
import { Ionicons } from '@expo/vector-icons';

interface SendReminderModalProps {
    visible: boolean;
    onClose: () => void;
}

export const SendReminderModal: React.FC<SendReminderModalProps> = ({ visible, onClose }) => {
    const { colors, spacing, typography } = useTheme();
    const { getOverdueTenants } = useTenants();
    const { properties } = useProperties();
    const [selectedTenantIds, setSelectedTenantIds] = useState<string[]>([]);
    const [message, setMessage] = useState('');
    const [success, setSuccess] = useState(false);

    const { overdue, pastOverdue } = getOverdueTenants();
    const allOverdueTenants = [...overdue, ...pastOverdue];

    const toggleTenant = (tenantId: string) => {
        if (selectedTenantIds.includes(tenantId)) {
            setSelectedTenantIds(selectedTenantIds.filter(id => id !== tenantId));
        } else {
            setSelectedTenantIds([...selectedTenantIds, tenantId]);
        }
    };

    const selectAll = () => {
        if (selectedTenantIds.length === allOverdueTenants.length) {
            setSelectedTenantIds([]);
        } else {
            setSelectedTenantIds(allOverdueTenants.map(t => t.id));
        }
    };

    const handleSendReminder = () => {
        // In a real app, this would send SMS/email notifications
        setSuccess(true);
        setTimeout(() => {
            onClose();
            setSuccess(false);
            setSelectedTenantIds([]);
            setMessage('');
        }, 2000);
    };

    const getPropertyName = (propertyId?: string) => {
        return properties.find(p => p.id === propertyId)?.name || 'Unknown';
    };

    return (
        <Modal visible={visible} onClose={onClose} title="Send Reminder" size="large">
            {!success ? (
                <View>
                    <Text style={[typography.body, { color: colors.textSecondary, marginBottom: spacing.lg }]}>
                        Send payment reminders to overdue tenants
                    </Text>

                    {allOverdueTenants.length === 0 ? (
                        <View style={{ alignItems: 'center', paddingVertical: spacing.xl }}>
                            <Ionicons name="checkmark-circle" size={64} color={colors.success} />
                            <Text style={[typography.h3, { color: colors.text, marginTop: spacing.lg, textAlign: 'center' }]}>
                                No Overdue Tenants
                            </Text>
                            <Text style={[typography.body, { color: colors.textSecondary, marginTop: spacing.sm, textAlign: 'center' }]}>
                                All tenants are up to date with payments
                            </Text>
                        </View>
                    ) : (
                        <>
                            {/* Select All */}
                            <Button
                                title={selectedTenantIds.length === allOverdueTenants.length ? 'Deselect All' : 'Select All'}
                                onPress={selectAll}
                                variant="outline"
                                size="medium"
                                style={{ marginBottom: spacing.md }}
                            />

                            {/* Overdue Tenants List */}
                            <Text style={[typography.h4, { color: colors.text, marginBottom: spacing.sm }]}>
                                Overdue Tenants ({allOverdueTenants.length})
                            </Text>
                            <View style={{ maxHeight: 200, marginBottom: spacing.base }}>
                                <FlatList
                                    data={allOverdueTenants}
                                    renderItem={({ item }) => (
                                        <Button
                                            title={`${item.name} - ${getPropertyName(item.propertyId)} - UGX ${item.amountOwed.toLocaleString()}`}
                                            onPress={() => toggleTenant(item.id)}
                                            variant={selectedTenantIds.includes(item.id) ? 'primary' : 'outline'}
                                            size="medium"
                                            style={{ marginBottom: spacing.sm }}
                                        />
                                    )}
                                    keyExtractor={item => item.id}
                                />
                            </View>

                            {/* Custom Message */}
                            <View style={{ marginBottom: spacing.base }}>
                                <Text style={[typography.h4, { color: colors.text, marginBottom: spacing.sm }]}>
                                    Custom Message (Optional)
                                </Text>
                                <TextInput
                                    style={{
                                        backgroundColor: colors.surface,
                                        borderRadius: 8,
                                        padding: spacing.md,
                                        color: colors.text,
                                        minHeight: 100,
                                        textAlignVertical: 'top',
                                    }}
                                    placeholder="Add a personal message..."
                                    placeholderTextColor={colors.textSecondary}
                                    value={message}
                                    onChangeText={setMessage}
                                    multiline
                                />
                            </View>

                            {/* Preview */}
                            {selectedTenantIds.length > 0 && (
                                <View style={{ backgroundColor: colors.surface, padding: spacing.md, borderRadius: 8, marginBottom: spacing.base }}>
                                    <Text style={[typography.bodySmall, { color: colors.textSecondary, marginBottom: spacing.xs }]}>
                                        Preview
                                    </Text>
                                    <Text style={[typography.body, { color: colors.text }]}>
                                        {message || 'Dear tenant, this is a friendly reminder that your rent payment is overdue. Please settle your outstanding balance at your earliest convenience. Thank you.'}
                                    </Text>
                                    <Text style={[typography.bodySmall, { color: colors.textSecondary, marginTop: spacing.sm }]}>
                                        Will be sent to {selectedTenantIds.length} tenant{selectedTenantIds.length !== 1 ? 's' : ''}
                                    </Text>
                                </View>
                            )}

                            <Button
                                title={`Send Reminder${selectedTenantIds.length > 0 ? ` (${selectedTenantIds.length})` : ''}`}
                                onPress={handleSendReminder}
                                variant="primary"
                                size="large"
                                disabled={selectedTenantIds.length === 0}
                                icon={<Ionicons name="send" size={20} color="#FFFFFF" />}
                            />
                        </>
                    )}
                </View>
            ) : (
                <View style={{ alignItems: 'center', padding: spacing.xl }}>
                    <View style={{ backgroundColor: colors.success + '20', width: 80, height: 80, borderRadius: 40, alignItems: 'center', justifyContent: 'center' }}>
                        <Ionicons name="checkmark-circle" size={48} color={colors.success} />
                    </View>
                    <Text style={[typography.h3, { color: colors.text, marginTop: spacing.lg, textAlign: 'center' }]}>
                        Reminders Sent!
                    </Text>
                    <Text style={[typography.body, { color: colors.textSecondary, marginTop: spacing.sm, textAlign: 'center' }]}>
                        {selectedTenantIds.length} reminder{selectedTenantIds.length !== 1 ? 's' : ''} sent successfully
                    </Text>
                </View>
            )}
        </Modal>
    );
};
