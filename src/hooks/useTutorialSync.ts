import { useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useTutorial } from '../context/TutorialContext';

/**
 * Hook to sync tutorial flags from user profile to local storage
 * Call this in the main app component or navigation root
 */
export const useTutorialSync = () => {
    const { user } = useAuth();
    const { syncTutorialFlagsFromUser, resetSyncState } = useTutorial();

    useEffect(() => {
        if (user?.id) {
            console.log('[useTutorialSync] Resetting sync state and syncing tutorial flags for user:', user.id);
            resetSyncState();
            syncTutorialFlagsFromUser(user.tutorialFlags || {});
        }
    }, [user?.id]);
};
