import React, { useEffect } from 'react';
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
  useEffect(() => {
    async function onFetchUpdateAsync() {
      try {
        console.log('🔵 [OTA] Checking for updates...');
        console.log('🔵 [OTA] Update URL:', Updates.updateUrl);
        console.log('🔵 [OTA] Runtime Version:', Updates.runtimeVersion);
        console.log('🔵 [OTA] Channel:', Updates.channel);

        const update = await Updates.checkForUpdateAsync();

        console.log('🔵 [OTA] Update check result:', JSON.stringify(update));
        console.log('🔵 [OTA] Is update available?', update.isAvailable);

        if (update.isAvailable) {
          console.log('🟢 [OTA] Update found! Downloading...');
          await Updates.fetchUpdateAsync();
          console.log('🟢 [OTA] Update downloaded! Reloading app...');
          await Updates.reloadAsync();
        } else {
          console.log('🟡 [OTA] No update available. App is up to date.');
        }
      } catch (error) {
        console.error('🔴 [OTA] Update check failed:', error);
        console.error('🔴 [OTA] Error details:', JSON.stringify(error));
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
