import React from 'react';
import { View, StyleSheet, ActivityIndicator } from 'react-native';
import { WebView } from 'react-native-webview';
import { Modal } from './Modal';
import { useTheme } from '../theme/ThemeContext';

interface LegalDocumentViewerProps {
  visible: boolean;
  onClose: () => void;
  title: string;
  url: string;
}

export const LegalDocumentViewer: React.FC<LegalDocumentViewerProps> = ({
  visible,
  onClose,
  title,
  url,
}) => {
  const { colors } = useTheme();

  return (
    <Modal visible={visible} onClose={onClose} title={title} size="large">
      <View style={styles.container}>
        <WebView
          source={{ uri: url }}
          style={styles.webview}
          startInLoadingState={true}
          renderLoading={() => (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color={colors.primary} />
            </View>
          )}
        />
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    height: 600,
    width: '100%',
  },
  webview: {
    flex: 1,
  },
  loadingContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
  },
});
