import { useState, useEffect } from 'react';
import { apiGet } from '../utils/apiClient';

export interface DashboardData {
    propertiesCount: number;
    unitsCount: number;
    occupiedUnitsCount: number;
    occupancyRate: number;
    activeLeasesCount: number;
    pendingInvitationsCount: number;
    outstandingRentAmount: number;
    overdueCount: number;
    rentCollectedAmount: number;
    recentInvitations: Array<{
        id: string;
        tenantId: string;
        status: string;
        createdAt: string;
        respondedAt: string | null;
        property: {
            name: string;
            location: string | null;
        };
        unit: {
            unitNumber: string;
        };
    }>;
    recentPayments: Array<{
        id: string;
        amount: number;
        status: string;
        paymentDate: string;
        tenantId: string;
        property: {
            name: string;
        };
        unit: {
            unitNumber: string;
        };
    }>;
}

interface UseManagerDashboardReturn {
    data: DashboardData | null;
    loading: boolean;
    error: string | null;
    refetch: () => void;
}

export const useManagerDashboard = (): UseManagerDashboardReturn => {
    const [data, setData] = useState<DashboardData | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [retryCount, setRetryCount] = useState(0);

    const fetchDashboard = async () => {
        setLoading(true);
        setError(null);
        try {
            const { status, json } = await apiGet('/manager/dashboard');
            if (status === 200 && json?.success) {
                setData(json.data);
            } else {
                setError(json?.message || 'Failed to load dashboard');
            }
        } catch (err: any) {
            setError(err?.message || 'Network error');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchDashboard();
    }, [retryCount]);

    const refetch = () => setRetryCount(c => c + 1);

    return { data, loading, error, refetch };
};
