import React, { useEffect, useState } from 'react';
import { View, Text, ActivityIndicator, StyleSheet, Alert } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import * as Updates from 'expo-updates';
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

export default function App() {
  const [updateStatus, setUpdateStatus] = useState<string>('checking');
  const [updateMessage, setUpdateMessage] = useState<string>('Checking for updates...');

  // OTA Update Function with UI feedback
  async function runOTAUpdate() {
    try {
      console.log('[OTA] Checking for updates...');
      setUpdateStatus('checking');
      setUpdateMessage('Checking for updates...');

      const update = await Updates.checkForUpdateAsync();

      if (update.isAvailable) {
        console.log('[OTA] Update available, downloading...');
        setUpdateStatus('downloading');
        setUpdateMessage('Downloading update...');

        await Updates.fetchUpdateAsync();

        console.log('[OTA] Update downloaded successfully');
        setUpdateStatus('ready');
        setUpdateMessage('Update ready! Restarting app...');

        // Show alert before reloading
        Alert.alert(
          'Update Downloaded',
          'A new version is ready. The app will restart now.',
          [
            {
              text: 'OK',
              onPress: async () => {
                await Updates.reloadAsync();
              }
            }
          ]
        );

        // Auto-reload after 2 seconds if user doesn't respond
        setTimeout(async () => {
          await Updates.reloadAsync();
        }, 2000);
      } else {
        console.log('[OTA] App is up to date');
        setUpdateStatus('current');
        setUpdateMessage('App is up to date');

        // Hide update screen after 1 second
        setTimeout(() => {
          setUpdateStatus('complete');
        }, 1000);
      }
    } catch (error: any) {
      console.error('[OTA] Update failed:', {
        message: error?.message,
        code: error?.code,
        stack: error?.stack,
        runtimeVersion: Updates.runtimeVersion,
        channel: Updates.channel,
        timestamp: new Date().toISOString(),
      });

      setUpdateStatus('error');
      setUpdateMessage('Update check failed. Continuing with current version...');

      // Hide error screen after 2 seconds
      setTimeout(() => {
        setUpdateStatus('complete');
      }, 2000);
    }
  }

  useEffect(() => {
    runOTAUpdate();
  }, []);

  // Show update screen while checking/downloading
  if (updateStatus !== 'complete') {
    return (
      <View style={styles.updateContainer}>
        <View style={styles.updateContent}>
          <Text style={styles.appName}>EstateNet</Text>

          {updateStatus === 'checking' && (
            <>
              <ActivityIndicator size="large" color="#007AFF" style={styles.loader} />
              <Text style={styles.updateText}>{updateMessage}</Text>
            </>
          )}

          {updateStatus === 'downloading' && (
            <>
              <ActivityIndicator size="large" color="#007AFF" style={styles.loader} />
              <Text style={styles.updateText}>{updateMessage}</Text>
              <Text style={styles.subText}>Please wait...</Text>
            </>
          )}

          {updateStatus === 'ready' && (
            <>
              <Text style={styles.successText}>✓</Text>
              <Text style={styles.updateText}>{updateMessage}</Text>
            </>
          )}

          {updateStatus === 'current' && (
            <>
              <Text style={styles.successText}>✓</Text>
              <Text style={styles.updateText}>{updateMessage}</Text>
            </>
          )}

          {updateStatus === 'error' && (
            <>
              <Text style={styles.errorText}>⚠</Text>
              <Text style={styles.updateText}>{updateMessage}</Text>
            </>
          )}
        </View>
      </View>
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

const styles = StyleSheet.create({
  updateContainer: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
  },
  updateContent: {
    alignItems: 'center',
    padding: 20,
  },
  appName: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#007AFF',
    marginBottom: 40,
  },
  loader: {
    marginVertical: 20,
  },
  updateText: {
    fontSize: 16,
    color: '#333333',
    textAlign: 'center',
    marginTop: 10,
  },
  subText: {
    fontSize: 14,
    color: '#666666',
    textAlign: 'center',
    marginTop: 5,
  },
  successText: {
    fontSize: 48,
    color: '#4CAF50',
    marginVertical: 20,
  },
  errorText: {
    fontSize: 48,
    color: '#FF9800',
    marginVertical: 20,
  },
});
