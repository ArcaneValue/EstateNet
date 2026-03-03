import { Platform } from 'react-native';

// API Configuration - Use current IP address
// Update this IP when your network changes
const CURRENT_IP = '10.79.234.41'; // Current PC IP address

export const API_CONFIG = {
  BASE_URL: `http://${CURRENT_IP}:3001/api`,
  TIMEOUT: 10000,
};

export const createApiUrl = (endpoint: string) => {
  const fullUrl = `${API_CONFIG.BASE_URL}${endpoint}`;
  console.log('[API] Request to:', fullUrl);
  return fullUrl;
};
