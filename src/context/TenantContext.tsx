import React, { createContext, useContext, useState, ReactNode } from 'react';
import { Tenant, RentStatus } from '../types/types';
import { apiGet, apiPost } from '../utils/apiClient';

export interface TenantInvitation {
    id: string;
    tenantId: string;
    tenantName: string;
    tenantEmail: string;
    propertyId: string;
    propertyName: string;
    propertyLocation?: string;
    unitId: string;
    unitNumber: string;
    rentAmount: number;
    status: 'pending' | 'accepted' | 'rejected' | 'declined' | 'PENDING' | 'ACCEPTED' | 'DECLINED' | 'EXPIRED';
    createdAt: Date | string;
    respondedAt?: Date | string;
    managerId?: string;
}

interface TenantContextType {
    // Central database of ALL tenants (across all managers)
    allTenants: Tenant[];
    // Manager's linked tenants
    myTenants: Tenant[];
    // Backward-compatible union of invitations for external consumers
    allInvitations: TenantInvitation[];
    // Backend invitations for current tenant
    invitations: TenantInvitation[];
    invitationsLoading: boolean;
    invitationsError: string | null;
    loadInvitations: () => Promise<void>;
    loadTenants: () => Promise<void>;
    acceptInvitation: (invitationId: string) => Promise<boolean>;
    rejectInvitation: (invitationId: string) => Promise<boolean>;
    getPendingInvitationsForTenant: (tenantId: string) => TenantInvitation[];

    // Legacy mock APIs (kept as no-ops to avoid breaking other screens)
    addTenant: (tenant: Omit<Tenant, 'id' | 'createdAt'>) => void;
    inviteTenantById: (tenantId: string, propertyId: string, unitId: string, rentAmount: number, propertyName: string, unitNumber: string, managerId?: string) => boolean;
    getInvitationResponsesForManager: (managerId: string) => TenantInvitation[];
    updateTenant: (id: string, updates: Partial<Tenant>) => void;
    getTenantById: (id: string) => Tenant | undefined;
    getTenantByTenantId: (tenantId: string) => Tenant | undefined;
    getOverdueTenants: () => { overdue: Tenant[]; pastOverdue: Tenant[] };
    getTenantsByProperty: (propertyId: string) => Tenant[];
}

const TenantContext = createContext<TenantContextType | undefined>(undefined);

interface TenantProviderProps {
    children: ReactNode;
}

export const TenantProvider: React.FC<TenantProviderProps> = ({ children }) => {
    // Central tenant database - loaded from backend
    const [allTenants, setAllTenants] = useState<Tenant[]>([]);
    const [tenantsLoading, setTenantsLoading] = useState<boolean>(false);

    // Backend invitations state
    const [invitations, setInvitations] = useState<TenantInvitation[]>([]);
    const [invitationsLoading, setInvitationsLoading] = useState<boolean>(false);
    const [invitationsError, setInvitationsError] = useState<string | null>(null);

    // Manager's tenants (filter by propertyId existing)
    const myTenants = allTenants.filter(tenant => tenant.propertyId);

    // Load manager's tenants from backend
    const loadTenants = async (): Promise<void> => {
        setTenantsLoading(true);
        try {
            const { status, json } = await apiGet('/manager/tenants');
            if (status === 200 && json?.success && Array.isArray(json.data)) {
                const tenants: Tenant[] = json.data.map((t: any) => ({
                    id: t.id,
                    tenantId: t.tenantId,
                    name: t.name,
                    email: t.email,
                    phoneNumber: t.phoneNumber || '',
                    propertyId: t.propertyId,
                    propertyName: t.propertyName,
                    unitId: t.unitId,
                    unitNumber: t.unitNumber,
                    rentAmount: t.rentAmount,
                    paymentStatus: t.paymentStatus as RentStatus,
                    amountOwed: t.amountOwed || 0,
                    leaseId: t.leaseId,
                    createdAt: new Date(),
                }));
                setAllTenants(tenants);
            }
        } catch (error) {
            console.error('Error loading tenants:', error);
        } finally {
            setTenantsLoading(false);
        }
    };

    // Backend: load invitations for current tenant (derived from JWT)
    const loadInvitations = async (): Promise<void> => {
        setInvitationsLoading(true);
        setInvitationsError(null);
        try {
            const { status, json } = await apiGet('/tenants/invitations');
            if (status === 200 && json) {
                const payload = (json as any);
                if (payload.success) {
                    const raw = Array.isArray(payload.data) ? payload.data : [];
                    const mapped: TenantInvitation[] = raw.map((inv: any) => ({
                        id: inv.id,
                        tenantId: inv.tenantId ?? '',
                        tenantName: inv.tenantIdentity?.name ?? inv.tenantName ?? '',
                        tenantEmail: inv.tenantIdentity?.email ?? inv.tenantEmail ?? '',
                        propertyId: inv.propertyId,
                        propertyName: inv.property?.name ?? inv.propertyName ?? '',
                        propertyLocation: inv.property?.location,
                        unitId: inv.unitId,
                        unitNumber: inv.unit?.unitNumber ?? inv.unitNumber ?? '',
                        rentAmount: inv.rentAmount ?? 0,
                        status: inv.status,
                        createdAt: inv.createdAt ? new Date(inv.createdAt) : new Date(),
                        respondedAt: inv.respondedAt ? new Date(inv.respondedAt) : undefined,
                        managerId: inv.invitedByUserId ?? inv.managerId,
                    }));
                    setInvitations(mapped);
                } else {
                    setInvitations([]);
                    if (typeof payload.message === 'string') setInvitationsError(payload.message);
                }
            } else {
                setInvitations([]);
                setInvitationsError('Failed to load invitations');
            }
        } catch (e: any) {
            setInvitations([]);
            setInvitationsError(e?.message || 'Network error');
        } finally {
            setInvitationsLoading(false);
        }
    };

    const acceptInvitation = async (invitationId: string): Promise<boolean> => {
        try {
            const { status, json } = await apiPost(`/tenants/invitations/${invitationId}/accept`);
            if (status >= 200 && status < 300 && json) {
                await loadInvitations();
                return true;
            }
        } catch {
            // ignore
        }
        return false;
    };

    const rejectInvitation = async (invitationId: string): Promise<boolean> => {
        try {
            const { status, json } = await apiPost(`/tenants/invitations/${invitationId}/decline`);
            if (status >= 200 && status < 300 && json) {
                await loadInvitations();
                return true;
            }
        } catch {
            // ignore
        }
        return false;
    };

    const getPendingInvitationsForTenant = (tenantId: string): TenantInvitation[] => {
        return invitations.filter(inv => {
            const statusLower = String(inv.status || '').toLowerCase();
            return inv.tenantId === tenantId && statusLower === 'pending';
        });
    };

    // Legacy no-op implementations to avoid breaking other screens
    const addTenant = (_tenantData: Omit<Tenant, 'id' | 'createdAt'>) => { };
    const inviteTenantById = (_tenantId: string, _propertyId: string, _unitId: string, _rentAmount: number, _propertyName: string, _unitNumber: string, _managerId?: string): boolean => {
        return false;
    };
    const getInvitationResponsesForManager = (_managerId: string): TenantInvitation[] => [];
    const updateTenant = (_id: string, _updates: Partial<Tenant>) => { };
    const getTenantById = (id: string): Tenant | undefined => {
        return allTenants.find(t => t.id === id);
    };
    const getTenantByTenantId = (tenantId: string): Tenant | undefined => {
        return allTenants.find(t => t.tenantId === tenantId);
    };
    const getOverdueTenants = () => {
        const overdue = allTenants.filter(t => t.paymentStatus === 'overdue');
        return { overdue, pastOverdue: [] as Tenant[] };
    };
    const getTenantsByProperty = (propertyId: string): Tenant[] => {
        return allTenants.filter(t => t.propertyId === propertyId);
    };

    const value: TenantContextType = {
        allTenants,
        myTenants,
        allInvitations: invitations,
        invitations,
        invitationsLoading,
        invitationsError,
        loadInvitations,
        loadTenants,
        acceptInvitation,
        rejectInvitation,
        getPendingInvitationsForTenant,
        // legacy
        addTenant,
        inviteTenantById,
        getInvitationResponsesForManager,
        updateTenant,
        getTenantById,
        getTenantByTenantId,
        getOverdueTenants,
        getTenantsByProperty,
    };

    return <TenantContext.Provider value={value}>{children}</TenantContext.Provider>;
};

export const useTenants = (): TenantContextType => {
    const context = useContext(TenantContext);
    if (!context) {
        throw new Error('useTenants must be used within a TenantProvider');
    }
    return context;
};
