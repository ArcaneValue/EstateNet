import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
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
import { OccupiedUnitsModal } from './OccupiedUnitsModal';
import { InviteTenantModal } from './InviteTenantModal';
import { RecordPaymentModal } from './RecordPaymentModal';
import { SendReminderModal } from './SendReminderModal';
import { ActivityDetailsModal } from './ActivityDetailsModal';
import { OwnerCenter } from '../../components/OwnerCenter';
import { Ionicons } from '@expo/vector-icons';

interface ManagerDashboardProps {
    navigation: any;
}

export const ManagerDashboard: React.FC<ManagerDashboardProps> = ({ navigation }) => {
    const { colors, spacing, typography, borderRadius } = useTheme();
    const { user } = useAuth();
    const { data: dashboardData, loading, error, refetch } = useManagerDashboard();
    const { properties, getTotalOccupiedUnits, getTotalVacancies, isOwner } = useProperties();
    const { getTotalRentCollected, getOutstandingRent } = usePayments();

    const [showOccupiedModal, setShowOccupiedModal] = useState(false);
    const [showInviteModal, setShowInviteModal] = useState(false);
    const [showRecordPaymentModal, setShowRecordPaymentModal] = useState(false);
    const [showSendReminderModal, setShowSendReminderModal] = useState(false);
    const [showActivityModal, setShowActivityModal] = useState(false);
    const [selectedActivity, setSelectedActivity] = useState<any>(null);
    const [showNotificationsModal, setShowNotificationsModal] = useState(false);
    const [profileImage, setProfileImage] = useState<string | null>(null);
    const [showAllActivitiesModal, setShowAllActivitiesModal] = useState(false);

    // Check if user is an owner
    const isUserOwner = isOwner();

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

    return (
        <View style={{ flex: 1, backgroundColor: colors.background }}>
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

            <ScrollView contentContainerStyle={{ padding: spacing.base }}>

                {/* Owner Center - Only show if user is an owner */}
                {isUserOwner && (
                    <OwnerCenter navigation={navigation} />
                )}

                {/* Metrics Grid */}
                <View style={[styles.metricsGrid, { marginBottom: spacing.lg }]}>
                    <TouchableOpacity style={{ flex: 1, marginRight: spacing.sm }} onPress={() => navigation.navigate('Properties')}>
                        <MetricCard
                            value={loading ? '...' : totalProperties.toString()}
                            label="Total Properties"
                            icon={
                                <View
                                    style={{
                                        backgroundColor: colors.primary + '20',
                                        width: 40,
                                        height: 40,
                                        borderRadius: 20,
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                    }}
                                >
                                    <Ionicons name="business" size={20} color={colors.primary} />
                                </View>
                            }
                            color={colors.primary}
                        />
                    </TouchableOpacity>
                    <TouchableOpacity style={{ flex: 1, marginLeft: spacing.sm }} onPress={() => setShowOccupiedModal(true)}>
                        <MetricCard
                            value={loading ? '...' : `${occupiedUnits}/${totalUnits}`}
                            label="Occupied Units"
                            icon={
                                <View
                                    style={{
                                        backgroundColor: colors.success + '20',
                                        width: 40,
                                        height: 40,
                                        borderRadius: 20,
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                    }}
                                >
                                    <Ionicons name="people" size={20} color={colors.success} />
                                </View>
                            }
                            trend={{ value: '+5%', isPositive: true }}
                            color={colors.success}
                        />
                    </TouchableOpacity>
                </View>

                <View style={[styles.metricsGrid, { marginBottom: spacing.lg }]}>
                    <TouchableOpacity style={{ flex: 1, marginRight: spacing.sm }} onPress={() => setShowOccupiedModal(true)}>
                        <MetricCard
                            value={loading ? '...' : vacancies.toString()}
                            label="Vacancies"
                            icon={
                                <View
                                    style={{
                                        backgroundColor: colors.warning + '20',
                                        width: 40,
                                        height: 40,
                                        borderRadius: 20,
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                    }}
                                >
                                    <Ionicons name="home-outline" size={20} color={colors.warning} />
                                </View>
                            }
                            color={colors.warning}
                        />
                    </TouchableOpacity>
                    <TouchableOpacity style={{ flex: 1, marginLeft: spacing.sm }} onPress={() => navigation.navigate('RentCollection')}>
                        <MetricCard
                            value={loading ? '...' : `UGX ${(rentCollected / 1000000).toFixed(1)}M`}
                            label="Rent Collected"
                            icon={
                                <View
                                    style={{
                                        backgroundColor: colors.accent + '20',
                                        width: 40,
                                        height: 40,
                                        borderRadius: 20,
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                    }}
                                >
                                    <Ionicons name="cash" size={20} color={colors.accent} />
                                </View>
                            }
                            trend={{ value: '+12%', isPositive: true }}
                            color={colors.text}
                        />
                    </TouchableOpacity>
                </View>

                {/* Outstanding Rent Card */}
                <TouchableOpacity onPress={() => navigation.navigate('OutstandingRent')} activeOpacity={0.7}>
                    <Card style={{ marginBottom: spacing.lg, padding: spacing.lg }}>
                        <View style={styles.outstandingHeader}>
                            <View>
                                <Text style={[typography.bodySmall, { color: colors.textSecondary }]}>
                                    Outstanding Rent
                                </Text>
                                <Text style={[typography.h2, { color: colors.error, marginTop: spacing.sm }]}>
                                    {loading ? '...' : `UGX ${(outstandingRent / 1000000).toFixed(1)}M`}
                                </Text>
                            </View>
                            <View
                                style={{
                                    backgroundColor: colors.errorLight,
                                    width: 56,
                                    height: 56,
                                    borderRadius: 28,
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                }}
                            >
                                <Ionicons name="alert-circle" size={28} color={colors.error} />
                            </View>
                        </View>
                        <Text style={[typography.bodySmall, { color: colors.textSecondary, marginTop: spacing.md }]}>
                            {loading ? '...' : `${overdueTenantCount} tenants with overdue payments`}
                        </Text>
                    </Card>
                </TouchableOpacity>

                {/* Quick Actions */}
                <View style={{ marginBottom: spacing.lg }}>
                    <Text style={[typography.h3, { color: colors.text, marginBottom: spacing.md }]}>
                        Quick Actions
                    </Text>
                    <View style={styles.actionsGrid}>
                        <ActionButton
                            icon="person-add"
                            label="Invite Tenant"
                            onPress={() => setShowInviteModal(true)}
                            colors={colors}
                            spacing={spacing}
                            borderRadius={borderRadius}
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

                {/* Recent Activity */}
                <View style={{ marginBottom: spacing['2xl'] }}>
                    <View style={[styles.sectionHeader, { marginBottom: spacing.md }]}>
                        <Text style={[typography.h3, { color: colors.text }]}>Recent Activity</Text>
                        <TouchableOpacity onPress={() => setShowAllActivitiesModal(true)}>
                            <Text style={[typography.bodySmall, { color: colors.primary, fontWeight: '600' }]}>
                                View all
                            </Text>
                        </TouchableOpacity>
                    </View>

                    {loading ? (
                        <Card noPadding>
                            <ActivityItem
                                title="Loading..."
                                time=""
                                icon="ellipsis-horizontal"
                                iconColor={colors.textSecondary}
                                iconBg={colors.surface}
                                colors={colors}
                                spacing={spacing}
                            />
                        </Card>
                    ) : error ? (
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
                        <Card style={{ padding: spacing.lg }}>
                            <Text style={[typography.body, { color: colors.textSecondary }]}>
                                No recent activity
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

                {/* Modals */}
                <OccupiedUnitsModal visible={showOccupiedModal} onClose={() => setShowOccupiedModal(false)} />
                <InviteTenantModal visible={showInviteModal} onClose={() => setShowInviteModal(false)} onSuccess={refetch} />
                <RecordPaymentModal visible={showRecordPaymentModal} onClose={() => setShowRecordPaymentModal(false)} />
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
        </View>
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
}

const ActionButton: React.FC<ActionButtonProps> = ({
    icon,
    label,
    onPress,
    colors,
    spacing,
    borderRadius,
}) => (
    <TouchableOpacity
        onPress={onPress}
        style={{
            backgroundColor: colors.surface,
            padding: spacing.base,
            borderRadius: borderRadius.md,
            alignItems: 'center',
            flex: 1,
            marginHorizontal: spacing.xs,
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
