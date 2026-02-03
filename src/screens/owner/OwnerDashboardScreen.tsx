import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Modal as RNModal,
  TextInput,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '../../theme/ThemeContext';
import { useAuth } from '../../context/AuthContext';
import { useOwnerApi } from '../../hooks/useOwnerApi';
import { Ionicons } from '@expo/vector-icons';
import { AddPropertyForm } from '../../components/AddPropertyForm';
import { Button } from '../../components/Button';

interface StatCardProps {
  title: string;
  value: string | number;
  icon: string;
  color: string;
  onPress?: () => void;
}

const StatCard: React.FC<StatCardProps> = ({ title, value, icon, color, onPress }) => {
  const { colors, spacing, typography, shadows } = useTheme();

  return (
    <TouchableOpacity
      onPress={onPress}
      style={[
        styles.statCard,
        {
          backgroundColor: colors.surface,
          borderRadius: 12,
          ...shadows.sm,
        },
      ]}
    >
      <View style={[styles.statIconContainer, { backgroundColor: color + '15' }]}>
        <Ionicons name={icon as any} size={24} color={color} />
      </View>
      <Text style={[typography.h2, { color: colors.text, marginTop: spacing.sm }]}>
        {value}
      </Text>
      <Text style={[typography.bodySmall, { color: colors.textSecondary }]}>
        {title}
      </Text>
    </TouchableOpacity>
  );
};

export const OwnerDashboardScreen: React.FC<any> = ({ navigation }) => {
  const { colors, spacing, typography, shadows, isDark, setTheme } = useTheme();
  const { user } = useAuth();
  const { properties, invitations, managers, activities, createProperty, createInvitation } = useOwnerApi();

  // Modal states
  const [showAddPropertyModal, setShowAddPropertyModal] = useState(false);
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [selectedProperty, setSelectedProperty] = useState('');
  const [managerEmail, setManagerEmail] = useState('');
  const [sending, setSending] = useState(false);

  // Get greeting based on time
  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good morning';
    if (hour < 18) return 'Good afternoon';
    return 'Good evening';
  };

  // Filter pending invitations
  const pendingInvitations = invitations.filter((inv: any) => inv.status === 'PENDING');

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }}>
      {/* Header Bar */}
      <View style={[styles.headerBar, {
        paddingHorizontal: spacing.lg,
        paddingVertical: spacing.md,
        backgroundColor: colors.surface,
        borderBottomWidth: 1,
        borderBottomColor: colors.border,
      }]}>
        <View>
          <Text style={[typography.bodySmall, { color: colors.textSecondary }]}>
            {getGreeting()},
          </Text>
          <Text style={[typography.h3, { color: colors.text }]}>
            {user?.name?.split(' ')[0] || 'Owner'}
          </Text>
        </View>
        <View style={styles.headerActions}>
          <TouchableOpacity
            style={[styles.iconButton, { backgroundColor: colors.surface }]}
            onPress={() => navigation.navigate('Messages')}
          >
            <Ionicons name="mail-outline" size={22} color={colors.text} />
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.iconButton, { backgroundColor: colors.surface, marginLeft: spacing.sm }]}
            onPress={() => setTheme(isDark ? 'light' : 'dark')}
          >
            <Ionicons name={isDark ? "sunny-outline" : "moon-outline"} size={22} color={colors.text} />
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView
        contentContainerStyle={{ padding: spacing.lg, paddingTop: 0 }}
        showsVerticalScrollIndicator={false}
      >
        {/* Stats Grid */}
        <View style={styles.statsGrid}>
          <StatCard
            title="Properties"
            value={properties.length}
            icon="home"
            color="#4F46E5"
            onPress={() => navigation.navigate('OwnerProperties')}
          />
          <StatCard
            title="Managers"
            value={managers.length}
            icon="people"
            color="#059669"
            onPress={() => navigation.navigate('OwnerManagers')}
          />
          <StatCard
            title="Pending"
            value={pendingInvitations.length}
            icon="mail-unread"
            color="#DC2626"
            onPress={() => navigation.navigate('OwnerInvitations', { filter: 'pending' })}
          />
        </View>

        {/* Quick Actions */}
        <View style={[styles.section, { marginTop: spacing.lg }]}>
          <Text style={[typography.h3, { color: colors.text, marginBottom: spacing.md }]}>
            Quick Actions
          </Text>
          <View style={styles.quickActionsRow}>
            <TouchableOpacity
              style={[styles.quickActionButton, { backgroundColor: colors.primary }]}
              onPress={() => setShowAddPropertyModal(true)}
            >
              <Ionicons name="add-circle" size={24} color="#FFFFFF" />
              <Text style={[typography.bodySmall, { color: '#FFFFFF', marginLeft: spacing.xs, fontWeight: '600', fontSize: 11 }]}>
                Add Property
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.quickActionButton, { backgroundColor: '#059669' }]}
              onPress={() => setShowInviteModal(true)}
            >
              <Ionicons name="person-add" size={24} color="#FFFFFF" />
              <Text style={[typography.bodySmall, { color: '#FFFFFF', marginLeft: spacing.xs, fontWeight: '600', fontSize: 11 }]}>
                Invite Manager
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.quickActionButton, { backgroundColor: '#7C3AED' }]}
              onPress={() => navigation.navigate('OwnerFinancial')}
            >
              <Ionicons name="bar-chart" size={24} color="#FFFFFF" />
              <Text style={[typography.bodySmall, { color: '#FFFFFF', marginLeft: spacing.xs, fontWeight: '600', fontSize: 11 }]}>
                View Reports
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Recent Activity */}
        <View style={[styles.section, { marginTop: spacing.lg }]}>
          <Text style={[typography.h3, { color: colors.text, marginBottom: spacing.md }]}>
            Recent Activity
          </Text>
          {activities.length === 0 ? (
            <View
              style={[
                styles.activityCard,
                {
                  backgroundColor: colors.surface,
                  padding: spacing.lg,
                  borderRadius: 12,
                  ...shadows.sm,
                },
              ]}
            >
              <View style={{ alignItems: 'center', paddingVertical: spacing.lg }}>
                <Ionicons name="time-outline" size={48} color={colors.textSecondary} />
                <Text style={[typography.body, { color: colors.textSecondary, marginTop: spacing.sm }]}>
                  No recent activity
                </Text>
              </View>
            </View>
          ) : (
            <View style={{ gap: spacing.md }}>
              {activities.slice(0, 5).map((activity: any) => (
                <View
                  key={activity.id}
                  style={{
                    backgroundColor: colors.surface,
                    padding: spacing.md,
                    borderRadius: 12,
                    ...shadows.sm,
                  }}
                >
                  <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                    <View style={{
                      width: 40,
                      height: 40,
                      borderRadius: 20,
                      backgroundColor:
                        activity.type === 'PROPERTY_CREATED' ? '#4F46E5' + '15' :
                          activity.type === 'MANAGER_ASSIGNED' ? '#059669' + '15' :
                            activity.type === 'PAYMENT_RECEIVED' ? '#10B981' + '15' :
                              '#DC2626' + '15',
                      justifyContent: 'center',
                      alignItems: 'center',
                      marginRight: spacing.md,
                    }}>
                      <Ionicons
                        name={
                          activity.type === 'PROPERTY_CREATED' ? 'home' :
                            activity.type === 'MANAGER_ASSIGNED' ? 'people' :
                              activity.type === 'PAYMENT_RECEIVED' ? 'cash' :
                                'mail'
                        }
                        size={20}
                        color={
                          activity.type === 'PROPERTY_CREATED' ? '#4F46E5' :
                            activity.type === 'MANAGER_ASSIGNED' ? '#059669' :
                              activity.type === 'PAYMENT_RECEIVED' ? '#10B981' :
                                '#DC2626'
                        }
                      />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={[typography.body, { color: colors.text }]}>
                        {activity.description}
                      </Text>
                      <Text style={[typography.bodySmall, { color: colors.textSecondary, marginTop: spacing.xs }]}>
                        {new Date(activity.timestamp).toLocaleDateString()}
                      </Text>
                    </View>
                  </View>
                </View>
              ))}
            </View>
          )}
        </View>
      </ScrollView>

      {/* Add Property Modal */}
      <RNModal
        visible={showAddPropertyModal}
        animationType="slide"
        presentationStyle="fullScreen"
        onRequestClose={() => setShowAddPropertyModal(false)}
      >
        <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }}>
          <View style={[styles.modalHeader, { padding: spacing.lg, borderBottomWidth: 1, borderBottomColor: colors.border }]}>
            <TouchableOpacity onPress={() => setShowAddPropertyModal(false)}>
              <Ionicons name="close" size={28} color={colors.text} />
            </TouchableOpacity>
            <Text style={[typography.h3, { color: colors.text, marginLeft: spacing.md }]}>
              Add Property
            </Text>
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
        </SafeAreaView>
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
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  headerBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  iconButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  statsGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 16,
  },
  statCard: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 20,
    paddingHorizontal: 8,
    marginHorizontal: 4,
  },
  statIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  section: {},
  quickActionsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  quickActionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 4,
    borderRadius: 12,
    marginHorizontal: 4,
  },
  activityCard: {},
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
