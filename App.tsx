import React, { useEffect, useState } from 'react';
import { StatusBar } from 'expo-status-bar';
import * as Updates from 'expo-updates';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { ThemeProvider } from './src/theme/ThemeContext';
import { AuthProvider } from './src/context/AuthContext';
import { PropertyProvider } from './src/context/PropertyContext';
import { TenantProvider } from './src/context/TenantContext';
import { PaymentProvider } from './src/context/PaymentContext';
import { LeaseProvider } from './src/context/LeaseContext';
import { MessageProvider } from './src/context/MessageContext';
import { NotificationProvider } from './src/context/NotificationContext';
import { TutorialProvider } from './src/context/TutorialContext';
import { FeedbackProvider } from './src/context/FeedbackContext';
import { AdminSessionProvider } from './src/context/AdminSessionContext';
import { Navigation } from './src/navigation';
import { OTAUpdateScreen } from './src/components/OTAUpdateScreen';
import { logOTAError, extractErrorDetails } from './src/utils/otaErrorHandler';

const SKIPPED_UPDATE_KEY = '@estatenet_skipped_update';

interface SkippedUpdate {
  version: string;
  skippedAt: string;
}

export default function App() {
  const [updateStatus, setUpdateStatus] = useState<'checking' | 'available' | 'downloading' | 'ready' | 'success' | 'error' | 'current' | 'complete'>('checking');
  const [errorDetails, setErrorDetails] = useState<any>(null);
  const [updateInfo, setUpdateInfo] = useState<any>(null);
  const [downloadProgress, setDownloadProgress] = useState(0);

  // Check if update was previously skipped
  const checkSkippedUpdate = async (updateId: string): Promise<boolean> => {
    try {
      const skippedData = await AsyncStorage.getItem(SKIPPED_UPDATE_KEY);
      if (skippedData) {
        const skipped: SkippedUpdate = JSON.parse(skippedData);
        return skipped.version === updateId;
      }
    } catch (error) {
      console.error('[OTA] Error checking skipped update:', error);
    }
    return false;
  };

  // Save skipped update
  const saveSkippedUpdate = async (updateId: string) => {
    try {
      const skippedData: SkippedUpdate = {
        version: updateId,
        skippedAt: new Date().toISOString(),
      };
      await AsyncStorage.setItem(SKIPPED_UPDATE_KEY, JSON.stringify(skippedData));
      console.log('[OTA] Saved skipped update:', updateId);
    } catch (error) {
      console.error('[OTA] Error saving skipped update:', error);
    }
  };

  // Clear skipped update
  const clearSkippedUpdate = async () => {
    try {
      await AsyncStorage.removeItem(SKIPPED_UPDATE_KEY);
    } catch (error) {
      console.error('[OTA] Error clearing skipped update:', error);
    }
  };

  // Extract release notes from manifest metadata
  const extractReleaseNotes = (manifest: any): string[] => {
    try {
      // Try to get release notes from manifest metadata
      if (manifest?.metadata?.releaseNotes) {
        if (Array.isArray(manifest.metadata.releaseNotes)) {
          return manifest.metadata.releaseNotes;
        }
        if (typeof manifest.metadata.releaseNotes === 'string') {
          return manifest.metadata.releaseNotes.split('\n').filter((note: string) => note.trim());
        }
      }
      // Default release notes if none provided
      return ['Bug fixes and improvements'];
    } catch (error) {
      console.error('[OTA] Error extracting release notes:', error);
      return ['Bug fixes and improvements'];
    }
  };

  // OTA Update Function with enhanced error handling
  const runOTAUpdate = async () => {
    try {
      console.log('[OTA] Checking for updates...');
      setUpdateStatus('checking');

      const update = await Updates.checkForUpdateAsync();

      if (update.isAvailable) {
        const updateId = update.manifest?.id || 'unknown';

        // Check if this update was previously skipped
        const wasSkipped = await checkSkippedUpdate(updateId);
        if (wasSkipped) {
          console.log('[OTA] Update was previously skipped, showing again');
        }

        // Extract update information
        const currentVersion = Updates.manifest?.version || Updates.runtimeVersion;
        const newVersion = update.manifest?.version || 'latest';
        const releaseNotes = extractReleaseNotes(update.manifest);

        setUpdateInfo({
          currentVersion,
          newVersion,
          releaseNotes,
          updateId,
        });

        setUpdateStatus('available');
      } else {
        console.log('[OTA] App is up to date');
        setUpdateStatus('current');

        // Clear any skipped update since we're current
        await clearSkippedUpdate();

        // Hide screen after 1 second
        setTimeout(() => {
          setUpdateStatus('complete');
        }, 1000);
      }
    } catch (error: any) {
      const errorData = extractErrorDetails(error);
      setErrorDetails(errorData);

      // Log to Sentry automatically
      logOTAError(error, {
        updateStage: 'checking',
        runtimeVersion: Updates.runtimeVersion,
        channel: Updates.channel,
        timestamp: new Date().toISOString(),
      });

      setUpdateStatus('error');

      // Auto-continue after 3 seconds
      setTimeout(() => {
        setUpdateStatus('complete');
      }, 3000);
    }
  };

  // Handle update download
  const handleUpdateNow = async () => {
    try {
      setUpdateStatus('downloading');
      setDownloadProgress(0);

      // Clear skipped update since user is proceeding
      await clearSkippedUpdate();

      await Updates.fetchUpdateAsync();

      setUpdateStatus('success');

      // Auto-reload after 3 seconds
      setTimeout(async () => {
        await Updates.reloadAsync();
      }, 3000);
    } catch (error: any) {
      const errorData = extractErrorDetails(error);
      setErrorDetails(errorData);

      // Log to Sentry
      logOTAError(error, {
        updateStage: 'downloading',
        runtimeVersion: Updates.runtimeVersion,
        channel: Updates.channel,
        timestamp: new Date().toISOString(),
      });

      setUpdateStatus('error');
    }
  };

  // Handle skip update
  const handleSkipUpdate = async () => {
    if (updateInfo?.updateId) {
      await saveSkippedUpdate(updateInfo.updateId);
    }
    setUpdateStatus('complete');
  };

  // Handle retry
  const handleRetry = () => {
    setErrorDetails(null);
    runOTAUpdate();
  };

  // Handle continue (dismiss error or success screen)
  const handleContinue = async () => {
    if (updateStatus === 'success') {
      await Updates.reloadAsync();
    } else {
      setUpdateStatus('complete');
    }
  };

  useEffect(() => {
    runOTAUpdate();
  }, []);

  // Show OTA update screen
  if (updateStatus !== 'complete') {
    return (
      <ThemeProvider>
        <OTAUpdateScreen
          status={updateStatus}
          errorDetails={errorDetails}
          updateInfo={updateInfo}
          downloadProgress={downloadProgress}
          onUpdateNow={handleUpdateNow}
          onSkipUpdate={handleSkipUpdate}
          onRetry={handleRetry}
          onContinue={handleContinue}
        />
      </ThemeProvider>
    );
  }

  return (
    <ThemeProvider>
      <AuthProvider>
        <TutorialProvider>
          <PropertyProvider>
            <TenantProvider>
              <LeaseProvider>
                <PaymentProvider>
                  <MessageProvider>
                    <NotificationProvider>
                      <TutorialProvider>
                        <AdminSessionProvider>
                          <FeedbackProvider>
                            <StatusBar style="auto" />
                            <Navigation />
                          </FeedbackProvider>
                        </AdminSessionProvider>
                      </TutorialProvider>
                    </NotificationProvider>
                  </MessageProvider>
                </PaymentProvider>
              </LeaseProvider>
            </TenantProvider>
          </PropertyProvider>
        </TutorialProvider>
      </AuthProvider>
    </ThemeProvider>
  );
}
