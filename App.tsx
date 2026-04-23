import React, { useEffect, useState } from 'react';
import { StatusBar } from 'expo-status-bar';
import { View, Text, StyleSheet, Animated } from 'react-native';
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

// OTA Status Types
type OTAStatus = 'idle' | 'checking' | 'update_available' | 'downloading' | 'downloaded' | 'no_update' | 'error';

// OTA Status Screen Component
function OTAStatusScreen({ status, message }: { status: OTAStatus; message: string }) {
  const fadeAnim = React.useRef(new Animated.Value(0)).current;

  React.useEffect(() => {
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 500,
      useNativeDriver: true,
    }).start();
  }, []);

  const getStatusText = () => {
    switch (status) {
      case 'checking':
        return 'Scanning estate network...';
      case 'update_available':
        return 'New estate data found';
      case 'downloading':
        return 'Syncing property data...';
      case 'downloaded':
        return 'Update ready';
      case 'no_update':
        return 'Estate system up to date';
      case 'error':
        return 'Update failed';
      default:
        return 'Initializing...';
    }
  };

  const getTimestamp = () => {
    return new Date().toLocaleTimeString('en-US', {
      hour12: false,
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    });
  };

  return (
    <Animated.View style={[styles.container, { opacity: fadeAnim }]}>
      <Text style={styles.title}>EstateNet System</Text>

      <View style={styles.statusContainer}>
        <Text style={styles.status}>{getStatusText()}</Text>
        <Text style={styles.message}>{message}</Text>
      </View>

      <View style={styles.debugContainer}>
        <Text style={styles.debugText}>Runtime: {Updates.runtimeVersion || 'Unknown'}</Text>
        <Text style={styles.debugText}>Channel: {Updates.channel || 'Unknown'}</Text>
        <Text style={styles.debugText}>Time: {getTimestamp()}</Text>
      </View>
    </Animated.View>
  );
}

// OTA Styles
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0B0F1A',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#00D4FF',
    marginBottom: 40,
    textTransform: 'uppercase',
    letterSpacing: 2,
  },
  statusContainer: {
    backgroundColor: 'rgba(122, 95, 255, 0.1)',
    padding: 20,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(122, 95, 255, 0.3)',
    marginBottom: 30,
    minWidth: '80%',
  },
  status: {
    fontSize: 18,
    fontWeight: '600',
    color: '#7A5FFF',
    textAlign: 'center',
    marginBottom: 10,
  },
  message: {
    fontSize: 14,
    color: '#FFFFFF',
    textAlign: 'center',
    lineHeight: 20,
  },
  debugContainer: {
    backgroundColor: 'rgba(0, 212, 255, 0.05)',
    padding: 15,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(0, 212, 255, 0.2)',
  },
  debugText: {
    fontSize: 12,
    color: '#00D4FF',
    fontFamily: 'monospace',
    marginVertical: 2,
  },
});

export default function App() {
  const [otaStatus, setOtaStatus] = useState<OTAStatus>('idle');
  const [otaMessage, setOtaMessage] = useState<string>('');

  const finalizeOTAStatus = (status: OTAStatus, message: string) => {
    setOtaStatus(status);
    setOtaMessage(message);
    // Keep diagnostics visible briefly, then continue into app.
    setTimeout(() => {
      setOtaStatus('idle');
      setOtaMessage('');
    }, 2200);
  };

  // Diagnostic OTA Update Function
  async function runOTAUpdate() {
    try {
      setOtaStatus('checking');
      setOtaMessage('Checking for updates...');

      const update = await Updates.checkForUpdateAsync();

      if (update.isAvailable) {
        setOtaStatus('update_available');
        setOtaMessage('Update detected. Preparing download...');

        setOtaStatus('downloading');
        setOtaMessage('Downloading update...');

        await Updates.fetchUpdateAsync();

        setOtaStatus('downloaded');
        setOtaMessage('Update downloaded. Restarting...');
        await Updates.reloadAsync();

      } else {
        finalizeOTAStatus('no_update', 'App is up to date.');
      }

    } catch (error: any) {
      const errorMessage = `Update failed\n\nMessage: ${error?.message || 'Unknown'}\nCode: ${error?.code || 'N/A'}`;
      finalizeOTAStatus('error', errorMessage);

      // Critical logging with full diagnostic information
      console.error({
        message: error?.message,
        code: error?.code,
        stack: error?.stack,
        runtimeVersion: Updates.runtimeVersion,
        channel: Updates.channel,
        timestamp: new Date().toISOString(),
      });
    }
  }

  useEffect(() => {
    runOTAUpdate();
  }, []);

  // Only block app while update check/download is in progress.
  const showOTAScreen = otaStatus === 'checking' || otaStatus === 'update_available' || otaStatus === 'downloading';
  if (showOTAScreen) {
    return <OTAStatusScreen status={otaStatus} message={otaMessage} />;
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
