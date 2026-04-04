import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Platform, RefreshControl, ActivityIndicator } from 'react-native';
import { useTheme } from '../../theme/ThemeContext';
import { useAuth } from '../../context/AuthContext';
import { useManagerDashboard } from '../../hooks/useManagerDashboard';
import { useProperties } from '../../context/PropertyContext';
import { usePayments } from '../../context/PaymentContext';
import { MetricCard } from '../../components/MetricCard';
import { Card } from '../../components/Card';
import { Button } from '../../components/Button';
import { StatusBadge } from '../../components/StatusBadge';
import { TopAppBar } from '../../components/TopAppBar';
import { Modal } from '../../components/Modal';
import { ScreenWrapper } from '../../components/ScreenWrapper';
import { OccupiedUnitsModal } from './OccupiedUnitsModal';
import { InviteTenantModal } from './InviteTenantModal';
import { RecordPaymentModal } from './RecordPaymentModal';
import { SendReminderModal } from './SendReminderModal';
import { ActivityDetailsModal } from './ActivityDetailsModal';
import { OwnerCenter } from '../../components/OwnerCenter';
import { Ionicons } from '@expo/vector-icons';
import { useManagerEnforcement } from '../../hooks/useManagerEnforcement';
import { handleEnforcement } from '../../utils/enforcementNavigation';
import { formatUGX, formatUGXCompact, formatPercentage } from '../../utils/formatters';

interface ManagerDashboardProps {
    navigation: any;
    route?: any;
}

export const ManagerDashboard: React.FC<ManagerDashboardProps> = ({ navigation, route }) => {
    const { colors, spacing, typography, borderRadius } = useTheme();
    const { user } = useAuth();
    const { data: dashboardData, loading, error, refetch } = useManagerDashboard();
    const { properties, getTotalOccupiedUnits, getTotalVacancies, isOwner } = useProperties();
    const { getTotalRentCollected, getOutstandingRent } = usePayments();
    const { checkEnforcement, checking: checkingEnforcement } = useManagerEnforcement();

    const [showOccupiedModal, setShowOccupiedModal] = useState(false);
    const [showInviteModal, setShowInviteModal] = useState(false);
    const [showRecordPaymentModal, setShowRecordPaymentModal] = useState(false);
    const [showSendReminderModal, setShowSendReminderModal] = useState(false);
    const [showActivityModal, setShowActivityModal] = useState(false);
    const [selectedActivity, setSelectedActivity] = useState<any>(null);
    const [showNotificationsModal, setShowNotificationsModal] = useState(false);
    const [profileImage, setProfileImage] = useState<string | null>(null);
    const [showAllActivitiesModal, setShowAllActivitiesModal] = useState(false);
    const [refreshing, setRefreshing] = useState(false);

    // Check if user is an owner
    const isUserOwner = isOwner();

    // Pull-to-refresh handler
    const onRefresh = async () => {
        setRefreshing(true);
        await refetch();
        setRefreshing(false);
    };

    // Auto-refresh when screen comes into focus (silent refresh)
    useEffect(() => {
        const unsubscribe = navigation.addListener('focus', () => {
            refetch();
        });
        return unsubscribe;
    }, [navigation, refetch]);

    // Auto-refresh when navigating back with refresh flag (silent refresh)
    useEffect(() => {
        if (route?.params?.refresh) {
            refetch();
            // Clear the refresh param to avoid re-triggering
            navigation.setParams({ refresh: undefined });
        }
    }, [route?.params?.refresh, refetch, navigation]);

    // Dashboard data calculations
    const totalProperties = dashboardData?.propertiesCount ?? 0;
    const totalUnits = dashboardData?.unitsCount ?? 0;
    const occupiedUnits = dashboardData?.occupiedUnitsCount ?? 0;
    const vacancies = totalUnits - occupiedUnits;
    const rentCollected = dashboardData?.rentCollectedAmount ?? 0;
    const outstandingRent = dashboardData?.outstandingRentAmount ?? 0;
    const overdueTenantCount = dashboardData?.overdueCount ?? 0;

    // Transform API data into activity feed
    const paymentActivities = (dashboardData?.recentPayments ?? []).slice(0, 5).map(payment => ({
        id: `payment-${payment.id}`,
        type: 'payment' as const,
        title: `Rent paid for Unit ${payment.unit.unitNumber}`,
        description: `Payment received for ${payment.property.name}`,
        timestamp: payment.paymentDate,
        icon: 'checkmark-circle' as const,
        iconColor: colors.success,
        iconBg: colors.successLight,
        tenantId: payment.tenantId,
        propertyName: payment.property.name,
    }));

    const invitationActivities = (dashboardData?.recentInvitations ?? []).slice(0, 5).map(inv => ({
        id: `invitation-${inv.id}`,
        type: 'invitation' as const,
        title: inv.status === 'ACCEPTED'
            ? `Tenant accepted invitation to Unit ${inv.unit.unitNumber}`
            : `Invitation sent for Unit ${inv.unit.unitNumber}`,
        description: inv.property.name,
        timestamp: inv.respondedAt || inv.createdAt,
        icon: inv.status === 'ACCEPTED' ? 'checkmark-circle' : 'person-add' as const,
        iconColor: inv.status === 'ACCEPTED' ? colors.success : colors.info,
        iconBg: inv.status === 'ACCEPTED' ? colors.successLight : colors.infoLight,
        tenantId: inv.tenantId,
        propertyName: inv.property.name,
    }));

    const recentActivities = [...paymentActivities, ...invitationActivities]
        .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
        .slice(0, 5);

    const handleActivityPress = (activity: any) => {
        setSelectedActivity(activity);
        setShowActivityModal(true);
    };

    const handleInviteTenantPress = async () => {
        if (__DEV__) {
            console.log('[ManagerDashboard] Invite Tenant button pressed');
        }

        // Check enforcement before opening modal
        const { canProceed, enforcement } = await checkEnforcement('Invite Tenant');

        if (!canProceed && enforcement) {
            if (__DEV__) {
                console.log('[ManagerDashboard] Enforcement blocked Invite Tenant modal');
            }
            // Navigate to billing/terms screen
            await handleEnforcement(navigation, enforcement, { blockedFeature: 'Invite Tenant' });
            return;
        }

        // Enforcement passed or not needed, open modal
        setShowInviteModal(true);
    };

    // Calculate occupancy rate
    const occupancyRate = totalUnits > 0 ? (occupiedUnits / totalUnits) * 100 : 0;

    return (
        <ScreenWrapper>
            {/* Top App Bar */}
            <TopAppBar
                onNotificationsPress={() => setShowNotificationsModal(true)}
                onProfilePress={() => navigation.navigate('Profile')}
                onStatusPress={() => navigation.navigate('OutstandingRent')}
                profileImage={profileImage}
                notificationCount={3}
                pendingPayments={overdueTenantCount}
                remindersCount={0}
                propertyCount={properties.length}
                unitCount={totalUnits}
            />

            <ScrollView
                contentContainerStyle={{
                    padding: spacing.base,
                    paddingBottom: Platform.OS === 'android' ? 115 : 64
                }}
                refreshControl={
                    <RefreshControl
                        refreshing={refreshing}
                        onRefresh={onRefresh}
                        tintColor={colors.primary}
                        colors={[colors.primary]}
                    />
                }
            >

                {/* Owner Center - Only show if user is an owner */}
                {isUserOwner && (
                    <OwnerCenter navigation={navigation} />
                )}

                {/* Empty State - No Properties */}
                {!loading && totalProperties === 0 && (
                    <Card style={{ marginBottom: spacing.lg, padding: spacing.xl, alignItems: 'center' }}>
                        <View
                            style={{
                                backgroundColor: colors.primary + '15',
                                width: 80,
                                height: 80,
                                borderRadius: 40,
                                alignItems: 'center',
                                justifyContent: 'center',
                                marginBottom: spacing.lg,
                            }}
                        >
                            <Ionicons name="home-outline" size={40} color={colors.primary} />
                        </View>
                        <Text style={[typography.h3, { color: colors.text, textAlign: 'center', marginBottom: spacing.sm }]}>
                            Add Your First Property
                        </Text>
                        <Text style={[typography.body, { color: colors.textSecondary, textAlign: 'center', marginBottom: spacing.lg }]}>
                            Start managing your properties by adding your first one
                        </Text>
                        <Button
                            title="Add Property"
                            onPress={() => navigation.navigate('Properties')}
                            variant="primary"
                            size="medium"
                        />
                    </Card>
                )}

                {/* Outstanding Rent Hero Card */}
                {!loading && totalProperties > 0 && outstandingRent > 0 && (
                    <TouchableOpacity onPress={() => navigation.navigate('OutstandingRent')} activeOpacity={0.7}>
                        <Card style={{ marginBottom: spacing.lg, padding: spacing.lg }}>
                            <View style={styles.outstandingHeader}>
                                <View style={{ flex: 1 }}>
                                    <Text style={[typography.bodySmall, { color: colors.textSecondary, textTransform: 'uppercase', letterSpacing: 0.8, fontSize: 11, fontWeight: '600' }]}>
                                        Outstanding Rent
                                    </Text>
                                    <Text style={{ fontSize: 36, fontWeight: '700', color: colors.error, marginTop: spacing.sm, letterSpacing: -1 }}>
                                        {formatUGXCompact(outstandingRent)}
                                    </Text>
                                    <Text style={[typography.bodySmall, { color: colors.textTertiary, marginTop: spacing.xs }]}>
                                        {formatUGX(outstandingRent)}
                                    </Text>
                                </View>
                                <View
                                    style={{
                                        backgroundColor: colors.errorLight,
                                        width: 64,
                                        height: 64,
                                        borderRadius: 32,
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                    }}
                                >
                                    <Ionicons name="alert-circle" size={32} color={colors.error} />
                                </View>
                            </View>
                            <View style={{ marginTop: spacing.md, paddingTop: spacing.md, borderTopWidth: 1, borderTopColor: colors.divider }}>
                                <Text style={[typography.bodySmall, { color: colors.textSecondary }]}>
                                    {overdueTenantCount} {overdueTenantCount === 1 ? 'tenant' : 'tenants'} with overdue payments
                                </Text>
                            </View>
                        </Card>
                    </TouchableOpacity>
                )}

                {/* Overview Section */}
                {!loading && totalProperties > 0 && (
                    <View style={{ marginBottom: spacing.lg }}>
                        <Text style={[typography.h3, { color: colors.text, marginBottom: spacing.md }]}>
                            Overview
                        </Text>
                        <View style={{ gap: spacing.sm }}>
                            <TouchableOpacity onPress={() => navigation.navigate('Properties')}>
                                <MetricCard
                                    variant="compact"
                                    value={totalProperties.toString()}
                                    label="Properties"
                                    icon={<Ionicons name="business" size={18} color={colors.primary} />}
                                    color={colors.primary}
                                />
                            </TouchableOpacity>
                            <TouchableOpacity onPress={() => setShowOccupiedModal(true)}>
                                <MetricCard
                                    variant="compact"
                                    value={`${occupiedUnits}/${totalUnits}`}
                                    label="Occupancy"
                                    subtitle={`${formatPercentage(occupancyRate)} occupied`}
                                    icon={<Ionicons name="people" size={18} color={colors.success} />}
                                    color={colors.success}
                                />
                            </TouchableOpacity>
                            <TouchableOpacity onPress={() => setShowOccupiedModal(true)}>
                                <MetricCard
                                    variant="compact"
                                    value={vacancies.toString()}
                                    label="Vacancies"
                                    icon={<Ionicons name="home-outline" size={18} color={colors.warning} />}
                                    color={colors.warning}
                                />
                            </TouchableOpacity>
                            <TouchableOpacity onPress={() => navigation.navigate('RentCollection')}>
                                <MetricCard
                                    variant="compact"
                                    value={formatUGXCompact(rentCollected)}
                                    label="Rent Collected"
                                    subtitle={formatUGX(rentCollected)}
                                    icon={<Ionicons name="cash-outline" size={18} color={colors.success} />}
                                    color={colors.success}
                                />
                            </TouchableOpacity>
                            <TouchableOpacity onPress={() => navigation.navigate('ManagerPayments')}>
                                <MetricCard
                                    variant="compact"
                                    value="View"
                                    label="Payments"
                                    icon={<Ionicons name="card-outline" size={18} color={colors.info} />}
                                    color={colors.info}
                                />
                            </TouchableOpacity>
                            <TouchableOpacity onPress={() => navigation.navigate('ManagerPaymentClaims')}>
                                <MetricCard
                                    variant="compact"
                                    value="Review"
                                    label="Payment Claims"
                                    icon={<Ionicons name="document-text-outline" size={18} color={colors.warning} />}
                                    color={colors.warning}
                                />
                            </TouchableOpacity>
                        </View>
                    </View>
                )}

                {/* Skeleton Loading State */}
                {loading && (
                    <View style={{ marginBottom: spacing.lg }}>
                        <View style={{ gap: spacing.sm }}>
                            {[1, 2, 3, 4].map((i) => (
                                <Card key={i} style={{ padding: spacing.md }}>
                                    <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                                        <View style={{ width: 36, height: 36, borderRadius: 18, backgroundColor: colors.border, marginRight: 12 }} />
                                        <View style={{ flex: 1 }}>
                                            <View style={{ width: '40%', height: 10, backgroundColor: colors.border, borderRadius: 4, marginBottom: 6 }} />
                                            <View style={{ width: '60%', height: 16, backgroundColor: colors.border, borderRadius: 4 }} />
                                        </View>
                                    </View>
                                </Card>
                            ))}
                        </View>
                    </View>
                )}

                {/* Quick Actions */}
                {!loading && totalProperties > 0 && (
                    <View style={{ marginBottom: spacing.lg }}>
                        <Text style={[typography.h3, { color: colors.text, marginBottom: spacing.md }]}>
                            Quick Actions
                        </Text>
                        <View style={styles.actionsGrid}>
                            <ActionButton
                                icon="person-add"
                                label={checkingEnforcement ? 'Checking...' : 'Invite Tenant'}
                                onPress={handleInviteTenantPress}
                                colors={colors}
                                spacing={spacing}
                                borderRadius={borderRadius}
                                disabled={checkingEnforcement}
                            />
                            <ActionButton
                                icon="card"
                                label="Record Payment"
                                onPress={() => setShowRecordPaymentModal(true)}
                                colors={colors}
                                spacing={spacing}
                                borderRadius={borderRadius}
                            />
                            <ActionButton
                                icon="notifications"
                                label="Send Reminder"
                                onPress={() => setShowSendReminderModal(true)}
                                colors={colors}
                                spacing={spacing}
                                borderRadius={borderRadius}
                            />
                        </View>
                    </View>
                )}

                {/* Recent Activity */}
                {!loading && totalProperties > 0 && (
                    <View style={{ marginBottom: spacing['2xl'] }}>
                        <View style={[styles.sectionHeader, { marginBottom: spacing.md }]}>
                            <Text style={[typography.h3, { color: colors.text }]}>Recent Activity</Text>
                            <TouchableOpacity onPress={() => setShowAllActivitiesModal(true)}>
                                <Text style={[typography.bodySmall, { color: colors.primary, fontWeight: '600' }]}>
                                    View all
                                </Text>
                            </TouchableOpacity>
                        </View>

                        {error ? (
                            <Card style={{ padding: spacing.lg }}>
                                <Text style={[typography.body, { color: colors.error }]}>
                                    Failed to load activity
                                </Text>
                                <TouchableOpacity onPress={refetch} style={{ marginTop: spacing.sm }}>
                                    <Text style={[typography.bodySmall, { color: colors.primary }]}>
                                        Tap to retry
                                    </Text>
                                </TouchableOpacity>
                            </Card>
                        ) : recentActivities.length === 0 ? (
                            <Card style={{ padding: spacing.xl, alignItems: 'center' }}>
                                <View
                                    style={{
                                        backgroundColor: colors.primary + '15',
                                        width: 64,
                                        height: 64,
                                        borderRadius: 32,
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        marginBottom: spacing.md,
                                    }}
                                >
                                    <Ionicons name="time-outline" size={32} color={colors.primary} />
                                </View>
                                <Text style={[typography.h4, { color: colors.text, textAlign: 'center', marginBottom: spacing.xs }]}>
                                    No Recent Activity
                                </Text>
                                <Text style={[typography.bodySmall, { color: colors.textSecondary, textAlign: 'center' }]}>
                                    Activity will appear here as tenants interact with your properties
                                </Text>
                            </Card>
                        ) : (
                            <Card noPadding>
                                {recentActivities.slice(0, 3).map((activity, index) => (
                                    <React.Fragment key={activity.id}>
                                        <ActivityItem
                                            title={activity.title}
                                            time={new Date(activity.timestamp).toLocaleDateString()}
                                            icon={activity.icon}
                                            iconColor={activity.iconColor}
                                            iconBg={activity.iconBg}
                                            onPress={() => handleActivityPress(activity)}
                                            colors={colors}
                                            spacing={spacing}
                                        />
                                        {index < Math.min(recentActivities.length, 3) - 1 && (
                                            <View style={{ height: 1, backgroundColor: colors.divider, marginHorizontal: spacing.base }} />
                                        )}
                                    </React.Fragment>
                                ))}
                            </Card>
                        )}
                    </View>
                )}

                {/* Modals */}
                <OccupiedUnitsModal visible={showOccupiedModal} onClose={() => setShowOccupiedModal(false)} />
                <InviteTenantModal visible={showInviteModal} onClose={() => setShowInviteModal(false)} onSuccess={refetch} />
                <RecordPaymentModal visible={showRecordPaymentModal} onClose={() => setShowRecordPaymentModal(false)} onSuccess={refetch} />
                <SendReminderModal visible={showSendReminderModal} onClose={() => setShowSendReminderModal(false)} />
                <ActivityDetailsModal
                    visible={showActivityModal}
                    onClose={() => {
                        setShowActivityModal(false);
                        setSelectedActivity(null);
                    }}
                    activity={selectedActivity}
                    onViewReceipt={() => {
                        // Navigate to Profile > Receipt History
                        navigation.navigate('Profile', { openReceiptHistory: true });
                    }}
                    onViewTenant={() => {
                        // Navigate to Tenants tab
                        navigation.navigate('Tenants');
                    }}
                    onTrackMaintenance={() => {
                        // Navigate to Properties tab (maintenance tracking)
                        navigation.navigate('Properties');
                    }}
                />

                {/* All Activities Modal */}
                <Modal
                    visible={showAllActivitiesModal}
                    onClose={() => setShowAllActivitiesModal(false)}
                    title="All Activity"
                    size="large"
                >
                    <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: spacing.lg }}>
                        {recentActivities.map((activity, index) => (
                            <React.Fragment key={activity.id}>
                                <TouchableOpacity
                                    onPress={() => {
                                        setShowAllActivitiesModal(false);
                                        setTimeout(() => {
                                            setSelectedActivity(activity);
                                            setShowActivityModal(true);
                                        }, 300);
                                    }}
                                    activeOpacity={0.7}
                                    style={{
                                        flexDirection: 'row',
                                        padding: spacing.md,
                                        alignItems: 'center',
                                    }}
                                >
                                    <View
                                        style={{
                                            backgroundColor: activity.iconBg,
                                            width: 44,
                                            height: 44,
                                            borderRadius: 22,
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            marginRight: spacing.md,
                                        }}
                                    >
                                        <Ionicons name={activity.icon as any} size={22} color={activity.iconColor} />
                                    </View>
                                    <View style={{ flex: 1 }}>
                                        <Text style={[typography.body, { color: colors.text }]} numberOfLines={1}>
                                            {activity.title}
                                        </Text>
                                        <Text style={[typography.bodySmall, { color: colors.textSecondary, marginTop: 2 }]}>
                                            {new Date(activity.timestamp).toLocaleDateString()}
                                        </Text>
                                    </View>
                                    <Ionicons name="chevron-forward" size={20} color={colors.textSecondary} />
                                </TouchableOpacity>
                                {index < recentActivities.length - 1 && (
                                    <View style={{ height: 1, backgroundColor: colors.divider, marginHorizontal: spacing.md }} />
                                )}
                            </React.Fragment>
                        ))}
                    </ScrollView>
                </Modal>
            </ScrollView>
        </ScreenWrapper>
    );
};

// Action Button Component
interface ActionButtonProps {
    icon: any;
    label: string;
    onPress: () => void;
    colors: any;
    spacing: any;
    borderRadius: any;
    disabled?: boolean;
}

const ActionButton: React.FC<ActionButtonProps> = ({
    icon,
    label,
    onPress,
    colors,
    spacing,
    borderRadius,
    disabled = false,
}) => (
    <TouchableOpacity
        onPress={onPress}
        disabled={disabled}
        style={{
            backgroundColor: colors.surface,
            padding: spacing.base,
            borderRadius: borderRadius.md,
            alignItems: 'center',
            flex: 1,
            marginHorizontal: spacing.xs,
            opacity: disabled ? 0.6 : 1,
        }}
    >
        <View
            style={{
                backgroundColor: colors.primary,
                width: 48,
                height: 48,
                borderRadius: 24,
                alignItems: 'center',
                justifyContent: 'center',
                marginBottom: spacing.sm,
            }}
        >
            <Ionicons name={icon} size={24} color="#FFFFFF" />
        </View>
        <Text
            style={{
                fontSize: 12,
                color: colors.text,
                fontWeight: '600',
                textAlign: 'center',
            }}
        >
            {label}
        </Text>
    </TouchableOpacity>
);

// Activity Item Component
interface ActivityItemProps {
    title: string;
    time: string;
    icon: any;
    iconColor: string;
    iconBg: string;
    onPress?: () => void;  // Optional onPress handler
    colors: any;
    spacing: any;
}

const ActivityItem: React.FC<ActivityItemProps> = ({
    title,
    time,
    icon,
    iconColor,
    iconBg,
    onPress,
    colors,
    spacing,
}) => (
    <TouchableOpacity
        onPress={onPress}
        activeOpacity={0.7}
        style={{ flexDirection: 'row', padding: spacing.base, alignItems: 'center' }}
    >
        <View
            style={{
                backgroundColor: iconBg,
                width: 40,
                height: 40,
                borderRadius: 20,
                alignItems: 'center',
                justifyContent: 'center',
                marginRight: spacing.md,
            }}
        >
            <Ionicons name={icon} size={20} color={iconColor} />
        </View>
        <View style={{ flex: 1 }}>
            <Text style={{ fontSize: 14, color: colors.text, marginBottom: 2 }}>{title}</Text>
            <Text style={{ fontSize: 12, color: colors.textSecondary }}>{time}</Text>
        </View>
        <Ionicons name="chevron-forward" size={20} color={colors.textSecondary} />
    </TouchableOpacity>
);

const styles = StyleSheet.create({
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    notificationButton: {
        alignItems: 'center',
        justifyContent: 'center',
        position: 'relative',
    },
    badge: {
        position: 'absolute',
        top: 8,
        right: 8,
        width: 10,
        height: 10,
        borderRadius: 5,
        borderWidth: 2,
        borderColor: '#FFFFFF',
    },
    metricsGrid: {
        flexDirection: 'row',
    },
    outstandingHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    actionsGrid: {
        flexDirection: 'row',
        marginHorizontal: -4,
    },
    sectionHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
});
