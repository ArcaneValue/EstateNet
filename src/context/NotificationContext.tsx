import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { Platform } from 'react-native';
import * as Notifications from 'expo-notifications';
import { apiGet, apiPost } from '../utils/apiClient';

// Configure notification handler
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
});

interface NotificationContextType {
  notifications: any[];
  unreadCount: number;
  loading: boolean;
  error: string | null;
  expoPushToken: string | null;
  loadNotifications: () => Promise<void>;
  markAsRead: (id: string) => Promise<boolean>;
  markAllAsRead: () => Promise<void>;
  clearAll: () => void;
  updateBadgeCount: (count: number) => Promise<void>;
  registerForPushNotifications: () => Promise<void>;
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

interface NotificationProviderProps {
  children: ReactNode;
}

export const NotificationProvider: React.FC<NotificationProviderProps> = ({ children }) => {
  const [notifications, setNotifications] = useState<any[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [expoPushToken, setExpoPushToken] = useState<string | null>(null);

  const mapNotification = (n: any) => {
    const type = (n.type || '').toUpperCase();
    let icon = 'notifications-outline';
    let iconColor = '#2563EB';
    let iconBg = '#DBEAFE';

    if (type === 'MESSAGE') {
      icon = 'mail-outline';
      iconColor = '#2563EB';
      iconBg = '#DBEAFE';
    } else if (type === 'PAYMENT_RECEIVED') {
      icon = 'cash-outline';
      iconColor = '#16A34A';
      iconBg = '#DCFCE7';
    } else if (type === 'INVITATION_ACCEPTED') {
      icon = 'person-add-outline';
      iconColor = '#22C55E';
      iconBg = '#DCFCE7';
    } else if (type === 'INVITATION_DECLINED') {
      icon = 'close-circle-outline';
      iconColor = '#DC2626';
      iconBg = '#FEE2E2';
    }

    return {
      id: n.id,
      title: n.title,
      message: n.body,
      time: n.createdAt ? new Date(n.createdAt).toLocaleString('en-GB', {
        day: '2-digit',
        month: 'short',
        hour: '2-digit',
        minute: '2-digit',
      }) : '',
      read: !!n.readAt,
      type,
      icon,
      iconColor,
      iconBg,
      details: n.metadata || null,
    };
  };

  const loadNotifications = async (): Promise<void> => {
    setLoading(true);
    setError(null);
    try {
      const { status, json } = await apiGet('/notifications');
      const payload: any = json;
      if (status === 200 && payload && payload.success) {
        const raw = Array.isArray(payload.data) ? payload.data : [];
        setNotifications(raw.map(mapNotification));
      } else {
        setNotifications([]);
        setError(typeof payload?.message === 'string' ? payload.message : 'Failed to load notifications');
      }
    } catch (e: any) {
      setNotifications([]);
      setError(e?.message || 'Network error while loading notifications');
    } finally {
      setLoading(false);
    }
  };

  const markAsRead = async (id: string): Promise<boolean> => {
    try {
      const { status, json } = await apiPost(`/notifications/${id}/read`);
      const payload: any = json;
      if (status >= 200 && status < 300 && payload && payload.success !== false) {
        setNotifications((prev) =>
          prev.map((n: any) => (n.id === id ? { ...n, read: true } : n)),
        );
        return true;
      }
    } catch {
      // ignore
    }
    return false;
  };

  const markAllAsRead = async (): Promise<void> => {
    const unread = notifications.filter((n) => !n.read);
    for (const n of unread) {
      // Best-effort; ignore individual failures
      // eslint-disable-next-line no-await-in-loop
      await markAsRead(n.id);
    }
  };

  const clearAll = (): void => {
    setNotifications([]);
  };

  const unreadCount = notifications.filter((n) => !n.read).length;

  const updateBadgeCount = async (count: number): Promise<void> => {
    try {
      await Notifications.setBadgeCountAsync(count);
    } catch (error) {
      console.error('Failed to update badge count:', error);
    }
  };

  const registerForPushNotifications = async (): Promise<void> => {
    try {
      if (Platform.OS === 'android') {
        await Notifications.setNotificationChannelAsync('default', {
          name: 'default',
          importance: Notifications.AndroidImportance.MAX,
          vibrationPattern: [0, 250, 250, 250],
          lightColor: '#FF231F7C',
        });
      }

      const { status: existingStatus } = await Notifications.getPermissionsAsync();
      let finalStatus = existingStatus;

      if (existingStatus !== 'granted') {
        const { status } = await Notifications.requestPermissionsAsync();
        finalStatus = status;
      }

      if (finalStatus !== 'granted') {
        console.log('Failed to get push token for push notification!');
        return;
      }

      const tokenData = await Notifications.getExpoPushTokenAsync();
      const token = tokenData.data;
      setExpoPushToken(token);

      // Send token to backend
      try {
        await apiPost('/users/push-token', { pushToken: token });
      } catch (error) {
        console.error('Failed to register push token with backend:', error);
      }
    } catch (error) {
      console.error('Error registering for push notifications:', error);
    }
  };

  // Auto-register on mount
  useEffect(() => {
    registerForPushNotifications();

    // Listen for notifications received while app is foregrounded
    const subscription = Notifications.addNotificationReceivedListener((notification: any) => {
      console.log('Notification received:', notification);
      loadNotifications();
    });

    // Listen for notification responses (user tapped notification)
    const responseSubscription = Notifications.addNotificationResponseReceivedListener((response: any) => {
      console.log('Notification response:', response);
      loadNotifications();
    });

    return () => {
      subscription.remove();
      responseSubscription.remove();
    };
  }, []);

  // Update badge count whenever unread count changes
  useEffect(() => {
    updateBadgeCount(unreadCount);
  }, [unreadCount]);

  const value: NotificationContextType = {
    notifications,
    unreadCount,
    loading,
    error,
    expoPushToken,
    loadNotifications,
    markAsRead,
    markAllAsRead,
    clearAll,
    updateBadgeCount,
    registerForPushNotifications,
  };

  return (
    <NotificationContext.Provider value={value}>
      {children}
    </NotificationContext.Provider>
  );
};

export const useNotifications = (): NotificationContextType => {
  const context = useContext(NotificationContext);
  if (!context) {
    throw new Error('useNotifications must be used within a NotificationProvider');
  }
  return context;
};
