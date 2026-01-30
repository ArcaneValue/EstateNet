import React from 'react';
import { View, Text, FlatList } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '../../theme/ThemeContext';
import { Modal } from '../../components/Modal';
import { PropertyListItem } from '../../components/PropertyListItem';
import { TenantListItem } from '../../components/TenantListItem';
import { useProperties } from '../../context/PropertyContext';
import { useTenants } from '../../context/TenantContext';
import { Property } from '../../types/types';

interface OccupiedUnitsModalProps {
    visible: boolean;
    onClose: () => void;
}

export const OccupiedUnitsModal: React.FC<OccupiedUnitsModalProps> = ({ visible, onClose }) => {
    const { colors, spacing, typography } = useTheme();
    const { properties } = useProperties();
    const { getTenantsByProperty } = useTenants();
    const [selectedProperty, setSelectedProperty] = React.useState<Property | null>(null);

    const propertiesWithOccupied = properties.filter(p => p.units.some(u => u.isOccupied));

    const renderProperty = ({ item }: { item: Property }) => {
        const occupiedCount = item.units.filter(u => u.isOccupied).length;
        const totalUnits = item.units.length;
        const tenants = getTenantsByProperty(item.id);
        const monthlyRent = tenants.reduce((sum, t) => sum + t.rentAmount, 0);

        return (
            <PropertyListItem
                propertyId={item.id}
                name={item.name}
                location={item.location}
                occupiedUnits={occupiedCount}
                totalUnits={totalUnits}
                monthlyRent={monthlyRent}
                onPress={() => setSelectedProperty(item)}
            />
        );
    };

    return (
        <>
            <Modal visible={visible && !selectedProperty} onClose={onClose} title="Occupied Units" size="large">
                <Text style={[typography.body, { color: colors.textSecondary, marginBottom: spacing.base }]}>
                    Properties with occupied units
                </Text>
                <FlatList
                    data={propertiesWithOccupied}
                    renderItem={renderProperty}
                    keyExtractor={item => item.id}
                    showsVerticalScrollIndicator={false}
                />
            </Modal>

            {selectedProperty && (
                <Modal
                    visible={!!selectedProperty}
                    onClose={() => setSelectedProperty(null)}
                    title={`Tenants - ${selectedProperty.name}`}
                    size="large"
                >
                    <FlatList
                        data={getTenantsByProperty(selectedProperty.id)}
                        renderItem={({ item }) => (
                            <TenantListItem
                                name={item.name}
                                tenantId={item.tenantId}
                                propertyName={selectedProperty.name}
                                unitNumber={selectedProperty.units.find(u => u.id === item.unitId)?.unitNumber}
                                rentAmount={item.rentAmount}
                                paymentStatus={item.paymentStatus}
                                phoneNumber={item.phoneNumber}
                                onPress={() => { }}
                            />
                        )}
                        keyExtractor={item => item.id}
                    />
                </Modal>
            )}
        </>
    );
};
