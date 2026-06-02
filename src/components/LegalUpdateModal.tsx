import React, { useState } from 'react';
import { View, Text, ScrollView, ActivityIndicator } from 'react-native';
import { WebView } from 'react-native-webview';
import { Modal } from './Modal';
import { Button } from './Button';
import { useTheme } from '../theme/ThemeContext';
import { apiPost } from '../utils/apiClient';

interface LegalDocument {
  type: string;
  version: string;
  effectiveDate: string;
  url: string;
  acceptedVersion: string | null;
  requiresAcceptance: boolean;
}

interface LegalUpdateModalProps {
  visible: boolean;
  documents: LegalDocument[];
  onComplete: () => void;
  onLogout: () => void;
}

export const LegalUpdateModal: React.FC<LegalUpdateModalProps> = ({
  visible,
  documents,
  onComplete,
  onLogout,
}) => {
  const { colors, spacing, typography, borderRadius } = useTheme();
  const [currentIndex, setCurrentIndex] = useState(0);
  const [accepting, setAccepting] = useState(false);

  const pending = documents.filter((d) => d.requiresAcceptance);
  const current = pending[currentIndex];

  const handleAccept = async () => {
    if (!current) return;
    setAccepting(true);
    try {
      const { status, json } = await apiPost('/legal/accept', {
        documentType: current.type,
        version: current.version,
      });
      if (status >= 200 && status < 300 && json?.success) {
        if (currentIndex < pending.length - 1) {
          setCurrentIndex((i) => i + 1);
        } else {
          setCurrentIndex(0);
          onComplete();
        }
      }
    } catch {
      // Silently fail — user can retry
    } finally {
      setAccepting(false);
    }
  };

  if (!visible || pending.length === 0) return null;

  const docLabel = current.type === 'privacyPolicy' ? 'Privacy Policy' : 'Terms of Service';
  const effectiveDate = new Date(current.effectiveDate).toLocaleDateString('en-GB', {
    day: 'numeric', month: 'long', year: 'numeric',
  });

  return (
    <Modal visible={visible} onClose={() => {}} title={`${docLabel} Updated`} size="large">
      <ScrollView style={{ maxHeight: 500 }}>
        <View
          style={{
            backgroundColor: colors.info + '15',
            borderWidth: 1,
            borderColor: colors.info,
            borderRadius: borderRadius.md,
            padding: spacing.md,
            marginBottom: spacing.md,
          }}
        >
          <Text style={[typography.body, { color: colors.text }]}>
            EstateNet's <Text style={{ fontWeight: '700' }}>{docLabel}</Text> has been updated to{' '}
            <Text style={{ fontWeight: '700' }}>version {current.version}</Text>.
          </Text>
          <Text style={[typography.bodySmall, { color: colors.textSecondary, marginTop: spacing.xs }]}>
            Effective date: {effectiveDate}
          </Text>
        </View>

        <View style={{ height: 400, marginBottom: spacing.md }}>
          <WebView
            source={{ uri: current.url }}
            style={{ flex: 1, borderRadius: borderRadius.md }}
            startInLoadingState
            renderLoading={() => (
              <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
                <ActivityIndicator size="large" color={colors.primary} />
              </View>
            )}
          />
        </View>

        <Text style={[typography.bodySmall, { color: colors.textSecondary, textAlign: 'center', marginBottom: spacing.md }]}>
          By continuing to use EstateNet after {effectiveDate}, you agree to the updated {docLabel}.
        </Text>
      </ScrollView>

      <View style={{ gap: spacing.sm }}>
        <Button
          title={accepting ? 'Accepting...' : `Accept ${docLabel}`}
          onPress={handleAccept}
          disabled={accepting}
          variant="primary"
          size="large"
        />
        <Button
          title="Decline & Sign Out"
          onPress={onLogout}
          variant="outline"
          size="large"
          style={{ borderColor: colors.error }}
          textStyle={{ color: colors.error }}
        />
      </View>
    </Modal>
  );
};
