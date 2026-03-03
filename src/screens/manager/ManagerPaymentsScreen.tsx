import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, FlatList, Alert } from 'react-native';
import { useTheme } from '../../theme/ThemeContext';
import { apiGet } from '../../utils/apiClient';
import { Card } from '../../components/Card';
import { Button } from '../../components/Button';
import { Ionicons } from '@expo/vector-icons';

interface Payment {
    id: string;
    amount: number;
    paymentDate: string;
    dueDate: string;
    status: string;
    paymentMethod?: string;
    transactionId?: string;
    tenantIdentity?: {
        name: string;
        email: string;
    };
    property?: {
        name: string;
        location: string;
    };
    unit?: {
        unitNumber: string;
    };
    isClaim?: boolean; // Flag to indicate if this is from a verified claim
}

interface PaymentSummary {
    totalRent: number;
    totalPaid: number;
    totalOutstanding: number;
    occupancyRate: number;
    netIncome: number;
}

interface ManagerPaymentsScreenProps {
    navigation: any;
}

export const ManagerPaymentsScreen: React.FC<ManagerPaymentsScreenProps> = ({ navigation }) => {
    const { colors, spacing, typography, borderRadius } = useTheme();
    const [payments, setPayments] = useState<Payment[]>([]);
    const [summary, setSummary] = useState<PaymentSummary | null>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        setLoading(true);
        setError(null);

        try {
            // Load payments summary
            const { status: summaryStatus, json: summaryJson } = await apiGet('/payments/summary');
            if (summaryStatus === 200 && summaryJson?.success) {
                setSummary(summaryJson.data);
            }

            // Load recent payments
            const { status: paymentsStatus, json: paymentsJson } = await apiGet('/payments');
            const actualPayments = paymentsStatus === 200 && paymentsJson?.success ? (paymentsJson.data || []) : [];

            // Load verified payment claims
            const { status: claimsStatus, json: claimsJson } = await apiGet('/manager/payment-claims?status=VERIFIED');
            const verifiedClaims = claimsStatus === 200 && claimsJson?.success ? (claimsJson.data || []) : [];

            // Convert verified claims to payment format
            const claimPayments = verifiedClaims.map((claim: any) => ({
                id: claim.id,
                amount: claim.amount,
                paymentDate: claim.verification?.decidedAt || claim.createdAt,
                dueDate: claim.claimedPaidAt,
                status: 'VERIFIED',
                paymentMethod: claim.method,
                transactionId: claim.referenceText,
                tenantIdentity: claim.tenantIdentity,
                property: claim.lease?.property,
                unit: claim.lease?.unit,
                isClaim: true // Flag to indicate this is from a claim
            }));

            // Combine actual payments and verified claims
            const allPayments = [...actualPayments, ...claimPayments];
            // Sort by payment date (most recent first)
            allPayments.sort((a, b) => new Date(b.paymentDate).getTime() - new Date(a.paymentDate).getTime());
            setPayments(allPayments);
        } catch (err) {
            setError('Failed to load payments data');
        } finally {
            setLoading(false);
        }
    };

    const renderPaymentItem = ({ item }: { item: Payment }) => (
        <Card style={{ marginBottom: spacing.sm }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <View style={{ flex: 1 }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 2 }}>
                        <Text style={[typography.h4, { color: colors.text }]}>
                            UGX {item.amount.toLocaleString()}
                        </Text>
                        {item.isClaim && (
                            <View style={{
                                marginLeft: spacing.sm,
                                paddingHorizontal: spacing.sm,
                                paddingVertical: 2,
                                backgroundColor: colors.success,
                                borderRadius: borderRadius.sm
                            }}>
                                <Text style={[typography.caption, { color: '#fff' }]}>
                                    CLAIM
                                </Text>
                            </View>
                        )}
                    </View>
                    <Text style={[typography.body, { color: colors.textSecondary }]}>
                        {item.tenantIdentity?.name || 'Unknown Tenant'}
                    </Text>
                    {item.property && (
                        <Text style={[typography.bodySmall, { color: colors.textSecondary }]}>
                            {item.property.name} {item.unit && `- Unit ${item.unit.unitNumber}`}
                        </Text>
                    )}
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

    const renderSummaryCard = (title: string, value: string | number, icon: any, color: string) => (
        <Card style={{ flex: 1, marginHorizontal: spacing.xs }}>
            <View style={{ alignItems: 'center', padding: spacing.md }}>
                <Ionicons name={icon} size={24} color={color} />
                <Text style={[typography.bodySmall, { color: colors.textSecondary, marginTop: spacing.xs }]}>
                    {title}
                </Text>
                <Text style={[typography.h3, { color: colors.text, marginTop: spacing.xs }]}>
                    {typeof value === 'number' ? `UGX ${value.toLocaleString()}` : value}
                </Text>
            </View>
        </Card>
    );

    if (loading) {
        return (
            <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: colors.background }}>
                <Text style={[typography.body, { color: colors.textSecondary }]}>
                    Loading payments data...
                </Text>
            </View>
        );
    }

    if (error) {
        return (
            <ScrollView style={{ flex: 1, backgroundColor: colors.background }} contentContainerStyle={{ padding: spacing.lg }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: spacing.lg }}>
                    <Button
                        title=""
                        onPress={() => navigation.goBack()}
                        variant="outline"
                        size="small"
                        style={{ marginRight: spacing.sm, paddingHorizontal: spacing.sm }}
                        icon={<Ionicons name="arrow-back" size={20} color={colors.primary} />}
                    />
                    <Text style={[typography.h2, { color: colors.text }]}>Payments</Text>
                </View>

                <Card style={{ alignItems: 'center', padding: spacing.xl }}>
                    <Ionicons name="alert-circle-outline" size={48} color={colors.error} />
                    <Text style={[typography.body, { color: colors.error, marginTop: spacing.sm, textAlign: 'center' }]}>
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
            </ScrollView>
        );
    }

    return (
        <ScrollView style={{ flex: 1, backgroundColor: colors.background }} contentContainerStyle={{ padding: spacing.lg }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: spacing.lg }}>
                <Button
                    title=""
                    onPress={() => navigation.goBack()}
                    variant="outline"
                    size="small"
                    style={{ marginRight: spacing.sm, paddingHorizontal: spacing.sm }}
                    icon={<Ionicons name="arrow-back" size={20} color={colors.primary} />}
                />
                <Text style={[typography.h2, { color: colors.text }]}>Payments</Text>
            </View>

            {/* Summary Cards */}
            {summary && (
                <View style={{ marginBottom: spacing.lg }}>
                    <Text style={[typography.h3, { color: colors.text, marginBottom: spacing.md }]}>Summary</Text>
                    <View style={{ flexDirection: 'row', marginBottom: spacing.md }}>
                        {renderSummaryCard('Total Rent', summary.totalRent, 'home-outline' as any, colors.primary)}
                        {renderSummaryCard('Total Paid', summary.totalPaid, 'checkmark-circle-outline' as any, colors.success)}
                    </View>
                    <View style={{ flexDirection: 'row' }}>
                        {renderSummaryCard('Outstanding', summary.totalOutstanding, 'alert-circle-outline' as any, colors.error)}
                        {renderSummaryCard('Occupancy', `${summary.occupancyRate}%`, 'bar-chart-outline' as any, colors.info)}
                    </View>
                </View>
            )}

            {/* Recent Payments */}
            <View>
                <Text style={[typography.h3, { color: colors.text, marginBottom: spacing.md }]}>
                    Recent Payments
                </Text>
                {payments.length === 0 ? (
                    <Card style={{ alignItems: 'center', padding: spacing.xl }}>
                        <Ionicons name="receipt-outline" size={64} color={colors.textSecondary} />
                        <Text style={[typography.h3, { color: colors.text, marginTop: spacing.lg }]}>
                            No Payments Yet
                        </Text>
                        <Text style={[typography.body, { color: colors.textSecondary, marginTop: spacing.sm, textAlign: 'center' }]}>
                            Payment records will appear here once tenants start recording payments.
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
            </View>
        </ScrollView>
    );
};
