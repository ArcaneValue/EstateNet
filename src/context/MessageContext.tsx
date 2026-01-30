import React, { createContext, useContext, useState, ReactNode } from 'react';
import { apiGet, apiPost } from '../utils/apiClient';

interface MessageContextType {
  inbox: any[];
  sent: any[];
  loading: boolean;
  error: string | null;
  tenantTargets: MessageTarget[];
  loadInbox: (leaseId?: string) => Promise<void>;
  loadSent: (leaseId?: string) => Promise<void>;
  sendMessage: (params: SendMessageParams) => Promise<boolean>;
  markAsRead: (messageId: string) => Promise<boolean>;
  loadTenantTargets: () => Promise<void>;
}

interface MessageTarget {
  userId: string;
  name: string;
  email: string;
  role: string;
}

interface SendMessageParams {
  toUserId: string;
  leaseId?: string;
  subject?: string;
  body: string;
}

const MessageContext = createContext<MessageContextType | undefined>(undefined);

interface MessageProviderProps {
  children: ReactNode;
}

export const MessageProvider: React.FC<MessageProviderProps> = ({ children }) => {
  const [inbox, setInbox] = useState<any[]>([]);
  const [sent, setSent] = useState<any[]>([]);
  const [tenantTargets, setTenantTargets] = useState<MessageTarget[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const loadInbox = async (leaseId?: string): Promise<void> => {
    setLoading(true);
    setError(null);
    try {
      const query = leaseId ? `?box=inbox&leaseId=${encodeURIComponent(leaseId)}` : '?box=inbox';
      const { status, json } = await apiGet(`/messages${query}`);
      const payload: any = json;

      if (status === 200 && payload && payload.success) {
        setInbox(Array.isArray(payload.data) ? payload.data : []);
      } else {
        setInbox([]);
        setError(typeof payload?.message === 'string' ? payload.message : 'Failed to load messages');
      }
    } catch (e: any) {
      setInbox([]);
      setError(e?.message || 'Network error while loading inbox');
    } finally {
      setLoading(false);
    }
  };

  const loadSent = async (leaseId?: string): Promise<void> => {
    setLoading(true);
    setError(null);
    try {
      const query = leaseId ? `?box=sent&leaseId=${encodeURIComponent(leaseId)}` : '?box=sent';
      const { status, json } = await apiGet(`/messages${query}`);
      const payload: any = json;

      if (status === 200 && payload && payload.success) {
        setSent(Array.isArray(payload.data) ? payload.data : []);
      } else {
        setSent([]);
        setError(typeof payload?.message === 'string' ? payload.message : 'Failed to load messages');
      }
    } catch (e: any) {
      setSent([]);
      setError(e?.message || 'Network error while loading sent messages');
    } finally {
      setLoading(false);
    }
  };

  const sendMessage = async (params: SendMessageParams): Promise<boolean> => {
    try {
      const { status, json } = await apiPost('/messages', {
        toUserId: params.toUserId,
        leaseId: params.leaseId,
        subject: params.subject,
        body: params.body,
      });
      const payload: any = json;

      if (status >= 200 && status < 300 && payload && payload.success) {
        // Optimistically append to sent list
        if (payload.data) {
          setSent((prev) => [payload.data, ...prev]);
        }
        return true;
      }
    } catch (e) {
      // ignore, handled by caller
    }
    return false;
  };

  const markAsRead = async (messageId: string): Promise<boolean> => {
    try {
      const { status, json } = await apiPost(`/messages/${messageId}/read`);
      const payload: any = json;
      if (status >= 200 && status < 300 && payload && payload.success !== false) {
        setInbox((prev) =>
          prev.map((m: any) =>
            m.id === messageId ? { ...m, readAt: m.readAt || new Date().toISOString() } : m,
          ),
        );
        return true;
      }
    } catch {
      // ignore, caller can decide
    }
    return false;
  };

  const loadTenantTargets = async (): Promise<void> => {
    try {
      const { status, json } = await apiGet('/tenant/me/message-targets');
      const payload: any = json;
      if (status === 200 && payload && payload.success) {
        const raw = Array.isArray(payload.data) ? payload.data : [];
        const mapped: MessageTarget[] = raw.map((t: any) => ({
          userId: t.userId,
          name: t.name,
          email: t.email,
          role: t.role,
        }));
        setTenantTargets(mapped);
      } else {
        setTenantTargets([]);
      }
    } catch {
      setTenantTargets([]);
    }
  };

  const value: MessageContextType = {
    inbox,
    sent,
    loading,
    error,
    tenantTargets,
    loadInbox,
    loadSent,
    sendMessage,
    markAsRead,
    loadTenantTargets,
  };

  return <MessageContext.Provider value={value}>{children}</MessageContext.Provider>;
};

export const useMessages = (): MessageContextType => {
  const context = useContext(MessageContext);
  if (!context) {
    throw new Error('useMessages must be used within a MessageProvider');
  }
  return context;
};
