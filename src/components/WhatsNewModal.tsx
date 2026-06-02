import React from 'react';
import { View, Text } from 'react-native';
import Constants from 'expo-constants';
import { useTheme } from '../theme/ThemeContext';
import { Button } from './Button';
import { Modal } from './Modal';
import { Ionicons } from '@expo/vector-icons';

interface WhatsNewModalProps {
  visible: boolean;
  onClose: () => void;
}

const RELEASE_NOTES = [
  {
    version: '1.0.0',
    date: 'June 2026',
    changes: [
      'Account deletion — You can now permanently delete your account and all associated data from Settings.',
      'Legal document versioning — Privacy Policy and Terms of Service updates now require re-acceptance.',
      'Email notifications — You\'ll now receive email notifications when legal policies are updated.',
      'Performance improvements and bug fixes.',
    ],
  },
];

const LATEST_NOTES = RELEASE_NOTES[0];

export const WhatsNewModal: React.FC<WhatsNewModalProps> = ({ visible, onClose }) => {
  const { colors, spacing, typography, borderRadius } = useTheme();

  return (
    <Modal visible={visible} onClose={onClose} title={`What's New`} size="medium">
      <View style={{ alignItems: 'center', paddingTop: spacing.md }}>
        <View
          style={{
            width: 64,
            height: 64,
            borderRadius: 20,
            backgroundColor: colors.primary + '20',
            alignItems: 'center',
            justifyContent: 'center',
            marginBottom: spacing.sm,
          }}
        >
          <Ionicons name="megaphone" size={32} color={colors.primary} />
        </View>

        <Text style={[typography.h3, { color: colors.text, textAlign: 'center', marginBottom: spacing.xs }]}>
          Version {Constants.expoConfig?.version || LATEST_NOTES.version}
        </Text>

        <Text style={[typography.bodySmall, { color: colors.textSecondary, marginBottom: spacing.lg }]}>
          {LATEST_NOTES.date}
        </Text>

        <View
          style={{
            backgroundColor: colors.background,
            borderRadius: borderRadius.md,
            padding: spacing.md,
            width: '100%',
          }}
        >
          {LATEST_NOTES.changes.map((change, index) => (
            <View
              key={index}
              style={{
                flexDirection: 'row',
                alignItems: 'flex-start',
                marginBottom: index < LATEST_NOTES.changes.length - 1 ? spacing.md : 0,
              }}
            >
              <View
                style={{
                  width: 8,
                  height: 8,
                  borderRadius: 4,
                  backgroundColor: colors.primary,
                  marginTop: 7,
                  marginRight: spacing.sm,
                  flexShrink: 0,
                }}
              />
              <Text style={[typography.body, { color: colors.text, flex: 1, lineHeight: 22 }]}>
                {change}
              </Text>
            </View>
          ))}
        </View>

        <View style={{ width: '100%', marginTop: spacing.xl }}>
          <Button title="Got it" onPress={onClose} variant="primary" size="large" />
        </View>
      </View>
    </Modal>
  );
};
