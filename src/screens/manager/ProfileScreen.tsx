import React, { useMemo, useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, Image, Alert, Switch, Platform, TextInput } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '../../theme/ThemeContext';
import { useAuth, UserRole } from '../../context/AuthContext';
import { formatUGX, formatMemberSince } from '../../utils/formatters';
import { apiDelete } from '../../utils/apiClient';
import { useProperties } from '../../context/PropertyContext';
import { Button } from '../../components/Button';
import { Input } from '../../components/Input';
import { Card } from '../../components/Card';
import { Modal } from '../../components/Modal';
import { LegalDocumentViewer } from '../../components/LegalDocumentViewer';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';

export const ProfileScreen: React.FC<any> = ({ navigation }) => {
    const { colors, spacing, typography, borderRadius, isDark, setTheme } = useTheme();
    const { user, signOut } = useAuth();
    const { properties } = useProperties();
    const [showSettings, setShowSettings] = useState(false);
    const [showAccountInfo, setShowAccountInfo] = useState(false);
    const [showNotifications, setShowNotifications] = useState(false);
    const [showAppearance, setShowAppearance] = useState(false);

    const [showPrivacyPolicy, setShowPrivacyPolicy] = useState(false);
    const [showTermsOfService, setShowTermsOfService] = useState(false);
    const [showDeleteAccount, setShowDeleteAccount] = useState(false);
    const [deleteConfirmation, setDeleteConfirmation] = useState('');
    const [deleting, setDeleting] = useState(false);
    const [profileImage, setProfileImage] = useState<string | null>(null);

    // Settings state
    const [name, setName] = useState(user?.name || '');
    const [email, setEmail] = useState(user?.email || '');
    const [phone, setPhone] = useState(user?.phoneNumber || '');
    const [notifyPayments, setNotifyPayments] = useState(true);
    const [notifyMessages, setNotifyMessages] = useState(true);
    const [notifyReminders, setNotifyReminders] = useState(true);



    const pickImage = async () => {
        const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (status !== 'granted') {
            Alert.alert('Permission needed', 'Please grant camera roll permissions to upload a profile picture.');
            return;
        }

        const result = await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ImagePicker.MediaTypeOptions.Images,
            allowsEditing: true,
            aspect: [1, 1],
            quality: 0.8,
        });

        if (!result.canceled && result.assets[0]) {
            setProfileImage(result.assets[0].uri);
        }
    };

    // Stats for social media style - using real data
    const totalTenants = useMemo(() => {
        return properties.reduce((total, property) => {
            const tenants = property.units?.reduce((unitTotal, unit) => {
                return unitTotal + (unit.leases?.length || 0);
            }, 0) || 0;
            return total + tenants;
        }, 0);
    }, [properties]);

    const stats = [
        { label: 'Properties', value: properties.length.toString() },
        { label: 'Tenants', value: totalTenants.toString() },
        { label: 'Rating', value: '0.0' }, // TODO: Implement real rating system
    ];

    return (
        <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }}>
            <ScrollView
                showsVerticalScrollIndicator={false}
                contentContainerStyle={{ paddingBottom: Platform.OS === 'android' ? 115 : 64 }}
            >
                {/* Header with Settings Icon */}
                <View style={{
                    flexDirection: 'row',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    paddingHorizontal: spacing.base,
                    paddingTop: spacing.md,
                }}>
                    <TouchableOpacity onPress={() => navigation.goBack()}>
                        <Ionicons name="arrow-back" size={24} color={colors.text} />
                    </TouchableOpacity>
                    <Text style={[typography.h3, { color: colors.text }]}>Profile</Text>
                    <TouchableOpacity onPress={() => setShowSettings(true)}>
                        <Ionicons name="settings-outline" size={24} color={colors.text} />
                    </TouchableOpacity>
                </View>

                {/* Profile Header - Social Media Style */}
                <View style={{ alignItems: 'center', paddingVertical: spacing.xl }}>
                    {/* Profile Picture */}
                    <TouchableOpacity onPress={pickImage} activeOpacity={0.8}>
                        <View style={{
                            width: 120,
                            height: 120,
                            borderRadius: 60,
                            borderWidth: 4,
                            borderColor: colors.accent,
                            overflow: 'hidden',
                            backgroundColor: colors.surface,
                        }}>
                            {profileImage ? (
                                <Image
                                    source={{ uri: profileImage }}
                                    style={{ width: '100%', height: '100%' }}
                                />
                            ) : (
                                <View style={{
                                    flex: 1,
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    backgroundColor: colors.primary + '20',
                                }}>
                                    <Ionicons name="person" size={60} color={colors.primary} />
                                </View>
                            )}
                        </View>
                        <View style={{
                            position: 'absolute',
                            bottom: 0,
                            right: 0,
                            backgroundColor: colors.accent,
                            width: 36,
                            height: 36,
                            borderRadius: 18,
                            alignItems: 'center',
                            justifyContent: 'center',
                            borderWidth: 3,
                            borderColor: colors.background,
                        }}>
                            <Ionicons name="camera" size={18} color="#FFFFFF" />
                        </View>
                    </TouchableOpacity>

                    {/* Name and Role */}
                    <Text style={[typography.h1, { color: colors.text, marginTop: spacing.lg }]}>
                        {user?.name}
                    </Text>
                    <View style={{
                        flexDirection: 'row',
                        alignItems: 'center',
                        marginTop: spacing.xs,
                        backgroundColor: colors.primary + '20',
                        paddingHorizontal: spacing.md,
                        paddingVertical: spacing.xs,
                        borderRadius: borderRadius.full,
                    }}>
                        <Ionicons
                            name={user?.role === 'MANAGER' ? 'briefcase' : 'home'}
                            size={14}
                            color={colors.primary}
                        />
                        <Text style={[typography.bodySmall, { color: colors.primary, marginLeft: spacing.xs, fontWeight: '600' }]}>
                            {user?.role === 'MANAGER' ? 'Property Manager' : 'Tenant'}
                        </Text>
                    </View>

                    {/* Tenant ID if applicable */}
                    {user?.tenantId && (
                        <View style={{
                            marginTop: spacing.md,
                            flexDirection: 'row',
                            alignItems: 'center',
                        }}>
                            <Ionicons name="card-outline" size={16} color={colors.textSecondary} />
                            <Text style={[typography.body, { color: colors.textSecondary, marginLeft: spacing.xs }]}>
                                ID: <Text style={{ color: colors.accent, fontWeight: '700' }}>{user.tenantId}</Text>
                            </Text>
                        </View>
                    )}

                    {/* Bio/Email */}
                    <Text style={[typography.body, { color: colors.textSecondary, marginTop: spacing.sm }]}>
                        {user?.email}
                    </Text>
                </View>

                {/* Stats Row */}
                {user?.role === 'MANAGER' && (
                    <View style={{
                        flexDirection: 'row',
                        justifyContent: 'space-around',
                        paddingVertical: spacing.lg,
                        marginHorizontal: spacing.base,
                        borderTopWidth: 1,
                        borderBottomWidth: 1,
                        borderColor: colors.border,
                    }}>
                        {stats.map((stat, index) => (
                            <View key={index} style={{ alignItems: 'center' }}>
                                <Text style={[typography.h2, { color: colors.text }]}>{stat.value}</Text>
                                <Text style={[typography.bodySmall, { color: colors.textSecondary, marginTop: spacing.xs }]}>
                                    {stat.label}
                                </Text>
                            </View>
                        ))}
                    </View>
                )}

                {/* Quick Info Cards */}
                <View style={{ padding: spacing.base }}>
                    <Card style={{ marginBottom: spacing.md }}>
                        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                            <View style={{
                                width: 48,
                                height: 48,
                                borderRadius: 24,
                                backgroundColor: colors.success + '20',
                                alignItems: 'center',
                                justifyContent: 'center',
                                marginRight: spacing.md,
                            }}>
                                <Ionicons name="call" size={24} color={colors.success} />
                            </View>
                            <View style={{ flex: 1 }}>
                                <Text style={[typography.bodySmall, { color: colors.textSecondary }]}>Phone</Text>
                                <Text style={[typography.body, { color: colors.text, fontWeight: '600' }]}>
                                    {user?.phoneNumber || 'Not set'}
                                </Text>
                            </View>
                        </View>
                    </Card>

                    <Card style={{ marginBottom: spacing.md }}>
                        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                            <View style={{
                                width: 48,
                                height: 48,
                                borderRadius: 24,
                                backgroundColor: colors.info + '20',
                                alignItems: 'center',
                                justifyContent: 'center',
                                marginRight: spacing.md,
                            }}>
                                <Ionicons name="mail" size={24} color={colors.info} />
                            </View>
                            <View style={{ flex: 1 }}>
                                <Text style={[typography.bodySmall, { color: colors.textSecondary }]}>Email</Text>
                                <Text style={[typography.body, { color: colors.text, fontWeight: '600' }]}>
                                    {user?.email || 'Not set'}
                                </Text>
                            </View>
                        </View>
                    </Card>

                    <Card>
                        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                            <View style={{
                                width: 48,
                                height: 48,
                                borderRadius: 24,
                                backgroundColor: colors.accent + '20',
                                alignItems: 'center',
                                justifyContent: 'center',
                                marginRight: spacing.md,
                            }}>
                                <Ionicons name="calendar" size={24} color={colors.accent} />
                            </View>
                            <View style={{ flex: 1 }}>
                                <Text style={[typography.bodySmall, { color: colors.textSecondary }]}>Member Since</Text>
                                <Text style={[typography.body, { color: colors.text, fontWeight: '600' }]}>
                                    {formatMemberSince(user?.createdAt)}
                                </Text>
                            </View>
                        </View>
                    </Card>

                </View>
            </ScrollView>

            {/* Settings Modal */}
            <Modal
                visible={showSettings}
                onClose={() => setShowSettings(false)}
                title="Settings"
                size="large"
            >
                <View>
                    <SettingItem
                        icon="person-circle-outline"
                        label="Account Info"
                        onPress={() => {
                            setShowSettings(false);
                            setTimeout(() => setShowAccountInfo(true), 300);
                        }}
                        colors={colors}
                        spacing={spacing}
                        typography={typography}
                    />
                    <SettingItem
                        icon="notifications-outline"
                        label="Notifications"
                        onPress={() => {
                            setShowSettings(false);
                            setTimeout(() => setShowNotifications(true), 300);
                        }}
                        colors={colors}
                        spacing={spacing}
                        typography={typography}
                    />
                    <SettingItem
                        icon="color-palette-outline"
                        label="Appearance"
                        onPress={() => {
                            setShowSettings(false);
                            setTimeout(() => setShowAppearance(true), 300);
                        }}
                        colors={colors}
                        spacing={spacing}
                        typography={typography}
                    />
                    <View style={{ height: 1, backgroundColor: colors.border, marginVertical: spacing.md }} />
                    <SettingItem
                        icon="shield-checkmark-outline"
                        label="Privacy Policy"
                        onPress={() => {
                            setShowSettings(false);
                            setTimeout(() => setShowPrivacyPolicy(true), 300);
                        }}
                        colors={colors}
                        spacing={spacing}
                        typography={typography}
                    />
                    <SettingItem
                        icon="document-text-outline"
                        label="Terms of Service"
                        onPress={() => {
                            setShowSettings(false);
                            setTimeout(() => setShowTermsOfService(true), 300);
                        }}
                        colors={colors}
                        spacing={spacing}
                        typography={typography}
                    />
                    <SettingItem
                        icon="trash-outline"
                        label="Delete Account"
                        onPress={() => {
                            setShowSettings(false);
                            setTimeout(() => setShowDeleteAccount(true), 300);
                        }}
                        colors={{ ...colors, primary: colors.error, text: colors.error }}
                        spacing={spacing}
                        typography={typography}
                    />
                    <View style={{ marginTop: spacing.xl }}>
                        <Button
                            title="Sign Out"
                            onPress={() => {
                                setShowSettings(false);
                                signOut();
                            }}
                            variant="outline"
                            size="large"
                            style={{ borderColor: colors.error }}
                            textStyle={{ color: colors.error }}
                            icon={<Ionicons name="log-out-outline" size={20} color={colors.error} />}
                        />
                    </View>
                </View>
            </Modal>

            {/* Account Info Modal */}
            <Modal
                visible={showAccountInfo}
                onClose={() => setShowAccountInfo(false)}
                title="Account Info"
                size="large"
            >
                <View>
                    <Input
                        label="Full Name"
                        value={name}
                        onChangeText={setName}
                        icon={<Ionicons name="person-outline" size={20} color={colors.textSecondary} />}
                    />
                    <Input
                        label="Email"
                        value={email}
                        onChangeText={setEmail}
                        keyboardType="email-address"
                        icon={<Ionicons name="mail-outline" size={20} color={colors.textSecondary} />}
                    />
                    <Input
                        label="Phone Number"
                        value={phone}
                        onChangeText={setPhone}
                        keyboardType="phone-pad"
                        icon={<Ionicons name="call-outline" size={20} color={colors.textSecondary} />}
                    />
                    <Button
                        title="Save Changes"
                        onPress={() => {
                            Alert.alert('Success', 'Account information updated');
                            setShowAccountInfo(false);
                        }}
                        variant="primary"
                        size="large"
                        style={{ marginTop: spacing.lg }}
                    />
                </View>
            </Modal>

            {/* Notifications Modal */}
            <Modal
                visible={showNotifications}
                onClose={() => setShowNotifications(false)}
                title="Notifications"
                size="medium"
            >
                <View>
                    <NotificationToggle
                        label="Payment Updates"
                        description="Get notified about rent payments"
                        value={notifyPayments}
                        onToggle={setNotifyPayments}
                        colors={colors}
                        spacing={spacing}
                        typography={typography}
                    />
                    <NotificationToggle
                        label="Messages"
                        description="Receive message notifications"
                        value={notifyMessages}
                        onToggle={setNotifyMessages}
                        colors={colors}
                        spacing={spacing}
                        typography={typography}
                    />
                    <NotificationToggle
                        label="Reminders"
                        description="Get payment reminders"
                        value={notifyReminders}
                        onToggle={setNotifyReminders}
                        colors={colors}
                        spacing={spacing}
                        typography={typography}
                    />
                </View>
            </Modal>

            {/* Appearance Modal */}
            <Modal
                visible={showAppearance}
                onClose={() => setShowAppearance(false)}
                title="Appearance"
                size="medium"
            >
                <View>
                    <Text style={[typography.body, { color: colors.textSecondary, marginBottom: spacing.lg }]}>
                        Choose your preferred theme
                    </Text>

                    <TouchableOpacity
                        onPress={() => setTheme('light')}
                        style={{
                            flexDirection: 'row',
                            alignItems: 'center',
                            padding: spacing.md,
                            backgroundColor: !isDark ? colors.primary + '10' : colors.surface,
                            borderRadius: borderRadius.md,
                            borderWidth: 2,
                            borderColor: !isDark ? colors.primary : colors.border,
                            marginBottom: spacing.md,
                        }}
                    >
                        <View style={{
                            width: 48,
                            height: 48,
                            borderRadius: 24,
                            backgroundColor: '#FFFFFF',
                            borderWidth: 1,
                            borderColor: colors.border,
                            alignItems: 'center',
                            justifyContent: 'center',
                            marginRight: spacing.md,
                        }}>
                            <Ionicons name="sunny" size={24} color="#F59E0B" />
                        </View>
                        <View style={{ flex: 1 }}>
                            <Text style={[typography.h4, { color: colors.text }]}>Light Mode</Text>
                            <Text style={[typography.bodySmall, { color: colors.textSecondary }]}>
                                Bright and clean interface
                            </Text>
                        </View>
                        {!isDark && <Ionicons name="checkmark-circle" size={24} color={colors.primary} />}
                    </TouchableOpacity>

                    <TouchableOpacity
                        onPress={() => setTheme('dark')}
                        style={{
                            flexDirection: 'row',
                            alignItems: 'center',
                            padding: spacing.md,
                            backgroundColor: isDark ? colors.primary + '10' : colors.surface,
                            borderRadius: borderRadius.md,
                            borderWidth: 2,
                            borderColor: isDark ? colors.primary : colors.border,
                        }}
                    >
                        <View style={{
                            width: 48,
                            height: 48,
                            borderRadius: 24,
                            backgroundColor: '#1F2937',
                            alignItems: 'center',
                            justifyContent: 'center',
                            marginRight: spacing.md,
                        }}>
                            <Ionicons name="moon" size={24} color="#9CA3AF" />
                        </View>
                        <View style={{ flex: 1 }}>
                            <Text style={[typography.h4, { color: colors.text }]}>Dark Mode</Text>
                            <Text style={[typography.bodySmall, { color: colors.textSecondary }]}>
                                Easy on the eyes
                            </Text>
                        </View>
                        {isDark && <Ionicons name="checkmark-circle" size={24} color={colors.primary} />}
                    </TouchableOpacity>

                    <Text style={[typography.bodySmall, { color: colors.textTertiary, marginTop: spacing.lg, textAlign: 'center', fontStyle: 'italic' }]}>
                        Theme changes will apply across the app
                    </Text>
                </View>
            </Modal>

            {/* Delete Account Confirmation */}
            <Modal
                visible={showDeleteAccount}
                onClose={() => {
                    setShowDeleteAccount(false);
                    setDeleteConfirmation('');
                }}
                title="Delete Account"
                size="medium"
            >
                <View>
                    <View style={{
                        backgroundColor: colors.error + '10',
                        borderWidth: 1,
                        borderColor: colors.error,
                        borderRadius: borderRadius.md,
                        padding: spacing.md,
                        marginBottom: spacing.lg,
                    }}>
                        <View style={{ flexDirection: 'row', alignItems: 'flex-start' }}>
                            <Ionicons name="warning" size={24} color={colors.error} style={{ marginRight: spacing.sm }} />
                            <View style={{ flex: 1 }}>
                                <Text style={[typography.h4, { color: colors.error, marginBottom: spacing.xs }]}>
                                    This action cannot be undone
                                </Text>
                                <Text style={[typography.bodySmall, { color: colors.text }]}>
                                    Your account, profile, managed properties, lease history,
                                    and all associated data will be permanently deleted.
                                </Text>
                            </View>
                        </View>
                    </View>

                    <Text style={[typography.body, { color: colors.text, marginBottom: spacing.md }]}>
                        Type <Text style={{ fontWeight: '700' }}>DELETE</Text> below to confirm:
                    </Text>

                    <TextInput
                        style={{
                            borderWidth: 1,
                            borderColor: deleteConfirmation === 'DELETE' ? colors.error : colors.border,
                            borderRadius: borderRadius.md,
                            padding: spacing.md,
                            color: colors.text,
                            backgroundColor: colors.surface,
                            fontSize: 16,
                        }}
                        placeholder="Type DELETE to confirm"
                        placeholderTextColor={colors.textTertiary}
                        value={deleteConfirmation}
                        onChangeText={setDeleteConfirmation}
                        autoCapitalize="characters"
                    />

                    <View style={{ flexDirection: 'row', gap: spacing.sm, marginTop: spacing.xl }}>
                        <View style={{ flex: 1 }}>
                            <Button
                                title="Cancel"
                                onPress={() => {
                                    setShowDeleteAccount(false);
                                    setDeleteConfirmation('');
                                }}
                                variant="outline"
                                size="large"
                            />
                        </View>
                        <View style={{ flex: 1 }}>
                            <Button
                                title={deleting ? 'Deleting...' : 'Delete'}
                                onPress={async () => {
                                    if (deleteConfirmation !== 'DELETE') return;
                                    setDeleting(true);
                                    try {
                                        const { status, json } = await apiDelete('/auth/account');
                                        if (status >= 200 && status < 300 && json?.success) {
                                            setShowDeleteAccount(false);
                                            setDeleteConfirmation('');
                                            await signOut();
                                        } else {
                                            Alert.alert('Error', json?.message || 'Failed to delete account');
                                        }
                                    } catch (error: any) {
                                        Alert.alert('Error', error?.message || 'Failed to delete account');
                                    } finally {
                                        setDeleting(false);
                                    }
                                }}
                                disabled={deleteConfirmation !== 'DELETE' || deleting}
                                variant="primary"
                                size="large"
                                style={{
                                    backgroundColor: deleteConfirmation === 'DELETE' && !deleting ? colors.error : colors.border,
                                }}
                                textStyle={{ color: '#FFFFFF' }}
                            />
                        </View>
                    </View>
                </View>
            </Modal>

            {/* Legal Document Viewers */}
            <LegalDocumentViewer
                visible={showPrivacyPolicy}
                onClose={() => setShowPrivacyPolicy(false)}
                title="Privacy Policy"
                url="https://arcanevalue.github.io/EstateNet/privacy-policy.html"
            />
            <LegalDocumentViewer
                visible={showTermsOfService}
                onClose={() => setShowTermsOfService(false)}
                title="Terms of Service"
                url="https://arcanevalue.github.io/EstateNet/terms-of-service.html"
            />
        </SafeAreaView>
    );
};

const SettingItem = ({ icon, label, onPress, colors, spacing, typography }: any) => (
    <TouchableOpacity
        onPress={onPress}
        style={{
            flexDirection: 'row',
            alignItems: 'center',
            paddingVertical: spacing.md,
            borderBottomWidth: 1,
            borderBottomColor: colors.border,
        }}
    >
        <Ionicons name={icon} size={24} color={colors.primary} />
        <View style={{ flex: 1, marginLeft: spacing.md }}>
            <Text style={[typography.body, { color: colors.text }]}>{label}</Text>
        </View>
        <Ionicons name="chevron-forward" size={20} color={colors.textSecondary} />
    </TouchableOpacity>
);

const NotificationToggle = ({ label, description, value, onToggle, colors, spacing, typography }: any) => (
    <View style={{
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: spacing.md,
        borderBottomWidth: 1,
        borderBottomColor: colors.border,
    }}>
        <View style={{ flex: 1 }}>
            <Text style={[typography.body, { color: colors.text }]}>{label}</Text>
            <Text style={[typography.bodySmall, { color: colors.textSecondary, marginTop: 2 }]}>{description}</Text>
        </View>
        <Switch
            value={value}
            onValueChange={onToggle}
            trackColor={{ false: colors.border, true: colors.primary + '60' }}
            thumbColor={value ? colors.primary : colors.textTertiary}
        />
    </View>
);
