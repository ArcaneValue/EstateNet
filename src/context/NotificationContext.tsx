import React, { createContext, useContext, useState, ReactNode } from 'react';
import { apiGet, apiPost } from '../utils/apiClient';

interface NotificationContextType {
  notifications: any[];
  unreadCount: number;
  loading: boolean;
  error: string | null;
  loadNotifications: () => Promise<void>;
  markAsRead: (id: string) => Promise<boolean>;
  markAllAsRead: () => Promise<void>;
  clearAll: () => void;
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

interface NotificationProviderProps {
  children: ReactNode;
}

export const NotificationProvider: React.FC<NotificationProviderProps> = ({ children }) => {
  const [notifications, setNotifications] = useState<any[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

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

  const value: NotificationContextType = {
    notifications,
    unreadCount,
    loading,
    error,
    loadNotifications,
    markAsRead,
    markAllAsRead,
    clearAll,
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
