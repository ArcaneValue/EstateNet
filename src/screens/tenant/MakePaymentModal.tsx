import React, { useMemo, useState } from 'react';
import { View, Text, ScrollView } from 'react-native';
import { Modal } from '../../components/Modal';
import { Button } from '../../components/Button';
import { Input } from '../../components/Input';
import { useTheme } from '../../theme/ThemeContext';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../context/AuthContext';
import { useTenants } from '../../context/TenantContext';
import { usePayments } from '../../context/PaymentContext';

interface MakePaymentModalProps {
    visible: boolean;
    onClose: () => void;
    monthlyRent: number;
}

export const MakePaymentModal: React.FC<MakePaymentModalProps> = ({ visible, onClose, monthlyRent }) => {
    const { colors, spacing, typography, borderRadius } = useTheme();
    const { user } = useAuth();
    const { getTenantByTenantId } = useTenants();
    const { recordPayment } = usePayments();
    const [selectedMethod, setSelectedMethod] = useState<'estatenet' | 'cash' | null>(null);
    const [showConfirmation, setShowConfirmation] = useState(false);
    const [paymentSuccess, setPaymentSuccess] = useState(false);

    const [selectedMonths, setSelectedMonths] = useState<number>(1);
    const [useCustomAmount, setUseCustomAmount] = useState(false);
    const [customAmount, setCustomAmount] = useState('');

    const managerName = 'John Malik'; // Will come from context
    const propertyName = 'Greenfield Apartments'; // Will come from context

    const amountToPay = useMemo(() => {
        const baseAmount = useCustomAmount
            ? (() => {
                const parsed = parseFloat(customAmount.replace(/,/g, ''));
                return Number.isFinite(parsed) ? parsed : 0;
            })()
            : monthlyRent;

        return baseAmount * selectedMonths;
    }, [customAmount, monthlyRent, selectedMonths, useCustomAmount]);

    const estatenetServiceChargeRaw = useMemo(() => amountToPay * 0.015, [amountToPay]);
    const estatenetServiceCharge = useMemo(() => Math.min(estatenetServiceChargeRaw, 10000), [estatenetServiceChargeRaw]);
    const estatenetServiceChargeCapped = useMemo(() => estatenetServiceChargeRaw > 10000, [estatenetServiceChargeRaw]);

    const resetState = () => {
        setSelectedMethod(null);
        setShowConfirmation(false);
        setPaymentSuccess(false);
        setSelectedMonths(1);
        setUseCustomAmount(false);
        setCustomAmount('');
    };

    const handleClose = () => {
        resetState();
        onClose();
    };

    const handleMethodSelect = (method: 'estatenet' | 'cash') => {
        setSelectedMethod(method);
        setShowConfirmation(true);
    };

    const handleConfirmPayment = async () => {
        if (!selectedMethod || amountToPay <= 0) {
            return;
        }

        // Record payment for the current tenant so it appears in Payment History
        if (user?.tenantId) {
            // Test tenant account - record with tenantId
            const tenant = getTenantByTenantId(user.tenantId);
            if (tenant) {
                await recordPayment({
                    tenantId: tenant.tenantId,
                    propertyId: tenant.propertyId || '',
                    unitId: tenant.unitId || '',
                    amount: amountToPay,
                    paymentMethod: selectedMethod,
                    paymentDate: new Date().toISOString(),
                    notes:
                        selectedMethod === 'estatenet'
                            ? 'Rent payment via EstateNet'
                            : 'Rent payment via Cash Transfer',
                });
            }
        } else if (user?.email) {
            // Arbitrary tenant account - find tenant by email and record
            const allTenants = useTenants().allTenants;
            const tenantByEmail = allTenants.find(t => t.email === user.email);
            if (tenantByEmail) {
                await recordPayment({
                    tenantId: tenantByEmail.tenantId,
                    propertyId: tenantByEmail.propertyId || '',
                    unitId: tenantByEmail.unitId || '',
                    amount: amountToPay,
                    paymentMethod: selectedMethod,
                    paymentDate: new Date().toISOString(),
                    notes:
                        selectedMethod === 'estatenet'
                            ? 'Rent payment via EstateNet'
                            : 'Rent payment via Cash Transfer',
                });
            } else {
                // Create a temporary tenant record for the payment
                const tempTenantId = `TEMP-${Date.now()}`;
                await recordPayment({
                    tenantId: tempTenantId,
                    propertyId: '',
                    unitId: '',
                    amount: amountToPay,
                    paymentMethod: selectedMethod,
                    paymentDate: new Date().toISOString(),
                    notes:
                        selectedMethod === 'estatenet'
                            ? 'Rent payment via EstateNet'
                            : 'Rent payment via Cash Transfer',
                });
            }
        }

        // In production, this will integrate with payment gateway
        setPaymentSuccess(true);
        setTimeout(() => {
            handleClose();
        }, 3000);
    };

    const handleBack = () => {
        setShowConfirmation(false);
        setSelectedMethod(null);
    };

    const formatAmount = (amount: number) => `UGX ${amount.toLocaleString()}`;

    if (paymentSuccess) {
        return (
            <Modal visible={visible} onClose={handleClose} title="Payment Successful" size="medium">
                <View style={{ alignItems: 'center', padding: spacing.xl }}>
                    <View style={{
                        backgroundColor: colors.success + '20',
                        width: 100,
                        height: 100,
                        borderRadius: 50,
                        alignItems: 'center',
                        justifyContent: 'center',
                        marginBottom: spacing.lg,
                    }}>
                        <Ionicons name="checkmark-circle" size={64} color={colors.success} />
                    </View>
                    <Text style={[typography.h2, { color: colors.text, textAlign: 'center', marginBottom: spacing.sm }]}>
                        Payment Received!
                    </Text>
                    <Text style={[typography.body, { color: colors.textSecondary, textAlign: 'center', lineHeight: 22 }]}>
                        Your rent payment has been processed successfully. A receipt has been sent to your property manager.
                    </Text>
                </View>
            </Modal>
        );
    }

    if (showConfirmation && selectedMethod) {
        return (
            <Modal visible={visible} onClose={handleClose} title="Confirm Payment" size="medium">
                <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: spacing.lg }}>
                    <View style={{
                        backgroundColor: colors.warningLight,
                        padding: spacing.lg,
                        borderRadius: borderRadius.md,
                        marginBottom: spacing.lg,
                        borderLeftWidth: 4,
                        borderLeftColor: colors.warning,
                    }}>
                        <View style={{ flexDirection: 'row', alignItems: 'flex-start' }}>
                            <Ionicons name="information-circle" size={24} color={colors.warning} style={{ marginRight: spacing.md }} />
                            <View style={{ flex: 1 }}>
                                <Text style={[typography.h4, { color: colors.warning, marginBottom: spacing.xs }]}>
                                    Please Confirm
                                </Text>
                                <Text style={[typography.body, { color: colors.warning, lineHeight: 20 }]}>
                                    You are about to make a rent payment to your property manager.
                                </Text>
                            </View>
                        </View>
                    </View>

                    <View style={{
                        backgroundColor: colors.surface,
                        padding: spacing.lg,
                        borderRadius: borderRadius.md,
                        marginBottom: spacing.lg,
                    }}>
                        <Text style={[typography.h4, { color: colors.text, marginBottom: spacing.md }]}>
                            Payment Details
                        </Text>

                        <View style={{ marginBottom: spacing.md }}>
                            <Text style={[typography.bodySmall, { color: colors.textSecondary }]}>Property</Text>
                            <Text style={[typography.body, { color: colors.text, marginTop: 4 }]}>{propertyName}</Text>
                        </View>

                        <View style={{ marginBottom: spacing.md }}>
                            <Text style={[typography.bodySmall, { color: colors.textSecondary }]}>Recipient</Text>
                            <Text style={[typography.body, { color: colors.text, marginTop: 4 }]}>{managerName} (Property Manager)</Text>
                        </View>

                        <View style={{ marginBottom: spacing.md }}>
                            <Text style={[typography.bodySmall, { color: colors.textSecondary }]}>Payment Method</Text>
                            <Text style={[typography.body, { color: colors.text, marginTop: 4 }]}>
                                {selectedMethod === 'estatenet' ? 'EstateNet' : 'Cash Transfer'}
                            </Text>
                        </View>

                        <View style={{ height: 1, backgroundColor: colors.divider, marginVertical: spacing.md }} />

                        <View>
                            <Text style={[typography.bodySmall, { color: colors.textSecondary }]}>Amount to Pay</Text>
                            <Text style={[typography.display, { color: colors.primary, fontSize: 32, marginTop: 4 }]}>
                                {formatAmount(amountToPay)}
                            </Text>
                        </View>
                    </View>

                    {selectedMethod === 'estatenet' && (
                        <View style={{
                            backgroundColor: colors.infoLight,
                            padding: spacing.lg,
                            borderRadius: borderRadius.md,
                            marginBottom: spacing.lg,
                        }}>
                            <Text style={[typography.h4, { color: colors.info, marginBottom: spacing.md }]}>
                                EstateNet Payment
                            </Text>
                            <Text style={[typography.body, { color: colors.info, marginBottom: spacing.md, lineHeight: 20 }]}>
                                Before Payment, EstateNet requires a service Charge of 1.5% per successful transaction
                            </Text>

                            <View style={{ backgroundColor: colors.surface, padding: spacing.md, borderRadius: borderRadius.md }}>
                                <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: spacing.sm }}>
                                    <Text style={[typography.bodySmall, { color: colors.textSecondary }]}>Amount</Text>
                                    <Text style={[typography.bodySmall, { color: colors.text, fontWeight: '700' }]}>
                                        {formatAmount(amountToPay)}
                                    </Text>
                                </View>
                                <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: spacing.sm }}>
                                    <Text style={[typography.bodySmall, { color: colors.textSecondary }]}>Service Charge (1.5%)</Text>
                                    <Text style={[typography.bodySmall, { color: colors.text, fontWeight: '700' }]}>
                                        {formatAmount(estatenetServiceCharge)}
                                    </Text>
                                </View>
                                <View style={{ height: 1, backgroundColor: colors.divider, marginVertical: spacing.sm }} />
                                <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                                    <Text style={[typography.body, { color: colors.textSecondary, fontWeight: '600' }]}>Total</Text>
                                    <Text style={[typography.body, { color: colors.text, fontWeight: '800' }]}>
                                        {formatAmount(amountToPay + estatenetServiceCharge)}
                                    </Text>
                                </View>
                            </View>

                            {estatenetServiceChargeCapped && (
                                <Text style={[typography.bodySmall, { color: colors.info, marginTop: spacing.md, lineHeight: 18 }]}>
                                    The Service Charge goes beyond the necessary Cap Amount. So only UGX 10,000 will be needed.
                                </Text>
                            )}
                        </View>
                    )}

                    {selectedMethod === 'cash' && (
                        <View style={{
                            backgroundColor: colors.infoLight,
                            padding: spacing.lg,
                            borderRadius: borderRadius.md,
                            marginBottom: spacing.lg,
                        }}>
                            <Text style={[typography.h4, { color: colors.info, marginBottom: spacing.md }]}>
                                Cash Transfer
                            </Text>
                            <Text style={[typography.body, { color: colors.info, lineHeight: 20 }]}>
                                Remember to Inform your Property Manager about this payment in the System
                            </Text>
                        </View>
                    )}

                    <View style={{ flexDirection: 'row', gap: spacing.sm }}>
                        <Button
                            title="Back"
                            onPress={handleBack}
                            variant="outline"
                            size="large"
                            style={{ flex: 1 }}
                        />
                        <Button
                            title="Confirm Payment"
                            onPress={handleConfirmPayment}
                            variant="primary"
                            size="large"
                            disabled={amountToPay <= 0}
                            style={{ flex: 1 }}
                            icon={<Ionicons name="checkmark" size={20} color="#FFFFFF" />}
                        />
                    </View>
                </ScrollView>
            </Modal>
        );
    }

    return (
        <Modal visible={visible} onClose={handleClose} title="Make Rent Payment" size="medium">
            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: spacing.lg }}>
                <Text style={[typography.body, { color: colors.textSecondary, marginBottom: spacing.lg, lineHeight: 20 }]}>
                    Choose your preferred payment method to pay your rent.
                </Text>

                {/* Payment Amount */}
                <View style={{
                    backgroundColor: colors.primaryLight + '20',
                    padding: spacing.lg,
                    borderRadius: borderRadius.md,
                    marginBottom: spacing.lg,
                    borderWidth: 2,
                    borderColor: colors.primary,
                }}>
                    <Text style={[typography.bodySmall, { color: colors.textSecondary, marginBottom: spacing.xs }]}>
                        Amount
                    </Text>
                    <Text style={[typography.display, { color: colors.primary, fontSize: 40 }]}>
                        {formatAmount(amountToPay)}
                    </Text>
                    {!useCustomAmount && (
                        <Text style={[typography.bodySmall, { color: colors.textSecondary, marginTop: spacing.xs }]}>
                            {selectedMonths} month{selectedMonths === 1 ? '' : 's'}
                        </Text>
                    )}
                </View>

                <Text style={[typography.h4, { color: colors.text, marginBottom: spacing.sm }]}>
                    Pay In Advance
                </Text>
                <View style={{ flexDirection: 'row', gap: spacing.sm, marginBottom: spacing.base }}>
                    <Button
                        title="1 Month"
                        onPress={() => {
                            setSelectedMonths(1);
                        }}
                        variant={!useCustomAmount && selectedMonths === 1 ? 'primary' : 'outline'}
                        size="small"
                        style={{ flex: 1 }}
                    />
                    <Button
                        title="3 Months"
                        onPress={() => {
                            setSelectedMonths(3);
                        }}
                        variant={!useCustomAmount && selectedMonths === 3 ? 'primary' : 'outline'}
                        size="small"
                        style={{ flex: 1 }}
                    />
                    <Button
                        title="6 Months"
                        onPress={() => {
                            setSelectedMonths(6);
                        }}
                        variant={!useCustomAmount && selectedMonths === 6 ? 'primary' : 'outline'}
                        size="small"
                        style={{ flex: 1 }}
                    />
                </View>

                <Button
                    title="Custom Amount"
                    onPress={() => {
                        setUseCustomAmount(true);
                        if (!useCustomAmount) {
                            setCustomAmount(monthlyRent ? monthlyRent.toString() : '');
                        }
                    }}
                    variant={useCustomAmount ? 'primary' : 'outline'}
                    size="medium"
                    style={{ marginBottom: spacing.lg }}
                    icon={<Ionicons name="create-outline" size={18} color={useCustomAmount ? '#FFFFFF' : colors.primary} />}
                />

                {useCustomAmount && (
                    <Input
                        label="Custom Payment Amount (UGX)"
                        placeholder="Enter amount"
                        value={customAmount ? Number(customAmount.replace(/,/g, '')).toLocaleString() : ''}
                        onChangeText={(text) => setCustomAmount(text.replace(/,/g, ''))}
                        keyboardType="numeric"
                        icon={<Ionicons name="cash-outline" size={20} color={colors.textSecondary} />}
                    />
                )}

                {/* Payment Options */}
                <Button
                    title="EstateNet"
                    onPress={() => handleMethodSelect('estatenet')}
                    variant="outline"
                    size="large"
                    disabled={amountToPay <= 0}
                    style={{ marginBottom: spacing.md }}
                    icon={<Ionicons name="card" size={24} color={colors.primary} />}
                />

                <Button
                    title="Cash Transfer"
                    onPress={() => handleMethodSelect('cash')}
                    variant="outline"
                    size="large"
                    disabled={amountToPay <= 0}
                    style={{ marginBottom: spacing.lg }}
                    icon={<Ionicons name="cash" size={24} color={colors.primary} />}
                />

                {/* Information */}
                <View style={{
                    backgroundColor: colors.surface,
                    padding: spacing.lg,
                    borderRadius: borderRadius.md,
                }}>
                    <View style={{ flexDirection: 'row', alignItems: 'flex-start' }}>
                        <Ionicons name="shield-checkmark" size={20} color={colors.success} style={{ marginRight: spacing.sm }} />
                        <Text style={[typography.body, { color: colors.textSecondary, flex: 1, lineHeight: 20 }]}>
                            Your payment goes directly to <Text style={{ fontWeight: '600', color: colors.text }}>{managerName}</Text>, your property manager.
                        </Text>
                    </View>
                </View>
            </ScrollView>
        </Modal>
    );
};
