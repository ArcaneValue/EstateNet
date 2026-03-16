// EstateNet Color System
// Navy & Orange palette from official brand logo

export const Colors = {
  light: {
    // Primary - Navy Blue (from brand logo)
    primary: '#1F3A5F',
    primaryLight: '#2D4A7C',
    primaryDark: '#152840',

    // Accent - Orange (from brand logo)
    accent: '#F59E0B',
    accentLight: '#FBBF24',
    accentDark: '#D97706',

    // Backgrounds
    background: '#F3F4F6',
    surface: '#FFFFFF',
    surface2: '#F9FAFB',
    surfaceElevated: '#FFFFFF',
    surfaceGlass: 'rgba(255, 255, 255, 0.85)',

    // Text
    text: '#111827',
    textSecondary: '#6B7280',
    textTertiary: '#9CA3AF',
    textMuted: '#9CA3AF',
    textOnPrimary: '#FFFFFF',
    textOnAccent: '#FFFFFF',

    // Semantic Colors
    success: '#059669',
    successLight: '#D1FAE5',
    warning: '#D97706',
    warningLight: '#FEF3C7',
    error: '#DC2626',
    errorLight: '#FEE2E2',
    info: '#2563EB',
    infoLight: '#DBEAFE',

    // Status Colors
    available: '#059669',
    occupied: '#2563EB',
    pending: '#D97706',
    overdue: '#DC2626',

    // UI Elements
    border: '#E5E7EB',
    borderLight: '#F3F4F6',
    borderStrong: '#D1D5DB',
    divider: '#E5E7EB',
    shadow: '#00000020',
    overlay: 'rgba(17, 24, 39, 0.6)',

    // Interactive
    cardHover: '#F9FAFB',
    pressed: '#E5E7EB',

    // Glass effect colors
    glassBorder: 'rgba(255, 255, 255, 0.3)',
    glassBackground: 'rgba(255, 255, 255, 0.75)',
  },

  dark: {
    // Primary - Lighter Navy for dark mode
    primary: '#4A6FA5',
    primaryLight: '#6B8FC7',
    primaryDark: '#2D4A7C',

    // Accent - Brighter Orange for dark mode
    accent: '#FBBF24',
    accentLight: '#FCD34D',
    accentDark: '#F59E0B',

    // Backgrounds
    background: '#0F1419',
    surface: '#1A1F2E',
    surface2: '#252B3B',
    surfaceElevated: '#2D3548',
    surfaceGlass: 'rgba(26, 31, 46, 0.85)',

    // Text
    text: '#F9FAFB',
    textSecondary: '#D1D5DB',
    textTertiary: '#9CA3AF',
    textMuted: '#9CA3AF',
    textOnPrimary: '#111827',
    textOnAccent: '#111827',

    // Semantic Colors
    success: '#34D399',
    successLight: '#064E3B',
    warning: '#FBBF24',
    warningLight: '#78350F',
    error: '#F87171',
    errorLight: '#7F1D1D',
    info: '#60A5FA',
    infoLight: '#1E3A8A',

    // Status Colors
    available: '#34D399',
    occupied: '#60A5FA',
    pending: '#FBBF24',
    overdue: '#F87171',

    // UI Elements
    border: '#374151',
    borderLight: '#1F2937',
    borderStrong: '#4B5563',
    divider: '#374151',
    shadow: '#00000060',
    overlay: 'rgba(0, 0, 0, 0.8)',

    // Interactive
    cardHover: '#252B3B',
    pressed: '#1F2937',

    // Glass effect colors
    glassBorder: 'rgba(255, 255, 255, 0.1)',
    glassBackground: 'rgba(26, 31, 46, 0.75)',
  },
};

export type Theme = 'light' | 'dark';
export type ColorScheme = typeof Colors.light;
