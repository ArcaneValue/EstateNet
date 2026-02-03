import React, { createContext, useContext, useState, ReactNode, useEffect, useCallback } from 'react';
import { Property, Unit, PropertyType, OwnershipType, MaintenanceCondition, PropertyManager, AccessRequest } from '../types/types';
import { useAuth } from './AuthContext';
import { apiGet, apiPost } from '../utils/apiClient';

interface PropertyContextType {
    properties: Property[];
    propertiesLoading: boolean;
    propertiesError: string | null;
    loadProperties: () => Promise<void>;
    addProperty: (property: Omit<Property, 'id' | 'createdAt' | 'updatedAt'>) => Promise<void>;
    updateProperty: (id: string, updates: Partial<Property>) => Promise<void>;
    deleteProperty: (id: string) => Promise<void>;
    getPropertyById: (id: string) => Property | undefined;
    getPropertiesWithVacancies: () => Property[];
    getTotalOccupiedUnits: () => number;
    getTotalVacancies: () => number;
    getTotalRentCollected: () => number;
    getOutstandingRent: () => number;
    // Owner Mode functions
    getOwnedProperties: (managerId: string) => Property[];
    isOwner: () => boolean;
    getPropertyManagers: (propertyId: string) => PropertyManager[];
    addPropertyManager: (propertyId: string, manager: PropertyManager) => void;
    updatePropertyManager: (propertyId: string, managerId: string, updates: Partial<PropertyManager>) => void;
    removePropertyManager: (propertyId: string, managerId: string) => void;
    getPendingAccessRequests: (propertyId: string) => AccessRequest[];
    approveAccessRequest: (propertyId: string, requestId: string) => void;
    rejectAccessRequest: (propertyId: string, requestId: string) => void;
}

const PropertyContext = createContext<PropertyContextType | undefined>(undefined);

interface PropertyProviderProps {
    children: ReactNode;
}

export const PropertyProvider: React.FC<PropertyProviderProps> = ({ children }) => {
    const { user } = useAuth();
    const [properties, setProperties] = useState<Property[]>([]);
    const [propertiesLoading, setPropertiesLoading] = useState(false);
    const [propertiesError, setPropertiesError] = useState<string | null>(null);

    // State for property managers and access requests (still mock for now)
    const [propertyManagers, setPropertyManagers] = useState<PropertyManager[]>([]);
    const [accessRequests, setAccessRequests] = useState<AccessRequest[]>([]);

    // Load properties from API
    const loadProperties = useCallback(async () => {
        if (!user) {
            setProperties([]);
            return;
        }

        setPropertiesLoading(true);
        setPropertiesError(null);
        try {
            const { status, json } = await apiGet('/properties');
            if (status === 200 && json?.success) {
                setProperties(json.data || []);
            } else {
                setProperties([]);
                setPropertiesError(json?.message || 'Failed to load properties');
            }
        } catch (error: any) {
            setProperties([]);
            setPropertiesError(error.message || 'Failed to load properties');
        } finally {
            setPropertiesLoading(false);
        }
    }, [user]);

    // Load properties when user changes
    useEffect(() => {
        loadProperties();
    }, [loadProperties]);

    const addProperty = async (propertyData: Omit<Property, 'id' | 'createdAt' | 'updatedAt'>) => {
        try {
            const { status, json } = await apiPost('/properties', {
                name: propertyData.name,
                location: propertyData.location,
                units: propertyData.units?.map(u => ({
                    unitNumber: u.unitNumber,
                    rentAmount: u.rentAmount,
                })) || [],
            });

            if (status === 201 && json?.success) {
                setProperties(prev => [...prev, json.data]);
            } else {
                throw new Error(json?.message || 'Failed to create property');
            }
        } catch (error: any) {
            setPropertiesError(error.message || 'Failed to create property');
            throw error;
        }
    };

    const updateProperty = async (id: string, updates: Partial<Property>) => {
        // TODO: Implement backend endpoint for property updates
        setProperties(prev =>
            prev.map(property =>
                property.id === id
                    ? { ...property, ...updates, updatedAt: new Date() }
                    : property
            )
        );
    };

    const deleteProperty = async (id: string) => {
        // TODO: Implement backend endpoint for property deletion
        setProperties(prev => prev.filter(property => property.id !== id));
    };

    const getPropertyById = (id: string): Property | undefined => {
        return properties.find(property => property.id === id);
    };

    const getPropertiesWithVacancies = (): Property[] => {
        return properties.filter(property =>
            property.units.some(unit => !unit.isOccupied)
        );
    };

    const getTotalOccupiedUnits = (): number => {
        return properties.reduce(
            (total, property) => total + property.units.filter(unit => unit.isOccupied).length,
            0
        );
    };

    const getTotalVacancies = (): number => {
        return properties.reduce(
            (total, property) => total + property.units.filter(unit => !unit.isOccupied).length,
            0
        );
    };

    const getTotalRentCollected = (): number => {
        return properties.reduce((total, property) => {
            const occupiedUnits = property.units?.filter(unit => unit.isOccupied) || [];
            return total + occupiedUnits.reduce((sum, unit) => sum + (unit.rentAmount || 0), 0);
        }, 0);
    };

    const getOutstandingRent = (): number => {
        return properties.reduce((total, property) => {
            const occupiedUnits = property.units?.filter(unit => unit.isOccupied) || [];
            return total + occupiedUnits.reduce((sum, unit) => sum + ((unit.rentAmount || 0) * 0.1), 0);
        }, 0);
    };

    const getOwnedProperties = (managerId: string): Property[] => {
        return properties;
    };

    const isOwner = (): boolean => {
        return user?.role === 'OWNER';
    };

    const getPropertyManagers = (propertyId: string): PropertyManager[] => {
        return propertyManagers.filter(pm => pm.propertyId === propertyId);
    };

    const addPropertyManager = (propertyId: string, manager: PropertyManager): void => {
        setPropertyManagers(prev => [...prev, { ...manager, id: Math.random().toString(36).substr(2, 9) }]);
    };

    const updatePropertyManager = (propertyId: string, managerId: string, updates: Partial<PropertyManager>): void => {
        setPropertyManagers(prev =>
            prev.map(pm =>
                pm.propertyId === propertyId && pm.id === managerId
                    ? { ...pm, ...updates }
                    : pm
            )
        );
    };

    const removePropertyManager = (propertyId: string, managerId: string): void => {
        setPropertyManagers(prev =>
            prev.filter(pm => !(pm.propertyId === propertyId && pm.id === managerId))
        );
    };

    const getPendingAccessRequests = (propertyId: string): AccessRequest[] => {
        return accessRequests.filter(ar => ar.propertyId === propertyId && ar.status === 'pending');
    };

    const approveAccessRequest = (propertyId: string, requestId: string): void => {
        const request = accessRequests.find(ar => ar.id === requestId && ar.propertyId === propertyId);
        if (request) {
            // Update the request status
            setAccessRequests(prev =>
                prev.map(ar =>
                    ar.id === requestId
                        ? { ...ar, status: 'approved', respondedAt: new Date(), respondedBy: 'owner' }
                        : ar
                )
            );

            // Add as property manager
            const newManager: PropertyManager = {
                id: Math.random().toString(36).substr(2, 9),
                propertyId,
                userId: request.requesterId,
                name: request.requesterName,
                email: request.requesterEmail,
                role: request.requestedRole,
                permissions: getPermissionsForRole(request.requestedRole),
                invitedBy: 'owner',
                invitedAt: new Date(),
                status: 'active',
            };
            setPropertyManagers(prev => [...prev, newManager]);
        }
    };

    const rejectAccessRequest = (propertyId: string, requestId: string): void => {
        setAccessRequests(prev =>
            prev.map(ar =>
                ar.id === requestId
                    ? { ...ar, status: 'rejected', respondedAt: new Date(), respondedBy: 'owner' }
                    : ar
            )
        );
    };

    const getPermissionsForRole = (role: string) => {
        switch (role) {
            case 'OWNER':
                return {
                    canViewTenants: true,
                    canManageTenants: true,
                    canViewPayments: true,
                    canManagePayments: true,
                    canViewReports: true,
                    canManageProperty: true,
                    canInviteManagers: true,
                };
            case 'ADMIN':
                return {
                    canViewTenants: true,
                    canManageTenants: true,
                    canViewPayments: true,
                    canManagePayments: true,
                    canViewReports: true,
                    canManageProperty: true,
                    canInviteManagers: false,
                };
            case 'MANAGER':
                return {
                    canViewTenants: true,
                    canManageTenants: true,
                    canViewPayments: true,
                    canManagePayments: false,
                    canViewReports: true,
                    canManageProperty: false,
                    canInviteManagers: false,
                };
            case 'VIEWER':
                return {
                    canViewTenants: true,
                    canManageTenants: false,
                    canViewPayments: true,
                    canManagePayments: false,
                    canViewReports: true,
                    canManageProperty: false,
                    canInviteManagers: false,
                };
            default:
                return {
                    canViewTenants: false,
                    canManageTenants: false,
                    canViewPayments: false,
                    canManagePayments: false,
                    canViewReports: false,
                    canManageProperty: false,
                    canInviteManagers: false,
                };
        }
    };

    const value: PropertyContextType = {
        properties,
        propertiesLoading,
        propertiesError,
        loadProperties,
        addProperty,
        updateProperty,
        deleteProperty,
        getPropertyById,
        getPropertiesWithVacancies,
        getTotalOccupiedUnits,
        getTotalVacancies,
        getTotalRentCollected,
        getOutstandingRent,
        // Owner Mode functions
        getOwnedProperties,
        isOwner,
        getPropertyManagers,
        addPropertyManager,
        updatePropertyManager,
        removePropertyManager,
        getPendingAccessRequests,
        approveAccessRequest,
        rejectAccessRequest,
    };

    return <PropertyContext.Provider value={value}>{children}</PropertyContext.Provider>;
};

export const useProperties = (): PropertyContextType => {
    const context = useContext(PropertyContext);
    if (!context) {
        throw new Error('useProperties must be used within a PropertyProvider');
    }
    return context;
};
