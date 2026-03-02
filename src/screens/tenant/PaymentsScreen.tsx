import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, FlatList, Alert, Modal } from 'react-native';
import { useTheme } from '../../theme/ThemeContext';
import { useAuth } from '../../context/AuthContext';
import { apiGet, apiPost } from '../../utils/apiClient';
import { Input } from '../../components/Input';
import { Button } from '../../components/Button';
import { Card } from '../../components/Card';
import { Ionicons } from '@expo/vector-icons';
import { RecordPaymentClaimModal } from '../../components/RecordPaymentClaimModal';

interface Lease {
    id: string;
    rentAmount: number;
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
    const [paymentClaims, setPaymentClaims] = useState<any[]>([]);
    const [leases, setLeases] = useState<Lease[]>([]);
    const [selectedLeaseId, setSelectedLeaseId] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // Modal states
    const [showClaimModal, setShowClaimModal] = useState(false);

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

            // Load payment claims
            const { status: claimStatus, json: claimJson } = await apiGet('/tenant/payment-claims');
            if (claimStatus === 200 && claimJson?.success) {
                setPaymentClaims(claimJson.data || []);
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

    const handleClaimRecorded = () => {
        setShowClaimModal(false);
        loadData(); // Reload data to show the new claim
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

                {/* Record Payment Claim Button */}
                <Button
                    title="Record Payment Claim"
                    onPress={() => setShowClaimModal(true)}
                    variant="primary"
                    icon={<Ionicons name="document-text-outline" size={20} color="white" />}
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

                {/* Payment Claims Section */}
                {paymentClaims.length > 0 && (
                    <>
                        <Text style={[typography.h3, { color: colors.text, marginBottom: spacing.md }]}>
                            Payment Claims
                        </Text>
                        {paymentClaims.map((claim) => (
                            <Card key={claim.id} style={{ marginBottom: spacing.sm }}>
                                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                                    <View style={{ flex: 1 }}>
                                        <Text style={[typography.h4, { color: colors.text }]}>
                                            UGX {formatNumber(claim.amount)}
                                        </Text>
                                        <Text style={[typography.bodySmall, { color: colors.textSecondary }]}>
                                            {claim.lease?.property?.name} - Unit {claim.lease?.unit?.unitNumber}
                                        </Text>
                                        <Text style={[typography.bodySmall, { color: colors.textSecondary }]}>
                                            Claimed: {new Date(claim.claimedPaidAt).toLocaleDateString()}
                                        </Text>
                                        <Text style={[typography.bodySmall, { color: colors.textSecondary }]}>
                                            Method: {claim.method?.replace('_', ' ')}
                                        </Text>
                                    </View>
                                    <View style={{ alignItems: 'flex-end' }}>
                                        <Text style={[
                                            typography.bodySmall,
                                            {
                                                color: claim.status === 'VERIFIED' ? colors.success :
                                                    claim.status === 'PENDING' ? colors.warning :
                                                        colors.error
                                            }
                                        ]}>
                                            {claim.status}
                                        </Text>
                                        {claim.verification?.note && (
                                            <Text style={[typography.bodySmall, { color: colors.textSecondary, fontSize: 12, marginTop: 2 }]}>
                                                Note: {claim.verification.note}
                                            </Text>
                                        )}
                                    </View>
                                </View>
                            </Card>
                        ))}
                    </>
                )}

                {/* Record Payment Claim Modal */}
                {selectedLease && (
                    <RecordPaymentClaimModal
                        visible={showClaimModal}
                        onClose={() => setShowClaimModal(false)}
                        leaseId={selectedLease.id}
                        monthlyRent={selectedLease.rentAmount}
                        onClaimRecorded={handleClaimRecorded}
                    />
                )}
            </View>
        </ScrollView>
    );
};
