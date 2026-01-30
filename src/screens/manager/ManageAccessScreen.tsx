import React, { useState } from 'react';
import { View, Text, FlatList, TouchableOpacity, Alert, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '../../theme/ThemeContext';
import { useAuth } from '../../context/AuthContext';
import { useProperties } from '../../context/PropertyContext';
import { Card } from '../../components/Card';
import { Button } from '../../components/Button';
import { StatusBadge } from '../../components/StatusBadge';
import { Modal } from '../../components/Modal';
import { Input } from '../../components/Input';
import { PropertyManager, ManagerRole } from '../../types/types';
import { Ionicons } from '@expo/vector-icons';

interface ManageAccessScreenProps {
    navigation: any;
    route: any;
}

export const ManageAccessScreen: React.FC<ManageAccessScreenProps> = ({ navigation, route }) => {
    const { colors, spacing, typography, borderRadius } = useTheme();
    const { user } = useAuth();
    const { getPropertyById, getPropertyManagers, addPropertyManager, updatePropertyManager, removePropertyManager } = useProperties();

    const propertyId = route.params?.propertyId;
    const propertyName = route.params?.propertyName;

    const [managers, setManagers] = useState<PropertyManager[]>(
        propertyId ? getPropertyManagers(propertyId) : []
    );
    const [showInviteModal, setShowInviteModal] = useState(false);
    const [showRoleModal, setShowRoleModal] = useState(false);
    const [selectedManager, setSelectedManager] = useState<PropertyManager | null>(null);
    const [inviteEmail, setInviteEmail] = useState('');
    const [inviteRole, setInviteRole] = useState<ManagerRole>('MANAGER');
    const [newRole, setNewRole] = useState<ManagerRole>('MANAGER');

    const roleOptions: { value: ManagerRole; label: string; description: string }[] = [
        {
            value: 'OWNER',
            label: 'Owner',
            description: 'Full control over property and can invite other managers'
        },
        {
            value: 'ADMIN',
            label: 'Admin',
            description: 'Can manage tenants, payments, and property settings'
        },
        {
            value: 'MANAGER',
            label: 'Manager',
            description: 'Can manage tenants and view reports'
        },
        {
            value: 'VIEWER',
            label: 'Viewer',
            description: 'Can view property information and reports only'
        },
    ];

    const handleInviteManager = () => {
        if (!inviteEmail.trim()) {
            Alert.alert('Error', 'Please enter a valid email address');
            return;
        }

        const newManager: PropertyManager = {
            id: Math.random().toString(36).substr(2, 9),
            propertyId: propertyId!,
            userId: Math.random().toString(36).substr(2, 9),
            name: inviteEmail.split('@')[0],
            email: inviteEmail,
            role: inviteRole,
            permissions: getPermissionsForRole(inviteRole),
            invitedBy: user?.id || 'unknown',
            invitedAt: new Date(),
            status: 'pending',
        };

        addPropertyManager(propertyId!, newManager);
        setManagers(prev => [...prev, newManager]);
        setInviteEmail('');
        setInviteRole('MANAGER');
        setShowInviteModal(false);

        Alert.alert('Success', 'Manager invitation sent successfully');
    };

    const handleChangeRole = (manager: PropertyManager) => {
        setSelectedManager(manager);
        setNewRole(manager.role);
        setShowRoleModal(true);
    };

    const handleUpdateRole = () => {
        if (!selectedManager) return;

        const updatedManager = {
            ...selectedManager,
            role: newRole,
            permissions: getPermissionsForRole(newRole),
        };

        updatePropertyManager(propertyId!, selectedManager.id, updatedManager);
        setManagers(prev =>
            prev.map(m => m.id === selectedManager.id ? updatedManager : m)
        );
        setShowRoleModal(false);
        setSelectedManager(null);

        Alert.alert('Success', 'Manager role updated successfully');
    };

    const handleRevokeAccess = (manager: PropertyManager) => {
        Alert.alert(
            'Revoke Access',
            `Are you sure you want to revoke access for ${manager.name}?`,
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: 'Revoke',
                    style: 'destructive',
                    onPress: () => {
                        removePropertyManager(propertyId!, manager.id);
                        setManagers(prev => prev.filter(m => m.id !== manager.id));
                        Alert.alert('Success', 'Access revoked successfully');
                    },
                },
            ]
        );
    };

    const getPermissionsForRole = (role: ManagerRole) => {
        switch (role) {
            case 'OWNER':
                return {
                    canViewTenants: true,
                    canManageTenants: true,
                    canViewPayments: true,
                    canManagePayments: true,
                    canViewReports: true,
                    canManageProperty: true,
                    canInviteManagers: true,
                };
            case 'ADMIN':
                return {
                    canViewTenants: true,
                    canManageTenants: true,
                    canViewPayments: true,
                    canManagePayments: true,
                    canViewReports: true,
                    canManageProperty: true,
                    canInviteManagers: false,
                };
            case 'MANAGER':
                return {
                    canViewTenants: true,
                    canManageTenants: true,
                    canViewPayments: true,
                    canManagePayments: false,
                    canViewReports: true,
                    canManageProperty: false,
                    canInviteManagers: false,
                };
            case 'VIEWER':
                return {
                    canViewTenants: true,
                    canManageTenants: false,
                    canViewPayments: true,
                    canManagePayments: false,
                    canViewReports: true,
                    canManageProperty: false,
                    canInviteManagers: false,
                };
            default:
                return {
                    canViewTenants: false,
                    canManageTenants: false,
                    canViewPayments: false,
                    canManagePayments: false,
                    canViewReports: false,
                    canManageProperty: false,
                    canInviteManagers: false,
                };
        }
    };

    const getRoleColor = (role: ManagerRole) => {
        switch (role) {
            case 'OWNER': return colors.primary;
            case 'ADMIN': return colors.accent;
            case 'MANAGER': return colors.success;
            case 'VIEWER': return colors.textSecondary;
            default: return colors.textSecondary;
        }
    };

    const renderManagerItem = ({ item }: { item: PropertyManager }) => (
        <Card style={{ marginBottom: spacing.md }}>
            <View style={styles.managerItem}>
                <View style={{ flex: 1 }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: spacing.sm }}>
                        <Text style={[typography.body, { color: colors.text, fontWeight: '600' }]}>
                            {item.name}
                        </Text>
                        <StatusBadge
                            type={item.status === 'active' ? 'success' : 'warning'}
                            label={item.status}
                            size="small"
                            style={{ marginLeft: spacing.sm }}
                        />
                    </View>
                    <Text style={[typography.bodySmall, { color: colors.textSecondary }]}>
                        {item.email}
                    </Text>
                    <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: spacing.sm }}>
                        <Text style={[
                            typography.bodySmall,
                            { color: getRoleColor(item.role), fontWeight: '600' }
                        ]}>
                            {item.role}
                        </Text>
                        <Text style={[typography.bodySmall, { color: colors.textSecondary, marginLeft: spacing.sm }]}>
                            Invited {item.invitedAt.toLocaleDateString()}
                        </Text>
                    </View>
                </View>

                <View style={styles.managerActions}>
                    <TouchableOpacity
                        style={[styles.actionButton, { borderColor: colors.border }]}
                        onPress={() => handleChangeRole(item)}
                    >
                        <Ionicons name="settings" size={16} color={colors.textSecondary} />
                    </TouchableOpacity>
                    <TouchableOpacity
                        style={[styles.actionButton, { borderColor: colors.error }]}
                        onPress={() => handleRevokeAccess(item)}
                    >
                        <Ionicons name="remove-circle" size={16} color={colors.error} />
                    </TouchableOpacity>
                </View>
            </View>
        </Card>
    );

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
                        Manage Access
                    </Text>
                    <Text style={[typography.bodySmall, { color: colors.textSecondary }]}>
                        {propertyName}
                    </Text>
                </View>
            </View>

            <View style={{ padding: spacing.base }}>
                {/* Info Card */}
                <Card style={{ marginBottom: spacing.lg, padding: spacing.md }}>
                    <Text style={[typography.body, { color: colors.text, marginBottom: spacing.sm }]}>
                        Owner controls who can manage this property. You can invite managers with different permission levels.
                    </Text>
                    <Text style={[typography.bodySmall, { color: colors.textSecondary }]}>
                        Property Code: SUN123
                    </Text>
                </Card>

                {/* Invite Manager Button */}
                <Button
                    title="Invite Manager"
                    onPress={() => setShowInviteModal(true)}
                    variant="primary"
                    size="large"
                    style={{ marginBottom: spacing.lg }}
                    icon={<Ionicons name="person-add" size={18} color="#FFFFFF" />}
                />

                {/* Managers List */}
                <Text style={[typography.h3, { color: colors.text, marginBottom: spacing.md }]}>
                    Property Managers ({managers.length})
                </Text>

                <FlatList
                    data={managers}
                    renderItem={renderManagerItem}
                    keyExtractor={item => item.id}
                    showsVerticalScrollIndicator={false}
                    ListEmptyComponent={
                        <Card style={{ padding: spacing.xl, alignItems: 'center' }}>
                            <Ionicons name="people" size={48} color={colors.textSecondary} />
                            <Text style={[typography.body, { color: colors.textSecondary, marginTop: spacing.md }]}>
                                No managers invited yet
                            </Text>
                            <Text style={[typography.bodySmall, { color: colors.textSecondary, marginTop: spacing.sm }]}>
                                Invite managers to help manage this property
                            </Text>
                        </Card>
                    }
                />
            </View>

            {/* Invite Manager Modal */}
            <Modal
                visible={showInviteModal}
                title="Invite Manager"
                onClose={() => setShowInviteModal(false)}
            >
                <View style={{ padding: spacing.base }}>
                    <Input
                        placeholder="Manager email address"
                        value={inviteEmail}
                        onChangeText={setInviteEmail}
                        keyboardType="email-address"
                        autoCapitalize="none"
                        style={{ marginBottom: spacing.lg }}
                    />

                    <Text style={[typography.body, { color: colors.text, marginBottom: spacing.md }]}>
                        Select Role
                    </Text>
                    {roleOptions.map((option) => (
                        <TouchableOpacity
                            key={option.value}
                            style={[
                                styles.roleOption,
                                {
                                    borderColor: inviteRole === option.value ? colors.primary : colors.border,
                                    backgroundColor: inviteRole === option.value ? colors.primary + '10' : colors.surface,
                                }
                            ]}
                            onPress={() => setInviteRole(option.value)}
                        >
                            <View style={{ flex: 1 }}>
                                <Text style={[typography.body, { color: colors.text, fontWeight: '600' }]}>
                                    {option.label}
                                </Text>
                                <Text style={[typography.bodySmall, { color: colors.textSecondary, marginTop: 2 }]}>
                                    {option.description}
                                </Text>
                            </View>
                            <View style={{
                                width: 20,
                                height: 20,
                                borderRadius: 10,
                                borderWidth: 2,
                                borderColor: inviteRole === option.value ? colors.primary : colors.border,
                                alignItems: 'center',
                                justifyContent: 'center',
                            }}>
                                {inviteRole === option.value && (
                                    <View style={{
                                        width: 12,
                                        height: 12,
                                        borderRadius: 6,
                                        backgroundColor: colors.primary,
                                    }} />
                                )}
                            </View>
                        </TouchableOpacity>
                    ))}

                    <View style={{ flexDirection: 'row', marginTop: spacing.xl }}>
                        <Button
                            title="Cancel"
                            onPress={() => setShowInviteModal(false)}
                            variant="outline"
                            style={{ flex: 1, marginRight: spacing.sm }}
                        />
                        <Button
                            title="Send Invitation"
                            onPress={handleInviteManager}
                            variant="primary"
                            style={{ flex: 1, marginLeft: spacing.sm }}
                        />
                    </View>
                </View>
            </Modal>

            {/* Change Role Modal */}
            <Modal
                visible={showRoleModal}
                title="Change Role"
                onClose={() => setShowRoleModal(false)}
            >
                <View style={{ padding: spacing.base }}>
                    <Text style={[typography.body, { color: colors.text, marginBottom: spacing.md }]}>
                        Change role for {selectedManager?.name}
                    </Text>

                    {roleOptions.map((option) => (
                        <TouchableOpacity
                            key={option.value}
                            style={[
                                styles.roleOption,
                                {
                                    borderColor: newRole === option.value ? colors.primary : colors.border,
                                    backgroundColor: newRole === option.value ? colors.primary + '10' : colors.surface,
                                }
                            ]}
                            onPress={() => setNewRole(option.value)}
                        >
                            <View style={{ flex: 1 }}>
                                <Text style={[typography.body, { color: colors.text, fontWeight: '600' }]}>
                                    {option.label}
                                </Text>
                                <Text style={[typography.bodySmall, { color: colors.textSecondary, marginTop: 2 }]}>
                                    {option.description}
                                </Text>
                            </View>
                            <View style={{
                                width: 20,
                                height: 20,
                                borderRadius: 10,
                                borderWidth: 2,
                                borderColor: newRole === option.value ? colors.primary : colors.border,
                                alignItems: 'center',
                                justifyContent: 'center',
                            }}>
                                {newRole === option.value && (
                                    <View style={{
                                        width: 12,
                                        height: 12,
                                        borderRadius: 6,
                                        backgroundColor: colors.primary,
                                    }} />
                                )}
                            </View>
                        </TouchableOpacity>
                    ))}

                    <View style={{ flexDirection: 'row', marginTop: spacing.xl }}>
                        <Button
                            title="Cancel"
                            onPress={() => setShowRoleModal(false)}
                            variant="outline"
                            style={{ flex: 1, marginRight: spacing.sm }}
                        />
                        <Button
                            title="Update Role"
                            onPress={handleUpdateRole}
                            variant="primary"
                            style={{ flex: 1, marginLeft: spacing.sm }}
                        />
                    </View>
                </View>
            </Modal>
        </SafeAreaView>
    );
};

const styles = StyleSheet.create({
    managerItem: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    managerActions: {
        flexDirection: 'row',
        gap: 8,
    },
    actionButton: {
        width: 36,
        height: 36,
        borderRadius: 18,
        borderWidth: 1,
        alignItems: 'center',
        justifyContent: 'center',
    },
    roleOption: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 16,
        borderRadius: 12,
        borderWidth: 1,
        marginBottom: 12,
    },
});
