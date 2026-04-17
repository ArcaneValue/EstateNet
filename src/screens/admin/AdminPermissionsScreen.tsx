import React, { useEffect, useState } from 'react';
import {
    View,
    Text,
    StyleSheet,
    FlatList,
    TouchableOpacity,
    TextInput,
    ActivityIndicator,
    Alert,
    Modal,
    Switch
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { API_URL } from '../../config/api';
import { useAuth } from '../../context/AuthContext';

export const AdminPermissionsScreen = ({ navigation }: any) => {
    const { token } = useAuth();
    const [admins, setAdmins] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [modalVisible, setModalVisible] = useState(false);
    const [newAdminEmail, setNewAdminEmail] = useState('');
    const [permissions, setPermissions] = useState({
        isSuperAdmin: false,
        canManagePosts: true,
        canManageUsers: false,
        canViewAnalytics: true
    });
    const [submitting, setSubmitting] = useState(false);

    const loadAdmins = async () => {
        try {
            const res = await fetch(`${API_URL}/admin/feedback/permissions`, {
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                }
            });

            const data = await res.json();
            if (data.success) {
                setAdmins(data.data);
            }
        } catch (error) {
            console.error('Load admins error:', error);
            Alert.alert('Error', 'Failed to load admins');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadAdmins();
    }, []);

    const handleCreateAdmin = async () => {
        if (!newAdminEmail.trim()) {
            Alert.alert('Error', 'Please enter an email address');
            return;
        }

        setSubmitting(true);
        try {
            const res = await fetch(`${API_URL}/admin/feedback/permissions`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    email: newAdminEmail.trim(),
                    permissions
                })
            });

            const data = await res.json();
            if (data.success) {
                Alert.alert('Success', 'Admin created successfully');
                setModalVisible(false);
                setNewAdminEmail('');
                setPermissions({
                    isSuperAdmin: false,
                    canManagePosts: true,
                    canManageUsers: false,
                    canViewAnalytics: true
                });
                await loadAdmins();
            } else {
                Alert.alert('Error', data.message || 'Failed to create admin');
            }
        } catch (error: any) {
            Alert.alert('Error', error.message || 'Failed to create admin');
        } finally {
            setSubmitting(false);
        }
    };

    const handleDeleteAdmin = async (email: string) => {
        Alert.alert(
            'Confirm Delete',
            `Are you sure you want to remove admin access for ${email}?`,
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: 'Delete',
                    style: 'destructive',
                    onPress: async () => {
                        try {
                            const res = await fetch(
                                `${API_URL}/admin/feedback/permissions/${encodeURIComponent(email)}`,
                                {
                                    method: 'DELETE',
                                    headers: {
                                        'Authorization': `Bearer ${token}`,
                                        'Content-Type': 'application/json'
                                    }
                                }
                            );

                            const data = await res.json();
                            if (data.success) {
                                Alert.alert('Success', 'Admin removed successfully');
                                await loadAdmins();
                            } else {
                                Alert.alert('Error', data.message || 'Failed to remove admin');
                            }
                        } catch (error: any) {
                            Alert.alert('Error', error.message || 'Failed to remove admin');
                        }
                    }
                }
            ]
        );
    };

    const renderAdmin = ({ item }: any) => (
        <View style={styles.adminCard}>
            <View style={styles.adminHeader}>
                <View style={styles.adminInfo}>
                    <Ionicons name="person-circle" size={40} color="#FF6B35" />
                    <View style={styles.adminDetails}>
                        <Text style={styles.adminEmail}>{item.email}</Text>
                        {item.isSuperAdmin && (
                            <View style={styles.superAdminBadge}>
                                <Ionicons name="star" size={12} color="#FFD700" />
                                <Text style={styles.superAdminText}>SUPER ADMIN</Text>
                            </View>
                        )}
                    </View>
                </View>
                {!item.isSuperAdmin && (
                    <TouchableOpacity
                        style={styles.deleteButton}
                        onPress={() => handleDeleteAdmin(item.email)}
                    >
                        <Ionicons name="trash-outline" size={20} color="#FF3B30" />
                    </TouchableOpacity>
                )}
            </View>

            <View style={styles.permissionsContainer}>
                <View style={styles.permissionRow}>
                    <Ionicons
                        name={item.canManagePosts ? 'checkmark-circle' : 'close-circle-outline'}
                        size={18}
                        color={item.canManagePosts ? '#4CAF50' : '#ccc'}
                    />
                    <Text style={styles.permissionText}>Manage Posts</Text>
                </View>
                <View style={styles.permissionRow}>
                    <Ionicons
                        name={item.canManageUsers ? 'checkmark-circle' : 'close-circle-outline'}
                        size={18}
                        color={item.canManageUsers ? '#4CAF50' : '#ccc'}
                    />
                    <Text style={styles.permissionText}>Manage Users</Text>
                </View>
                <View style={styles.permissionRow}>
                    <Ionicons
                        name={item.canViewAnalytics ? 'checkmark-circle' : 'close-circle-outline'}
                        size={18}
                        color={item.canViewAnalytics ? '#4CAF50' : '#ccc'}
                    />
                    <Text style={styles.permissionText}>View Analytics</Text>
                </View>
            </View>

            <Text style={styles.createdDate}>
                Added: {new Date(item.createdAt).toLocaleDateString()}
            </Text>
        </View>
    );

    if (loading) {
        return (
            <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color="#FF6B35" />
            </View>
        );
    }

    return (
        <View style={styles.container}>
            <View style={styles.header}>
                <TouchableOpacity onPress={() => navigation.goBack()}>
                    <Ionicons name="arrow-back" size={24} color="#FF6B35" />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>Admin Permissions</Text>
                <TouchableOpacity onPress={() => setModalVisible(true)}>
                    <Ionicons name="add-circle" size={24} color="#FF6B35" />
                </TouchableOpacity>
            </View>

            <FlatList
                data={admins}
                keyExtractor={(item) => item.id}
                renderItem={renderAdmin}
                contentContainerStyle={styles.listContent}
                ListEmptyComponent={
                    <View style={styles.emptyContainer}>
                        <Ionicons name="people-outline" size={64} color="#ccc" />
                        <Text style={styles.emptyText}>No admins found</Text>
                    </View>
                }
            />

            <Modal
                visible={modalVisible}
                animationType="slide"
                transparent={true}
                onRequestClose={() => setModalVisible(false)}
            >
                <View style={styles.modalOverlay}>
                    <View style={styles.modalContent}>
                        <View style={styles.modalHeader}>
                            <Text style={styles.modalTitle}>Add New Admin</Text>
                            <TouchableOpacity onPress={() => setModalVisible(false)}>
                                <Ionicons name="close" size={24} color="#666" />
                            </TouchableOpacity>
                        </View>

                        <Text style={styles.label}>Email Address</Text>
                        <TextInput
                            style={styles.input}
                            placeholder="admin@example.com"
                            value={newAdminEmail}
                            onChangeText={setNewAdminEmail}
                            keyboardType="email-address"
                            autoCapitalize="none"
                        />

                        <Text style={styles.label}>Permissions</Text>

                        <View style={styles.permissionToggle}>
                            <Text style={styles.permissionLabel}>Super Admin</Text>
                            <Switch
                                value={permissions.isSuperAdmin}
                                onValueChange={(value) =>
                                    setPermissions({ ...permissions, isSuperAdmin: value })
                                }
                                trackColor={{ false: '#ccc', true: '#FF6B35' }}
                            />
                        </View>

                        <View style={styles.permissionToggle}>
                            <Text style={styles.permissionLabel}>Manage Posts</Text>
                            <Switch
                                value={permissions.canManagePosts}
                                onValueChange={(value) =>
                                    setPermissions({ ...permissions, canManagePosts: value })
                                }
                                trackColor={{ false: '#ccc', true: '#FF6B35' }}
                            />
                        </View>

                        <View style={styles.permissionToggle}>
                            <Text style={styles.permissionLabel}>Manage Users</Text>
                            <Switch
                                value={permissions.canManageUsers}
                                onValueChange={(value) =>
                                    setPermissions({ ...permissions, canManageUsers: value })
                                }
                                trackColor={{ false: '#ccc', true: '#FF6B35' }}
                            />
                        </View>

                        <View style={styles.permissionToggle}>
                            <Text style={styles.permissionLabel}>View Analytics</Text>
                            <Switch
                                value={permissions.canViewAnalytics}
                                onValueChange={(value) =>
                                    setPermissions({ ...permissions, canViewAnalytics: value })
                                }
                                trackColor={{ false: '#ccc', true: '#FF6B35' }}
                            />
                        </View>

                        <TouchableOpacity
                            style={[styles.createButton, submitting && styles.createButtonDisabled]}
                            onPress={handleCreateAdmin}
                            disabled={submitting}
                        >
                            {submitting ? (
                                <ActivityIndicator color="#fff" />
                            ) : (
                                <Text style={styles.createButtonText}>Create Admin</Text>
                            )}
                        </TouchableOpacity>
                    </View>
                </View>
            </Modal>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#f5f5f5'
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: 16,
        backgroundColor: '#fff',
        borderBottomWidth: 1,
        borderBottomColor: '#e0e0e0'
    },
    headerTitle: {
        fontSize: 20,
        fontWeight: 'bold',
        color: '#FF6B35'
    },
    listContent: {
        padding: 16
    },
    adminCard: {
        backgroundColor: '#fff',
        borderRadius: 12,
        padding: 16,
        marginBottom: 12,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 3
    },
    adminHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 12
    },
    adminInfo: {
        flexDirection: 'row',
        alignItems: 'center',
        flex: 1
    },
    adminDetails: {
        marginLeft: 12,
        flex: 1
    },
    adminEmail: {
        fontSize: 16,
        fontWeight: '600',
        color: '#333',
        marginBottom: 4
    },
    superAdminBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        alignSelf: 'flex-start',
        paddingHorizontal: 8,
        paddingVertical: 4,
        backgroundColor: '#FFF9E6',
        borderRadius: 12
    },
    superAdminText: {
        marginLeft: 4,
        fontSize: 10,
        fontWeight: 'bold',
        color: '#FFB800'
    },
    deleteButton: {
        padding: 8
    },
    permissionsContainer: {
        marginBottom: 12
    },
    permissionRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 6
    },
    permissionText: {
        marginLeft: 8,
        fontSize: 14,
        color: '#666'
    },
    createdDate: {
        fontSize: 12,
        color: '#999',
        marginTop: 8,
        paddingTop: 8,
        borderTopWidth: 1,
        borderTopColor: '#f0f0f0'
    },
    loadingContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center'
    },
    emptyContainer: {
        alignItems: 'center',
        paddingVertical: 60
    },
    emptyText: {
        marginTop: 16,
        fontSize: 16,
        color: '#999'
    },
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        justifyContent: 'flex-end'
    },
    modalContent: {
        backgroundColor: '#fff',
        borderTopLeftRadius: 20,
        borderTopRightRadius: 20,
        padding: 20,
        maxHeight: '80%'
    },
    modalHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 20
    },
    modalTitle: {
        fontSize: 20,
        fontWeight: 'bold',
        color: '#333'
    },
    label: {
        fontSize: 16,
        fontWeight: '600',
        color: '#333',
        marginBottom: 8,
        marginTop: 12
    },
    input: {
        backgroundColor: '#f5f5f5',
        borderRadius: 8,
        padding: 12,
        fontSize: 16,
        borderWidth: 1,
        borderColor: '#e0e0e0',
        marginBottom: 16
    },
    permissionToggle: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingVertical: 12,
        borderBottomWidth: 1,
        borderBottomColor: '#f0f0f0'
    },
    permissionLabel: {
        fontSize: 16,
        color: '#333'
    },
    createButton: {
        backgroundColor: '#FF6B35',
        borderRadius: 8,
        padding: 16,
        alignItems: 'center',
        marginTop: 20
    },
    createButtonDisabled: {
        opacity: 0.6
    },
    createButtonText: {
        fontSize: 16,
        fontWeight: '600',
        color: '#fff'
    }
});
