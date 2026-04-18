import React, { useState } from 'react';
import { RefreshControl } from 'react-native';
import { View, Text, ScrollView, FlatList, TouchableOpacity } from 'react-native';
import { Modal } from '../../components';
import { Button } from '../../components/Button';
import { useTheme } from '../../theme/ThemeContext';
import { Ionicons } from '@expo/vector-icons';
import { usePayments } from '../../context/PaymentContext';
import { useAuth } from '../../context/AuthContext';
import { useTenants } from '../../context/TenantContext';

interface PaymentHistoryModalProps {
    visible: boolean;
    onClose: () => void;
}

type TimeFilter = 'this_month' | 'last_3_months' | 'custom' | 'all';

export const PaymentHistoryModal: React.FC<PaymentHistoryModalProps> = ({ visible, onClose }) => {
    const { colors, spacing, typography, borderRadius } = useTheme();
    const [selectedFilter, setSelectedFilter] = useState<TimeFilter>('all');
    const [refreshing, setRefreshing] = useState(false);
    const { payments, loadPayments } = usePayments();
    const { user } = useAuth();
    const { getTenantByTenantId } = useTenants();

    const tenantPayments = user?.tenantId
        ? payments.filter(p => p.tenantId === user.tenantId)
        : [];
    // Fallback: also match by email for arbitrary tenant accounts
    const tenantPaymentsByEmail = user?.email
        ? payments.filter(p => {
            const paymentTenant = getTenantByTenantId(p.tenantId);
            return paymentTenant?.email === user.email;
        })
        : [];
    // Fallback: also match temporary tenant IDs for arbitrary accounts
    const tenantPaymentsByTempId = user?.email && !user?.tenantId
        ? payments.filter(p => p.tenantId.startsWith('TEMP-') && p.notes?.includes('Rent payment'))
        : [];

    // Merge all sources, dedupe by payment ID
    const allTenantPayments = [...tenantPayments, ...tenantPaymentsByEmail, ...tenantPaymentsByTempId].filter(
        (payment, index, arr) => arr.findIndex(p => p.id === payment.id) === index
    );

    const handleRefresh = async () => {
        setRefreshing(true);
        await loadPayments();
        setRefreshing(false);
    };

    const mapMethodLabel = (method: string) => {
        if (method === 'estatenet') return 'EstateNet';
        if (method === 'cash') return 'Cash Transfer';
        if (method === 'bank_transfer') return 'Bank Transfer';
        return method;
    };

    const allPayments = allTenantPayments.map(p => ({
        id: p.id,
        date: p.paymentDate,
        amount: p.amount,
        method: mapMethodLabel(p.paymentMethod),
        receiptNo: `EST-${new Date(p.paymentDate).toISOString().slice(0, 10).replace(/-/g, '')}-${p.id
            .slice(0, 4)
            .toUpperCase()}`,
    }));

    const filterPayments = () => {
        const now = new Date();

        switch (selectedFilter) {
            case 'this_month':
                return allPayments.filter(p => {
                    const paymentDate = new Date(p.date);
                    return paymentDate.getMonth() === now.getMonth() &&
                        paymentDate.getFullYear() === now.getFullYear();
                });
            case 'last_3_months':
                const threeMonthsAgo = new Date();
                threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - 3);
                return allPayments.filter(p => new Date(p.date) >= threeMonthsAgo);
            case 'all':
            default:
                return allPayments;
        }
    };

    const filteredPayments = filterPayments();
    const totalPaid = filteredPayments.reduce((sum, p) => sum + p.amount, 0);

    const formatDate = (dateString: string) => {
        const date = new Date(dateString);
        return date.toLocaleDateString('en-GB', {
            day: 'numeric',
            month: 'long',
            year: 'numeric'
        });
    };

    const formatAmount = (amount: number) => {
        return `UGX ${amount.toLocaleString()}`;
    };

    const FilterButton = ({ label, filter }: { label: string; filter: TimeFilter }) => (
        <TouchableOpacity
            onPress={() => setSelectedFilter(filter)}
            style={{
                paddingHorizontal: spacing.md,
                paddingVertical: spacing.sm,
                borderRadius: borderRadius.full,
                backgroundColor: selectedFilter === filter ? colors.primary : colors.surface,
                marginRight: spacing.sm,
            }}
        >
            <Text style={{
                color: selectedFilter === filter ? '#FFFFFF' : colors.text,
                fontSize: 14,
                fontWeight: '600',
            }}>
                {label}
            </Text>
        </TouchableOpacity>
    );

    return (
        <Modal visible={visible} onClose={onClose} title="Payment History" size="large">
            <View style={{ flex: 1 }}>
                {/* Summary */}
                <View style={{
                    backgroundColor: colors.primaryLight + '20',
                    padding: spacing.lg,
                    borderRadius: borderRadius.md,
                    marginBottom: spacing.lg,
                    borderLeftWidth: 4,
                    borderLeftColor: colors.primary,
                }}>
                    <Text style={[typography.bodySmall, { color: colors.textSecondary, marginBottom: spacing.xs }]}>
                        Total Paid ({filteredPayments.length} payment{filteredPayments.length !== 1 ? 's' : ''})
                    </Text>
                    <Text style={[typography.display, { color: colors.primary, fontSize: 36 }]}>
                        {formatAmount(totalPaid)}
                    </Text>
                </View>

                {/* Filters */}
                <View style={{ marginBottom: spacing.lg }}>
                    <Text style={[typography.h4, { color: colors.text, marginBottom: spacing.md }]}>
                        Filter by Period
                    </Text>
                    <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                        <FilterButton label="All Time" filter="all" />
                        <FilterButton label="This Month" filter="this_month" />
                        <FilterButton label="Last 3 Months" filter="last_3_months" />
                    </ScrollView>
                </View>

                {/* Payment List */}
                <FlatList
                    data={filteredPayments}
                    keyExtractor={(item) => item.id}
                    showsVerticalScrollIndicator={false}
                    contentContainerStyle={{ paddingBottom: spacing.lg }}
                    refreshControl={
                        <RefreshControl
                            refreshing={refreshing}
                            onRefresh={handleRefresh}
                            tintColor={colors.primary}
                            colors={[colors.primary]}
                        />
                    }
                    renderItem={({ item }) => (
                        <View style={{
                            backgroundColor: colors.surface,
                            padding: spacing.lg,
                            borderRadius: borderRadius.md,
                            marginBottom: spacing.md,
                            borderWidth: 1,
                            borderColor: colors.border,
                        }}>
                            {/* Date and Amount */}
                            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: spacing.md }}>
                                <View style={{ flex: 1 }}>
                                    <Text style={[typography.h4, { color: colors.text }]}>
                                        {formatAmount(item.amount)}
                                    </Text>
                                    <Text style={[typography.bodySmall, { color: colors.textSecondary, marginTop: 4 }]}>
                                        {formatDate(item.date)}
                                    </Text>
                                </View>
                                <View style={{
                                    backgroundColor: colors.success + '20',
                                    paddingHorizontal: spacing.md,
                                    paddingVertical: spacing.xs,
                                    borderRadius: borderRadius.full,
                                }}>
                                    <Text style={{
                                        color: colors.success,
                                        fontSize: 12,
                                        fontWeight: '700',
                                    }}>
                                        ✓ PAID
                                    </Text>
                                </View>
                            </View>

                            {/* Payment Method */}
                            <View style={{
                                flexDirection: 'row',
                                alignItems: 'center',
                                marginBottom: spacing.sm,
                            }}>
                                <Ionicons name="wallet" size={16} color={colors.textSecondary} />
                                <Text style={[typography.body, { color: colors.textSecondary, marginLeft: spacing.sm }]}>
                                    {item.method}
                                </Text>
                            </View>

                            {/* Receipt Number */}
                            <View style={{
                                flexDirection: 'row',
                                alignItems: 'center',
                                paddingTop: spacing.sm,
                                borderTopWidth: 1,
                                borderTopColor: colors.divider,
                            }}>
                                <Ionicons name="receipt" size={16} color={colors.textSecondary} />
                                <Text style={[typography.bodySmall, { color: colors.textSecondary, marginLeft: spacing.sm }]}>
                                    Receipt: <Text style={{ fontWeight: '600', color: colors.text }}>{item.receiptNo}</Text>
                                </Text>
                            </View>
                        </View>
                    )}
                    ListEmptyComponent={
                        <View style={{
                            backgroundColor: colors.surface,
                            padding: spacing.xl,
                            borderRadius: borderRadius.md,
                            alignItems: 'center',
                        }}>
                            <Ionicons name="document-text-outline" size={48} color={colors.textSecondary} />
                            <Text style={[typography.h4, { color: colors.text, marginTop: spacing.md, textAlign: 'center' }]}>
                                No Payments Found
                            </Text>
                            <Text style={[typography.body, { color: colors.textSecondary, marginTop: spacing.sm, textAlign: 'center' }]}>
                                No payments match the selected filter period.
                            </Text>
                        </View>
                    }
                />

                {/* Information Notice */}
                <View style={{
                    backgroundColor: colors.infoLight,
                    padding: spacing.md,
                    borderRadius: borderRadius.md,
                    flexDirection: 'row',
                    alignItems: 'center',
                }}>
                    <Ionicons name="information-circle" size={20} color={colors.info} style={{ marginRight: spacing.sm }} />
                    <Text style={[typography.bodySmall, { color: colors.info, flex: 1, lineHeight: 18 }]}>
                        All payments are permanently recorded and can be verified anytime.
                    </Text>
                </View>
            </View>
        </Modal>
    );
};
