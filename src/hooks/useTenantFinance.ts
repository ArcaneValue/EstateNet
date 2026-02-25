import { useState, useEffect } from 'react';
import { apiGet } from '../utils/apiClient';

export interface TenantRentStatus {
    period: string;
    hasActiveLeaseAtPeriodStart: boolean;
    expectedRent: number;
    paidForPeriod: number;
    outstandingForPeriod: number;
    status: 'PAID' | 'PARTIAL' | 'DUE' | 'NO_LEASE';
}

export const useTenantRentStatus = (period?: string) => {
    const [rentStatus, setRentStatus] = useState<TenantRentStatus | null>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const fetchRentStatus = async (targetPeriod?: string) => {
        setLoading(true);
        setError(null);

        try {
            const queryParam = targetPeriod ? `?period=${targetPeriod}` : '';
            const { status, json } = await apiGet(`/tenant/rent-status${queryParam}`);

            if (status === 200 && json?.success) {
                setRentStatus(json.data);
            } else {
                setError(json?.message || 'Failed to fetch rent status');
            }
        } catch (err) {
            console.error('Fetch rent status error:', err);
            setError('Network error. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchRentStatus(period);
    }, [period]);

    const refetch = () => {
        fetchRentStatus(period);
    };

    return {
        rentStatus,
        loading,
        error,
        refetch
    };
};
