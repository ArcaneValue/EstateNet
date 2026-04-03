import { Platform } from 'react-native';

/**
 * API Configuration
 * 
 * IMPORTANT: Backend server must be running on port 3001
 * Start backend: cd backend && npm run dev
 * 
 * ENVIRONMENTS:
 * - 'dev': Local development (localhost or machine IP)
 * - 'beta': Beta testing with ngrok tunnel (for external testers)
 * - 'prod': Production deployment (cloud hosting)
 * 
 * Priority order:
 * 1. EXPO_PUBLIC_API_URL from .env (if set)
 * 2. CURRENT_ENV setting below
 * 3. Platform-specific defaults
 */

// ============================================
// 🔧 CONFIGURATION - CHANGE THIS FOR BETA TESTING
// ============================================
type Environment = 'dev' | 'beta' | 'prod';

// ⚠️ CHANGE THIS to switch environments
const CURRENT_ENV: Environment = 'beta'; // Set to 'beta' for external testing

// Beta testing ngrok URL (get from: ngrok http 3001)
// Example: 'https://abc123def456.ngrok-free.app'
const NGROK_URL = 'https://nonstanzaic-unlovably-collin.ngrok-free.dev'; // ← Your ngrok URL

// Production URL (when deployed to cloud)
const PRODUCTION_URL = 'https://estatenet.onrender.com';

// ============================================

// Machine IP for Android development (update this to your current IP if it changes)
// Hotspot IP: 192.168.137.1 (hotspot gateway IP - always this for Windows hotspot)
// WiFi IP: 192.168.0.105 (when on same WiFi network)
const DEVELOPMENT_MACHINE_IP = '192.168.137.1';

// Environment configurations
const ENV_CONFIG = {
  dev: {
    // Local development - use localhost or machine IP
    getUrl: () => {
      if (Platform.OS === 'android') {
        return `http://${DEVELOPMENT_MACHINE_IP}:3001/api`;
      }
      return 'http://localhost:3001/api';
    },
  },
  beta: {
    // Beta testing - use ngrok tunnel (works for all platforms)
    getUrl: () => `${NGROK_URL}/api`,
  },
  prod: {
    // Production - use cloud hosting URL
    getUrl: () => `${PRODUCTION_URL}/api`,
  },
};

// Get API URL from environment or use configured environment
const getApiBaseUrl = (): string => {
  // Check for environment variable (set in .env) - this overrides everything
  // @ts-ignore - process.env is injected by Expo/Metro bundler
  const envApiUrl = process.env.EXPO_PUBLIC_API_URL;

  if (envApiUrl) {
    return envApiUrl;
  }

  // Use configured environment
  return ENV_CONFIG[CURRENT_ENV].getUrl();
};

const BASE_URL = getApiBaseUrl();

// Log the chosen API URL on startup
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
console.log('🌐 API Configuration');
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
console.log(`📍 Base URL: ${BASE_URL}`);
// @ts-ignore
console.log(`🔧 Source: ${process.env.EXPO_PUBLIC_API_URL ? '.env file' : `${CURRENT_ENV} environment`}`);
console.log(`🌍 Environment: ${CURRENT_ENV.toUpperCase()}`);
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
