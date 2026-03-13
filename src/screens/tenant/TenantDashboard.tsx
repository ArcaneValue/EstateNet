import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '../../theme/ThemeContext';
import { useAuth } from '../../context/AuthContext';
import { apiGet } from '../../utils/apiClient';
import { Card } from '../../components/Card';
import { Button } from '../../components/Button';
import { StatusBadge } from '../../components/StatusBadge';
import { Modal } from '../../components/Modal';
import { RecordPaymentClaimModal } from '../../components/RecordPaymentClaimModal';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';

interface TenantDashboardProps {
    navigation: any;
}

export const TenantDashboard: React.FC<TenantDashboardProps> = ({ navigation }) => {
    const { colors, spacing, typography, borderRadius, shadows } = useTheme();
    const { user } = useAuth();

    const [showAllPaymentsModal, setShowAllPaymentsModal] = useState(false);
    const [showPaymentDetailsModal, setShowPaymentDetailsModal] = useState(false);
    const [showClaimModal, setShowClaimModal] = useState(false);
    const [selectedPayment, setSelectedPayment] = useState<any>(null);
    const [paymentClaims, setPaymentClaims] = useState<any[]>([]);
    const [activeLease, setActiveLease] = useState<any>(null);
    const [loading, setLoading] = useState(true);

    const rentDueDate = 'Jan 31, 2026';
    const daysUntilDue = 19;

    // All payment history data
    const allPayments = [
        {
            id: '1',
            month: 'December 2025',
            amount: 300000,
            date: 'Dec 15, 2025',
            status: 'paid' as const,
            paymentMethod: 'EstateNet',
            transactionId: 'TXN-2025-12-001',
        },
        {
            id: '2',
            month: 'November 2025',
            amount: 300000,
            date: 'Nov 20, 2025',
            status: 'paid' as const,
            paymentMethod: 'Bank Transfer',
            transactionId: 'TXN-2025-11-001',
        },
        {
            id: '3',
            month: 'October 2025',
            amount: 300000,
            date: 'Oct 18, 2025',
            status: 'paid' as const,
            paymentMethod: 'EstateNet',
            transactionId: 'TXN-2025-10-001',
        },
        {
            id: '4',
            month: 'September 2025',
            amount: 300000,
            date: 'Sep 15, 2025',
            status: 'paid' as const,
            paymentMethod: 'Mobile Money',
            transactionId: 'TXN-2025-09-001',
        },
        {
            id: '5',
            month: 'August 2025',
            amount: 300000,
            date: 'Aug 22, 2025',
            status: 'paid' as const,
            paymentMethod: 'EstateNet',
            transactionId: 'TXN-2025-08-001',
        },
        {
            id: '6',
            month: 'July 2025',
            amount: 300000,
            date: 'Jul 16, 2025',
            status: 'paid' as const,
            paymentMethod: 'Bank Transfer',
            transactionId: 'TXN-2025-07-001',
        },
    ];

    useEffect(() => {
        loadDashboardData();
    }, []);

    const loadDashboardData = async () => {
        setLoading(true);
        try {
            // Load payment claims
            const { status: claimStatus, json: claimJson } = await apiGet('/tenant/payment-claims');
            if (claimStatus === 200 && claimJson?.success) {
                setPaymentClaims(claimJson.data || []);
            }

            // Load active lease
            const { status: leaseStatus, json: leaseJson } = await apiGet('/tenant/me/active-lease');
            if (leaseStatus === 200 && leaseJson?.success && leaseJson.data) {
                setActiveLease(leaseJson.data);
            }
        } catch (err) {
            console.error('Load dashboard data error:', err);
        } finally {
            setLoading(false);
        }
    };

    const handlePaymentPress = (payment: any) => {
        setSelectedPayment(payment);
        setShowAllPaymentsModal(false);
        setTimeout(() => setShowPaymentDetailsModal(true), 300);
    };

    const handleClaimRecorded = () => {
        setShowClaimModal(false);
        loadDashboardData(); // Reload to show new claim
    };

    // Get pending claims count for status display
    const pendingClaimsCount = paymentClaims.filter(claim => claim.status === 'PENDING').length;
    const hasVerifiedClaims = paymentClaims.some(claim => claim.status === 'VERIFIED');

    return (
        <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }}>
            <ScrollView contentContainerStyle={{ padding: spacing.base }}>
                {/* Header */}
                <View style={[styles.header, { marginBottom: spacing.lg }]}>
                    <View>
                        <Text style={[typography.bodySmall, { color: colors.textSecondary }]}>
                            Welcome back
                        </Text>
                        <Text style={[typography.h2, { color: colors.text, marginTop: spacing.xs }]}>
                            {user?.name || 'Tenant'}
                        </Text>
                    </View>
                    <TouchableOpacity
                        style={[
                            styles.profileButton,
                            {
                                backgroundColor: colors.primary,
                                borderRadius: borderRadius.full,
                                width: 48,
                                height: 48,
                            },
                        ]}
                    >
                        <Text style={{ color: '#FFFFFF', fontSize: 18, fontWeight: '600' }}>
                            {user?.name?.charAt(0) || 'T'}
                        </Text>
                    </TouchableOpacity>
                </View>

                {/* Rent Status Card - Featured */}
                <Card style={{ marginBottom: spacing.lg, padding: 0 }}>
                    <LinearGradient
                        colors={[colors.primary, colors.primaryDark]}
                        style={{ padding: spacing.lg, borderRadius: borderRadius.lg }}
                    >
                        <View style={styles.rentHeader}>
                            <View>
                                <Text style={{ fontSize: 12, color: '#FFFFFF', opacity: 0.8 }}>
                                    Monthly Rent
                                </Text>
                                <Text style={[typography.display, { color: '#FFFFFF', fontSize: 40, marginTop: spacing.xs }]}>
                                    UGX 300K
                                </Text>
                            </View>
                            <StatusBadge status="paid" size="medium" />
                        </View>

                        <View
                            style={{
                                backgroundColor: 'rgba(255, 255, 255, 0.15)',
                                height: 1,
                                marginVertical: spacing.base,
                            }}
                        />

                        <View style={styles.rentDetails}>
                            <View style={{ flex: 1 }}>
                                <Text style={{ fontSize: 12, color: '#FFFFFF', opacity: 0.8 }}>
                                    Due Date
                                </Text>
                                <Text style={{ fontSize: 16, color: '#FFFFFF', fontWeight: '600', marginTop: spacing.xs }}>
                                    {rentDueDate}
                                </Text>
                            </View>
                            <View style={{ flex: 1 }}>
                                <Text style={{ fontSize: 12, color: '#FFFFFF', opacity: 0.8 }}>
                                    Days Until Due
                                </Text>
                                <Text style={{ fontSize: 16, color: '#FFFFFF', fontWeight: '600', marginTop: spacing.xs }}>
                                    {daysUntilDue} days
                                </Text>
                            </View>
                        </View>

                        <Button
                            title="Record Payment Claim"
                            onPress={() => setShowClaimModal(true)}
                            variant="secondary"
                            style={{ marginTop: spacing.lg }}
                        />

                        {/* Payment Claims Status */}
                        {(pendingClaimsCount > 0 || hasVerifiedClaims) && (
                            <View style={{
                                flexDirection: 'row',
                                alignItems: 'center',
                                marginTop: spacing.md,
                                padding: spacing.sm,
                                backgroundColor: 'rgba(255, 255, 255, 0.15)',
                                borderRadius: borderRadius.sm
                            }}>
                                <Ionicons
                                    name={pendingClaimsCount > 0 ? "time" : "checkmark-circle"}
                                    size={16}
                                    color="#FFFFFF"
                                />
                                <Text style={{
                                    color: '#FFFFFF',
                                    fontSize: 12,
                                    marginLeft: spacing.xs,
                                    opacity: 0.9
                                }}>
                                    {pendingClaimsCount > 0
                                        ? `${pendingClaimsCount} claim${pendingClaimsCount > 1 ? 's' : ''} pending review`
                                        : 'Latest claims verified'
                                    }
                                </Text>
                            </View>
                        )}
                    </LinearGradient>
                </Card>

                {/* Payment Breakdown */}
                <View style={{ marginBottom: spacing.lg }}>
                    <Text style={[typography.h3, { color: colors.text, marginBottom: spacing.md }]}>
                        Payment Breakdown
                    </Text>
                    <Card style={{ padding: spacing.base }}>
                        <View style={styles.breakdownItem}>
                            <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1 }}>
                                <View
                                    style={{
                                        backgroundColor: colors.primaryLight + '20',
                                        width: 36,
                                        height: 36,
                                        borderRadius: 18,
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        marginRight: spacing.md,
                                    }}
                                >
                                    <Ionicons name="home" size={18} color={colors.primary} />
                                </View>
                                <Text style={[typography.body, { color: colors.text }]}>Monthly Rent</Text>
                            </View>
                            <Text style={[typography.body, { color: colors.text, fontWeight: '600' }]}>
                                UGX 300,000
                            </Text>
                        </View>

                        <View style={{ height: 1, backgroundColor: colors.divider, marginVertical: spacing.sm }} />

                        <View style={styles.breakdownItem}>
                            <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1 }}>
                                <View
                                    style={{
                                        backgroundColor: colors.accent + '20',
                                        width: 36,
                                        height: 36,
                                        borderRadius: 18,
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        marginRight: spacing.md,
                                    }}
                                >
                                    <Ionicons name="shield-checkmark" size={18} color={colors.accent} />
                                </View>
                                <View style={{ flex: 1 }}>
                                    <Text style={[typography.body, { color: colors.text }]}>Service Cost</Text>
                                    <Text style={[typography.bodySmall, { color: colors.textSecondary, marginTop: 2 }]}>
                                        Platform maintenance & support
                                    </Text>
                                </View>
                            </View>
                            <Text style={[typography.body, { color: colors.text, fontWeight: '600' }]}>
                                UGX 3,000
                            </Text>
                        </View>

                        <View
                            style={{
                                height: 1,
                                backgroundColor: colors.divider,
                                marginVertical: spacing.md,
                            }}
                        />

                        <View style={styles.breakdownItem}>
                            <Text style={[typography.bodyLarge, { color: colors.textSecondary, fontWeight: '600' }]}>
                                Landlord Receives
                            </Text>
                            <Text style={[typography.h3, { color: colors.success }]}>UGX 297,000</Text>
                        </View>

                        <View
                            style={{
                                backgroundColor: colors.infoLight,
                                padding: spacing.md,
                                borderRadius: borderRadius.sm,
                                marginTop: spacing.base,
                            }}
                        >
                            <View style={{ flexDirection: 'row' }}>
                                <Ionicons name="information-circle" size={20} color={colors.info} />
                                <Text
                                    style={[
                                        typography.bodySmall,
                                        { color: colors.info, marginLeft: spacing.sm, flex: 1, lineHeight: 18 },
                                    ]}
                                >
                                    Payments go directly to your landlord. EstateNet only charges a small service cost for platform maintenance.
                                </Text>
                            </View>
                        </View>
                    </Card>
                </View>

                {/* Property Details */}
                <View style={{ marginBottom: spacing.lg }}>
                    <Text style={[typography.h3, { color: colors.text, marginBottom: spacing.md }]}>
                        Property Details
                    </Text>
                    <Card style={{ padding: spacing.base }}>
                        <DetailRow
                            icon="location"
                            label="Address"
                            value="Unit 101, Kololo Heights, Kampala"
                            colors={colors}
                            spacing={spacing}
                        />
                        <DetailRow
                            icon="calendar"
                            label="Lease Start"
                            value="Jan 1, 2024"
                            colors={colors}
                            spacing={spacing}
                        />
                        <DetailRow
                            icon="person"
                            label="Landlord"
                            value="John Malik"
                            colors={colors}
                            spacing={spacing}
                        />
                        <DetailRow
                            icon="call"
                            label="Contact"
                            value="555-0199"
                            colors={colors}
                            spacing={spacing}
                            isLast
                        />
                    </Card>
                </View>

                {/* Payment History */}
                <View style={{ marginBottom: spacing['2xl'] }}>
                    <View style={[styles.sectionHeader, { marginBottom: spacing.md }]}>
                        <Text style={[typography.h3, { color: colors.text }]}>Payment History</Text>
                        <TouchableOpacity onPress={() => setShowAllPaymentsModal(true)}>
                            <Text style={[typography.bodySmall, { color: colors.primary, fontWeight: '600' }]}>
                                View all
                            </Text>
                        </TouchableOpacity>
                    </View>

                    <Card noPadding>
                        <PaymentHistoryItem
                            month="December 2025"
                            amount="UGX 300,000"
                            date="Dec 15, 2025"
                            status="paid"
                            colors={colors}
                            spacing={spacing}
                        />
                        <View style={{ height: 1, backgroundColor: colors.divider, marginHorizontal: spacing.base }} />
                        <PaymentHistoryItem
                            month="November 2025"
                            amount="UGX 300,000"
                            date="Nov 20, 2025"
                            status="paid"
                            colors={colors}
                            spacing={spacing}
                        />
                        <View style={{ height: 1, backgroundColor: colors.divider, marginHorizontal: spacing.base }} />
                        <PaymentHistoryItem
                            month="October 2025"
                            amount="UGX 300,000"
                            date="Oct 18, 2025"
                            status="paid"
                            colors={colors}
                            spacing={spacing}
                        />
                    </Card>
                </View>

                {/* All Payments Modal */}
                <Modal
                    visible={showAllPaymentsModal}
                    onClose={() => setShowAllPaymentsModal(false)}
                    title="Payment History"
                    size="large"
                >
                    <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: spacing.lg }}>
                        {allPayments.map((payment, index) => (
                            <React.Fragment key={payment.id}>
                                <TouchableOpacity
                                    onPress={() => handlePaymentPress(payment)}
                                    activeOpacity={0.7}
                                    style={{
                                        flexDirection: 'row',
                                        padding: spacing.md,
                                        alignItems: 'center',
                                    }}
                                >
                                    <View
                                        style={{
                                            backgroundColor: colors.successLight,
                                            width: 44,
                                            height: 44,
                                            borderRadius: 22,
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            marginRight: spacing.md,
                                        }}
                                    >
                                        <Ionicons name="checkmark-circle" size={24} color={colors.success} />
                                    </View>
                                    <View style={{ flex: 1 }}>
                                        <Text style={[typography.body, { color: colors.text, fontWeight: '500' }]}>
                                            {payment.month}
                                        </Text>
                                        <Text style={[typography.bodySmall, { color: colors.textSecondary, marginTop: 2 }]}>
                                            {payment.date}
                                        </Text>
                                    </View>
                                    <View style={{ alignItems: 'flex-end' }}>
                                        <Text style={[typography.body, { color: colors.text, fontWeight: '600' }]}>
                                            UGX {payment.amount.toLocaleString()}
                                        </Text>
                                        <StatusBadge status={payment.status} size="small" style={{ marginTop: 4 }} />
                                    </View>
                                    <Ionicons name="chevron-forward" size={20} color={colors.textSecondary} style={{ marginLeft: spacing.sm }} />
                                </TouchableOpacity>
                                {index < allPayments.length - 1 && (
                                    <View style={{ height: 1, backgroundColor: colors.divider, marginHorizontal: spacing.md }} />
                                )}
                            </React.Fragment>
                        ))}
                    </ScrollView>
                </Modal>

                {/* Payment Details Modal */}
                <Modal
                    visible={showPaymentDetailsModal}
                    onClose={() => {
                        setShowPaymentDetailsModal(false);
                        setSelectedPayment(null);
                    }}
                    title="Payment Details"
                    size="medium"
                >
                    {selectedPayment && (
                        <View>
                            {/* Success Icon */}
                            <View style={{ alignItems: 'center', marginBottom: spacing.lg }}>
                                <View style={{
                                    width: 72,
                                    height: 72,
                                    borderRadius: 36,
                                    backgroundColor: colors.success + '20',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                }}>
                                    <Ionicons name="checkmark-circle" size={40} color={colors.success} />
                                </View>
                                <Text style={[typography.h2, { color: colors.text, marginTop: spacing.md }]}>
                                    UGX {selectedPayment.amount.toLocaleString()}
                                </Text>
                                <StatusBadge status={selectedPayment.status} size="medium" style={{ marginTop: spacing.sm }} />
                            </View>

                            {/* Details */}
                            <Card style={{ padding: spacing.lg }}>
                                <View style={{ marginBottom: spacing.md }}>
                                    <Text style={[typography.bodySmall, { color: colors.textSecondary }]}>Period</Text>
                                    <Text style={[typography.body, { color: colors.text, fontWeight: '600', marginTop: 2 }]}>
                                        {selectedPayment.month}
                                    </Text>
                                </View>
                                <View style={{ height: 1, backgroundColor: colors.divider, marginBottom: spacing.md }} />

                                <View style={{ marginBottom: spacing.md }}>
                                    <Text style={[typography.bodySmall, { color: colors.textSecondary }]}>Payment Date</Text>
                                    <Text style={[typography.body, { color: colors.text, fontWeight: '600', marginTop: 2 }]}>
                                        {selectedPayment.date}
                                    </Text>
                                </View>
                                <View style={{ height: 1, backgroundColor: colors.divider, marginBottom: spacing.md }} />

                                <View style={{ marginBottom: spacing.md }}>
                                    <Text style={[typography.bodySmall, { color: colors.textSecondary }]}>Payment Method</Text>
                                    <Text style={[typography.body, { color: colors.text, fontWeight: '600', marginTop: 2 }]}>
                                        {selectedPayment.paymentMethod}
                                    </Text>
                                </View>
                                <View style={{ height: 1, backgroundColor: colors.divider, marginBottom: spacing.md }} />

                                <View>
                                    <Text style={[typography.bodySmall, { color: colors.textSecondary }]}>Transaction ID</Text>
                                    <Text style={[typography.body, { color: colors.primary, fontWeight: '600', marginTop: 2 }]}>
                                        {selectedPayment.transactionId}
                                    </Text>
                                </View>
                            </Card>

                            <Button
                                title="Close"
                                onPress={() => {
                                    setShowPaymentDetailsModal(false);
                                    setSelectedPayment(null);
                                }}
                                variant="outline"
                                size="large"
                                style={{ marginTop: spacing.lg }}
                            />
                        </View>
                    )}
                </Modal>

                {/* Record Payment Claim Modal */}
                {activeLease && (
                    <RecordPaymentClaimModal
                        visible={showClaimModal}
                        onClose={() => setShowClaimModal(false)}
                        leaseId={activeLease.id}
                        monthlyRent={activeLease.rentAmount || 300000}
                        onClaimRecorded={handleClaimRecorded}
                    />
                )}
            </ScrollView>
        </SafeAreaView>
    );
};

// Detail Row Component
interface DetailRowProps {
    icon: any;
    label: string;
    value: string;
    colors: any;
    spacing: any;
    isLast?: boolean;
}

const DetailRow: React.FC<DetailRowProps> = ({ icon, label, value, colors, spacing, isLast }) => (
    <>
        <View
            style={{
                flexDirection: 'row',
                paddingVertical: spacing.md,
                alignItems: 'center',
            }}
        >
            <Ionicons name={icon} size={20} color={colors.textSecondary} />
            <View style={{ marginLeft: spacing.md, flex: 1 }}>
                <Text style={{ fontSize: 12, color: colors.textSecondary }}>{label}</Text>
                <Text style={{ fontSize: 14, color: colors.text, fontWeight: '500', marginTop: 2 }}>
                    {value}
                </Text>
            </View>
        </View>
        {!isLast && <View style={{ height: 1, backgroundColor: colors.divider }} />}
    </>
);

// Payment History Item Component
interface PaymentHistoryItemProps {
    month: string;
    amount: string;
    date: string;
    status: 'paid' | 'unpaid' | 'pending';
    colors: any;
    spacing: any;
}

const PaymentHistoryItem: React.FC<PaymentHistoryItemProps> = ({
    month,
    amount,
    date,
    status,
    colors,
    spacing,
}) => (
    <View style={{ flexDirection: 'row', padding: spacing.base, alignItems: 'center' }}>
        <View
            style={{
                backgroundColor: colors.successLight,
                width: 40,
                height: 40,
                borderRadius: 20,
                alignItems: 'center',
                justifyContent: 'center',
                marginRight: spacing.md,
            }}
        >
            <Ionicons name="checkmark-circle" size={24} color={colors.success} />
        </View>
        <View style={{ flex: 1 }}>
            <Text style={{ fontSize: 14, color: colors.text, fontWeight: '500' }}>{month}</Text>
            <Text style={{ fontSize: 12, color: colors.textSecondary, marginTop: 2 }}>{date}</Text>
        </View>
        <View style={{ alignItems: 'flex-end' }}>
            <Text style={{ fontSize: 14, color: colors.text, fontWeight: '600' }}>{amount}</Text>
            <StatusBadge status={status} size="small" style={{ marginTop: 4 }} />
        </View>
    </View>
);

const styles = StyleSheet.create({
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    profileButton: {
        alignItems: 'center',
        justifyContent: 'center',
    },
    rentHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
    },
    rentDetails: {
        flexDirection: 'row',
        justifyContent: 'space-between',
    },
    breakdownItem: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    sectionHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
});
