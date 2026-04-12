import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { Payment, PaymentMethod, IncomeStatement, BalanceSheet, CashflowStatement } from '../types/types';
import { createApiUrl } from '../config/api';
import { useAuth } from './AuthContext';
import { apiGet } from '../utils/apiClient';

const PAYMENTS_STORAGE_KEY = 'estatenet_payments_v1';

const getAsyncStorage = () => {
    try {
        // eslint-disable-next-line @typescript-eslint/no-var-requires
        return require('@react-native-async-storage/async-storage').default;
    } catch {
        return null;
    }
};

interface PaymentContextType {
    payments: Payment[];
    paymentsLoading: boolean;
    paymentsError: string | null;
    rentStatus: TenantRentStatus | null;
    rentStatusLoading: boolean;
    rentStatusError: string | null;
    loadPayments: () => Promise<void>;
    loadRentStatus: () => Promise<void>;
    recordPayment: (payment: Omit<Payment, 'id'>) => Promise<void>;
    getPaymentsByTenant: (tenantId: string) => Payment[];
    getPaymentsByProperty: (propertyId: string) => Payment[];
    getTotalRentCollected: () => number;
    getRentCollectedByProperty: (propertyId: string) => number;
    getOutstandingRent: () => number;
    generateIncomeStatement: (startDate: Date, endDate: Date) => IncomeStatement;
    generateBalanceSheet: (asOfDate: Date) => BalanceSheet;
    generateCashflowStatement: (startDate: Date, endDate: Date) => CashflowStatement;
}

const PaymentContext = createContext<PaymentContextType | undefined>(undefined);

interface PaymentProviderProps {
    children: ReactNode;
}

interface TenantRentStatus {
    leaseId: string | null;
    propertyId: string | null;
    unitId: string | null;
    rentAmount: number | null;
    billingPeriod: string;
    dueDate: string | null;
    totalPaidForPeriod: number;
    amountDueForPeriod: number;
    arrearsTotal: number;
    status: 'PAID' | 'PARTIAL' | 'OVERDUE' | 'NOT_DUE' | 'NO_LEASE';
    daysUntilDue: number | null;
    daysOverdue: number | null;
}

export const PaymentProvider: React.FC<PaymentProviderProps> = ({ children }) => {
    const { user } = useAuth();
    const [payments, setPayments] = useState<Payment[]>([]);
    const [paymentsLoading, setPaymentsLoading] = useState(false);
    const [paymentsError, setPaymentsError] = useState<string | null>(null);
    const [rentStatus, setRentStatus] = useState<TenantRentStatus | null>(null);
    const [rentStatusLoading, setRentStatusLoading] = useState(false);
    const [rentStatusError, setRentStatusError] = useState<string | null>(null);

    const getAuthToken = async () => {
        const AsyncStorage = getAsyncStorage();
        if (AsyncStorage) {
            return await AsyncStorage.getItem('authToken');
        }
        return null;
    };

    const loadPayments = async (): Promise<void> => {
        if (!user) {
            setPayments([]);
            setPaymentsError(null);
            setPaymentsLoading(false);
            return;
        }

        // Only load payments for TENANT users
        if (user.role !== 'TENANT') {
            setPayments([]);
            setPaymentsError(null);
            setPaymentsLoading(false);
            return;
        }

        setPaymentsLoading(true);
        setPaymentsError(null);
        try {
            const response = await fetch(createApiUrl('/payments'), {
                headers: {
                    'Authorization': `Bearer ${await getAuthToken()}`
                }
            });

            if (response.ok) {
                const data = await response.json();
                if (data.success) {
                    setPayments(data.data || []);
                } else {
                    setPayments([]);
                    if (typeof data.message === 'string') {
                        setPaymentsError(data.message);
                    } else {
                        setPaymentsError('Failed to load payments');
                    }
                }
            } else {
                setPayments([]);
                setPaymentsError('Failed to load payments');
            }
        } catch (error: any) {
            console.error('Failed to load payments:', error);
            setPayments([]);
            setPaymentsError(error?.message || 'Network error while loading payments');
        } finally {
            setPaymentsLoading(false);
        }
    };

    useEffect(() => {
        loadPayments();
        loadRentStatus();
    }, [user]);

    const loadRentStatus = async (): Promise<void> => {
        if (!user) {
            setRentStatus(null);
            setRentStatusError(null);
            setRentStatusLoading(false);
            return;
        }

        // Only load rent status for TENANT users
        if (user.role !== 'TENANT') {
            setRentStatus(null);
            setRentStatusError(null);
            setRentStatusLoading(false);
            return;
        }

        setRentStatusLoading(true);
        setRentStatusError(null);
        try {
            const { status, json } = await apiGet('/tenant/me/rent-status');
            if (status === 200 && json) {
                const payload: any = json;
                if (payload.success) {
                    setRentStatus(payload.data ?? null);
                } else {
                    setRentStatus(null);
                    if (typeof payload.message === 'string') {
                        setRentStatusError(payload.message);
                    } else {
                        setRentStatusError('Failed to load rent status');
                    }
                }
            } else {
                setRentStatus(null);
                setRentStatusError('Failed to load rent status');
            }
        } catch (error: any) {
            console.error('Failed to load rent status:', error);
            setRentStatus(null);
            setRentStatusError(error?.message || 'Network error while loading rent status');
        } finally {
            setRentStatusLoading(false);
        }
    };

    const recordPayment = async (paymentData: Omit<Payment, 'id'>) => {
        if (!user) {
            setPayments([]);
            return;
        }

        try {
            const response = await fetch(createApiUrl('/payments'), {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${await getAuthToken()}`
                },
                body: JSON.stringify({
                    amount: paymentData.amount,
                    paymentDate: paymentData.paymentDate,
                    dueDate: paymentData.paymentDate, // Use same date for now
                    paymentMethod: paymentData.paymentMethod,
                    transactionId: paymentData.notes
                })
            });

            if (response.ok) {
                const data = await response.json();
                if (data.success) {
                    await Promise.all([loadPayments(), loadRentStatus()]);
                } else if (typeof data.message === 'string') {
                    setPaymentsError(data.message);
                }
            } else {
                setPaymentsError('Failed to record payment');
            }
        } catch (error: any) {
            console.error('Failed to record payment:', error);
            setPaymentsError(error?.message || 'Network error while recording payment');
        }
    };

    const getPaymentsByTenant = (tenantId: string): Payment[] => {
        return payments.filter(payment => payment.tenantId === tenantId);
    };

    const getPaymentsByProperty = (propertyId: string): Payment[] => {
        return payments.filter(payment => payment.propertyId === propertyId);
    };

    const getTotalRentCollected = (): number => {
        return payments.reduce((total, payment) => total + payment.amount, 0);
    };

    const getRentCollectedByProperty = (propertyId: string): number => {
        return getPaymentsByProperty(propertyId).reduce(
            (total, payment) => total + payment.amount,
            0
        );
    };

    const getOutstandingRent = (): number => {
        // TODO: backend endpoint needed
        return 0;
    };

    const generateIncomeStatement = (startDate: Date, endDate: Date): IncomeStatement => {
        const paymentsInPeriod = payments.filter(
            payment => new Date(payment.paymentDate) >= startDate && new Date(payment.paymentDate) <= endDate
        );

        const totalRentalIncome = paymentsInPeriod.reduce(
            (total, payment) => total + payment.amount,
            0
        );

        // Mock data for demonstration
        const operatingExpenses = {
            maintenance: 1200000,
            utilities: 800000,
            management: 500000,
            insurance: 300000,
            other: 200000,
        };

        const totalExpenses = Object.values(operatingExpenses).reduce((a, b) => a + b, 0);

        return {
            totalRentalIncome,
            otherIncome: 0,
            operatingExpenses,
            netOperatingIncome: totalRentalIncome - totalExpenses,
            period: { startDate, endDate },
        };
    };

    const generateBalanceSheet = (asOfDate: Date): BalanceSheet => {
        // Mock data for demonstration
        const assets = {
            propertyValues: 500000000,
            cash: 15000000,
            accountsReceivable: 2400000,
            other: 1000000,
        };

        const liabilities = {
            mortgages: 250000000,
            accountsPayable: 1500000,
            securityDeposits: 8700000,
            other: 500000,
        };

        const totalAssets = Object.values(assets).reduce((a, b) => a + b, 0);
        const totalLiabilities = Object.values(liabilities).reduce((a, b) => a + b, 0);

        return {
            assets,
            liabilities,
            equity: totalAssets - totalLiabilities,
            asOfDate,
        };
    };

    const generateCashflowStatement = (startDate: Date, endDate: Date): CashflowStatement => {
        const paymentsInPeriod = payments.filter(
            payment => new Date(payment.paymentDate) >= startDate && new Date(payment.paymentDate) <= endDate
        );

        const rentCollected = paymentsInPeriod.reduce(
            (total, payment) => total + payment.amount,
            0
        );

        // Mock data for demonstration
        const operatingActivities = {
            rentCollected,
            expensesPaid: -3000000,
            net: rentCollected - 3000000,
        };

        const investingActivities = {
            propertyPurchases: 0,
            propertyImprovements: -2000000,
            net: -2000000,
        };

        const financingActivities = {
            loanProceeds: 0,
            loanPayments: -5000000,
            net: -5000000,
        };

        return {
            operatingActivities,
            investingActivities,
            financingActivities,
            netCashChange:
                operatingActivities.net + investingActivities.net + financingActivities.net,
            period: { startDate, endDate },
        };
    };

    const value: PaymentContextType = {
        payments,
        paymentsLoading,
        paymentsError,
        rentStatus,
        rentStatusLoading,
        rentStatusError,
        loadPayments,
        loadRentStatus,
        recordPayment,
        getPaymentsByTenant,
        getPaymentsByProperty,
        getTotalRentCollected,
        getRentCollectedByProperty,
        getOutstandingRent,
        generateIncomeStatement,
        generateBalanceSheet,
        generateCashflowStatement,
    };

    return <PaymentContext.Provider value={value}>{children}</PaymentContext.Provider>;
};

export const usePayments = (): PaymentContextType => {
    const context = useContext(PaymentContext);
    if (!context) {
        throw new Error('usePayments must be used within a PaymentProvider');
    }
    return context;
};
