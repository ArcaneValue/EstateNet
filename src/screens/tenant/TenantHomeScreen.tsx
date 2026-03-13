import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, Alert, TouchableOpacity, Clipboard } from 'react-native';
import { useTheme } from '../../theme/ThemeContext';
import { useAuth } from '../../context/AuthContext';
import { useTenants } from '../../context/TenantContext';
import { useLease } from '../../context/LeaseContext';
import { usePayments } from '../../context/PaymentContext';
import { Card } from '../../components/Card';
import { StatusBadge } from '../../components/StatusBadge';
import { TopAppBar } from '../../components/TopAppBar';
import { InvitationModal } from './InvitationModal';
import { SkeletonLoader } from '../../components/SkeletonLoader';
import { InfoBanner } from '../../components/InfoBanner';
import { Ionicons } from '@expo/vector-icons';
import { formatCompactCurrencyUGX } from '../../utils/formatters';

interface TenantHomeScreenProps {
    navigation: any;
}

export const TenantHomeScreen: React.FC<TenantHomeScreenProps> = ({ navigation }) => {
    const { colors, spacing, typography, borderRadius } = useTheme();
    const { user } = useAuth();
    const { invitations, invitationsLoading, loadInvitations, getPendingInvitationsForTenant, acceptInvitation, rejectInvitation } = useTenants();
    const { activeLease, leaseLoading, refreshLease } = useLease();
    const { loadPayments, rentStatus, rentStatusLoading, loadRentStatus } = usePayments();
    const [profileImage, setProfileImage] = useState<string | null>(null);
    const [pendingInvitations, setPendingInvitations] = useState<any[]>([]);
    const [currentInvitationIndex, setCurrentInvitationIndex] = useState(0);
    const [isProcessing, setIsProcessing] = useState(false);

    useEffect(() => {
        const run = async () => {
            await loadInvitations();
        };
        run();
    }, [user?.tenantId]);

    useEffect(() => {
        if (user?.tenantId) {
            const list = getPendingInvitationsForTenant(user.tenantId);
            setPendingInvitations(list);
            setCurrentInvitationIndex(0);
        } else {
            setPendingInvitations([]);
        }
    }, [invitations, user?.tenantId]);

    const handleAcceptInvitation = async (invitationId: string) => {
        setIsProcessing(true);
        try {
            const success = await acceptInvitation(invitationId);
            if (success) {
                await Promise.all([
                    refreshLease(),
                    loadPayments(),
                    loadRentStatus(),
                ]);
                Alert.alert('Success', 'You have accepted the invitation!');
                // Move to next invitation or close modal
                if (currentInvitationIndex < pendingInvitations.length - 1) {
                    setCurrentInvitationIndex(currentInvitationIndex + 1);
                } else {
                    setPendingInvitations([]);
                }
            }
        } finally {
            setIsProcessing(false);
        }
    };

    const handleRejectInvitation = async (invitationId: string) => {
        Alert.alert(
            'Confirm Rejection',
            'Are you sure you want to decline this invitation?',
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: 'Decline',
                    style: 'destructive',
                    onPress: async () => {
                        setIsProcessing(true);
                        try {
                            const success = await rejectInvitation(invitationId);
                            if (success) {
                                Alert.alert('Thank you', 'Your response has been recorded.');
                                // Move to next invitation or close modal
                                if (currentInvitationIndex < pendingInvitations.length - 1) {
                                    setCurrentInvitationIndex(currentInvitationIndex + 1);
                                } else {
                                    setPendingInvitations([]);
                                }
                            }
                        } finally {
                            setIsProcessing(false);
                        }
                    },
                },
            ]
        );
    };

    // Lease-derived values from backend lease only
    const propertyName = activeLease?.property?.name ?? '—';
    const propertyLocation = activeLease?.property?.location ?? '—';
    const unitNumber = activeLease?.unit?.unitNumber ?? '—';
    const monthlyRent = typeof activeLease?.rentAmount === 'number' ? activeLease.rentAmount : null;

    const rentStatusData = rentStatus;
    const hasRentStatus = !!rentStatusData && rentStatusData.status !== 'NO_LEASE';
    const periodDue = hasRentStatus ? rentStatusData.amountDueForPeriod : 0;
    const periodPaid = hasRentStatus ? rentStatusData.totalPaidForPeriod : 0;
    const remainingThisPeriod = Math.max(0, periodDue - periodPaid);
    const pastArrears = hasRentStatus ? rentStatusData.arrearsTotal : 0;
    const statusLabel = hasRentStatus ? rentStatusData.status : (activeLease ? 'NOT_DUE' : 'NO_LEASE');
    const formattedDueDate = hasRentStatus && rentStatusData.dueDate
        ? new Date(rentStatusData.dueDate).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
        : '—';
    let timingLabel = '';
    if (hasRentStatus) {
        if (rentStatusData.status === 'PAID') {
            timingLabel = 'Paid for this billing period';
        } else if (rentStatusData.daysOverdue && rentStatusData.daysOverdue > 0) {
            timingLabel = `Overdue by ${rentStatusData.daysOverdue} day${rentStatusData.daysOverdue === 1 ? '' : 's'}`;
        } else if (rentStatusData.daysUntilDue !== null && rentStatusData.daysUntilDue > 0) {
            timingLabel = `Due in ${rentStatusData.daysUntilDue} day${rentStatusData.daysUntilDue === 1 ? '' : 's'}`;
        } else {
            timingLabel = 'Due today';
        }
    }

    return (
        <View style={{ flex: 1, backgroundColor: colors.background }}>
            {/* Top App Bar */}
            <TopAppBar
                onNotificationsPress={() => { }}
                onProfilePress={() => navigation.navigate('Profile')}
                profileImage={profileImage}
                propertyName={propertyName}
                unitNumber={unitNumber}
            />

            <ScrollView contentContainerStyle={{ padding: spacing.base, paddingBottom: spacing.xl }}>
                {/* Loading State - Skeleton Placeholders */}
                {(leaseLoading || invitationsLoading || rentStatusLoading) && (
                    <View>
                        <SkeletonLoader height={180} borderRadius={borderRadius.lg} style={{ marginBottom: spacing.lg }} />
                        <SkeletonLoader height={120} borderRadius={borderRadius.lg} style={{ marginBottom: spacing.lg }} />
                        <SkeletonLoader height={200} borderRadius={borderRadius.lg} />
                    </View>
                )}

                {/* Content - Only show when not loading */}
                {!(leaseLoading || invitationsLoading || rentStatusLoading) && (
                    <>
                        {/* Rent Status Hero Card */}
                        {activeLease && (
                            <Card style={{ marginBottom: spacing.lg }} padding={spacing.lg}>
                                <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: spacing.md }}>
                                    <Text style={[typography.h3, { color: colors.text }]}>Rent status</Text>
                                    <StatusBadge status={statusLabel as any} size="small" />
                                </View>

                                {/* Timing Label */}
                                {timingLabel !== '' && (
                                    <Text style={[typography.body, { color: colors.textSecondary, marginBottom: spacing.lg }]}>
                                        {timingLabel}
                                    </Text>
                                )}

                                {/* Primary Metric */}
                                {remainingThisPeriod > 0 ? (
                                    <View style={{ marginBottom: spacing.lg }}>
                                        <Text style={[typography.caption, { color: colors.textMuted, marginBottom: spacing.xs }]}>
                                            Outstanding this period
                                        </Text>
                                        <Text style={[typography.metric, { color: colors.error, fontSize: 32 }]}>
                                            {formatCompactCurrencyUGX(remainingThisPeriod)}
                                        </Text>
                                    </View>
                                ) : hasRentStatus && rentStatusData.status === 'PAID' ? (
                                    <View style={{ marginBottom: spacing.lg, alignItems: 'center', paddingVertical: spacing.md }}>
                                        <Ionicons name="checkmark-circle" size={48} color={colors.success} />
                                        <Text style={[typography.h4, { color: colors.success, marginTop: spacing.sm }]}>
                                            All paid up!
                                        </Text>
                                    </View>
                                ) : null}

                                {/* Secondary Metrics Grid */}
                                <View style={{ flexDirection: 'row', flexWrap: 'wrap', marginHorizontal: -spacing.xs }}>
                                    {monthlyRent !== null && (
                                        <View style={{ width: '50%', paddingHorizontal: spacing.xs, marginBottom: spacing.md }}>
                                            <Text style={[typography.caption, { color: colors.textMuted, marginBottom: spacing.xs }]}>
                                                Monthly rent
                                            </Text>
                                            <Text style={[typography.h4, { color: colors.text }]}>
                                                {formatCompactCurrencyUGX(monthlyRent)}
                                            </Text>
                                        </View>
                                    )}
                                    <View style={{ width: '50%', paddingHorizontal: spacing.xs, marginBottom: spacing.md }}>
                                        <Text style={[typography.caption, { color: colors.textMuted, marginBottom: spacing.xs }]}>
                                            Due date
                                        </Text>
                                        <Text style={[typography.h4, { color: colors.text }]}>
                                            {formattedDueDate}
                                        </Text>
                                    </View>
                                    {hasRentStatus && periodPaid > 0 && (
                                        <View style={{ width: '50%', paddingHorizontal: spacing.xs, marginBottom: spacing.md }}>
                                            <Text style={[typography.caption, { color: colors.textMuted, marginBottom: spacing.xs }]}>
                                                Paid this period
                                            </Text>
                                            <Text style={[typography.h4, { color: colors.success }]}>
                                                {formatCompactCurrencyUGX(periodPaid)}
                                            </Text>
                                        </View>
                                    )}
                                    {pastArrears > 0 && (
                                        <View style={{ width: '50%', paddingHorizontal: spacing.xs, marginBottom: spacing.md }}>
                                            <Text style={[typography.caption, { color: colors.textMuted, marginBottom: spacing.xs }]}>
                                                Arrears
                                            </Text>
                                            <Text style={[typography.h4, { color: colors.error }]}>
                                                {formatCompactCurrencyUGX(pastArrears)}
                                            </Text>
                                        </View>
                                    )}
                                </View>

                                {/* Error State for Rent Status */}
                                {!hasRentStatus && (
                                    <View style={{ paddingVertical: spacing.md }}>
                                        <Text style={[typography.body, { color: colors.textSecondary, marginBottom: spacing.md }]}>
                                            We couldn't load your rent status right now.
                                        </Text>
                                        <TouchableOpacity
                                            onPress={async () => {
                                                await loadRentStatus();
                                                await refreshLease();
                                            }}
                                            style={{
                                                backgroundColor: colors.primary,
                                                paddingHorizontal: spacing.lg,
                                                paddingVertical: spacing.sm,
                                                borderRadius: borderRadius.md,
                                                alignSelf: 'flex-start',
                                            }}
                                        >
                                            <Text style={[typography.button, { color: colors.textOnPrimary }]}>
                                                Retry
                                            </Text>
                                        </TouchableOpacity>
                                    </View>
                                )}
                            </Card>
                        )}

                        {/* Tenant ID Card - Compact */}
                        {user?.tenantId && (
                            <Card variant="surface2" style={{ marginBottom: spacing.lg }} padding={spacing.md}>
                                <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                                    <View style={{ flex: 1 }}>
                                        <Text style={[typography.caption, { color: colors.textMuted, marginBottom: spacing.xs }]}>
                                            Tenant ID
                                        </Text>
                                        <Text style={[typography.h4, { color: colors.text, fontWeight: '600', letterSpacing: 1 }]}>
                                            {user.tenantId}
                                        </Text>
                                        {!activeLease && (
                                            <Text style={[typography.bodySmall, { color: colors.textSecondary, marginTop: spacing.xs }]}>
                                                {pendingInvitations.length > 0 ? 'Pending invitation' : 'Awaiting invitation'}
                                            </Text>
                                        )}
                                    </View>
                                    <TouchableOpacity
                                        onPress={() => {
                                            if (user.tenantId) {
                                                Clipboard.setString(user.tenantId);
                                                Alert.alert('Copied', 'Tenant ID copied to clipboard');
                                            }
                                        }}
                                        style={{
                                            backgroundColor: colors.primary,
                                            paddingHorizontal: spacing.md,
                                            paddingVertical: spacing.sm,
                                            borderRadius: borderRadius.sm,
                                        }}
                                    >
                                        <Ionicons name="copy-outline" size={16} color={colors.textOnPrimary} />
                                    </TouchableOpacity>
                                </View>
                            </Card>
                        )}

                        {/* Property Card */}
                        {activeLease && (
                            <Card style={{ marginBottom: spacing.lg }} padding={spacing.lg}>
                                <Text style={[typography.h3, { color: colors.text, marginBottom: spacing.lg }]}>
                                    Your home
                                </Text>

                                {/* Property Name */}
                                <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: spacing.md }}>
                                    <Ionicons name="business-outline" size={20} color={colors.textMuted} style={{ marginRight: spacing.sm }} />
                                    <View style={{ flex: 1 }}>
                                        <Text style={[typography.caption, { color: colors.textMuted }]}>
                                            Property
                                        </Text>
                                        <Text style={[typography.body, { color: colors.text, marginTop: 2 }]}>
                                            {propertyName}
                                        </Text>
                                    </View>
                                </View>

                                {/* Location */}
                                <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: spacing.md }}>
                                    <Ionicons name="location-outline" size={20} color={colors.textMuted} style={{ marginRight: spacing.sm }} />
                                    <View style={{ flex: 1 }}>
                                        <Text style={[typography.caption, { color: colors.textMuted }]}>
                                            Location
                                        </Text>
                                        <Text style={[typography.body, { color: colors.text, marginTop: 2 }]}>
                                            {propertyLocation}
                                        </Text>
                                    </View>
                                </View>

                                {/* Unit Number */}
                                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                                    <Ionicons name="home-outline" size={20} color={colors.textMuted} style={{ marginRight: spacing.sm }} />
                                    <View style={{ flex: 1 }}>
                                        <Text style={[typography.caption, { color: colors.textMuted }]}>
                                            Unit
                                        </Text>
                                        <Text style={[typography.body, { color: colors.text, marginTop: 2 }]}>
                                            {unitNumber}
                                        </Text>
                                    </View>
                                </View>
                            </Card>
                        )}

                        {/* Info Banner */}
                        <InfoBanner
                            icon="information-circle"
                            title="Rent Information"
                            message="All rent details shown are current and accurate. Use the Payments tab to view history or make payments."
                            variant="info"
                        />
                    </>
                )}
            </ScrollView>

            {/* Invitation Modal */}
            {!activeLease && pendingInvitations.length > 0 && (
                <InvitationModal
                    invitation={pendingInvitations[currentInvitationIndex] || null}
                    visible={pendingInvitations.length > 0}
                    onAccept={handleAcceptInvitation}
                    onReject={handleRejectInvitation}
                    isProcessing={isProcessing}
                />
            )}
        </View>
    );
};
