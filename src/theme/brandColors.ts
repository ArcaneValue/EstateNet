/**
 * EstateNet Brand Colors
 * Extracted from the official EN monogram logo (top-right concept)
 * 
 * Primary: Navy Blue - Professional, trustworthy, stable
 * Accent: Orange - Energy, warmth, action
 */

export const BrandColors = {
  // Primary - Navy Blue (from logo)
  navy: '#1F3A5F',
  navyLight: '#2D4A7C',
  navyDark: '#152840',

  // Accent - Orange (from logo)
  orange: '#F59E0B',
  orangeLight: '#FBBF24',
  orangeDark: '#D97706',

  // Premium backgrounds - softer, less bright
  premiumBg: '#E9EDF3', // Primary screen background - clean tech look
  premiumBgAlt: '#F3F1EC', // Alternative warmer background
  premiumCard: '#F5F7FA', // Card/container background - slightly lighter than main bg

  // Neutrals
  white: '#FFFFFF',
  offWhite: '#E9EDF3', // Updated to preferred tech-look background
  lightGray: '#E5E7EB',
  mediumGray: '#9CA3AF',
  darkGray: '#374151',
  charcoal: '#1F2937',
  black: '#111827',

  // Transparent overlays
  navyOverlay: 'rgba(31, 58, 95, 0.95)',
  navyOverlayLight: 'rgba(31, 58, 95, 0.85)',
  blackOverlay: 'rgba(0, 0, 0, 0.6)',
  whiteOverlay: 'rgba(255, 255, 255, 0.9)',
} as const;

export type BrandColorKey = keyof typeof BrandColors;
