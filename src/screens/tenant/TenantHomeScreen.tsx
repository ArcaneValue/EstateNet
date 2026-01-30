import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, Alert } from 'react-native';
import { useTheme } from '../../theme/ThemeContext';
import { useAuth } from '../../context/AuthContext';
import { useTenants } from '../../context/TenantContext';
import { useLease } from '../../context/LeaseContext';
import { usePayments } from '../../context/PaymentContext';
import { Card } from '../../components/Card';
import { StatusBadge } from '../../components/StatusBadge';
import { TopAppBar } from '../../components/TopAppBar';
import { InvitationModal } from './InvitationModal';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';

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
                {(leaseLoading || invitationsLoading || rentStatusLoading) && (
                    <Text style={[typography.body, { color: colors.text, marginBottom: spacing.lg }]}>Loading...</Text>
                )}

                {/* Tenant ID Card - Prominently Displayed */}
                {user?.tenantId && (
                    <Card style={{
                        marginBottom: spacing.lg,
                        padding: spacing.lg,
                        borderWidth: 2,
                        borderColor: colors.primary,
                        backgroundColor: colors.primary + '10'
                    }}>
                        <View style={{ alignItems: 'center' }}>
                            <Text style={[typography.bodySmall, { color: colors.primary, marginBottom: spacing.xs }]}>
                                YOUR TENANT ID
                            </Text>
                            <Text style={[
                                typography.display,
                                {
                                    color: colors.primary,
                                    fontSize: 32,
                                    fontWeight: '700',
                                    marginBottom: spacing.sm
                                }
                            ]}>
                                {user.tenantId}
                            </Text>
                            {!activeLease && (
                                <Text style={[typography.bodySmall, { color: colors.textSecondary, textAlign: 'center' }]}>
                                    {pendingInvitations.length > 0 ? 'You have a pending property invitation' : 'Waiting for invitation from property manager'}
                                </Text>
                            )}
                        </View>
                    </Card>
                )}

                {/* Rent Summary Card - uses backend rent status */}
                {activeLease && (
                    <Card style={{ marginBottom: spacing.lg, padding: spacing.lg }}>
                        <View style={{ flexDirection: 'row', alignItems: 'flex-start' }}>
                            <Ionicons
                                name="information-circle"
                                size={24}
                                color={colors.primary}
                                style={{ marginRight: spacing.md, marginTop: 2 }}
                            />
                            <View style={{ flex: 1 }}>
                                <Text style={[typography.h3, { color: colors.text }]}>
                                    Rent Status
                                </Text>
                                {hasRentStatus ? (
                                    <>
                                        <Text style={[typography.bodySmall, { color: colors.textSecondary, marginTop: spacing.xs }]}>
                                            Status: {statusLabel}
                                        </Text>
                                        {timingLabel !== '' && (
                                            <Text style={[typography.bodySmall, { color: colors.textSecondary, marginTop: 2 }]}>
                                                {timingLabel}
                                            </Text>
                                        )}
                                        {monthlyRent !== null && (
                                            <View style={{ marginTop: spacing.lg }}>
                                                <Text style={[typography.bodySmall, { color: colors.textSecondary }]}>
                                                    Monthly Rent
                                                </Text>
                                                <Text
                                                    style={[
                                                        typography.h3,
                                                        {
                                                            color: colors.text,
                                                            marginTop: spacing.xs,
                                                            fontWeight: '700',
                                                        },
                                                    ]}
                                                >
                                                    UGX {monthlyRent.toLocaleString()}/month
                                                </Text>
                                            </View>
                                        )}
                                        <View style={{ marginTop: spacing.md }}>
                                            <Text style={[typography.bodySmall, { color: colors.textSecondary }]}>
                                                Due Date
                                            </Text>
                                            <Text style={[typography.body, { color: colors.text, marginTop: 2 }]}>
                                                {formattedDueDate}
                                            </Text>
                                        </View>
                                        {pastArrears > 0 && (
                                            <View style={{ marginTop: spacing.md }}>
                                                <Text style={[typography.bodySmall, { color: colors.textSecondary }]}>
                                                    Past Arrears
                                                </Text>
                                                <Text style={[typography.body, { color: colors.error, marginTop: 2, fontWeight: '600' }]}>
                                                    UGX {pastArrears.toLocaleString()}
                                                </Text>
                                            </View>
                                        )}
                                        {remainingThisPeriod > 0 && (
                                            <View style={{ marginTop: spacing.md }}>
                                                <Text style={[typography.bodySmall, { color: colors.textSecondary }]}>
                                                    Outstanding This Period
                                                </Text>
                                                <Text style={[typography.body, { color: colors.warning, marginTop: 2, fontWeight: '600' }]}>
                                                    UGX {remainingThisPeriod.toLocaleString()}
                                                </Text>
                                            </View>
                                        )}
                                    </>
                                ) : (
                                    <Text style={[typography.body, { color: colors.textSecondary, marginTop: spacing.xs }]}>
                                        We couldn't load your rent status right now. Please try again later.
                                    </Text>
                                )}
                            </View>
                        </View>
                    </Card>
                )}

                {/* Property Information */}
                {activeLease && (
                    <View style={{ marginBottom: spacing.lg }}>
                        <Text style={[typography.h3, { color: colors.text, marginBottom: spacing.md }]}>
                            Your Property
                        </Text>
                        <Card style={{ padding: spacing.lg }}>
                            {/* Property Name */}
                            <View style={{ flexDirection: 'row', alignItems: 'flex-start', marginBottom: spacing.md }}>
                                <View style={{
                                    backgroundColor: colors.primary + '15',
                                    width: 40,
                                    height: 40,
                                    borderRadius: 20,
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    marginRight: spacing.md,
                                }}>
                                    <Ionicons name="business" size={20} color={colors.primary} />
                                </View>
                                <View style={{ flex: 1 }}>
                                    <Text style={[typography.bodySmall, { color: colors.textSecondary }]}>
                                        Property Name
                                    </Text>
                                    <Text style={[typography.h4, { color: colors.text, marginTop: 4 }]}>
                                        {propertyName}
                                    </Text>
                                </View>
                            </View>

                            <View style={{ height: 1, backgroundColor: colors.divider, marginBottom: spacing.md }} />

                            {/* Location */}
                            <View style={{ flexDirection: 'row', alignItems: 'flex-start', marginBottom: spacing.md }}>
                                <View style={{
                                    backgroundColor: colors.accent + '15',
                                    width: 40,
                                    height: 40,
                                    borderRadius: 20,
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    marginRight: spacing.md,
                                }}>
                                    <Ionicons name="location" size={20} color={colors.accent} />
                                </View>
                                <View style={{ flex: 1 }}>
                                    <Text style={[typography.bodySmall, { color: colors.textSecondary }]}>
                                        Location
                                    </Text>
                                    <Text style={[typography.body, { color: colors.text, marginTop: 4 }]}>
                                        {propertyLocation}
                                    </Text>
                                </View>
                            </View>

                            <View style={{ height: 1, backgroundColor: colors.divider, marginBottom: spacing.md }} />

                            {/* Unit Number */}
                            <View style={{ flexDirection: 'row', alignItems: 'flex-start' }}>
                                <View style={{
                                    backgroundColor: colors.success + '15',
                                    width: 40,
                                    height: 40,
                                    borderRadius: 20,
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    marginRight: spacing.md,
                                }}>
                                    <Ionicons name="home" size={20} color={colors.success} />
                                </View>
                                <View style={{ flex: 1 }}>
                                    <Text style={[typography.bodySmall, { color: colors.textSecondary }]}>
                                        Unit Number
                                    </Text>
                                    <Text style={[typography.h4, { color: colors.text, marginTop: 4 }]}>
                                        {unitNumber}
                                    </Text>
                                </View>
                            </View>
                        </Card>
                    </View>
                )}

                {/* Information Notice */}
                <View style={{
                    backgroundColor: colors.infoLight,
                    padding: spacing.lg,
                    borderRadius: borderRadius.md,
                    borderLeftWidth: 4,
                    borderLeftColor: colors.info,
                }}>
                    <View style={{ flexDirection: 'row', alignItems: 'flex-start' }}>
                        <Ionicons name="shield-checkmark" size={24} color={colors.info} style={{ marginRight: spacing.md }} />
                        <View style={{ flex: 1 }}>
                            <Text style={[typography.h4, { color: colors.info, marginBottom: spacing.xs }]}>
                                Important Information
                            </Text>
                            <Text style={[typography.body, { color: colors.info, lineHeight: 20 }]}>
                                All rent information displayed here is accurate and up to date. For payment history or to make a payment, use the Payments tab.
                            </Text>
                        </View>
                    </View>
                </View>
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
