import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, FlatList, Alert, RefreshControl, TouchableOpacity } from 'react-native';
import { useTheme } from '../../theme/ThemeContext';
import { useAuth } from '../../context/AuthContext';
import { apiGet, apiPost } from '../../utils/apiClient';
import { Button } from '../../components/Button';
import { Card } from '../../components/Card';
import { Input } from '../../components/Input';
import { Ionicons } from '@expo/vector-icons';
import { formatFullCurrency } from '../../utils/currencyFormatter';

interface PaymentClaim {
    id: string;
    amount: number;
    claimedPaidAt: string;
    method: string;
    referenceText?: string;
    status: 'PENDING' | 'VERIFIED' | 'REJECTED';
    tenant: {
        user: {
            firstName: string;
            lastName: string;
        };
    };
    lease: {
        property: {
            name: string;
        };
        unit: {
            unitNumber: string;
        };
    };
    verification?: {
        decision: 'VERIFY' | 'REJECT';
        note?: string;
        verifiedAt: string;
    };
    createdAt: string;
}

interface ManagerPaymentClaimsScreenProps {
    navigation: any;
}

export const ManagerPaymentClaimsScreen: React.FC<ManagerPaymentClaimsScreenProps> = ({ navigation }) => {
    const { colors, spacing, typography, borderRadius } = useTheme();
    const { user } = useAuth();

    // State
    const [claims, setClaims] = useState<PaymentClaim[]>([]);
    const [loading, setLoading] = useState(false);
    const [refreshing, setRefreshing] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [processingClaimId, setProcessingClaimId] = useState<string | null>(null);

    // Filters
    const [statusFilter, setStatusFilter] = useState<'ALL' | 'PENDING' | 'VERIFIED' | 'REJECTED'>('PENDING');

    const statusOptions = [
        { value: 'ALL', label: 'All Claims' },
        { value: 'PENDING', label: 'Pending Review' },
        { value: 'VERIFIED', label: 'Verified' },
        { value: 'REJECTED', label: 'Rejected' }
    ];

    useEffect(() => {
        loadClaims();
    }, [statusFilter]);

    const loadClaims = async (isRefresh = false) => {
        if (isRefresh) {
            setRefreshing(true);
        } else {
            setLoading(true);
        }
        setError(null);

        try {
            const params = statusFilter !== 'ALL' ? `?status=${statusFilter}` : '';
            const { status, json } = await apiGet(`/manager/payment-claims${params}`);

            if (status === 200 && json?.success) {
                setClaims(json.data || []);
            } else {
                setError(json?.message || 'Failed to load payment claims');
            }
        } catch (err) {
            console.error('Load payment claims error:', err);
            setError('Network error. Please try again.');
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    };

    const handleClaimDecision = async (claimId: string, decision: 'VERIFY' | 'REJECT', note?: string) => {
        setProcessingClaimId(claimId);
        setError(null);

        try {
            const { status, json } = await apiPost(`/manager/payment-claims/${claimId}/decision`, {
                decision,
                note: note?.trim() || undefined
            });

            if (status === 200 && json?.success) {
                Alert.alert(
                    'Success',
                    `Payment claim ${decision.toLowerCase()}ed successfully`,
                    [{ text: 'OK' }]
                );
                loadClaims(); // Refresh the list
            } else {
                setError(json?.message || `Failed to ${decision.toLowerCase()} payment claim`);
            }
        } catch (error) {
            console.error(`${decision} payment claim error:`, error);
            setError(`Network error. Please try again.`);
        } finally {
            setProcessingClaimId(null);
        }
    };

    const showDecisionDialog = (claim: PaymentClaim, decision: 'VERIFY' | 'REJECT') => {
        const actionText = decision === 'VERIFY' ? 'verify' : 'reject';
        const title = decision === 'VERIFY' ? 'Verify Payment Claim' : 'Reject Payment Claim';

        Alert.prompt(
            title,
            `${decision === 'VERIFY' ? 'Confirm verification of' : 'Reason for rejecting'} this payment claim for ${formatFullCurrency(claim.amount)}?\n\nTenant: ${claim.tenant.user.firstName} ${claim.tenant.user.lastName}\nProperty: ${claim.lease.property.name} - Unit ${claim.lease.unit.unitNumber}`,
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: decision === 'VERIFY' ? 'Verify' : 'Reject',
                    style: decision === 'VERIFY' ? 'default' : 'destructive',
                    onPress: (note?: string) => handleClaimDecision(claim.id, decision, note)
                }
            ],
            'plain-text',
            '',
            'default'
        );
    };

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'VERIFIED': return colors.success;
            case 'REJECTED': return colors.error;
            case 'PENDING': return colors.warning;
            default: return colors.textSecondary;
        }
    };

    const getStatusIcon = (status: string) => {
        switch (status) {
            case 'VERIFIED': return 'checkmark-circle';
            case 'REJECTED': return 'close-circle';
            case 'PENDING': return 'time';
            default: return 'help-circle';
        }
    };

    const renderClaimItem = ({ item }: { item: PaymentClaim }) => {
        const isProcessing = processingClaimId === item.id;

        return (
            <Card style={{ marginBottom: spacing.md }}>
                <View style={{ padding: spacing.md }}>
                    {/* Header with amount and status */}
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: spacing.sm }}>
                        <View style={{ flex: 1 }}>
                            <Text style={[typography.h3, { color: colors.text }]}>
                                {formatFullCurrency(item.amount)}
                            </Text>
                            <Text style={[typography.bodySmall, { color: colors.textSecondary }]}>
                                {item.tenant?.user?.firstName || 'Unknown'} {item.tenant?.user?.lastName || ''}
                            </Text>
                        </View>
                        <View style={{ alignItems: 'flex-end' }}>
                            <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 2 }}>
                                <Ionicons
                                    name={getStatusIcon(item.status) as any}
                                    size={16}
                                    color={getStatusColor(item.status)}
                                    style={{ marginRight: 4 }}
                                />
                                <Text style={[
                                    typography.bodySmall,
                                    { color: getStatusColor(item.status), fontWeight: '600' }
                                ]}>
                                    {item.status}
                                </Text>
                            </View>
                        </View>
                    </View>

                    {/* Property and claim details */}
                    <View style={{ marginBottom: spacing.sm }}>
                        <Text style={[typography.body, { color: colors.text, marginBottom: 2 }]}>
                            📍 {item.lease.property.name} - Unit {item.lease.unit.unitNumber}
                        </Text>
                        <Text style={[typography.bodySmall, { color: colors.textSecondary, marginBottom: 2 }]}>
                            💳 {item.method?.replace('_', ' ')} • {new Date(item.claimedPaidAt).toLocaleDateString()}
                        </Text>
                        {item.referenceText && (
                            <Text style={[typography.bodySmall, { color: colors.textSecondary, marginBottom: 2 }]}>
                                📝 {item.referenceText}
                            </Text>
                        )}
                        <Text style={[typography.bodySmall, { color: colors.textSecondary }]}>
                            📅 Submitted: {new Date(item.createdAt).toLocaleDateString()} {new Date(item.createdAt).toLocaleTimeString()}
                        </Text>
                    </View>

                    {/* Verification note if exists */}
                    {item.verification?.note && (
                        <View style={{
                            backgroundColor: colors.surface,
                            padding: spacing.sm,
                            borderRadius: borderRadius.md,
                            marginBottom: spacing.sm
                        }}>
                            <Text style={[typography.bodySmall, { color: colors.textSecondary, fontStyle: 'italic' }]}>
                                Note: {item.verification.note}
                            </Text>
                            <Text style={[typography.bodySmall, { color: colors.textSecondary, fontSize: 12, marginTop: 2 }]}>
                                {item.verification.decision}ed on {new Date(item.verification.verifiedAt).toLocaleDateString()}
                            </Text>
                        </View>
                    )}

                    {/* Action buttons for pending claims */}
                    {item.status === 'PENDING' && (
                        <View style={{ flexDirection: 'row', gap: spacing.sm, marginTop: spacing.sm }}>
                            <Button
                                title={isProcessing ? 'Processing...' : 'Reject'}
                                onPress={() => showDecisionDialog(item, 'REJECT')}
                                variant="outline"
                                style={{
                                    flex: 1,
                                    borderColor: colors.error,
                                }}
                                textStyle={{ color: colors.error }}
                                icon={<Ionicons name="close-circle-outline" size={16} color={colors.error} />}
                                iconPosition="left"
                                disabled={isProcessing}
                            />
                            <Button
                                title={isProcessing ? 'Processing...' : 'Verify'}
                                onPress={() => showDecisionDialog(item, 'VERIFY')}
                                variant="primary"
                                style={{
                                    flex: 1,
                                    backgroundColor: colors.success
                                }}
                                icon={<Ionicons name="checkmark-circle-outline" size={16} color="white" />}
                                iconPosition="left"
                                disabled={isProcessing}
                            />
                        </View>
                    )}
                </View>
            </Card>
        );
    };

    if (loading && !refreshing) {
        return (
            <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: colors.background }}>
                <Text style={[typography.body, { color: colors.text }]}>Loading payment claims...</Text>
            </View>
        );
    }

    return (
        <View style={{ flex: 1, backgroundColor: colors.background }}>
            <ScrollView
                style={{ flex: 1 }}
                refreshControl={
                    <RefreshControl
                        refreshing={refreshing}
                        onRefresh={() => loadClaims(true)}
                    />
                }
            >
                <View style={{ padding: spacing.lg }}>
                    {/* Header with Back Button */}
                    <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: spacing.lg }}>
                        <TouchableOpacity
                            onPress={() => navigation.goBack()}
                            style={{ marginRight: spacing.md }}
                        >
                            <Ionicons name="arrow-back" size={24} color={colors.text} />
                        </TouchableOpacity>
                        <Text style={[typography.h2, { color: colors.text }]}>
                            Payment Claims
                        </Text>
                    </View>

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

                    {/* Status Filter */}
                    <View style={{ marginBottom: spacing.lg }}>
                        <Text style={[typography.body, { color: colors.text, marginBottom: spacing.sm }]}>
                            Filter by Status:
                        </Text>
                        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                            <View style={{ flexDirection: 'row', gap: spacing.sm }}>
                                {statusOptions.map((option) => (
                                    <Button
                                        key={option.value}
                                        title={option.label}
                                        onPress={() => setStatusFilter(option.value as any)}
                                        variant={statusFilter === option.value ? 'primary' : 'outline'}
                                        style={{ minWidth: 100 }}
                                    />
                                ))}
                            </View>
                        </ScrollView>
                    </View>

                    {/* Claims List */}
                    {claims.length > 0 ? (
                        <FlatList
                            data={claims}
                            renderItem={renderClaimItem}
                            keyExtractor={(item) => item.id}
                            showsVerticalScrollIndicator={false}
                            scrollEnabled={false} // Disable inner scroll since we have outer ScrollView
                        />
                    ) : (
                        <Card>
                            <View style={{ padding: spacing.xl, alignItems: 'center' }}>
                                <Ionicons name="document-text-outline" size={64} color={colors.textSecondary} />
                                <Text style={[typography.h3, { color: colors.textSecondary, marginTop: spacing.md, textAlign: 'center' }]}>
                                    No {statusFilter.toLowerCase() === 'all' ? '' : statusFilter.toLowerCase() + ' '}payment claims
                                </Text>
                                <Text style={[typography.body, { color: colors.textSecondary, marginTop: spacing.sm, textAlign: 'center' }]}>
                                    {statusFilter === 'PENDING'
                                        ? 'No payment claims are waiting for your review.'
                                        : 'Try adjusting your filter or pull to refresh.'
                                    }
                                </Text>
                            </View>
                        </Card>
                    )}
                </View>
            </ScrollView>
        </View>
    );
};
