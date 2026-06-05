import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  Image,
  Alert,
  Switch,
  Platform,
  TextInput,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '../../theme/ThemeContext';
import { useAuth } from '../../context/AuthContext';
import { useOwnerApi } from '../../hooks/useOwnerApi';
import { apiPatch, apiDelete } from '../../utils/apiClient';
import { formatMemberSince } from '../../utils/formatters';
import { Card } from '../../components/Card';
import { Modal } from '../../components/Modal';
import { LegalDocumentViewer } from '../../components/LegalDocumentViewer';
import { Input } from '../../components/Input';
import { Button } from '../../components/Button';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';

interface OwnerProfileScreenProps {
  navigation: any;
}

export const OwnerProfileScreen: React.FC<OwnerProfileScreenProps> = ({ navigation }) => {
  const { colors, spacing, typography, borderRadius, shadows, isDark, setTheme } = useTheme();
  const { user, signOut, refreshMe } = useAuth();
  const { properties, managers, invitations } = useOwnerApi();

  // Calculate total units
  const totalUnits = properties.reduce((sum: number, property: any) => {
    return sum + (property.units?.length || 0);
  }, 0);

  const [showSettings, setShowSettings] = useState(false);
  const [showAccountInfo, setShowAccountInfo] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const [showAppearance, setShowAppearance] = useState(false);
  const [showAboutModal, setShowAboutModal] = useState(false);
  const [showPrivacyPolicy, setShowPrivacyPolicy] = useState(false);
  const [showTermsOfService, setShowTermsOfService] = useState(false);
  const [showDeleteAccount, setShowDeleteAccount] = useState(false);
  const [deleteConfirmation, setDeleteConfirmation] = useState('');
  const [deleting, setDeleting] = useState(false);
  const [profileImage, setProfileImage] = useState<string | null>(user?.profileImage || null);

  // Settings state
  const [name, setName] = useState(user?.name || '');
  const [email, setEmail] = useState(user?.email || '');
  const [phone, setPhone] = useState(user?.phoneNumber || '');
  const [notifyPayments, setNotifyPayments] = useState(true);
  const [notifyMessages, setNotifyMessages] = useState(true);
  const [notifyInvitations, setNotifyInvitations] = useState(true);
  const [savingNotifications, setSavingNotifications] = useState(false);

  // Sync notification state with user data when it changes
  useEffect(() => {
    const prefs = (user as any)?.notificationPrefs || {};
    setNotifyPayments(prefs.payments ?? true);
    setNotifyMessages(prefs.messages ?? true);
    setNotifyInvitations(prefs.invitations ?? true);
  }, [user]);

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
      const imageUri = result.assets[0].uri;
      setProfileImage(imageUri);
      // Also update on backend
      const updateResult = await apiPatch('/users/me', { profileImageUrl: imageUri });
      if (updateResult.json?.success) {
        await refreshMe();
      }
    }
  };

  // Stats for owner
  const stats = [
    { label: 'Properties', value: properties.length.toString() },
    { label: 'Managers', value: managers.length.toString() },
    { label: 'Pending Invites', value: invitations.filter((i: any) => i.status === 'PENDING').length.toString() },
  ];

  const handleSaveProfile = async () => {
    if (!phone.trim()) {
      Alert.alert('Validation Error', 'Phone number is required');
      return;
    }
    const result = await apiPatch('/users/me', {
      name,
      phoneNumber: phone,
      // Note: email changes may require verification; skipping for safety
    });
    if (result.json?.success) {
      await refreshMe();
      Alert.alert('Success', 'Profile updated successfully');
      setShowAccountInfo(false);
    } else {
      Alert.alert('Error', result.json?.message || 'Failed to update profile');
    }
  };

  const handleSaveNotifications = async () => {
    console.log('🔴 STARTING handleSaveNotifications');
    try {
      console.log('🟡 About to call apiPatch with data:', {
        notificationPrefs: {
          payments: notifyPayments,
          messages: notifyMessages,
          invitations: notifyInvitations,
        }
      });

      const result = await apiPatch('/users/me', {
        notificationPrefs: {
          payments: notifyPayments,
          messages: notifyMessages,
          invitations: notifyInvitations,
        },
      });

      console.log('🟢 apiPatch result:', JSON.stringify(result, null, 2));

      if (!result) {
        throw new Error('API returned null/undefined');
      }

      if (result.status !== 200) {
        throw new Error(`HTTP ${result.status}: ${JSON.stringify(result.json)}`);
      }

      if (!result.json?.success) {
        throw new Error(result.json?.message || 'Backend returned success: false');
      }

      console.log('✅ Backend saved successfully:', result.json.data.user.notificationPrefs);

      await refreshMe();

      console.log('✅ refreshMe completed');

      // Show success modal
      Alert.alert('All Changes Saved', 'Notification preferences updated successfully');
      setShowNotifications(false);
    } catch (err) {
      console.error('❌ handleSaveNotifications ERROR:', err);
      Alert.alert('Save Failed', err instanceof Error ? err.message : 'Unknown error occurred');
      throw err;
    }
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
          paddingHorizontal: spacing.lg,
          paddingTop: spacing.md,
          paddingBottom: spacing.sm,
        }}>
          <View style={{ width: 24 }} />
          <Text style={[typography.h3, { color: colors.text }]}>Profile</Text>
          <TouchableOpacity onPress={() => setShowSettings(true)}>
            <Ionicons name="settings-outline" size={24} color={colors.text} />
          </TouchableOpacity>
        </View>

        {/* Profile Hero */}
        <View style={{ alignItems: 'center', paddingVertical: spacing.lg, paddingHorizontal: spacing.lg }}>
          <TouchableOpacity onPress={pickImage} activeOpacity={0.8}>
            <View style={{
              width: 100,
              height: 100,
              borderRadius: 50,
              borderWidth: 3,
              borderColor: colors.primary,
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
                  <Ionicons name="person" size={50} color={colors.primary} />
                </View>
              )}
            </View>
            <View style={{
              position: 'absolute',
              bottom: 0,
              right: 0,
              backgroundColor: colors.primary,
              width: 32,
              height: 32,
              borderRadius: 16,
              alignItems: 'center',
              justifyContent: 'center',
              borderWidth: 3,
              borderColor: colors.background,
            }}>
              <Ionicons name="camera" size={16} color="#FFFFFF" />
            </View>
          </TouchableOpacity>

          <Text style={[typography.h2, { color: colors.text, marginTop: spacing.md }]}>
            {user?.name}
          </Text>
          <Text style={[typography.body, { color: colors.textSecondary, marginTop: spacing.xs }]}>
            {user?.email}
          </Text>
          <View style={{
            flexDirection: 'row',
            alignItems: 'center',
            marginTop: spacing.sm,
            backgroundColor: colors.primary + '15',
            paddingHorizontal: spacing.md,
            paddingVertical: spacing.xs,
            borderRadius: borderRadius.full,
          }}>
            <Ionicons name="home" size={14} color={colors.primary} />
            <Text style={[typography.bodySmall, { color: colors.primary, marginLeft: spacing.xs, fontWeight: '600' }]}>
              Property Owner
            </Text>
          </View>
        </View>

        {/* Stats Row */}
        <View style={{
          flexDirection: 'row',
          justifyContent: 'space-around',
          paddingVertical: spacing.md,
          marginHorizontal: spacing.lg,
          marginBottom: spacing.md,
          backgroundColor: colors.surface,
          borderRadius: borderRadius.lg,
          ...shadows.sm,
        }}>
          {stats.map((stat, index) => (
            <View key={index} style={{ alignItems: 'center' }}>
              <Text style={[typography.h2, { color: colors.primary }]}>{stat.value}</Text>
              <Text style={[typography.bodySmall, { color: colors.textSecondary, marginTop: 4 }]}>
                {stat.label}
              </Text>
            </View>
          ))}
        </View>

        {/* Quick Info Cards */}
        <View style={{ padding: spacing.lg }}>
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
        <SettingItem
          icon="information-circle-outline"
          label="About EstateNet"
          onPress={() => {
            setShowSettings(false);
            setTimeout(() => setShowAboutModal(true), 300);
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
        <View style={{ height: 1, backgroundColor: colors.border, marginVertical: spacing.md }} />
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
            onPress={handleSaveProfile}
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
            label="Invitations"
            description="Get notified about manager invitations"
            value={notifyInvitations}
            onToggle={setNotifyInvitations}
            colors={colors}
            spacing={spacing}
            typography={typography}
          />
          <Button
            title={savingNotifications ? 'Saving...' : 'Save Changes'}
            onPress={async () => {
              try {
                console.log('BUTTON PRESSED');
                setSavingNotifications(true);
                await handleSaveNotifications();
              } catch (err) {
                console.error('Save error:', err);
                Alert.alert('Error', err instanceof Error ? err.message : 'Save failed');
              } finally {
                setSavingNotifications(false);
              }
            }}
            variant="primary"
            size="large"
            style={{ marginTop: spacing.lg }}
            loading={savingNotifications}
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
        </View>
      </Modal>

      {/* About Modal */}
      <Modal
        visible={showAboutModal}
        onClose={() => setShowAboutModal(false)}
        title="About EstateNet"
        size="medium"
      >
        <View style={{ alignItems: 'center', paddingVertical: spacing.lg }}>
          <View style={{
            width: 80,
            height: 80,
            borderRadius: 20,
            backgroundColor: colors.primary,
            alignItems: 'center',
            justifyContent: 'center',
            marginBottom: spacing.md,
          }}>
            <Ionicons name="home" size={40} color="#FFFFFF" />
          </View>
          <Text style={[typography.h3, { color: colors.text }]}>EstateNet</Text>
          <Text style={[typography.body, { color: colors.textSecondary, marginTop: spacing.xs }]}>
            Version 1.0.0
          </Text>
          <Text style={[typography.bodySmall, { color: colors.textSecondary, textAlign: 'center', marginTop: spacing.lg }]}>
            Property management made simple for owners, managers, and tenants.
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
                  Your account, profile, properties, managers, lease history,
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

// Helper components
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
    <Text style={[typography.body, { color: colors.text, marginLeft: spacing.md, flex: 1 }]}>
      {label}
    </Text>
    <Ionicons name="chevron-forward" size={20} color={colors.textSecondary} />
  </TouchableOpacity>
);

const NotificationToggle = ({ label, description, value, onToggle, colors, spacing, typography }: any) => (
  <View style={{
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  }}>
    <View style={{ flex: 1 }}>
      <Text style={[typography.body, { color: colors.text }]}>{label}</Text>
      <Text style={[typography.bodySmall, { color: colors.textSecondary }]}>{description}</Text>
    </View>
    <Switch
      value={value}
      onValueChange={onToggle}
      trackColor={{ false: colors.border, true: colors.primary }}
      thumbColor="#FFFFFF"
    />
  </View>
);

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});
