/**
 * Currency and number formatting utilities
 */

/**
 * Format amount in UGX with commas
 * @example formatUGX(1200000) => "UGX 1,200,000"
 */
export const formatUGX = (amount: number): string => {
    return `UGX ${amount.toLocaleString('en-US')}`;
};

/**
 * Format a number in compact form (K/M/B) with smart decimal handling
 * @example formatCompactNumber(999) => "999"
 * @example formatCompactNumber(1000) => "1K"
 * @example formatCompactNumber(1200) => "1.2K"
 * @example formatCompactNumber(12000) => "12K"
 * @example formatCompactNumber(12500) => "12.5K"
 * @example formatCompactNumber(250000) => "250K"
 * @example formatCompactNumber(1000000) => "1M"
 * @example formatCompactNumber(1200000) => "1.2M"
 * @example formatCompactNumber(10000000) => "10M"
 * @example formatCompactNumber(-1200000) => "-1.2M"
 */
export const formatCompactNumber = (value: number): string => {
    const isNegative = value < 0;
    const absValue = Math.abs(value);

    // Handle zero
    if (absValue === 0) {
        return '0';
    }

    // Less than 1,000: show full number
    if (absValue < 1000) {
        return value.toString();
    }

    let divisor: number;
    let unit: string;

    // Determine unit and divisor
    if (absValue >= 1000000000) {
        divisor = 1000000000;
        unit = 'B';
    } else if (absValue >= 1000000) {
        divisor = 1000000;
        unit = 'M';
    } else {
        divisor = 1000;
        unit = 'K';
    }

    // Divide and round to 1 decimal
    const result = absValue / divisor;
    const rounded = Math.round(result * 10) / 10;

    // Format: remove trailing .0
    const formatted = rounded % 1 === 0 ? rounded.toFixed(0) : rounded.toFixed(1);

    return `${isNegative ? '-' : ''}${formatted}${unit}`;
};

/**
 * Format amount in UGX with compact notation (K/M/B)
 * @example formatCompactCurrencyUGX(0) => "UGX 0"
 * @example formatCompactCurrencyUGX(999) => "UGX 999"
 * @example formatCompactCurrencyUGX(1000) => "UGX 1K"
 * @example formatCompactCurrencyUGX(1200) => "UGX 1.2K"
 * @example formatCompactCurrencyUGX(250000) => "UGX 250K"
 * @example formatCompactCurrencyUGX(1000000) => "UGX 1M"
 * @example formatCompactCurrencyUGX(1200000) => "UGX 1.2M"
 * @example formatCompactCurrencyUGX(-1200000) => "UGX -1.2M"
 */
export const formatCompactCurrencyUGX = (amount: number): string => {
    return `UGX ${formatCompactNumber(amount)}`;
};

/**
 * Legacy: Format large amounts in compact form (millions)
 * @deprecated Use formatCompactCurrencyUGX instead
 * @example formatUGXCompact(1200000) => "UGX 1.2M"
 */
export const formatUGXCompact = (amount: number): string => {
    return formatCompactCurrencyUGX(amount);
};

/**
 * Format percentage with one decimal
 * @example formatPercentage(85.5) => "85.5%"
 */
export const formatPercentage = (value: number): string => {
    return `${value.toFixed(1)}%`;
};

/**
 * Format occupancy ratio
 * @example formatOccupancy(8, 10) => "8/10"
 */
export const formatOccupancy = (occupied: number, total: number): string => {
    return `${occupied}/${total}`;
};

/**
 * Format member since date from createdAt timestamp
 * @example formatMemberSince("2024-01-15T10:30:00Z") => "January 2024"
 */
export const formatMemberSince = (createdAt?: string): string => {
    if (!createdAt) {
        // Log critical error if Sentry is available
        if (typeof window !== 'undefined' && (window as any).Sentry) {
            (window as any).Sentry.captureMessage('[Profile] Missing createdAt timestamp', 'error');
        } else {
            console.error('[Profile] Missing createdAt timestamp');
        }
        // Fallback to current month
        return new Date().toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
    }
    return new Date(createdAt).toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
};
