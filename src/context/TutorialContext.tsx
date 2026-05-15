import React, { createContext, useContext, useState, useCallback } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { apiPatch } from '../utils/apiClient';

interface TutorialContextType {
  shouldShowTutorial: (tutorialId: string) => Promise<boolean>;
  markTutorialSeen: (tutorialId: string) => Promise<void>;
  resetTutorial: (tutorialId: string) => Promise<void>;
  resetAllTutorials: () => Promise<void>;
  syncTutorialFlagsFromUser: (tutorialFlags?: { [key: string]: boolean }) => Promise<void>;
}

const TutorialContext = createContext<TutorialContextType | undefined>(undefined);

export const TUTORIAL_KEYS = {
  // Welcome tutorials (one-time, first login)
  WELCOME_OWNER: 'tutorial_seen_welcome_owner',
  WELCOME_MANAGER: 'tutorial_seen_welcome_manager',
  WELCOME_TENANT: 'tutorial_seen_welcome_tenant',

  // Owner screens
  OWNER_DASHBOARD: 'tutorial_seen_owner_dashboard',
  OWNER_PROPERTIES: 'tutorial_seen_owner_properties',
  OWNER_MANAGERS: 'tutorial_seen_owner_managers',
  OWNER_FINANCIAL: 'tutorial_seen_owner_financial',
  OWNER_REGISTRY: 'tutorial_seen_owner_registry',
  OWNER_OUTSTANDING: 'tutorial_seen_owner_outstanding',

  // Manager screens
  MANAGER_DASHBOARD: 'tutorial_seen_manager_dashboard',
  MANAGER_BILLING: 'tutorial_seen_manager_billing',
  MANAGER_PROPERTIES: 'tutorial_seen_manager_properties',
  MANAGER_TENANTS: 'tutorial_seen_manager_tenants',
  MANAGER_PAYMENT_CLAIMS: 'tutorial_seen_manager_payment_claims',
  MANAGER_APPROVALS: 'tutorial_seen_manager_approvals',
  MANAGER_OUTSTANDING_RENT: 'tutorial_seen_manager_outstanding_rent',
  MANAGER_PAYMENTS: 'tutorial_seen_manager_payments',
  MANAGER_RENT_COLLECTION: 'tutorial_seen_manager_rent_collection',

  // Tenant screens
  TENANT_DASHBOARD: 'tutorial_seen_tenant_dashboard',
  TENANT_PAYMENTS: 'tutorial_seen_tenant_payments',
  TENANT_MESSAGES: 'tutorial_seen_tenant_messages',
  TENANT_INVITATIONS: 'tutorial_seen_tenant_invitations',
  TENANT_PROFILE: 'tutorial_seen_tenant_profile',

  // Shared screens
  FEEDBACK_COMMUNITY: 'tutorial_seen_feedback_community',

  // Legacy keys (keep for backward compatibility)
  PAYMENT_CLAIMS: 'tutorial_seen_payment_claims',
  BILLING: 'tutorial_seen_billing',
  ADD_PROPERTY: 'tutorial_seen_add_property',
  VERIFY_PAYMENTS: 'tutorial_seen_verify_payments',
};

export const TutorialProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [tutorialCache, setTutorialCache] = useState<Map<string, boolean>>(new Map());

  const shouldShowTutorial = useCallback(async (tutorialId: string): Promise<boolean> => {
    try {
      // Check cache first
      if (tutorialCache.has(tutorialId)) {
        return !tutorialCache.get(tutorialId);
      }

      // Check AsyncStorage
      const value = await AsyncStorage.getItem(tutorialId);
      const hasSeenTutorial = value === 'true';

      // Update cache
      setTutorialCache(prev => new Map(prev).set(tutorialId, hasSeenTutorial));

      return !hasSeenTutorial;
    } catch (error) {
      console.error(`[TutorialContext] Error checking tutorial ${tutorialId}:`, error);
      return false; // Don't show tutorial if there's an error
    }
  }, [tutorialCache]);

  const markTutorialSeen = useCallback(async (tutorialId: string): Promise<void> => {
    try {
      // Save to AsyncStorage first (fast, local)
      await AsyncStorage.setItem(tutorialId, 'true');

      // Update cache
      setTutorialCache(prev => new Map(prev).set(tutorialId, true));

      console.log(`[TutorialContext] Marked tutorial as seen: ${tutorialId}`);

      // Sync to backend (non-blocking)
      try {
        await apiPatch('/users/me/tutorial-flags', {
          tutorialKey: tutorialId,
          completed: true
        });
        console.log(`[TutorialContext] Synced tutorial flag to backend: ${tutorialId}`);
      } catch (backendError) {
        console.error(`[TutorialContext] Failed to sync tutorial flag to backend:`, backendError);
        // Don't throw - local storage is already updated
      }
    } catch (error) {
      console.error(`[TutorialContext] Error marking tutorial ${tutorialId} as seen:`, error);
    }
  }, []);

  const resetTutorial = useCallback(async (tutorialId: string): Promise<void> => {
    try {
      await AsyncStorage.removeItem(tutorialId);

      // Update cache
      setTutorialCache(prev => {
        const newCache = new Map(prev);
        newCache.delete(tutorialId);
        return newCache;
      });

      console.log(`[TutorialContext] Reset tutorial: ${tutorialId}`);
    } catch (error) {
      console.error(`[TutorialContext] Error resetting tutorial ${tutorialId}:`, error);
    }
  }, []);

  const resetAllTutorials = useCallback(async (): Promise<void> => {
    try {
      const allKeys = Object.values(TUTORIAL_KEYS);
      await AsyncStorage.multiRemove(allKeys);

      // Clear cache
      setTutorialCache(new Map());

      console.log('[TutorialContext] Reset all tutorials');
    } catch (error) {
      console.error('[TutorialContext] Error resetting all tutorials:', error);
    }
  }, []);

  const syncTutorialFlagsFromUser = useCallback(async (tutorialFlags?: { [key: string]: boolean }): Promise<void> => {
    try {
      if (!tutorialFlags || typeof tutorialFlags !== 'object') {
        console.log('[TutorialContext] No tutorial flags to sync from user');
        return;
      }

      console.log('[TutorialContext] Syncing tutorial flags from user profile:', tutorialFlags);

      // Sync each flag from backend to AsyncStorage
      const syncPromises = Object.entries(tutorialFlags).map(async ([key, value]) => {
        if (value === true) {
          await AsyncStorage.setItem(key, 'true');
          setTutorialCache(prev => new Map(prev).set(key, true));
        }
      });

      await Promise.all(syncPromises);
      console.log('[TutorialContext] Tutorial flags synced successfully');
    } catch (error) {
      console.error('[TutorialContext] Error syncing tutorial flags:', error);
    }
  }, []);

  const value: TutorialContextType = {
    shouldShowTutorial,
    markTutorialSeen,
    resetTutorial,
    resetAllTutorials,
    syncTutorialFlagsFromUser,
  };

  return (
    <TutorialContext.Provider value={value}>
      {children}
    </TutorialContext.Provider>
  );
};

export const useTutorial = (): TutorialContextType => {
  const context = useContext(TutorialContext);
  if (!context) {
    throw new Error('useTutorial must be used within a TutorialProvider');
  }
  return context;
};
