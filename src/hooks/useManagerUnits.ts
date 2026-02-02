import { useState, useCallback } from 'react';
import { apiPost, apiPatch, apiDelete } from '../utils/apiClient';

export interface Unit {
  id: string;
  propertyId: string;
  unitNumber: string;
  rentAmount: number;
  isOccupied: boolean;
  createdAt: string;
  updatedAt: string;
  property?: {
    id: string;
    name: string;
    location: string;
  };
}

export interface CreateUnitData {
  unitNumber: string;
  rentAmount: number;
}

export interface UpdateUnitData {
  unitNumber?: string;
  rentAmount?: number;
  isOccupied?: boolean;
}

export const useManagerUnits = (propertyId?: string) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const createUnit = useCallback(async (data: CreateUnitData): Promise<Unit | null> => {
    if (!propertyId) {
      setError('Property ID is required');
      return null;
    }

    setLoading(true);
    setError(null);

    try {
      const response = await apiPost(`/properties/${propertyId}/units`, data);
      if (response.json?.success) {
        return response.json.data;
      } else {
        setError(response.json?.message || 'Failed to create unit');
        return null;
      }
    } catch (err: any) {
      setError(err.message || 'Failed to create unit');
      return null;
    } finally {
      setLoading(false);
    }
  }, [propertyId]);

  const updateUnit = useCallback(async (unitId: string, data: UpdateUnitData): Promise<Unit | null> => {
    setLoading(true);
    setError(null);

    try {
      const response = await apiPatch(`/units/${unitId}`, data);
      if (response.json?.success) {
        return response.json.data;
      } else {
        setError(response.json?.message || 'Failed to update unit');
        return null;
      }
    } catch (err: any) {
      setError(err.message || 'Failed to update unit');
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  const deleteUnit = useCallback(async (unitId: string): Promise<boolean> => {
    setLoading(true);
    setError(null);

    try {
      const response = await apiDelete(`/units/${unitId}`);
      if (response.json?.success) {
        return true;
      } else {
        setError(response.json?.message || 'Failed to delete unit');
        return false;
      }
    } catch (err: any) {
      setError(err.message || 'Failed to delete unit');
      return false;
    } finally {
      setLoading(false);
    }
  }, []);

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  return {
    loading,
    error,
    createUnit,
    updateUnit,
    deleteUnit,
    clearError
  };
};
