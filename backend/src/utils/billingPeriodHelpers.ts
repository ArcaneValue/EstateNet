// Centralized billing period helpers for Kampala timezone (UTC+3)

export const getCurrentBillingPeriod = (): string => {
    const kampalaOffset = 3 * 60 * 60 * 1000; // UTC+3
    const kampalaTime = new Date(new Date().getTime() + kampalaOffset);
    const year = kampalaTime.getUTCFullYear();
    const month = kampalaTime.getUTCMonth() + 1;
    return `${year}-${month.toString().padStart(2, '0')}`;
};

export const validateBillingPeriod = (period: string): boolean => {
    return /^\d{4}-\d{2}$/.test(period);
};

export const getPeriodDates = (period: string): { periodStart: Date; periodEnd: Date } => {
    const [year, month] = period.split('-').map(Number);
    const kampalaOffset = 3 * 60 * 60 * 1000; // UTC+3
    
    const periodStartUTC = new Date(Date.UTC(year, month - 1, 1, 0, 0, 0, 0));
    const periodStart = new Date(periodStartUTC.getTime() - kampalaOffset);
    
    const periodEndUTC = new Date(Date.UTC(year, month, 0, 23, 59, 59, 999));
    const periodEnd = new Date(periodEndUTC.getTime() - kampalaOffset);
    
    return { periodStart, periodEnd };
};

// Legacy helpers for backward compatibility
export const getBillingPeriodForDate = (referenceDate: Date) => {
    const year = referenceDate.getUTCFullYear();
    const month = referenceDate.getUTCMonth(); // 0-based
    return { year, month };
};

export const getDueDateForPeriod = (leaseStartDate: Date, year: number, month: number): Date => {
    const dueDay = leaseStartDate.getUTCDate();
    const daysInMonth = new Date(Date.UTC(year, month + 1, 0, 0, 0, 0, 0)).getUTCDate();
    const clampedDay = Math.min(dueDay, daysInMonth);
    return new Date(Date.UTC(year, month, clampedDay, 0, 0, 0, 0));
};
