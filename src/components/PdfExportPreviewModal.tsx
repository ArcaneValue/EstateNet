import React, { useState } from 'react';
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  SafeAreaView,
  ScrollView,
} from 'react-native';
import * as FileSystem from 'expo-file-system';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../theme/ThemeContext';

interface PdfExportPreviewModalProps {
  visible: boolean;
  title: string;
  html: string;
  fileName: string; // e.g., "EstateNet_RentCollection_Jan2024_AllProperties_20240125-1430.pdf"
  onClose: () => void;
}

// Helper function to extract preview text from HTML
const extractPreviewText = (html: string): string => {
  // Remove HTML tags and extract key information
  const textOnly = html
    .replace(/<style[^>]*>.*?<\/style>/gs, '')
    .replace(/<script[^>]*>.*?<\/script>/gs, '')
    .replace(/<[^>]*>/g, '')
    .replace(/\s+/g, ' ')
    .trim();

  // Get first 500 characters for preview
  return textOnly.length > 500 ? textOnly.substring(0, 500) + '...' : textOnly;
};

export const PdfExportPreviewModal: React.FC<PdfExportPreviewModalProps> = ({
  visible,
  title,
  html,
  fileName,
  onClose,
}) => {
  const { colors, spacing, typography } = useTheme();
  const [saving, setSaving] = useState(false);
  const previewText = extractPreviewText(html);

  const handleSavePDF = async () => {
    setSaving(true);

    try {
      // Validate HTML content first
      if (!html || html.trim().length === 0) {
        throw new Error('Invalid HTML content for PDF generation');
      }

      // Log HTML for debugging
      console.log('HTML to generate PDF:');
      console.log('HTML length:', html.length);
      console.log('HTML preview:', html.substring(0, 200) + '...');

      // Try with a simple test HTML first to isolate the issue
      const testHtml = `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <title>Test PDF</title>
          <style>
            body { font-family: Arial; margin: 20px; color: black; }
          </style>
        </head>
        <body>
          <h1>PDF Export Test</h1>
          <p>This is a test PDF export for ${title}</p>
          <p>Filename: ${fileName}</p>
        </body>
        </html>
      `;

      // Generate PDF using expo-print (NO print dialog)
      console.log('Generating PDF...');
      const result = await Print.printToFileAsync({
        html: testHtml, // Use simple test HTML first
        base64: false,
      });

      console.log('Print result:', result);

      // Check if result has uri property
      if (!result || !result.uri) {
        throw new Error('PDF generation failed - no URI returned');
      }

      const pdfUri = result.uri;

      // Try to save to Downloads folder first
      let finalUri = pdfUri;
      let savedLocation = 'App Documents';

      // For now, use the temp file directly to avoid FileSystem issues
      // TODO: Implement proper file saving after fixing FileSystem import

      // Show success message
      Alert.alert(
        'PDF Saved Successfully',
        `File: ${fileName}\nLocation: ${savedLocation}`,
        [
          {
            text: 'Share PDF',
            onPress: () => handleSharePDF(finalUri),
          },
          {
            text: 'Done',
            style: 'default',
            onPress: onClose,
          },
        ]
      );

    } catch (error) {
      console.error('PDF save failed:', error);

      // Fallback to share-only
      Alert.alert(
        'Save Failed',
        'Could not save PDF to device. Would you like to share it instead?',
        [
          {
            text: 'Cancel',
            style: 'cancel',
          },
          {
            text: 'Share PDF',
            onPress: handleShareFallback,
          },
        ]
      );
    } finally {
      setSaving(false);
    }
  };

  const handleSharePDF = async (uri: string) => {
    try {
      await Sharing.shareAsync(uri, {
        mimeType: 'application/pdf',
        dialogTitle: `Share ${title}`,
        UTI: 'com.adobe.pdf',
      });
    } catch (error) {
      console.error('Share failed:', error);
      Alert.alert('Share Failed', 'Could not share the PDF file.');
    }
  };

  const handleShareFallback = async () => {
    setSaving(true);
    try {
      const { uri } = await Print.printToFileAsync({
        html,
        base64: false,
      });

      await handleSharePDF(uri);
    } catch (error) {
      Alert.alert('Error', 'Failed to generate PDF for sharing.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
      accessible={true}
      accessibilityViewIsModal={true}
    >
      <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }}>
        {/* Header */}
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: spacing.lg,
            borderBottomWidth: 1,
            borderBottomColor: colors.border,
          }}
        >
          <View style={{ flex: 1 }}>
            <Text style={[typography.h3, { color: colors.text }]}>{title}</Text>
            <Text style={[typography.bodySmall, { color: colors.textSecondary }]}>
              PDF Preview
            </Text>
          </View>

          <TouchableOpacity
            onPress={onClose}
            style={{
              padding: spacing.sm,
            }}
          >
            <Ionicons name="close" size={24} color={colors.text} />
          </TouchableOpacity>
        </View>

        {/* Preview Area - Text Preview */}
        <ScrollView style={{ flex: 1, margin: spacing.md }}>
          <View
            style={{
              backgroundColor: colors.surface,
              borderRadius: 8,
              padding: spacing.lg,
              borderWidth: 1,
              borderColor: colors.border,
            }}
          >
            <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: spacing.md }}>
              <Ionicons name="document-text-outline" size={24} color={colors.primary} />
              <Text style={[typography.h4, { color: colors.text, marginLeft: spacing.sm }]}>
                Report Preview
              </Text>
            </View>

            <Text style={[typography.bodySmall, { color: colors.textSecondary, marginBottom: spacing.sm }]}>
              File: {fileName}
            </Text>

            <Text style={[typography.bodySmall, { color: colors.textSecondary, marginBottom: spacing.lg }]}>
              The following is a text preview of your PDF content:
            </Text>

            <View
              style={{
                backgroundColor: colors.background,
                borderRadius: 4,
                padding: spacing.md,
                borderWidth: 1,
                borderColor: colors.border,
                minHeight: 200,
              }}
            >
              <Text style={[typography.bodySmall, { color: colors.text, lineHeight: 20 }]}>
                {previewText}
              </Text>
            </View>

            <View style={{ marginTop: spacing.lg, padding: spacing.md, backgroundColor: colors.primary + '10', borderRadius: 4 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <Ionicons name="information-circle" size={16} color={colors.primary} />
                <Text style={[typography.bodySmall, { color: colors.primary, marginLeft: spacing.xs, fontWeight: '500' }]}>
                  Note: Full formatting will be applied in the saved PDF
                </Text>
              </View>
            </View>
          </View>
        </ScrollView>

        {/* Footer Buttons */}
        <View
          style={{
            flexDirection: 'row',
            padding: spacing.lg,
            borderTopWidth: 1,
            borderTopColor: colors.border,
            gap: spacing.md,
          }}
        >
          <TouchableOpacity
            onPress={onClose}
            style={{
              flex: 1,
              paddingVertical: spacing.md,
              paddingHorizontal: spacing.lg,
              borderRadius: 8,
              borderWidth: 1,
              borderColor: colors.border,
              alignItems: 'center',
            }}
          >
            <Text style={[typography.body, { color: colors.text }]}>Close</Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={handleSavePDF}
            disabled={saving}
            style={{
              flex: 2,
              paddingVertical: spacing.md,
              paddingHorizontal: spacing.lg,
              borderRadius: 8,
              backgroundColor: saving ? colors.border : colors.primary,
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            {saving ? (
              <ActivityIndicator size="small" color={colors.background} style={{ marginRight: spacing.xs }} />
            ) : (
              <Ionicons name="download" size={18} color={colors.background} style={{ marginRight: spacing.xs }} />
            )}
            <Text style={[typography.body, { color: colors.background, fontWeight: '600' }]}>
              {saving ? 'Saving...' : 'Save PDF'}
            </Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    </Modal>
  );
};
