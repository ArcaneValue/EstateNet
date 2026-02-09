import { useState, useEffect, useCallback } from 'react';
import { apiGet, apiPost } from '../utils/apiClient';

export interface Notification {
  id: string;
  type: string;
  title: string;
  body: string;
  metadata?: any;
  createdAt: string;
  readAt: string | null;
}

export const useNotifications = () => {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchNotifications = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const { status, json } = await apiGet('/notifications');
      if (status === 200 && json?.success) {
        const data = json.data || [];
        setNotifications(data);
        setUnreadCount(data.filter((n: Notification) => !n.readAt).length);
      } else {
        setError(json?.message || 'Failed to fetch notifications');
      }
    } catch (err) {
      setError('Failed to fetch notifications');
    } finally {
      setLoading(false);
    }
  }, []);

  const markAsRead = useCallback(async (notificationId: string) => {
    try {
      const { status, json } = await apiPost(`/notifications/${notificationId}/read`, {});
      if (status === 200 && json?.success) {
        // Update local state
        setNotifications(prev => 
          prev.map(n => n.id === notificationId ? { ...n, readAt: new Date().toISOString() } : n)
        );
        setUnreadCount(prev => Math.max(0, prev - 1));
        return true;
      }
      return false;
    } catch (err) {
      return false;
    }
  }, []);

  const markAllAsRead = useCallback(async () => {
    const unreadIds = notifications.filter(n => !n.readAt).map(n => n.id);
    await Promise.all(unreadIds.map(id => markAsRead(id)));
  }, [notifications, markAsRead]);

  useEffect(() => {
    fetchNotifications();
  }, [fetchNotifications]);

  return {
    notifications,
    unreadCount,
    loading,
    error,
    refetch: fetchNotifications,
    markAsRead,
    markAllAsRead,
  };
};
