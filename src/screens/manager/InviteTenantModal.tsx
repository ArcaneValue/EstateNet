import React, { useState } from 'react';
import { View, Text, FlatList, TextInput, StyleSheet } from 'react-native';
import { Modal } from '../../components/Modal';
import { Button } from '../../components/Button';
import { Input } from '../../components/Input';
import { useTheme } from '../../theme/ThemeContext';
import { useProperties } from '../../context/PropertyContext';
import { useTenants } from '../../context/TenantContext';
import { Ionicons } from '@expo/vector-icons';

interface InviteTenantModalProps {
    visible: boolean;
    onClose: () => void;
}

export const InviteTenantModal: React.FC<InviteTenantModalProps> = ({ visible, onClose }) => {
    const { colors, spacing, typography } = useTheme();
    const { properties } = useProperties();
    const { getTenantByTenantId, inviteTenantById } = useTenants();

    const [selectedPropertyId, setSelectedPropertyId] = useState('');
    const [tenantIdInput, setTenantIdInput] = useState('');
    const [selectedUnitId, setSelectedUnitId] = useState('');
    const [rentAmount, setRentAmount] = useState('');
    const [error, setError] = useState('');
    const [success, setSuccess] = useState(false);

    const tenant = tenantIdInput.length >= 10 ? getTenantByTenantId(tenantIdInput) : null;
    const selectedProperty = properties.find(p => p.id === selectedPropertyId);
    const vacantUnits = selectedProperty?.units.filter(u => !u.isOccupied) || [];

    const handleInvite = () => {
        if (!selectedPropertyId || !tenantIdInput || !selectedUnitId || !rentAmount) {
            setError('All fields are required');
            return;
        }

        if (!tenant) {
            setError('Tenant ID not found in system');
            return;
        }

        const selectedProperty = properties.find(p => p.id === selectedPropertyId);
        const selectedUnit = selectedProperty?.units.find(u => u.id === selectedUnitId);

        if (!selectedProperty || !selectedUnit) {
            setError('Property or unit not found');
            return;
        }

        const success = inviteTenantById(
            tenantIdInput,
            selectedPropertyId,
            selectedUnitId,
            parseFloat(rentAmount),
            selectedProperty.name,
            selectedUnit.unitNumber,
            'manager-1' // Manager ID - update this based on logged-in manager
        );
        if (success) {
            setSuccess(true);
            setTimeout(() => {
                onClose();
                setSuccess(false);
                setSelectedPropertyId('');
                setTenantIdInput('');
                setSelectedUnitId('');
                setRentAmount('');
            }, 2000);
        } else {
            setError('Failed to invite tenant');
        }
    };

    return (
        <Modal visible={visible} onClose={onClose} title="Invite Tenant" size="medium">
            {!success ? (
                <View>
                    <Text style={[typography.body, { color: colors.textSecondary, marginBottom: spacing.lg }]}>
                        Search for a tenant by their ID and assign them to a vacant unit
                    </Text>

                    <Input
                        label="Tenant ID"
                        placeholder="Enter 10-character Tenant ID"
                        value={tenantIdInput}
                        onChangeText={(text) => {
                            setTenantIdInput(text.toUpperCase());
                            setError('');
                        }}
                        maxLength={10}
                        icon={<Ionicons name="card-outline" size={20} color={colors.textSecondary} />}
                    />

                    {tenant && (
                        <View style={[styles.tenantFound, { backgroundColor: colors.successLight, padding: spacing.md, borderRadius: 8, marginTop: spacing.sm }]}>
                            <Ionicons name="checkmark-circle" size={24} color={colors.success} />
                            <View style={{ marginLeft: spacing.sm, flex: 1 }}>
                                <Text style={[typography.h4, { color: colors.success }]}>Tenant Found</Text>
                                <Text style={[typography.bodySmall, { color: colors.text, marginTop: 4 }]}>
                                    {tenant.name} • {tenant.email}
                                </Text>
                            </View>
                        </View>
                    )}

                    <View style={{ marginTop: spacing.base }}>
                        <Text style={[typography.h4, { color: colors.text, marginBottom: spacing.sm }]}>
                            Select Property
                        </Text>
                        {properties.map(property => (
                            <Button
                                key={property.id}
                                title={`${property.name} (${property.units.filter(u => !u.isOccupied).length} vacant)`}
                                onPress={() => setSelectedPropertyId(property.id)}
                                variant={selectedPropertyId === property.id ? 'primary' : 'outline'}
                                size="medium"
                                style={{ marginBottom: spacing.sm }}
                            />
                        ))}
                    </View>

                    {vacantUnits.length > 0 && (
                        <View style={{ marginTop: spacing.base }}>
                            <Text style={[typography.h4, { color: colors.text, marginBottom: spacing.sm }]}>
                                Select Unit
                            </Text>
                            {vacantUnits.map(unit => (
                                <Button
                                    key={unit.id}
                                    title={`Unit ${unit.unitNumber} - UGX ${unit.rentAmount.toLocaleString()}/month`}
                                    onPress={() => {
                                        setSelectedUnitId(unit.id);
                                        setRentAmount(unit.rentAmount.toString());
                                    }}
                                    variant={selectedUnitId === unit.id ? 'primary' : 'outline'}
                                    size="medium"
                                    style={{ marginBottom: spacing.sm }}
                                />
                            ))}
                        </View>
                    )}

                    {selectedUnitId && (
                        <Input
                            label="Rent Amount (UGX)"
                            placeholder="Enter monthly rent"
                            value={rentAmount ? Number(rentAmount.replace(/,/g, '')).toLocaleString() : ''}
                            onChangeText={(text) => setRentAmount(text.replace(/,/g, ''))}
                            keyboardType="numeric"
                            icon={<Ionicons name="cash-outline" size={20} color={colors.textSecondary} />}
                        />
                    )}

                    {error && (
                        <Text style={[typography.bodySmall, { color: colors.error, marginTop: spacing.sm }]}>
                            {error}
                        </Text>
                    )}

                    <Button
                        title="Send Invitation"
                        onPress={handleInvite}
                        variant="primary"
                        size="large"
                        style={{ marginTop: spacing.lg }}
                        disabled={!tenantIdInput || !selectedPropertyId || !selectedUnitId || !rentAmount}
                    />
                </View>
            ) : (
                <View style={{ alignItems: 'center', padding: spacing.xl }}>
                    <View style={{ backgroundColor: colors.success + '20', width: 80, height: 80, borderRadius: 40, alignItems: 'center', justifyContent: 'center' }}>
                        <Ionicons name="checkmark-circle" size={48} color={colors.success} />
                    </View>
                    <Text style={[typography.h3, { color: colors.text, marginTop: spacing.lg, textAlign: 'center' }]}>
                        Invitation Sent!
                    </Text>
                    <Text style={[typography.body, { color: colors.textSecondary, marginTop: spacing.sm, textAlign: 'center' }]}>
                        {tenant?.name} has been assigned to {selectedProperty?.name}
                    </Text>
                </View>
            )}
        </Modal>
    );
};

const styles = StyleSheet.create({
    tenantFound: {
        flexDirection: 'row',
        alignItems: 'center',
    },
});
