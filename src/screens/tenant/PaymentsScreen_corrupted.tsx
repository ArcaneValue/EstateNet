import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, FlatList, Alert, Modal } from 'react-native';
import { useTheme } from '../../theme/ThemeContext';
import { useAuth } from '../../context/AuthContext';
import { apiGet, apiPost } from '../../utils/apiClient';
import { Card } from '../../components/Card';
import { Button } from '../../components/Button';
import { Input } from '../../components/Input';
import { Ionicons } from '@expo/vector-icons';

interface Lease {
    id: string;
    propertyId: string;
    unitId: string;
    rentAmount: number;
    property: {
        name: string;
        location: string;
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
    provider?: string;
    txRef?: string;
    flwTransactionId?: string;
    feeAmount?: number;
    netAmount?: number;
    payoutStatus?: string;
    property: {
        name: string;
    };
    unit: {
        unitNumber: string;
    };
}

interface PaymentInitiation {
    paymentId: string;
    status: string;
    txRef: string;
    amount: number;
    feeAmount: number;
    netAmount: number;
    checkoutUrl?: string;
    providerStatus?: string;
}

interface PaymentsScreenProps {
    navigation: any;
}

export const PaymentsScreen: React.FC<PaymentsScreenProps> = ({ navigation }) => {
    const { colors, spacing, typography, borderRadius } = useTheme();
    const { user } = useAuth();
    const [payments, setPayments] = useState<Payment[]>([]);
    const [leases, setLeases] = useState<Lease[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [showRecordPayment, setShowRecordPayment] = useState(false);
    const [showLeaseModal, setShowLeaseModal] = useState(false);
    const [showPaymentMethodModal, setShowPaymentMethodModal] = useState(false);
    const [showPayNow, setShowPayNow] = useState(false);
    const [payNowAmount, setPayNowAmount] = useState('');
    const [initiatingPayment, setInitiatingPayment] = useState(false);
    const [paymentInitiation, setPaymentInitiation] = useState<PaymentInitiation | null>(null);
    const [checkingStatus, setCheckingStatus] = useState(false);

    // Record payment form state
    const [selectedLeaseId, setSelectedLeaseId] = useState('');
    const [amount, setAmount] = useState('');
    const [paymentMethod, setPaymentMethod] = useState('ESTATENET');
    const [note, setNote] = useState('');
    const [recordingPayment, setRecordingPayment] = useState(false);

    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        setLoading(true);
        setError(null);

        try {
            // Load payments
            const { status: paymentStatus, json: paymentJson } = await apiGet('/payments');
            console.log('Payments API response:', { status: paymentStatus, json: paymentJson });
            if (paymentStatus === 200 && paymentJson?.success) {
                setPayments(paymentJson.data || []);
            }

            // Load active lease (not leases array)
            const { status: leaseStatus, json: leaseJson } = await apiGet('/tenant/me/active-lease');
            console.log('Active lease API response:', { status: leaseStatus, json: leaseJson });
            if (leaseStatus === 200 && leaseJson?.success && leaseJson.data) {
                // Convert single lease to array format for compatibility
                const activeLease = leaseJson.data;
                if (activeLease && activeLease.status === 'ACTIVE') {
                    const leasesArray = [activeLease];
                    console.log('Active lease found:', activeLease);
                    setLeases(leasesArray);
                    setSelectedLeaseId(activeLease.id);
                    console.log('Auto-selected lease:', activeLease.id);
                } else {
                    console.log('No active lease found');
                    setLeases([]);
                    setSelectedLeaseId('');
                }
            } else {
                console.error('Failed to load active lease:', leaseJson);
                setLeases([]);
                setSelectedLeaseId('');
            }
        } catch (err) {
            console.error('Load data error:', err);
            setError('Failed to load data');
            setLeases([]);
            setSelectedLeaseId('');
        } finally {
            setLoading(false);
        }
    };

    const handleRecordPayment = async () => {
        console.log('handleRecordPayment called', { amount, selectedLeaseId, recordingPayment });

        if (!amount || !selectedLeaseId) {
            setError('Amount and lease selection are required');
            return;
        }

        setRecordingPayment(true);
        setError(null);

        try {
            const now = new Date();
            const paymentDate = now.toISOString();
            const dueDate = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();

            console.log('Sending payment data', { amount: parseFloat(amount.replace(/,/g, '')), paymentDate, dueDate, paymentMethod });

            const { status, json } = await apiPost('/payments', {
                amount: parseFloat(amount.replace(/,/g, '')),
                paymentDate,
                dueDate,
                paymentMethod,
                transactionId: note ? note.substring(0, 50) : undefined
            });

            console.log('Payment response', { status, json });

            if (status === 201 && json?.success) {
                Alert.alert('Success', 'Payment recorded successfully');
                setShowRecordPayment(false);
                setAmount('');
                setNote('');
                loadData(); // Refresh data
            } else {
                setError(json?.message || 'Failed to record payment');
            }
        } catch (err) {
            console.error('Payment error:', err);
            setError('Network error. Please try again.');
        } finally {
            setRecordingPayment(false);
        }
    };

    const handlePayNow = async () => {
        if (!payNowAmount || parseFloat(payNowAmount) <= 0) {
            setError('Please enter a valid amount');
            return;
        }

        if (leases.length === 0) {
            setError('No active lease found');
            return;
        }

        setInitiatingPayment(true);
        setError(null);

        try {
            const amount = parseFloat(payNowAmount.replace(/,/g, ''));

            const { status, json } = await apiPost('/payments/initiate', {
                amount,
                paymentMethod: 'ESTATENET'
            });

            console.log('Payment initiation response:', { status, json });

            if (status === 201 && json?.success) {
                setPaymentInitiation(json.data);
                setShowPayNow(false);
                setPayNowAmount('');

                Alert.alert(
                    'Payment Initiated',
                    'Please complete the payment on your mobile money device. You can check the status here.',
                    [{ text: 'OK' }]
                );
            } else {
                setError(json?.message || 'Failed to initiate payment');
            }
        } catch (err) {
            console.error('Pay Now error:', err);
            setError('Network error. Please try again.');
        } finally {
            setInitiatingPayment(false);
        }
    };

    const checkPaymentStatus = async () => {
        if (!paymentInitiation) return;

        setCheckingStatus(true);
        try {
            const { status, json } = await apiGet(`/payments/${paymentInitiation.paymentId}`);

            if (status === 200 && json?.success) {
                const payment = json.data;
                console.log('Payment status check:', payment);

                if (payment.status === 'SUCCESS') {
                    Alert.alert(
                        'Payment Successful!',
                        'Your payment has been completed successfully.',
                        [{
                            text: 'OK', onPress: () => {
                                setPaymentInitiation(null);
                                loadData();
                            }
                        }]
                    );
                } else if (payment.status === 'FAILED') {
                    Alert.alert(
                        'Payment Failed',
                        'Your payment could not be completed. Please try again.',
                        [{ text: 'OK' }]
                    );
                    setPaymentInitiation(null);
                }
            }
        } catch (err) {
            console.error('Status check error:', err);
            setError('Failed to check payment status');
        } finally {
            setCheckingStatus(false);
        }
    };

    const handleRecordCashPayment = async () => {
        if (!payNowAmount) {
            setError('Amount is required');
            return;
        }

        const amount = parseFloat(payNowAmount.replace(/,/g, ''));
        if (isNaN(amount) || amount <= 0) {
            setError('Please enter a valid amount');
            return;
        }

        // Use selected lease from Pay Now modal or default lease
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
                paymentMethod: 'CASH',
                leaseId,
                note: 'Cash payment recorded via Make Payment'
            });

            if (status === 201 && json?.success) {
                Alert.alert('Success', 'Cash payment recorded successfully');
                setShowPayNow(false);
                setPayNowAmount('');
                loadData(); // Refresh payments list
            } else {
                setError(json?.message || 'Failed to record payment');
            }
        } catch (error) {
            console.error('Record cash payment error:', error);
            setError('Network error. Please try again.');
        } finally {
            setInitiatingPayment(false);
        }
    };

    const simulateSuccess = () => {
        if (__DEV__ && paymentInitiation) {
            Alert.alert(
                'Simulate Success',
                'This will simulate a successful payment webhook. Available only in development mode.',
                [
                    { text: 'Cancel', style: 'cancel' },
                    {
                        text: 'Simulate',
                        onPress: () => {
                            // In development, simulate success
                            Alert.alert('Success', 'Payment simulated as successful!');
                            setPaymentInitiation(null);
                            loadData();
                        }
                    }
                ]
            );
        }
    };

    const calculateFee = (amount: number) => amount * 0.015;

    const selectedLease = leases.find(l => l.id === selectedLeaseId);
    const amountNum = parseFloat(amount.replace(/,/g, '')) || 0;
    const payNowAmountNum = parseFloat(payNowAmount.replace(/,/g, '')) || 0;

    const renderPaymentItem = ({ item }: { item: Payment }) => (
        <Card style={{ marginBottom: spacing.sm }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                <View style={{ flex: 1 }}>
                    <Text style={[typography.h4, { color: colors.text }]}>
                        UGX {item.amount.toLocaleString()}
                    </Text>
                    <Text style={[typography.bodySmall, { color: colors.textSecondary }]}>
                        {new Date(item.paymentDate).toLocaleDateString()}
                    </Text>
                    {item.paymentMethod && (
                        <Text style={[typography.bodySmall, { color: colors.textSecondary }]}>
                            {item.paymentMethod}
                        </Text>
                    )}
                </View>
                <View style={{
                    paddingHorizontal: spacing.sm,
                    paddingVertical: spacing.xs,
                    borderRadius: borderRadius.sm,
                    backgroundColor: item.status === 'PAID' ? colors.success + '20' : colors.warning + '20'
                }}>
                    <Text style={[
                        typography.bodySmall,
                        { color: item.status === 'PAID' ? colors.success : colors.warning }
                    ]}>
                        {item.status}
                    </Text>
                </View>
            </View>
        </Card>
    );

    if (showRecordPayment) {
        return (
            <ScrollView style={{ flex: 1, backgroundColor: colors.background }} contentContainerStyle={{ padding: spacing.lg }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: spacing.lg }}>
                    <Button
                        title=""
                        onPress={() => setShowRecordPayment(false)}
                        variant="outline"
                        size="small"
                        style={{ marginRight: spacing.sm, paddingHorizontal: spacing.sm }}
                        icon={<Ionicons name="arrow-back" size={20} color={colors.primary} />}
                    />
                    <Text style={[typography.h2, { color: colors.text }]}>Record Payment</Text>
                </View>

                {leases.length > 1 && (
                    <View style={{ marginBottom: spacing.lg }}>
                        <Text style={[typography.h4, { color: colors.text, marginBottom: spacing.sm }]}>
                            Select Lease
                        </Text>
                        <Button
                            title={selectedLease ? `${selectedLease.property.name} - Unit ${selectedLease.unit.unitNumber}` : "Choose a lease..."}
                            onPress={() => setShowLeaseModal(true)}
                            variant="outline"
                            style={{ marginBottom: spacing.sm }}
                        />
                    </View>
                )}

                {selectedLease && (
                    <Card style={{ marginBottom: spacing.lg }}>
                        <Text style={[typography.bodySmall, { color: colors.textSecondary }]}>
                            Selected Lease
                        </Text>
                        <Text style={[typography.h4, { color: colors.text }]}>
                            {selectedLease.property.name}
                        </Text>
                        <Text style={[typography.body, { color: colors.text }]}>
                            Unit {selectedLease.unit.unitNumber} • UGX {selectedLease.rentAmount.toLocaleString()}/month
                        </Text>
                    </Card>
                )}

                <Input
                    label="Payment Amount (UGX)"
                    placeholder="Enter amount"
                    value={amount ? Number(amount.replace(/,/g, '')).toLocaleString() : ''}
                    onChangeText={(text) => setAmount(text.replace(/[^0-9]/g, ''))}
                    keyboardType="numeric"
                    icon={<Ionicons name="cash-outline" size={20} color={colors.textSecondary} />}
                    style={{ marginBottom: spacing.lg }}
                />

                <View style={{ marginBottom: spacing.lg }}>
                    <Text style={[typography.h4, { color: colors.text, marginBottom: spacing.sm }]}>
                        Payment Method
                    </Text>
                    <Button
                        title={paymentMethod.replace('_', ' ')}
                        onPress={() => setShowPaymentMethodModal(true)}
                        variant="outline"
                        style={{ marginBottom: spacing.sm }}
                    />
                </View>

                <Input
                    label="Note (Optional)"
                    placeholder="Transaction reference or notes"
                    value={note}
                    onChangeText={setNote}
                    multiline
                    numberOfLines={3}
                    icon={<Ionicons name="create-outline" size={20} color={colors.textSecondary} />}
                    style={{ marginBottom: spacing.lg }}
                />

                {amountNum > 0 && (
                    <Card style={{ marginBottom: spacing.lg }}>
                        <Text style={[typography.bodySmall, { color: colors.textSecondary }]}>
                            Estimated processing fee (1.5%): UGX {calculateFee(amountNum).toLocaleString()}
                        </Text>
                    </Card>
                )}

                {error && (
                    <Text style={[typography.bodySmall, { color: colors.error, marginBottom: spacing.lg }]}>
                        {error}
                    </Text>
                )}

                <Button
                    title={recordingPayment ? 'Recording...' : 'Record Payment'}
                    onPress={handleRecordPayment}
                    variant="primary"
                    size="large"
                    loading={recordingPayment}
                    disabled={!amount || !selectedLeaseId || recordingPayment}
                />

                {/* Lease Selection Modal */}
                <Modal
                    visible={showLeaseModal}
                    transparent
                    animationType="slide"
                    onRequestClose={() => setShowLeaseModal(false)}
                >
                    <View style={{ flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.5)' }}>
                        <View style={{ backgroundColor: colors.surface, borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: spacing.lg }}>
                            <Text style={[typography.h3, { color: colors.text, marginBottom: spacing.lg }]}>Select Lease</Text>
                            {leases.map(lease => (
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
                            <Text style={[typography.h3, { color: colors.text, marginBottom: spacing.lg }]}>Payment Method</Text>
                            {[
                                { value: 'ESTATENET', label: 'EstateNet (Mobile Money)' },
                                { value: 'CASH', label: 'Cash' }
                            ].map(method => (
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

                {/* Pay Now Modal */}
                <Modal
                    visible={showPayNow}
                    transparent
                    animationType="slide"
                    onRequestClose={() => setShowPayNow(false)}
                >
                    <View style={{ flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.5)' }}>
                        <View style={{ backgroundColor: colors.surface, borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: spacing.lg }}>
                            <Text style={[typography.h3, { color: colors.text, marginBottom: spacing.lg }]}>
                                Make Payment
                            </Text>

                            {leases.length > 1 && (
                                <View style={{ marginBottom: spacing.lg }}>
                                    <Text style={[typography.h4, { color: colors.text, marginBottom: spacing.sm }]}>
                                        Select Lease
                                    </Text>
                                    <Button
                                        title={selectedLease ? `${selectedLease.property.name} - Unit ${selectedLease.unit.unitNumber}` : "Choose a lease..."}
                                        onPress={() => setShowLeaseModal(true)}
                                        variant="outline"
                                        style={{ marginBottom: spacing.sm }}
                                    />
                                </View>
                            )}

                            <Input
                                label="Amount (UGX)"
                                placeholder="Enter amount"
                                value={payNowAmount}
                                onChangeText={setPayNowAmount}
                                keyboardType="numeric"
                                icon={<Ionicons name="cash" size={20} color={colors.textSecondary} />}
                                style={{ marginBottom: spacing.lg }}
                            />

                            <Button
                                title={paymentMethod === 'ESTATENET' ? 'EstateNet (Mobile Money)' : 'Cash'}
                                onPress={() => setShowPaymentMethodModal(true)}
                                variant="outline"
                                style={{ marginBottom: spacing.lg }}
                            />

                            {paymentMethod === 'ESTATENET' && payNowAmount && parseFloat(payNowAmount) > 0 && (
                                <Card style={{ marginBottom: spacing.lg }}>
                                    <Text style={[typography.bodySmall, { color: colors.textSecondary }]}>
                                        Processing fee (1.5%): UGX {(parseFloat(payNowAmount) * 0.015).toLocaleString()}
                                    </Text>
                                    <Text style={[typography.bodySmall, { color: colors.textSecondary }]}>
                                        You will receive: UGX {(parseFloat(payNowAmount) * 0.985).toLocaleString()}
                                    </Text>
                                </Card>
                            )}

                            {paymentMethod === 'CASH' && (
                                <Card style={{ marginBottom: spacing.lg }}>
                                    <Text style={[typography.bodySmall, { color: colors.textSecondary }]}>
                                        Cash payment - No processing fees
                                        <Button
                                            title="Cancel"
                                            onPress={() => {
                                                setShowPayNow(false);
                                                setPayNowAmount('');
                                                setError(null);
                                            }}
                                            variant="outline"
                                            style={{ flex: 1 }}
                                        />
                                        <Button
                                            title={initiatingPayment ? 'Initiating...' : 'Pay Now'}
                                            onPress={handlePayNow}
                                            variant="primary"
                                            style={{ flex: 1 }}
                                            loading={initiatingPayment}
                                            disabled={!payNowAmount || initiatingPayment}
                                        />
                                    </View>
                                </View >
                    </View >
                </Modal >

                {/* Payment Initiation Status */}
                {
                    paymentInitiation && (
                        <Card style={{ marginBottom: spacing.lg, backgroundColor: colors.surface }}>
                            <View style={{ alignItems: 'center', padding: spacing.lg }}>
                                <Ionicons name="time" size={48} color={colors.warning} />
                                <Text style={[typography.h3, { color: colors.text, marginTop: spacing.md }]}>
                                    Awaiting Mobile Money Confirmation
                                </Text>
                                <Text style={[typography.body, { color: colors.textSecondary, textAlign: 'center', marginTop: spacing.sm }]}>
                                    Amount: UGX {paymentInitiation.amount.toLocaleString()}
                                </Text>
                                <Text style={[typography.bodySmall, { color: colors.textSecondary, textAlign: 'center', marginTop: spacing.xs }]}>
                                    Transaction Ref: {paymentInitiation.txRef}
                                </Text>
                                <View style={{ flexDirection: 'row', gap: spacing.sm, marginTop: spacing.lg }}>
                                    <Button
                                        title={checkingStatus ? "Checking..." : "Refresh Status"}
                                        onPress={checkPaymentStatus}
                                        variant="primary"
                                        loading={checkingStatus}
                                    />
                                    {__DEV__ && (
                                        <Button
                                            title="Simulate Success"
                                            onPress={simulateSuccess}
                                            variant="outline"
                                        />
                                    )}
                                </View>
                            </View>
                        </Card>
                    )
                }
            </ScrollView >
        );
    }

    return (
        <ScrollView style={{ flex: 1, backgroundColor: colors.background }} contentContainerStyle={{ padding: spacing.lg }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing.lg }}>
                <Text style={[typography.h2, { color: colors.text }]}>Payments</Text>
                <Button
                    title="Make Payment"
                    onPress={() => setShowPayNow(true)}
                    variant="primary"
                    size="small"
                    icon={<Ionicons name="card" size={16} color="white" />}
                    iconPosition="left"
                />
            </View>

            {leases.length === 0 && !loading && (
                <Card style={{ alignItems: 'center', padding: spacing.xl }}>
                    <Ionicons name="document-text-outline" size={64} color={colors.textSecondary} />
                    <Text style={[typography.h3, { color: colors.text, marginTop: spacing.lg }]}>
                        No Active Leases
                    </Text>
                    <Text style={[typography.body, { color: colors.textSecondary, marginTop: spacing.sm, textAlign: 'center' }]}>
                        You need an active lease to record payments.
                    </Text>
                </Card>
            )}

            {loading ? (
                <Text style={[typography.body, { color: colors.textSecondary, textAlign: 'center' }]}>
                    Loading payments...
                </Text>
            ) : error ? (
                <Card style={{ alignItems: 'center', padding: spacing.lg }}>
                    <Ionicons name="alert-circle-outline" size={48} color={colors.error} />
                    <Text style={[typography.body, { color: colors.error, marginTop: spacing.sm }]}>
                        {error}
                    </Text>
                    <Button
                        title="Retry"
                        onPress={loadData}
                        variant="outline"
                        size="small"
                        style={{ marginTop: spacing.sm }}
                    />
                </Card>
            ) : payments.length === 0 ? (
                <Card style={{ alignItems: 'center', padding: spacing.xl }}>
                    <Ionicons name="receipt-outline" size={64} color={colors.textSecondary} />
                    <Text style={[typography.h3, { color: colors.text, marginTop: spacing.lg }]}>
                        No Payments Yet
                    </Text>
                    <Text style={[typography.body, { color: colors.textSecondary, marginTop: spacing.sm, textAlign: 'center' }]}>
                        Your payment history will appear here once you start recording payments.
                    </Text>
                </Card>
            ) : (
                <FlatList
                    data={payments}
                    renderItem={renderPaymentItem}
                    keyExtractor={(item) => item.id}
                    showsVerticalScrollIndicator={false}
                />
            )}
        </ScrollView>
    );
};
