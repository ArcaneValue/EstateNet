import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, ScrollView, StyleSheet, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '../../theme/ThemeContext';
import { useAuth } from '../../context/AuthContext';
import { apiPatch } from '../../utils/apiClient';
import { Card } from '../../components/Card';
import { Button } from '../../components/Button';
import { Modal } from '../../components/Modal';
import { Input } from '../../components/Input';
import { Ionicons } from '@expo/vector-icons';

interface OwnerSettingsScreenProps {
    navigation: any;
}

export const OwnerSettingsScreen: React.FC<OwnerSettingsScreenProps> = ({ navigation }) => {
    const { colors, spacing, typography, borderRadius } = useTheme();
    const { user, signOut, refreshMe } = useAuth();

    const [showEditProfileModal, setShowEditProfileModal] = useState(false);
    const [showNotificationsModal, setShowNotificationsModal] = useState(false);
    const [showSecurityModal, setShowSecurityModal] = useState(false);
    const [showAboutModal, setShowAboutModal] = useState(false);

    // Preference Modals
    const [showPropertyDefaultsModal, setShowPropertyDefaultsModal] = useState(false);
    const [showManagerPermissionsModal, setShowManagerPermissionsModal] = useState(false);
    const [showReportSettingsModal, setShowReportSettingsModal] = useState(false);

    // Support Modals
    const [showHelpCenterModal, setShowHelpCenterModal] = useState(false);
    const [showContactSupportModal, setShowContactSupportModal] = useState(false);

    const [editName, setEditName] = useState(user?.name || '');
    const [editEmail, setEditEmail] = useState(user?.email || '');
    const [editPhone, setEditPhone] = useState(user?.phoneNumber || '');

    const [notifications, setNotifications] = useState({
        payments: true,
        messages: true,
        invitations: true,
    });

    // Sync notification state with user data when it changes
    useEffect(() => {
        const prefs = (user as any)?.notificationPrefs || {};
        setNotifications({
            payments: prefs.payments ?? true,
            messages: prefs.messages ?? true,
            invitations: prefs.invitations ?? true,
        });
    }, [user]);

    // Preference States
    const [propertyDefaults, setPropertyDefaults] = useState({
        defaultRentCollectionMethod: 'estatenet',
        defaultPaymentTerms: '1st of each month',
        defaultLatePaymentPolicy: '5% penalty after 7 days',
        defaultSecurityDeposit: 0,
    });

    const [managerPermissions, setManagerPermissions] = useState({
        defaultRole: 'MANAGER',
        canInviteOthers: false,
        canManageFinances: false,
        canEditProperty: false,
    });

    const [reportSettings, setReportSettings] = useState({
        frequency: 'monthly',
        includeCharts: true,
        exportFormat: 'pdf',
        autoEmail: false,
    });

    // Support States
    const [supportMessage, setSupportMessage] = useState('');

    const handleSaveProfile = async () => {
        const result = await apiPatch('/users/me', {
            name: editName,
            phoneNumber: editPhone,
        });
        if (result.json?.success) {
            await refreshMe();
            Alert.alert('Success', 'Profile updated successfully');
            setShowEditProfileModal(false);
        } else {
            Alert.alert('Error', result.json?.message || 'Failed to update profile');
        }
    };

    const handleSaveNotifications = async () => {
        const result = await apiPatch('/users/me', {
            notificationPrefs: {
                payments: notifications.payments,
                messages: notifications.messages,
                invitations: notifications.invitations,
            },
        });
        if (result.json?.success) {
            await refreshMe();
            Alert.alert('Success', 'Notification preferences updated');
            setShowNotificationsModal(false);
        } else {
            Alert.alert('Error', result.json?.message || 'Failed to update notification preferences');
        }
    };

    // Preference Handlers
    const handleSavePropertyDefaults = () => {
        Alert.alert('Success', 'Property defaults saved');
        setShowPropertyDefaultsModal(false);
    };

    const handleSaveManagerPermissions = () => {
        Alert.alert('Success', 'Manager permissions updated');
        setShowManagerPermissionsModal(false);
    };

    const handleSaveReportSettings = () => {
        Alert.alert('Success', 'Report settings saved');
        setShowReportSettingsModal(false);
    };

    // Support Handlers
    const handleContactSupport = () => {
        if (!supportMessage.trim()) {
            Alert.alert('Error', 'Please enter a message');
            return;
        }
        Alert.alert('Success', 'Support request sent. We\'ll respond within 24 hours.');
        setSupportMessage('');
        setShowContactSupportModal(false);
    };

    const handleSignOut = () => {
        Alert.alert(
            'Sign Out',
            'Are you sure you want to sign out?',
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: 'Sign Out',
                    style: 'destructive',
                    onPress: () => signOut(),
                },
            ]
        );
    };

    const settingsSections = [
        {
            title: 'Account Settings',
            items: [
                {
                    icon: 'person-outline',
                    title: 'Edit Profile',
                    subtitle: 'Name, email, phone number',
                    onPress: () => setShowEditProfileModal(true),
                },
                {
                    icon: 'notifications-outline',
                    title: 'Notifications',
                    subtitle: 'Manage notification preferences',
                    onPress: () => setShowNotificationsModal(true),
                },
                {
                    icon: 'lock-closed-outline',
                    title: 'Security',
                    subtitle: 'Password and authentication',
                    onPress: () => setShowSecurityModal(true),
                },
            ],
        },
        {
            title: 'Owner Preferences',
            items: [
                {
                    icon: 'business-outline',
                    title: 'Property Defaults',
                    subtitle: 'Default settings for new properties',
                    onPress: () => setShowPropertyDefaultsModal(true),
                },
                {
                    icon: 'people-outline',
                    title: 'Manager Permissions',
                    subtitle: 'Default roles for new managers',
                    onPress: () => setShowManagerPermissionsModal(true),
                },
                {
                    icon: 'document-text-outline',
                    title: 'Report Settings',
                    subtitle: 'Financial report preferences',
                    onPress: () => setShowReportSettingsModal(true),
                },
            ],
        },
        {
            title: 'Support',
            items: [
                {
                    icon: 'help-circle-outline',
                    title: 'Help Center',
                    subtitle: 'FAQs and support articles',
                    onPress: () => setShowHelpCenterModal(true),
                },
                {
                    icon: 'chatbubble-outline',
                    title: 'Contact Support',
                    subtitle: 'Get help from our team',
                    onPress: () => setShowContactSupportModal(true),
                },
                {
                    icon: 'information-circle-outline',
                    title: 'About EstateNet',
                    subtitle: 'Version and legal information',
                    onPress: () => setShowAboutModal(true),
                },
            ],
        },
    ];

    const renderSettingItem = (item: any) => (
        <TouchableOpacity
            key={item.title}
            style={{
                flexDirection: 'row',
                alignItems: 'center',
                paddingVertical: spacing.md,
                borderBottomWidth: 1,
                borderBottomColor: colors.divider,
            }}
            onPress={item.onPress}
        >
            <View
                style={{
                    width: 40,
                    height: 40,
                    borderRadius: 20,
                    backgroundColor: colors.surface,
                    alignItems: 'center',
                    justifyContent: 'center',
                    marginRight: spacing.md,
                }}
            >
                <Ionicons name={item.icon as any} size={20} color={colors.primary} />
            </View>
            <View style={{ flex: 1 }}>
                <Text style={[typography.body, { color: colors.text, fontWeight: '600' }]}>
                    {item.title}
                </Text>
                <Text style={[typography.bodySmall, { color: colors.textSecondary }]}>
                    {item.subtitle}
                </Text>
            </View>
            <Ionicons name="chevron-forward" size={16} color={colors.textSecondary} />
        </TouchableOpacity>
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
                        Owner Settings
                    </Text>
                    <Text style={[typography.bodySmall, { color: colors.textSecondary }]}>
                        Manage your account and preferences
                    </Text>
                </View>
            </View>

            <ScrollView contentContainerStyle={{ padding: spacing.base }}>
                {/* Profile Card */}
                <Card style={{ marginBottom: spacing.lg, padding: spacing.md }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                        <View
                            style={{
                                width: 64,
                                height: 64,
                                borderRadius: 32,
                                backgroundColor: colors.primary + '20',
                                alignItems: 'center',
                                justifyContent: 'center',
                                marginRight: spacing.md,
                            }}
                        >
                            <Ionicons name="person" size={32} color={colors.primary} />
                        </View>
                        <View style={{ flex: 1 }}>
                            <Text style={[typography.h3, { color: colors.text }]}>
                                {user?.name}
                            </Text>
                            <Text style={[typography.body, { color: colors.textSecondary }]}>
                                {user?.email}
                            </Text>
                            <Text style={[typography.bodySmall, { color: colors.textSecondary }]}>
                                Owner Account
                            </Text>
                        </View>
                    </View>
                </Card>

                {/* Settings Sections */}
                {settingsSections.map((section) => (
                    <Card key={section.title} style={{ marginBottom: spacing.lg }}>
                        <Text style={[typography.h3, { color: colors.text, marginBottom: spacing.md }]}>
                            {section.title}
                        </Text>
                        {section.items.map(renderSettingItem)}
                    </Card>
                ))}

                {/* Sign Out Button */}
                <Button
                    title="Sign Out"
                    onPress={handleSignOut}
                    variant="outline"
                    style={{ marginBottom: spacing.lg }}
                    icon={<Ionicons name="log-out-outline" size={18} color={colors.error} />}
                />

                {/* App Version */}
                <View style={{ alignItems: 'center', marginBottom: spacing.xl }}>
                    <Text style={[typography.bodySmall, { color: colors.textSecondary }]}>
                        EstateNet v1.0.0
                    </Text>
                    <Text style={[typography.bodySmall, { color: colors.textSecondary }]}>
                        © 2024 EstateNet. All rights reserved.
                    </Text>
                </View>
            </ScrollView>

            {/* Edit Profile Modal */}
            <Modal
                visible={showEditProfileModal}
                title="Edit Profile"
                onClose={() => setShowEditProfileModal(false)}
            >
                <View style={{ padding: spacing.base }}>
                    <Input
                        placeholder="Full Name"
                        value={editName}
                        onChangeText={setEditName}
                        style={{ marginBottom: spacing.md }}
                    />
                    <Input
                        placeholder="Email Address"
                        value={editEmail}
                        onChangeText={setEditEmail}
                        keyboardType="email-address"
                        autoCapitalize="none"
                        style={{ marginBottom: spacing.md }}
                    />
                    <Input
                        placeholder="Phone Number"
                        value={editPhone}
                        onChangeText={setEditPhone}
                        keyboardType="phone-pad"
                        style={{ marginBottom: spacing.lg }}
                    />
                    <View style={{ flexDirection: 'row' }}>
                        <Button
                            title="Cancel"
                            onPress={() => setShowEditProfileModal(false)}
                            variant="outline"
                            style={{ flex: 1, marginRight: spacing.sm }}
                        />
                        <Button
                            title="Save Changes"
                            onPress={handleSaveProfile}
                            variant="primary"
                            style={{ flex: 1, marginLeft: spacing.sm }}
                        />
                    </View>
                </View>
            </Modal>

            {/* Notifications Modal */}
            <Modal
                visible={showNotificationsModal}
                title="Notification Preferences"
                onClose={() => setShowNotificationsModal(false)}
            >
                <View style={{ padding: spacing.base }}>
                    {Object.entries(notifications).map(([key, value]) => (
                        <View
                            key={key}
                            style={{
                                flexDirection: 'row',
                                alignItems: 'center',
                                justifyContent: 'space-between',
                                marginBottom: spacing.md,
                            }}
                        >
                            <View style={{ flex: 1 }}>
                                <Text style={[typography.body, { color: colors.text }]}>
                                    {key.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase())}
                                </Text>
                                <Text style={[typography.bodySmall, { color: colors.textSecondary }]}>
                                    {key === 'payments' && 'Get notified about rent payments'}
                                    {key === 'messages' && 'Receive message notifications'}
                                    {key === 'invitations' && 'Get notified about manager invitations'}
                                </Text>
                            </View>
                            <TouchableOpacity
                                style={{
                                    width: 48,
                                    height: 28,
                                    borderRadius: 14,
                                    backgroundColor: value ? colors.primary : colors.border,
                                    alignItems: 'center',
                                    justifyContent: value ? 'flex-end' : 'flex-start',
                                    paddingHorizontal: 4,
                                }}
                                onPress={() => setNotifications(prev => ({ ...prev, [key]: !prev[key as keyof typeof prev] }))}
                            >
                                <View
                                    style={{
                                        width: 20,
                                        height: 20,
                                        borderRadius: 10,
                                        backgroundColor: '#FFFFFF',
                                    }}
                                />
                            </TouchableOpacity>
                        </View>
                    ))}
                    <Button
                        title="Save Preferences"
                        onPress={handleSaveNotifications}
                        variant="primary"
                        style={{ marginTop: spacing.lg }}
                    />
                </View>
            </Modal>

            {/* Security Modal */}
            <Modal
                visible={showSecurityModal}
                title="Security Settings"
                onClose={() => setShowSecurityModal(false)}
            >
                <View style={{ padding: spacing.base }}>
                    <TouchableOpacity
                        style={{
                            flexDirection: 'row',
                            alignItems: 'center',
                            paddingVertical: spacing.md,
                            borderBottomWidth: 1,
                            borderBottomColor: colors.divider,
                        }}
                        onPress={() => Alert.alert('Coming Soon', 'Change password functionality')}
                    >
                        <Ionicons name="key-outline" size={20} color={colors.primary} />
                        <Text style={[typography.body, { color: colors.text, marginLeft: spacing.md }]}>
                            Change Password
                        </Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                        style={{
                            flexDirection: 'row',
                            alignItems: 'center',
                            paddingVertical: spacing.md,
                            borderBottomWidth: 1,
                            borderBottomColor: colors.divider,
                        }}
                        onPress={() => Alert.alert('Coming Soon', 'Two-factor authentication')}
                    >
                        <Ionicons name="shield-checkmark-outline" size={20} color={colors.primary} />
                        <Text style={[typography.body, { color: colors.text, marginLeft: spacing.md }]}>
                            Two-Factor Authentication
                        </Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                        style={{
                            flexDirection: 'row',
                            alignItems: 'center',
                            paddingVertical: spacing.md,
                        }}
                        onPress={() => Alert.alert('Coming Soon', 'Login history and active sessions')}
                    >
                        <Ionicons name="time-outline" size={20} color={colors.primary} />
                        <Text style={[typography.body, { color: colors.text, marginLeft: spacing.md }]}>
                            Login History
                        </Text>
                    </TouchableOpacity>
                </View>
            </Modal>

            {/* About Modal */}
            <Modal
                visible={showAboutModal}
                title="About EstateNet"
                onClose={() => setShowAboutModal(false)}
            >
                <View style={{ padding: spacing.base, alignItems: 'center' }}>
                    <View
                        style={{
                            width: 80,
                            height: 80,
                            borderRadius: 16,
                            backgroundColor: colors.primary,
                            alignItems: 'center',
                            justifyContent: 'center',
                            marginBottom: spacing.lg,
                        }}
                    >
                        <Ionicons name="business" size={40} color="#FFFFFF" />
                    </View>
                    <Text style={[typography.h3, { color: colors.text, marginBottom: spacing.sm }]}>
                        EstateNet
                    </Text>
                    <Text style={[typography.body, { color: colors.textSecondary, marginBottom: spacing.lg }]}>
                        Version 1.0.0
                    </Text>
                    <Text style={[typography.body, { color: colors.text, textAlign: 'center', marginBottom: spacing.md }]}>
                        Professional property management solution for estate owners and managers in Uganda.
                    </Text>
                    <Text style={[typography.bodySmall, { color: colors.textSecondary, textAlign: 'center' }]}>
                        © 2024 EstateNet Technologies Ltd.
                    </Text>
                    <Text style={[typography.bodySmall, { color: colors.textSecondary, textAlign: 'center' }]}>
                        All rights reserved.
                    </Text>
                </View>
            </Modal>

            {/* Property Defaults Modal */}
            <Modal
                visible={showPropertyDefaultsModal}
                title="Property Defaults"
                onClose={() => setShowPropertyDefaultsModal(false)}
            >
                <View style={{ padding: spacing.base }}>
                    <Text style={[typography.body, { color: colors.text, marginBottom: spacing.md }]}>
                        Set default settings for new properties you create
                    </Text>

                    <View style={{ marginBottom: spacing.md }}>
                        <Text style={[typography.bodySmall, { color: colors.textSecondary, marginBottom: spacing.sm }]}>
                            Default Rent Collection Method
                        </Text>
                        <View style={styles.optionRow}>
                            {['estatenet', 'cash', 'bank_transfer'].map((method) => (
                                <TouchableOpacity
                                    key={method}
                                    style={[
                                        styles.optionChip,
                                        {
                                            backgroundColor: propertyDefaults.defaultRentCollectionMethod === method
                                                ? colors.primary
                                                : colors.surface,
                                            borderColor: colors.border
                                        }
                                    ]}
                                    onPress={() => setPropertyDefaults(prev => ({ ...prev, defaultRentCollectionMethod: method }))}
                                >
                                    <Text style={[
                                        typography.bodySmall,
                                        {
                                            color: propertyDefaults.defaultRentCollectionMethod === method
                                                ? '#FFFFFF'
                                                : colors.text
                                        }
                                    ]}>
                                        {method.charAt(0).toUpperCase() + method.slice(1).replace('_', ' ')}
                                    </Text>
                                </TouchableOpacity>
                            ))}
                        </View>
                    </View>

                    <View style={{ marginBottom: spacing.md }}>
                        <Text style={[typography.bodySmall, { color: colors.textSecondary, marginBottom: spacing.sm }]}>
                            Default Payment Terms
                        </Text>
                        <View style={styles.optionRow}>
                            {['1st of each month', '15th of each month', 'Last day of month'].map((terms) => (
                                <TouchableOpacity
                                    key={terms}
                                    style={[
                                        styles.optionChip,
                                        {
                                            backgroundColor: propertyDefaults.defaultPaymentTerms === terms
                                                ? colors.primary
                                                : colors.surface,
                                            borderColor: colors.border
                                        }
                                    ]}
                                    onPress={() => setPropertyDefaults(prev => ({ ...prev, defaultPaymentTerms: terms }))}
                                >
                                    <Text style={[
                                        typography.bodySmall,
                                        {
                                            color: propertyDefaults.defaultPaymentTerms === terms
                                                ? '#FFFFFF'
                                                : colors.text
                                        }
                                    ]}>
                                        {terms}
                                    </Text>
                                </TouchableOpacity>
                            ))}
                        </View>
                    </View>

                    <View style={{ marginBottom: spacing.lg }}>
                        <Text style={[typography.bodySmall, { color: colors.textSecondary, marginBottom: spacing.sm }]}>
                            Default Security Deposit (UGX)
                        </Text>
                        <Input
                            placeholder="0"
                            value={propertyDefaults.defaultSecurityDeposit.toString()}
                            onChangeText={(value) => setPropertyDefaults(prev => ({
                                ...prev,
                                defaultSecurityDeposit: parseInt(value) || 0
                            }))}
                            keyboardType="numeric"
                        />
                    </View>

                    <Button
                        title="Save Defaults"
                        onPress={handleSavePropertyDefaults}
                        variant="primary"
                    />
                </View>
            </Modal>

            {/* Manager Permissions Modal */}
            <Modal
                visible={showManagerPermissionsModal}
                title="Default Manager Permissions"
                onClose={() => setShowManagerPermissionsModal(false)}
            >
                <View style={{ padding: spacing.base }}>
                    <Text style={[typography.body, { color: colors.text, marginBottom: spacing.md }]}>
                        Set default permissions for new managers you invite
                    </Text>

                    <View style={{ marginBottom: spacing.md }}>
                        <Text style={[typography.bodySmall, { color: colors.textSecondary, marginBottom: spacing.sm }]}>
                            Default Role
                        </Text>
                        <View style={styles.optionRow}>
                            {['MANAGER', 'VIEWER'].map((role) => (
                                <TouchableOpacity
                                    key={role}
                                    style={[
                                        styles.optionChip,
                                        {
                                            backgroundColor: managerPermissions.defaultRole === role
                                                ? colors.primary
                                                : colors.surface,
                                            borderColor: colors.border
                                        }
                                    ]}
                                    onPress={() => setManagerPermissions(prev => ({ ...prev, defaultRole: role }))}
                                >
                                    <Text style={[
                                        typography.bodySmall,
                                        {
                                            color: managerPermissions.defaultRole === role
                                                ? '#FFFFFF'
                                                : colors.text
                                        }
                                    ]}>
                                        {role}
                                    </Text>
                                </TouchableOpacity>
                            ))}
                        </View>
                    </View>

                    <View style={{ marginBottom: spacing.lg }}>
                        <Text style={[typography.body, { color: colors.text, marginBottom: spacing.md }]}>
                            Additional Permissions
                        </Text>

                        {[
                            { key: 'canInviteOthers', label: 'Can invite other managers' },
                            { key: 'canManageFinances', label: 'Can manage finances' },
                            { key: 'canEditProperty', label: 'Can edit property details' },
                        ].map((permission) => (
                            <View
                                key={permission.key}
                                style={{
                                    flexDirection: 'row',
                                    alignItems: 'center',
                                    justifyContent: 'space-between',
                                    marginBottom: spacing.md,
                                }}
                            >
                                <View style={{ flex: 1 }}>
                                    <Text style={[typography.body, { color: colors.text }]}>
                                        {permission.label}
                                    </Text>
                                </View>
                                <TouchableOpacity
                                    style={{
                                        width: 48,
                                        height: 28,
                                        borderRadius: 14,
                                        backgroundColor: managerPermissions[permission.key as keyof typeof managerPermissions] ? colors.primary : colors.border,
                                        alignItems: 'center',
                                        justifyContent: managerPermissions[permission.key as keyof typeof managerPermissions] ? 'flex-end' : 'flex-start',
                                        paddingHorizontal: 4,
                                    }}
                                    onPress={() => setManagerPermissions(prev => ({
                                        ...prev,
                                        [permission.key]: !prev[permission.key as keyof typeof prev]
                                    }))}
                                >
                                    <View
                                        style={{
                                            width: 20,
                                            height: 20,
                                            borderRadius: 10,
                                            backgroundColor: '#FFFFFF',
                                        }}
                                    />
                                </TouchableOpacity>
                            </View>
                        ))}
                    </View>

                    <Button
                        title="Save Permissions"
                        onPress={handleSaveManagerPermissions}
                        variant="primary"
                    />
                </View>
            </Modal>

            {/* Report Settings Modal */}
            <Modal
                visible={showReportSettingsModal}
                title="Report Settings"
                onClose={() => setShowReportSettingsModal(false)}
            >
                <View style={{ padding: spacing.base }}>
                    <Text style={[typography.body, { color: colors.text, marginBottom: spacing.md }]}>
                        Customize your financial report preferences
                    </Text>

                    <View style={{ marginBottom: spacing.md }}>
                        <Text style={[typography.bodySmall, { color: colors.textSecondary, marginBottom: spacing.sm }]}>
                            Report Frequency
                        </Text>
                        <View style={styles.optionRow}>
                            {['weekly', 'monthly', 'quarterly'].map((frequency) => (
                                <TouchableOpacity
                                    key={frequency}
                                    style={[
                                        styles.optionChip,
                                        {
                                            backgroundColor: reportSettings.frequency === frequency
                                                ? colors.primary
                                                : colors.surface,
                                            borderColor: colors.border
                                        }
                                    ]}
                                    onPress={() => setReportSettings(prev => ({ ...prev, frequency }))}
                                >
                                    <Text style={[
                                        typography.bodySmall,
                                        {
                                            color: reportSettings.frequency === frequency
                                                ? '#FFFFFF'
                                                : colors.text
                                        }
                                    ]}>
                                        {frequency.charAt(0).toUpperCase() + frequency.slice(1)}
                                    </Text>
                                </TouchableOpacity>
                            ))}
                        </View>
                    </View>

                    <View style={{ marginBottom: spacing.md }}>
                        <Text style={[typography.bodySmall, { color: colors.textSecondary, marginBottom: spacing.sm }]}>
                            Export Format
                        </Text>
                        <View style={styles.optionRow}>
                            {['pdf', 'excel', 'csv'].map((format) => (
                                <TouchableOpacity
                                    key={format}
                                    style={[
                                        styles.optionChip,
                                        {
                                            backgroundColor: reportSettings.exportFormat === format
                                                ? colors.primary
                                                : colors.surface,
                                            borderColor: colors.border
                                        }
                                    ]}
                                    onPress={() => setReportSettings(prev => ({ ...prev, exportFormat: format }))}
                                >
                                    <Text style={[
                                        typography.bodySmall,
                                        {
                                            color: reportSettings.exportFormat === format
                                                ? '#FFFFFF'
                                                : colors.text
                                        }
                                    ]}>
                                        {format.toUpperCase()}
                                    </Text>
                                </TouchableOpacity>
                            ))}
                        </View>
                    </View>

                    <View style={{ marginBottom: spacing.lg }}>
                        <View
                            style={{
                                flexDirection: 'row',
                                alignItems: 'center',
                                justifyContent: 'space-between',
                                marginBottom: spacing.md,
                            }}
                        >
                            <View style={{ flex: 1 }}>
                                <Text style={[typography.body, { color: colors.text }]}>
                                    Include Charts in Reports
                                </Text>
                                <Text style={[typography.bodySmall, { color: colors.textSecondary }]}>
                                    Add visual charts to financial reports
                                </Text>
                            </View>
                            <TouchableOpacity
                                style={{
                                    width: 48,
                                    height: 28,
                                    borderRadius: 14,
                                    backgroundColor: reportSettings.includeCharts ? colors.primary : colors.border,
                                    alignItems: 'center',
                                    justifyContent: reportSettings.includeCharts ? 'flex-end' : 'flex-start',
                                    paddingHorizontal: 4,
                                }}
                                onPress={() => setReportSettings(prev => ({
                                    ...prev,
                                    includeCharts: !prev.includeCharts
                                }))}
                            >
                                <View
                                    style={{
                                        width: 20,
                                        height: 20,
                                        borderRadius: 10,
                                        backgroundColor: '#FFFFFF',
                                    }}
                                />
                            </TouchableOpacity>
                        </View>

                        <View
                            style={{
                                flexDirection: 'row',
                                alignItems: 'center',
                                justifyContent: 'space-between',
                            }}
                        >
                            <View style={{ flex: 1 }}>
                                <Text style={[typography.body, { color: colors.text }]}>
                                    Auto-Email Reports
                                </Text>
                                <Text style={[typography.bodySmall, { color: colors.textSecondary }]}>
                                    Automatically send reports to your email
                                </Text>
                            </View>
                            <TouchableOpacity
                                style={{
                                    width: 48,
                                    height: 28,
                                    borderRadius: 14,
                                    backgroundColor: reportSettings.autoEmail ? colors.primary : colors.border,
                                    alignItems: 'center',
                                    justifyContent: reportSettings.autoEmail ? 'flex-end' : 'flex-start',
                                    paddingHorizontal: 4,
                                }}
                                onPress={() => setReportSettings(prev => ({
                                    ...prev,
                                    autoEmail: !prev.autoEmail
                                }))}
                            >
                                <View
                                    style={{
                                        width: 20,
                                        height: 20,
                                        borderRadius: 10,
                                        backgroundColor: '#FFFFFF',
                                    }}
                                />
                            </TouchableOpacity>
                        </View>
                    </View>

                    <Button
                        title="Save Settings"
                        onPress={handleSaveReportSettings}
                        variant="primary"
                    />
                </View>
            </Modal>

            {/* Help Center Modal */}
            <Modal
                visible={showHelpCenterModal}
                title="Help Center"
                onClose={() => setShowHelpCenterModal(false)}
            >
                <View style={{ padding: spacing.base }}>
                    <Text style={[typography.body, { color: colors.text, marginBottom: spacing.lg }]}>
                        Frequently Asked Questions
                    </Text>

                    {[
                        {
                            question: 'How do I invite a manager to my property?',
                            answer: 'Go to Owner Center → Property Managers → Invite Manager. Enter their email and select their role.'
                        },
                        {
                            question: 'What are the different manager roles?',
                            answer: 'Owner: Full control. Admin: Can manage everything except invite others. Manager: Can manage tenants. Viewer: Read-only access.'
                        },
                        {
                            question: 'How do I view financial reports?',
                            answer: 'Go to Owner Center → Reports or Owner Financial screen. You can export reports as PDF, Excel, or CSV.'
                        },
                        {
                            question: 'Can I change a manager\'s role later?',
                            answer: 'Yes. Go to Owner Center → Property Managers, find the manager, and tap the settings icon to change their role.'
                        },
                        {
                            question: 'How do property codes work?',
                            answer: 'Property codes allow managers to request access. Share codes via QR code, text, or copy to clipboard.'
                        },
                    ].map((faq, index) => (
                        <View key={index} style={{ marginBottom: spacing.lg }}>
                            <Text style={[typography.body, { color: colors.primary, fontWeight: '600', marginBottom: spacing.sm }]}>
                                {faq.question}
                            </Text>
                            <Text style={[typography.bodySmall, { color: colors.textSecondary, lineHeight: 20 }]}>
                                {faq.answer}
                            </Text>
                        </View>
                    ))}

                    <View style={[styles.contactCard, { backgroundColor: colors.surface }]}>
                        <Ionicons name="mail" size={20} color={colors.primary} />
                        <View style={{ marginLeft: spacing.md, flex: 1 }}>
                            <Text style={[typography.body, { color: colors.text, fontWeight: '600' }]}>
                                Still need help?
                            </Text>
                            <Text style={[typography.bodySmall, { color: colors.textSecondary }]}>
                                Contact our support team for assistance
                            </Text>
                        </View>
                        <Button
                            title="Contact Support"
                            onPress={() => {
                                setShowHelpCenterModal(false);
                                setShowContactSupportModal(true);
                            }}
                            variant="outline"
                            size="small"
                        />
                    </View>
                </View>
            </Modal>

            {/* Contact Support Modal */}
            <Modal
                visible={showContactSupportModal}
                title="Contact Support"
                onClose={() => setShowContactSupportModal(false)}
            >
                <View style={{ padding: spacing.base }}>
                    <Text style={[typography.body, { color: colors.text, marginBottom: spacing.md }]}>
                        How can we help you today?
                    </Text>

                    <View style={[styles.contactCard, { backgroundColor: colors.surface, marginBottom: spacing.lg }]}>
                        <Ionicons name="time" size={20} color={colors.primary} />
                        <View style={{ marginLeft: spacing.md, flex: 1 }}>
                            <Text style={[typography.body, { color: colors.text, fontWeight: '600' }]}>
                                Response Time
                            </Text>
                            <Text style={[typography.bodySmall, { color: colors.textSecondary }]}>
                                We typically respond within 24 hours during business days
                            </Text>
                        </View>
                    </View>

                    <View style={{ marginBottom: spacing.lg }}>
                        <Text style={[typography.bodySmall, { color: colors.textSecondary, marginBottom: spacing.sm }]}>
                            Your Message
                        </Text>
                        <View style={{
                            backgroundColor: colors.surface,
                            borderRadius: 12,
                            borderWidth: 1,
                            borderColor: colors.border,
                            minHeight: 120,
                            padding: spacing.md,
                        }}>
                            <Input
                                placeholder="Describe your issue or question..."
                                value={supportMessage}
                                onChangeText={setSupportMessage}
                                multiline
                                style={{
                                    borderWidth: 0,
                                    backgroundColor: 'transparent',
                                    padding: 0,
                                    minHeight: 80,
                                }}
                            />
                        </View>
                    </View>

                    <View style={{ marginBottom: spacing.lg }}>
                        <Text style={[typography.bodySmall, { color: colors.textSecondary, marginBottom: spacing.sm }]}>
                            Other ways to reach us
                        </Text>
                        <View style={styles.contactMethods}>
                            <View style={styles.contactMethod}>
                                <Ionicons name="mail" size={16} color={colors.primary} />
                                <Text style={[typography.bodySmall, { color: colors.text, marginLeft: spacing.sm }]}>
                                    support@estatenet.ug
                                </Text>
                            </View>
                            <View style={styles.contactMethod}>
                                <Ionicons name="call" size={16} color={colors.primary} />
                                <Text style={[typography.bodySmall, { color: colors.text, marginLeft: spacing.sm }]}>
                                    +256 414 123 456
                                </Text>
                            </View>
                            <View style={styles.contactMethod}>
                                <Ionicons name="logo-whatsapp" size={16} color={colors.primary} />
                                <Text style={[typography.bodySmall, { color: colors.text, marginLeft: spacing.sm }]}>
                                    +256 752 789 012
                                </Text>
                            </View>
                        </View>
                    </View>

                    <View style={{ flexDirection: 'row' }}>
                        <Button
                            title="Cancel"
                            onPress={() => setShowContactSupportModal(false)}
                            variant="outline"
                            style={{ flex: 1, marginRight: spacing.sm }}
                        />
                        <Button
                            title="Send Message"
                            onPress={handleContactSupport}
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
    optionRow: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 8,
    },
    optionChip: {
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 16,
        borderWidth: 1,
        marginRight: 8,
        marginBottom: 8,
    },
    contactCard: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 16,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: '#E5E7EB',
    },
    contactMethods: {
        gap: 12,
    },
    contactMethod: {
        flexDirection: 'row',
        alignItems: 'center',
    },
});
