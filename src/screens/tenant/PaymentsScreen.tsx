import React, { useState, useEffect } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import { View, Text, ScrollView, FlatList, Alert, Modal, RefreshControl } from 'react-native';
import { useTheme } from '../../theme/ThemeContext';
import { useAuth } from '../../context/AuthContext';
import { useLease } from '../../context/LeaseContext';
import { useTutorial, TUTORIAL_KEYS } from '../../context/TutorialContext';
import { apiGet, apiPost } from '../../utils/apiClient';
import { Input } from '../../components/Input';
import { Button } from '../../components/Button';
import { Card } from '../../components/Card';
import { TopAppBar } from '../../components/TopAppBar';
import { Ionicons } from '@expo/vector-icons';
import { RecordPaymentClaimModal } from '../../components/RecordPaymentClaimModal';
import { TutorialModal } from '../../components/TutorialModal';

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
    const { activeLease } = useLease();

    // State
    const [payments, setPayments] = useState<Payment[]>([]);
    const [paymentClaims, setPaymentClaims] = useState<any[]>([]);
    const [leases, setLeases] = useState<Lease[]>([]);
    const [selectedLeaseId, setSelectedLeaseId] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // Modal states
    const [showClaimModal, setShowClaimModal] = useState(false);
    const [showTutorial, setShowTutorial] = useState(false);
    const [refreshing, setRefreshing] = useState(false);

    // Tutorial
    const { shouldShowTutorial, markTutorialSeen } = useTutorial();

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
        checkTutorial();
    }, []);

    // Auto-refresh when screen comes into focus
    useFocusEffect(
        React.useCallback(() => {
            loadData();
        }, [])
    );

    const handleRefresh = async () => {
        setRefreshing(true);
        await loadData();
        setRefreshing(false);
    };

    const checkTutorial = async () => {
        const shouldShow = await shouldShowTutorial(TUTORIAL_KEYS.PAYMENT_CLAIMS);
        if (shouldShow) {
            setTimeout(() => setShowTutorial(true), 500);
        }
    };

    const handleTutorialClose = async () => {
        await markTutorialSeen(TUTORIAL_KEYS.PAYMENT_CLAIMS);
        setShowTutorial(false);
    };

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

    const renderHeader = () => (
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
                onPress={() => {
                    if (!selectedLease) {
                        Alert.alert('No Active Lease', 'You need an active lease to record a payment claim.');
                        return;
                    }
                    setShowClaimModal(true);
                }}
                variant="primary"
                icon={<Ionicons name="document-text-outline" size={20} color="white" />}
                iconPosition="left"
                style={{ marginBottom: !selectedLease ? spacing.xs : spacing.lg }}
                disabled={!selectedLease}
            />

            {/* Warning message when no lease */}
            {!selectedLease && (
                <View style={{
                    backgroundColor: colors.warning + '15',
                    borderLeftWidth: 3,
                    borderLeftColor: colors.warning,
                    padding: spacing.md,
                    borderRadius: borderRadius.md,
                    marginBottom: spacing.lg,
                    flexDirection: 'row',
                    alignItems: 'center',
                }}>
                    <Ionicons name="warning-outline" size={20} color={colors.warning} style={{ marginRight: spacing.sm }} />
                    <Text style={[typography.bodySmall, { color: colors.warning, flex: 1 }]}>
                        Will not open unless lease is active. Accept a property invitation to activate your lease.
                    </Text>
                </View>
            )}

            {/* Payment History Header */}
            <Text style={[typography.h3, { color: colors.text, marginBottom: spacing.md }]}>
                Payment History
            </Text>
        </View>
    );

    const renderFooter = () => (
        <View style={{ padding: spacing.lg, paddingTop: 0 }}>

            {/* Payment Claims Section */}
            {paymentClaims.length > 0 && (
                <>
                    <Text style={[typography.h3, { color: colors.text, marginBottom: spacing.md, marginTop: spacing.lg }]}>
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
        </View>
    );

    const renderEmptyComponent = () => (
        <View style={{ padding: spacing.lg, paddingTop: 0 }}>
            <Card>
                <View style={{ padding: spacing.lg, alignItems: 'center' }}>
                    <Ionicons name="receipt-outline" size={48} color={colors.textSecondary} />
                    <Text style={[typography.body, { color: colors.textSecondary, marginTop: spacing.sm }]}>
                        No payments recorded yet
                    </Text>
                </View>
            </Card>
        </View>
    );

    const propertyName = activeLease?.property?.name;
    const unitNumber = activeLease?.unit?.unitNumber;

    return (
        <View style={{ flex: 1, backgroundColor: colors.background }}>
            <TopAppBar
                onNotificationsPress={() => { }}
                onProfilePress={() => navigation.navigate('Profile')}
                profileImage={user?.profileImage}
                propertyName={propertyName}
                unitNumber={unitNumber}
            />
            <FlatList
                data={payments}
                renderItem={renderPaymentItem}
                keyExtractor={(item) => item.id}
                ListHeaderComponent={renderHeader}
                ListFooterComponent={renderFooter}
                ListEmptyComponent={renderEmptyComponent}
                showsVerticalScrollIndicator={false}
                contentContainerStyle={{ paddingBottom: spacing.xl }}
                refreshControl={
                    <RefreshControl
                        refreshing={refreshing}
                        onRefresh={handleRefresh}
                        tintColor={colors.primary}
                        colors={[colors.primary]}
                    />
                }
            />

            {/* Record Payment Claim Modal */}
            {selectedLease && (
                <RecordPaymentClaimModal
                    visible={showClaimModal}
                    onClose={() => setShowClaimModal(false)}
                    leaseId={selectedLease.id}
                    monthlyRent={selectedLease.rentAmount}
                    propertyName={selectedLease.property?.name}
                    unitNumber={selectedLease.unit?.unitNumber}
                    onClaimRecorded={handleClaimRecorded}
                />
            )}

            {/* Tutorial Modal */}
            <TutorialModal
                visible={showTutorial}
                onClose={handleTutorialClose}
                title="Record Your Rent Payments"
                description="Submit payment claims for verification by your property manager. Once verified, your payment will be recorded in the system."
                steps={[
                    {
                        title: 'Record Payment Claim',
                        description: 'Click the "Record Payment Claim" button to submit a new payment.',
                        icon: 'document-text-outline'
                    },
                    {
                        title: 'Enter Payment Details',
                        description: 'Fill in the amount, payment method, date, and any reference information.',
                        icon: 'create-outline'
                    },
                    {
                        title: 'Wait for Verification',
                        description: 'Your property manager will review and verify your payment claim.',
                        icon: 'time-outline'
                    },
                    {
                        title: 'Download Receipt',
                        description: 'Once verified, you can download your payment receipt.',
                        icon: 'download-outline'
                    }
                ]}
            />
        </View>
    );
};
