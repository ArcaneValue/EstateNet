import React, { useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, Image, Alert, Switch, Clipboard, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '../../theme/ThemeContext';
import { useAuth } from '../../context/AuthContext';
import { useLease } from '../../context/LeaseContext';
import { Card } from '../../components/Card';
import { Modal } from '../../components/Modal';
import { LegalDocumentViewer } from '../../components/LegalDocumentViewer';
import { Input } from '../../components/Input';
import { Button } from '../../components/Button';
import { TopAppBar } from '../../components/TopAppBar';
import { Ionicons } from '@expo/vector-icons';
import { apiPatch } from '../../utils/apiClient';
import { formatMemberSince } from '../../utils/formatters';
import * as ImagePicker from 'expo-image-picker';

interface TenantProfileScreenProps {
    navigation: any;
}

export const TenantProfileScreen: React.FC<TenantProfileScreenProps> = ({ navigation }) => {
    const { colors, spacing, typography, borderRadius, isDark, setTheme } = useTheme();
    const { user, signOut, refreshMe } = useAuth();
    const { activeLease, leaseLoading } = useLease();

    const [showSettings, setShowSettings] = useState(false);
    const [showAccountInfo, setShowAccountInfo] = useState(false);
    const [showNotifications, setShowNotifications] = useState(false);
    const [showAppearance, setShowAppearance] = useState(false);
    const [showPrivacyPolicy, setShowPrivacyPolicy] = useState(false);
    const [showTermsOfService, setShowTermsOfService] = useState(false);
    const [profileImage, setProfileImage] = useState<string | null>(user?.profileImage ?? null);

    // Settings state
    const [name, setName] = useState(user?.name || '');
    const [email, setEmail] = useState(user?.email || '');
    const [phone, setPhone] = useState(user?.phoneNumber || '');

    const initialPrefs: any = (user as any)?.notificationPrefs || {};
    const [notifyPayments, setNotifyPayments] = useState<boolean>(
        typeof initialPrefs.payments === 'boolean' ? initialPrefs.payments : true,
    );
    const [notifyMessages, setNotifyMessages] = useState<boolean>(
        typeof initialPrefs.messages === 'boolean' ? initialPrefs.messages : true,
    );
    const [notifyInvitations, setNotifyInvitations] = useState<boolean>(
        typeof initialPrefs.invitations === 'boolean' ? initialPrefs.invitations : true,
    );

    // Mock property data - will come from context
    const propertyName = activeLease?.property?.name ?? '—';
    const unitNumber = activeLease?.unit?.unitNumber ?? '—';
    const monthlyRent = typeof activeLease?.rentAmount === 'number' ? activeLease.rentAmount : 0;
    const leaseStartDate = activeLease?.startDate
        ? new Date(activeLease.startDate).toLocaleDateString('en-GB', { month: 'long', year: 'numeric' })
        : '—';

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

    if (leaseLoading) {
        return (
            <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }}>
                <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', padding: spacing.base }}>
                    <Text style={[typography.body, { color: colors.text }]}>Loading...</Text>
                </View>
            </SafeAreaView>
        );
    }
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
                    <View style={{ width: 24 }} />
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
                        <Ionicons name="home" size={14} color={colors.primary} />
                        <Text style={[typography.bodySmall, { color: colors.primary, marginLeft: spacing.xs, fontWeight: '600' }]}>
                            Tenant
                        </Text>
                    </View>

                    {/* Tenant ID */}
                    {user?.tenantId && (
                        <View style={{
                            marginTop: spacing.md,
                            backgroundColor: colors.accent + '20',
                            paddingHorizontal: spacing.lg,
                            paddingVertical: spacing.sm,
                            borderRadius: borderRadius.md,
                            borderWidth: 2,
                            borderColor: colors.accent,
                        }}>
                            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                                <Ionicons name="card" size={18} color={colors.accent} />
                                <Text style={[typography.h4, { color: colors.accent, marginLeft: spacing.sm, letterSpacing: 2 }]}>
                                    {user.tenantId}
                                </Text>
                            </View>
                        </View>
                    )}

                    {/* Email */}
                    <Text style={[typography.body, { color: colors.textSecondary, marginTop: spacing.sm }]}>
                        {user?.email}
                    </Text>
                </View>

                {/* Property Info Banner */}
                {activeLease ? (
                    <View style={{
                        backgroundColor: colors.primary + '10',
                        marginHorizontal: spacing.base,
                        padding: spacing.lg,
                        borderRadius: borderRadius.lg,
                        borderLeftWidth: 4,
                        borderLeftColor: colors.primary,
                        marginBottom: spacing.lg,
                    }}>
                        <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: spacing.sm }}>
                            <Ionicons name="business" size={20} color={colors.primary} />
                            <Text style={[typography.h4, { color: colors.primary, marginLeft: spacing.sm }]}>
                                {propertyName}
                            </Text>
                        </View>
                        <Text style={[typography.body, { color: colors.text }]}>
                            Unit {unitNumber} • Since {leaseStartDate}
                        </Text>
                        <Text style={[typography.h3, { color: colors.primary, marginTop: spacing.sm }]}>
                            UGX {monthlyRent.toLocaleString()}/month
                        </Text>
                    </View>
                ) : (
                    <View style={{
                        backgroundColor: colors.primary + '10',
                        marginHorizontal: spacing.base,
                        padding: spacing.lg,
                        borderRadius: borderRadius.lg,
                        borderLeftWidth: 4,
                        borderLeftColor: colors.primary,
                        marginBottom: spacing.lg,
                    }}>
                        <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: spacing.sm }}>
                            <Ionicons name="business" size={20} color={colors.primary} />
                            <Text style={[typography.h4, { color: colors.primary, marginLeft: spacing.sm }]}>
                                No active lease
                            </Text>
                        </View>
                        <Text style={[typography.body, { color: colors.text }]}>
                            Accept a property invitation to see your property details here.
                        </Text>
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
                                <Ionicons name="shield-checkmark" size={24} color={colors.info} />
                            </View>
                            <View style={{ flex: 1 }}>
                                <Text style={[typography.bodySmall, { color: colors.textSecondary }]}>Account Status</Text>
                                <Text style={[typography.body, { color: colors.success, fontWeight: '600' }]}>
                                    Active
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
                size="medium"
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

                    {/* Tenant ID Display */}
                    {user?.tenantId && (
                        <View style={{ marginBottom: spacing.md }}>
                            <Text style={[typography.h4, { color: colors.text, marginBottom: spacing.xs }]}>
                                Tenant ID
                            </Text>
                            <Text style={[typography.bodySmall, { color: colors.textSecondary, marginBottom: spacing.sm }]}>
                                Share this ID with your manager so they can invite you.
                            </Text>
                            <View
                                style={{
                                    flexDirection: 'row',
                                    alignItems: 'center',
                                    backgroundColor: colors.surface,
                                    borderWidth: 1,
                                    borderColor: colors.border,
                                    borderRadius: borderRadius.md,
                                    paddingHorizontal: spacing.md,
                                    paddingVertical: spacing.sm,
                                }}
                            >
                                <Text style={[typography.body, { color: colors.text, flex: 1 }]}>
                                    {user.tenantId}
                                </Text>
                                <TouchableOpacity
                                    onPress={async () => {
                                        try {
                                            // Use React Native Clipboard API
                                            if (user.tenantId) {
                                                await Clipboard.setString(user.tenantId);
                                                Alert.alert('Success', 'Copied Tenant ID to clipboard');
                                            }
                                        } catch (error) {
                                            // Fallback: show the ID in an alert
                                            Alert.alert('Tenant ID', user.tenantId || 'Not available', [
                                                { text: 'OK', style: 'default' }
                                            ]);
                                        }
                                    }}
                                    style={{
                                        padding: spacing.xs,
                                        backgroundColor: colors.primary + '20',
                                        borderRadius: borderRadius.sm,
                                    }}
                                >
                                    <Ionicons name="copy-outline" size={16} color={colors.primary} />
                                </TouchableOpacity>
                            </View>
                        </View>
                    )}

                    {/* Fallback message for missing Tenant ID */}
                    {user?.role === 'TENANT' && !user?.tenantId && (
                        <View style={{ marginBottom: spacing.md }}>
                            <Text style={[typography.h4, { color: colors.text, marginBottom: spacing.xs }]}>
                                Tenant ID
                            </Text>
                            <View style={{
                                backgroundColor: colors.warning + '20',
                                borderWidth: 1,
                                borderColor: colors.warning,
                                borderRadius: borderRadius.md,
                                padding: spacing.md,
                            }}>
                                <Text style={[typography.body, { color: colors.warning }]}>
                                    Tenant ID not available yet. Please sign out and sign in again.
                                </Text>
                            </View>
                        </View>
                    )}

                    <Button
                        title="Save Changes"
                        onPress={async () => {
                            try {
                                const payload: any = {
                                    name: name.trim(),
                                    phoneNumber: phone.trim() || null,
                                    profileImageUrl: profileImage,
                                };

                                const { status, json } = await apiPatch('/users/me', payload);
                                const response: any = json;

                                if (status >= 200 && status < 300 && response && response.success !== false) {
                                    await refreshMe();
                                    Alert.alert('Success', 'Account information updated');
                                    setShowAccountInfo(false);
                                } else {
                                    Alert.alert('Error', response?.message || 'Failed to update account information');
                                }
                            } catch (error: any) {
                                Alert.alert('Error', error?.message || 'Failed to update account information');
                            }
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
                onClose={async () => {
                    try {
                        const prefs = {
                            payments: notifyPayments,
                            messages: notifyMessages,
                            invitations: notifyInvitations,
                        };
                        const { status, json } = await apiPatch('/users/me', { notificationPrefs: prefs });
                        const response: any = json;
                        if (status >= 200 && status < 300 && response && response.success !== false) {
                            await refreshMe();
                        }
                    } catch {
                        // best-effort; ignore
                    } finally {
                        setShowNotifications(false);
                    }
                }}
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
                        value={notifyInvitations}
                        onToggle={setNotifyInvitations}
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

            {/* Legal Document Viewers */}
            <LegalDocumentViewer
                visible={showPrivacyPolicy}
                onClose={() => setShowPrivacyPolicy(false)}
                title="Privacy Policy"
                url="https://estatenet.app/privacy-policy"
            />
            <LegalDocumentViewer
                visible={showTermsOfService}
                onClose={() => setShowTermsOfService(false)}
                title="Terms of Service"
                url="https://estatenet.app/terms-of-service"
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
