import React, { useState } from 'react';
import { View, Text, FlatList, TouchableOpacity, Alert, Share, StyleSheet, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '../../theme/ThemeContext';
import { useAuth } from '../../context/AuthContext';
import { useProperties } from '../../context/PropertyContext';
import { Card } from '../../components/Card';
import { Button } from '../../components/Button';
import { StatusBadge } from '../../components/StatusBadge';
import { Modal } from '../../components/Modal';
import { Ionicons } from '@expo/vector-icons';

interface OwnerRegistryScreenProps {
    navigation: any;
}

export const OwnerRegistryScreen: React.FC<OwnerRegistryScreenProps> = ({ navigation }) => {
    const { colors, spacing, typography, borderRadius } = useTheme();
    const { user } = useAuth();
    const { getOwnedProperties } = useProperties();

    const [selectedProperty, setSelectedProperty] = useState<any>(null);
    const [showQRModal, setShowQRModal] = useState(false);
    const [showShareModal, setShowShareModal] = useState(false);

    const ownedProperties = user ? getOwnedProperties(user.id) : [];

    // Generate mock property codes if they don't exist
    const propertiesWithCodes = ownedProperties.map(property => ({
        ...property,
        propertyCode: (property as any).propertyCode || `EST${property.id.slice(-6).toUpperCase()}`,
    }));

    const handleCopyCode = async (propertyCode: string) => {
        try {
            await Share.share({
                message: `Property Code: ${propertyCode}`,
                title: 'EstateNet Property Code',
            });
            Alert.alert('Success', 'Property code copied to clipboard');
        } catch (error) {
            Alert.alert('Error', 'Could not copy property code');
        }
    };

    const handleShareCode = (property: any) => {
        setSelectedProperty(property);
        setShowShareModal(true);
    };

    const handleViewQR = (property: any) => {
        setSelectedProperty(property);
        setShowQRModal(true);
    };

    const handleGenerateNewCode = (property: any) => {
        Alert.alert(
            'Generate New Code',
            'Are you sure you want to generate a new property code? The old code will no longer work.',
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: 'Generate',
                    style: 'default',
                    onPress: () => {
                        // In a real app, this would call an API to generate a new code
                        const newCode = `EST${Math.random().toString(36).slice(-6).toUpperCase()}`;
                        Alert.alert('Success', `New property code generated: ${newCode}`);
                    },
                },
            ]
        );
    };

    const renderPropertyItem = ({ item }: { item: any }) => {
        const occupiedUnits = item.units.filter((unit: any) => unit.isOccupied).length;
        const totalUnits = item.units.length;
        const occupancyRate = totalUnits > 0 ? (occupiedUnits / totalUnits) * 100 : 0;

        return (
            <Card style={{ marginBottom: spacing.md }}>
                <View style={styles.propertyItem}>
                    <View style={{ flex: 1 }}>
                        <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: spacing.sm }}>
                            <Text style={[typography.h3, { color: colors.text, fontWeight: '600' }]}>
                                {item.name}
                            </Text>
                            <StatusBadge
                                type="success"
                                label="Owned"
                                size="small"
                                style={{ marginLeft: spacing.sm }}
                            />
                        </View>

                        <Text style={[typography.bodySmall, { color: colors.textSecondary }]}>
                            {item.location}
                        </Text>

                        <View style={styles.metricsRow}>
                            <View style={styles.metricItem}>
                                <Text style={[typography.bodySmall, { color: colors.textSecondary }]}>
                                    {totalUnits} units
                                </Text>
                            </View>
                            <View style={styles.metricItem}>
                                <Text style={[typography.bodySmall, { color: colors.textSecondary }]}>
                                    {occupiedUnits} occupied
                                </Text>
                            </View>
                            <View style={styles.metricItem}>
                                <Text style={[typography.bodySmall, { color: colors.textSecondary }]}>
                                    {occupancyRate.toFixed(0)}% occupancy
                                </Text>
                            </View>
                        </View>
                    </View>
                </View>

                {/* Property Code Section */}
                <View style={[styles.codeSection, { backgroundColor: colors.surface }]}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: spacing.sm }}>
                        <Ionicons name="key" size={16} color={colors.primary} />
                        <Text style={[typography.body, { color: colors.text, fontWeight: '600', marginLeft: spacing.xs }]}>
                            Property Code
                        </Text>
                    </View>

                    <View style={styles.codeRow}>
                        <Text style={[typography.h2, { color: colors.primary, fontFamily: 'monospace' }]}>
                            {item.propertyCode}
                        </Text>
                        <View style={styles.codeActions}>
                            <TouchableOpacity
                                style={[styles.codeButton, { borderColor: colors.border }]}
                                onPress={() => handleCopyCode(item.propertyCode)}
                            >
                                <Ionicons name="copy" size={16} color={colors.textSecondary} />
                            </TouchableOpacity>
                            <TouchableOpacity
                                style={[styles.codeButton, { borderColor: colors.border }]}
                                onPress={() => handleShareCode(item)}
                            >
                                <Ionicons name="share" size={16} color={colors.textSecondary} />
                            </TouchableOpacity>
                            <TouchableOpacity
                                style={[styles.codeButton, { borderColor: colors.primary }]}
                                onPress={() => handleViewQR(item)}
                            >
                                <Ionicons name="qr-code" size={16} color={colors.primary} />
                            </TouchableOpacity>
                        </View>
                    </View>

                    <Text style={[typography.bodySmall, { color: colors.textSecondary, marginTop: spacing.sm }]}>
                        Share this code with managers to grant them access to request property management permissions
                    </Text>
                </View>

                {/* Action Buttons */}
                <View style={styles.actionRow}>
                    <TouchableOpacity
                        style={[styles.actionButton, { borderColor: colors.primary }]}
                        onPress={() => handleViewQR(item)}
                    >
                        <Ionicons name="qr-code" size={16} color={colors.primary} />
                        <Text style={[typography.bodySmall, { color: colors.primary, marginLeft: spacing.xs }]}>
                            View QR
                        </Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                        style={[styles.actionButton, { borderColor: colors.accent }]}
                        onPress={() => handleShareCode(item)}
                    >
                        <Ionicons name="share" size={16} color={colors.accent} />
                        <Text style={[typography.bodySmall, { color: colors.accent, marginLeft: spacing.xs }]}>
                            Share Code
                        </Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                        style={[styles.actionButton, { borderColor: colors.border }]}
                        onPress={() => handleGenerateNewCode(item)}
                    >
                        <Ionicons name="refresh" size={16} color={colors.textSecondary} />
                        <Text style={[typography.bodySmall, { color: colors.textSecondary, marginLeft: spacing.xs }]}>
                            New Code
                        </Text>
                    </TouchableOpacity>
                </View>
            </Card>
        );
    };

    return (
        <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }}>
            {/* Header */}
            <View style={{
                flexDirection: 'row',
                alignItems: 'center',
                padding: spacing.base,
                borderBottomWidth: 1,
                borderBottomColor: colors.divider,
            }}>
                <TouchableOpacity
                    onPress={() => navigation.goBack()}
                    style={{ marginRight: spacing.sm }}
                >
                    <Ionicons name="arrow-back" size={24} color={colors.text} />
                </TouchableOpacity>
                <View style={{ flex: 1 }}>
                    <Text style={[typography.h2, { color: colors.text }]}>
                        Property Registry
                    </Text>
                    <Text style={[typography.bodySmall, { color: colors.textSecondary }]}>
                        Property codes and QR codes for access
                    </Text>
                </View>
            </View>

            <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: spacing.base }}>
                {/* Info Card */}
                <Card style={{ marginBottom: spacing.lg, padding: spacing.md }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: spacing.sm }}>
                        <Ionicons name="information-circle" size={20} color={colors.primary} />
                        <Text style={[typography.body, { color: colors.text, fontWeight: '600', marginLeft: spacing.xs }]}>
                            Property Access Codes
                        </Text>
                    </View>
                    <Text style={[typography.body, { color: colors.text, marginBottom: spacing.sm }]}>
                        Property codes allow managers to request access to your properties. Share these codes with trusted managers who need property management permissions.
                    </Text>
                    <Text style={[typography.bodySmall, { color: colors.textSecondary }]}>
                        Each property has a unique 6-character code that can be shared via QR code, text, or copied to clipboard.
                    </Text>
                </Card>

                {/* Properties List */}
                <Text style={[typography.h3, { color: colors.text, marginBottom: spacing.md }]}>
                    Properties ({propertiesWithCodes.length})
                </Text>

                {propertiesWithCodes.map((property) => {
                    const occupiedUnits = property.units.filter((unit: any) => unit.isOccupied).length;
                    const totalUnits = property.units.length;
                    const occupancyRate = totalUnits > 0 ? (occupiedUnits / totalUnits) * 100 : 0;

                    return (
                        <Card key={property.id} style={{ marginBottom: spacing.md }}>
                            <View style={styles.propertyItem}>
                                <View style={{ flex: 1 }}>
                                    <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: spacing.sm }}>
                                        <Text style={[typography.h3, { color: colors.text, fontWeight: '600' }]}>
                                            {property.name}
                                        </Text>
                                        <StatusBadge
                                            type="success"
                                            label="Owned"
                                            size="small"
                                            style={{ marginLeft: spacing.sm }}
                                        />
                                    </View>

                                    <Text style={[typography.bodySmall, { color: colors.textSecondary }]}>
                                        {property.location}
                                    </Text>

                                    <View style={styles.metricsRow}>
                                        <View style={styles.metricItem}>
                                            <Text style={[typography.bodySmall, { color: colors.textSecondary }]}>
                                                {totalUnits} units
                                            </Text>
                                        </View>
                                        <View style={styles.metricItem}>
                                            <Text style={[typography.bodySmall, { color: colors.textSecondary }]}>
                                                {occupiedUnits} occupied
                                            </Text>
                                        </View>
                                        <View style={styles.metricItem}>
                                            <Text style={[typography.bodySmall, { color: colors.textSecondary }]}>
                                                {occupancyRate.toFixed(0)}% occupancy
                                            </Text>
                                        </View>
                                    </View>
                                </View>
                            </View>

                            {/* Property Code Section */}
                            <View style={[styles.codeSection, { backgroundColor: colors.surface }]}>
                                <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: spacing.sm }}>
                                    <Ionicons name="key" size={16} color={colors.primary} />
                                    <Text style={[typography.body, { color: colors.text, fontWeight: '600', marginLeft: spacing.xs }]}>
                                        Property Code
                                    </Text>
                                </View>

                                <View style={styles.codeRow}>
                                    <Text style={[typography.h2, { color: colors.primary, fontFamily: 'monospace' }]}>
                                        {property.propertyCode}
                                    </Text>
                                    <View style={styles.codeActions}>
                                        <TouchableOpacity
                                            style={[styles.codeButton, { borderColor: colors.border }]}
                                            onPress={() => handleCopyCode(property.propertyCode)}
                                        >
                                            <Ionicons name="copy" size={16} color={colors.textSecondary} />
                                        </TouchableOpacity>
                                        <TouchableOpacity
                                            style={[styles.codeButton, { borderColor: colors.border }]}
                                            onPress={() => handleShareCode(property)}
                                        >
                                            <Ionicons name="share" size={16} color={colors.textSecondary} />
                                        </TouchableOpacity>
                                        <TouchableOpacity
                                            style={[styles.codeButton, { borderColor: colors.primary }]}
                                            onPress={() => handleViewQR(property)}
                                        >
                                            <Ionicons name="qr-code" size={16} color={colors.primary} />
                                        </TouchableOpacity>
                                    </View>
                                </View>

                                <Text style={[typography.bodySmall, { color: colors.textSecondary, marginTop: spacing.sm }]}>
                                    Share this code with managers to grant them access to request property management permissions
                                </Text>
                            </View>

                            {/* Action Buttons */}
                            <View style={styles.actionRow}>
                                <TouchableOpacity
                                    style={[styles.actionButton, { borderColor: colors.primary }]}
                                    onPress={() => handleViewQR(property)}
                                >
                                    <Ionicons name="qr-code" size={16} color={colors.primary} />
                                    <Text style={[typography.bodySmall, { color: colors.primary, marginLeft: spacing.xs }]}>
                                        View QR
                                    </Text>
                                </TouchableOpacity>
                                <TouchableOpacity
                                    style={[styles.actionButton, { borderColor: colors.accent }]}
                                    onPress={() => handleShareCode(property)}
                                >
                                    <Ionicons name="share" size={16} color={colors.accent} />
                                    <Text style={[typography.bodySmall, { color: colors.accent, marginLeft: spacing.xs }]}>
                                        Share Code
                                    </Text>
                                </TouchableOpacity>
                                <TouchableOpacity
                                    style={[styles.actionButton, { borderColor: colors.border }]}
                                    onPress={() => handleGenerateNewCode(property)}
                                >
                                    <Ionicons name="refresh" size={16} color={colors.textSecondary} />
                                    <Text style={[typography.bodySmall, { color: colors.textSecondary, marginLeft: spacing.xs }]}>
                                        New Code
                                    </Text>
                                </TouchableOpacity>
                            </View>
                        </Card>
                    );
                })}

                {propertiesWithCodes.length === 0 && (
                    <Card style={{ padding: spacing.xl, alignItems: 'center' }}>
                        <Ionicons name="business" size={48} color={colors.textSecondary} />
                        <Text style={[typography.body, { color: colors.textSecondary, marginTop: spacing.md }]}>
                            No properties owned yet
                        </Text>
                        <Text style={[typography.bodySmall, { color: colors.textSecondary, marginTop: spacing.sm }]}>
                            Properties you own will appear here with their access codes
                        </Text>
                        <Button
                            title="Create First Property"
                            onPress={() => navigation.navigate('Properties')}
                            variant="primary"
                            style={{ marginTop: spacing.lg }}
                        />
                    </Card>
                )}
            </ScrollView>

            {/* QR Code Modal */}
            <Modal
                visible={showQRModal}
                title="Property QR Code"
                onClose={() => setShowQRModal(false)}
            >
                {selectedProperty && (
                    <View style={{ padding: spacing.base, alignItems: 'center' }}>
                        <Text style={[typography.h3, { color: colors.text, marginBottom: spacing.md, textAlign: 'center' }]}>
                            {selectedProperty.name}
                        </Text>

                        {/* QR Code Placeholder */}
                        <View style={{
                            width: 200,
                            height: 200,
                            backgroundColor: colors.surface,
                            borderRadius: 12,
                            alignItems: 'center',
                            justifyContent: 'center',
                            borderWidth: 2,
                            borderColor: colors.border,
                            marginBottom: spacing.lg,
                        }}>
                            <Ionicons name="qr-code" size={80} color={colors.textSecondary} />
                            <Text style={[typography.bodySmall, { color: colors.textSecondary, marginTop: spacing.sm }]}>
                                QR Code
                            </Text>
                        </View>

                        <Text style={[typography.h2, { color: colors.primary, fontFamily: 'monospace', marginBottom: spacing.md }]}>
                            {selectedProperty.propertyCode}
                        </Text>

                        <Text style={[typography.body, { color: colors.text, textAlign: 'center', marginBottom: spacing.lg }]}>
                            Managers can scan this QR code to request access to this property
                        </Text>

                        <View style={{ flexDirection: 'row' }}>
                            <Button
                                title="Copy Code"
                                onPress={() => handleCopyCode(selectedProperty.propertyCode)}
                                variant="outline"
                                style={{ flex: 1, marginRight: spacing.sm }}
                            />
                            <Button
                                title="Share"
                                onPress={() => handleShareCode(selectedProperty)}
                                variant="primary"
                                style={{ flex: 1, marginLeft: spacing.sm }}
                            />
                        </View>
                    </View>
                )}
            </Modal>

            {/* Share Modal */}
            <Modal
                visible={showShareModal}
                title="Share Property Code"
                onClose={() => setShowShareModal(false)}
            >
                {selectedProperty && (
                    <View style={{ padding: spacing.base }}>
                        <Text style={[typography.h3, { color: colors.text, marginBottom: spacing.md, textAlign: 'center' }]}>
                            {selectedProperty.name}
                        </Text>

                        <View style={[styles.codeDisplay, { backgroundColor: colors.surface }]}>
                            <Text style={[typography.h2, { color: colors.primary, fontFamily: 'monospace', textAlign: 'center' }]}>
                                {selectedProperty.propertyCode}
                            </Text>
                        </View>

                        <Text style={[typography.body, { color: colors.text, textAlign: 'center', marginVertical: spacing.lg }]}>
                            Share this property code with managers to allow them to request access to {selectedProperty.name}
                        </Text>

                        <View style={styles.shareOptions}>
                            <TouchableOpacity
                                style={[styles.shareOption, { borderColor: colors.border }]}
                                onPress={() => {
                                    handleCopyCode(selectedProperty.propertyCode);
                                    setShowShareModal(false);
                                }}
                            >
                                <Ionicons name="copy" size={24} color={colors.textSecondary} />
                                <Text style={[typography.body, { color: colors.text, marginTop: spacing.xs }]}>
                                    Copy Code
                                </Text>
                            </TouchableOpacity>

                            <TouchableOpacity
                                style={[styles.shareOption, { borderColor: colors.border }]}
                                onPress={() => {
                                    Share.share({
                                        message: `Property Code for ${selectedProperty.name}: ${selectedProperty.propertyCode}`,
                                        title: 'EstateNet Property Code',
                                    });
                                    setShowShareModal(false);
                                }}
                            >
                                <Ionicons name="share" size={24} color={colors.textSecondary} />
                                <Text style={[typography.body, { color: colors.text, marginTop: spacing.xs }]}>
                                    Share Link
                                </Text>
                            </TouchableOpacity>

                            <TouchableOpacity
                                style={[styles.shareOption, { borderColor: colors.border }]}
                                onPress={() => {
                                    setShowShareModal(false);
                                    setShowQRModal(true);
                                }}
                            >
                                <Ionicons name="qr-code" size={24} color={colors.textSecondary} />
                                <Text style={[typography.body, { color: colors.text, marginTop: spacing.xs }]}>
                                    Show QR
                                </Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                )}
            </Modal>
        </SafeAreaView>
    );
};

const styles = StyleSheet.create({
    propertyItem: {
        marginBottom: 16,
    },
    metricsRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginTop: 8,
    },
    metricItem: {
        flex: 1,
    },
    codeSection: {
        padding: 16,
        borderRadius: 12,
        marginTop: 12,
        marginBottom: 12,
    },
    codeRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
    },
    codeActions: {
        flexDirection: 'row',
        gap: 8,
    },
    codeButton: {
        width: 36,
        height: 36,
        borderRadius: 18,
        borderWidth: 1,
        alignItems: 'center',
        justifyContent: 'center',
    },
    actionRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
    },
    actionButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 8,
        paddingHorizontal: 12,
        borderRadius: 8,
        borderWidth: 1,
        flex: 1,
        marginHorizontal: 2,
    },
    codeDisplay: {
        padding: 20,
        borderRadius: 12,
        alignItems: 'center',
        marginVertical: 16,
    },
    shareOptions: {
        flexDirection: 'row',
        justifyContent: 'space-between',
    },
    shareOption: {
        flex: 1,
        alignItems: 'center',
        padding: 16,
        borderRadius: 12,
        borderWidth: 1,
        marginHorizontal: 4,
    },
});
