import React, { useState, useCallback, useEffect } from 'react';
import {
    View,
    Text,
    ScrollView,
    RefreshControl,
    Alert,
    ActivityIndicator,
    TouchableOpacity,
    TextInput,
} from 'react-native';
import { useTheme } from '../../theme/ThemeContext';
import { useAuth } from '../../context/AuthContext';
import { apiGet, apiPost } from '../../utils/apiClient';
import { Button } from '../../components/Button';
import { Card } from '../../components/Card';
import { Ionicons } from '@expo/vector-icons';

// AsyncStorage import for direct use
let AsyncStorage: any;
try {
    AsyncStorage = require('@react-native-async-storage/async-storage').default;
} catch (e) {
    AsyncStorage = {
        getItem: async () => null,
        setItem: async () => { },
        removeItem: async () => { },
    };
}

interface Invoice {
    id: string;
    periodStart: string;
    periodEnd: string;
    subtotalAmount: number;
    feeAmount: number;
    totalAmount: number;
    status: string;
    dueDate: string;
    createdAt: string;
    lineCount: number;
}

interface BillingStatus {
    billingStatus: string;
    graceUntil?: string;
    termsAcceptedAt?: string | null;
    currentInvoice?: {
        id: string;
        periodStart: string;
        periodEnd: string;
        subtotalAmount: number;
        feeAmount: number;
        totalAmount: number;
        dueDate: string;
        status: string;
        lineCount: number;
    } | null;
}

interface ManagerBillingScreenProps {
    navigation: any;
    route?: any;
}

// ─── Helpers ────────────────────────────────────────────────────────────────
const formatNumber = (num: number) => num.toLocaleString();

const formatDate = (dateString: string) =>
    new Date(dateString).toLocaleDateString('en-UG', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
    });

const statusColor = (status: string, colors: any) => {
    switch (status) {
        case 'PAID':
            return colors.success;
        case 'DUE':
            return colors.warning;
        case 'OVERDUE':
            return colors.error;
        default:
            return colors.textSecondary;
    }
};

// ─── Main Component ─────────────────────────────────────────────────────────
export const ManagerBillingScreen: React.FC<ManagerBillingScreenProps> = ({
    navigation,
    route,
}) => {
    const { colors, spacing, typography, borderRadius } = useTheme();
    const { refreshMe } = useAuth();

    // Data state
    const [billingStatus, setBillingStatus] = useState<BillingStatus | null>(null);
    const [invoices, setInvoices] = useState<Invoice[]>([]);

    // UI state
    const [initialLoading, setInitialLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [acceptingTerms, setAcceptingTerms] = useState(false);

    // Payment state
    const [payingInvoiceId, setPayingInvoiceId] = useState<string | null>(null);
    const [paymentPhone, setPaymentPhone] = useState('');
    const [paymentStatus, setPaymentStatus] = useState<string | null>(null); // PENDING | SUCCESS | FAILED | TIMEOUT
    const [paymentError, setPaymentError] = useState<string | null>(null);
    const [pollingPaymentId, setPollingPaymentId] = useState<string | null>(null);
    const [showPhoneInput, setShowPhoneInput] = useState(false);

    // Enforcement route params
    const enforcementBanner: string | undefined = route?.params?.enforcementBanner;
    const blockedFeature: string | undefined = route?.params?.blockedFeature;
    const enforcement: any | undefined = route?.params?.enforcement;

    // Derived: terms accepted from API data (single source of truth)
    const termsAccepted = !!billingStatus?.termsAcceptedAt;

    // ── DEV logging for enforcement params ──
    useEffect(() => {
        if (__DEV__ && (enforcementBanner || blockedFeature || enforcement)) {
            console.log('[Billing] Enforcement route params:', {
                enforcementBanner,
                blockedFeature,
                action: enforcement?.action,
                message: enforcement?.message,
            });
        }
    }, [enforcementBanner, blockedFeature, enforcement]);

    // ── Parallel data load ──────────────────────────────────────────────────
    const loadData = useCallback(async (isRefresh = false) => {
        if (!isRefresh) setInitialLoading(true);
        setError(null);

        try {
            const [statusRes, invoicesRes] = await Promise.all([
                apiGet('/manager/billing/status'),
                apiGet('/manager/billing/invoices'),
            ]);

            if (statusRes.status === 200 && statusRes.json?.success) {
                setBillingStatus(statusRes.json.data);
            } else {
                setError(statusRes.json?.message || 'Failed to load billing status');
            }

            if (invoicesRes.status === 200 && invoicesRes.json?.success) {
                setInvoices(invoicesRes.json.data ?? []);
            }

            if (__DEV__) {
                console.log('[Billing] Loaded — status:', statusRes.json?.data?.billingStatus,
                    '| invoices:', invoicesRes.json?.data?.length ?? 0);
            }
        } catch (e) {
            console.error('[Billing] Load error:', e);
            setError('Failed to load billing information. Check your connection.');
        } finally {
            setInitialLoading(false);
            setRefreshing(false);
        }
    }, []);

    // ── Initial load ────────────────────────────────────────────────────────
    useEffect(() => {
        loadData();
    }, [loadData]);

    // ── Auto-refresh on screen focus ────────────────────────────────────────
    useEffect(() => {
        const unsubscribe = navigation.addListener('focus', () => {
            if (__DEV__) console.log('[Billing] Screen focused — refreshing data');
            loadData(true);
        });
        return unsubscribe;
    }, [navigation, loadData]);

    // ── Pull-to-refresh handler ─────────────────────────────────────────────
    const onRefresh = useCallback(() => {
        setRefreshing(true);
        loadData(true);
    }, [loadData]);

    // ── Accept terms ────────────────────────────────────────────────────────
    const handleAcceptTerms = async () => {
        setAcceptingTerms(true);
        setError(null);

        try {
            const { status, json } = await apiPost('/manager/terms/accept', {});

            if (status === 200 && json?.success) {
                // Update stored token if new token provided
                if (json?.data?.token) {
                    await AsyncStorage.setItem('authToken', json.data.token);
                }
                await refreshMe();
                Alert.alert(
                    'Terms Accepted',
                    'Thank you for accepting EstateNet Manager Terms and Conditions.',
                    [{ text: 'OK' }],
                );
                // Reload to get fresh status (termsAcceptedAt will now be set)
                await loadData(true);
            } else {
                setError(json?.message || 'Failed to accept terms');
            }
        } catch (e) {
            setError('Network error. Please try again.');
        } finally {
            setAcceptingTerms(false);
        }
    };

    // ── Pay invoice via API + polling ─────────────────────────────────────
    const handlePayInvoice = (invoiceId: string) => {
        setPayingInvoiceId(invoiceId);
        setPaymentStatus(null);
        setPaymentError(null);
        setPollingPaymentId(null);
        setShowPhoneInput(true);
        // Pre-fill phone from user profile if available
        if (!paymentPhone) {
            setPaymentPhone('');
        }
    };

    const handleCancelPayment = () => {
        setShowPhoneInput(false);
        setPayingInvoiceId(null);
        setPaymentStatus(null);
        setPaymentError(null);
        setPollingPaymentId(null);
    };

    const handleSubmitPayment = async () => {
        if (!payingInvoiceId || !paymentPhone.trim()) {
            setPaymentError('Please enter your mobile money phone number');
            return;
        }

        setShowPhoneInput(false);
        setPaymentStatus('PENDING');
        setPaymentError(null);

        try {
            const { status, json } = await apiPost(
                `/manager/billing/invoices/${payingInvoiceId}/pay`,
                { phoneNumber: paymentPhone.trim() }
            );

            if (status === 201 && json?.success) {
                const paymentId = json.data.paymentId;
                setPollingPaymentId(paymentId);
                startPolling(paymentId);
            } else {
                setPaymentStatus('FAILED');
                setPaymentError(json?.message || 'Failed to initiate payment');
            }
        } catch (e) {
            setPaymentStatus('FAILED');
            setPaymentError('Network error. Please try again.');
        }
    };

    const startPolling = (paymentId: string) => {
        const POLL_INTERVAL = 3000;
        const MAX_POLL_TIME = 90000;
        const startTime = Date.now();

        const poll = async () => {
            try {
                const { status, json } = await apiGet(`/manager/billing/payments/${paymentId}`);

                if (status === 200 && json?.success) {
                    const s = json.data.status;
                    if (s === 'SUCCESS') {
                        setPaymentStatus('SUCCESS');
                        setPollingPaymentId(null);
                        Alert.alert('Payment Successful', 'Your invoice has been paid. Thank you!');
                        loadData(true);
                        return;
                    }
                    if (s === 'FAILED') {
                        setPaymentStatus('FAILED');
                        setPaymentError(json.data.failureReason || 'Payment failed');
                        setPollingPaymentId(null);
                        return;
                    }
                }

                // Check timeout
                if (Date.now() - startTime > MAX_POLL_TIME) {
                    setPaymentStatus('TIMEOUT');
                    setPaymentError('Payment confirmation timed out. If you completed the payment, it may still be processed. Pull to refresh.');
                    setPollingPaymentId(null);
                    return;
                }

                // Continue polling
                setTimeout(poll, POLL_INTERVAL);
            } catch {
                // Network error during poll — keep trying until timeout
                if (Date.now() - startTime > MAX_POLL_TIME) {
                    setPaymentStatus('TIMEOUT');
                    setPaymentError('Connection lost during payment verification. Pull to refresh to check status.');
                    setPollingPaymentId(null);
                    return;
                }
                setTimeout(poll, POLL_INTERVAL);
            }
        };

        setTimeout(poll, POLL_INTERVAL);
    };

    // ─── RENDER: Full-screen loading (initial only) ─────────────────────────
    if (initialLoading && !billingStatus) {
        return (
            <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: colors.background }}>
                <ActivityIndicator size="large" color={colors.primary} />
                <Text style={[typography.body, { color: colors.textSecondary, marginTop: spacing.md }]}>
                    Loading billing information…
                </Text>
            </View>
        );
    }

    // ─── RENDER: Main screen ────────────────────────────────────────────────
    return (
        <ScrollView
            style={{ flex: 1, backgroundColor: colors.background }}
            refreshControl={
                <RefreshControl
                    refreshing={refreshing}
                    onRefresh={onRefresh}
                    colors={[colors.primary]}
                    tintColor={colors.primary}
                />
            }
        >
            <View style={{ padding: spacing.lg }}>
                {/* ── Header + Refresh button ── */}
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing.lg }}>
                    <Text style={[typography.h2, { color: colors.text }]}>Billing</Text>
                    <TouchableOpacity onPress={onRefresh} hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}>
                        <Ionicons name="refresh" size={22} color={colors.primary} />
                    </TouchableOpacity>
                </View>

                {/* ── Enforcement Banner ── */}
                {!!enforcementBanner && (
                    <Card style={{
                        backgroundColor: colors.error + '15',
                        borderColor: colors.error,
                        borderWidth: 1.5,
                        marginBottom: spacing.lg,
                    }}>
                        <View style={{ padding: spacing.lg }}>
                            <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: spacing.sm }}>
                                <Ionicons name="lock-closed" size={20} color={colors.error} />
                                <Text style={[typography.h4, { color: colors.error, marginLeft: spacing.sm }]}>
                                    Action Required
                                </Text>
                            </View>
                            <Text style={[typography.body, { color: colors.text, marginBottom: spacing.xs }]}>
                                {enforcementBanner}
                            </Text>
                            {!!blockedFeature && (
                                <Text style={[typography.bodySmall, { color: colors.textSecondary }]}>
                                    Blocked feature: {blockedFeature}
                                </Text>
                            )}
                            {!!enforcement?.message && enforcement.message !== enforcementBanner && (
                                <Text style={[typography.bodySmall, { color: colors.textSecondary, marginTop: spacing.xs }]}>
                                    {enforcement.message}
                                </Text>
                            )}
                        </View>
                    </Card>
                )}

                {/* ── Error + Retry ── */}
                {!!error && (
                    <Card style={{
                        backgroundColor: colors.error + '10',
                        borderColor: colors.error,
                        borderWidth: 1,
                        marginBottom: spacing.lg,
                    }}>
                        <View style={{ padding: spacing.md, flexDirection: 'row', alignItems: 'center' }}>
                            <Ionicons name="alert-circle" size={18} color={colors.error} />
                            <Text style={[typography.bodySmall, { color: colors.error, flex: 1, marginLeft: spacing.sm }]}>
                                {error}
                            </Text>
                            <TouchableOpacity onPress={() => loadData(true)}>
                                <Text style={[typography.bodySmall, { color: colors.primary, fontWeight: '600' }]}>Retry</Text>
                            </TouchableOpacity>
                        </View>
                    </Card>
                )}

                {/* ── Terms Section (only when not yet accepted) ── */}
                {!termsAccepted && (
                    <Card style={{
                        backgroundColor: colors.warning + '10',
                        borderColor: colors.warning,
                        borderWidth: 1,
                        marginBottom: spacing.lg,
                    }}>
                        <View style={{ padding: spacing.lg }}>
                            <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: spacing.md }}>
                                <Ionicons name="document-text-outline" size={24} color={colors.warning} />
                                <Text style={[typography.h4, { color: colors.warning, marginLeft: spacing.sm }]}>
                                    Terms & Conditions Required
                                </Text>
                            </View>
                            <Text style={[typography.body, { color: colors.text, marginBottom: spacing.md }]}>
                                Please accept the EstateNet Manager Terms and Conditions to access billing features and manage your properties.
                            </Text>
                            <View style={{ backgroundColor: colors.background, padding: spacing.md, borderRadius: borderRadius.md, marginBottom: spacing.md }}>
                                <Text style={[typography.bodySmall, { color: colors.textSecondary, marginBottom: spacing.sm }]}>
                                    Key Terms:
                                </Text>
                                <Text style={[typography.bodySmall, { color: colors.text }]}>
                                    {'\u2022'} 3.99% fee per occupied unit per month{'\n'}
                                    {'\u2022'} Monthly billing for manager services{'\n'}
                                    {'\u2022'} Payment via MTN Mobile Money or Airtel Money{'\n'}
                                    {'\u2022'} Grace period for overdue payments
                                </Text>
                            </View>
                            <Button
                                title={acceptingTerms ? 'Accepting…' : 'Accept Terms & Conditions'}
                                onPress={handleAcceptTerms}
                                loading={acceptingTerms}
                                style={{ backgroundColor: colors.warning }}
                            />
                        </View>
                    </Card>
                )}

                {/* ── Billing Status Card ── */}
                {billingStatus && (() => {
                    const isOverdue = billingStatus.billingStatus === 'OVERDUE';
                    const isCurrent = billingStatus.billingStatus === 'CURRENT';
                    const accent = isOverdue ? colors.error : isCurrent ? colors.success : colors.info;
                    const icon = isOverdue ? 'warning' : isCurrent ? 'checkmark-circle' : 'information-circle';
                    const label = isOverdue ? 'Billing Overdue' : isCurrent ? 'Billing Current' : 'Billing Status';

                    return (
                        <Card style={{
                            backgroundColor: accent + '10',
                            borderColor: accent,
                            borderWidth: 1,
                            marginBottom: spacing.lg,
                        }}>
                            <View style={{ padding: spacing.lg }}>
                                <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: spacing.md }}>
                                    <Ionicons name={icon as any} size={24} color={accent} />
                                    <Text style={[typography.h4, { color: accent, marginLeft: spacing.sm }]}>{label}</Text>
                                </View>
                                {isOverdue && (
                                    <View>
                                        <Text style={[typography.body, { color: colors.text, marginBottom: spacing.sm }]}>
                                            Your account is overdue. Some features may be restricted until payment is received.
                                        </Text>
                                        {billingStatus.graceUntil && (
                                            <Text style={[typography.bodySmall, { color: colors.textSecondary }]}>
                                                Grace period until: {formatDate(billingStatus.graceUntil)}
                                            </Text>
                                        )}
                                    </View>
                                )}
                                {isCurrent && (
                                    <Text style={[typography.body, { color: colors.success }]}>
                                        Your account is in good standing. All features are available.
                                    </Text>
                                )}
                            </View>
                        </Card>
                    );
                })()}

                {/* ── Current Invoice Card ── */}
                {billingStatus?.currentInvoice && (() => {
                    const inv = billingStatus.currentInvoice!;
                    const invAccent = inv.status === 'OVERDUE' ? colors.error : colors.warning;

                    return (
                        <Card style={{
                            backgroundColor: invAccent + '10',
                            borderColor: invAccent,
                            borderWidth: 1,
                            marginBottom: spacing.lg,
                        }}>
                            <View style={{ padding: spacing.lg }}>
                                <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: spacing.md }}>
                                    <Ionicons name="alert-circle" size={24} color={invAccent} />
                                    <Text style={[typography.h4, { color: invAccent, marginLeft: spacing.sm }]}>
                                        Current Invoice — {inv.status}
                                    </Text>
                                </View>

                                <View style={{ marginBottom: spacing.md }}>
                                    <Text style={[typography.body, { color: colors.text }]}>
                                        Period: {formatDate(inv.periodStart)} – {formatDate(inv.periodEnd)}
                                    </Text>
                                    <Text style={[typography.body, { color: colors.text }]}>
                                        Due Date: {formatDate(inv.dueDate)}
                                    </Text>
                                    <Text style={[typography.body, { color: colors.text }]}>
                                        Occupied Units: {inv.lineCount}
                                    </Text>
                                </View>

                                <View style={{
                                    backgroundColor: colors.background,
                                    padding: spacing.md,
                                    borderRadius: borderRadius.md,
                                    marginBottom: spacing.md,
                                }}>
                                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: spacing.xs }}>
                                        <Text style={[typography.body, { color: colors.textSecondary }]}>Subtotal:</Text>
                                        <Text style={[typography.body, { color: colors.text }]}>UGX {formatNumber(inv.subtotalAmount)}</Text>
                                    </View>
                                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: spacing.xs }}>
                                        <Text style={[typography.body, { color: colors.textSecondary }]}>Service Fee (3.99%):</Text>
                                        <Text style={[typography.body, { color: colors.text }]}>UGX {formatNumber(inv.feeAmount)}</Text>
                                    </View>
                                    <View style={{
                                        flexDirection: 'row',
                                        justifyContent: 'space-between',
                                        borderTopWidth: 1,
                                        borderTopColor: colors.border,
                                        paddingTop: spacing.xs,
                                        marginTop: spacing.xs,
                                    }}>
                                        <Text style={[typography.h4, { color: colors.text }]}>Total:</Text>
                                        <Text style={[typography.h4, { color: colors.primary }]}>UGX {formatNumber(inv.totalAmount)}</Text>
                                    </View>
                                </View>

                                {/* Phone input for payment */}
                                {showPhoneInput && payingInvoiceId === inv.id && (
                                    <View style={{
                                        backgroundColor: colors.background,
                                        padding: spacing.md,
                                        borderRadius: borderRadius.md,
                                        marginBottom: spacing.md,
                                    }}>
                                        <Text style={[typography.bodySmall, { color: colors.textSecondary, marginBottom: spacing.sm }]}>
                                            Enter your Mobile Money number:
                                        </Text>
                                        <TextInput
                                            style={{
                                                borderWidth: 1,
                                                borderColor: colors.border,
                                                borderRadius: borderRadius.md,
                                                padding: spacing.sm,
                                                color: colors.text,
                                                fontSize: 16,
                                                marginBottom: spacing.sm,
                                            }}
                                            placeholder="e.g. 0771234567"
                                            placeholderTextColor={colors.textSecondary}
                                            value={paymentPhone}
                                            onChangeText={setPaymentPhone}
                                            keyboardType="phone-pad"
                                            autoFocus
                                        />
                                        {!!paymentError && (
                                            <Text style={[typography.bodySmall, { color: colors.error, marginBottom: spacing.sm }]}>
                                                {paymentError}
                                            </Text>
                                        )}
                                        <View style={{ flexDirection: 'row', gap: spacing.sm }}>
                                            <Button
                                                title="Cancel"
                                                onPress={handleCancelPayment}
                                                variant="outline"
                                                style={{ flex: 1, borderRadius: borderRadius.md }}
                                            />
                                            <Button
                                                title="Send Payment Prompt"
                                                onPress={handleSubmitPayment}
                                                variant="primary"
                                                style={{ flex: 2, borderRadius: borderRadius.md }}
                                            />
                                        </View>
                                    </View>
                                )}

                                {/* Payment pending indicator */}
                                {paymentStatus === 'PENDING' && payingInvoiceId === inv.id && (
                                    <View style={{
                                        backgroundColor: colors.info + '15',
                                        padding: spacing.md,
                                        borderRadius: borderRadius.md,
                                        marginBottom: spacing.md,
                                        flexDirection: 'row',
                                        alignItems: 'center',
                                    }}>
                                        <ActivityIndicator size="small" color={colors.info} />
                                        <Text style={[typography.body, { color: colors.info, marginLeft: spacing.sm, flex: 1 }]}>
                                            Waiting for payment confirmation…
                                        </Text>
                                    </View>
                                )}

                                {/* Payment error / timeout */}
                                {(paymentStatus === 'FAILED' || paymentStatus === 'TIMEOUT') && payingInvoiceId === inv.id && (
                                    <View style={{
                                        backgroundColor: colors.error + '10',
                                        padding: spacing.md,
                                        borderRadius: borderRadius.md,
                                        marginBottom: spacing.md,
                                    }}>
                                        <Text style={[typography.bodySmall, { color: colors.error, marginBottom: spacing.sm }]}>
                                            {paymentError || 'Payment failed'}
                                        </Text>
                                        <Button
                                            title="Try Again"
                                            onPress={() => handlePayInvoice(inv.id)}
                                            variant="outline"
                                            style={{ borderRadius: borderRadius.md }}
                                        />
                                    </View>
                                )}

                                {/* Payment success */}
                                {paymentStatus === 'SUCCESS' && payingInvoiceId === inv.id && (
                                    <View style={{
                                        backgroundColor: colors.success + '15',
                                        padding: spacing.md,
                                        borderRadius: borderRadius.md,
                                        marginBottom: spacing.md,
                                        flexDirection: 'row',
                                        alignItems: 'center',
                                    }}>
                                        <Ionicons name="checkmark-circle" size={20} color={colors.success} />
                                        <Text style={[typography.body, { color: colors.success, marginLeft: spacing.sm }]}>
                                            Payment successful!
                                        </Text>
                                    </View>
                                )}

                                {/* Default Pay Now button (when no payment flow active for this invoice) */}
                                {(!payingInvoiceId || payingInvoiceId !== inv.id) && (
                                    <Button
                                        title="Pay Now"
                                        onPress={() => handlePayInvoice(inv.id)}
                                        variant="primary"
                                        style={{ borderRadius: borderRadius.md }}
                                    />
                                )}
                            </View>
                        </Card>
                    );
                })()}

                {/* ── How to Pay ── */}
                {(billingStatus?.currentInvoice || invoices.some((i) => i.status === 'DUE' || i.status === 'OVERDUE')) && (
                    <Card style={{ backgroundColor: colors.info + '10', marginBottom: spacing.lg }}>
                        <View style={{ padding: spacing.lg }}>
                            <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: spacing.md }}>
                                <Ionicons name="card-outline" size={20} color={colors.info} />
                                <Text style={[typography.h4, { color: colors.info, marginLeft: spacing.sm }]}>How to Pay</Text>
                            </View>
                            <Text style={[typography.body, { color: colors.text, marginBottom: spacing.sm }]}>
                                <Text style={{ fontWeight: '600' }}>MTN Mobile Money: </Text>
                                Dial *165*3# → Pay Bill → EstateNet
                            </Text>
                            <Text style={[typography.body, { color: colors.text, marginBottom: spacing.sm }]}>
                                <Text style={{ fontWeight: '600' }}>Airtel Money: </Text>
                                Dial *185*9# → Pay Bill → EstateNet
                            </Text>
                            <Text style={[typography.body, { color: colors.text, marginBottom: spacing.sm }]}>
                                <Text style={{ fontWeight: '600' }}>Bank Transfer: </Text>
                                Contact support for bank details
                            </Text>
                            {billingStatus?.currentInvoice && (
                                <View style={{
                                    backgroundColor: colors.background,
                                    padding: spacing.md,
                                    borderRadius: borderRadius.md,
                                    marginTop: spacing.sm,
                                }}>
                                    <Text style={[typography.bodySmall, { color: colors.textSecondary }]}>
                                        Your payment reference:
                                    </Text>
                                    <Text style={[typography.h4, { color: colors.primary, marginTop: spacing.xs }]}>
                                        INV-{billingStatus.currentInvoice.id.slice(-8).toUpperCase()}
                                    </Text>
                                </View>
                            )}
                        </View>
                    </Card>
                )}

                {/* ── Invoice History ── */}
                <View style={{ marginBottom: spacing.lg }}>
                    <Text style={[typography.h3, { color: colors.text, marginBottom: spacing.md }]}>
                        Invoice History
                    </Text>
                    {invoices.length > 0 ? (
                        invoices.map((item) => (
                            <Card key={item.id} style={{ marginBottom: spacing.sm }}>
                                <View style={{ padding: spacing.lg }}>
                                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                                        <View style={{ flex: 1 }}>
                                            <Text style={[typography.h4, { color: colors.text }]}>
                                                UGX {formatNumber(item.totalAmount)}
                                            </Text>
                                            <Text style={[typography.bodySmall, { color: colors.textSecondary }]}>
                                                {formatDate(item.periodStart)} – {formatDate(item.periodEnd)}
                                            </Text>
                                            <Text style={[typography.bodySmall, { color: colors.textSecondary }]}>
                                                Due: {formatDate(item.dueDate)} {'\u2022'} {item.lineCount} unit{item.lineCount !== 1 ? 's' : ''}
                                            </Text>
                                        </View>
                                        <View style={{ alignItems: 'flex-end' }}>
                                            <View style={{
                                                backgroundColor: statusColor(item.status, colors) + '20',
                                                paddingHorizontal: spacing.sm,
                                                paddingVertical: 2,
                                                borderRadius: borderRadius.sm,
                                            }}>
                                                <Text style={[typography.bodySmall, {
                                                    color: statusColor(item.status, colors),
                                                    fontWeight: '700',
                                                }]}>
                                                    {item.status}
                                                </Text>
                                            </View>
                                            {(item.status === 'DUE' || item.status === 'OVERDUE') && (
                                                <Button
                                                    title="Pay"
                                                    onPress={() => handlePayInvoice(item.id)}
                                                    variant="outline"
                                                    size="small"
                                                    style={{ marginTop: spacing.xs }}
                                                />
                                            )}
                                        </View>
                                    </View>
                                </View>
                            </Card>
                        ))
                    ) : (
                        <Card>
                            <View style={{ padding: spacing.xl ?? spacing.lg, alignItems: 'center' }}>
                                <Ionicons name="receipt-outline" size={48} color={colors.textSecondary} />
                                <Text style={[typography.body, { color: colors.textSecondary, marginTop: spacing.sm, textAlign: 'center' }]}>
                                    No invoices yet
                                </Text>
                                <Text style={[typography.bodySmall, { color: colors.textSecondary, marginTop: spacing.xs, textAlign: 'center' }]}>
                                    Invoices are generated monthly for occupied units.
                                </Text>
                            </View>
                        </Card>
                    )}
                </View>
            </View>
        </ScrollView>
    );
};
