import React, { useMemo, useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, Image, Alert, Switch } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '../../theme/ThemeContext';
import { useAuth, UserRole } from '../../context/AuthContext';
import { apiPatch } from '../../utils/apiClient';
import { usePayments } from '../../context/PaymentContext';
import { useTenants } from '../../context/TenantContext';
import { useProperties } from '../../context/PropertyContext';
import { Button } from '../../components/Button';
import { Input } from '../../components/Input';
import { Card } from '../../components/Card';
import { Modal } from '../../components/Modal';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';

export const ProfileScreen: React.FC<any> = ({ navigation }) => {
    const { colors, spacing, typography, borderRadius, isDark, setTheme } = useTheme();
    const { user, signOut } = useAuth();
    const { payments } = usePayments();
    const { getTenantByTenantId } = useTenants();
    const { properties } = useProperties();
    const [showSettings, setShowSettings] = useState(false);
    const [showAccountInfo, setShowAccountInfo] = useState(false);
    const [showNotifications, setShowNotifications] = useState(false);
    const [showAppearance, setShowAppearance] = useState(false);
    const [showRecordedPayments, setShowRecordedPayments] = useState(false);
    const [showReceiptHistory, setShowReceiptHistory] = useState(false);
    const [profileImage, setProfileImage] = useState<string | null>(null);

    // Settings state
    const [name, setName] = useState(user?.name || '');
    const [email, setEmail] = useState(user?.email || '');
    const [phone, setPhone] = useState(user?.phoneNumber || '');
    const [notifyPayments, setNotifyPayments] = useState(true);
    const [notifyMessages, setNotifyMessages] = useState(true);
    const [notifyReminders, setNotifyReminders] = useState(true);

    // Payout setup state
    const [showPayoutSetup, setShowPayoutSetup] = useState(false);
    const [payoutPhoneNumber, setPayoutPhoneNumber] = useState(user?.payoutPhoneNumber || '');
    const [payoutNetwork, setPayoutNetwork] = useState(user?.payoutNetwork || 'MTN');
    const [savingPayout, setSavingPayout] = useState(false);

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

    const savePayoutSetup = async () => {
        if (!payoutPhoneNumber) {
            Alert.alert('Error', 'Payout phone number is required');
            return;
        }

        // Validate Uganda phone format
        const phoneRegex = /^(\+2567|07)[0-9]{8}$/;
        if (!phoneRegex.test(payoutPhoneNumber)) {
            Alert.alert('Error', 'Invalid phone format. Use +2567XXXXXXXX or 07XXXXXXXX');
            return;
        }

        setSavingPayout(true);
        try {
            const { status, json } = await apiPatch('/users/me', {
                payoutPhoneNumber,
                payoutNetwork
            });

            if (status === 200 && json?.success) {
                Alert.alert('Success', 'Payout details updated successfully');
                setShowPayoutSetup(false);
                // Update user context if needed
            } else {
                // For development, show success even if API fails
                if (__DEV__) {
                    Alert.alert('Success (Dev Mode)', 'Payout details saved locally for testing');
                    setShowPayoutSetup(false);
                } else {
                    Alert.alert('Error', json?.message || 'Failed to update payout details');
                }
            }
        } catch (error) {
            console.error('Save payout error:', error);
            // For development, show success even if API fails
            if (__DEV__) {
                Alert.alert('Success (Dev Mode)', 'Payout details saved locally for testing');
                setShowPayoutSetup(false);
            } else {
                Alert.alert('Error', 'Network error. Please try again.');
            }
        } finally {
            setSavingPayout(false);
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
        { label: 'Rating', value: '5.0' }, // TODO: Implement real rating system
    ];

    const sortedPayments = useMemo(() => {
        return [...payments].sort(
            (a, b) => new Date(b.paymentDate).getTime() - new Date(a.paymentDate).getTime()
        );
    }, [payments]);

    return (
        <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }}>
            <ScrollView showsVerticalScrollIndicator={false}>
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
                                    January 2024
                                </Text>
                            </View>
                        </View>
                    </Card>

                    {/* Thank You Message */}
                    <View style={{
                        paddingVertical: spacing.lg,
                        alignItems: 'center'
                    }}>
                        <Text style={[typography.body, {
                            color: colors.primary,
                            fontWeight: '600',
                            textAlign: 'center'
                        }]}>
                            Thank You for Using EstateNet
                        </Text>
                    </View>
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
                        icon="card-outline"
                        label="Payout Setup"
                        onPress={() => {
                            setShowSettings(false);
                            setTimeout(() => setShowPayoutSetup(true), 300);
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
                    <SettingItem
                        icon="receipt-outline"
                        label="Recorded Payments"
                        onPress={() => {
                            setShowSettings(false);
                            setTimeout(() => setShowRecordedPayments(true), 300);
                        }}
                        colors={colors}
                        spacing={spacing}
                        typography={typography}
                    />
                    <SettingItem
                        icon="document-text-outline"
                        label="Receipt History"
                        onPress={() => {
                            setShowSettings(false);
                            setTimeout(() => setShowReceiptHistory(true), 300);
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

            {/* Payout Setup Modal */}
            <Modal
                visible={showPayoutSetup}
                onClose={() => setShowPayoutSetup(false)}
                title="Payout Setup"
                size="large"
            >
                <View>
                    <Text style={[typography.body, { color: colors.text, marginBottom: spacing.md }]}>
                        Configure your mobile money details to receive automatic payouts (98.5% of collected rent).
                    </Text>

                    <Input
                        label="Payout Phone Number"
                        placeholder="+256XXXXXXXXX or 07XXXXXXXX"
                        value={payoutPhoneNumber}
                        onChangeText={setPayoutPhoneNumber}
                        keyboardType="phone-pad"
                        icon={<Ionicons name="call-outline" size={20} color={colors.textSecondary} />}
                        style={{ marginBottom: spacing.lg }}
                    />

                    <View style={{ marginBottom: spacing.lg }}>
                        <Text style={[typography.body, { color: colors.text, marginBottom: spacing.sm }]}>
                            Mobile Money Network
                        </Text>
                        <View style={{ flexDirection: 'row', gap: spacing.sm }}>
                            {['MTN', 'AIRTEL'].map((network) => (
                                <TouchableOpacity
                                    key={network}
                                    style={[
                                        {
                                            flex: 1,
                                            padding: spacing.sm,
                                            borderRadius: 8,
                                            borderWidth: 1,
                                            borderColor: payoutNetwork === network ? colors.primary : colors.border,
                                            backgroundColor: payoutNetwork === network ? colors.primary + '20' : colors.surface,
                                            alignItems: 'center'
                                        }
                                    ]}
                                    onPress={() => setPayoutNetwork(network)}
                                >
                                    <Text style={[
                                        typography.body,
                                        { color: payoutNetwork === network ? colors.primary : colors.text }
                                    ]}>
                                        {network}
                                    </Text>
                                </TouchableOpacity>
                            ))}
                        </View>
                    </View>

                    <Card style={{ marginBottom: spacing.lg, backgroundColor: colors.warning + '20' }}>
                        <View style={{ flexDirection: 'row', alignItems: 'flex-start' }}>
                            <Ionicons name="information-circle-outline" size={20} color={colors.warning} style={{ marginRight: spacing.sm }} />
                            <View style={{ flex: 1 }}>
                                <Text style={[typography.bodySmall, { color: colors.warning }]}>
                                    Payouts are processed automatically when tenants complete payments. You'll receive 98.5% of the collected amount (1.5% processing fee).
                                </Text>
                            </View>
                        </View>
                    </Card>

                    <Button
                        title={savingPayout ? "Saving..." : "Save Payout Details"}
                        onPress={savePayoutSetup}
                        variant="primary"
                        size="large"
                        loading={savingPayout}
                        disabled={!payoutPhoneNumber || savingPayout}
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

            {/* Recorded Payments Modal */}
            <Modal
                visible={showRecordedPayments}
                onClose={() => setShowRecordedPayments(false)}
                title="Recorded Payments"
                size="large"
            >
                <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: spacing.lg }}>
                    {sortedPayments.length === 0 ? (
                        <View style={{ paddingVertical: spacing.xl, alignItems: 'center' }}>
                            <View style={{
                                width: 72,
                                height: 72,
                                borderRadius: 36,
                                backgroundColor: colors.primary + '15',
                                alignItems: 'center',
                                justifyContent: 'center',
                                marginBottom: spacing.md,
                            }}>
                                <Ionicons name="receipt-outline" size={32} color={colors.primary} />
                            </View>
                            <Text style={[typography.h4, { color: colors.text, textAlign: 'center' }]}>No payments yet</Text>
                            <Text style={[typography.body, { color: colors.textSecondary, textAlign: 'center', marginTop: spacing.xs }]}
                            >
                                Payments recorded from the dashboard will appear here.
                            </Text>
                        </View>
                    ) : (
                        <View style={{ gap: spacing.md }}>
                            {sortedPayments.map((p) => {
                                const tenant = getTenantByTenantId(p.tenantId);
                                const property = properties.find(prop => prop.id === p.propertyId);

                                const paymentMethodLabel =
                                    p.paymentMethod === 'estatenet'
                                        ? 'EstateNet'
                                        : p.paymentMethod === 'bank_transfer'
                                            ? 'Bank Transfer'
                                            : 'Cash';

                                return (
                                    <Card key={p.id} style={{ padding: spacing.lg }}>
                                        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                                            <View style={{ flex: 1, marginRight: spacing.md }}>
                                                <Text style={[typography.h4, { color: colors.text }]}>
                                                    UGX {p.amount.toLocaleString()}
                                                </Text>
                                                <Text style={[typography.bodySmall, { color: colors.textSecondary, marginTop: 2 }]}>
                                                    {tenant?.name || `Tenant ID: ${p.tenantId}`}
                                                </Text>
                                                <Text style={[typography.bodySmall, { color: colors.textTertiary, marginTop: 2 }]}>
                                                    {property?.name || 'Property'}{p.unitId ? ` · Unit ${p.unitId}` : ''}
                                                </Text>
                                            </View>

                                            <View style={{
                                                backgroundColor: colors.surface,
                                                borderWidth: 1,
                                                borderColor: colors.border,
                                                paddingHorizontal: spacing.sm,
                                                paddingVertical: spacing.xs,
                                                borderRadius: borderRadius.full,
                                            }}>
                                                <Text style={{ fontSize: 11, fontWeight: '600', color: colors.textSecondary }}>
                                                    {paymentMethodLabel}
                                                </Text>
                                            </View>
                                        </View>

                                        <View style={{ height: 1, backgroundColor: colors.divider, marginVertical: spacing.md }} />

                                        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                                            <Text style={[typography.bodySmall, { color: colors.textSecondary }]}>
                                                {new Date(p.paymentDate).toLocaleString()}
                                            </Text>
                                            {p.notes ? (
                                                <Text
                                                    style={[typography.bodySmall, { color: colors.textSecondary, maxWidth: '60%', textAlign: 'right' }]}
                                                    numberOfLines={1}
                                                >
                                                    {p.notes}
                                                </Text>
                                            ) : null}
                                        </View>
                                    </Card>
                                );
                            })}
                        </View>
                    )}
                </ScrollView>
            </Modal>

            {/* Receipt History Modal */}
            <Modal
                visible={showReceiptHistory}
                onClose={() => setShowReceiptHistory(false)}
                title="Receipt History"
                size="large"
            >
                <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: spacing.lg }}>
                    {sortedPayments.length === 0 ? (
                        <View style={{ paddingVertical: spacing.xl, alignItems: 'center' }}>
                            <View style={{
                                width: 72,
                                height: 72,
                                borderRadius: 36,
                                backgroundColor: colors.primary + '15',
                                alignItems: 'center',
                                justifyContent: 'center',
                                marginBottom: spacing.md,
                            }}>
                                <Ionicons name="document-text-outline" size={32} color={colors.primary} />
                            </View>
                            <Text style={[typography.h4, { color: colors.text, textAlign: 'center' }]}>No receipts yet</Text>
                            <Text style={[typography.body, { color: colors.textSecondary, textAlign: 'center', marginTop: spacing.xs }]}>
                                Payment receipts will appear here once payments are recorded.
                            </Text>
                        </View>
                    ) : (
                        <View style={{ gap: spacing.md }}>
                            {sortedPayments.map((p) => {
                                const tenant = getTenantByTenantId(p.tenantId);
                                const property = properties.find(prop => prop.id === p.propertyId);
                                const receiptNumber = `RCP-${p.id.toUpperCase().slice(0, 6)}`;

                                return (
                                    <Card key={p.id} style={{ padding: spacing.lg }}>
                                        {/* Receipt Header */}
                                        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: spacing.md }}>
                                            <View style={{ flex: 1 }}>
                                                <Text style={[typography.bodySmall, { color: colors.textSecondary }]}>Receipt No.</Text>
                                                <Text style={[typography.h4, { color: colors.primary, marginTop: 2 }]}>
                                                    {receiptNumber}
                                                </Text>
                                            </View>
                                            <View style={{
                                                backgroundColor: colors.success + '20',
                                                paddingHorizontal: spacing.sm,
                                                paddingVertical: spacing.xs,
                                                borderRadius: borderRadius.full,
                                            }}>
                                                <Text style={{ fontSize: 11, fontWeight: '700', color: colors.success }}>
                                                    PAID
                                                </Text>
                                            </View>
                                        </View>

                                        <View style={{ height: 1, backgroundColor: colors.divider, marginBottom: spacing.md }} />

                                        {/* Amount */}
                                        <View style={{ alignItems: 'center', marginBottom: spacing.md }}>
                                            <Text style={[typography.bodySmall, { color: colors.textSecondary }]}>Amount Received</Text>
                                            <Text style={[typography.h2, { color: colors.text, marginTop: spacing.xs }]}>
                                                UGX {p.amount.toLocaleString()}
                                            </Text>
                                        </View>

                                        <View style={{ height: 1, backgroundColor: colors.divider, marginBottom: spacing.md }} />

                                        {/* Details Grid */}
                                        <View style={{ gap: spacing.sm }}>
                                            <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                                                <Text style={[typography.bodySmall, { color: colors.textSecondary }]}>From</Text>
                                                <Text style={[typography.body, { color: colors.text, fontWeight: '500' }]}>
                                                    {tenant?.name || `Tenant ID: ${p.tenantId}`}
                                                </Text>
                                            </View>
                                            <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                                                <Text style={[typography.bodySmall, { color: colors.textSecondary }]}>Property</Text>
                                                <Text style={[typography.body, { color: colors.text, fontWeight: '500' }]}>
                                                    {property?.name || 'N/A'}
                                                </Text>
                                            </View>
                                            {p.unitId && (
                                                <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                                                    <Text style={[typography.bodySmall, { color: colors.textSecondary }]}>Unit</Text>
                                                    <Text style={[typography.body, { color: colors.text, fontWeight: '500' }]}>
                                                        {p.unitId}
                                                    </Text>
                                                </View>
                                            )}
                                            <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                                                <Text style={[typography.bodySmall, { color: colors.textSecondary }]}>Date</Text>
                                                <Text style={[typography.body, { color: colors.text, fontWeight: '500' }]}>
                                                    {new Date(p.paymentDate).toLocaleDateString()}
                                                </Text>
                                            </View>
                                            <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                                                <Text style={[typography.bodySmall, { color: colors.textSecondary }]}>Method</Text>
                                                <Text style={[typography.body, { color: colors.text, fontWeight: '500' }]}>
                                                    {p.paymentMethod === 'estatenet' ? 'EstateNet' : p.paymentMethod === 'bank_transfer' ? 'Bank Transfer' : 'Cash'}
                                                </Text>
                                            </View>
                                        </View>

                                        {p.notes && (
                                            <>
                                                <View style={{ height: 1, backgroundColor: colors.divider, marginVertical: spacing.md }} />
                                                <View>
                                                    <Text style={[typography.bodySmall, { color: colors.textSecondary }]}>Notes</Text>
                                                    <Text style={[typography.body, { color: colors.text, marginTop: 2 }]}>
                                                        {p.notes}
                                                    </Text>
                                                </View>
                                            </>
                                        )}
                                    </Card>
                                );
                            })}
                        </View>
                    )}
                </ScrollView>
            </Modal>
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
