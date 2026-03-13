import React, { useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Modal as RNModal,
  ActivityIndicator,
} from 'react-native';
import { useTheme } from '../../theme/ThemeContext';
import { useAuth } from '../../context/AuthContext';
import { Ionicons } from '@expo/vector-icons';
import { useOwnerApi } from '../../hooks/useOwnerApi';
import { TopAppBar } from '../../components/TopAppBar';
import { ScreenWrapper } from '../../components/ScreenWrapper';
import { Button } from '../../components/Button';
import { AddPropertyForm } from '../../components/AddPropertyForm';
import { Card } from '../../components/Card';
import { StatusBadge } from '../../components/StatusBadge';
import { formatCompactNumber } from '../../utils/formatters';

export const OwnerPropertiesScreen: React.FC<any> = ({ navigation, route }) => {
  const { colors, spacing, typography, borderRadius } = useTheme();
  const { user } = useAuth();
  const { properties, loading, refetch, createProperty } = useOwnerApi();

  // Calculate total units
  const totalUnits = useMemo(() => (
    properties.reduce((sum: number, property: any) => sum + (property.units?.length || 0), 0)
  ), [properties]);

  const totalActiveLeases = useMemo(() => (
    properties.reduce((sum: number, property: any) => (
      sum + (property.leases?.filter((l: any) => l.status === 'ACTIVE').length || 0)
    ), 0)
  ), [properties]);

  // Create Property Modal State
  const [showModal, setShowModal] = useState(route?.params?.openModal || false);

  const handleAddProperty = async (newProperty: any) => {
    const result = await createProperty({
      name: newProperty.name,
      location: newProperty.location,
    });
    if (result.success) {
      setShowModal(false);
    }
  };

  const renderProperty = ({ item: property }: { item: any }) => {
    const unitsCount = property.units?.length || 0;
    const activeLeases = property.leases?.filter((l: any) => l.status === 'ACTIVE').length || 0;
    const hasManager = Boolean(property.manager);

    return (
      <TouchableOpacity
        onPress={() => navigation.navigate('OwnerPropertyDetail', { property })}
        activeOpacity={0.85}
        style={{ marginBottom: spacing.md }}
      >
        <Card style={{ padding: spacing.lg }}>
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            <View style={{
              width: 52,
              height: 52,
              borderRadius: borderRadius.md,
              backgroundColor: colors.primary + '15',
              alignItems: 'center',
              justifyContent: 'center',
              marginRight: spacing.md,
            }}>
              <Ionicons name="home" size={22} color={colors.primary} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[typography.h3, { color: colors.text }]} numberOfLines={1}>{property.name}</Text>
              <Text style={[typography.bodySmall, { color: colors.textSecondary }]} numberOfLines={1}>
                {property.location || 'No location provided'}
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color={colors.textTertiary} />
          </View>

          <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: spacing.lg }}>
            <View style={{ flex: 1 }}>
              <Text style={[typography.bodySmall, { color: colors.textSecondary }]}>Units</Text>
              <Text style={[typography.h3, { color: colors.text }]}>{formatCompactNumber(unitsCount)}</Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[typography.bodySmall, { color: colors.textSecondary }]}>Active leases</Text>
              <Text style={[typography.h3, { color: colors.text }]}>{formatCompactNumber(activeLeases)}</Text>
            </View>
            <View style={{ flex: 1, alignItems: 'flex-end' }}>
              <StatusBadge
                status={hasManager ? 'ACCEPTED' : 'INVITED'}
                label={hasManager ? 'Manager assigned' : 'No manager'}
                variant="subtle"
                size="small"
              />
            </View>
          </View>
        </Card>
      </TouchableOpacity>
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
        data={properties}
        keyExtractor={(item) => item.id}
        contentContainerStyle={{ padding: spacing.lg, paddingBottom: spacing['2xl'] }}
        renderItem={renderProperty}
        ListHeaderComponent={(
          <Card style={{ marginBottom: spacing.lg }}>
            <Text style={[typography.caption, { color: colors.textSecondary, textTransform: 'uppercase', letterSpacing: 0.6 }]}>Portfolio</Text>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: spacing.md }}>
              <View>
                <Text style={[typography.bodySmall, { color: colors.textSecondary }]}>Properties</Text>
                <Text style={[typography.h2, { color: colors.text }]}>{properties.length}</Text>
              </View>
              <View>
                <Text style={[typography.bodySmall, { color: colors.textSecondary }]}>Units</Text>
                <Text style={[typography.h2, { color: colors.text }]}>{totalUnits}</Text>
              </View>
              <View>
                <Text style={[typography.bodySmall, { color: colors.textSecondary }]}>Active leases</Text>
                <Text style={[typography.h2, { color: colors.text }]}>{totalActiveLeases}</Text>
              </View>
            </View>
            <Button
              title="Add property"
              onPress={() => setShowModal(true)}
              variant="pill"
              size="compact"
              style={{ marginTop: spacing.lg, alignSelf: 'flex-start' }}
              icon={<Ionicons name="add" size={16} color={colors.text} />}
            />
          </Card>
        )}
        ListEmptyComponent={
          loading ? (
            <View style={{ padding: spacing.xl, alignItems: 'center' }}>
              <ActivityIndicator size="large" color={colors.primary} />
              <Text style={[typography.body, { color: colors.textSecondary, marginTop: spacing.md }]}>Loading properties...</Text>
            </View>
          ) : (
            <Card style={{ alignItems: 'center', padding: spacing.xl }}>
              <Ionicons name="home-outline" size={40} color={colors.textSecondary} />
              <Text style={[typography.bodySmall, { color: colors.textSecondary, marginTop: spacing.sm, textAlign: 'center' }]}>No properties yet. Add your first property to get started.</Text>
              <Button
                title="Add property"
                onPress={() => setShowModal(true)}
                variant="primary"
                size="medium"
                style={{ marginTop: spacing.md }}
                icon={<Ionicons name="add-circle" size={18} color={colors.textOnPrimary} />}
              />
            </Card>
          )
        }
      />

      {/* Add Property Modal - Using AddPropertyForm like Manager */}
      <RNModal
        visible={showModal}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setShowModal(false)}
      >
        <AddPropertyForm
          onSubmit={handleAddProperty}
          onCancel={() => setShowModal(false)}
        />
      </RNModal>
    </ScreenWrapper>
  );
};

const styles = StyleSheet.create({
  propertyCard: {},
  propertyHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  propertyIcon: {
    width: 48,
    height: 48,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  propertyInfo: {
    flex: 1,
    marginLeft: 12,
  },
  propertyStats: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: 'rgba(0,0,0,0.05)',
  },
  stat: {
    alignItems: 'center',
  },
  emptyState: {},
});
