import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { useTheme } from '../../theme/ThemeContext';
import { useAuth } from '../../context/AuthContext';
import { useProperties } from '../../context/PropertyContext';
import { useTenants } from '../../context/TenantContext';
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
    const { properties, getTotalOccupiedUnits, getTotalVacancies, isOwner } = useProperties();
    const { myTenants, getOverdueTenants, getInvitationResponsesForManager, allInvitations } = useTenants();
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
    const isUserOwner = user ? isOwner(user.id) : false;

    // Debug logging
    console.log('ManagerDashboard - User:', user);
    console.log('ManagerDashboard - isUserOwner:', isUserOwner);
    console.log('ManagerDashboard - user.id:', user?.id);

    // Get invitation responses for this manager
    const invitationResponses = getInvitationResponsesForManager('manager-1');

    // Convert invitation responses to activity format
    const invitationActivities = invitationResponses.map(inv => ({
        id: inv.id,
        type: inv.status === 'accepted' ? 'tenant_invited_accepted' : 'tenant_invited_rejected',
        title: inv.status === 'accepted'
            ? `Tenant ${inv.tenantId} accepted invitation to ${inv.propertyName}`
            : `Tenant ${inv.tenantId} declined invitation to ${inv.propertyName}`,
        description: inv.status === 'accepted'
            ? `${inv.tenantName} accepted the invitation for Unit ${inv.unitNumber}`
            : `${inv.tenantName} declined the invitation for Unit ${inv.unitNumber}`,
        timestamp: inv.respondedAt?.toISOString() || new Date().toISOString(),
        icon: inv.status === 'accepted' ? 'checkmark-circle' : 'close-circle',
        iconColor: inv.status === 'accepted' ? colors.success : colors.error,
        iconBg: inv.status === 'accepted' ? colors.successLight : colors.errorLight,
        tenantName: inv.tenantName,
        tenantId: inv.tenantId,
        propertyName: inv.propertyName,
    }));

    // All activities data
    const allActivities = [
        ...invitationActivities,
        {
            id: '1',
            type: 'payment',
            title: 'Rent paid by Jane Doe for Unit 101',
            description: 'Payment received for December rent',
            timestamp: new Date(Date.now() - 7200000).toISOString(),
            icon: 'checkmark-circle',
            iconColor: colors.success,
            iconBg: colors.successLight,
            amount: 1200000,
            tenantName: 'Jane Doe',
            propertyName: 'Sunset Apartments',
        },
        {
            id: '2',
            type: 'tenant_added',
            title: 'New tenant request for Unit 204',
            description: 'A new tenant has requested to view Unit 204',
            timestamp: new Date(Date.now() - 18000000).toISOString(),
            icon: 'person-add',
            iconColor: colors.info,
            iconBg: colors.infoLight,
            tenantName: 'Sarah Johnson',
            propertyName: 'Kololo Heights',
        },
        {
            id: '3',
            type: 'maintenance',
            title: 'Maintenance request - Plumbing',
            description: 'Leaking pipe in Unit 102 bathroom needs repair',
            timestamp: new Date(Date.now() - 86400000).toISOString(),
            icon: 'construct',
            iconColor: colors.warning,
            iconBg: colors.warningLight,
            propertyName: 'Sunset Apartments',
        },
        {
            id: '4',
            type: 'payment',
            title: 'Rent paid by Michael Smith for Unit 102',
            description: 'Payment received for December rent',
            timestamp: new Date(Date.now() - 172800000).toISOString(),
            icon: 'checkmark-circle',
            iconColor: colors.success,
            iconBg: colors.successLight,
            amount: 1200000,
            tenantName: 'Michael Smith',
            propertyName: 'Sunset Apartments',
        },
        {
            id: '5',
            type: 'reminder_sent',
            title: 'Payment reminder sent to David Brown',
            description: 'Automated reminder for overdue rent',
            timestamp: new Date(Date.now() - 259200000).toISOString(),
            icon: 'notifications',
            iconColor: colors.warning,
            iconBg: colors.warningLight,
            tenantName: 'David Brown',
            propertyName: 'Kololo Heights',
        },
        {
            id: '6',
            type: 'vacancy',
            title: 'Unit 305 is now vacant',
            description: 'Previous tenant moved out',
            timestamp: new Date(Date.now() - 345600000).toISOString(),
            icon: 'home-outline',
            iconColor: colors.textSecondary,
            iconBg: colors.surface,
            propertyName: 'Greenfield Apartments',
        },
    ];

    const { overdue, pastOverdue } = getOverdueTenants();
    const overdueCount = overdue.length + pastOverdue.length;

    const handleActivityPress = (activity: any) => {
        setSelectedActivity(activity);
        setShowActivityModal(true);
    };

    // Calculate total units across all properties
    const totalUnits = properties.reduce((sum, prop) => sum + (prop.units?.length || 0), 0);

    return (
        <View style={{ flex: 1, backgroundColor: colors.background }}>
            {/* Top App Bar */}
            <TopAppBar
                onNotificationsPress={() => setShowNotificationsModal(true)}
                onProfilePress={() => navigation.navigate('Profile')}
                onStatusPress={() => navigation.navigate('OutstandingRent')}
                profileImage={profileImage}
                notificationCount={3}
                pendingPayments={overdueCount}
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
                            value={properties.length.toString()}
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
                            value={`${getTotalOccupiedUnits()}/${getTotalOccupiedUnits() + getTotalVacancies()}`}
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
                            value={getTotalVacancies().toString()}
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
                            value={`UGX ${(getTotalRentCollected() / 1000000).toFixed(1)}M`}
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
                                    UGX {(getOutstandingRent() / 1000000).toFixed(1)}M
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
                            {overdueCount} tenants with overdue payments
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

                    <Card noPadding>
                        <ActivityItem
                            title="Rent paid by Jane Doe for Unit 101"
                            time="2 hours ago"
                            icon="checkmark-circle"
                            iconColor={colors.success}
                            iconBg={colors.successLight}
                            onPress={() => handleActivityPress({
                                id: '1',
                                type: 'payment',
                                title: 'Rent paid by Jane Doe for Unit 101',
                                description: 'Payment received for December rent',
                                timestamp: new Date(Date.now() - 7200000).toISOString()
                            })}
                            colors={colors}
                            spacing={spacing}
                        />
                        <View style={{ height: 1, backgroundColor: colors.divider, marginHorizontal: spacing.base }} />
                        <ActivityItem
                            title="New tenant request for Unit 204"
                            time="5 hours ago"
                            icon="person-add"
                            iconColor={colors.info}
                            iconBg={colors.infoLight}
                            onPress={() => handleActivityPress({
                                id: '2',
                                type: 'tenant_added',
                                title: 'New tenant request for Unit 204',
                                description: 'A new tenant has requested to view Unit 204',
                                timestamp: new Date(Date.now() - 18000000).toISOString(),
                                tenantName: 'Sarah Johnson'
                            })}
                            colors={colors}
                            spacing={spacing}
                        />
                        <View style={{ height: 1, backgroundColor: colors.divider, marginHorizontal: spacing.base }} />
                        <ActivityItem
                            title="Maintenance request - Plumbing"
                            time="1 day ago"
                            icon="construct"
                            iconColor={colors.warning}
                            iconBg={colors.warningLight}
                            onPress={() => handleActivityPress({
                                id: '3',
                                type: 'maintenance',
                                title: 'Maintenance request - Plumbing',
                                description: 'Leaking pipe in Unit 102 bathroom needs repair',
                                timestamp: new Date(Date.now() - 86400000).toISOString(),
                                propertyName: 'Sunset Apartments'
                            })}
                            colors={colors}
                            spacing={spacing}
                        />
                    </Card>
                </View>

                {/* Modals */}
                <OccupiedUnitsModal visible={showOccupiedModal} onClose={() => setShowOccupiedModal(false)} />
                <InviteTenantModal visible={showInviteModal} onClose={() => setShowInviteModal(false)} />
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
                        {allActivities.map((activity, index) => (
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
                                {index < allActivities.length - 1 && (
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
