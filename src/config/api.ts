import { Platform } from 'react-native';

/**
 * API Configuration
 * 
 * IMPORTANT: Backend server must be running on port 3001
 * Start backend: cd backend && npm run dev
 * 
 * Priority order:
 * 1. EXPO_PUBLIC_API_URL from .env (if set)
 * 2. Platform-specific defaults:
 *    - Web: http://localhost:3001/api
 *    - Android: http://YOUR_MACHINE_IP:3001/api
 *    - iOS: http://localhost:3001/api
 * 
 * For production builds, set EXPO_PUBLIC_API_URL in .env to your production API URL
 */

// Machine IP for Android development (update this to your current IP if it changes)
// Hotspot IP: 192.168.137.1 (hotspot gateway IP - always this for Windows hotspot)
// WiFi IP: 192.168.0.105 (when on same WiFi network)
const DEVELOPMENT_MACHINE_IP = '192.168.137.1';

// Get API URL from environment or use platform-specific default
const getApiBaseUrl = (): string => {
  // Check for environment variable (set in .env)
  // @ts-ignore - process.env is injected by Expo/Metro bundler
  const envApiUrl = process.env.EXPO_PUBLIC_API_URL;

  if (envApiUrl) {
    return envApiUrl;
  }

  // Platform-specific defaults for development
  // Android emulator/device cannot access localhost, must use machine IP
  if (Platform.OS === 'android') {
    return `http://${DEVELOPMENT_MACHINE_IP}:3001/api`;
  }

  // Web and iOS simulator can use localhost
  return 'http://localhost:3001/api';
};

const BASE_URL = getApiBaseUrl();

// Log the chosen API URL on startup
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
console.log('🌐 API Configuration');
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
console.log(`📍 Base URL: ${BASE_URL}`);
// @ts-ignore
console.log(`🔧 Source: ${process.env.EXPO_PUBLIC_API_URL ? '.env file' : 'default (localhost)'}`);
console.log(`📱 Platform: ${Platform.OS}`);
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

export const API_CONFIG = {
  BASE_URL,
  TIMEOUT: 10000,
};

export const createApiUrl = (endpoint: string) => {
  const fullUrl = `${API_CONFIG.BASE_URL}${endpoint}`;
  return fullUrl;
};
