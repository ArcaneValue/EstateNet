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

    // State
    const [payments, setPayments] = useState<Payment[]>([]);
    const [leases, setLeases] = useState<Lease[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // Pay Now modal state
    const [showPayNow, setShowPayNow] = useState(false);
    const [payNowAmount, setPayNowAmount] = useState('');
    const [initiatingPayment, setInitiatingPayment] = useState(false);
    const [paymentInitiation, setPaymentInitiation] = useState<PaymentInitiation | null>(null);
    const [checkingStatus, setCheckingStatus] = useState(false);
    const [paymentMethod, setPaymentMethod] = useState('ESTATENET');

    // Modal states
    const [showLeaseModal, setShowLeaseModal] = useState(false);
    const [showPaymentMethodModal, setShowPaymentMethodModal] = useState(false);
    const [selectedLeaseId, setSelectedLeaseId] = useState('');

    // Payment methods
    const paymentMethods = [
        { value: 'ESTATENET', label: 'EstateNet (Mobile Money)' },
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

    const handlePayNow = async () => {
        if (!payNowAmount) {
            setError('Amount is required');
            return;
        }

        const amount = parseFloat(payNowAmount.replace(/,/g, ''));
        if (isNaN(amount) || amount <= 0) {
            setError('Please enter a valid amount');
            return;
        }

        setInitiatingPayment(true);
        setError(null);

        try {
            const { status, json } = await apiPost('/payments/initiate', {
                amount,
                paymentMethod: 'ESTATENET'
            });

            if (status === 201 && json?.success) {
                setPaymentInitiation(json.data);
                setShowPayNow(false);
                setPayNowAmount('');

                Alert.alert(
                    'Payment Initiated',
                    'Your payment has been initiated. You will receive a mobile money prompt shortly.',
                    [{ text: 'OK' }]
                );
            } else {
                setError(json?.message || 'Failed to initiate payment');
            }
        } catch (error) {
            console.error('Pay Now error:', error);
            setError('Network error. Please try again.');
        } finally {
            setInitiatingPayment(false);
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
                loadData();
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

    const checkPaymentStatus = async () => {
        if (!paymentInitiation) return;

        setCheckingStatus(true);
        try {
            const { status, json } = await apiGet(`/payments/${paymentInitiation.paymentId}`);

            if (status === 200 && json?.success) {
                const payment = json.data;
                if (payment.status === 'SUCCESS') {
                    Alert.alert(
                        'Payment Successful',
                        'Your payment has been processed successfully!',
                        [{ text: 'OK', onPress: () => setPaymentInitiation(null) }]
                    );
                    loadData();
                } else if (payment.status === 'FAILED') {
                    Alert.alert('Payment Failed', 'Your payment could not be processed. Please try again.');
                }
            }
        } catch (err) {
            console.error('Status check error:', err);
            setError('Failed to check payment status');
        } finally {
            setCheckingStatus(false);
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
                            Alert.alert('Success', 'Payment simulated successfully!');
                            setPaymentInitiation(null);
                            loadData();
                        }
                    }
                ]
            );

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
                            {item.feeAmount && (
                                <Text style={[typography.bodySmall, { color: colors.textSecondary }]}>
                                    Fee: UGX {formatNumber(item.feeAmount)} | Net: UGX {formatNumber(item.netAmount || 0)}
                                </Text>
                            )}
                        </View>
                        <View style={{ alignItems: 'flex-end' }}>
                            <Text style={[
                                typography.bodySmall,
                                {
                                    color: item.status === 'SUCCESS' ? colors.success :
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
                                You need an active lease to make payments.
                            </Text>
                        </Card>
                    )}

                    {loading ? (
                        <Text style={[typography.body, { color: colors.textSecondary, textAlign: 'center' }]}>
                            Loading payments...
                        </Text>
                    ) : error ? (
                        <Card style={{ alignItems: 'center', padding: spacing.lg }}>
                            <Text style={[typography.body, { color: colors.error }]}>
                                {error}
                            </Text>
                            <Button
                                title="Retry"
                                onPress={loadData}
                                variant="outline"
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
                                Your payment history will appear here once you start making payments.
                            </Text>
                        </Card>
                    ) : (
                        <FlatList
                            data={payments}
                            renderItem={renderPaymentItem}
                            keyExtractor={(item) => item.id}
                            showsVerticalScrollIndicator={false}
                            contentContainerStyle={{ paddingBottom: spacing.xl }}
                        />
                    )}

                    {/* Payment Initiation Status */}
                    {paymentInitiation && (
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
                    )}

                    {/* Make Payment Modal */}
                    <Modal
                        visible={showPayNow}
                        transparent
                        animationType="slide"
                        onRequestClose={() => setShowPayNow(false)}
                    >
                        <View style={{ flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.6)' }}>
                            <View style={{
                                backgroundColor: colors.surface,
                                borderTopLeftRadius: 30,
                                borderTopRightRadius: 30,
                                padding: spacing.xl,
                                minHeight: '60%',
                                shadowColor: '#000',
                                shadowOffset: { width: 0, height: -5 },
                                shadowOpacity: 0.3,
                                shadowRadius: 10,
                                elevation: 10
                            }}>
                                {/* Header */}
                                <View style={{ alignItems: 'center', marginBottom: spacing.xl }}>
                                    <View style={{
                                        width: 60,
                                        height: 4,
                                        backgroundColor: colors.border,
                                        borderRadius: 2,
                                        marginBottom: spacing.lg
                                    }} />
                                    <View style={{
                                        backgroundColor: colors.primary + '20',
                                        borderRadius: 50,
                                        padding: spacing.md,
                                        marginBottom: spacing.md
                                    }}>
                                        <Ionicons name="wallet" size={32} color={colors.primary} />
                                    </View>
                                    <Text style={[typography.h2, { color: colors.text, textAlign: 'center', fontWeight: 'bold' }]}>
                                        Make Payment
                                    </Text>
                                    <Text style={[typography.body, { color: colors.textSecondary, textAlign: 'center', marginTop: spacing.xs }]}>
                                        Choose your payment method and enter amount
                                    </Text>
                                </View>

                                {/* Lease Selection */}
                                {leases.length > 1 && (
                                    <View style={{ marginBottom: spacing.lg }}>
                                        <Text style={[typography.h4, { color: colors.text, marginBottom: spacing.sm, fontWeight: '600' }]}>
                                            🏠 Select Lease
                                        </Text>
                                        <Button
                                            title={selectedLease ? `${selectedLease.property.name} - Unit ${selectedLease.unit.unitNumber}` : "Choose a lease..."}
                                            onPress={() => setShowLeaseModal(true)}
                                            variant="outline"
                                            style={{ marginBottom: spacing.sm, height: 50 }}
                                        />
                                    </View>
                                )}

                                {/* Amount Input */}
                                <View style={{ marginBottom: spacing.lg }}>
                                    <Text style={[typography.h4, { color: colors.text, marginBottom: spacing.sm, fontWeight: '600' }]}>
                                        💰 Amount (UGX)
                                    </Text>
                                    <Input
                                        placeholder="Enter amount"
                                        value={formatNumber(payNowAmount)}
                                        onChangeText={(text) => {
                                            const cleanText = text.replace(/,/g, '');
                                            if (/^\d*$/.test(cleanText)) {
                                                setPayNowAmount(cleanText);
                                            }
                                        }}
                                        keyboardType="numeric"
                                        icon={<Ionicons name="cash" size={20} color={colors.primary} />}
                                        style={{
                                            height: 60,
                                            fontSize: 18,
                                            fontWeight: '600'
                                        }}
                                    />
                                </View>

                                {/* Payment Method Selection */}
                                <View style={{ marginBottom: spacing.lg }}>
                                    <Text style={[typography.h4, { color: colors.text, marginBottom: spacing.sm, fontWeight: '600' }]}>
                                        💳 Payment Method
                                    </Text>
                                    <Button
                                        title={paymentMethod === 'ESTATENET' ? 'EstateNet (Mobile Money)' : 'Cash'}
                                        onPress={() => setShowPaymentMethodModal(true)}
                                        variant="outline"
                                        style={{
                                            height: 50,
                                            flexDirection: 'row',
                                            alignItems: 'center',
                                            justifyContent: 'space-between',
                                            paddingHorizontal: spacing.lg
                                        }}
                                        icon={
                                            paymentMethod === 'ESTATENET'
                                                ? <Ionicons name="phone-portrait" size={20} color={colors.primary} />
                                                : <Ionicons name="wallet" size={20} color={colors.success} />
                                        }
                                    />
                                </View>

                                {/* Fee Information */}
                                {paymentMethod === 'ESTATENET' && payNowAmount && parseFloat(payNowAmount) > 0 && (
                                    <Card style={{
                                        marginBottom: spacing.lg,
                                        backgroundColor: colors.primary + '10',
                                        borderWidth: 1,
                                        borderColor: colors.primary + '30',
                                        borderRadius: 12
                                    }}>
                                        <View style={{ padding: spacing.md }}>
                                            <Text style={[typography.bodySmall, { color: colors.textSecondary, marginBottom: spacing.xs }]}>
                                                💳 Processing fee (1.5%): UGX {formatNumber(parseFloat(payNowAmount) * 0.015)}
                                            </Text>
                                            <Text style={[typography.bodySmall, { color: colors.primary, fontWeight: 'bold' }]}>
                                                ✅ You will receive: UGX {formatNumber(parseFloat(payNowAmount) * 0.985)}
                                            </Text>
                                        </View>
                                    </Card>
                                )}

                                {paymentMethod === 'CASH' && (
                                    <Card style={{
                                        marginBottom: spacing.lg,
                                        backgroundColor: colors.success + '10',
                                        borderWidth: 1,
                                        borderColor: colors.success + '30',
                                        borderRadius: 12
                                    }}>
                                        <View style={{ padding: spacing.md }}>
                                            <Text style={[typography.bodySmall, { color: colors.success, textAlign: 'center', fontWeight: '600' }]}>
                                                💵 Cash payment - No processing fees
                                            </Text>
                                        </View>
                                    </Card>
                                )}

                                {/* Error Message */}
                                {error && (
                                    <View style={{
                                        backgroundColor: colors.error + '10',
                                        borderRadius: 8,
                                        padding: spacing.md,
                                        marginBottom: spacing.lg,
                                        borderWidth: 1,
                                        borderColor: colors.error + '30'
                                    }}>
                                        <Text style={[typography.bodySmall, { color: colors.error, textAlign: 'center' }]}>
                                            ⚠️ {error}
                                        </Text>
                                    </View>
                                )}

                                {/* Action Buttons */}
                                <View style={{ flexDirection: 'row', gap: spacing.md, marginTop: spacing.lg }}>
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
                                        title={initiatingPayment ? 'Processing...' : (paymentMethod === 'ESTATENET' ? 'Pay Now' : 'Record Payment')}
                                        onPress={paymentMethod === 'ESTATENET' ? handlePayNow : handleRecordCashPayment}
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
                                    Select Lease
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
                                    Payment Method
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
                </ScrollView>
            );
        };
