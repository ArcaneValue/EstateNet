import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '../../theme/ThemeContext';
import { useAuth } from '../../context/AuthContext';
import { useOwnerApi } from '../../hooks/useOwnerApi';
import { TopAppBar } from '../../components/TopAppBar';
import { ScreenWrapper } from '../../components/ScreenWrapper';
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
  const { user } = useAuth();
  const { properties, loading, removeManager } = useOwnerApi();

  // Calculate total units
  const totalUnits = properties.reduce((sum: number, property: any) => {
    return sum + (property.units?.length || 0);
  }, 0);

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
        <View style={[{ marginTop: spacing.md, paddingTop: 12, borderTopWidth: 1, borderTopColor: colors.border }]}>
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
    <ScreenWrapper>
      <TopAppBar
        onNotificationsPress={() => navigation.navigate('Notifications')}
        onProfilePress={() => navigation.navigate('Profile')}
        profileImage={user?.profileImage}
        propertyCount={properties.length}
        unitCount={totalUnits}
      />

      <ScrollView
        contentContainerStyle={{ padding: spacing.lg }}
        showsVerticalScrollIndicator={false}
      >
        {loading ? (
          <View style={{ padding: spacing.xl, alignItems: 'center' }}>
            <ActivityIndicator size="large" color={colors.primary} />
            <Text style={[typography.body, { color: colors.textSecondary, marginTop: spacing.md }]}>
              Loading managers...
            </Text>
          </View>
        ) : propertiesWithManagers.length === 0 ? (
          <View
            style={{
              backgroundColor: colors.surface,
              padding: spacing.xl,
              borderRadius: 12,
              alignItems: 'center',
              ...shadows.sm,
            }}
          >
            <View style={{
              width: 80,
              height: 80,
              borderRadius: 40,
              backgroundColor: colors.primary + '15',
              justifyContent: 'center',
              alignItems: 'center',
            }}>
              <Ionicons name="people-outline" size={40} color={colors.primary} />
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
    </ScreenWrapper>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
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
