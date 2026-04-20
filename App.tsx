import React, { useEffect } from 'react';
import { StatusBar } from 'expo-status-bar';
import { Alert } from 'react-native';
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
  useEffect(() => {
    async function onFetchUpdateAsync() {
      try {
        // Show checking alert after 2 seconds
        setTimeout(() => {
          Alert.alert(
            '🔵 OTA Check',
            `Checking updates...\n\nRuntime: ${Updates.runtimeVersion || 'Not set'}\nChannel: ${Updates.channel || 'Not set'}`,
            [{ text: 'OK' }]
          );
        }, 2000);

        const update = await Updates.checkForUpdateAsync();

        if (update.isAvailable) {
          Alert.alert(
            '🟢 Update Found!',
            'Downloading update now...',
            [{ text: 'OK' }]
          );
          await Updates.fetchUpdateAsync();
          Alert.alert(
            '✅ Downloaded',
            'App will reload now.',
            [{ text: 'Reload', onPress: () => Updates.reloadAsync() }]
          );
        } else {
          setTimeout(() => {
            Alert.alert(
              '🟡 No Update',
              'App is up to date.',
              [{ text: 'OK' }]
            );
          }, 3000);
        }
      } catch (error: any) {
        Alert.alert(
          '🔴 Update Failed',
          `Error: ${error?.message || 'Unknown'}\n\nCode: ${error?.code || 'N/A'}\n\nOTA updates not working.`,
          [{ text: 'OK' }]
        );
      }
    }

    onFetchUpdateAsync();
  }, []);

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
