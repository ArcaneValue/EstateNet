import React, { useState, useEffect } from 'react';
import { View, Text, FlatList, TouchableOpacity, Modal as RNModal, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '../../theme/ThemeContext';
import { useTutorial, TUTORIAL_KEYS } from '../../context/TutorialContext';
import { PropertyListItem } from '../../components/PropertyListItem';
import { Modal } from '../../components/Modal';
import { Button } from '../../components/Button';
import { TenantListItem } from '../../components/TenantListItem';
import { AddPropertyForm } from '../../components/AddPropertyForm';
import { TutorialModal } from '../../components/TutorialModal';
import { TopAppBar } from '../../components/TopAppBar';
import { useManagerProperties, Property } from '../../hooks/useManagerProperties';
import { useManagerEnforcement } from '../../hooks/useManagerEnforcement';
import { useAuth } from '../../context/AuthContext';
import { formatCompactCurrencyUGX } from '../../utils/formatters';
import { apiGet } from '../../utils/apiClient';
import { Ionicons } from '@expo/vector-icons';
import { handleEnforcement } from '../../utils/enforcementNavigation';

interface PropertyTenant {
    id: string;
    tenantId: string;
    name: string;
    email: string;
    phoneNumber: string;
    propertyId: string;
    unitId: string;
    rentAmount: number;
    paymentStatus: 'current' | 'overdue';
}

export const PropertiesScreen: React.FC<any> = ({ navigation }) => {
    const { colors, spacing, typography } = useTheme();
    const { user } = useAuth();
    const { data: properties, loading, error, refetch, createProperty, deleteProperty } = useManagerProperties();
    const { checkEnforcement, checking: checkingEnforcement } = useManagerEnforcement();
    const [selectedProperty, setSelectedProperty] = useState<Property | null>(null);
    const [showAddModal, setShowAddModal] = useState(false);
    const [propertyTenants, setPropertyTenants] = useState<PropertyTenant[]>([]);
    const [tenantsLoading, setTenantsLoading] = useState(false);
    const [showTutorial, setShowTutorial] = useState(false);

    // Tutorial
    const { shouldShowTutorial, markTutorialSeen } = useTutorial();

    useEffect(() => {
        checkTutorial();
    }, []);

    const checkTutorial = async () => {
        const shouldShow = await shouldShowTutorial(TUTORIAL_KEYS.MANAGER_PROPERTIES);
        if (shouldShow) {
            setTimeout(() => setShowTutorial(true), 500);
        }
    };

    const handleTutorialClose = async () => {
        await markTutorialSeen(TUTORIAL_KEYS.MANAGER_PROPERTIES);
        setShowTutorial(false);
    };

    const handleAddPropertyPress = async () => {
        if (__DEV__) {
            console.log('[PropertiesScreen] Add Property button pressed');
        }

        // Check enforcement before opening modal
        const { canProceed, enforcement } = await checkEnforcement('Add Property');

        if (!canProceed && enforcement) {
            if (__DEV__) {
                console.log('[PropertiesScreen] Enforcement blocked Add Property modal');
            }
            // Navigate to billing/terms screen
            await handleEnforcement(navigation, enforcement, { blockedFeature: 'Add Property' });
            return;
        }

        // Enforcement passed or not needed, open modal
        setShowAddModal(true);
    };

    const handleAddProperty = async (newProperty: any) => {
        if (__DEV__) {
            console.log('[PropertiesScreen] handleAddProperty called');
            console.log('[PropertiesScreen] navigation object:', navigation);
            try {
                const navState = navigation.getState?.();
                console.log('[PropertiesScreen] Current navigation state:', JSON.stringify(navState, null, 2));
            } catch (e) {
                console.log('[PropertiesScreen] Failed to get navigation state:', e);
            }
        }

        const result = await createProperty({
            name: newProperty.name,
            location: newProperty.location,
            units: newProperty.units?.map((u: any) => ({
                unitNumber: u.unitNumber,
                rentAmount: u.rentAmount
            }))
        });

        if (__DEV__) {
            console.log('[PropertiesScreen] createProperty result:', result);
            console.log('[PropertiesScreen] result.enforcement:', result.enforcement);
            console.log('[PropertiesScreen] About to call handleEnforcement...');
        }

        if (await handleEnforcement(navigation, result.enforcement, { blockedFeature: 'Add Property' })) {
            if (__DEV__) console.log('[PropertiesScreen] handleEnforcement returned true (enforcement handled)');
            return;
        }

        if (__DEV__) console.log('[PropertiesScreen] handleEnforcement returned false (no enforcement or navigation failed)');

        if (result.ok) {
            setShowAddModal(false);
            // Navigate to Dashboard with refresh flag to trigger silent auto-refresh
            navigation.navigate('Dashboard', { refresh: true });
        }
    };

    const handleDeleteProperty = async (id: string) => {
        const success = await deleteProperty(id);
        if (success) {
            setSelectedProperty(null);
        }
    };

    // Fetch tenants when a property is selected
    useEffect(() => {
        if (selectedProperty) {
            fetchPropertyTenants(selectedProperty.id);
        } else {
            setPropertyTenants([]);
        }
    }, [selectedProperty]);

    const fetchPropertyTenants = async (propertyId: string) => {
        setTenantsLoading(true);
        try {
            const { status, json } = await apiGet('/manager/tenants');
            if (status === 200 && json?.success && Array.isArray(json.data)) {
                // Filter tenants for this property
                const filtered = json.data.filter((t: any) => t.propertyId === propertyId);
                setPropertyTenants(filtered);
            } else {
                setPropertyTenants([]);
            }
        } catch (err) {
            console.error('Failed to load property tenants:', err);
            setPropertyTenants([]);
        } finally {
            setTenantsLoading(false);
        }
    };

    const getOccupiedCount = (property: Property) => {
        return property.units.filter(u => u.isOccupied).length;
    };

    const getMonthlyRent = (property: Property) => {
        return property.units.reduce((sum, u) => sum + u.rentAmount, 0);
    };

    if (loading && properties.length === 0) {
        return (
            <SafeAreaView style={{ flex: 1, backgroundColor: colors.background, justifyContent: 'center', alignItems: 'center' }}>
                <ActivityIndicator size="large" color={colors.primary} />
                <Text style={[typography.body, { color: colors.textSecondary, marginTop: spacing.md }]}>
                    Loading properties...
                </Text>
            </SafeAreaView>
        );
    }

    if (error && properties.length === 0) {
        return (
            <SafeAreaView style={{ flex: 1, backgroundColor: colors.background, justifyContent: 'center', alignItems: 'center', padding: spacing.xl }}>
                <Ionicons name="alert-circle-outline" size={64} color={colors.error} />
                <Text style={[typography.h3, { color: colors.text, marginTop: spacing.md, textAlign: 'center' }]}>
                    Failed to load properties
                </Text>
                <Text style={[typography.body, { color: colors.textSecondary, marginTop: spacing.sm, textAlign: 'center' }]}>
                    {error}
                </Text>
                <Button
                    title="Retry"
                    onPress={refetch}
                    style={{ marginTop: spacing.lg }}
                />
            </SafeAreaView>
        );
    }

    return (
        <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }}>
            <TopAppBar
                onNotificationsPress={() => { }}
                onProfilePress={() => navigation.navigate('Profile')}
                profileImage={user?.profileImage}
                propertyCount={properties.length}
            />
            <FlatList
                data={properties}
                refreshing={loading}
                onRefresh={refetch}
                ListHeaderComponent={
                    <View style={{ padding: spacing.base }}>
                        {/* Add Property Button */}
                        <Button
                            title={checkingEnforcement ? 'Checking...' : '+ Add Property'}
                            onPress={handleAddPropertyPress}
                            variant="primary"
                            size="large"
                            style={{ marginBottom: spacing.lg }}
                            icon={<Ionicons name="add-circle" size={20} color="#FFFFFF" />}
                            disabled={checkingEnforcement}
                            loading={checkingEnforcement}
                        />
                    </View>
                }
                renderItem={({ item }) => (
                    <View style={{ paddingHorizontal: spacing.base, marginBottom: spacing.sm }}>
                        <PropertyListItem
                            propertyId={item.id}
                            name={item.name}
                            location={item.location}
                            occupiedUnits={getOccupiedCount(item)}
                            totalUnits={item.units.length}
                            monthlyRent={getMonthlyRent(item)}
                            onPress={() => setSelectedProperty(item)}
                        />
                    </View>
                )}
                keyExtractor={item => item.id}
                contentContainerStyle={{ paddingBottom: spacing.xl }}
                showsVerticalScrollIndicator={false}
                ListEmptyComponent={
                    <View style={{ alignItems: 'center', marginTop: spacing['3xl'] }}>
                        <Ionicons name="home-outline" size={64} color={colors.textTertiary} />
                        <Text style={[typography.h3, { color: colors.textSecondary, marginTop: spacing.md }]}>
                            No properties yet
                        </Text>
                        <Text style={[typography.body, { color: colors.textTertiary, marginTop: spacing.sm, textAlign: 'center' }]}>
                            Tap "Add Property" to create your first property
                        </Text>
                    </View>
                }
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
                                <InfoRow label="Total Units" value={selectedProperty.units.length.toString()} colors={colors} typography={typography} />
                                <InfoRow label="Occupied" value={`${getOccupiedCount(selectedProperty)} units`} colors={colors} typography={typography} />
                                <InfoRow label="Vacant" value={`${selectedProperty.units.length - getOccupiedCount(selectedProperty)} units`} colors={colors} typography={typography} />
                                <InfoRow label="Monthly Revenue" value={formatCompactCurrencyUGX(getMonthlyRent(selectedProperty))} colors={colors} typography={typography} />
                            </View>
                        </View>

                        {/* Actions */}
                        <View style={{ flexDirection: 'row', gap: spacing.md, marginBottom: spacing.lg }}>
                            <Button
                                title="Delete Property"
                                onPress={() => handleDeleteProperty(selectedProperty.id)}
                                variant="outline"
                                style={{ flex: 1, borderColor: colors.error }}
                            />
                        </View>

                        {/* Tenants */}
                        <View>
                            <Text style={[typography.h3, { color: colors.text, marginBottom: spacing.md }]}>
                                Tenants
                            </Text>
                            {tenantsLoading ? (
                                <ActivityIndicator size="small" color={colors.primary} />
                            ) : propertyTenants.length === 0 ? (
                                <Text style={[typography.body, { color: colors.textSecondary }]}>
                                    No tenants assigned to this property
                                </Text>
                            ) : (
                                propertyTenants.map((item: PropertyTenant) => {
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
                                })
                            )}
                        </View>
                    </View>
                </Modal>
            )}

            {/* Properties Tutorial */}
            <TutorialModal
                visible={showTutorial}
                onClose={handleTutorialClose}
                title="Manage Your Properties"
                description="Add and oversee all your rental properties from this screen."
                steps={[
                    {
                        title: 'Add Properties',
                        description: 'Click the "Add Property" button to register a new rental property with units and rent amounts.',
                        icon: 'add-circle-outline'
                    },
                    {
                        title: 'View Property Details',
                        description: 'Tap any property to see details, units, occupancy, and assigned tenants.',
                        icon: 'information-circle-outline'
                    },
                    {
                        title: 'Track Occupancy',
                        description: 'Monitor which units are occupied and which are vacant at a glance.',
                        icon: 'home-outline'
                    },
                    {
                        title: 'Billing Reminder',
                        description: 'Adding your first property starts your billing cycle. Make sure to pay your service fee on time.',
                        icon: 'card-outline'
                    }
                ]}
            />
        </SafeAreaView>
    );
};

const InfoRow = ({ label, value, colors, typography }: any) => (
    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
        <Text style={[typography.body, { color: colors.textSecondary }]}>{label}</Text>
        <Text style={[typography.body, { color: colors.text, fontWeight: '600' }]}>{value}</Text>
    </View>
);
