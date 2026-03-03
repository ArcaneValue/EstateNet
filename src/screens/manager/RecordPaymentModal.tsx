import React, { useState } from 'react';
import { View, Text, FlatList, TouchableOpacity, ScrollView } from 'react-native';
import { Modal } from '../../components';
import { Button } from '../../components/Button';
import { Input } from '../../components/Input';
import { useTheme } from '../../theme/ThemeContext';
import { useProperties } from '../../context/PropertyContext';
import { useTenants } from '../../context/TenantContext';
import { usePayments } from '../../context/PaymentContext';
import { Ionicons } from '@expo/vector-icons';

interface RecordPaymentModalProps {
    visible: boolean;
    onClose: () => void;
}

export const RecordPaymentModal: React.FC<RecordPaymentModalProps> = ({ visible, onClose }) => {
    const { colors, spacing, typography } = useTheme();
    const { properties } = useProperties();
    const { getTenantsByProperty } = useTenants();
    const { recordPayment } = usePayments();

    const [selectedPropertyId, setSelectedPropertyId] = useState('');
    const [selectedTenantId, setSelectedTenantId] = useState('');
    const [amount, setAmount] = useState('');
    const [paymentMethod, setPaymentMethod] = useState<'estatenet' | 'bank_transfer' | 'cash'>('estatenet');
    const [success, setSuccess] = useState(false);

    const tenants = selectedPropertyId ? getTenantsByProperty(selectedPropertyId) : [];
    const selectedTenant = tenants.find(t => t.id === selectedTenantId);

    const handleRecordPayment = () => {
        if (!selectedTenant || !amount) return;

        recordPayment({
            tenantId: selectedTenant.tenantId,
            amount: parseFloat(amount),
            paymentDate: new Date().toISOString(),
            paymentMethod,
            propertyId: selectedPropertyId,
            unitId: selectedTenant.unitId || '',
        });

        setSuccess(true);
        setTimeout(() => {
            onClose();
            setSuccess(false);
            setSelectedPropertyId('');
            setSelectedTenantId('');
            setAmount('');
        }, 2000);
    };

    return (
        <Modal visible={visible} onClose={onClose} title="Record Payment" size="medium">
            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: spacing.lg }}>
                {!success ? (
                    <View>
                        <Text style={[typography.body, { color: colors.textSecondary, marginBottom: spacing.lg }]}>
                            Record a rent payment from a tenant
                        </Text>

                        {/* Property Selection */}
                        <View style={{ marginBottom: spacing.base }}>
                            <Text style={[typography.h4, { color: colors.text, marginBottom: spacing.sm }]}>
                                Select Property
                            </Text>
                            {properties.map(property => (
                                <Button
                                    key={property.id}
                                    title={property.name}
                                    onPress={() => {
                                        setSelectedPropertyId(property.id);
                                        setSelectedTenantId('');
                                    }}
                                    variant={selectedPropertyId === property.id ? 'primary' : 'outline'}
                                    size="medium"
                                    style={{ marginBottom: spacing.sm }}
                                />
                            ))}
                        </View>

                        {/* Tenant Selection */}
                        {tenants.length > 0 && (
                            <View style={{ marginBottom: spacing.base }}>
                                <Text style={[typography.h4, { color: colors.text, marginBottom: spacing.sm }]}>
                                    Select Tenant
                                </Text>
                                {tenants.map(tenant => (
                                    <Button
                                        key={tenant.id}
                                        title={`${tenant.name} - ID: ${tenant.tenantId}`}
                                        onPress={() => setSelectedTenantId(tenant.id)}
                                        variant={selectedTenantId === tenant.id ? 'primary' : 'outline'}
                                        size="medium"
                                        style={{ marginBottom: spacing.sm }}
                                    />
                                ))}
                            </View>
                        )}

                        {/* Payment Details */}
                        {selectedTenant && (
                            <View>
                                <View style={{ backgroundColor: colors.surface, padding: spacing.md, borderRadius: 8, marginBottom: spacing.base }}>
                                    <Text style={[typography.bodySmall, { color: colors.textSecondary }]}>
                                        Monthly Rent
                                    </Text>
                                    <Text style={[typography.h3, { color: colors.text, marginTop: spacing.xs }]}>
                                        UGX {selectedTenant.rentAmount.toLocaleString()}
                                    </Text>
                                </View>

                                <Input
                                    label="Payment Amount (UGX)"
                                    placeholder="Enter amount"
                                    value={amount ? Number(amount.replace(/,/g, '')).toLocaleString() : ''}
                                    onChangeText={(text) => setAmount(text.replace(/,/g, ''))}
                                    keyboardType="numeric"
                                    icon={<Ionicons name="cash-outline" size={20} color={colors.textSecondary} />}
                                />

                                {/* Payment Method */}
                                <Text style={[typography.h4, { color: colors.text, marginTop: spacing.base, marginBottom: spacing.sm }]}>
                                    Payment Method
                                </Text>
                                <View style={{ flexDirection: 'row', gap: spacing.sm, marginBottom: spacing.base }}>
                                    <Button
                                        title="EstateNet"
                                        onPress={() => setPaymentMethod('estatenet')}
                                        variant={paymentMethod === 'estatenet' ? 'primary' : 'outline'}
                                        size="small"
                                        style={{ flex: 1 }}
                                    />
                                    <Button
                                        title="Bank"
                                        onPress={() => setPaymentMethod('bank_transfer')}
                                        variant={paymentMethod === 'bank_transfer' ? 'primary' : 'outline'}
                                        size="small"
                                        style={{ flex: 1 }}
                                    />
                                    <Button
                                        title="Cash"
                                        onPress={() => setPaymentMethod('cash')}
                                        variant={paymentMethod === 'cash' ? 'primary' : 'outline'}
                                        size="small"
                                        style={{ flex: 1 }}
                                    />
                                </View>

                                <Button
                                    title="Record Payment"
                                    onPress={handleRecordPayment}
                                    variant="primary"
                                    size="large"
                                    disabled={!amount}
                                    style={{ marginTop: spacing.base }}
                                />
                            </View>
                        )}
                    </View>
                ) : (
                    <View style={{ alignItems: 'center', padding: spacing.xl }}>
                        <View style={{ backgroundColor: colors.success + '20', width: 80, height: 80, borderRadius: 40, alignItems: 'center', justifyContent: 'center' }}>
                            <Ionicons name="checkmark-circle" size={48} color={colors.success} />
                        </View>
                        <Text style={[typography.h3, { color: colors.text, marginTop: spacing.lg, textAlign: 'center' }]}>
                            Payment Recorded!
                        </Text>
                        <Text style={[typography.body, { color: colors.textSecondary, marginTop: spacing.sm, textAlign: 'center' }]}>
                            UGX {parseFloat(amount).toLocaleString()} from {selectedTenant?.name}
                        </Text>
                    </View>
                )}
            </ScrollView>
        </Modal>
    );
};
