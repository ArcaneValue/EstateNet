import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '../../theme/ThemeContext';
import { useOwnerApi } from '../../hooks/useOwnerApi';
import { Ionicons } from '@expo/vector-icons';

interface Manager {
  id: string;
  name: string;
  email: string;
}

interface Property {
  id: string;
  name: string;
  location: string;
  manager: Manager | null;
}

export const OwnerManagersScreen: React.FC<any> = ({ navigation }) => {
  const { colors, spacing, typography, shadows } = useTheme();
  const { properties, loading, removeManager } = useOwnerApi();

  // Get properties that have managers assigned
  const propertiesWithManagers = (properties || []).filter((p: any) => p.manager !== null && p.manager !== undefined);

  const handleRemoveManager = (propertyId: string, propertyName: string, managerName: string) => {
    Alert.alert(
      'Remove Manager',
      `Are you sure you want to remove ${managerName} from ${propertyName}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: async () => {
            const result = await removeManager(propertyId);
            if (result.success) {
              Alert.alert('Success', 'Manager removed successfully');
            } else {
              Alert.alert('Error', result.message || 'Failed to remove manager');
            }
          },
        },
      ]
    );
  };

  const renderManagerCard = (property: Property) => {
    if (!property.manager) return null;

    return (
      <View
        key={property.id}
        style={[
          styles.card,
          {
            backgroundColor: colors.surface,
            padding: spacing.lg,
            marginBottom: spacing.md,
            borderRadius: 12,
            ...shadows.sm,
          },
        ]}
      >
        {/* Manager Header */}
        <View style={styles.cardHeader}>
          <View style={[styles.avatar, { backgroundColor: colors.primary + '20' }]}>
            <Text style={[typography.h3, { color: colors.primary }]}>
              {property.manager.name.charAt(0).toUpperCase()}
            </Text>
          </View>
          <View style={styles.cardInfo}>
            <Text style={[typography.h3, { color: colors.text }]}>
              {property.manager.name}
            </Text>
            <Text style={[typography.bodySmall, { color: colors.textSecondary }]}>
              {property.manager.email}
            </Text>
          </View>
        </View>

        {/* Property Info */}
        <View style={[styles.propertySection, { marginTop: spacing.md }]}>
          <View style={styles.propertyRow}>
            <Ionicons name="business-outline" size={16} color={colors.textSecondary} />
            <Text style={[typography.body, { color: colors.text, marginLeft: spacing.sm }]}>
              {property.name}
            </Text>
          </View>
          <View style={styles.propertyRow}>
            <Ionicons name="location-outline" size={16} color={colors.textSecondary} />
            <Text style={[typography.bodySmall, { color: colors.textSecondary, marginLeft: spacing.sm }]}>
              {property.location}
            </Text>
          </View>
        </View>

        {/* Remove Button */}
        <TouchableOpacity
          onPress={() => handleRemoveManager(property.id, property.name, property.manager!.name)}
          style={[styles.removeButton, { marginTop: spacing.md }]}
        >
          <Ionicons name="person-remove-outline" size={18} color={colors.error} />
          <Text style={[typography.bodySmall, { color: colors.error, marginLeft: spacing.sm }]}>
            Remove Manager
          </Text>
        </TouchableOpacity>
      </View>
    );
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Header */}
      <View style={[styles.header, { padding: spacing.lg }]}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={{ padding: 8 }}>
          <Ionicons name="arrow-back" size={24} color={colors.text} />
        </TouchableOpacity>
        <View style={{ flex: 1, marginLeft: spacing.md }}>
          <Text style={[typography.h2, { color: colors.text }]}>Property Managers</Text>
          <Text style={[typography.body, { color: colors.textSecondary }]}>
            {propertiesWithManagers.length} {propertiesWithManagers.length === 1 ? 'manager' : 'managers'} active
          </Text>
        </View>
      </View>

      {/* Content */}
      <ScrollView
        contentContainerStyle={{ padding: spacing.lg, paddingTop: 0 }}
        showsVerticalScrollIndicator={false}
      >
        {loading ? (
          <View style={styles.centered}>
            <Text style={[typography.body, { color: colors.textSecondary }]}>
              Loading managers...
            </Text>
          </View>
        ) : propertiesWithManagers.length === 0 ? (
          <View
            style={[
              styles.emptyState,
              {
                backgroundColor: colors.surface,
                padding: spacing.xl,
                borderRadius: 12,
                ...shadows.sm,
              },
            ]}
          >
            <View style={[styles.emptyIconContainer, { backgroundColor: colors.primary + '15' }]}>
              <Ionicons name="people-outline" size={48} color={colors.primary} />
            </View>
            <Text style={[typography.h3, { color: colors.text, marginTop: spacing.lg }]}>
              No Managers Yet
            </Text>
            <Text
              style={[
                typography.body,
                {
                  color: colors.textSecondary,
                  textAlign: 'center',
                  marginTop: spacing.sm,
                  lineHeight: 22,
                },
              ]}
            >
              Invite managers from the Invitations tab.{'\n'}
              Once they accept, they will appear here.
            </Text>
          </View>
        ) : (
          propertiesWithManagers.map(renderManagerCard)
        )}
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  centered: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 40,
  },
  emptyState: {
    alignItems: 'center',
    marginTop: 20,
  },
  emptyIconContainer: {
    width: 96,
    height: 96,
    borderRadius: 48,
    justifyContent: 'center',
    alignItems: 'center',
  },
  card: {},
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  cardInfo: {
    flex: 1,
    marginLeft: 12,
  },
  propertySection: {
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
  },
  propertyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  removeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    backgroundColor: '#FEE2E2',
    alignSelf: 'flex-start',
  },
});
