import React, { useEffect } from 'react';
import { View, Text } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '../../theme/ThemeContext';
import { Modal } from '../../components/Modal';
import { PropertyListItem } from '../../components/PropertyListItem';
import { useProperties } from '../../context/PropertyContext';
import { Property } from '../../types/types';

interface VacanciesModalProps {
    visible: boolean;
    onClose: () => void;
}

export const VacanciesModal: React.FC<VacanciesModalProps> = ({ visible, onClose }) => {
    const { colors, spacing, typography } = useTheme();
    const { properties } = useProperties();
    const [selectedProperty, setSelectedProperty] = React.useState<Property | null>(null);

    const propertiesWithVacancies = properties?.filter(p => p?.units?.some(u => !u?.isOccupied)) || [];

    const renderProperty = ({ item }: { item: Property }) => {
        const vacantCount = item?.units?.filter(u => !u?.isOccupied)?.length || 0;
        const totalUnits = item?.units?.length || 0;

        return (
            <PropertyListItem
                propertyId={item.id}
                name={item.name}
                location={item.location}
                occupiedUnits={totalUnits - vacantCount}
                totalUnits={totalUnits}
                monthlyRent={0}
                onPress={() => setSelectedProperty(item)}
            />
        );
    };

    const renderVacantUnits = () => {
        if (!selectedProperty) return null;

        const vacantUnits = selectedProperty.units?.filter(u => !u?.isOccupied) || [];

        return vacantUnits.map((unit) => (
            <View 
                key={unit.id}
                style={{
                    backgroundColor: colors.surface,
                    padding: spacing.md,
                    borderRadius: 12,
                    marginBottom: spacing.sm,
                    borderLeftWidth: 4,
                    borderLeftColor: colors.success,
                }}
            >
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                    <View style={{ flex: 1 }}>
                        <Text style={[typography.h4, { color: colors.text, marginBottom: spacing.xs }]}>
                            {unit.unitNumber}
                        </Text>
                        <Text style={[typography.bodySmall, { color: colors.textSecondary }]}>
                            Rent: UGX {unit.rentAmount?.toLocaleString() || '0'}
                        </Text>
                    </View>
                    <View 
                        style={{
                            backgroundColor: colors.success + '20',
                            paddingHorizontal: spacing.sm,
                            paddingVertical: spacing.xs,
                            borderRadius: 8,
                        }}
                    >
                        <Text style={[typography.bodySmall, { color: colors.success, fontWeight: '600' }]}>
                            Available
                        </Text>
                    </View>
                </View>
            </View>
        ));
    };

    return (
        <>
            <Modal visible={visible && !selectedProperty} onClose={onClose} title="Vacant Units" size="large">
                <Text style={[typography.body, { color: colors.textSecondary, marginBottom: spacing.base }]}>
                    Properties with vacant units
                </Text>
                {propertiesWithVacancies.length > 0 ? (
                    propertiesWithVacancies.map((item) => (
                        <View key={item.id}>
                            {renderProperty({ item })}
                        </View>
                    ))
                ) : (
                    <View style={{ padding: spacing.lg, alignItems: 'center' }}>
                        <Text style={[typography.body, { color: colors.textSecondary, textAlign: 'center' }]}>
                            No vacant units found. All units are occupied!
                        </Text>
                    </View>
                )}
            </Modal>

            {selectedProperty && (
                <Modal
                    visible={!!selectedProperty}
                    onClose={() => setSelectedProperty(null)}
                    title={`Vacant Units - ${selectedProperty.name}`}
                    size="large"
                >
                    {(() => {
                        const vacantUnits = selectedProperty.units?.filter(u => !u?.isOccupied) || [];
                        return vacantUnits.length > 0 ? (
                            <View>
                                <Text style={[typography.body, { color: colors.textSecondary, marginBottom: spacing.md }]}>
                                    {vacantUnits.length} vacant {vacantUnits.length === 1 ? 'unit' : 'units'} available
                                </Text>
                                {renderVacantUnits()}
                            </View>
                        ) : (
                            <View style={{ padding: spacing.lg, alignItems: 'center' }}>
                                <Text style={[typography.body, { color: colors.textSecondary, textAlign: 'center' }]}>
                                    No vacant units in this property
                                </Text>
                            </View>
                        );
                    })()}
                </Modal>
            )}
        </>
    );
};
