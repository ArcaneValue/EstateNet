import React, { useEffect } from 'react';
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

// OTA Constants
const LAST_CHECK_KEY = '@ota_last_check';
const CHECK_INTERVAL = 24 * 60 * 60 * 1000; // 24 hours
const MAX_RETRIES = 3;

// Utility delay function
function delay(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// Frequency control check
async function shouldCheckForUpdate() {
  const lastCheck = await AsyncStorage.getItem(LAST_CHECK_KEY);
  const now = Date.now();

  if (!lastCheck) return true;

  return now - parseInt(lastCheck, 10) > CHECK_INTERVAL;
}

// Core OTA Engine - Production Grade
async function checkAndUpdateSilently() {
  let attempt = 0;

  while (attempt < MAX_RETRIES) {
    try {
      const shouldCheck = await shouldCheckForUpdate();
      if (!shouldCheck) return;

      const update = await Updates.checkForUpdateAsync();

      if (update.isAvailable) {
        await Updates.fetchUpdateAsync();
        // Do NOT reload immediately - update is ready for next app restart
        await AsyncStorage.setItem(LAST_CHECK_KEY, Date.now().toString());
        console.log('OTA update downloaded successfully');
        return;
      }

      await AsyncStorage.setItem(LAST_CHECK_KEY, Date.now().toString());
      return;

    } catch (error) {
      attempt++;

      if (attempt >= MAX_RETRIES) {
        console.log('OTA failed after retries:', error);
        return;
      }

      await delay(2000 * attempt);
    }
  }
}

// Optional manual update trigger
async function manualUpdate() {
  try {
    const update = await Updates.checkForUpdateAsync();

    if (update.isAvailable) {
      await Updates.fetchUpdateAsync();
      await Updates.reloadAsync();
    }
  } catch (e) {
    console.log('Manual OTA failed', e);
  }
}

export default function App() {
  useEffect(() => {
    checkAndUpdateSilently();
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
