import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
  Modal,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '../../theme/ThemeContext';
import { useOwnerApi } from '../../hooks/useOwnerApi';
import { Ionicons } from '@expo/vector-icons';
import { Button } from '../../components/Button';

export const OwnerInvitationsScreen: React.FC<any> = ({ navigation, route }) => {
  const { colors, spacing, typography, shadows } = useTheme();
  const { invitations, properties, createInvitation, cancelInvitation, loading } = useOwnerApi();
  const [showModal, setShowModal] = useState(route?.params?.openModal || false);
  const [selectedProperty, setSelectedProperty] = useState('');
  const [managerEmail, setManagerEmail] = useState('');
  const [sending, setSending] = useState(false);

  // Check if pending filter is passed from route params
  const pendingFilter = route?.params?.filter === 'pending';

  // Filter invitations if pendingFilter is active
  const displayedInvitations = pendingFilter
    ? invitations.filter((inv: any) => inv.status === 'PENDING')
    : invitations;

  const handleSendInvitation = async () => {
    if (!selectedProperty || !managerEmail) {
      Alert.alert('Error', 'Please select a property and enter manager email');
      return;
    }

    setSending(true);
    const result = await createInvitation(selectedProperty, managerEmail);
    setSending(false);

    if (result.success) {
      Alert.alert('Success', 'Invitation sent successfully');
      setShowModal(false);
      setSelectedProperty('');
      setManagerEmail('');
    } else {
      Alert.alert('Error', result.message || 'Failed to send invitation');
    }
  };

  const handleCancel = (invitationId: string) => {
    Alert.alert('Cancel Invitation', 'Are you sure you want to cancel this invitation?', [
      { text: 'No', style: 'cancel' },
      {
        text: 'Yes',
        style: 'destructive',
        onPress: async () => {
          const result = await cancelInvitation(invitationId);
          if (result.success) {
            Alert.alert('Success', 'Invitation cancelled');
          } else {
            Alert.alert('Error', result.message || 'Failed to cancel invitation');
          }
        },
      },
    ]);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'PENDING':
        return colors.warning;
      case 'ACCEPTED':
        return colors.success;
      case 'DECLINED':
        return colors.error;
      default:
        return colors.textSecondary;
    }
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }}>
      <View style={[styles.header, { padding: spacing.lg }]}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={{ padding: 8 }}>
          <Ionicons name="arrow-back" size={24} color={colors.text} />
        </TouchableOpacity>
        <View style={{ flex: 1, marginLeft: spacing.md }}>
          <Text style={[typography.h2, { color: colors.text }]}>
            {pendingFilter ? 'Pending Invitations' : 'Manager Invitations'}
          </Text>
          <Text style={[typography.body, { color: colors.textSecondary }]}>
            {displayedInvitations.length} {displayedInvitations.length === 1 ? 'invitation' : 'invitations'}
          </Text>
        </View>
        <TouchableOpacity
          onPress={() => setShowModal(true)}
          style={[styles.addButton, { backgroundColor: colors.primary }]}
        >
          <Ionicons name="add" size={24} color="#FFFFFF" />
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={{ padding: spacing.lg, paddingTop: 0 }}>
        {loading ? (
          <Text style={[typography.body, { color: colors.textSecondary, textAlign: 'center' }]}>
            Loading invitations...
          </Text>
        ) : displayedInvitations.length === 0 ? (
          <View
            style={[
              styles.emptyState,
              {
                backgroundColor: colors.surface,
                padding: spacing.xl,
                borderRadius: 12,
                alignItems: 'center',
              },
            ]}
          >
            <Ionicons name="mail-outline" size={64} color={colors.textSecondary} />
            <Text style={[typography.h3, { color: colors.text, marginTop: spacing.md }]}>
              No Invitations Yet
            </Text>
            <Text
              style={[
                typography.body,
                { color: colors.textSecondary, textAlign: 'center', marginTop: spacing.sm },
              ]}
            >
              Tap the + button to invite a property manager
            </Text>
          </View>
        ) : (
          displayedInvitations.map((invitation: any) => (
            <View
              key={invitation.id}
              style={[
                styles.invitationCard,
                {
                  backgroundColor: colors.surface,
                  padding: spacing.lg,
                  marginBottom: spacing.md,
                  borderRadius: 12,
                  ...shadows.sm,
                },
              ]}
            >
              <View style={styles.invitationHeader}>
                <View style={styles.invitationInfo}>
                  <Text style={[typography.h3, { color: colors.text }]}>
                    {invitation.property?.name || 'Unknown Property'}
                  </Text>
                  <Text style={[typography.bodySmall, { color: colors.textSecondary }]}>
                    {invitation.managerEmail}
                  </Text>
                </View>
                <View
                  style={[
                    styles.statusBadge,
                    { backgroundColor: getStatusColor(invitation.status) + '20' },
                  ]}
                >
                  <Text
                    style={[
                      typography.bodySmall,
                      { color: getStatusColor(invitation.status), fontWeight: '600' },
                    ]}
                  >
                    {invitation.status}
                  </Text>
                </View>
              </View>

              {invitation.status === 'PENDING' && (
                <TouchableOpacity
                  onPress={() => handleCancel(invitation.id)}
                  style={[styles.cancelButton, { marginTop: spacing.md }]}
                >
                  <Ionicons name="close-circle" size={20} color={colors.error} />
                  <Text
                    style={[
                      typography.bodySmall,
                      { color: colors.error, marginLeft: spacing.sm },
                    ]}
                  >
                    Cancel Invitation
                  </Text>
                </TouchableOpacity>
              )}
            </View>
          ))
        )}
      </ScrollView>

      {/* New Invitation Modal */}
      <Modal visible={showModal} animationType="slide" transparent>
        <View style={[styles.modalOverlay, { backgroundColor: 'rgba(0,0,0,0.5)' }]}>
          <View
            style={[
              styles.modalContent,
              {
                backgroundColor: colors.background,
                margin: spacing.lg,
                borderRadius: 16,
                padding: spacing.lg,
              },
            ]}
          >
            <Text style={[typography.h2, { color: colors.text, marginBottom: spacing.lg }]}>
              Invite Manager
            </Text>

            <Text style={[typography.body, { color: colors.textSecondary, marginBottom: spacing.md }]}>
              Select Property:
            </Text>
            {properties.map((property: any) => (
              <TouchableOpacity
                key={property.id}
                onPress={() => setSelectedProperty(property.id)}
                style={[
                  styles.propertyOption,
                  {
                    backgroundColor:
                      selectedProperty === property.id ? colors.primary + '20' : colors.surface,
                    padding: spacing.md,
                    borderRadius: 8,
                    marginBottom: spacing.sm,
                    borderWidth: 2,
                    borderColor:
                      selectedProperty === property.id ? colors.primary : 'transparent',
                  },
                ]}
              >
                <Text style={[typography.body, { color: colors.text }]}>{property.name}</Text>
              </TouchableOpacity>
            ))}

            <TextInput
              style={[
                styles.input,
                {
                  backgroundColor: colors.surface,
                  color: colors.text,
                  padding: spacing.md,
                  borderRadius: 8,
                  marginTop: spacing.lg,
                  marginBottom: spacing.md,
                },
              ]}
              placeholder="Manager Email"
              placeholderTextColor={colors.textSecondary}
              value={managerEmail}
              onChangeText={setManagerEmail}
              keyboardType="email-address"
              autoCapitalize="none"
            />

            <Button
              title={sending ? 'Sending...' : 'Send Invitation'}
              onPress={handleSendInvitation}
              loading={sending}
              style={{ marginBottom: spacing.md }}
            />

            <Button title="Cancel" onPress={() => setShowModal(false)} variant="ghost" />
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  addButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyState: {},
  invitationCard: {},
  invitationHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  invitationInfo: {
    flex: 1,
  },
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
  },
  cancelButton: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  modalOverlay: {
    flex: 1,
    justifyContent: 'center',
  },
  modalContent: {},
  propertyOption: {},
  input: {},
});
