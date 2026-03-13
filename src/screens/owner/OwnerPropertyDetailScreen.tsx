import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '../../theme/ThemeContext';
import { PageHeader } from '../../components/PageHeader';
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
        <PageHeader
          title="Property Details"
          onBack={() => navigation.goBack()}
        />
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
          <Ionicons name="alert-circle-outline" size={48} color={colors.textSecondary} />
          <Text style={[typography.h3, { color: colors.text, marginTop: spacing.md }]}>
            Property Not Found
          </Text>
          <Text style={[typography.body, { color: colors.textSecondary, marginTop: spacing.sm }]}>
            This property could not be loaded
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }}>
      <PageHeader
        title={property.name}
        onBack={() => navigation.goBack()}
      />

      <ScrollView contentContainerStyle={{ padding: spacing.lg }}>
        {/* Property Info Card */}
        <View
          style={{
            backgroundColor: colors.surface,
            padding: spacing.lg,
            borderRadius: 12,
            marginBottom: spacing.md,
            ...shadows.sm,
          }}
        >
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            <Ionicons name="location" size={20} color={colors.primary} />
            <Text style={[typography.body, { color: colors.text, marginLeft: spacing.sm, flex: 1 }]}>
              {property.location}
            </Text>
          </View>
        </View>

        {/* Stats Grid */}
        <View style={{ flexDirection: 'row', gap: spacing.md, marginBottom: spacing.md }}>
          <View
            style={{
              flex: 1,
              backgroundColor: colors.surface,
              padding: spacing.md,
              borderRadius: 12,
              alignItems: 'center',
              ...shadows.sm,
            }}
          >
            <Text style={[typography.h2, { color: colors.primary }]}>
              {property.units?.length || 0}
            </Text>
            <Text style={[typography.bodySmall, { color: colors.textSecondary, marginTop: 4 }]}>Units</Text>
          </View>

          <View
            style={{
              flex: 1,
              backgroundColor: colors.surface,
              padding: spacing.md,
              borderRadius: 12,
              alignItems: 'center',
              ...shadows.sm,
            }}
          >
            <Text style={[typography.h2, { color: colors.success }]}>
              {property.leases?.filter((l: any) => l.status === 'ACTIVE').length || 0}
            </Text>
            <Text style={[typography.bodySmall, { color: colors.textSecondary, marginTop: 4 }]}>
              Active Leases
            </Text>
          </View>
        </View>

        {/* Manager Section */}
        <View
          style={{
            backgroundColor: colors.surface,
            padding: spacing.lg,
            borderRadius: 12,
            ...shadows.sm,
          }}
        >
          <Text style={[typography.h3, { color: colors.text, marginBottom: spacing.md }]}>
            Property Manager
          </Text>
          {property.manager ? (
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <View
                style={{
                  width: 48,
                  height: 48,
                  borderRadius: 24,
                  backgroundColor: colors.primary,
                  justifyContent: 'center',
                  alignItems: 'center',
                  marginRight: spacing.md,
                }}
              >
                <Text style={[typography.h3, { color: '#FFFFFF' }]}>
                  {property.manager.name?.charAt(0)?.toUpperCase()}
                </Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[typography.body, { color: colors.text, fontWeight: '600' }]}>
                  {property.manager.name}
                </Text>
                <Text style={[typography.bodySmall, { color: colors.textSecondary }]}>
                  {property.manager.email}
                </Text>
              </View>
            </View>
          ) : (
            <View style={{ alignItems: 'center', paddingVertical: spacing.md }}>
              <Ionicons name="person-add-outline" size={40} color={colors.textSecondary} />
              <Text style={[typography.body, { color: colors.textSecondary, marginTop: spacing.sm, textAlign: 'center' }]}>
                No manager assigned{'\n'}Send an invitation from the Invitations tab
              </Text>
            </View>
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({});
