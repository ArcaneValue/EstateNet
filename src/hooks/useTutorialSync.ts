import { useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useTutorial } from '../context/TutorialContext';

/**
 * Hook to sync tutorial flags from user profile to local storage
 * Call this in the main app component or navigation root
 */
export const useTutorialSync = () => {
    const { user } = useAuth();
    const { syncTutorialFlagsFromUser } = useTutorial();

    useEffect(() => {
        if (user?.tutorialFlags) {
            console.log('[useTutorialSync] Syncing tutorial flags from user profile');
            syncTutorialFlagsFromUser(user.tutorialFlags);
        }
    }, [user?.id, user?.tutorialFlags, syncTutorialFlagsFromUser]);
};
