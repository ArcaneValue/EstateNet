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
  // Silent OTA Update Function - runs in background without UI
  async function runSilentOTAUpdate() {
    try {
      console.log('[OTA] Checking for updates...');
      const update = await Updates.checkForUpdateAsync();

      if (update.isAvailable) {
        console.log('[OTA] Update available, downloading...');
        await Updates.fetchUpdateAsync();
        console.log('[OTA] Update downloaded, reloading app...');
        await Updates.reloadAsync();
      } else {
        console.log('[OTA] App is up to date');
      }
    } catch (error: any) {
      // Silent error logging - no UI disruption
      console.error('[OTA] Update failed:', {
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
    runSilentOTAUpdate();
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
