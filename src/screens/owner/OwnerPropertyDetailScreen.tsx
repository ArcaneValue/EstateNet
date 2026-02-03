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
import { Ionicons } from '@expo/vector-icons';

interface OwnerPropertyDetailScreenProps {
  navigation: any;
  route: any;
}

export const OwnerPropertyDetailScreen: React.FC<OwnerPropertyDetailScreenProps> = ({
  navigation,
  route,
}) => {
  const { colors, spacing, typography, shadows } = useTheme();
  const property = route.params?.property;

  if (!property) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }}>
        <View style={[styles.header, { padding: spacing.lg }]}>
          <TouchableOpacity onPress={() => navigation.goBack()}>
            <Ionicons name="arrow-back" size={24} color={colors.text} />
          </TouchableOpacity>
          <Text style={[typography.h2, { color: colors.text }]}>Property Details</Text>
          <View style={{ width: 24 }} />
        </View>
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
          <Text style={[typography.body, { color: colors.textSecondary }]}>
            Property not found
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }}>
      {/* Header */}
      <View style={[styles.header, { padding: spacing.lg }]}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={24} color={colors.text} />
        </TouchableOpacity>
        <Text style={[typography.h2, { color: colors.text }]} numberOfLines={1}>
          {property.name}
        </Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView contentContainerStyle={{ padding: spacing.lg, paddingTop: 0 }}>
        {/* Property Info Card */}
        <View
          style={[
            styles.card,
            {
              backgroundColor: colors.surface,
              padding: spacing.lg,
              borderRadius: 12,
              marginBottom: spacing.lg,
              ...shadows.sm,
            },
          ]}
        >
          <View style={styles.infoRow}>
            <Ionicons name="location" size={20} color={colors.primary} />
            <Text style={[typography.body, { color: colors.text, marginLeft: spacing.md }]}>
              {property.location}
            </Text>
          </View>
        </View>

        {/* Stats Grid */}
        <View style={styles.statsGrid}>
          <View
            style={[
              styles.statCard,
              {
                backgroundColor: colors.surface,
                padding: spacing.lg,
                borderRadius: 12,
                ...shadows.sm,
              },
            ]}
          >
            <Text style={[typography.h2, { color: colors.primary }]}>
              {property.units?.length || 0}
            </Text>
            <Text style={[typography.bodySmall, { color: colors.textSecondary }]}>Units</Text>
          </View>

          <View
            style={[
              styles.statCard,
              {
                backgroundColor: colors.surface,
                padding: spacing.lg,
                borderRadius: 12,
                ...shadows.sm,
              },
            ]}
          >
            <Text style={[typography.h2, { color: colors.success }]}>
              {property.leases?.filter((l: any) => l.status === 'ACTIVE').length || 0}
            </Text>
            <Text style={[typography.bodySmall, { color: colors.textSecondary }]}>
              Active Leases
            </Text>
          </View>
        </View>

        {/* Manager Section */}
        <View
          style={[
            styles.card,
            {
              backgroundColor: colors.surface,
              padding: spacing.lg,
              borderRadius: 12,
              marginTop: spacing.lg,
              ...shadows.sm,
            },
          ]}
        >
          <Text style={[typography.h3, { color: colors.text, marginBottom: spacing.md }]}>
            Property Manager
          </Text>
          {property.manager ? (
            <View style={styles.managerRow}>
              <View
                style={[
                  styles.avatar,
                  { backgroundColor: colors.primary, marginRight: spacing.md },
                ]}
              >
                <Text style={[typography.h3, { color: '#FFFFFF' }]}>
                  {property.manager.name?.charAt(0)?.toUpperCase()}
                </Text>
              </View>
              <View>
                <Text style={[typography.body, { color: colors.text }]}>
                  {property.manager.name}
                </Text>
                <Text style={[typography.bodySmall, { color: colors.textSecondary }]}>
                  {property.manager.email}
                </Text>
              </View>
            </View>
          ) : (
            <Text style={[typography.body, { color: colors.textSecondary }]}>
              No manager assigned. Send an invitation from the Invitations tab.
            </Text>
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  card: {},
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statsGrid: {
    flexDirection: 'row',
    gap: 12,
  },
  statCard: {
    flex: 1,
    alignItems: 'center',
  },
  managerRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
});
