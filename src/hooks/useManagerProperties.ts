import { useState, useEffect, useCallback } from 'react';
import { apiGet, apiPost, apiPatch, apiDelete } from '../utils/apiClient';

export interface Property {
  id: string;
  name: string;
  location: string;
  managerId: string;
  createdAt: string;
  updatedAt: string;
  units: {
    id: string;
    unitNumber: string;
    rentAmount: number;
    isOccupied: boolean;
  }[];
  leases?: {
    id: string;
    tenantId: string;
    rentAmount: number;
    status: string;
    tenantIdentity: {
      name: string;
      email: string;
    };
  }[];
}

export interface CreatePropertyData {
  name: string;
  location: string;
  units?: {
    unitNumber: string;
    rentAmount: number;
  }[];
}

export interface UpdatePropertyData {
  name?: string;
  location?: string;
}

export const useManagerProperties = () => {
  const [data, setData] = useState<Property[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchProperties = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const { status, json } = await apiGet('/properties');
      if (status === 200 && json?.success) {
        setData(json.data || []);
      } else {
        setError(json?.message || 'Failed to fetch properties');
        setData([]);
      }
    } catch (err: any) {
      setError(err.message || 'Network error');
      setData([]);
    } finally {
      setLoading(false);
    }
  }, []);

  // Initial fetch
  useEffect(() => {
    fetchProperties();
  }, [fetchProperties]);

  const createProperty = async (propertyData: CreatePropertyData): Promise<boolean> => {
    try {
      const { status, json } = await apiPost('/properties', propertyData);
      if (status === 201 && json?.success) {
        await fetchProperties(); // Refetch to update list
        return true;
      }
      setError(json?.message || 'Failed to create property');
      return false;
    } catch (err: any) {
      setError(err.message || 'Network error');
      return false;
    }
  };

  const updateProperty = async (id: string, updates: UpdatePropertyData): Promise<boolean> => {
    try {
      const { status, json } = await apiPatch(`/properties/${id}`, updates);
      if (status === 200 && json?.success) {
        await fetchProperties(); // Refetch to update list
        return true;
      }
      setError(json?.message || 'Failed to update property');
      return false;
    } catch (err: any) {
      setError(err.message || 'Network error');
      return false;
    }
  };

  const deleteProperty = async (id: string): Promise<boolean> => {
    try {
      const { status, json } = await apiDelete(`/properties/${id}`);
      if (status === 200 && json?.success) {
        await fetchProperties(); // Refetch to update list
        return true;
      }
      setError(json?.message || 'Failed to delete property');
      return false;
    } catch (err: any) {
      setError(err.message || 'Network error');
      return false;
    }
  };

  return {
    data,
    loading,
    error,
    refetch: fetchProperties,
    createProperty,
    updateProperty,
    deleteProperty,
  };
};
