import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, FlatList, Alert, Modal } from 'react-native';
import { useTheme } from '../../theme/ThemeContext';
import { useAuth } from '../../context/AuthContext';
import { apiGet, apiPost } from '../../utils/apiClient';
import { Input } from '../../components/Input';
import { Button } from '../../components/Button';
import { Card } from '../../components/Card';
import { Ionicons } from '@expo/vector-icons';

interface Lease {
    id: string;
    property: {
        name: string;
    };
    unit: {
        unitNumber: string;
    };
}

interface Payment {
    id: string;
    amount: number;
    paymentDate: string;
    dueDate: string;
    status: string;
    paymentMethod?: string;
    transactionId?: string;
    property: {
        name: string;
    };
    unit: {
        unitNumber: string;
    };
}

interface PaymentsScreenProps {
    navigation: any;
}

export const PaymentsScreen: React.FC<PaymentsScreenProps> = ({ navigation }) => {
    const { colors, spacing, typography, borderRadius } = useTheme();
    const { user } = useAuth();

    // State
    const [payments, setPayments] = useState<Payment[]>([]);
    const [leases, setLeases] = useState<Lease[]>([]);
    const [selectedLeaseId, setSelectedLeaseId] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [initiatingPayment, setInitiatingPayment] = useState(false);

    // Modal states
    const [showLeaseModal, setShowLeaseModal] = useState(false);
    const [showPayNow, setShowPayNow] = useState(false);
    const [showPaymentMethodModal, setShowPaymentMethodModal] = useState(false);
    const [payNowAmount, setPayNowAmount] = useState('');
    const [paymentMethod, setPaymentMethod] = useState('MOBILE_MONEY_MTN');

    // Payment methods
    const paymentMethods = [
        { value: 'MOBILE_MONEY_MTN', label: 'Mobile Money (MTN)' },
        { value: 'MOBILE_MONEY_AIRTEL', label: 'Mobile Money (Airtel)' },
        { value: 'CASH', label: 'Cash' }
    ];

    // Format number with commas
    const formatNumber = (num: string | number) => {
        const number = typeof num === 'string' ? parseFloat(num.replace(/,/g, '')) : num;
        return isNaN(number) ? '' : number.toLocaleString();
    };

    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        setLoading(true);
        setError(null);

        try {
            // Load payments
            const { status: paymentStatus, json: paymentJson } = await apiGet('/payments');
            if (paymentStatus === 200 && paymentJson?.success) {
                setPayments(paymentJson.data || []);
            }

            // Load active lease
            const { status: leaseStatus, json: leaseJson } = await apiGet('/tenant/me/active-lease');
            if (leaseStatus === 200 && leaseJson?.success && leaseJson.data) {
                const activeLease = leaseJson.data;
                setLeases([activeLease]);
                setSelectedLeaseId(activeLease.id);
            }
        } catch (err) {
            console.error('Load data error:', err);
            setError('Failed to load data');
        } finally {
            setLoading(false);
        }
    };

    const handleRecordPayment = async () => {
        if (!payNowAmount) {
            setError('Please enter an amount');
            return;
        }

        const amount = parseFloat(payNowAmount.replace(/,/g, ''));
        if (isNaN(amount) || amount <= 0) {
            setError('Please enter a valid amount');
            return;
        }

        const leaseId = selectedLeaseId || (leases.length > 0 ? leases[0].id : '');

        if (!leaseId) {
            setError('No lease selected');
            return;
        }

        setInitiatingPayment(true);
        setError(null);

        try {
            const paymentDate = new Date().toISOString().split('T')[0];
            const dueDate = new Date();
            dueDate.setMonth(dueDate.getMonth() + 1);

            const { status, json } = await apiPost('/payments', {
                amount,
                paymentDate,
                dueDate: dueDate.toISOString().split('T')[0],
                paymentMethod: paymentMethod === 'MOBILE_MONEY_MTN' || paymentMethod === 'MOBILE_MONEY_AIRTEL' ? 'MOBILE_MONEY' : paymentMethod,
                leaseId,
                note: `Payment recorded via ${paymentMethods.find(m => m.value === paymentMethod)?.label}`
            });

            if (status === 201 && json?.success) {
                Alert.alert('Success', 'Payment recorded successfully');
                setShowPayNow(false);
                setPayNowAmount('');
                loadData();
            } else {
                setError(json?.message || 'Failed to record payment');
            }
        } catch (error) {
            console.error('Record payment error:', error);
            setError('Network error. Please try again.');
        } finally {
            setInitiatingPayment(false);
        }
    };

    const selectedLease = leases.find(l => l.id === selectedLeaseId);

    const renderPaymentItem = ({ item }: { item: Payment }) => (
        <Card style={{ marginBottom: spacing.sm }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <View style={{ flex: 1 }}>
                    <Text style={[typography.h4, { color: colors.text }]}>
                        UGX {formatNumber(item.amount)}
                    </Text>
                    <Text style={[typography.bodySmall, { color: colors.textSecondary }]}>
                        {item.property.name} - Unit {item.unit.unitNumber}
                    </Text>
                    <Text style={[typography.bodySmall, { color: colors.textSecondary }]}>
                        {new Date(item.paymentDate).toLocaleDateString()}
                    </Text>
                </View>
                <View style={{ alignItems: 'flex-end' }}>
                    <Text style={[
                        typography.bodySmall,
                        {
                            color: item.status === 'PAID' ? colors.success :
                                item.status === 'PENDING' ? colors.warning :
                                    colors.error
                        }
                    ]}>
                        {item.status}
                    </Text>
                    {item.paymentMethod && (
                        <Text style={[typography.bodySmall, { color: colors.textSecondary }]}>
                            {item.paymentMethod.replace('_', ' ')}
                        </Text>
                    )}
                </View>
            </View>
        </Card>
    );

    if (loading) {
        return (
            <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
                <Text style={[typography.body, { color: colors.text }]}>Loading payments...</Text>
            </View>
        );
    }

    return (
        <ScrollView style={{ flex: 1, backgroundColor: colors.background }}>
            <View style={{ padding: spacing.lg }}>
                {/* Header */}
                <Text style={[typography.h2, { color: colors.text, marginBottom: spacing.lg }]}>
                    Record Payment
                </Text>

                {/* Error Display */}
                {error && (
                    <Card style={{
                        backgroundColor: colors.error + '10',
                        borderColor: colors.error,
                        borderWidth: 1,
                        marginBottom: spacing.lg
                    }}>
                        <View style={{ padding: spacing.md }}>
                            <Text style={[typography.bodySmall, { color: colors.error }]}>
                                {error}
                            </Text>
                        </View>
                    </Card>
                )}

                {/* Make Payment Button */}
                <Button
                    title="Record Payment"
                    onPress={() => setShowPayNow(true)}
                    variant="primary"
                    icon={<Ionicons name="cash-outline" size={20} color="white" />}
                    iconPosition="left"
                    style={{ marginBottom: spacing.lg }}
                />

                {/* Payment History */}
                <Text style={[typography.h3, { color: colors.text, marginBottom: spacing.md }]}>
                    Payment History
                </Text>
                {payments.length > 0 ? (
                    <FlatList
                        data={payments}
                        renderItem={renderPaymentItem}
                        keyExtractor={(item) => item.id}
                        showsVerticalScrollIndicator={false}
                    />
                ) : (
                    <Card>
                        <View style={{ padding: spacing.lg, alignItems: 'center' }}>
                            <Ionicons name="receipt-outline" size={48} color={colors.textSecondary} />
                            <Text style={[typography.body, { color: colors.textSecondary, marginTop: spacing.sm }]}>
                                No payments recorded yet
                            </Text>
                        </View>
                    </Card>
                )}

                {/* Record Payment Modal */}
                <Modal
                    visible={showPayNow}
                    transparent
                    animationType="slide"
                    onRequestClose={() => setShowPayNow(false)}
                >
                    <View style={{ flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.5)' }}>
                        <View style={{ backgroundColor: colors.surface, borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: spacing.lg }}>
                            <Text style={[typography.h3, { color: colors.text, marginBottom: spacing.lg }]}>
                                Record Payment
                            </Text>

                            {/* Lease Selection */}
                            {leases.length > 1 && (
                                <View style={{ marginBottom: spacing.lg }}>
                                    <Text style={[typography.body, { color: colors.text, marginBottom: spacing.sm }]}>
                                        Select Property/Unit:
                                    </Text>
                                    <Button
                                        title={selectedLease ? `${selectedLease.property.name} - Unit ${selectedLease.unit.unitNumber}` : 'Select Property'}
                                        onPress={() => setShowLeaseModal(true)}
                                        variant="outline"
                                    />
                                </View>
                            )}

                            {/* Amount Input */}
                            <View style={{ marginBottom: spacing.lg }}>
                                <Input
                                    label="Amount (UGX)"
                                    placeholder="Enter amount"
                                    value={payNowAmount}
                                    onChangeText={setPayNowAmount}
                                    keyboardType="numeric"
                                />
                            </View>

                            {/* Payment Method Selection */}
                            <View style={{ marginBottom: spacing.lg }}>
                                <Text style={[typography.body, { color: colors.text, marginBottom: spacing.sm }]}>
                                    💳 Payment Method
                                </Text>
                                <Button
                                    title={paymentMethods.find(m => m.value === paymentMethod)?.label || 'Select Method'}
                                    onPress={() => setShowPaymentMethodModal(true)}
                                    variant="outline"
                                    style={{
                                        paddingHorizontal: spacing.lg
                                    }}
                                    icon={
                                        <Ionicons name="phone-portrait" size={20} color={colors.primary} />
                                    }
                                />
                            </View>

                            {/* Ledger Notice */}
                            <Card style={{
                                marginBottom: spacing.lg,
                                backgroundColor: colors.info + '10',
                                borderColor: colors.info,
                                borderWidth: 1
                            }}>
                                <View style={{ padding: spacing.md }}>
                                    <Text style={[typography.bodySmall, { color: colors.info, textAlign: 'center', fontWeight: '600' }]}>
                                        📝 Ledger Entry - This records your payment for tracking purposes
                                    </Text>
                                </View>
                            </Card>

                            {/* Action Buttons */}
                            <View style={{ flexDirection: 'row', gap: spacing.md }}>
                                <Button
                                    title="Cancel"
                                    onPress={() => {
                                        setShowPayNow(false);
                                        setPayNowAmount('');
                                        setError(null);
                                    }}
                                    variant="outline"
                                    style={{
                                        flex: 1,
                                        height: 50,
                                        borderRadius: 25
                                    }}
                                />
                                <Button
                                    title={initiatingPayment ? 'Recording...' : 'Record Payment'}
                                    onPress={handleRecordPayment}
                                    variant="primary"
                                    style={{
                                        flex: 1,
                                        height: 50,
                                        borderRadius: 25,
                                        shadowColor: colors.primary,
                                        shadowOffset: { width: 0, height: 2 },
                                        shadowOpacity: 0.3,
                                        shadowRadius: 4,
                                        elevation: 5
                                    }}
                                    loading={initiatingPayment}
                                    disabled={!payNowAmount || (leases.length > 1 && !selectedLeaseId) || initiatingPayment}
                                />
                            </View>
                        </View>
                    </View>
                </Modal>

                {/* Lease Selection Modal */}
                <Modal
                    visible={showLeaseModal}
                    transparent
                    animationType="slide"
                    onRequestClose={() => setShowLeaseModal(false)}
                >
                    <View style={{ flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.5)' }}>
                        <View style={{ backgroundColor: colors.surface, borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: spacing.lg }}>
                            <Text style={[typography.h3, { color: colors.text, marginBottom: spacing.lg }]}>
                                Select Property/Unit
                            </Text>
                            {leases.map((lease) => (
                                <Button
                                    key={lease.id}
                                    title={`${lease.property.name} - Unit ${lease.unit.unitNumber}`}
                                    onPress={() => {
                                        setSelectedLeaseId(lease.id);
                                        setShowLeaseModal(false);
                                    }}
                                    variant="outline"
                                    style={{ marginBottom: spacing.sm }}
                                />
                            ))}
                            <Button
                                title="Cancel"
                                onPress={() => setShowLeaseModal(false)}
                                variant="outline"
                            />
                        </View>
                    </View>
                </Modal>

                {/* Payment Method Modal */}
                <Modal
                    visible={showPaymentMethodModal}
                    transparent
                    animationType="slide"
                    onRequestClose={() => setShowPaymentMethodModal(false)}
                >
                    <View style={{ flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.5)' }}>
                        <View style={{ backgroundColor: colors.surface, borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: spacing.lg }}>
                            <Text style={[typography.h3, { color: colors.text, marginBottom: spacing.lg }]}>
                                Select Payment Method
                            </Text>
                            {paymentMethods.map((method) => (
                                <Button
                                    key={method.value}
                                    title={method.label}
                                    onPress={() => {
                                        setPaymentMethod(method.value);
                                        setShowPaymentMethodModal(false);
                                    }}
                                    variant="outline"
                                    style={{ marginBottom: spacing.sm }}
                                />
                            ))}
                            <Button
                                title="Cancel"
                                onPress={() => setShowPaymentMethodModal(false)}
                                variant="outline"
                            />
                        </View>
                    </View>
                </Modal>
            </View>
        </ScrollView>
    );
};
