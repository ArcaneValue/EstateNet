import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Modal as RNModal,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '../../theme/ThemeContext';
import { useAuth } from '../../context/AuthContext';
import { Ionicons } from '@expo/vector-icons';
import { useOwnerApi } from '../../hooks/useOwnerApi';
import { Button } from '../../components/Button';
import { AddPropertyForm } from '../../components/AddPropertyForm';

export const OwnerPropertiesScreen: React.FC<any> = ({ navigation, route }) => {
  const { colors, spacing, typography, shadows } = useTheme();
  const { properties, loading, refetch, createProperty } = useOwnerApi();
  const { user } = useAuth();

  // Create Property Modal State
  const [showModal, setShowModal] = useState(route?.params?.openModal || false);

  const handleAddProperty = async (newProperty: any) => {
    const result = await createProperty({
      name: newProperty.name,
      location: newProperty.location,
      units: newProperty.units?.map((u: any) => ({
        unitNumber: u.unitNumber,
        rentAmount: u.rentAmount
      }))
    });
    if (result.success) {
      setShowModal(false);
    }
  };

  const renderProperty = (property: any) => (
    <TouchableOpacity
      key={property.id}
      style={[
        styles.propertyCard,
        {
          backgroundColor: colors.surface,
          padding: spacing.lg,
          marginBottom: spacing.md,
          borderRadius: 12,
          ...shadows.sm,
        },
      ]}
      onPress={() => {
        navigation.navigate('OwnerPropertyDetail', { property });
      }}
    >
      <View style={styles.propertyHeader}>
        <View style={[styles.propertyIcon, { backgroundColor: colors.primary + '20' }]}>
          <Ionicons name="home" size={24} color={colors.primary} />
        </View>
        <View style={styles.propertyInfo}>
          <Text style={[typography.h3, { color: colors.text }]}>{property.name}</Text>
          <Text style={[typography.bodySmall, { color: colors.textSecondary }]}>
            {property.location}
          </Text>
        </View>
        <Ionicons name="chevron-forward" size={20} color={colors.textSecondary} />
      </View>
      <View style={[styles.propertyStats, { marginTop: spacing.md }]}>
        <View style={styles.stat}>
          <Text style={[typography.h3, { color: colors.primary }]}>
            {property.units?.length || 0}
          </Text>
          <Text style={[typography.bodySmall, { color: colors.textSecondary }]}>Units</Text>
        </View>
        <View style={styles.stat}>
          <Text style={[typography.h3, { color: colors.success }]}>
            {property.manager ? 'Assigned' : 'No Manager'}
          </Text>
          <Text style={[typography.bodySmall, { color: colors.textSecondary }]}>Manager</Text>
        </View>
        <View style={styles.stat}>
          <Text style={[typography.h3, { color: colors.warning }]}>
            {property.leases?.filter((l: any) => l.status === 'ACTIVE').length || 0}
          </Text>
          <Text style={[typography.bodySmall, { color: colors.textSecondary }]}>Active Leases</Text>
        </View>
      </View>
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }}>
      <View style={[styles.header, { padding: spacing.lg }]}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={{ padding: 8 }}>
          <Ionicons name="arrow-back" size={24} color={colors.text} />
        </TouchableOpacity>
        <View style={{ flex: 1, marginLeft: spacing.md }}>
          <Text style={[typography.h2, { color: colors.text }]}>My Properties</Text>
          <Text style={[typography.body, { color: colors.textSecondary }]}>
            {properties.length} {properties.length === 1 ? 'property' : 'properties'}
          </Text>
        </View>
        <TouchableOpacity
          onPress={() => setShowModal(true)}
          style={[styles.addButton, { backgroundColor: colors.primary }]}
        >
          <Ionicons name="add" size={24} color="#FFFFFF" />
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={{ padding: spacing.lg, paddingTop: 0 }}>
        {loading ? (
          <Text style={[typography.body, { color: colors.textSecondary, textAlign: 'center' }]}>
            Loading properties...
          </Text>
        ) : properties.length === 0 ? (
          <View
            style={[
              styles.emptyState,
              {
                backgroundColor: colors.surface,
                padding: spacing.xl,
                borderRadius: 12,
                alignItems: 'center',
              },
            ]}
          >
            <Ionicons name="home-outline" size={64} color={colors.textSecondary} />
            <Text style={[typography.h3, { color: colors.text, marginTop: spacing.md }]}>
              No Properties Yet
            </Text>
            <Text
              style={[
                typography.body,
                { color: colors.textSecondary, textAlign: 'center', marginTop: spacing.sm },
              ]}
            >
              Tap the + button to add your first property
            </Text>
            <Button
              title="Add Property"
              onPress={() => setShowModal(true)}
              variant="primary"
              size="large"
              style={{ marginTop: spacing.lg }}
              icon={<Ionicons name="add-circle" size={20} color="#FFFFFF" />}
            />
          </View>
        ) : (
          properties.map(renderProperty)
        )}
      </ScrollView>

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
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  addButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
  },
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
