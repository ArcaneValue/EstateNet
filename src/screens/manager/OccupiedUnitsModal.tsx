import React, { useEffect } from 'react';
import { View, Text } from 'react-native';
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
    const { getTenantsByProperty, loadTenants } = useTenants();
    const [selectedProperty, setSelectedProperty] = React.useState<Property | null>(null);

    // Load tenants from backend when modal opens
    useEffect(() => {
        if (visible) {
            loadTenants();
        }
    }, [visible, loadTenants]);

    const propertiesWithOccupied = properties?.filter(p => p?.units?.some(u => u?.isOccupied)) || [];

    const renderProperty = ({ item }: { item: Property }) => {
        const occupiedCount = item?.units?.filter(u => u?.isOccupied)?.length || 0;
        const totalUnits = item?.units?.length || 0;
        const tenants = getTenantsByProperty(item?.id) || [];
        const monthlyRent = tenants.reduce((sum, t) => sum + (t?.rentAmount || 0), 0);

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
                {propertiesWithOccupied.length > 0 ? (
                    propertiesWithOccupied.map((item) => (
                        <View key={item.id}>
                            {renderProperty({ item })}
                        </View>
                    ))
                ) : (
                    <View style={{ padding: spacing.lg, alignItems: 'center' }}>
                        <Text style={[typography.body, { color: colors.textSecondary, textAlign: 'center' }]}>
                            No properties with occupied units found
                        </Text>
                    </View>
                )}
            </Modal>

            {selectedProperty && (
                <Modal
                    visible={!!selectedProperty}
                    onClose={() => setSelectedProperty(null)}
                    title={`Tenants - ${selectedProperty.name}`}
                    size="large"
                >
                    {(() => {
                        const tenants = getTenantsByProperty(selectedProperty?.id) || [];
                        return tenants.length > 0 ? (
                            tenants.map((item) => (
                                <TenantListItem
                                    key={item.id}
                                    name={item?.name || 'Unknown'}
                                    tenantId={item?.tenantId || ''}
                                    propertyName={selectedProperty?.name || ''}
                                    unitNumber={selectedProperty?.units?.find(u => u?.id === item?.unitId)?.unitNumber}
                                    rentAmount={item?.rentAmount || 0}
                                    paymentStatus={item?.paymentStatus || 'current'}
                                    phoneNumber={item?.phoneNumber}
                                    onPress={() => { }}
                                />
                            ))
                        ) : (
                            <View style={{ padding: spacing.lg, alignItems: 'center' }}>
                                <Text style={[typography.body, { color: colors.textSecondary, textAlign: 'center' }]}>
                                    No tenants found for this property
                                </Text>
                            </View>
                        );
                    })()}
                </Modal>
            )}
        </>
    );
};
