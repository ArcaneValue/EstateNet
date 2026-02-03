import { Platform } from 'react-native';

// API Configuration - FORCE LOCALHOST FOR LAPTOP TESTING
// When testing on your laptop, use: http://localhost:3001/api
// When testing on physical device, update to your PC's LAN IP

// OVERRIDE: Set this to your backend URL
const FORCE_LOCALHOST = true; // Set to false when testing on physical device

const getBaseUrl = () => {
  if (FORCE_LOCALHOST) {
    console.log('[API Config] Using localhost for laptop testing');
    return 'http://localhost:3001/api';
  }

  // For physical device testing
  const LAN_IP = '192.168.1.100'; // <-- CHANGE THIS to your PC's IP
  return `http://${LAN_IP}:3001/api`;
};

export const API_CONFIG = {
  BASE_URL: getBaseUrl(),
  TIMEOUT: 10000,
};

// For manual override via environment variable
export const createApiUrl = (endpoint: string) => {
  const baseUrl = process.env.EXPO_PUBLIC_API_URL || API_CONFIG.BASE_URL;
  const fullUrl = `${baseUrl}${endpoint}`;
  console.log('[API] Request to:', fullUrl);
  return fullUrl;
};
