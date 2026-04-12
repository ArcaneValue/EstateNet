import React, { useState, useCallback, useEffect } from 'react';
import {
    View,
    Text,
    ScrollView,
    RefreshControl,
    Alert,
    ActivityIndicator,
    TouchableOpacity,
    Modal,
    LayoutAnimation,
    Platform,
    UIManager,
    Clipboard,
} from 'react-native';
import { useTheme } from '../../theme/ThemeContext';
import { useAuth } from '../../context/AuthContext';
import { TopAppBar } from '../../components/TopAppBar';
import { apiGet, apiPost } from '../../utils/apiClient';
import { Button } from '../../components/Button';
import { Card } from '../../components/Card';
import { MobileMoneyPaymentModal } from '../../components/MobileMoneyPaymentModal';
import { Ionicons } from '@expo/vector-icons';
import { formatCompactCurrencyUGX } from '../../utils/formatters';

// Enable LayoutAnimation on Android (suppress warning in New Architecture)
if (Platform.OS === 'android') {
    try {
        if (UIManager.setLayoutAnimationEnabledExperimental) {
            UIManager.setLayoutAnimationEnabledExperimental(true);
        }
    } catch (e) {
        // Silently fail in New Architecture
    }
}

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
    paidAt: string | null;
    createdAt: string;
    lineCount: number;
}

interface InvoiceLine {
    id: string;
    propertyId: string;
    unitId: string;
    rentAmount: number;
    tenantId: string | null;
    leaseId: string | null;
    property: { id: string; name: string; location: string } | null;
    unit: { id: string; unitNumber: string } | null;
    tenant: { name: string; email: string } | null;
}

interface InvoiceDetail extends Invoice {
    feeRateBps: number;
    lines: InvoiceLine[];
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

interface ServicePayment {
    paymentId: string;
    invoiceId: string;
    externalRef: string;
    status: string;
    amount: number;
    currency: string;
    provider: string;
    network: string;
    phoneNumber: string;
    providerTxId: string | null;
    failureReason: string | null;
    createdAt: string;
    updatedAt: string;
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

const formatDateShort = (dateString: string) =>
    new Date(dateString).toLocaleDateString('en-UG', {
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
    const { user, refreshMe } = useAuth();

    // Data state
    const [billingStatus, setBillingStatus] = useState<BillingStatus | null>(null);
    const [invoices, setInvoices] = useState<Invoice[]>([]);
    const [servicePayments, setServicePayments] = useState<ServicePayment[]>([]);

    // Receipt modal state
    const [receiptPayment, setReceiptPayment] = useState<ServicePayment | null>(null);
    const [showReceiptModal, setShowReceiptModal] = useState(false);

    // Invoice detail modal state
    const [invoiceDetail, setInvoiceDetail] = useState<InvoiceDetail | null>(null);
    const [showInvoiceDetail, setShowInvoiceDetail] = useState(false);
    const [loadingInvoiceDetail, setLoadingInvoiceDetail] = useState(false);

    // Payment history filter
    const [paymentFilter, setPaymentFilter] = useState<'ALL' | 'SUCCESS' | 'FAILED' | 'PENDING'>('ALL');

    // UI state
    const [initialLoading, setInitialLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [acceptingTerms, setAcceptingTerms] = useState(false);

    // Payment state
    const [payingInvoiceId, setPayingInvoiceId] = useState<string | null>(null);
    const [paymentPhone, setPaymentPhone] = useState('');
    const [paymentNetwork, setPaymentNetwork] = useState<'MTN' | 'AIRTEL'>('MTN');
    const [paymentStatus, setPaymentStatus] = useState<string | null>(null); // PENDING | SUCCESS | FAILED | TIMEOUT
    const [paymentError, setPaymentError] = useState<string | null>(null);
    const [pollingPaymentId, setPollingPaymentId] = useState<string | null>(null);
    const [showPaymentModal, setShowPaymentModal] = useState(false);

    // Collapsible state
    const [showBreakdown, setShowBreakdown] = useState(false);
    const [showHowBilling, setShowHowBilling] = useState(false);

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
            const [statusRes, invoicesRes, paymentsRes] = await Promise.all([
                apiGet('/manager/billing/status'),
                apiGet('/manager/billing/invoices'),
                apiGet('/manager/billing/service-payments?limit=10'),
            ]);

            if (statusRes.status === 200 && statusRes.json?.success) {
                setBillingStatus(statusRes.json.data);
            } else {
                setError(statusRes.json?.message || 'Failed to load billing status');
            }

            if (invoicesRes.status === 200 && invoicesRes.json?.success) {
                setInvoices(invoicesRes.json.data ?? []);
            }

            if (paymentsRes.status === 200 && paymentsRes.json?.success) {
                setServicePayments(paymentsRes.json.data ?? []);
            }

            if (__DEV__) {
                console.log('[Billing] Loaded — status:', statusRes.json?.data?.billingStatus,
                    '| invoices:', invoicesRes.json?.data?.length ?? 0,
                    '| payments:', paymentsRes.json?.data?.length ?? 0);
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
                    'Thank you for accepting EstateNet Manager Terms and Conditions. Billing features are now enabled.',
                    [{ text: 'OK' }],
                );
                // Reload to get fresh status (termsAcceptedAt will now be set)
                await loadData(true);

                // Clear enforcement route params to remove the Action Required banner
                if (enforcementBanner || blockedFeature || enforcement) {
                    navigation.setParams({
                        enforcementBanner: undefined,
                        blockedFeature: undefined,
                        enforcement: undefined,
                    });
                }
            } else {
                setError(json?.message || 'Failed to accept terms');
            }
        } catch (e) {
            setError('Network error. Please try again.');
        } finally {
            setAcceptingTerms(false);
        }
    };

    // ── View invoice detail ────────────────────────────────────────────────
    const handleViewInvoiceDetail = async (invoiceId: string) => {
        setLoadingInvoiceDetail(true);
        setShowInvoiceDetail(true);
        try {
            const { status, json } = await apiGet(`/manager/billing/invoices/${invoiceId}`);
            if (status === 200 && json?.success) {
                setInvoiceDetail(json.data);
            } else {
                setInvoiceDetail(null);
                Alert.alert('Error', json?.message || 'Failed to load invoice details');
                setShowInvoiceDetail(false);
            }
        } catch {
            Alert.alert('Error', 'Network error loading invoice details');
            setShowInvoiceDetail(false);
        } finally {
            setLoadingInvoiceDetail(false);
        }
    };

    // ── Pay invoice via API + polling ─────────────────────────────────────
    const handlePayInvoice = (invoiceId: string) => {
        setPayingInvoiceId(invoiceId);
        setPaymentStatus(null);
        setPaymentError(null);
        setPollingPaymentId(null);
        setShowPaymentModal(true);
    };

    const handleCancelPayment = () => {
        setShowPaymentModal(false);
        setPayingInvoiceId(null);
        setPaymentStatus(null);
        setPaymentError(null);
        setPollingPaymentId(null);
    };

    const handleSubmitPayment = async (phoneNumber: string, network: 'MTN' | 'AIRTEL') => {
        if (!payingInvoiceId) return;

        setPaymentPhone(phoneNumber);
        setPaymentNetwork(network);
        setShowPaymentModal(false);
        setPaymentStatus('PENDING');
        setPaymentError(null);

        try {
            const { status, json } = await apiPost(
                `/manager/billing/invoices/${payingInvoiceId}/pay`,
                { phoneNumber: phoneNumber, network: network }
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

    // ── Toggle collapsibles with animation ─────────────────────────────────
    const toggleBreakdown = () => {
        LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
        setShowBreakdown(!showBreakdown);
    };

    const toggleHowBilling = () => {
        LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
        setShowHowBilling(!showHowBilling);
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
        <View style={{ flex: 1, backgroundColor: colors.background }}>
            <TopAppBar
                onNotificationsPress={() => { }}
                onProfilePress={() => navigation.navigate('Profile')}
                profileImage={user?.profileImage}
            />
            <ScrollView
                style={{ flex: 1 }}
                contentContainerStyle={{ paddingBottom: spacing['3xl'] }}
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
                                        {'•'} 1.5% fee per occupied unit per month{'\n'}
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

                    {/* ── Current Invoice Hero Card ── */}
                    {billingStatus?.currentInvoice && (() => {
                        const inv = billingStatus.currentInvoice!;
                        const isDue = inv.status === 'DUE';
                        const isOverdue = inv.status === 'OVERDUE';
                        const statusBgColor = isOverdue ? colors.error : isDue ? colors.warning : colors.success;

                        return (
                            <Card style={{ marginBottom: spacing.lg }}>
                                <View style={{ padding: spacing.xl }}>
                                    {/* Status Pill */}
                                    <View style={{
                                        alignSelf: 'flex-start',
                                        backgroundColor: statusBgColor + '20',
                                        paddingHorizontal: spacing.md,
                                        paddingVertical: spacing.xs,
                                        borderRadius: borderRadius.full,
                                        marginBottom: spacing.lg,
                                    }}>
                                        <Text style={[typography.bodySmall, { color: statusBgColor, fontWeight: '700' }]}>
                                            {inv.status}
                                        </Text>
                                    </View>

                                    {/* Primary Amount */}
                                    <Text style={[typography.bodySmall, { color: colors.textSecondary, marginBottom: spacing.xs }]}>
                                        Service fee due
                                    </Text>
                                    <Text style={[typography.h1, { color: colors.text, fontSize: 40, fontWeight: '700', marginBottom: spacing.md }]}>
                                        {formatCompactCurrencyUGX(inv.feeAmount)}
                                    </Text>

                                    {/* Compact Meta Row */}
                                    <View style={{ flexDirection: 'row', flexWrap: 'wrap', marginBottom: spacing.lg, gap: spacing.md }}>
                                        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                                            <Ionicons name="calendar-outline" size={14} color={colors.textSecondary} />
                                            <Text style={[typography.bodySmall, { color: colors.textSecondary, marginLeft: 4 }]}>
                                                {formatDateShort(inv.periodStart)} - {formatDateShort(inv.periodEnd)}
                                            </Text>
                                        </View>
                                        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                                            <Ionicons name="time-outline" size={14} color={colors.textSecondary} />
                                            <Text style={[typography.bodySmall, { color: colors.textSecondary, marginLeft: 4 }]}>
                                                Due {formatDateShort(inv.dueDate)}
                                            </Text>
                                        </View>
                                        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                                            <Ionicons name="home-outline" size={14} color={colors.textSecondary} />
                                            <Text style={[typography.bodySmall, { color: colors.textSecondary, marginLeft: 4 }]}>
                                                {inv.lineCount} unit{inv.lineCount !== 1 ? 's' : ''}
                                            </Text>
                                        </View>
                                    </View>

                                    {/* Collapsible: View Breakdown */}
                                    <TouchableOpacity
                                        onPress={toggleBreakdown}
                                        style={{
                                            flexDirection: 'row',
                                            alignItems: 'center',
                                            justifyContent: 'space-between',
                                            paddingVertical: spacing.sm,
                                            borderBottomWidth: 1,
                                            borderBottomColor: colors.border,
                                        }}
                                    >
                                        <Text style={[typography.body, { color: colors.primary, fontWeight: '600' }]}>
                                            View breakdown
                                        </Text>
                                        <Ionicons
                                            name={showBreakdown ? 'chevron-up' : 'chevron-down'}
                                            size={20}
                                            color={colors.primary}
                                        />
                                    </TouchableOpacity>

                                    {showBreakdown && (
                                        <View style={{ paddingVertical: spacing.md }}>
                                            <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: spacing.sm }}>
                                                <Text style={[typography.body, { color: colors.textSecondary }]}>Subtotal (reference)</Text>
                                                <Text style={[typography.body, { color: colors.textSecondary }]}>
                                                    {formatCompactCurrencyUGX(inv.subtotalAmount)}
                                                </Text>
                                            </View>
                                            <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                                                <Text style={[typography.body, { color: colors.text, fontWeight: '600' }]}>Service Fee (1.5%)</Text>
                                                <Text style={[typography.body, { color: colors.text, fontWeight: '600' }]}>
                                                    {formatCompactCurrencyUGX(inv.feeAmount)}
                                                </Text>
                                            </View>
                                        </View>
                                    )}

                                    {/* Collapsible: How Billing Works */}
                                    <TouchableOpacity
                                        onPress={toggleHowBilling}
                                        style={{
                                            flexDirection: 'row',
                                            alignItems: 'center',
                                            justifyContent: 'space-between',
                                            paddingVertical: spacing.sm,
                                            borderBottomWidth: 1,
                                            borderBottomColor: colors.border,
                                            marginBottom: spacing.lg,
                                        }}
                                    >
                                        <Text style={[typography.body, { color: colors.primary, fontWeight: '600' }]}>
                                            How billing works
                                        </Text>
                                        <Ionicons
                                            name={showHowBilling ? 'chevron-up' : 'chevron-down'}
                                            size={20}
                                            color={colors.primary}
                                        />
                                    </TouchableOpacity>

                                    {showHowBilling && (
                                        <View style={{
                                            backgroundColor: colors.info + '10',
                                            padding: spacing.md,
                                            borderRadius: borderRadius.md,
                                            marginBottom: spacing.lg,
                                        }}>
                                            <Text style={[typography.bodySmall, { color: colors.text, lineHeight: 20 }]}>
                                                Invoices are calculated based on occupied units at the start of the billing period. We charge a 1.5% service fee per occupied unit per month. New units added during the month are billed in the next cycle.
                                            </Text>
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

                                    {/* Primary CTA: Pay Now Button */}
                                    {(!payingInvoiceId || payingInvoiceId !== inv.id) && (
                                        <Button
                                            title="Pay Now"
                                            onPress={() => handlePayInvoice(inv.id)}
                                            variant="primary"
                                            size="large"
                                            style={{ width: '100%' }}
                                        />
                                    )}
                                </View>
                            </Card>
                        );
                    })()}

                    {/* Mobile Money Payment Modal */}
                    {payingInvoiceId && billingStatus?.currentInvoice && (
                        <MobileMoneyPaymentModal
                            visible={showPaymentModal}
                            amount={billingStatus.currentInvoice.feeAmount}
                            onClose={handleCancelPayment}
                            onSubmit={handleSubmitPayment}
                            error={paymentError}
                        />
                    )}

                    {/* ── Upcoming Invoice (PENDING) ── */}
                    {invoices.find(inv => inv.status === 'PENDING') && (() => {
                        const pendingInv = invoices.find(inv => inv.status === 'PENDING')!;
                        const periodEndDate = new Date(pendingInv.periodEnd);
                        const payableDate = new Date(periodEndDate.getTime() + 24 * 60 * 60 * 1000);

                        return (
                            <Card style={{
                                marginBottom: spacing.lg,
                                backgroundColor: colors.info + '10',
                                borderColor: colors.info,
                                borderWidth: 1
                            }}>
                                <View style={{ padding: spacing.xl }}>
                                    {/* Status Pill */}
                                    <View style={{
                                        alignSelf: 'flex-start',
                                        backgroundColor: colors.info + '20',
                                        paddingHorizontal: spacing.md,
                                        paddingVertical: spacing.xs,
                                        borderRadius: borderRadius.full,
                                        marginBottom: spacing.lg,
                                    }}>
                                        <Text style={[typography.bodySmall, { color: colors.info, fontWeight: '700' }]}>
                                            UPCOMING
                                        </Text>
                                    </View>

                                    {/* Title */}
                                    <Text style={[typography.h3, { color: colors.text, marginBottom: spacing.sm }]}>
                                        Current Month Invoice
                                    </Text>
                                    <Text style={[typography.body, { color: colors.textSecondary, marginBottom: spacing.lg }]}>
                                        This invoice updates in real-time as tenants join. You can pay it starting {formatDate(payableDate.toISOString())}.
                                    </Text>

                                    {/* Amount Display */}
                                    <Text style={[typography.bodySmall, { color: colors.textSecondary, marginBottom: spacing.xs }]}>
                                        Current amount
                                    </Text>
                                    <Text style={[typography.h1, { color: colors.info, fontSize: 40, fontWeight: '700', marginBottom: spacing.md }]}>
                                        {formatCompactCurrencyUGX(pendingInv.feeAmount)}
                                    </Text>

                                    {/* Meta Info */}
                                    <View style={{ flexDirection: 'row', flexWrap: 'wrap', marginBottom: spacing.lg, gap: spacing.md }}>
                                        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                                            <Ionicons name="calendar-outline" size={14} color={colors.textSecondary} />
                                            <Text style={[typography.bodySmall, { color: colors.textSecondary, marginLeft: 4 }]}>
                                                {formatDateShort(pendingInv.periodStart)} - {formatDateShort(pendingInv.periodEnd)}
                                            </Text>
                                        </View>
                                        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                                            <Ionicons name="time-outline" size={14} color={colors.textSecondary} />
                                            <Text style={[typography.bodySmall, { color: colors.textSecondary, marginLeft: 4 }]}>
                                                Payable {formatDateShort(payableDate.toISOString())}
                                            </Text>
                                        </View>
                                        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                                            <Ionicons name="home-outline" size={14} color={colors.textSecondary} />
                                            <Text style={[typography.bodySmall, { color: colors.textSecondary, marginLeft: 4 }]}>
                                                {pendingInv.lineCount} unit{pendingInv.lineCount !== 1 ? 's' : ''}
                                            </Text>
                                        </View>
                                    </View>

                                    {/* Info Box */}
                                    <View style={{
                                        backgroundColor: colors.background,
                                        padding: spacing.md,
                                        borderRadius: borderRadius.md,
                                        borderLeftWidth: 3,
                                        borderLeftColor: colors.info,
                                    }}>
                                        <View style={{ flexDirection: 'row', alignItems: 'flex-start' }}>
                                            <Ionicons name="information-circle" size={20} color={colors.info} style={{ marginRight: spacing.sm, marginTop: 2 }} />
                                            <Text style={[typography.bodySmall, { color: colors.text, flex: 1, lineHeight: 20 }]}>
                                                This amount updates automatically as tenants join or leave. You'll be able to pay the final amount after {formatDate(pendingInv.periodEnd)}.
                                            </Text>
                                        </View>
                                    </View>

                                    {/* View Details Button */}
                                    <TouchableOpacity
                                        onPress={() => handleViewInvoiceDetail(pendingInv.id)}
                                        style={{
                                            marginTop: spacing.md,
                                            paddingVertical: spacing.sm,
                                            alignItems: 'center',
                                        }}
                                    >
                                        <Text style={[typography.body, { color: colors.primary, fontWeight: '600' }]}>
                                            View breakdown →
                                        </Text>
                                    </TouchableOpacity>
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

                    {/* ── Pending Payment Banner ── */}
                    {(() => {
                        const pendingPay = servicePayments.find(p => p.status === 'PENDING');
                        if (!pendingPay) return null;
                        const createdMs = new Date(pendingPay.createdAt).getTime();
                        const ageMin = (Date.now() - createdMs) / 60000;
                        const canRetry = ageMin > 5;

                        return (
                            <Card style={{
                                backgroundColor: colors.info + '15',
                                borderColor: colors.info,
                                borderWidth: 1,
                                marginBottom: spacing.lg,
                            }}>
                                <View style={{ padding: spacing.lg }}>
                                    <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: spacing.sm }}>
                                        <ActivityIndicator size="small" color={colors.info} />
                                        <Text style={[typography.h4, { color: colors.info, marginLeft: spacing.sm }]}>
                                            Payment Pending
                                        </Text>
                                    </View>
                                    <Text style={[typography.body, { color: colors.text, marginBottom: spacing.xs }]}>
                                        Ref: {pendingPay.externalRef}
                                    </Text>
                                    <Text style={[typography.bodySmall, { color: colors.textSecondary, marginBottom: spacing.md }]}>
                                        UGX {formatCompactCurrencyUGX(pendingPay.amount)} {'•'} {pendingPay.network} {'•'} {pendingPay.phoneNumber}
                                    </Text>
                                    <View style={{ flexDirection: 'row', gap: spacing.sm }}>
                                        <Button
                                            title="Refresh"
                                            onPress={() => loadData(true)}
                                            variant="outline"
                                            size="small"
                                            style={{ flex: 1 }}
                                        />
                                        {canRetry && (
                                            <Button
                                                title="Retry Payment"
                                                onPress={() => handlePayInvoice(pendingPay.invoiceId)}
                                                variant="primary"
                                                size="small"
                                                style={{ flex: 1 }}
                                            />
                                        )}
                                    </View>
                                </View>
                            </Card>
                        );
                    })()}

                    {/* ── Failed/Timeout Payment Banner ── */}
                    {(() => {
                        const failedPay = servicePayments.find(p =>
                            p.status === 'FAILED' && (p.failureReason === 'TIMEOUT' || p.failureReason === 'Payment failed')
                        );
                        if (!failedPay) return null;

                        return (
                            <Card style={{
                                backgroundColor: colors.error + '10',
                                borderColor: colors.error,
                                borderWidth: 1,
                                marginBottom: spacing.lg,
                            }}>
                                <View style={{ padding: spacing.lg }}>
                                    <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: spacing.sm }}>
                                        <Ionicons name="close-circle" size={20} color={colors.error} />
                                        <Text style={[typography.h4, { color: colors.error, marginLeft: spacing.sm }]}>
                                            Payment {failedPay.failureReason === 'TIMEOUT' ? 'Timed Out' : 'Failed'}
                                        </Text>
                                    </View>
                                    <Text style={[typography.bodySmall, { color: colors.textSecondary, marginBottom: spacing.sm }]}>
                                        Ref: {failedPay.externalRef} {'\u2022'} {failedPay.failureReason}
                                    </Text>
                                    <Button
                                        title="Retry Payment"
                                        onPress={() => handlePayInvoice(failedPay.invoiceId)}
                                        variant="outline"
                                        size="small"
                                    />
                                </View>
                            </Card>
                        );
                    })()}

                    {/* ── Payment History ── */}
                    {servicePayments.length > 0 && (
                        <View style={{ marginBottom: spacing.lg }}>
                            <Text style={[typography.h3, { color: colors.text, marginBottom: spacing.sm }]}>
                                Payment History
                            </Text>
                            <View style={{ flexDirection: 'row', marginBottom: spacing.md, gap: spacing.xs }}>
                                {(['ALL', 'SUCCESS', 'FAILED', 'PENDING'] as const).map((f) => {
                                    const active = paymentFilter === f;
                                    const filterColor = f === 'SUCCESS' ? colors.success : f === 'FAILED' ? colors.error : f === 'PENDING' ? colors.info : colors.primary;
                                    return (
                                        <TouchableOpacity
                                            key={f}
                                            onPress={() => setPaymentFilter(f)}
                                            style={{
                                                paddingHorizontal: spacing.sm,
                                                paddingVertical: 4,
                                                borderRadius: borderRadius.sm,
                                                backgroundColor: active ? filterColor + '20' : 'transparent',
                                                borderWidth: 1,
                                                borderColor: active ? filterColor : colors.border,
                                            }}
                                        >
                                            <Text style={[typography.bodySmall, {
                                                color: active ? filterColor : colors.textSecondary,
                                                fontWeight: active ? '700' : '400',
                                            }]}>
                                                {f === 'ALL' ? 'All' : f.charAt(0) + f.slice(1).toLowerCase()}
                                            </Text>
                                        </TouchableOpacity>
                                    );
                                })}
                            </View>
                            {servicePayments.filter(sp => paymentFilter === 'ALL' || sp.status === paymentFilter).map((sp) => {
                                const isSuccess = sp.status === 'SUCCESS';
                                const isFailed = sp.status === 'FAILED';
                                const isPending = sp.status === 'PENDING';
                                const badgeColor = isSuccess ? colors.success : isFailed ? colors.error : colors.info;
                                const badgeLabel = sp.status;

                                return (
                                    <TouchableOpacity
                                        key={sp.paymentId}
                                        onPress={() => {
                                            setReceiptPayment(sp);
                                            setShowReceiptModal(true);
                                        }}
                                        activeOpacity={0.7}
                                    >
                                        <Card style={{ marginBottom: spacing.sm }}>
                                            <View style={{ padding: spacing.md, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                                                <View style={{ flex: 1 }}>
                                                    <Text style={[typography.body, { color: colors.text, fontWeight: '600' }]}>
                                                        {formatCompactCurrencyUGX(sp.amount)}
                                                    </Text>
                                                    <Text style={[typography.bodySmall, { color: colors.textSecondary }]}>
                                                        {new Date(sp.createdAt).toLocaleString('en-UG', { dateStyle: 'medium', timeStyle: 'short' })}
                                                    </Text>
                                                    <Text style={[typography.bodySmall, { color: colors.textSecondary }]}>
                                                        Ref: {sp.externalRef}
                                                    </Text>
                                                    {isSuccess && sp.providerTxId && (
                                                        <Text style={[typography.bodySmall, { color: colors.success }]}>
                                                            Tx: {sp.providerTxId}
                                                        </Text>
                                                    )}
                                                </View>
                                                <View style={{ alignItems: 'flex-end' }}>
                                                    <View style={{
                                                        backgroundColor: badgeColor + '20',
                                                        paddingHorizontal: spacing.sm,
                                                        paddingVertical: 2,
                                                        borderRadius: borderRadius.sm,
                                                    }}>
                                                        <Text style={[typography.bodySmall, { color: badgeColor, fontWeight: '700' }]}>
                                                            {badgeLabel}
                                                        </Text>
                                                    </View>
                                                    {isPending && (
                                                        <ActivityIndicator size="small" color={colors.info} style={{ marginTop: spacing.xs }} />
                                                    )}
                                                </View>
                                            </View>
                                        </Card>
                                    </TouchableOpacity>
                                );
                            })}
                        </View>
                    )}

                    {/* ── Invoice History ── */}
                    <View style={{ marginBottom: spacing.lg }}>
                        <Text style={[typography.h3, { color: colors.text, marginBottom: spacing.md }]}>
                            Invoice History
                        </Text>
                        {invoices.length > 0 ? (
                            invoices.map((item) => (
                                <TouchableOpacity
                                    key={item.id}
                                    onPress={() => handleViewInvoiceDetail(item.id)}
                                    activeOpacity={0.7}
                                >
                                    <Card style={{ marginBottom: spacing.sm }}>
                                        <View style={{ padding: spacing.lg }}>
                                            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                                                <View style={{ flex: 1 }}>
                                                    <Text style={[typography.h4, { color: colors.text }]}>
                                                        {formatCompactCurrencyUGX(item.feeAmount)}
                                                    </Text>
                                                    <Text style={[typography.bodySmall, { color: colors.textSecondary }]}>
                                                        {formatDate(item.periodStart)} – {formatDate(item.periodEnd)}
                                                    </Text>
                                                    <Text style={[typography.bodySmall, { color: colors.textSecondary }]}>
                                                        Due: {formatDate(item.dueDate)} {'\u2022'} {item.lineCount} unit{item.lineCount !== 1 ? 's' : ''}
                                                    </Text>
                                                    {item.status === 'PAID' && item.paidAt && (
                                                        <Text style={[typography.bodySmall, { color: colors.success }]}>
                                                            Paid: {formatDate(item.paidAt)}
                                                        </Text>
                                                    )}
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
                                                    <Ionicons name="chevron-forward" size={16} color={colors.textSecondary} style={{ marginTop: spacing.xs }} />
                                                </View>
                                            </View>
                                        </View>
                                    </Card>
                                </TouchableOpacity>
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

                {/* ── Receipt Modal ── */}
                <Modal
                    visible={showReceiptModal}
                    transparent
                    animationType="slide"
                    onRequestClose={() => setShowReceiptModal(false)}
                >
                    <View style={{
                        flex: 1,
                        backgroundColor: 'rgba(0,0,0,0.5)',
                        justifyContent: 'flex-end',
                    }}>
                        <View style={{
                            backgroundColor: colors.surface,
                            borderTopLeftRadius: borderRadius.lg,
                            borderTopRightRadius: borderRadius.lg,
                            padding: spacing.lg,
                            maxHeight: '80%',
                        }}>
                            {receiptPayment && (() => {
                                const rp = receiptPayment;
                                const isSuccess = rp.status === 'SUCCESS';
                                const accentColor = isSuccess ? colors.success : rp.status === 'FAILED' ? colors.error : colors.info;

                                return (
                                    <View>
                                        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing.lg }}>
                                            <Text style={[typography.h3, { color: colors.text }]}>
                                                {isSuccess ? 'Payment Receipt' : 'Payment Details'}
                                            </Text>
                                            <TouchableOpacity onPress={() => setShowReceiptModal(false)}>
                                                <Ionicons name="close" size={24} color={colors.textSecondary} />
                                            </TouchableOpacity>
                                        </View>

                                        <View style={{
                                            alignItems: 'center',
                                            marginBottom: spacing.lg,
                                            padding: spacing.lg,
                                            backgroundColor: accentColor + '10',
                                            borderRadius: borderRadius.md,
                                        }}>
                                            <Ionicons
                                                name={isSuccess ? 'checkmark-circle' : rp.status === 'FAILED' ? 'close-circle' : 'time'}
                                                size={48}
                                                color={accentColor}
                                            />
                                            <Text style={[typography.h2, { color: accentColor, marginTop: spacing.sm }]}>
                                                {rp.currency} {formatNumber(rp.amount)}
                                            </Text>
                                            <View style={{
                                                backgroundColor: accentColor + '20',
                                                paddingHorizontal: spacing.md,
                                                paddingVertical: spacing.xs,
                                                borderRadius: borderRadius.sm,
                                                marginTop: spacing.sm,
                                            }}>
                                                <Text style={[typography.bodySmall, { color: accentColor, fontWeight: '700' }]}>
                                                    {rp.status}
                                                </Text>
                                            </View>
                                        </View>

                                        <View style={{ gap: spacing.sm, marginBottom: spacing.lg }}>
                                            <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                                                <Text style={[typography.bodySmall, { color: colors.textSecondary }]}>Reference</Text>
                                                <Text style={[typography.body, { color: colors.text, fontWeight: '600' }]}>{rp.externalRef}</Text>
                                            </View>
                                            {isSuccess && rp.providerTxId && (
                                                <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                                                    <Text style={[typography.bodySmall, { color: colors.textSecondary }]}>Transaction ID</Text>
                                                    <Text style={[typography.body, { color: colors.text, fontWeight: '600' }]}>{rp.providerTxId}</Text>
                                                </View>
                                            )}
                                            <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                                                <Text style={[typography.bodySmall, { color: colors.textSecondary }]}>Network</Text>
                                                <Text style={[typography.body, { color: colors.text }]}>{rp.network}</Text>
                                            </View>
                                            <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                                                <Text style={[typography.bodySmall, { color: colors.textSecondary }]}>Phone</Text>
                                                <Text style={[typography.body, { color: colors.text }]}>{rp.phoneNumber}</Text>
                                            </View>
                                            <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                                                <Text style={[typography.bodySmall, { color: colors.textSecondary }]}>Date</Text>
                                                <Text style={[typography.body, { color: colors.text }]}>
                                                    {new Date(rp.createdAt).toLocaleString('en-UG', { dateStyle: 'medium', timeStyle: 'short' })}
                                                </Text>
                                            </View>
                                            {rp.failureReason && (
                                                <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                                                    <Text style={[typography.bodySmall, { color: colors.textSecondary }]}>Reason</Text>
                                                    <Text style={[typography.body, { color: colors.error }]}>{rp.failureReason}</Text>
                                                </View>
                                            )}
                                        </View>

                                        <Button
                                            title="Copy Reference"
                                            onPress={() => {
                                                Clipboard.setString(rp.externalRef);
                                                Alert.alert('Copied', 'Payment reference copied to clipboard.');
                                            }}
                                            variant="outline"
                                            style={{ marginBottom: spacing.sm }}
                                        />
                                        <Button
                                            title="Close"
                                            onPress={() => setShowReceiptModal(false)}
                                            variant="primary"
                                        />
                                    </View>
                                );
                            })()}
                        </View>
                    </View>
                </Modal>

                {/* ── Invoice Detail Modal ── */}
                <Modal
                    visible={showInvoiceDetail}
                    transparent
                    animationType="slide"
                    onRequestClose={() => setShowInvoiceDetail(false)}
                >
                    <View style={{
                        flex: 1,
                        backgroundColor: 'rgba(0,0,0,0.5)',
                        justifyContent: 'flex-end',
                    }}>
                        <View style={{
                            backgroundColor: colors.surface,
                            borderTopLeftRadius: borderRadius.lg,
                            borderTopRightRadius: borderRadius.lg,
                            padding: spacing.lg,
                            maxHeight: '85%',
                        }}>
                            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing.lg }}>
                                <Text style={[typography.h3, { color: colors.text }]}>Invoice Details</Text>
                                <TouchableOpacity onPress={() => setShowInvoiceDetail(false)}>
                                    <Ionicons name="close" size={24} color={colors.textSecondary} />
                                </TouchableOpacity>
                            </View>

                            {loadingInvoiceDetail && (
                                <View style={{ alignItems: 'center', padding: spacing.xl ?? spacing.lg }}>
                                    <ActivityIndicator size="large" color={colors.primary} />
                                    <Text style={[typography.body, { color: colors.textSecondary, marginTop: spacing.md }]}>
                                        Loading invoice…
                                    </Text>
                                </View>
                            )}

                            {invoiceDetail && !loadingInvoiceDetail && (
                                <ScrollView style={{ maxHeight: 500 }} showsVerticalScrollIndicator={false}>
                                    {/* Summary */}
                                    <View style={{
                                        backgroundColor: colors.background,
                                        padding: spacing.md,
                                        borderRadius: borderRadius.md,
                                        marginBottom: spacing.md,
                                    }}>
                                        <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: spacing.xs }}>
                                            <Text style={[typography.bodySmall, { color: colors.textSecondary }]}>Period</Text>
                                            <Text style={[typography.body, { color: colors.text }]}>
                                                {formatDate(invoiceDetail.periodStart)} – {formatDate(invoiceDetail.periodEnd)}
                                            </Text>
                                        </View>
                                        <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: spacing.xs }}>
                                            <Text style={[typography.bodySmall, { color: colors.textSecondary }]}>Status</Text>
                                            <Text style={[typography.body, { color: statusColor(invoiceDetail.status, colors), fontWeight: '700' }]}>
                                                {invoiceDetail.status}
                                            </Text>
                                        </View>
                                        <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: spacing.xs }}>
                                            <Text style={[typography.bodySmall, { color: colors.textSecondary }]}>Subtotal (reference only)</Text>
                                            <Text style={[typography.body, { color: colors.textSecondary }]}>UGX {formatNumber(invoiceDetail.subtotalAmount)}</Text>
                                        </View>
                                        <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: spacing.xs }}>
                                            <Text style={[typography.bodySmall, { color: colors.textSecondary }]}>
                                                Fee ({(invoiceDetail.feeRateBps / 100).toFixed(2)}%)
                                            </Text>
                                            <Text style={[typography.body, { color: colors.text }]}>UGX {formatNumber(invoiceDetail.feeAmount)}</Text>
                                        </View>
                                        <View style={{
                                            flexDirection: 'row', justifyContent: 'space-between',
                                            borderTopWidth: 1, borderTopColor: colors.border,
                                            paddingTop: spacing.xs, marginTop: spacing.xs,
                                        }}>
                                            <Text style={[typography.h4, { color: colors.text }]}>Service Fee Due</Text>
                                            <Text style={[typography.h4, { color: colors.primary }]}>UGX {formatNumber(invoiceDetail.feeAmount)}</Text>
                                        </View>
                                        {invoiceDetail.paidAt && (
                                            <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: spacing.xs }}>
                                                <Text style={[typography.bodySmall, { color: colors.textSecondary }]}>Paid At</Text>
                                                <Text style={[typography.body, { color: colors.success }]}>
                                                    {new Date(invoiceDetail.paidAt).toLocaleString('en-UG', { dateStyle: 'medium', timeStyle: 'short' })}
                                                </Text>
                                            </View>
                                        )}
                                    </View>

                                    {/* Line Items */}
                                    <Text style={[typography.h4, { color: colors.text, marginBottom: spacing.sm }]}>
                                        Line Items ({invoiceDetail.lines.length})
                                    </Text>
                                    {invoiceDetail.lines.map((line) => (
                                        <Card key={line.id} style={{ marginBottom: spacing.sm }}>
                                            <View style={{ padding: spacing.md }}>
                                                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing.xs }}>
                                                    <Text style={[typography.body, { color: colors.text, fontWeight: '600', flex: 1 }]}>
                                                        {line.property?.name || 'Property'}
                                                    </Text>
                                                    <Text style={[typography.body, { color: colors.primary, fontWeight: '600' }]}>
                                                        UGX {formatNumber(line.rentAmount)}
                                                    </Text>
                                                </View>
                                                <Text style={[typography.bodySmall, { color: colors.textSecondary }]}>
                                                    Unit: {line.unit?.unitNumber || '—'}
                                                    {line.property?.location ? ` • ${line.property.location}` : ''}
                                                </Text>
                                                {line.tenant && (
                                                    <Text style={[typography.bodySmall, { color: colors.textSecondary }]}>
                                                        Tenant: {line.tenant.name}
                                                    </Text>
                                                )}
                                            </View>
                                        </Card>
                                    ))}

                                    {invoiceDetail.lines.length === 0 && (
                                        <Text style={[typography.body, { color: colors.textSecondary, textAlign: 'center', padding: spacing.md }]}>
                                            No line items
                                        </Text>
                                    )}

                                    {/* Actions */}
                                    {(invoiceDetail.status === 'DUE' || invoiceDetail.status === 'OVERDUE') && (
                                        <Button
                                            title="Pay This Invoice"
                                            onPress={() => {
                                                setShowInvoiceDetail(false);
                                                handlePayInvoice(invoiceDetail.id);
                                            }}
                                            variant="primary"
                                            style={{ marginTop: spacing.md, marginBottom: spacing.sm }}
                                        />
                                    )}
                                    <Button
                                        title="Close"
                                        onPress={() => setShowInvoiceDetail(false)}
                                        variant="outline"
                                        style={{ marginBottom: spacing.md }}
                                    />
                                </ScrollView>
                            )}
                        </View>
                    </View>
                </Modal>
            </ScrollView>
        </View>
    );
};
