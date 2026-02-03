import { useState, useEffect } from 'react';
import { apiGet, apiPost, apiPatch, apiDelete } from '../utils/apiClient';

export const useOwnerApi = () => {
  const [properties, setProperties] = useState<any[]>([]);
  const [invitations, setInvitations] = useState<any[]>([]);
  const [managers, setManagers] = useState<any[]>([]);
  const [activities, setActivities] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchProperties = async () => {
    setLoading(true);
    try {
      const { status, json } = await apiGet('/properties');
      if (status === 200 && json?.success) {
        setProperties(json.data || []);
      }
    } catch (err) {
      setError('Failed to fetch properties');
    } finally {
      setLoading(false);
    }
  };

  const createProperty = async (propertyData: { name: string; location: string }) => {
    try {
      const { status, json } = await apiPost('/properties', propertyData);
      if (status === 201 && json?.success) {
        await fetchProperties();
        return { success: true, data: json.data };
      }
      return { success: false, message: json?.message };
    } catch (err: any) {
      return { success: false, message: err.message };
    }
  };

  const updateProperty = async (propertyId: string, updates: any) => {
    try {
      const { status, json } = await apiPatch(`/properties/${propertyId}`, updates);
      if (status === 200 && json?.success) {
        await fetchProperties();
        await fetchManagers();
        return { success: true, data: json.data };
      }
      return { success: false, message: json?.message };
    } catch (err: any) {
      return { success: false, message: err.message };
    }
  };

  const removeManager = async (propertyId: string) => {
    return updateProperty(propertyId, { managerId: null });
  };

  const fetchInvitations = async () => {
    try {
      const { status, json } = await apiGet('/owner/invitations');
      if (status === 200 && json?.success) {
        setInvitations(json.data || []);
      }
    } catch (err) {
      console.error('Failed to fetch invitations', err);
    }
  };

  const createInvitation = async (propertyId: string, managerEmail: string) => {
    try {
      const { status, json } = await apiPost('/owner/invitations', {
        propertyId,
        managerEmail,
      });
      if (status === 201 && json?.success) {
        await fetchInvitations();
        return { success: true };
      }
      return { success: false, message: json?.message };
    } catch (err: any) {
      return { success: false, message: err.message };
    }
  };

  const cancelInvitation = async (invitationId: string) => {
    try {
      const { status, json } = await apiDelete(`/owner/invitations/${invitationId}`);
      if (status === 200 && json?.success) {
        await fetchInvitations();
        return { success: true };
      }
      return { success: false, message: json?.message };
    } catch (err: any) {
      return { success: false, message: err.message };
    }
  };

  const fetchManagers = async () => {
    try {
      const { status, json } = await apiGet('/properties');
      if (status === 200 && json?.success) {
        const managersList = json.data
          ?.map((p: any) => p.manager)
          .filter((m: any) => m !== null);
        setManagers(managersList || []);
      }
    } catch (err) {
      console.error('Failed to fetch managers', err);
    }
  };

  const fetchActivity = async () => {
    try {
      const { status, json } = await apiGet('/activity/recent');
      if (status === 200 && json?.success) {
        setActivities(json.data || []);
      }
    } catch (err) {
      console.error('Failed to fetch activity', err);
    }
  };

  useEffect(() => {
    fetchProperties();
    fetchInvitations();
    fetchManagers();
    fetchActivity();
  }, []);

  const refetch = () => {
    fetchProperties();
    fetchInvitations();
    fetchManagers();
  };

  return {
    properties,
    invitations,
    managers,
    activities,
    loading,
    error,
    refetch,
    fetchActivity,
    createInvitation,
    cancelInvitation,
    createProperty,
    updateProperty,
    removeManager,
  };
};
