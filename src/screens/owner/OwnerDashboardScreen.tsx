import React, { useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  FlatList,
  TouchableOpacity,
  Modal as RNModal,
  TextInput,
  ActivityIndicator,
  ViewStyle,
} from 'react-native';
import { useTheme } from '../../theme/ThemeContext';
import { useAuth } from '../../context/AuthContext';
import { useTutorial, TUTORIAL_KEYS } from '../../context/TutorialContext';
import { useOwnerApi } from '../../hooks/useOwnerApi';
import { useNotifications } from '../../hooks/useNotifications';
import { Ionicons } from '@expo/vector-icons';
import { TopAppBar } from '../../components/TopAppBar';
import { ScreenWrapper } from '../../components/ScreenWrapper';
import { TutorialModal } from '../../components/TutorialModal';
import { AddPropertyForm } from '../../components/AddPropertyForm';
import { Button } from '../../components/Button';
import { Card } from '../../components/Card';
import { formatCompactNumber } from '../../utils/formatters';
import { useEffect } from 'react';

export const OwnerDashboardScreen: React.FC<any> = ({ navigation }) => {
  const { colors, spacing, typography, borderRadius, shadows } = useTheme();
  const { user } = useAuth();
  const { properties, invitations, managers, activities, createProperty, createInvitation } = useOwnerApi();
  const { notifications, unreadCount, loading: notificationsLoading, markAsRead, markAllAsRead, refetch: refetchNotifications } = useNotifications();

  // Modal states
  const [showAddPropertyModal, setShowAddPropertyModal] = useState(false);
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [selectedProperty, setSelectedProperty] = useState('');
  const [managerEmail, setManagerEmail] = useState('');
  const [sending, setSending] = useState(false);
  const [showWelcomeTutorial, setShowWelcomeTutorial] = useState(false);
  const [showDashboardTutorial, setShowDashboardTutorial] = useState(false);

  // Tutorial
  const { shouldShowTutorial, markTutorialSeen } = useTutorial();

  // Check tutorials on mount
  useEffect(() => {
    checkTutorials();
  }, []);

  const checkTutorials = async () => {
    // Check welcome tutorial first
    const shouldShowWelcome = await shouldShowTutorial(TUTORIAL_KEYS.WELCOME_OWNER);
    if (shouldShowWelcome) {
      setTimeout(() => setShowWelcomeTutorial(true), 800);
    } else {
      // If welcome already seen, check dashboard tutorial
      const shouldShowDashboard = await shouldShowTutorial(TUTORIAL_KEYS.OWNER_DASHBOARD);
      if (shouldShowDashboard) {
        setTimeout(() => setShowDashboardTutorial(true), 500);
      }
    }
  };

  const handleWelcomeTutorialClose = async () => {
    await markTutorialSeen(TUTORIAL_KEYS.WELCOME_OWNER);
    setShowWelcomeTutorial(false);
    // Show dashboard tutorial next
    const shouldShowDashboard = await shouldShowTutorial(TUTORIAL_KEYS.OWNER_DASHBOARD);
    if (shouldShowDashboard) {
      setTimeout(() => setShowDashboardTutorial(true), 300);
    }
  };

  const handleDashboardTutorialClose = async () => {
    await markTutorialSeen(TUTORIAL_KEYS.OWNER_DASHBOARD);
    setShowDashboardTutorial(false);
  };

  const totalUnits = useMemo(() => (
    properties.reduce((sum: number, property: any) => sum + (property.units?.length || 0), 0)
  ), [properties]);

  const pendingInvitations = useMemo(() => (
    invitations.filter((inv: any) => inv.status === 'PENDING')
  ), [invitations]);

  const overviewMetrics = [
    {
      label: 'Properties',
      value: formatCompactNumber(properties.length),
      subtitle: `${properties.length === 1 ? 'Property' : 'Properties'}`,
      icon: 'home',
      tint: colors.primary,
      onPress: () => navigation.navigate('Properties'),
    },
    {
      label: 'Managers',
      value: formatCompactNumber(managers.length),
      subtitle: `${managers.length === 1 ? 'Manager' : 'Managers'}`,
      icon: 'people',
      tint: colors.success,
      onPress: () => navigation.navigate('Managers'),
    },
    {
      label: 'Pending',
      value: formatCompactNumber(pendingInvitations.length),
      subtitle: 'Invitations',
      icon: 'mail-unread',
      tint: colors.warning,
      onPress: () => navigation.navigate('Invitations', { filter: 'pending' }),
    },
  ];

  const quickActions = [
    {
      label: 'Add Property',
      icon: 'add-circle',
      action: () => setShowAddPropertyModal(true),
    },
    {
      label: 'Invite Manager',
      icon: 'person-add',
      action: () => setShowInviteModal(true),
    },
    {
      label: 'View Reports',
      icon: 'bar-chart',
      action: () => navigation.navigate('OwnerFinancial'),
    },
  ];

  const recentActivities = useMemo(() => activities.slice(0, 8), [activities]);

  const getActivitySubtitle = (activity: any) => {
    const parts = [
      activity.managerEmail || activity.email || activity.tenantEmail,
      activity.propertyName || activity.property?.name,
    ].filter(Boolean);
    if (parts.length === 0) {
      return activity.category || activity.type?.replace(/_/g, ' ').toLowerCase();
    }
    return parts.join(' • ');
  };

  const formatActivityTime = (timestamp: string) => {
    const date = new Date(timestamp);
    return date.toLocaleDateString(undefined, { day: '2-digit', month: 'short' });
  };

  const chunkQuickActions = (items: typeof quickActions, size = 2) => {
    const rows = [] as typeof quickActions[];
    for (let i = 0; i < items.length; i += size) {
      rows.push(items.slice(i, i + size));
    }
    return rows;
  };

  const getActivityIconStyle = (tint: string): ViewStyle => ({
    width: 40,
    height: 40,
    borderRadius: borderRadius.full,
    backgroundColor: tint + '15',
    alignItems: 'center',
    justifyContent: 'center',
  });

  const renderActivityItem = ({ item }: { item: any }) => {
    const iconConfig = {
      PROPERTY_CREATED: { icon: 'home', tint: colors.primary },
      MANAGER_ASSIGNED: { icon: 'people', tint: colors.success },
      PAYMENT_RECEIVED: { icon: 'cash', tint: colors.success },
    } as Record<string, { icon: any; tint: string }>;

    const config = iconConfig[item.type] || { icon: 'mail', tint: colors.info };

    return (
      <View style={styles.activityRow}>
        <View style={getActivityIconStyle(config.tint)}>
          <Ionicons name={config.icon as any} size={18} color={config.tint} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={[typography.body, { color: colors.text, fontWeight: '600' }]} numberOfLines={1}>
            {item.title || item.description}
          </Text>
          <Text style={[typography.bodySmall, { color: colors.textSecondary, marginTop: 2 }]} numberOfLines={1}>
            {getActivitySubtitle(item)}
          </Text>
        </View>
        <View style={{ alignItems: 'flex-end', marginLeft: spacing.sm }}>
          <Text style={[typography.caption, { color: colors.textTertiary }]}>{formatActivityTime(item.timestamp)}</Text>
          <Ionicons name="chevron-forward" size={16} color={colors.textTertiary} style={{ marginTop: spacing.xs }} />
        </View>
      </View>
    );
  };

  return (
    <ScreenWrapper>
      <TopAppBar
        onNotificationsPress={() => navigation.navigate('Notifications')}
        onProfilePress={() => navigation.navigate('Profile')}
        profileImage={user?.profileImage}
        propertyCount={properties.length}
        unitCount={totalUnits}
      />
      <FlatList
        data={recentActivities}
        keyExtractor={(item) => item.id}
        contentContainerStyle={{ padding: spacing.lg, paddingBottom: spacing['2xl'] }}
        ListHeaderComponent={(
          <>
            <Card style={{ marginBottom: spacing.lg, padding: spacing.lg }}>
              <Text style={[typography.caption, { color: colors.textSecondary, textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: spacing.sm }]}>Portfolio overview</Text>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                {overviewMetrics.map((metric, index) => (
                  <TouchableOpacity
                    key={metric.label}
                    onPress={metric.onPress}
                    activeOpacity={0.85}
                    style={{ flex: 1, marginLeft: index === 0 ? 0 : spacing.md }}
                  >
                    <Text style={[typography.bodySmall, { color: colors.textSecondary }]}>{metric.label}</Text>
                    <Text style={[typography.h2, { color: colors.text, fontSize: 28, lineHeight: 34 }]}>{metric.value}</Text>
                    <Text style={[typography.caption, { color: colors.textTertiary }]}>{metric.subtitle}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </Card>

            <View style={{ marginBottom: spacing.xl }}>
              <Text style={[typography.h3, { color: colors.text, marginBottom: spacing.md }]}>Quick actions</Text>
              {chunkQuickActions(quickActions).map((row, idx) => (
                <View key={`quick-row-${idx}`} style={{ flexDirection: 'row', gap: spacing.sm, marginBottom: idx === chunkQuickActions(quickActions).length - 1 ? 0 : spacing.sm }}>
                  {row.map((action) => (
                    <Button
                      key={action.label}
                      title={action.label}
                      onPress={action.action}
                      variant="pill"
                      size="compact"
                      style={{ flex: 1, justifyContent: 'center' }}
                      icon={<Ionicons name={action.icon as any} size={16} color={colors.text} />}
                    />
                  ))}
                  {row.length === 1 && <View style={{ flex: 1 }} />}
                </View>
              ))}
            </View>

            <Text style={[typography.h3, { color: colors.text, marginBottom: spacing.sm }]}>Recent activity</Text>
          </>
        )}
        renderItem={renderActivityItem}
        ItemSeparatorComponent={() => <View style={{ height: 1, backgroundColor: colors.divider }} />}
        ListEmptyComponent={(
          <Card style={{ alignItems: 'center', padding: spacing.lg }}>
            <Ionicons name="time-outline" size={28} color={colors.textSecondary} />
            <Text style={[typography.bodySmall, { color: colors.textSecondary, marginTop: spacing.sm }]}>No recent activity yet</Text>
          </Card>
        )}
        showsVerticalScrollIndicator={false}
      />

      {/* Add Property Modal */}
      <RNModal
        visible={showAddPropertyModal}
        animationType="slide"
        presentationStyle="fullScreen"
        onRequestClose={() => setShowAddPropertyModal(false)}
      >
        <ScreenWrapper>
          <View style={[styles.modalHeader, { padding: spacing.lg, borderBottomWidth: 1, borderBottomColor: colors.border }]}>
            <TouchableOpacity onPress={() => setShowAddPropertyModal(false)}>
              <Ionicons name="close" size={28} color={colors.text} />
            </TouchableOpacity>
            <Text style={[typography.h3, { color: colors.text, marginLeft: spacing.md }]}>Add Property</Text>
            <View style={{ width: 28 }} />
          </View>
          <AddPropertyForm
            onSubmit={async (data) => {
              const result = await createProperty(data);
              if (result.success) {
                setShowAddPropertyModal(false);
              }
            }}
            onCancel={() => setShowAddPropertyModal(false)}
          />
        </ScreenWrapper>
      </RNModal>

      {/* Invite Manager Modal */}
      <RNModal
        visible={showInviteModal}
        animationType="slide"
        transparent
        onRequestClose={() => setShowInviteModal(false)}
      >
        <View style={[styles.modalOverlay, { backgroundColor: 'rgba(0,0,0,0.5)' }]}>
          <View style={[styles.modalContent, { backgroundColor: colors.surface, margin: spacing.lg, padding: spacing.lg, borderRadius: 12 }]}>
            <Text style={[typography.h3, { color: colors.text, marginBottom: spacing.md }]}>
              Invite Manager
            </Text>
            <Text style={[typography.body, { color: colors.textSecondary, marginBottom: spacing.md }]}>
              Select a property and enter the manager's email
            </Text>
            <Text style={[typography.bodySmall, { color: colors.textSecondary, marginBottom: spacing.xs }]}>
              Property
            </Text>
            <View style={[styles.pickerContainer, { backgroundColor: colors.background, borderRadius: 8, marginBottom: spacing.md }]}>
              <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                {properties.map((property: any) => (
                  <TouchableOpacity
                    key={property.id}
                    style={[
                      styles.propertyChip,
                      {
                        backgroundColor: selectedProperty === property.id ? colors.primary : colors.surface,
                        borderWidth: 1,
                        borderColor: colors.border,
                      },
                    ]}
                    onPress={() => setSelectedProperty(property.id)}
                  >
                    <Text
                      style={[
                        typography.bodySmall,
                        { color: selectedProperty === property.id ? '#FFFFFF' : colors.text },
                      ]}
                    >
                      {property.name}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>
            <Text style={[typography.bodySmall, { color: colors.textSecondary, marginBottom: spacing.xs }]}>
              Manager Email
            </Text>
            <TextInput
              style={[
                styles.input,
                {
                  backgroundColor: colors.background,
                  color: colors.text,
                  borderRadius: 8,
                  padding: spacing.md,
                  marginBottom: spacing.lg,
                },
              ]}
              placeholder="Enter manager's email"
              placeholderTextColor={colors.textSecondary}
              value={managerEmail}
              onChangeText={setManagerEmail}
              keyboardType="email-address"
              autoCapitalize="none"
            />
            <View style={{ flexDirection: 'row', gap: spacing.md }}>
              <Button
                title="Cancel"
                onPress={() => setShowInviteModal(false)}
                variant="secondary"
                style={{ flex: 1 }}
              />
              <Button
                title={sending ? 'Sending...' : 'Send Invite'}
                onPress={async () => {
                  if (!selectedProperty || !managerEmail) return;
                  setSending(true);
                  const result = await createInvitation(selectedProperty, managerEmail);
                  setSending(false);
                  if (result.success) {
                    setShowInviteModal(false);
                    setManagerEmail('');
                    setSelectedProperty('');
                  }
                }}
                disabled={!selectedProperty || !managerEmail || sending}
                style={{ flex: 1 }}
              />
            </View>
          </View>
        </View>
      </RNModal>

      {/* Welcome Tutorial */}
      <TutorialModal
        visible={showWelcomeTutorial}
        onClose={handleWelcomeTutorialClose}
        title="Welcome to EstateNet"
        description="Your complete property portfolio management platform. Let's get you started!"
        steps={[
          {
            title: 'Manage Your Portfolio',
            description: 'Add and track all your rental properties in one centralized dashboard.',
            icon: 'home-outline'
          },
          {
            title: 'Assign Property Managers',
            description: 'Invite professional managers to handle day-to-day operations of your properties.',
            icon: 'people-outline'
          },
          {
            title: 'Financial Insights',
            description: 'View real-time income statements, cash flow reports, and financial position of your portfolio.',
            icon: 'stats-chart-outline'
          },
          {
            title: 'Stay Informed',
            description: 'Get notifications about manager activities, rent collection, and property updates.',
            icon: 'notifications-outline'
          }
        ]}
      />

      {/* Dashboard Tutorial */}
      <TutorialModal
        visible={showDashboardTutorial}
        onClose={handleDashboardTutorialClose}
        title="Your Property Dashboard"
        description="Here's an overview of your property portfolio and what you can do."
        steps={[
          {
            title: 'Portfolio Overview',
            description: 'See total properties, managers, and pending invitations at a glance.',
            icon: 'grid-outline'
          },
          {
            title: 'Quick Actions',
            description: 'Add properties, invite managers, and view financial reports with one tap.',
            icon: 'flash-outline'
          },
          {
            title: 'Recent Activity',
            description: 'Track manager invitations, property updates, and other important events.',
            icon: 'time-outline'
          },
          {
            title: 'Navigation',
            description: 'Use the bottom tabs to access Properties, Invitations, Managers, and your Profile.',
            icon: 'apps-outline'
          }
        ]}
      />
    </ScreenWrapper>
  );
};

const styles = StyleSheet.create({
  quickActionButton: {
    flex: 1,
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    paddingHorizontal: 12,
    borderRadius: 12,
  },
  activityRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  modalOverlay: {
    flex: 1,
    justifyContent: 'center',
  },
  modalContent: {
    maxHeight: '80%',
  },
  pickerContainer: {
    padding: 8,
  },
  propertyChip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    marginRight: 8,
  },
  input: {
    fontSize: 16,
  },
});
