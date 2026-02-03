import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '../../theme/ThemeContext';
import { useAuth } from '../../context/AuthContext';
import { useOwnerApi } from '../../hooks/useOwnerApi';
import { Ionicons } from '@expo/vector-icons';

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
  const { properties, invitations, managers, activities } = useOwnerApi();

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
      <View style={[styles.headerBar, { paddingHorizontal: spacing.lg, paddingVertical: spacing.md }]}>
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
              onPress={() => navigation.navigate('OwnerProperties', { openModal: true })}
            >
              <Ionicons name="add-circle" size={24} color="#FFFFFF" />
              <Text style={[typography.body, { color: '#FFFFFF', marginLeft: spacing.sm, fontWeight: '600' }]}>
                Add Property
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.quickActionButton, { backgroundColor: '#059669' }]}
              onPress={() => navigation.navigate('OwnerInvitations', { openModal: true })}
            >
              <Ionicons name="person-add" size={24} color="#FFFFFF" />
              <Text style={[typography.body, { color: '#FFFFFF', marginLeft: spacing.sm, fontWeight: '600' }]}>
                Invite Manager
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.quickActionButton, { backgroundColor: '#7C3AED' }]}
              onPress={() => navigation.navigate('OwnerFinancial')}
            >
              <Ionicons name="bar-chart" size={24} color="#FFFFFF" />
              <Text style={[typography.body, { color: '#FFFFFF', marginLeft: spacing.sm, fontWeight: '600' }]}>
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
    paddingVertical: 16,
    borderRadius: 12,
    marginHorizontal: 4,
  },
  activityCard: {},
});
