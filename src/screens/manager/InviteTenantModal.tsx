import React, { useState } from 'react';
import { View, Text, StyleSheet, ActivityIndicator } from 'react-native';
import { Modal } from '../../components/Modal';
import { Button } from '../../components/Button';
import { Input } from '../../components/Input';
import { useTheme } from '../../theme/ThemeContext';
import { useProperties } from '../../context/PropertyContext';
import { apiGet, apiPost } from '../../utils/apiClient';
import { Ionicons } from '@expo/vector-icons';

interface InviteTenantModalProps {
    visible: boolean;
    onClose: () => void;
    onSuccess?: () => void;
}

export const InviteTenantModal: React.FC<InviteTenantModalProps> = ({ visible, onClose, onSuccess }) => {
    const { colors, spacing, typography } = useTheme();
    const { properties } = useProperties();

    const [selectedPropertyId, setSelectedPropertyId] = useState('');
    const [tenantIdInput, setTenantIdInput] = useState('');
    const [selectedUnitId, setSelectedUnitId] = useState('');
    const [rentAmount, setRentAmount] = useState('');
    const [error, setError] = useState('');
    const [success, setSuccess] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [tenantLookupLoading, setTenantLookupLoading] = useState(false);
    const [tenantData, setTenantData] = useState<{ name: string; email: string } | null>(null);
    const selectedProperty = properties.find(p => p.id === selectedPropertyId);
    const vacantUnits = selectedProperty?.units.filter(u => !u.isOccupied) || [];

    // Lookup tenant when ID changes
    const handleTenantIdChange = async (text: string) => {
        const upperText = text.toUpperCase();
        setTenantIdInput(upperText);
        setError('');
        setTenantData(null);

        if (upperText.length >= 10) {
            setTenantLookupLoading(true);
            try {
                const { status, json } = await apiGet(`/identities/${upperText}`);
                if (status === 200 && json?.success && json.data?.identity) {
                    setTenantData({
                        name: json.data.identity.name,
                        email: json.data.identity.email
                    });
                } else {
                    setError('Tenant ID not found in system');
                }
            } catch (err) {
                setError('Failed to lookup tenant');
            } finally {
                setTenantLookupLoading(false);
            }
        }
    };

    const handleInvite = async () => {
        if (!selectedPropertyId || !tenantIdInput || !selectedUnitId || !rentAmount) {
            setError('All fields are required');
            return;
        }

        if (!tenantData) {
            setError('Please enter a valid Tenant ID');
            return;
        }

        const selectedProperty = properties.find(p => p.id === selectedPropertyId);
        const selectedUnit = selectedProperty?.units.find(u => u.id === selectedUnitId);

        if (!selectedProperty || !selectedUnit) {
            setError('Property or unit not found');
            return;
        }

        setIsLoading(true);
        setError('');

        try {
            const { status, json } = await apiPost('/tenants/invite', {
                tenantId: tenantIdInput,
                propertyId: selectedPropertyId,
                unitId: selectedUnitId,
                rentAmount: parseFloat(rentAmount)
            });

            if (status === 200 || status === 201) {
                setSuccess(true);
                setTimeout(() => {
                    onClose();
                    setSuccess(false);
                    setSelectedPropertyId('');
                    setTenantIdInput('');
                    setSelectedUnitId('');
                    setRentAmount('');
                    setTenantData(null);
                    onSuccess?.();
                }, 2000);
            } else {
                setError(json?.message || 'Failed to invite tenant');
            }
        } catch (err) {
            setError('Network error. Please try again.');
        } finally {
            setIsLoading(false);
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
                        onChangeText={handleTenantIdChange}
                        maxLength={10}
                        icon={<Ionicons name="card-outline" size={20} color={colors.textSecondary} />}
                        rightIcon={tenantLookupLoading ? <ActivityIndicator size="small" color={colors.primary} /> : undefined}
                    />

                    {tenantData && (
                        <View style={[styles.tenantFound, { backgroundColor: colors.successLight, padding: spacing.md, borderRadius: 8, marginTop: spacing.sm }]}>
                            <Ionicons name="checkmark-circle" size={24} color={colors.success} />
                            <View style={{ marginLeft: spacing.sm, flex: 1 }}>
                                <Text style={[typography.h4, { color: colors.success }]}>Tenant Found</Text>
                                <Text style={[typography.bodySmall, { color: colors.text, marginTop: 4 }]}>
                                    {tenantData.name} • {tenantData.email}
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
                        title={isLoading ? 'Sending...' : 'Send Invitation'}
                        onPress={handleInvite}
                        variant="primary"
                        size="large"
                        style={{ marginTop: spacing.lg }}
                        disabled={!tenantIdInput || !selectedPropertyId || !selectedUnitId || !rentAmount || isLoading || !tenantData}
                        loading={isLoading}
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
                        {tenantData?.name} has been invited to {selectedProperty?.name}
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
