import { useEffect } from 'react';
import { useNavigation } from '@react-navigation/native';
import { useSessionTimeout } from './useSessionTimeout';

export const useActivityTracking = () => {
  const navigation = useNavigation();
  const { resetTimer } = useSessionTimeout();

  useEffect(() => {
    const unsubscribe = navigation.addListener('state', () => {
      resetTimer();
    });

    return unsubscribe;
  }, [navigation, resetTimer]);

  return { resetTimer };
};
