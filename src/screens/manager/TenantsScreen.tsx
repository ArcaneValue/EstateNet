import React, { useState, useEffect } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import { View, Text, FlatList, TextInput, Alert, ScrollView, TouchableOpacity, RefreshControl } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '../../theme/ThemeContext';
import { useTutorial, TUTORIAL_KEYS } from '../../context/TutorialContext';
import { TenantListItem } from '../../components/TenantListItem';
import { Modal } from '../../components/Modal';
import { Button } from '../../components/Button';
import { Input } from '../../components/Input';
import { TopAppBar } from '../../components/TopAppBar';
import { TutorialModal } from '../../components/TutorialModal';
import { useProperties } from '../../context/PropertyContext';
import { useAuth } from '../../context/AuthContext';
import { InviteTenantModal } from './InviteTenantModal';
import { InvitationsList, ManagerInvitation } from './InvitationsList';
import { Ionicons } from '@expo/vector-icons';
import { useMessages } from '../../context/MessageContext';
import { apiGet, apiDelete } from '../../utils/apiClient';
import { useManagerEnforcement } from '../../hooks/useManagerEnforcement';
import { handleEnforcement } from '../../utils/enforcementNavigation';

// Manager tenant type includes leaseId for messaging
interface ManagerTenant {
    id: string;
    tenantId: string;
    name: string;
    email: string;
    phoneNumber: string;
    propertyId: string;
    propertyName: string;
    unitId: string;
    unitNumber: string;
    rentAmount: number;
    paymentStatus: 'current' | 'overdue';
    amountOwed: number;
    leaseId: string;
}

export const TenantsScreen: React.FC<any> = ({ navigation }) => {
    const { colors, spacing, typography, borderRadius } = useTheme();
    const { user } = useAuth();
    const { properties } = useProperties();
    const { sendMessage } = useMessages();
    const { checkEnforcement, checking: checkingEnforcement } = useManagerEnforcement();

    // Fetch tenants from manager endpoint (includes leaseId for messaging)
    const [managerTenants, setManagerTenants] = useState<ManagerTenant[]>([]);
    const [tenantsLoading, setTenantsLoading] = useState(false);

    const [selectedTenant, setSelectedTenant] = useState<ManagerTenant | null>(null);
    const [searchQuery, setSearchQuery] = useState('');
    const [showMessageModal, setShowMessageModal] = useState(false);
    const [showReminderModal, setShowReminderModal] = useState(false);
    const [showInviteModal, setShowInviteModal] = useState(false);

    // Toggle between Tenants, Invitations, and Leases
    const [activeTab, setActiveTab] = useState<'tenants' | 'invitations' | 'leases'>('tenants');

    // Invitations state
    const [invitations, setInvitations] = useState<ManagerInvitation[]>([]);
    const [invitationsLoading, setInvitationsLoading] = useState(false);
    const [invitationsError, setInvitationsError] = useState<string | null>(null);
    const [cancellingId, setCancellingId] = useState<string | null>(null);

    // Leases state
    const [leases, setLeases] = useState<any[]>([]);
    const [leasesLoading, setLeasesLoading] = useState(false);
    const [leasesError, setLeasesError] = useState<string | null>(null);
    const [showTutorial, setShowTutorial] = useState(false);
    const [refreshing, setRefreshing] = useState(false);

    // Tutorial
    const { shouldShowTutorial, markTutorialSeen } = useTutorial();

    // Load tenants from backend on mount
    useEffect(() => {
        loadManagerTenants();
        loadInvitations();
        loadLeases();
        checkTutorial();
    }, []);

    // Auto-refresh when screen comes into focus
    useFocusEffect(
        React.useCallback(() => {
            loadManagerTenants();
            loadInvitations();
            loadLeases();
        }, [])
    );

    const checkTutorial = async () => {
        const shouldShow = await shouldShowTutorial(TUTORIAL_KEYS.MANAGER_TENANTS);
        if (shouldShow) {
            setTimeout(() => setShowTutorial(true), 500);
        }
    };

    const handleTutorialClose = async () => {
        await markTutorialSeen(TUTORIAL_KEYS.MANAGER_TENANTS);
        setShowTutorial(false);
    };

    const handleRefresh = async () => {
        setRefreshing(true);
        await Promise.all([
            loadManagerTenants(),
            loadInvitations(),
            loadLeases()
        ]);
        setRefreshing(false);
    };

    const loadInvitations = async () => {
        if (__DEV__) console.log('[Invitations] Fetching manager invitations...');
        setInvitationsLoading(true);
        setInvitationsError(null);
        try {
            const { status, json } = await apiGet('/manager/invitations');
            if (__DEV__) console.log('[Invitations] Response:', { status, count: json?.data?.length });
            if (status === 200 && json?.success && Array.isArray(json.data)) {
                setInvitations(json.data);
                if (__DEV__) console.log(`[Invitations] Loaded ${json.data.length} invitations`);
            } else {
                setInvitations([]);
                if (__DEV__) console.log('[Invitations] Empty or error response');
            }
        } catch (error) {
            console.error('[Invitations] Failed to load:', error);
            setInvitationsError('Failed to load invitations');
            setInvitations([]);
        } finally {
            setInvitationsLoading(false);
        }
    };

    const loadLeases = async () => {
        setLeasesLoading(true);
        setLeasesError(null);
        try {
            const { status, json } = await apiGet('/manager/leases');
            if (status === 200 && json?.success && Array.isArray(json.data)) {
                setLeases(json.data);
            } else {
                setLeases([]);
            }
        } catch (error) {
            console.error('[Leases] Failed to load:', error);
            setLeasesError('Failed to load leases');
            setLeases([]);
        } finally {
            setLeasesLoading(false);
        }
    };

    const loadManagerTenants = async () => {
        setTenantsLoading(true);
        try {
            const { status, json } = await apiGet('/manager/tenants');
            const payload: any = json;
            if (status === 200 && payload && payload.success) {
                const tenants: ManagerTenant[] = Array.isArray(payload.data) ? payload.data : [];
                setManagerTenants(tenants);
            } else {
                setManagerTenants([]);
            }
        } catch (error) {
            console.error('Failed to load manager tenants:', error);
            setManagerTenants([]);
        } finally {
            setTenantsLoading(false);
        }
    };

    const handleCancelInvitation = async (invitationId: string) => {
        Alert.alert(
            'Cancel Invitation',
            'Are you sure you want to cancel this invitation?',
            [
                { text: 'No', style: 'cancel' },
                {
                    text: 'Yes, Cancel',
                    style: 'destructive',
                    onPress: async () => {
                        setCancellingId(invitationId);
                        try {
                            const { status, json } = await apiDelete(`/tenants/invitations/${invitationId}`);
                            if (status === 200 && json?.success) {
                                Alert.alert('Success', 'Invitation cancelled successfully');
                                loadInvitations();
                            } else {
                                Alert.alert('Error', json?.message || 'Failed to cancel invitation');
                            }
                        } catch (error) {
                            console.error('Cancel invitation error:', error);
                            Alert.alert('Error', 'Failed to cancel invitation. Please try again.');
                        } finally {
                            setCancellingId(null);
                        }
                    }
                }
            ]
        );
    };
    const [messageText, setMessageText] = useState('');
    const [reminderText, setReminderText] = useState('Your rent payment is due. Please make the payment at your earliest convenience.');

    const [isSendingMessage, setIsSendingMessage] = useState(false);

    const filteredTenants = managerTenants.filter((tenant: ManagerTenant) =>
        tenant.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        tenant.tenantId.toLowerCase().includes(searchQuery.toLowerCase())
    );

    const getPropertyName = (propertyId?: string) => {
        return properties.find(p => p.id === propertyId)?.name || 'Unknown Property';
    };

    const getUnitNumber = (propertyId?: string, unitId?: string) => {
        const property = properties.find(p => p.id === propertyId);
        return property?.units.find(u => u.id === unitId)?.unitNumber || '?';
    };

    const handleSendTenantMessage = async () => {
        if (!selectedTenant || !messageText.trim()) {
            return;
        }

        // Verify we have the leaseId required by backend
        if (!selectedTenant.leaseId) {
            Alert.alert(
                'Cannot send message',
                'Unable to resolve the lease for this tenant. Please ensure the tenant has an active lease.',
            );
            return;
        }

        try {
            setIsSendingMessage(true);

            // Resolve tenant userId from tenantId via identities endpoint
            const { status, json } = await apiGet(`/identities/${selectedTenant.tenantId}`);
            const payload: any = json;

            if (status !== 200 || !payload || payload.success === false || !payload.data?.user) {
                Alert.alert(
                    'Cannot send message',
                    'Unable to resolve the tenant account for messaging. Please ensure this tenant has accepted an invitation and linked their account.',
                );
                return;
            }

            const toUserId: string = payload.data.user.id;

            // Include leaseId as required by backend messaging rules
            const ok = await sendMessage({
                toUserId,
                leaseId: selectedTenant.leaseId,
                body: messageText.trim(),
                subject: 'Message from your property manager',
            });

            if (ok) {
                Alert.alert('Message Sent', `Your message has been sent to ${selectedTenant.name}`);
                setShowMessageModal(false);
                setMessageText('');
            } else {
                Alert.alert('Error', 'Failed to send message. Please try again.');
            }
        } catch (error: any) {
            Alert.alert('Error', error?.message || 'Failed to send message. Please try again.');
        } finally {
            setIsSendingMessage(false);
        }
    };

    const handleSendTenantReminder = () => {
        if (!selectedTenant || !reminderText.trim()) {
            return;
        }

        // In a real app, this would send SMS/email notification
        Alert.alert(
            'Reminder Sent',
            `Payment reminder has been sent to ${selectedTenant.name}`,
            [
                {
                    text: 'OK',
                    onPress: () => {
                        setShowReminderModal(false);
                        setReminderText('Your rent payment is due. Please make the payment at your earliest convenience.');
                    }
                }
            ]
        );
    };

    const handleInviteTenantPress = async () => {
        if (__DEV__) {
            console.log('[TenantsScreen] Invite Tenant button pressed');
        }

        // Check enforcement before opening modal
        const { canProceed, enforcement } = await checkEnforcement('Invite Tenant');

        if (!canProceed && enforcement) {
            if (__DEV__) {
                console.log('[TenantsScreen] Enforcement blocked Invite Tenant modal');
            }
            // Navigate to billing/terms screen
            await handleEnforcement(navigation, enforcement, { blockedFeature: 'Invite Tenant' });
            return;
        }

        // Enforcement passed or not needed, open modal
        setShowInviteModal(true);
    };

    return (
        <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }}>
            <TopAppBar
                onNotificationsPress={() => { }}
                onProfilePress={() => navigation.navigate('Profile')}
                profileImage={user?.profileImage}
                propertyCount={properties.length}
            />
            <ScrollView
                style={{ flex: 1 }}
                contentContainerStyle={{ padding: spacing.base, paddingBottom: spacing.xl }}
                showsVerticalScrollIndicator={false}
                refreshControl={
                    <RefreshControl
                        refreshing={refreshing}
                        onRefresh={handleRefresh}
                        tintColor={colors.primary}
                        colors={[colors.primary]}
                    />
                }
            >
                {/* Tab Toggle */}
                <View
                    style={{
                        flexDirection: 'row',
                        backgroundColor: colors.surface,
                        borderRadius: 8,
                        padding: 4,
                        marginBottom: spacing.lg,
                    }}
                >
                    <TouchableOpacity
                        onPress={() => setActiveTab('tenants')}
                        style={{
                            flex: 1,
                            paddingVertical: spacing.sm,
                            alignItems: 'center',
                            backgroundColor: activeTab === 'tenants' ? colors.primary : 'transparent',
                            borderRadius: 6,
                        }}
                    >
                        <Text
                            style={[
                                typography.body,
                                { color: activeTab === 'tenants' ? '#FFFFFF' : colors.textSecondary },
                            ]}
                        >
                            Tenants ({managerTenants.length})
                        </Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                        onPress={() => setActiveTab('invitations')}
                        style={{
                            flex: 1,
                            paddingVertical: spacing.sm,
                            alignItems: 'center',
                            backgroundColor: activeTab === 'invitations' ? colors.primary : 'transparent',
                            borderRadius: 6,
                        }}
                    >
                        <Text
                            style={[
                                typography.body,
                                { color: activeTab === 'invitations' ? '#FFFFFF' : colors.textSecondary },
                            ]}
                        >
                            Invitations ({invitations.length})
                        </Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                        onPress={() => setActiveTab('leases')}
                        style={{
                            flex: 1,
                            paddingVertical: spacing.sm,
                            alignItems: 'center',
                            backgroundColor: activeTab === 'leases' ? colors.primary : 'transparent',
                            borderRadius: 6,
                        }}
                    >
                        <Text
                            style={[
                                typography.body,
                                { color: activeTab === 'leases' ? '#FFFFFF' : colors.textSecondary },
                            ]}
                        >
                            Leases ({leases.length})
                        </Text>
                    </TouchableOpacity>
                </View>

                {/* Invite Tenant Button - visible on tenants tab only */}
                {activeTab === 'tenants' && (
                    <Button
                        title={checkingEnforcement ? 'Checking...' : 'Invite Tenant'}
                        onPress={handleInviteTenantPress}
                        variant="primary"
                        size="large"
                        style={{ marginBottom: spacing.lg }}
                        icon={<Ionicons name="person-add" size={18} color="#FFFFFF" />}
                        disabled={checkingEnforcement}
                        loading={checkingEnforcement}
                    />
                )}

                {activeTab === 'tenants' ? (
                    <>
                        {/* Search */}
                        <Input
                            placeholder="Search by name or ID"
                            value={searchQuery}
                            onChangeText={setSearchQuery}
                            icon={<Ionicons name="search" size={20} color={colors.textSecondary} />}
                            style={{ marginBottom: spacing.lg }}
                        />

                        {/* Summary */}
                        <View style={{ flexDirection: 'row', gap: spacing.sm, marginBottom: spacing.lg }}>
                            <View style={{ flex: 1, backgroundColor: colors.surface, padding: spacing.base, borderRadius: 12 }}>
                                <Text style={[typography.h3, { color: colors.text }]}>{managerTenants.length}</Text>
                                <Text style={[typography.bodySmall, { color: colors.textSecondary, marginTop: 4 }]}>Total Tenants</Text>
                            </View>
                            <View style={{ flex: 1, backgroundColor: colors.surface, padding: spacing.base, borderRadius: 12 }}>
                                <Text style={[typography.h3, { color: colors.success }]}>
                                    {managerTenants.filter((t: ManagerTenant) => t.paymentStatus === 'current').length}
                                </Text>
                                <Text style={[typography.bodySmall, { color: colors.textSecondary, marginTop: 4 }]}>Up to Date</Text>
                            </View>
                        </View>

                        {/* Tenants List */}
                        <View style={{ flex: 1 }}>
                            {filteredTenants.map((item) => (
                                <TenantListItem
                                    key={item.id}
                                    name={item.name}
                                    tenantId={item.tenantId}
                                    propertyName={getPropertyName(item.propertyId)}
                                    unitNumber={getUnitNumber(item.propertyId, item.unitId)}
                                    rentAmount={item.rentAmount}
                                    paymentStatus={item.paymentStatus}
                                    phoneNumber={item.phoneNumber}
                                    onPress={() => setSelectedTenant(item)}
                                />
                            ))}
                        </View>
                    </>
                ) : activeTab === 'invitations' ? (
                    <InvitationsList
                        invitations={invitations}
                        loading={invitationsLoading}
                        error={invitationsError}
                        onRetry={loadInvitations}
                        onCancel={handleCancelInvitation}
                        cancellingId={cancellingId}
                        colors={colors}
                        spacing={spacing}
                        typography={typography}
                    />
                ) : (
                    /* Leases Tab */
                    <View style={{ flex: 1 }}>
                        {leasesLoading ? (
                            <View style={{ padding: spacing.lg, alignItems: 'center' }}>
                                <Text style={[typography.body, { color: colors.textSecondary }]}>Loading leases...</Text>
                            </View>
                        ) : leasesError ? (
                            <View style={{ padding: spacing.lg, alignItems: 'center' }}>
                                <Text style={[typography.body, { color: colors.error }]}>{leasesError}</Text>
                                <Button
                                    title="Retry"
                                    onPress={loadLeases}
                                    variant="outline"
                                    size="small"
                                    style={{ marginTop: spacing.md }}
                                />
                            </View>
                        ) : leases.length === 0 ? (
                            <View style={{ padding: spacing.lg, alignItems: 'center' }}>
                                <Text style={[typography.body, { color: colors.textSecondary }]}>No leases found</Text>
                            </View>
                        ) : (
                            leases.map((lease, index) => (
                                <View
                                    key={lease.id || index}
                                    style={{
                                        backgroundColor: colors.surface,
                                        padding: spacing.base,
                                        borderRadius: 12,
                                        marginBottom: spacing.sm,
                                    }}
                                >
                                    <Text style={[typography.body, { color: colors.text, fontWeight: '600' }]}>
                                        {lease.property?.name || 'Unknown Property'}
                                    </Text>
                                    <Text style={[typography.bodySmall, { color: colors.textSecondary, marginTop: 4 }]}>
                                        Unit: {lease.unit?.unitNumber || 'N/A'} • Rent: UGX {lease.rentAmount?.toLocaleString() || 'N/A'}
                                    </Text>
                                    <Text style={[typography.bodySmall, { color: colors.textSecondary, marginTop: 2 }]}>
                                        Status: {lease.status || 'Unknown'} • Tenant: {lease.tenantIdentity?.name || 'N/A'}
                                    </Text>
                                </View>
                            ))
                        )}
                    </View>
                )}
            </ScrollView>

            {/* Tenant Details Modal */}
            {selectedTenant && (
                <Modal
                    visible={!!selectedTenant}
                    onClose={() => setSelectedTenant(null)}
                    title="Tenant Details"
                    size="large"
                >
                    <View>
                        <View style={{ alignItems: 'center', marginBottom: spacing.lg }}>
                            <View style={{ backgroundColor: colors.primary + '20', width: 80, height: 80, borderRadius: 40, alignItems: 'center', justifyContent: 'center' }}>
                                <Ionicons name="person" size={40} color={colors.primary} />
                            </View>
                            <Text style={[typography.h2, { color: colors.text, marginTop: spacing.md }]}>
                                {selectedTenant.name}
                            </Text>
                            <Text style={[typography.body, { color: colors.textSecondary, marginTop: spacing.xs }]}>
                                ID: {selectedTenant.tenantId}
                            </Text>
                        </View>

                        <View style={{ backgroundColor: colors.surface, padding: spacing.base, borderRadius: 12, marginBottom: spacing.lg }}>
                            <Text style={[typography.h4, { color: colors.text, marginBottom: spacing.md }]}>Contact Information</Text>
                            <InfoRow label="Email" value={selectedTenant.email} colors={colors} typography={typography} />
                            <InfoRow label="Phone" value={selectedTenant.phoneNumber} colors={colors} typography={typography} />
                        </View>

                        <View style={{ backgroundColor: colors.surface, padding: spacing.base, borderRadius: 12, marginBottom: spacing.lg }}>
                            <Text style={[typography.h4, { color: colors.text, marginBottom: spacing.md }]}>Rental Information</Text>
                            <InfoRow label="Property" value={getPropertyName(selectedTenant.propertyId)} colors={colors} typography={typography} />
                            <InfoRow label="Unit" value={getUnitNumber(selectedTenant.propertyId, selectedTenant.unitId)} colors={colors} typography={typography} />
                            <InfoRow label="Monthly Rent" value={`UGX ${selectedTenant.rentAmount.toLocaleString()}`} colors={colors} typography={typography} />
                            <InfoRow label="Payment Status" value={selectedTenant.paymentStatus.toUpperCase()} colors={colors} typography={typography} />
                            {selectedTenant.amountOwed > 0 && (
                                <InfoRow label="Amount Owed" value={`UGX ${selectedTenant.amountOwed.toLocaleString()}`} colors={colors} typography={typography} />
                            )}
                        </View>

                        <View style={{ flexDirection: 'row', gap: spacing.sm }}>
                            <Button
                                title="Send Message"
                                onPress={() => setShowMessageModal(true)}
                                variant="outline"
                                size="medium"
                                style={{ flex: 1 }}
                                icon={<Ionicons name="chatbubble" size={16} color={colors.primary} />}
                            />
                            <Button
                                title="Send Reminder"
                                onPress={() => setShowReminderModal(true)}
                                variant="primary"
                                size="medium"
                                style={{ flex: 1 }}
                                icon={<Ionicons name="notifications" size={16} color="#FFFFFF" />}
                            />
                        </View>
                    </View>
                </Modal>
            )}

            {/* Send Message Modal */}
            {selectedTenant && (
                <Modal
                    visible={showMessageModal}
                    onClose={() => {
                        setShowMessageModal(false);
                        setMessageText('');
                    }}
                    title="Send Message"
                    size="medium"
                >
                    <View>
                        <View style={{ alignItems: 'center', marginBottom: spacing.lg }}>
                            <View style={{ backgroundColor: colors.primary + '20', width: 60, height: 60, borderRadius: 30, alignItems: 'center', justifyContent: 'center' }}>
                                <Ionicons name="chatbubble" size={28} color={colors.primary} />
                            </View>
                            <Text style={[typography.h4, { color: colors.text, marginTop: spacing.md }]}>
                                Message to {selectedTenant.name}
                            </Text>
                        </View>

                        <TextInput
                            style={{
                                backgroundColor: colors.surface,
                                borderWidth: 2,
                                borderColor: colors.border,
                                borderRadius: borderRadius.md,
                                padding: spacing.md,
                                color: colors.text,
                                minHeight: 120,
                                textAlignVertical: 'top',
                                marginBottom: spacing.lg,
                            }}
                            placeholder="Type your message here..."
                            placeholderTextColor={colors.textTertiary}
                            value={messageText}
                            onChangeText={setMessageText}
                            multiline
                        />

                        <Button
                            title="Send Message"
                            onPress={handleSendTenantMessage}
                            variant="primary"
                            size="large"
                            disabled={!messageText.trim() || isSendingMessage}
                            icon={<Ionicons name="send" size={18} color="#FFFFFF" />}
                        />
                    </View>
                </Modal>
            )}

            {/* Send Reminder Modal */}
            {selectedTenant && (
                <Modal
                    visible={showReminderModal}
                    onClose={() => {
                        setShowReminderModal(false);
                        setReminderText('Your rent payment is due. Please make the payment at your earliest convenience.');
                    }}
                    title="Send Reminder"
                    size="medium"
                >
                    <View>
                        <View style={{ alignItems: 'center', marginBottom: spacing.lg }}>
                            <View style={{ backgroundColor: colors.warning + '20', width: 60, height: 60, borderRadius: 30, alignItems: 'center', justifyContent: 'center' }}>
                                <Ionicons name="notifications" size={28} color={colors.warning} />
                            </View>
                            <Text style={[typography.h4, { color: colors.text, marginTop: spacing.md }]}>
                                Reminder to {selectedTenant.name}
                            </Text>
                        </View>

                        <View style={{ backgroundColor: colors.surface, padding: spacing.md, borderRadius: borderRadius.md, marginBottom: spacing.md }}>
                            <Text style={[typography.bodySmall, { color: colors.textSecondary, marginBottom: spacing.xs }]}>
                                Tenant Info
                            </Text>
                            <Text style={[typography.body, { color: colors.text }]}>
                                {selectedTenant.name} • {getPropertyName(selectedTenant.propertyId)}
                            </Text>
                            {selectedTenant.amountOwed > 0 && (
                                <Text style={[typography.body, { color: colors.error, fontWeight: '600', marginTop: spacing.xs }]}>
                                    Outstanding: UGX {selectedTenant.amountOwed.toLocaleString()}
                                </Text>
                            )}
                        </View>

                        <Text style={[typography.bodySmall, { color: colors.textSecondary, marginBottom: spacing.xs, fontWeight: '600' }]}>
                            Reminder Message
                        </Text>
                        <TextInput
                            style={{
                                backgroundColor: colors.surface,
                                borderWidth: 2,
                                borderColor: colors.border,
                                borderRadius: borderRadius.md,
                                padding: spacing.md,
                                color: colors.text,
                                fontSize: 14,
                                minHeight: 100,
                            }}
                            multiline
                            numberOfLines={4}
                            textAlignVertical="top"
                            placeholder="Type your reminder message here..."
                            placeholderTextColor={colors.textSecondary}
                            value={reminderText}
                            onChangeText={setReminderText}
                        />

                        <Button
                            title="Send Reminder"
                            onPress={handleSendTenantReminder}
                            variant="primary"
                            size="large"
                            style={{ marginTop: spacing.lg }}
                            icon={<Ionicons name="send" size={18} color="#FFFFFF" />}
                        />
                    </View>
                </Modal>
            )}

            {/* Invite Tenant Modal */}
            <InviteTenantModal
                visible={showInviteModal}
                onClose={() => setShowInviteModal(false)}
                onSuccess={() => {
                    loadManagerTenants();
                    loadInvitations();
                }}
                navigation={navigation}
            />

            {/* Tenants Tutorial */}
            <TutorialModal
                visible={showTutorial}
                onClose={handleTutorialClose}
                title="Manage Your Tenants"
                description="Invite tenants, track leases, and communicate with residents from this screen."
                steps={[
                    {
                        title: 'Invite Tenants',
                        description: 'Send invitations to tenants via email. They can accept and activate their lease.',
                        icon: 'person-add-outline'
                    },
                    {
                        title: 'View Tenant Details',
                        description: 'Tap any tenant to see their property, unit, rent amount, and payment status.',
                        icon: 'information-circle-outline'
                    },
                    {
                        title: 'Send Messages',
                        description: 'Communicate with tenants directly through the messaging system.',
                        icon: 'chatbubble-outline'
                    },
                    {
                        title: 'Track Invitations',
                        description: 'Switch to the Invitations tab to see pending, accepted, and rejected invitations.',
                        icon: 'mail-outline'
                    }
                ]}
            />
        </SafeAreaView>
    );
};

const InfoRow = ({ label, value, colors, typography }: any) => (
    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 12 }}>
        <Text style={[typography.body, { color: colors.textSecondary }]}>{label}</Text>
        <Text style={[typography.body, { color: colors.text, fontWeight: '600', flex: 1, textAlign: 'right' }]}>{value}</Text>
    </View>
);
