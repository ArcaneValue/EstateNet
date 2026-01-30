import React, { useState } from 'react';
import { View, Text, FlatList, TouchableOpacity, Modal as RNModal } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '../../theme/ThemeContext';
import { PropertyListItem } from '../../components/PropertyListItem';
import { Modal } from '../../components/Modal';
import { Button } from '../../components/Button';
import { TenantListItem } from '../../components/TenantListItem';
import { AddPropertyForm } from '../../components/AddPropertyForm';
import { useProperties } from '../../context/PropertyContext';
import { useTenants } from '../../context/TenantContext';
import { Property } from '../../types/types';
import { Ionicons } from '@expo/vector-icons';

export const PropertiesScreen: React.FC<any> = ({ navigation }) => {
    const { colors, spacing, typography } = useTheme();
    const { properties, addProperty } = useProperties();
    const { getTenantsByProperty } = useTenants();
    const [selectedProperty, setSelectedProperty] = useState<Property | null>(null);
    const [showAddModal, setShowAddModal] = useState(false);

    const handleAddProperty = (newProperty: Omit<Property, 'id' | 'createdAt' | 'updatedAt'>) => {
        addProperty(newProperty);
        setShowAddModal(false);
    };

    const getOccupiedCount = (property: Property) => {
        return property.units.filter(u => u.isOccupied).length;
    };

    const getMonthlyRent = (property: Property) => {
        const tenants = getTenantsByProperty(property.id);
        return tenants.reduce((sum, t) => sum + t.rentAmount, 0);
    };

    return (
        <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }}>
            <FlatList
                data={properties}
                ListHeaderComponent={
                    <View>
                        {/* Header */}
                        <View style={{ marginBottom: spacing.lg }}>
                            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                                <TouchableOpacity
                                    onPress={() => navigation.goBack()}
                                    style={{ marginRight: spacing.sm, padding: spacing.xs }}
                                >
                                    <Ionicons name="arrow-back" size={24} color={colors.text} />
                                </TouchableOpacity>
                                <Text style={[typography.h2, { color: colors.text }]}>
                                    My Properties
                                </Text>
                            </View>
                            <Text style={[typography.body, { color: colors.textSecondary, marginTop: spacing.sm, marginLeft: spacing.xl + spacing.xs }]}>
                                Manage your property portfolio
                            </Text>
                        </View>

                        {/* Add Property Button */}
                        <Button
                            title="+ Add Property"
                            onPress={() => setShowAddModal(true)}
                            variant="primary"
                            size="large"
                            style={{ marginBottom: spacing.lg }}
                            icon={<Ionicons name="add-circle" size={20} color="#FFFFFF" />}
                        />
                    </View>
                }
                renderItem={({ item }) => (
                    <PropertyListItem
                        propertyId={item.id}
                        name={item.name}
                        location={item.location}
                        occupiedUnits={getOccupiedCount(item)}
                        totalUnits={item.units.length}
                        monthlyRent={getMonthlyRent(item)}
                        onPress={() => setSelectedProperty(item)}
                    />
                )}
                keyExtractor={item => item.id}
                contentContainerStyle={{ padding: spacing.base, paddingBottom: spacing.xl }}
                showsVerticalScrollIndicator={false}
            />

            {/* Add Property Modal */}
            <RNModal
                visible={showAddModal}
                animationType="slide"
                presentationStyle="pageSheet"
                onRequestClose={() => setShowAddModal(false)}
            >
                <AddPropertyForm
                    onSubmit={handleAddProperty}
                    onCancel={() => setShowAddModal(false)}
                />
            </RNModal>

            {/* Property Details Modal */}
            {selectedProperty && (
                <Modal
                    visible={!!selectedProperty}
                    onClose={() => setSelectedProperty(null)}
                    title={selectedProperty.name}
                    size="full"
                >
                    <View>
                        {/* Property Info */}
                        <View style={{ backgroundColor: colors.surface, padding: spacing.base, borderRadius: 12, marginBottom: spacing.lg }}>
                            <Text style={[typography.h3, { color: colors.text, marginBottom: spacing.md }]}>
                                Property Details
                            </Text>
                            <View style={{ gap: spacing.sm }}>
                                <InfoRow label="Location" value={selectedProperty.location} colors={colors} typography={typography} />
                                <InfoRow label="Type" value={selectedProperty.propertyType} colors={colors} typography={typography} />
                                <InfoRow label="Total Units" value={selectedProperty.units.length.toString()} colors={colors} typography={typography} />
                                <InfoRow label="Occupied" value={`${getOccupiedCount(selectedProperty)} units`} colors={colors} typography={typography} />
                                <InfoRow label="Vacant" value={`${selectedProperty.units.length - getOccupiedCount(selectedProperty)} units`} colors={colors} typography={typography} />
                                <InfoRow label="Monthly Revenue" value={`UGX ${(getMonthlyRent(selectedProperty) / 1000000).toFixed(1)}M`} colors={colors} typography={typography} />
                            </View>
                        </View>

                        {/* Tenants */}
                        <View>
                            <Text style={[typography.h3, { color: colors.text, marginBottom: spacing.md }]}>
                                Tenants
                            </Text>
                            {getTenantsByProperty(selectedProperty.id).map((item) => {
                                const unit = selectedProperty.units.find(u => u.id === item.unitId);
                                return (
                                    <TenantListItem
                                        key={item.id}
                                        name={item.name}
                                        tenantId={item.tenantId}
                                        propertyName={selectedProperty.name}
                                        unitNumber={unit?.unitNumber}
                                        rentAmount={item.rentAmount}
                                        paymentStatus={item.paymentStatus}
                                        phoneNumber={item.phoneNumber}
                                        showArrow={false}
                                        clickable={false}
                                    />
                                );
                            })}
                        </View>
                    </View>
                </Modal>
            )}
        </SafeAreaView>
    );
};

const InfoRow = ({ label, value, colors, typography }: any) => (
    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
        <Text style={[typography.body, { color: colors.textSecondary }]}>{label}</Text>
        <Text style={[typography.body, { color: colors.text, fontWeight: '600' }]}>{value}</Text>
    </View>
);
