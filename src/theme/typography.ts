// EstateNet Typography System
// Clean, readable typography for all age groups

import { Platform } from 'react-native';

// System font family for professional appearance
const fontFamily = Platform.select({
    ios: 'System',
    android: 'Roboto',
    default: 'System',
});

export const Typography = {
    // Display - Large metrics and hero text
    display: {
        fontFamily,
        fontSize: 48,
        lineHeight: 56,
        fontWeight: '700' as const,
        letterSpacing: -0.5,
    },

    // Headings
    h1: {
        fontFamily,
        fontSize: 32,
        lineHeight: 40,
        fontWeight: '700' as const,
        letterSpacing: -0.5,
    },
    h2: {
        fontFamily,
        fontSize: 24,
        lineHeight: 32,
        fontWeight: '600' as const,
        letterSpacing: -0.25,
    },
    h3: {
        fontFamily,
        fontSize: 20,
        lineHeight: 28,
        fontWeight: '600' as const,
    },
    h4: {
        fontFamily,
        fontSize: 18,
        lineHeight: 24,
        fontWeight: '600' as const,
    },

    // Body Text
    bodyLarge: {
        fontFamily,
        fontSize: 16,
        lineHeight: 24,
        fontWeight: '400' as const,
    },
    body: {
        fontFamily,
        fontSize: 14,
        lineHeight: 20,
        fontWeight: '400' as const,
    },
    bodySmall: {
        fontFamily,
        fontSize: 12,
        lineHeight: 16,
        fontWeight: '400' as const,
    },

    // Special Purpose
    caption: {
        fontFamily,
        fontSize: 11,
        lineHeight: 14,
        fontWeight: '400' as const,
        letterSpacing: 0.3,
    },
    overline: {
        fontFamily,
        fontSize: 10,
        lineHeight: 12,
        fontWeight: '600' as const,
        letterSpacing: 1,
        textTransform: 'uppercase' as const,
    },

    // Interactive Elements
    button: {
        fontFamily,
        fontSize: 15,
        lineHeight: 20,
        fontWeight: '600' as const,
        letterSpacing: 0.15,
    },
    buttonSmall: {
        fontFamily,
        fontSize: 13,
        lineHeight: 18,
        fontWeight: '600' as const,
        letterSpacing: 0.15,
    },

    // Numbers and Metrics
    metric: {
        fontFamily,
        fontSize: 36,
        lineHeight: 44,
        fontWeight: '700' as const,
        letterSpacing: -0.5,
    },
    metricLabel: {
        fontFamily,
        fontSize: 13,
        lineHeight: 18,
        fontWeight: '500' as const,
        letterSpacing: 0.1,
    },
};

export const FontWeights = {
    regular: '400' as const,
    medium: '500' as const,
    semibold: '600' as const,
    bold: '700' as const,
};
