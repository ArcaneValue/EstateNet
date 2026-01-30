import React, { useState } from 'react';
import { View, Text, ScrollView, FlatList, TextInput } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '../../theme/ThemeContext';
import { useAuth } from '../../context/AuthContext';
import { usePayments } from '../../context/PaymentContext';
import { useLease } from '../../context/LeaseContext';
import { Card } from '../../components/Card';
import { Button } from '../../components/Button';
import { Ionicons } from '@expo/vector-icons';
import { MakePaymentModal } from './MakePaymentModal';
import { PaymentHistoryModal } from './PaymentHistoryModal';

interface PaymentsScreenProps {
    navigation: any;
}

export const PaymentsScreen: React.FC<PaymentsScreenProps> = ({ navigation }) => {
    const { colors, spacing, typography, borderRadius } = useTheme();
    const { user } = useAuth();
    const { payments, paymentsLoading, paymentsError, rentStatus, rentStatusLoading, rentStatusError } = usePayments();
    const { activeLease, leaseLoading } = useLease();

    const [showMakePaymentModal, setShowMakePaymentModal] = useState(false);
    const [showHistoryModal, setShowHistoryModal] = useState(false);

    const hasMonthlyRent = typeof activeLease?.rentAmount === 'number';
    const monthlyRent = hasMonthlyRent ? (activeLease.rentAmount as number) : 0;

    const allTenantPayments = user?.tenantId
        ? payments.filter(p => p.tenantId === user.tenantId)
        : [];

    const sortedTenantPayments = [...allTenantPayments].sort(
        (a, b) => new Date(b.paymentDate).getTime() - new Date(a.paymentDate).getTime()
    );

    const hasRentStatus = !!rentStatus && rentStatus.status !== 'NO_LEASE';
    const periodDue = hasRentStatus ? rentStatus.amountDueForPeriod : 0;
    const periodPaid = hasRentStatus ? rentStatus.totalPaidForPeriod : 0;
    const outstandingThisPeriod = Math.max(0, periodDue - periodPaid);
    const pastArrears = hasRentStatus ? rentStatus.arrearsTotal : 0;
    const totalOutstanding = outstandingThisPeriod + pastArrears;
    const billingPeriodLabel = hasRentStatus && rentStatus.dueDate
        ? new Date(rentStatus.dueDate).toLocaleDateString('en-GB', { month: 'long', year: 'numeric' })
        : undefined;

    const mapMethodLabel = (method: string) => {
        if (method === 'estatenet') return 'EstateNet';
        if (method === 'cash') return 'Cash Transfer';
        if (method === 'bank_transfer') return 'Bank Transfer';
        return method;
    };

    const formatDate = (dateString: string) => {
        const date = new Date(dateString);
        return date.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
    };

    const formatAmount = (amount: number) => {
        return `UGX ${amount.toLocaleString()}`;
    };

    type RecentPayment = {
        id: string;
        date: string;
        amount: number;
        method: string;
        receiptNo: string;
    };

    const recentPayments: RecentPayment[] = sortedTenantPayments.slice(0, 3).map((p) => ({
        id: p.id,
        date: p.paymentDate,
        amount: p.amount,
        method: mapMethodLabel(p.paymentMethod),
        receiptNo: `EST-${new Date(p.paymentDate).toISOString().slice(0, 10).replace(/-/g, '')}-${p.id
            .slice(0, 4)
            .toUpperCase()}`,
    }));

    if (leaseLoading || paymentsLoading || rentStatusLoading) {
        return (
            <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }}>
                <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', padding: spacing.base }}>
                    <Text style={[typography.body, { color: colors.text }]}>Loading...</Text>
                </View>
            </SafeAreaView>
        );
    }

    return (
        <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }}>
            <ScrollView contentContainerStyle={{ padding: spacing.base, paddingBottom: spacing.xl }}>
                {/* Header */}
                <View style={{ marginBottom: spacing.xl }}>
                    <Text style={[typography.h2, { color: colors.text }]}>
                        Payments
                    </Text>
                    <Text style={[typography.body, { color: colors.textSecondary, marginTop: spacing.xs }]}>
                        Manage your rent payments
                    </Text>
                </View>

                {(paymentsError || rentStatusError) && (
                    <View style={{ marginBottom: spacing.sm }}>
                        <Text style={[typography.bodySmall, { color: colors.error }]}>
                            {paymentsError || rentStatusError}
                        </Text>
                    </View>
                )}

                {activeLease ? (
                    <>
                        {/* Outstanding Balance Summary - uses backend rent status */}
                        <Card style={{
                            marginBottom: spacing.lg,
                            padding: spacing.lg,
                            borderWidth: 1,
                            borderColor: colors.border,
                        }}>
                            {hasRentStatus ? (
                                <>
                                    <View style={{ flexDirection: 'row', alignItems: 'flex-start', marginBottom: spacing.md }}>
                                        <View style={{
                                            backgroundColor: colors.primary + '20',
                                            width: 48,
                                            height: 48,
                                            borderRadius: 24,
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            marginRight: spacing.md,
                                        }}>
                                            <Ionicons name="information-circle" size={28} color={colors.primary} />
                                        </View>
                                        <View style={{ flex: 1 }}>
                                            <Text style={[typography.h4, { color: colors.text }]}>
                                                Outstanding Balance
                                            </Text>
                                            <Text style={[typography.bodySmall, { color: colors.textSecondary, marginTop: 4 }]}>
                                                Includes this billing period and any past arrears
                                            </Text>
                                        </View>
                                    </View>
                                    <View style={{
                                        backgroundColor: colors.surface,
                                        padding: spacing.md,
                                        borderRadius: borderRadius.md,
                                    }}>
                                        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                                            <View>
                                                <Text style={[typography.bodySmall, { color: colors.textSecondary }]}>
                                                    Billing Period
                                                </Text>
                                                <Text style={[typography.body, { color: colors.text, marginTop: spacing.xs }]}>
                                                    {billingPeriodLabel || rentStatus.billingPeriod}
                                                </Text>
                                            </View>
                                            <View>
                                                <Text style={[typography.bodySmall, { color: colors.textSecondary }]}>
                                                    Total Outstanding
                                                </Text>
                                                <Text style={[typography.h3, { color: colors.text, fontWeight: '700', marginTop: spacing.xs }]}>
                                                    {formatAmount(totalOutstanding)}
                                                </Text>
                                            </View>
                                        </View>
                                        <View style={{ flexDirection: 'row', marginTop: spacing.md }}>
                                            <View style={{ flex: 1 }}>
                                                <Text style={[typography.bodySmall, { color: colors.textSecondary }]}>
                                                    This Period
                                                </Text>
                                                <Text style={[typography.body, { color: colors.text, marginTop: 2 }]}>
                                                    {formatAmount(outstandingThisPeriod)}
                                                </Text>
                                            </View>
                                            <View style={{ flex: 1 }}>
                                                <Text style={[typography.bodySmall, { color: colors.textSecondary }]}>
                                                    Past Arrears
                                                </Text>
                                                <Text style={[typography.body, { color: pastArrears > 0 ? colors.error : colors.text, marginTop: 2 }]}>
                                                    {formatAmount(pastArrears)}
                                                </Text>
                                            </View>
                                        </View>
                                    </View>
                                </>
                            ) : (
                                <View style={{ flexDirection: 'row', alignItems: 'flex-start' }}>
                                    <View style={{
                                        backgroundColor: colors.primary + '20',
                                        width: 48,
                                        height: 48,
                                        borderRadius: 24,
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        marginRight: spacing.md,
                                    }}>
                                        <Ionicons name="information-circle" size={28} color={colors.primary} />
                                    </View>
                                    <View style={{ flex: 1 }}>
                                        <Text style={[typography.h4, { color: colors.text }]}>
                                            Unable to load outstanding balance
                                        </Text>
                                        <Text style={[typography.bodySmall, { color: colors.textSecondary, marginTop: 4 }]}>
                                            Please try again later.
                                        </Text>
                                    </View>
                                </View>
                            )}
                        </Card>

                        {/* Upcoming Payment Card - uses only monthly rent, no assumed due date */}
                        <Card style={{
                            marginBottom: spacing.lg,
                            padding: spacing.lg,
                            borderWidth: 1,
                            borderColor: colors.border,
                        }}>
                            <View style={{ flexDirection: 'row', alignItems: 'flex-start', marginBottom: spacing.md }}>
                                <View style={{
                                    backgroundColor: colors.primary + '20',
                                    width: 48,
                                    height: 48,
                                    borderRadius: 24,
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    marginRight: spacing.md,
                                }}>
                                    <Ionicons name="calendar" size={24} color={colors.primary} />
                                </View>
                                <View style={{ flex: 1 }}>
                                    <Text style={[typography.h4, { color: colors.text }]}>
                                        Upcoming Rent Payment
                                    </Text>
                                    <Text style={[typography.bodySmall, { color: colors.textSecondary, marginTop: 4 }]}>
                                        Monthly rent amount
                                    </Text>
                                </View>
                            </View>
                            <View style={{
                                backgroundColor: colors.surface,
                                padding: spacing.md,
                                borderRadius: borderRadius.md,
                            }}>
                                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                                    <View>
                                        <Text style={[typography.bodySmall, { color: colors.textSecondary, marginBottom: spacing.xs }]}>
                                            Monthly Rent
                                        </Text>
                                        <Text style={[typography.h3, { color: colors.text, fontWeight: '700' }]}>
                                            {hasMonthlyRent ? formatAmount(monthlyRent) : '—'}
                                        </Text>
                                    </View>
                                </View>
                            </View>
                        </Card>

                        {/* Quick Action - Make Payment */}
                        <Button
                            title="Make Payment"
                            onPress={() => setShowMakePaymentModal(true)}
                            variant="outline"
                            size="large"
                            style={{ marginBottom: spacing.lg }}
                            icon={<Ionicons name="card-outline" size={20} color={colors.primary} />}
                        />
                    </>
                ) : (
                    <Card style={{
                        marginBottom: spacing.lg,
                        padding: spacing.lg,
                        borderWidth: 1,
                        borderColor: colors.border,
                        backgroundColor: colors.surface,
                    }}>
                        <View style={{ flexDirection: 'row', alignItems: 'flex-start' }}>
                            <View style={{
                                backgroundColor: colors.primary + '20',
                                width: 40,
                                height: 40,
                                borderRadius: 20,
                                alignItems: 'center',
                                justifyContent: 'center',
                                marginRight: spacing.md,
                            }}>
                                <Ionicons name="information-circle" size={22} color={colors.primary} />
                            </View>
                            <View style={{ flex: 1 }}>
                                <Text style={[typography.h4, { color: colors.text }]}>
                                    No active lease
                                </Text>
                                <Text style={[typography.body, { color: colors.textSecondary, marginTop: spacing.xs }]}>
                                    Accept a property invitation to see your rent summary and make payments directly from EstateNet.
                                </Text>
                            </View>
                        </View>
                    </Card>
                )}

                {/* Payment History Section */}
                <View style={{ marginBottom: spacing.lg }}>
                    <View style={{
                        flexDirection: 'row',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        marginBottom: spacing.md,
                    }}>
                        <Text style={[typography.h3, { color: colors.text }]}>
                            Recent Payments
                        </Text>
                        <Button
                            title="View All"
                            onPress={() => setShowHistoryModal(true)}
                            variant="ghost"
                            size="small"
                        />
                    </View>

                    <Card style={{ padding: 0, overflow: 'hidden' }}>
                        {recentPayments.map((payment, index) => (
                            <View key={payment.id}>
                                <View style={{ padding: spacing.lg }}>
                                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                                        <View style={{ flex: 1 }}>
                                            <Text style={[typography.h4, { color: colors.text }]}>
                                                {formatAmount(payment.amount)}
                                            </Text>
                                            <Text style={[typography.bodySmall, { color: colors.textSecondary, marginTop: 4 }]}>
                                                {formatDate(payment.date)}
                                            </Text>
                                            <View style={{
                                                flexDirection: 'row',
                                                alignItems: 'center',
                                                marginTop: spacing.sm,
                                            }}>
                                                <Ionicons name="wallet" size={14} color={colors.textSecondary} />
                                                <Text style={[typography.bodySmall, { color: colors.textSecondary, marginLeft: spacing.xs }]}>
                                                    {payment.method}
                                                </Text>
                                            </View>
                                        </View>
                                        <View style={{ alignItems: 'flex-end' }}>
                                            <View style={{
                                                backgroundColor: colors.success + '20',
                                                paddingHorizontal: spacing.md,
                                                paddingVertical: spacing.xs,
                                                borderRadius: borderRadius.full,
                                            }}>
                                                <Text style={{
                                                    color: colors.success,
                                                    fontSize: 12,
                                                    fontWeight: '600',
                                                }}>
                                                    ✓ PAID
                                                </Text>
                                            </View>
                                            <Text style={[typography.bodySmall, { color: colors.textSecondary, marginTop: spacing.sm }]}>
                                                {payment.receiptNo}
                                            </Text>
                                        </View>
                                    </View>
                                </View>
                                {index < recentPayments.length - 1 && (
                                    <View style={{ height: 1, backgroundColor: colors.divider }} />
                                )}
                            </View>
                        ))}
                    </Card>
                </View>

                {/* Information Notice */}
                <View style={{
                    backgroundColor: colors.infoLight,
                    padding: spacing.lg,
                    borderRadius: borderRadius.md,
                    borderLeftWidth: 4,
                    borderLeftColor: colors.info,
                }}>
                    <View style={{ flexDirection: 'row', alignItems: 'flex-start' }}>
                        <Ionicons name="information-circle" size={24} color={colors.info} style={{ marginRight: spacing.md }} />
                        <View style={{ flex: 1 }}>
                            <Text style={[typography.h4, { color: colors.info, marginBottom: spacing.xs }]}>
                                Payment Proof
                            </Text>
                            <Text style={[typography.body, { color: colors.info, lineHeight: 20 }]}>
                                All your payments are recorded and can be verified anytime. Keep your receipt numbers for reference.
                            </Text>
                        </View>
                    </View>
                </View>
            </ScrollView>

            {/* Modals */}
            <MakePaymentModal
                visible={showMakePaymentModal}
                onClose={() => setShowMakePaymentModal(false)}
                monthlyRent={monthlyRent}
            />
            <PaymentHistoryModal
                visible={showHistoryModal}
                onClose={() => setShowHistoryModal(false)}
            />
        </SafeAreaView>
    );
};
