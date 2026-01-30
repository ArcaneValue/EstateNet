import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { apiGet } from '../utils/apiClient';
import { useAuth } from './AuthContext';

interface LeaseContextType {
  activeLease: any | null;
  leaseLoading: boolean;
  leaseError: string | null;
  loadActiveLease: () => Promise<void>;
  refreshLease: () => Promise<void>;
}

const LeaseContext = createContext<LeaseContextType | undefined>(undefined);

interface LeaseProviderProps {
  children: ReactNode;
}

export const LeaseProvider: React.FC<LeaseProviderProps> = ({ children }) => {
  const { user } = useAuth();
  const [activeLease, setActiveLease] = useState<any | null>(null);
  const [leaseLoading, setLeaseLoading] = useState<boolean>(false);
  const [leaseError, setLeaseError] = useState<string | null>(null);

  const loadActiveLease = async () => {
    if (!user) {
      setActiveLease(null);
      setLeaseError(null);
      setLeaseLoading(false);
      return;
    }

    setLeaseLoading(true);
    setLeaseError(null);
    try {
      const { status, json } = await apiGet('/tenant/me/active-lease');
      const payload: any = json;

      if (status === 200 && payload && payload.success) {
        setActiveLease(payload.data ?? null);
      } else if (status === 404) {
        setActiveLease(null);
        setLeaseError(null);
      } else {
        setActiveLease(null);
        if (payload && typeof payload.message === 'string') {
          setLeaseError(payload.message);
        } else {
          setLeaseError('Failed to load active lease');
        }
      }
    } catch (error: any) {
      setActiveLease(null);
      setLeaseError(error?.message || 'Failed to load active lease');
    } finally {
      setLeaseLoading(false);
    }
  };

  useEffect(() => {
    if (user) {
      loadActiveLease();
    } else {
      setActiveLease(null);
      setLeaseError(null);
      setLeaseLoading(false);
    }
  }, [user]);

  const refreshLease = async () => {
    await loadActiveLease();
  };

  const value: LeaseContextType = {
    activeLease,
    leaseLoading,
    leaseError,
    loadActiveLease,
    refreshLease,
  };

  return <LeaseContext.Provider value={value}>{children}</LeaseContext.Provider>;
};

export const useLease = (): LeaseContextType => {
  const context = useContext(LeaseContext);
  if (!context) {
    throw new Error('useLease must be used within a LeaseProvider');
  }
  return context;
};
