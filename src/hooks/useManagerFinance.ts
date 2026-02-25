import { useState, useEffect } from 'react';
import { apiGet } from '../utils/apiClient';

export interface RentCollectionData {
    totalCollected: number;
    period: string;
    byProperty: Array<{
        propertyId: string;
        propertyName: string;
        expectedRent: number;
        collectedRent: number;
        collectionRate: number;
    }>;
    recentPayments: Array<{
        id: string;
        amount: number;
        paymentDate: string;
        tenantName: string;
        propertyName: string;
        unitNumber: string;
        status: string;
    }>;
}

export interface OutstandingRentData {
    totalOutstanding: number;
    overdueTenantsCount: number;
    period: string;
    items: Array<{
        tenantId: string;
        tenantName: string;
        tenantPhone: string | null;
        propertyId: string;
        propertyName: string;
        unitId: string;
        unitNumber: string;
        leaseId: string;
        expectedRent: number;
        collectedRent: number;
        amountOutstanding: number;
        lastPaymentAt: string | null;
    }>;
}

interface UseRentCollectionReturn {
    data: RentCollectionData | null;
    loading: boolean;
    error: string | null;
    refetch: (period?: string, propertyId?: string) => void;
}

interface UseOutstandingRentReturn {
    data: OutstandingRentData | null;
    loading: boolean;
    error: string | null;
    refetch: (period?: string, propertyId?: string) => void;
}

export const useRentCollection = (initialPeriod?: string, initialPropertyId?: string): UseRentCollectionReturn => {
    const [data, setData] = useState<RentCollectionData | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [period, setPeriod] = useState(initialPeriod);
    const [propertyId, setPropertyId] = useState(initialPropertyId);

    const fetchData = async (newPeriod?: string, newPropertyId?: string) => {
        setLoading(true);
        setError(null);
        try {
            const queryParams = new URLSearchParams();
            if (newPeriod) queryParams.append('period', newPeriod);
            if (newPropertyId) queryParams.append('propertyId', newPropertyId);

            const queryString = queryParams.toString();
            const endpoint = `/manager/finance/rent-collection${queryString ? `?${queryString}` : ''}`;

            const { status, json } = await apiGet(endpoint);
            if (status === 200 && json?.success) {
                setData(json.data);
            } else {
                setError(json?.message || 'Failed to load rent collection data');
            }
        } catch (err: any) {
            setError(err?.message || 'Network error');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData(period, propertyId);
    }, [period, propertyId]);

    const refetch = (newPeriod?: string, newPropertyId?: string) => {
        setPeriod(newPeriod);
        setPropertyId(newPropertyId);
    };

    return { data, loading, error, refetch };
};

export const useOutstandingRent = (initialPeriod?: string, initialPropertyId?: string): UseOutstandingRentReturn => {
    const [data, setData] = useState<OutstandingRentData | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [period, setPeriod] = useState(initialPeriod);
    const [propertyId, setPropertyId] = useState(initialPropertyId);

    const fetchData = async (newPeriod?: string, newPropertyId?: string) => {
        setLoading(true);
        setError(null);
        try {
            const queryParams = new URLSearchParams();
            if (newPeriod) queryParams.append('period', newPeriod);
            if (newPropertyId) queryParams.append('propertyId', newPropertyId);

            const queryString = queryParams.toString();
            const endpoint = `/manager/finance/outstanding-rent${queryString ? `?${queryString}` : ''}`;

            const { status, json } = await apiGet(endpoint);
            if (status === 200 && json?.success) {
                setData(json.data);
            } else {
                setError(json?.message || 'Failed to load outstanding rent data');
            }
        } catch (err: any) {
            setError(err?.message || 'Network error');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData(period, propertyId);
    }, [period, propertyId]);

    const refetch = (newPeriod?: string, newPropertyId?: string) => {
        setPeriod(newPeriod);
        setPropertyId(newPropertyId);
    };

    return { data, loading, error, refetch };
};

// Financial Statement Interfaces
export interface CashflowStatementData {
    period: string;
    operatingActivities: {
        inflows: {
            rentCollected: number;
            description: string;
        };
        outflows: {
            expenses: number;
            description: string;
        };
        netOperatingCashflow: number;
    };
    investingActivities: {
        inflows: number;
        outflows: number;
        netInvestingCashflow: number;
        description: string;
    };
    financingActivities: {
        inflows: number;
        outflows: number;
        netFinancingCashflow: number;
        description: string;
    };
    netCashflow: number;
    disclaimer: string;
}

export interface IncomeStatementData {
    period: string;
    revenue: {
        rentIncome: number;
        otherIncome: number;
        totalRevenue: number;
    };
    expenses: {
        operatingExpenses: number;
        maintenanceExpenses: number;
        administrativeExpenses: number;
        totalExpenses: number;
        description: string;
    };
    netIncome: number;
    disclaimer: string;
}

export interface FinancialPositionData {
    period: string;
    assets: {
        current: {
            cashReceivedInPeriod: number;
            rentReceivableForPeriod: number;
            totalCurrentAssets: number;
        };
        nonCurrent: {
            propertyPlantEquipment: number;
            totalNonCurrentAssets: number;
            description: string;
        };
        totalAssets: number;
    };
    liabilities: {
        current: {
            accountsPayable: number;
            totalCurrentLiabilities: number;
        };
        nonCurrent: {
            longTermDebt: number;
            totalNonCurrentLiabilities: number;
        };
        totalLiabilities: number;
        description: string;
    };
    equity: {
        retainedEarnings: number;
        totalEquity: number;
    };
    disclaimer: string;
}

// Financial Statement Hook Interfaces
interface UseFinancialStatementReturn<T> {
    data: T | null;
    loading: boolean;
    error: string | null;
    refetch: (period?: string, propertyId?: string) => void;
}

// Financial Statement Hooks
export const useCashflowStatement = (initialPeriod?: string, initialPropertyId?: string): UseFinancialStatementReturn<CashflowStatementData> => {
    const [data, setData] = useState<CashflowStatementData | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [period, setPeriod] = useState(initialPeriod);
    const [propertyId, setPropertyId] = useState(initialPropertyId);

    const fetchData = async (newPeriod?: string, newPropertyId?: string) => {
        setLoading(true);
        setError(null);
        try {
            const queryParams = new URLSearchParams();
            if (newPeriod) queryParams.append('period', newPeriod);
            if (newPropertyId) queryParams.append('propertyId', newPropertyId);

            const queryString = queryParams.toString();
            const endpoint = `/manager/finance/cashflow${queryString ? `?${queryString}` : ''}`;

            const { status, json } = await apiGet(endpoint);
            if (status === 200 && json?.success) {
                setData(json.data);
            } else {
                setError(json?.message || 'Failed to load cashflow statement data');
            }
        } catch (err: any) {
            setError(err?.message || 'Network error');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData(period, propertyId);
    }, [period, propertyId]);

    const refetch = (newPeriod?: string, newPropertyId?: string) => {
        setPeriod(newPeriod);
        setPropertyId(newPropertyId);
    };

    return { data, loading, error, refetch };
};

export const useIncomeStatement = (initialPeriod?: string, initialPropertyId?: string): UseFinancialStatementReturn<IncomeStatementData> => {
    const [data, setData] = useState<IncomeStatementData | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [period, setPeriod] = useState(initialPeriod);
    const [propertyId, setPropertyId] = useState(initialPropertyId);

    const fetchData = async (newPeriod?: string, newPropertyId?: string) => {
        setLoading(true);
        setError(null);
        try {
            const queryParams = new URLSearchParams();
            if (newPeriod) queryParams.append('period', newPeriod);
            if (newPropertyId) queryParams.append('propertyId', newPropertyId);

            const queryString = queryParams.toString();
            const endpoint = `/manager/finance/income-statement${queryString ? `?${queryString}` : ''}`;

            const { status, json } = await apiGet(endpoint);
            if (status === 200 && json?.success) {
                setData(json.data);
            } else {
                setError(json?.message || 'Failed to load income statement data');
            }
        } catch (err: any) {
            setError(err?.message || 'Network error');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData(period, propertyId);
    }, [period, propertyId]);

    const refetch = (newPeriod?: string, newPropertyId?: string) => {
        setPeriod(newPeriod);
        setPropertyId(newPropertyId);
    };

    return { data, loading, error, refetch };
};

export const useFinancialPosition = (initialPeriod?: string, initialPropertyId?: string): UseFinancialStatementReturn<FinancialPositionData> => {
    const [data, setData] = useState<FinancialPositionData | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [period, setPeriod] = useState(initialPeriod);
    const [propertyId, setPropertyId] = useState(initialPropertyId);

    const fetchData = async (newPeriod?: string, newPropertyId?: string) => {
        setLoading(true);
        setError(null);
        try {
            const queryParams = new URLSearchParams();
            if (newPeriod) queryParams.append('period', newPeriod);
            if (newPropertyId) queryParams.append('propertyId', newPropertyId);

            const queryString = queryParams.toString();
            const endpoint = `/manager/finance/financial-position${queryString ? `?${queryString}` : ''}`;

            const { status, json } = await apiGet(endpoint);
            if (status === 200 && json?.success) {
                setData(json.data);
            } else {
                setError(json?.message || 'Failed to load financial position data');
            }
        } catch (err: any) {
            setError(err?.message || 'Network error');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData(period, propertyId);
    }, [period, propertyId]);

    const refetch = (newPeriod?: string, newPropertyId?: string) => {
        setPeriod(newPeriod);
        setPropertyId(newPropertyId);
    };

    return { data, loading, error, refetch };
};
