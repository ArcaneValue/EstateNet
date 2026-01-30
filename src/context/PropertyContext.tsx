import React, { createContext, useContext, useState, ReactNode } from 'react';
import { Property, Unit, PropertyType, OwnershipType, MaintenanceCondition, PropertyManager, AccessRequest } from '../types/types';
import { usePayments } from './PaymentContext';

interface PropertyContextType {
    properties: Property[];
    addProperty: (property: Omit<Property, 'id' | 'createdAt' | 'updatedAt'>) => void;
    updateProperty: (id: string, updates: Partial<Property>) => void;
    deleteProperty: (id: string) => void;
    getPropertyById: (id: string) => Property | undefined;
    getPropertiesWithVacancies: () => Property[];
    getTotalOccupiedUnits: () => number;
    getTotalVacancies: () => number;
    getTotalRentCollected: () => number;
    getOutstandingRent: () => number;
    // Owner Mode functions
    getOwnedProperties: (managerId: string) => Property[];
    isOwner: (managerId: string) => boolean;
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
    // Mock data for demonstration - replace with API calls
    const [properties, setProperties] = useState<Property[]>([
        {
            id: '1',
            name: 'Sunrise Apartments',
            location: 'Kampala, Nakasero',
            propertyType: 'apartment',
            units: [
                { id: '101', unitNumber: '101', squareFootage: 850, rentAmount: 1200000, isOccupied: true, tenantId: 'T12345' },
                { id: '102', unitNumber: '102', squareFootage: 850, rentAmount: 1200000, isOccupied: true, tenantId: 'T12346' },
                { id: '103', unitNumber: '103', squareFootage: 950, rentAmount: 1400000, isOccupied: false },
                { id: '201', unitNumber: '201', squareFootage: 850, rentAmount: 1200000, isOccupied: true, tenantId: 'T12347' },
                { id: '202', unitNumber: '202', squareFootage: 950, rentAmount: 1400000, isOccupied: true, tenantId: 'T12348' },
            ],
            ownership: 'company',
            propertyOwner: 'Sunrise Properties Ltd',
            decisionAuthority: 'Managing Director',
            existingArrears: 800000,
            creditors: 'Water Authority: UGX 200,000',
            monthlyExpenses: 2500000,
            expenseApprovalLimit: 500000,
            rentCollectionMethod: 'estatenet',
            paymentTerms: '1st of each month',
            latePaymentPolicy: '5% penalty after 7 days',
            securityDeposit: 1200000,
            maintenanceCondition: 'good',
            lastPreventiveMaintenance: new Date('2026-01-15'),
            fireSafetySystems: true,
            legalCompliance: 'All permits current',
            requiredRepairs: 'None',
            maintenanceHandler: 'Property Manager',
            communicationHandler: 'Property Manager',
            expenseApprover: 'Managing Director',
            emergencyContacts: '+256 700 123456',
            createdAt: new Date('2025-06-01'),
            updatedAt: new Date('2026-01-15'),
        },
        {
            id: '2',
            name: 'Garden View Estate',
            location: 'Kampala, Kololo',
            propertyType: 'house',
            units: [
                { id: '1A', unitNumber: '1A', squareFootage: 2500, rentAmount: 3500000, isOccupied: true, tenantId: 'T12349' },
                { id: '1B', unitNumber: '1B', squareFootage: 2500, rentAmount: 3500000, isOccupied: false },
                { id: '2A', unitNumber: '2A', squareFootage: 3000, rentAmount: 4000000, isOccupied: true, tenantId: 'T12350' },
            ],
            ownership: 'personal',
            propertyOwner: 'John Malik',
            decisionAuthority: 'Owner',
            existingArrears: 0,
            creditors: 'None',
            monthlyExpenses: 1800000,
            expenseApprovalLimit: 300000,
            rentCollectionMethod: 'estatenet',
            paymentTerms: '5th of each month',
            latePaymentPolicy: '10% penalty after 14 days',
            securityDeposit: 3500000,
            maintenanceCondition: 'excellent',
            lastPreventiveMaintenance: new Date('2026-01-10'),
            fireSafetySystems: true,
            legalCompliance: 'All permits current',
            requiredRepairs: 'None',
            maintenanceHandler: 'External Contractor',
            communicationHandler: 'Owner',
            expenseApprover: 'Owner',
            emergencyContacts: '+256 700 987654',
            createdAt: new Date('2025-03-15'),
            updatedAt: new Date('2026-01-10'),
        },
    ]);

    // State for property managers and access requests
    const [propertyManagers, setPropertyManagers] = useState<PropertyManager[]>([
        {
            id: 'pm1',
            propertyId: '1',
            userId: '1',
            name: 'John Malik',
            email: 'john@estatenet.com',
            role: 'OWNER',
            permissions: {
                canViewTenants: true,
                canManageTenants: true,
                canViewPayments: true,
                canManagePayments: true,
                canViewReports: true,
                canManageProperty: true,
                canInviteManagers: true,
            },
            invitedBy: 'system',
            invitedAt: new Date('2025-06-01'),
            status: 'active',
        },
        {
            id: 'pm2',
            propertyId: '2',
            userId: '1',
            name: 'John Malik',
            email: 'john@estatenet.com',
            role: 'OWNER',
            permissions: {
                canViewTenants: true,
                canManageTenants: true,
                canViewPayments: true,
                canManagePayments: true,
                canViewReports: true,
                canManageProperty: true,
                canInviteManagers: true,
            },
            invitedBy: 'system',
            invitedAt: new Date('2025-03-15'),
            status: 'active',
        },
    ]);

    const [accessRequests, setAccessRequests] = useState<AccessRequest[]>([
        {
            id: 'ar1',
            propertyId: '1',
            propertyName: 'Sunrise Apartments',
            requesterId: 'mgr2',
            requesterName: 'Sarah Johnson',
            requesterEmail: 'sarah@estatenet.com',
            requestedRole: 'MANAGER',
            propertyCode: 'SUN123',
            message: 'I would like to help manage this property.',
            status: 'pending',
            createdAt: new Date(Date.now() - 86400000),
        },
    ]);

    const addProperty = (propertyData: Omit<Property, 'id' | 'createdAt' | 'updatedAt'>) => {
        const newProperty: Property = {
            ...propertyData,
            id: Math.random().toString(36).substr(2, 9),
            createdAt: new Date(),
            updatedAt: new Date(),
        };
        setProperties(prev => [...prev, newProperty]);
    };

    const updateProperty = (id: string, updates: Partial<Property>) => {
        setProperties(prev =>
            prev.map(property =>
                property.id === id
                    ? { ...property, ...updates, updatedAt: new Date() }
                    : property
            )
        );
    };

    const deleteProperty = (id: string) => {
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

    // Mock payment data for demonstration - in real app, this would come from PaymentContext
    const getTotalRentCollected = (): number => {
        // This is a simplified calculation - in real app, would use actual payment data
        return properties.reduce((total, property) => {
            const occupiedUnits = property.units.filter(unit => unit.isOccupied);
            return total + occupiedUnits.reduce((sum, unit) => sum + unit.rentAmount, 0);
        }, 0);
    };

    const getOutstandingRent = (): number => {
        // This is a simplified calculation - in real app, would use actual payment data
        return properties.reduce((total, property) => {
            const occupiedUnits = property.units.filter(unit => unit.isOccupied);
            return total + occupiedUnits.reduce((sum, unit) => sum + (unit.rentAmount * 0.1), 0); // Assume 10% outstanding
        }, 0);
    };

    // Owner Mode functions
    const getOwnedProperties = (managerId: string): Property[] => {
        const managerProperties = propertyManagers
            .filter(pm => pm.userId === managerId && pm.role === 'OWNER' && pm.status === 'active')
            .map(pm => pm.propertyId);

        return properties.filter(property => managerProperties.includes(property.id));
    };

    const isOwner = (managerId: string): boolean => {
        return true; // TEMPORARY: Always return true for testing
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
