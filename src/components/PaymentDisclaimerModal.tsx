import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { Modal } from './Modal';
import { useTheme } from '../theme/ThemeContext';
import { Ionicons } from '@expo/vector-icons';

interface PaymentDisclaimerModalProps {
  visible: boolean;
  onAccept: () => void;
  onDecline: () => void;
}

export const PaymentDisclaimerModal: React.FC<PaymentDisclaimerModalProps> = ({
  visible,
  onAccept,
  onDecline,
}) => {
  const { colors, typography, spacing } = useTheme();

  return (
    <Modal visible={visible} onClose={onDecline} title="Payment Disclaimer">
      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        <View style={[styles.warningBox, { backgroundColor: colors.warning + '20', borderColor: colors.warning }]}>
          <Ionicons name="warning" size={24} color={colors.warning} />
          <Text style={[typography.body, { color: colors.warning, marginLeft: spacing.sm, flex: 1 }]}>
            Important: Please read carefully before proceeding
          </Text>
        </View>

        <Text style={[typography.h3, { color: colors.text, marginTop: spacing.lg, marginBottom: spacing.md }]}>
          Payment Tracking Disclaimer
        </Text>

        <Text style={[typography.body, { color: colors.text, marginBottom: spacing.md, lineHeight: 22 }]}>
          EstateNet is a platform that facilitates rent payment tracking and record-keeping. 
          <Text style={{ fontWeight: 'bold' }}> We do not process, hold, guarantee, or verify any payments.</Text>
        </Text>

        <Text style={[typography.body, { color: colors.text, marginBottom: spacing.md, lineHeight: 22 }]}>
          All financial transactions occur directly between tenants and landlords/property managers. 
          EstateNet is not liable for:
        </Text>

        <View style={styles.listContainer}>
          <View style={styles.listItem}>
            <Text style={[typography.body, { color: colors.text }]}>• Payment disputes or disagreements</Text>
          </View>
          <View style={styles.listItem}>
            <Text style={[typography.body, { color: colors.text }]}>• Incorrect payment amounts</Text>
          </View>
          <View style={styles.listItem}>
            <Text style={[typography.body, { color: colors.text }]}>• Failed or delayed transactions</Text>
          </View>
          <View style={styles.listItem}>
            <Text style={[typography.body, { color: colors.text }]}>• Financial losses of any kind</Text>
          </View>
          <View style={styles.listItem}>
            <Text style={[typography.body, { color: colors.text }]}>• Fraudulent payment claims or proofs</Text>
          </View>
        </View>

        <View style={[styles.infoBox, { backgroundColor: colors.info + '20', borderColor: colors.info, marginTop: spacing.md }]}>
          <Ionicons name="information-circle" size={20} color={colors.info} />
          <Text style={[typography.caption, { color: colors.textSecondary, marginLeft: spacing.sm, flex: 1 }]}>
            By proceeding, you acknowledge that you understand and accept these terms. 
            Always verify payment information independently.
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
