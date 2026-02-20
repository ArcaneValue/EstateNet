import { useState, useCallback } from 'react';
import { apiGet } from '../utils/apiClient';
import { EnforcementInfo, EnforcementAction } from '../utils/apiClient';

interface CheckEnforcementResult {
  canProceed: boolean;
  enforcement?: EnforcementInfo;
}

export const useManagerEnforcement = () => {
  const [checking, setChecking] = useState(false);

  const checkEnforcement = useCallback(async (
    feature: string
  ): Promise<CheckEnforcementResult> => {
    setChecking(true);

    if (__DEV__) {
      console.log(`[useManagerEnforcement] Checking enforcement for: ${feature}`);
    }

    try {
      const { status, json, enforcement } = await apiGet('/manager/enforcement-check');

      if (__DEV__) {
        console.log(`[useManagerEnforcement] Response:`, { status, json, enforcement });
      }

      // If 402 returned, enforcement is required
      if (status === 402 || enforcement) {
        if (__DEV__) {
          console.log(`[useManagerEnforcement] Enforcement required:`, enforcement);
        }
        return { canProceed: false, enforcement };
      }

      // Success response
      if (status === 200 && json?.success) {
        return { canProceed: true };
      }

      // Unexpected response - fail safe (assume enforcement needed)
      if (__DEV__) {
        console.log(`[useManagerEnforcement] Unexpected response, defaulting to blocked`);
      }
      return {
        canProceed: false,
        enforcement: {
          action: 'PAY_INVOICE' as EnforcementAction,
          message: 'Unable to verify billing status. Please refresh and try again.'
        }
      };
    } catch (error) {
      if (__DEV__) {
        console.log(`[useManagerEnforcement] Error checking enforcement:`, error);
      }
      // Network error - fail safe
      return {
        canProceed: false,
        enforcement: {
          action: 'PAY_INVOICE' as EnforcementAction,
          message: 'Network error. Please check connection and try again.'
        }
      };
    } finally {
      setChecking(false);
    }
  }, []);

  return {
    checkEnforcement,
    checking,
  };
};
