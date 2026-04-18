import React, { useState, useEffect } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import { View, Text, FlatList, RefreshControl } from 'react-native';
import { useTheme } from '../../theme/ThemeContext';
import { apiGet } from '../../utils/apiClient';
import { Card } from '../../components/Card';
import { PageHeader } from '../../components/PageHeader';
import { Ionicons } from '@expo/vector-icons';
import { formatCompactCurrencyUGX } from '../../utils/formatters';

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
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const fetchPayments = async () => {
        if (refreshing) {
            setRefreshing(true);
        } else {
            setLoading(true);
        }
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
            setRefreshing(false);
        }
    };

    // Load payments on mount
    useEffect(() => {
        fetchPayments();
    }, []);

    // Auto-refresh when screen comes into focus
    useFocusEffect(
        React.useCallback(() => {
            fetchPayments();
        }, [])
    );

    const renderPaymentItem = ({ item }: { item: Payment }) => (
        <Card style={{ marginHorizontal: spacing.lg, marginBottom: spacing.md }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', padding: spacing.md }}>
                <View style={{ flex: 1 }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 2 }}>
                        <Text style={[typography.h3, { color: colors.text }]}>
                            {formatCompactCurrencyUGX(item.amount)}
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
                        {new Date(item.paymentDate).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}
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

    const renderSummaryCard = (title: string, value: string, icon: any, color: string) => (
        <View style={{ flex: 1 }}>
            <Card>
                <View style={{ alignItems: 'center', padding: spacing.lg }}>
                    <Ionicons name={icon} size={32} color={color} style={{ marginBottom: spacing.sm }} />
                    <Text style={[typography.bodySmall, { color: colors.textSecondary, marginBottom: spacing.xs, textAlign: 'center' }]}>
                        {title}
                    </Text>
                    <Text style={[typography.h3, { color: colors.text, textAlign: 'center' }]}>
                        {value}
                    </Text>
                </View>
            </Card>
        </View>
    );

    const renderHeader = () => (
        <View style={{ paddingHorizontal: spacing.lg, paddingTop: spacing.md }}>
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

            {/* Summary Section */}
            {summary && (
                <View style={{ marginBottom: spacing.lg }}>
                    <Text style={[typography.h3, { color: colors.text, marginBottom: spacing.md }]}>Summary</Text>
                    <View style={{ flexDirection: 'row', gap: spacing.md, marginBottom: spacing.md }}>
                        {renderSummaryCard('Total Rent', formatCompactCurrencyUGX(summary.totalRent), 'home-outline' as any, colors.primary)}
                        {renderSummaryCard('Total Paid', formatCompactCurrencyUGX(summary.totalPaid), 'checkmark-circle-outline' as any, colors.success)}
                    </View>
                    <View style={{ flexDirection: 'row', gap: spacing.md }}>
                        {renderSummaryCard('Outstanding', formatCompactCurrencyUGX(Math.max(0, summary.totalOutstanding)), 'alert-circle-outline' as any, colors.error)}
                        {renderSummaryCard('Occupancy', `${summary.occupancyRate}%`, 'bar-chart-outline' as any, colors.info)}
                    </View>
                </View>
            )}

            {/* Section Title */}
            <Text style={[typography.h3, { color: colors.text, marginBottom: spacing.md }]}>
                Recent Payments
            </Text>
        </View>
    );

    const renderEmpty = () => (
        <View style={{ paddingHorizontal: spacing.lg, paddingTop: spacing.xl }}>
            <Card>
                <View style={{ padding: spacing.xl, alignItems: 'center' }}>
                    <Ionicons name="receipt-outline" size={64} color={colors.textSecondary} />
                    <Text style={[typography.h3, { color: colors.textSecondary, marginTop: spacing.md, textAlign: 'center' }]}>
                        No Payments Yet
                    </Text>
                    <Text style={[typography.body, { color: colors.textSecondary, marginTop: spacing.sm, textAlign: 'center' }]}>
                        Payment records will appear here once tenants start recording payments.
                    </Text>
                </View>
            </Card>
        </View>
    );

    if (loading && !refreshing) {
        return (
            <View style={{ flex: 1, backgroundColor: colors.background }}>
                <PageHeader title="Payments" onBack={() => navigation.goBack()} />
                <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
                    <Text style={[typography.body, { color: colors.text }]}>Loading payments...</Text>
                </View>
            </View>
        );
    }

    return (
        <View style={{ flex: 1, backgroundColor: colors.background }}>
            <PageHeader title="Payments" onBack={() => navigation.goBack()} />

            <FlatList
                data={payments}
                renderItem={renderPaymentItem}
                keyExtractor={(item) => item.id}
                ListHeaderComponent={renderHeader}
                ListEmptyComponent={renderEmpty}
                contentContainerStyle={{ paddingBottom: spacing.lg }}
                refreshControl={
                    <RefreshControl
                        refreshing={refreshing}
                        onRefresh={() => fetchPayments()}
                    />
                }
            />
        </View>
    );
};
