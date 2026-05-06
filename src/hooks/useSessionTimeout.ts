import { useEffect, useRef } from 'react';
import { AppState, AppStateStatus } from 'react-native';
import { useAuth } from '../context/AuthContext';

const SESSION_TIMEOUT_MS = 30 * 60 * 1000; // 30 minutes

export const useSessionTimeout = () => {
  const { signOut, isAuthenticated } = useAuth();
  const lastActivityRef = useRef<number>(Date.now());
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const appStateRef = useRef<AppStateStatus>(AppState.currentState);

  const resetTimer = () => {
    lastActivityRef.current = Date.now();
    
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    timeoutRef.current = setTimeout(() => {
      if (isAuthenticated) {
        signOut();
      }
    }, SESSION_TIMEOUT_MS);
  };

  useEffect(() => {
    if (!isAuthenticated) {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
      return;
    }

    resetTimer();

    const handleAppStateChange = (nextAppState: AppStateStatus) => {
      if (appStateRef.current.match(/inactive|background/) && nextAppState === 'active') {
        const inactiveTime = Date.now() - lastActivityRef.current;
        
        if (inactiveTime > SESSION_TIMEOUT_MS) {
          signOut();
        } else {
          resetTimer();
        }
      } else if (nextAppState.match(/inactive|background/)) {
        lastActivityRef.current = Date.now();
      }
      
      appStateRef.current = nextAppState;
    };

    const subscription = AppState.addEventListener('change', handleAppStateChange);

    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
      subscription.remove();
    };
  }, [isAuthenticated, signOut]);

  return { resetTimer };
};
