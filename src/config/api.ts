import { Platform } from 'react-native';

/**
 * API Configuration
 * 
 * Priority order:
 * 1. EXPO_PUBLIC_API_URL from .env (if set)
 * 2. localhost:3002 (default for web/dev)
 * 
 * For LAN testing (phone on same network):
 * - Create .env file in project root
 * - Add: EXPO_PUBLIC_API_URL=http://YOUR_PC_IP:3002/api
 * - Example: EXPO_PUBLIC_API_URL=http://192.168.1.100:3002/api
 * - Restart Expo dev server after creating/modifying .env
 */

// Get API URL from environment or use localhost default
const getApiBaseUrl = (): string => {
  // Check for environment variable (set in .env)
  // @ts-ignore - process.env is injected by Expo/Metro bundler
  const envApiUrl = process.env.EXPO_PUBLIC_API_URL;

  if (envApiUrl) {
    return envApiUrl;
  }

  // Default to localhost for web/dev
  const defaultPort = 3002;
  return `http://localhost:${defaultPort}/api`;
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
