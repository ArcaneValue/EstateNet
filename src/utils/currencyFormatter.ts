/**
 * Currency formatting utility for displaying amounts with K and M units
 * 1,000 = 1K
 * 100,000 = 100K
 * 1,000,000 = 1M
 * 10,000,000 = 10M
 */

export const formatCurrency = (amount: number, showFullAmount: boolean = false): string => {
    if (showFullAmount) {
        return amount.toLocaleString();
    }

    if (amount >= 1000000) {
        const millions = amount / 1000000;
        // Show up to 2 decimal places for millions, but remove trailing zeros
        const formatted = millions % 1 === 0 ? millions.toString() : millions.toFixed(2).replace(/\.?0+$/, '');
        return `${formatted}M`;
    } else if (amount >= 1000) {
        const thousands = amount / 1000;
        // Show up to 2 decimal places for thousands, but remove trailing zeros
        const formatted = thousands % 1 === 0 ? thousands.toString() : thousands.toFixed(2).replace(/\.?0+$/, '');
        return `${formatted}K`;
    } else {
        return amount.toString();
    }
};

/**
 * Format currency with UGX prefix
 */
export const formatUGX = (amount: number, showFullAmount: boolean = false): string => {
    return `UGX ${formatCurrency(amount, showFullAmount)}`;
};

/**
 * Parse formatted currency back to number
 * Handles: 1K, 100K, 1.5M, etc.
 */
export const parseCurrency = (formatted: string): number => {
    const clean = formatted.replace(/[^0-9.KM]/g, '').toUpperCase();

    if (clean.endsWith('M')) {
        return parseFloat(clean.slice(0, -1)) * 1000000;
    } else if (clean.endsWith('K')) {
        return parseFloat(clean.slice(0, -1)) * 1000;
    } else {
        return parseFloat(clean) || 0;
    }
};

/**
 * Get the full amount with proper formatting for display
 */
export const formatFullCurrency = (amount: number): string => {
    return `UGX ${amount.toLocaleString()}`;
};

/**
 * Format for input fields (allows editing with K/M notation)
 */
export const formatCurrencyInput = (amount: number): string => {
    return formatCurrency(amount);
};

/**
 * Validate and parse currency input
 */
export const validateCurrencyInput = (input: string): { isValid: boolean; amount: number; error?: string } => {
    if (!input.trim()) {
        return { isValid: false, amount: 0, error: 'Amount is required' };
    }

    try {
        const amount = parseCurrency(input);
        if (amount < 0) {
            return { isValid: false, amount: 0, error: 'Amount cannot be negative' };
        }
        if (amount > 999999999) {
            return { isValid: false, amount: 0, error: 'Amount is too large' };
        }
        return { isValid: true, amount };
    } catch (error) {
        return { isValid: false, amount: 0, error: 'Invalid amount format' };
    }
};
