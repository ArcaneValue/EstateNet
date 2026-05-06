import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { Modal } from './Modal';
import { useTheme } from '../theme/ThemeContext';
import { Ionicons } from '@expo/vector-icons';

interface LeaseDisclaimerModalProps {
  visible: boolean;
  onAccept: () => void;
  onDecline: () => void;
}

export const LeaseDisclaimerModal: React.FC<LeaseDisclaimerModalProps> = ({
  visible,
  onAccept,
  onDecline,
}) => {
  const { colors, typography, spacing } = useTheme();

  return (
    <Modal visible={visible} onClose={onDecline} title="Lease Agreement Disclaimer">
      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        <View style={[styles.warningBox, { backgroundColor: colors.warning + '20', borderColor: colors.warning }]}>
          <Ionicons name="warning" size={24} color={colors.warning} />
          <Text style={[typography.body, { color: colors.warning, marginLeft: spacing.sm, flex: 1 }]}>
            Legal Notice: Please read carefully before creating a lease
          </Text>
        </View>

        <Text style={[typography.h3, { color: colors.text, marginTop: spacing.lg, marginBottom: spacing.md }]}>
          Lease Agreement Disclaimer
        </Text>

        <Text style={[typography.body, { color: colors.text, marginBottom: spacing.md, lineHeight: 22 }]}>
          EstateNet provides tools to create and manage lease agreements digitally. 
          <Text style={{ fontWeight: 'bold' }}> Users are solely responsible for ensuring lease terms comply with local laws and regulations.</Text>
        </Text>

        <Text style={[typography.body, { color: colors.text, marginBottom: spacing.md, lineHeight: 22 }]}>
          EstateNet does not provide legal advice and is not liable for:
        </Text>

        <View style={styles.listContainer}>
          <View style={styles.listItem}>
            <Text style={[typography.body, { color: colors.text }]}>• Lease disputes between parties</Text>
          </View>
          <View style={styles.listItem}>
            <Text style={[typography.body, { color: colors.text }]}>• Non-compliance with local rental laws</Text>
          </View>
          <View style={styles.listItem}>
            <Text style={[typography.body, { color: colors.text }]}>• Eviction processes or procedures</Text>
          </View>
          <View style={styles.listItem}>
            <Text style={[typography.body, { color: colors.text }]}>• Legal issues arising from lease terms</Text>
          </View>
          <View style={styles.listItem}>
            <Text style={[typography.body, { color: colors.text }]}>• Enforcement of lease agreements</Text>
          </View>
          <View style={styles.listItem}>
            <Text style={[typography.body, { color: colors.text }]}>• Breach of contract claims</Text>
          </View>
        </View>

        <View style={[styles.infoBox, { backgroundColor: colors.info + '20', borderColor: colors.info, marginTop: spacing.md }]}>
          <Ionicons name="information-circle" size={20} color={colors.info} />
          <Text style={[typography.caption, { color: colors.textSecondary, marginLeft: spacing.sm, flex: 1 }]}>
            We strongly recommend consulting with a legal professional to ensure your lease agreement 
            complies with all applicable laws in your jurisdiction.
          </Text>
        </View>

        <View style={[styles.infoBox, { backgroundColor: colors.error + '20', borderColor: colors.error, marginTop: spacing.md }]}>
          <Ionicons name="shield-checkmark" size={20} color={colors.error} />
          <Text style={[typography.caption, { color: colors.textSecondary, marginLeft: spacing.sm, flex: 1 }]}>
            By proceeding, you acknowledge that you understand these terms and accept full responsibility 
            for the legal validity and enforceability of the lease agreement you create.
          </Text>
        </View>
      </ScrollView>

      <View style={styles.buttonContainer}>
        <TouchableOpacity
          style={[styles.button, styles.declineButton, { backgroundColor: colors.background, borderColor: colors.border }]}
          onPress={onDecline}
        >
          <Text style={[typography.button, { color: colors.text }]}>Decline</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.button, styles.acceptButton, { backgroundColor: colors.primary }]}
          onPress={onAccept}
        >
          <Text style={[typography.button, { color: '#FFFFFF' }]}>I Understand & Accept</Text>
        </TouchableOpacity>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  content: {
    maxHeight: 500,
  },
  warningBox: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
  },
  infoBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
  },
  listContainer: {
    marginLeft: 8,
  },
  listItem: {
    marginBottom: 8,
  },
  buttonContainer: {
    flexDirection: 'row',
    marginTop: 24,
    gap: 12,
  },
  button: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  declineButton: {
    borderWidth: 1,
  },
  acceptButton: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
});
