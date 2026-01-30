import React from 'react';
import { StatusBar } from 'expo-status-bar';
import { ThemeProvider } from './src/theme/ThemeContext';
import { AuthProvider } from './src/context/AuthContext';
import { PropertyProvider } from './src/context/PropertyContext';
import { TenantProvider } from './src/context/TenantContext';
import { PaymentProvider } from './src/context/PaymentContext';
import { LeaseProvider } from './src/context/LeaseContext';
import { MessageProvider } from './src/context/MessageContext';
import { NotificationProvider } from './src/context/NotificationContext';
import { Navigation } from './src/navigation';

export default function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <PropertyProvider>
          <TenantProvider>
            <PaymentProvider>
              <LeaseProvider>
                <MessageProvider>
                  <NotificationProvider>
                    <StatusBar style="auto" />
                    <Navigation />
                  </NotificationProvider>
                </MessageProvider>
              </LeaseProvider>
            </PaymentProvider>
          </TenantProvider>
        </PropertyProvider>
      </AuthProvider>
    </ThemeProvider>
  );
}
