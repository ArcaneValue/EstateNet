import React, { useState } from 'react';
import {
    View,
    Text,
    Modal,
    TextInput,
    TouchableOpacity,
    StyleSheet,
    Alert,
    ActivityIndicator,
    Switch,
    ScrollView
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../theme/ThemeContext';
import { useAuth } from '../../context/AuthContext';
import { API_URL } from '../../config/api';

interface CreateAdminModalProps {
    visible: boolean;
    onClose: () => void;
    onSuccess: () => void;
}

export const CreateAdminModal: React.FC<CreateAdminModalProps> = ({ visible, onClose, onSuccess }) => {
    const { colors } = useTheme();
    const { token } = useAuth();
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [isSuperAdmin, setIsSuperAdmin] = useState(false);
    const [canManagePosts, setCanManagePosts] = useState(true);
    const [canManageUsers, setCanManageUsers] = useState(false);
    const [canViewAnalytics, setCanViewAnalytics] = useState(true);
    const [loading, setLoading] = useState(false);

    const handleCreate = async () => {
        if (!email || !password || !confirmPassword) {
            Alert.alert('Error', 'Please fill in all fields');
            return;
        }

        if (password !== confirmPassword) {
            Alert.alert('Error', 'Passwords do not match');
            return;
        }

        if (password.length < 6) {
            Alert.alert('Error', 'Password must be at least 6 characters');
            return;
        }

        setLoading(true);
        try {
            const response = await fetch(`${API_URL}/admin/create-admin`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({
                    email,
                    password,
                    isSuperAdmin,
                    canManagePosts,
                    canManageUsers,
                    canViewAnalytics
                })
            });

            const data = await response.json();

            if (response.ok && data.success) {
                Alert.alert('Success', 'New admin created successfully');
                resetForm();
                onSuccess();
            } else {
                Alert.alert('Error', data.message || 'Failed to create admin');
            }
        } catch (error) {
            console.error('Create admin error:', error);
            Alert.alert('Error', 'Failed to create admin');
        } finally {
            setLoading(false);
        }
    };

    const resetForm = () => {
        setEmail('');
        setPassword('');
        setConfirmPassword('');
        setIsSuperAdmin(false);
        setCanManagePosts(true);
        setCanManageUsers(false);
        setCanViewAnalytics(true);
    };

    const handleClose = () => {
        resetForm();
        onClose();
    };

    return (
        <Modal
            visible={visible}
            transparent
            animationType="slide"
            onRequestClose={handleClose}
        >
            <View style={styles.overlay}>
                <View style={[styles.modalContainer, { backgroundColor: colors.surface }]}>
                    <View style={styles.header}>
                        <View style={[styles.iconContainer, { backgroundColor: colors.primary + '15' }]}>
                            <Ionicons name="person-add" size={32} color={colors.primary} />
                        </View>
                        <Text style={[styles.title, { color: colors.text }]}>Create New Admin</Text>
                        <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
                            Set up a new admin account with custom permissions
                        </Text>
                    </View>

                    <ScrollView style={styles.form}>
                        <View style={styles.inputContainer}>
                            <Text style={[styles.label, { color: colors.text }]}>Email Address</Text>
                            <View style={[styles.inputWrapper, { backgroundColor: colors.background, borderColor: colors.border }]}>
                                <Ionicons name="mail-outline" size={20} color={colors.textSecondary} />
                                <TextInput
                                    style={[styles.input, { color: colors.text }]}
                                    placeholder="admin@example.com"
                                    placeholderTextColor={colors.textTertiary}
                                    value={email}
                                    onChangeText={setEmail}
                                    keyboardType="email-address"
                                    autoCapitalize="none"
                                    editable={!loading}
                                />
                            </View>
                        </View>

                        <View style={styles.inputContainer}>
                            <Text style={[styles.label, { color: colors.text }]}>Password</Text>
                            <View style={[styles.inputWrapper, { backgroundColor: colors.background, borderColor: colors.border }]}>
                                <Ionicons name="lock-closed-outline" size={20} color={colors.textSecondary} />
                                <TextInput
                                    style={[styles.input, { color: colors.text }]}
                                    placeholder="Minimum 6 characters"
                                    placeholderTextColor={colors.textTertiary}
                                    value={password}
                                    onChangeText={setPassword}
                                    secureTextEntry
                                    editable={!loading}
                                />
                            </View>
                        </View>

                        <View style={styles.inputContainer}>
                            <Text style={[styles.label, { color: colors.text }]}>Confirm Password</Text>
                            <View style={[styles.inputWrapper, { backgroundColor: colors.background, borderColor: colors.border }]}>
                                <Ionicons name="lock-closed-outline" size={20} color={colors.textSecondary} />
                                <TextInput
                                    style={[styles.input, { color: colors.text }]}
                                    placeholder="Re-enter password"
                                    placeholderTextColor={colors.textTertiary}
                                    value={confirmPassword}
                                    onChangeText={setConfirmPassword}
                                    secureTextEntry
                                    editable={!loading}
                                />
                            </View>
                        </View>

                        <View style={styles.divider} />

                        <Text style={[styles.sectionTitle, { color: colors.text }]}>Permissions</Text>

                        <View style={[styles.permissionItem, { borderBottomColor: colors.border }]}>
                            <View style={styles.permissionInfo}>
                                <Text style={[styles.permissionLabel, { color: colors.text }]}>Super Admin</Text>
                                <Text style={[styles.permissionDesc, { color: colors.textSecondary }]}>
                                    Full access to all features
                                </Text>
                            </View>
                            <Switch
                                value={isSuperAdmin}
                                onValueChange={setIsSuperAdmin}
                                disabled={loading}
                            />
                        </View>

                        <View style={[styles.permissionItem, { borderBottomColor: colors.border }]}>
                            <View style={styles.permissionInfo}>
                                <Text style={[styles.permissionLabel, { color: colors.text }]}>Manage Posts</Text>
                                <Text style={[styles.permissionDesc, { color: colors.textSecondary }]}>
                                    Change status and respond to feedback
                                </Text>
                            </View>
                            <Switch
                                value={canManagePosts}
                                onValueChange={setCanManagePosts}
                                disabled={loading}
                            />
                        </View>

                        <View style={[styles.permissionItem, { borderBottomColor: colors.border }]}>
                            <View style={styles.permissionInfo}>
                                <Text style={[styles.permissionLabel, { color: colors.text }]}>Manage Users</Text>
                                <Text style={[styles.permissionDesc, { color: colors.textSecondary }]}>
                                    Create and manage other admins
                                </Text>
                            </View>
                            <Switch
                                value={canManageUsers}
                                onValueChange={setCanManageUsers}
                                disabled={loading}
                            />
                        </View>

                        <View style={[styles.permissionItem, { borderBottomWidth: 0 }]}>
                            <View style={styles.permissionInfo}>
                                <Text style={[styles.permissionLabel, { color: colors.text }]}>View Analytics</Text>
                                <Text style={[styles.permissionDesc, { color: colors.textSecondary }]}>
                                    Access feedback statistics
                                </Text>
                            </View>
                            <Switch
                                value={canViewAnalytics}
                                onValueChange={setCanViewAnalytics}
                                disabled={loading}
                            />
                        </View>
                    </ScrollView>

                    <View style={styles.actions}>
                        <TouchableOpacity
                            style={[styles.button, styles.cancelButton, { backgroundColor: colors.background }]}
                            onPress={handleClose}
                            disabled={loading}
                        >
                            <Text style={[styles.buttonText, { color: colors.textSecondary }]}>Cancel</Text>
                        </TouchableOpacity>

                        <TouchableOpacity
                            style={[styles.button, styles.createButton, { backgroundColor: colors.primary }]}
                            onPress={handleCreate}
                            disabled={loading}
                        >
                            {loading ? (
                                <ActivityIndicator color="#fff" />
                            ) : (
                                <Text style={styles.createButtonText}>Create Admin</Text>
                            )}
                        </TouchableOpacity>
                    </View>
                </View>
            </View>
        </Modal>
    );
};

const styles = StyleSheet.create({
    overlay: {
        flex: 1,
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        justifyContent: 'center',
        alignItems: 'center',
        padding: 20
    },
    modalContainer: {
        width: '100%',
        maxWidth: 500,
        maxHeight: '90%',
        borderRadius: 16,
        padding: 24,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
        elevation: 8
    },
    header: {
        alignItems: 'center',
        marginBottom: 24
    },
    iconContainer: {
        width: 64,
        height: 64,
        borderRadius: 32,
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 16
    },
    title: {
        fontSize: 24,
        fontWeight: 'bold',
        marginBottom: 8
    },
    subtitle: {
        fontSize: 14,
        textAlign: 'center',
        lineHeight: 20
    },
    form: {
        marginBottom: 24
    },
    inputContainer: {
        marginBottom: 16
    },
    label: {
        fontSize: 14,
        fontWeight: '600',
        marginBottom: 8
    },
    inputWrapper: {
        flexDirection: 'row',
        alignItems: 'center',
        borderWidth: 1,
        borderRadius: 8,
        paddingHorizontal: 12,
        height: 48
    },
    input: {
        flex: 1,
        marginLeft: 8,
        fontSize: 16
    },
    divider: {
        height: 1,
        backgroundColor: '#e0e0e0',
        marginVertical: 16
    },
    sectionTitle: {
        fontSize: 16,
        fontWeight: 'bold',
        marginBottom: 12
    },
    permissionItem: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingVertical: 12,
        borderBottomWidth: 1
    },
    permissionInfo: {
        flex: 1,
        marginRight: 12
    },
    permissionLabel: {
        fontSize: 16,
        fontWeight: '600',
        marginBottom: 4
    },
    permissionDesc: {
        fontSize: 13,
        lineHeight: 18
    },
    actions: {
        flexDirection: 'row',
        gap: 12
    },
    button: {
        flex: 1,
        height: 48,
        borderRadius: 8,
        alignItems: 'center',
        justifyContent: 'center'
    },
    cancelButton: {
        borderWidth: 1,
        borderColor: '#e0e0e0'
    },
    createButton: {
        // backgroundColor set dynamically
    },
    buttonText: {
        fontSize: 16,
        fontWeight: '600'
    },
    createButtonText: {
        fontSize: 16,
        fontWeight: '600',
        color: '#fff'
    }
});
