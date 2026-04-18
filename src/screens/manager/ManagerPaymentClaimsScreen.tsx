import React, { useState, useEffect } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import { View, Text, FlatList, RefreshControl, Alert } from 'react-native';
import { useTheme } from '../../theme/ThemeContext';
import { useAuth } from '../../context/AuthContext';
import { useTutorial, TUTORIAL_KEYS } from '../../context/TutorialContext';
import { apiGet, apiPost } from '../../utils/apiClient';
import { Button } from '../../components/Button';
import { Card } from '../../components/Card';
import { Input } from '../../components/Input';
import { Modal } from '../../components/Modal';
import { PageHeader } from '../../components/PageHeader';
import { FilterChips } from '../../components/FilterChips';
import { Ionicons } from '@expo/vector-icons';
import { formatFullCurrency } from '../../utils/currencyFormatter';
import { TutorialModal } from '../../components/TutorialModal';

interface PaymentClaim {
    id: string;
    amount: number;
    claimedPaidAt: string;
    method: string;
    referenceText?: string;
    status: 'PENDING' | 'VERIFIED' | 'REJECTED';
    tenantIdentity: {
        name: string;
        email: string;
        phoneNumber: string;
    };
    lease: {
        property: {
            name: string;
            location?: string;
        };
        unit: {
            unitNumber: string;
        };
    };
    createdAt: string;
    respondedAt?: string;
    verification?: {
        decision: 'VERIFIED' | 'REJECTED';
        note?: string;
        decidedAt: string;
    };
}

interface ManagerPaymentClaimsScreenProps {
    navigation: any;
}

export const ManagerPaymentClaimsScreen: React.FC<ManagerPaymentClaimsScreenProps> = ({ navigation }) => {
    const { colors, spacing, typography, borderRadius } = useTheme();
    const { user } = useAuth();

    // State
    const [claims, setClaims] = useState<PaymentClaim[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [processingClaimId, setProcessingClaimId] = useState<string | null>(null);
    const [statusFilter, setStatusFilter] = useState<'ALL' | 'PENDING' | 'VERIFIED' | 'REJECTED'>('PENDING');
    const [decisionDialog, setDecisionDialog] = useState<{
        visible: boolean;
        claim: PaymentClaim | null;
        decision: 'VERIFY' | 'REJECT' | null;
        note: string;
    }>({ visible: false, claim: null, decision: null, note: '' });
    const [showTutorial, setShowTutorial] = useState(false);

    // Tutorial
    const { shouldShowTutorial, markTutorialSeen } = useTutorial();

    const statusOptions = [
        { value: 'ALL', label: 'All' },
        { value: 'PENDING', label: 'Pending' },
        { value: 'VERIFIED', label: 'Verified' },
        { value: 'REJECTED', label: 'Rejected' }
    ];

    useEffect(() => {
        console.log('statusFilter changed:', statusFilter);
        loadClaims();
    }, [statusFilter]);

    useEffect(() => {
        checkTutorial();
    }, []);

    // Load claims on mount
    useEffect(() => {
        loadClaims();
    }, []);

    // Auto-refresh when screen comes into focus
    useFocusEffect(
        React.useCallback(() => {
            loadClaims();
        }, [])
    );

    const checkTutorial = async () => {
        const shouldShow = await shouldShowTutorial(TUTORIAL_KEYS.MANAGER_PAYMENT_CLAIMS);
        if (shouldShow) {
            setTimeout(() => setShowTutorial(true), 500);
        }
    };

    const handleTutorialClose = async () => {
        await markTutorialSeen(TUTORIAL_KEYS.MANAGER_PAYMENT_CLAIMS);
        setShowTutorial(false);
    };

    const loadClaims = async (isRefresh = false) => {
        console.log('loadClaims called with isRefresh:', isRefresh);
        if (isRefresh) {
            setRefreshing(true);
        } else {
            setLoading(true);
        }
        setError(null);

        try {
            const params = statusFilter !== 'ALL' ? `?status=${statusFilter}` : '';
            const { status, json } = await apiGet(`/manager/payment-claims${params}`);

            if (status >= 200 && status < 300 && json?.success) {
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
        console.log('Processing claim:', claimId, 'Decision:', decision);
        setProcessingClaimId(claimId);
        setError(null);

        try {
            const requestBody: any = {
                decision: decision === 'VERIFY' ? 'VERIFIED' : 'REJECTED'
            };

            if (note && note.trim()) {
                requestBody.note = note.trim();
            }
            console.log('Sending verify request:', requestBody);

            const { status, json } = await apiPost(`/manager/payment-claims/${claimId}/verify`, requestBody);

            console.log('Verify response:', { status, json });

            if (status === 200 && json?.success) {
                Alert.alert(
                    'Success',
                    `Payment claim ${decision.toLowerCase()}ed successfully`,
                    [{ text: 'OK' }]
                );
                loadClaims(); // Refresh the list
            } else {
                const errorMessage = json?.message || `Failed to ${decision.toLowerCase()} payment claim`;
                console.error('Verification failed:', errorMessage);
                setError(errorMessage);
                Alert.alert('Error', errorMessage, [{ text: 'OK' }]);
            }
        } catch (error) {
            console.error(`${decision} payment claim error:`, error);
            const errorMessage = `Network error. Please try again.`;
            setError(errorMessage);
            Alert.alert('Error', errorMessage, [{ text: 'OK' }]);
        } finally {
            setProcessingClaimId(null);
        }
    };

    const showDecisionDialog = (claim: PaymentClaim, decision: 'VERIFY' | 'REJECT') => {
        setDecisionDialog({
            visible: true,
            claim,
            decision,
            note: ''
        });
    };

    const handleDecisionConfirm = async () => {
        if (!decisionDialog.claim || !decisionDialog.decision) return;

        await handleClaimDecision(
            decisionDialog.claim.id,
            decisionDialog.decision,
            decisionDialog.decision === 'REJECT' ? decisionDialog.note : undefined
        );

        setDecisionDialog({ visible: false, claim: null, decision: null, note: '' });
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
            <Card style={{ marginHorizontal: spacing.lg, marginBottom: spacing.md }}>
                <View style={{ padding: spacing.md }}>
                    {/* Header with amount and status */}
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: spacing.sm }}>
                        <View style={{ flex: 1 }}>
                            <Text style={[typography.h3, { color: colors.text }]}>
                                {formatFullCurrency(item.amount)}
                            </Text>
                            <Text style={[typography.bodySmall, { color: colors.textSecondary }]}>
                                {item.tenantIdentity?.name || 'Unknown Tenant'}
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
                                {item.verification.decision}ed on {new Date(item.verification.decidedAt).toLocaleDateString()}
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

            {/* Status Filter */}
            <View style={{ marginBottom: spacing.lg }}>
                <Text style={[typography.h3, { color: colors.text, marginBottom: spacing.sm }]}>
                    Filter by Status
                </Text>
                <FilterChips
                    options={statusOptions}
                    selectedValue={statusFilter}
                    onSelect={(value) => setStatusFilter(value as any || 'ALL')}
                    allowClear={false}
                />
            </View>
        </View>
    );

    const renderEmpty = () => (
        <View style={{ paddingHorizontal: spacing.lg, paddingTop: spacing.xl }}>
            <Card>
                <View style={{ padding: spacing.xl, alignItems: 'center' }}>
                    <Ionicons name="document-text-outline" size={64} color={colors.textSecondary} />
                    <Text style={[typography.h3, { color: colors.textSecondary, marginTop: spacing.md, textAlign: 'center' }]}>
                        No {statusFilter.toLowerCase() === 'all' ? '' : statusFilter.toLowerCase() + ' '}claims
                    </Text>
                    <Text style={[typography.body, { color: colors.textSecondary, marginTop: spacing.sm, textAlign: 'center' }]}>
                        {statusFilter === 'PENDING'
                            ? 'No payment claims are waiting for your review.'
                            : 'Try adjusting your filter or pull to refresh.'
                        }
                    </Text>
                </View>
            </Card>
        </View>
    );

    if (loading && !refreshing) {
        return (
            <View style={{ flex: 1, backgroundColor: colors.background }}>
                <PageHeader title="Payment claims" onBack={() => navigation.goBack()} />
                <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
                    <Text style={[typography.body, { color: colors.text }]}>Loading payment claims...</Text>
                </View>
            </View>
        );
    }

    return (
        <View style={{ flex: 1, backgroundColor: colors.background }}>
            <PageHeader title="Payment claims" onBack={() => navigation.goBack()} />

            <FlatList
                data={claims}
                renderItem={renderClaimItem}
                keyExtractor={(item) => item.id}
                ListHeaderComponent={renderHeader}
                ListEmptyComponent={renderEmpty}
                contentContainerStyle={{ paddingBottom: spacing.lg }}
                ItemSeparatorComponent={() => <View style={{ height: 0 }} />}
                refreshControl={
                    <RefreshControl
                        refreshing={refreshing}
                        onRefresh={() => loadClaims(true)}
                    />
                }
            />

            {/* Decision Dialog using Modal component */}
            {decisionDialog.visible && decisionDialog.claim && (
                <Modal
                    visible={decisionDialog.visible}
                    title={decisionDialog.decision === 'VERIFY' ? 'Verify Payment Claim' : 'Reject Payment Claim'}
                    onClose={() => setDecisionDialog({ visible: false, claim: null, decision: null, note: '' })}
                >
                    <Text style={[typography.body, { color: colors.textSecondary, marginBottom: spacing.md }]}>
                        {decisionDialog.decision === 'VERIFY'
                            ? `Confirm verification of this payment claim for ${formatFullCurrency(decisionDialog.claim.amount)}?`
                            : `Reason for rejecting this payment claim for ${formatFullCurrency(decisionDialog.claim.amount)}?`
                        }
                    </Text>

                    <Text style={[typography.bodySmall, { color: colors.textSecondary, marginBottom: spacing.lg }]}>
                        Tenant: {decisionDialog.claim.tenantIdentity?.name || 'Unknown Tenant'}
                        {'\n'}
                        Property: {decisionDialog.claim.lease?.property?.name || 'Unknown'} - Unit {decisionDialog.claim.lease?.unit?.unitNumber || 'Unknown'}
                    </Text>

                    {decisionDialog.decision === 'REJECT' && (
                        <Input
                            placeholder="Enter reason for rejection (optional)"
                            value={decisionDialog.note}
                            onChangeText={(text) => setDecisionDialog(prev => ({ ...prev, note: text }))}
                            multiline
                            numberOfLines={3}
                            style={{ marginBottom: spacing.lg }}
                        />
                    )}

                    <View style={{ flexDirection: 'row', gap: spacing.sm }}>
                        <Button
                            title="Cancel"
                            onPress={() => setDecisionDialog({ visible: false, claim: null, decision: null, note: '' })}
                            variant="outline"
                            style={{ flex: 1 }}
                        />
                        <Button
                            title={decisionDialog.decision === 'VERIFY' ? 'Verify' : 'Reject'}
                            onPress={handleDecisionConfirm}
                            style={{
                                flex: 1,
                                backgroundColor: decisionDialog.decision === 'VERIFY' ? colors.success : colors.error
                            }}
                        />
                    </View>
                </Modal>
            )}

            {/* Tutorial Modal */}
            <TutorialModal
                visible={showTutorial}
                onClose={handleTutorialClose}
                title="Verify Tenant Payments"
                description="Review and verify payment claims submitted by your tenants. Verified payments are automatically recorded in the system."
                steps={[
                    {
                        title: 'Review Payment Details',
                        description: 'Check the tenant name, amount, property, and payment method for each claim.',
                        icon: 'document-text-outline'
                    },
                    {
                        title: 'Verify or Reject',
                        description: 'Click "Verify" to approve the payment or "Reject" if there\'s an issue.',
                        icon: 'checkmark-circle-outline'
                    },
                    {
                        title: 'Add Notes (Optional)',
                        description: 'When rejecting a claim, you can add a note explaining the reason.',
                        icon: 'create-outline'
                    }
                ]}
            />
        </View>
    );
};
