import React, { useEffect, useState } from 'react';
import { StatusBar } from 'expo-status-bar';
import * as Updates from 'expo-updates';
import Constants from 'expo-constants';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { ThemeProvider } from './src/theme/ThemeContext';
import { AuthProvider, useAuth } from './src/context/AuthContext';
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
import { useSessionTimeout } from './src/hooks/useSessionTimeout';
import { useTutorialSync } from './src/hooks/useTutorialSync';
import { LegalUpdateModal } from './src/components/LegalUpdateModal';
import { WhatsNewModal } from './src/components/WhatsNewModal';
import { apiGet } from './src/utils/apiClient';

// Disable console logs in production builds for security
if (!__DEV__) {
  console.log = () => { };
  console.info = () => { };
  console.warn = () => { };
  console.error = () => { };
  console.debug = () => { };
}

// Session timeout wrapper component
const AppWithSessionTimeout = () => {
  const { isAuthenticated, signOut } = useAuth();
  const [pendingLegalDocs, setPendingLegalDocs] = useState<any[] | null>(null);
  const [showWhatsNew, setShowWhatsNew] = useState(false);

  useSessionTimeout();
  useTutorialSync(); // Sync tutorial flags from backend on login

  // Check for legal document updates when user is authenticated
  useEffect(() => {
    if (!isAuthenticated) {
      setPendingLegalDocs(null);
      return;
    }

    let cancelled = false;

    const checkLegalStatus = async () => {
      try {
        const { status, json } = await apiGet('/legal/status');
        if (cancelled) return;
        if (status >= 200 && status < 300 && json?.success) {
          const docs: any[] = json.data?.documents || [];
          const pending = docs.filter((d: any) => d.requiresAcceptance);
          if (pending.length > 0) {
            setPendingLegalDocs(pending);
          }
        }
      } catch {
        // Silently fail — legal check is non-critical
      }
    };

    checkLegalStatus();

    return () => { cancelled = true; };
  }, [isAuthenticated]);

  // Show "What's New" modal on app version change
  useEffect(() => {
    const checkVersion = async () => {
      try {
        const currentVersion = Constants.expoConfig?.version || '1.0.0';
        const lastVersion = await AsyncStorage.getItem('@estatenet_last_version');
        if (lastVersion !== currentVersion) {
          setShowWhatsNew(true);
        }
      } catch {
        // Silently fail
      }
    };
    checkVersion();
  }, []);

  const handleWhatsNewClose = async () => {
    try {
      const currentVersion = Constants.expoConfig?.version || '1.0.0';
      await AsyncStorage.setItem('@estatenet_last_version', currentVersion);
    } catch {
      // Silently fail
    }
    setShowWhatsNew(false);
  };

  return (
    <>
      <Navigation />
      <WhatsNewModal visible={showWhatsNew} onClose={handleWhatsNewClose} />
      <LegalUpdateModal
        visible={pendingLegalDocs !== null && pendingLegalDocs.length > 0}
        documents={pendingLegalDocs || []}
        onComplete={() => setPendingLegalDocs(null)}
        onLogout={async () => {
          setPendingLegalDocs(null);
          await signOut();
        }}
      />
    </>
  );
};

export default function App() {
  // Silent OTA Update - runs in background on app launch
  useEffect(() => {
    async function checkForUpdates() {
      try {
        const update = await Updates.checkForUpdateAsync();
        if (update.isAvailable) {
          await Updates.fetchUpdateAsync();
          await Updates.reloadAsync();
        }
      } catch (error) {
        console.error('[OTA] Update check failed:', error);
      }
    }

    checkForUpdates();
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
                      <AdminSessionProvider>
                        <FeedbackProvider>
                          <StatusBar style="auto" />
                          <AppWithSessionTimeout />
                        </FeedbackProvider>
                      </AdminSessionProvider>
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
