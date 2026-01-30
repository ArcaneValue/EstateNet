// API Configuration
export const API_CONFIG = {
  // Change this for different environments
  BASE_URL: __DEV__
    ? (process.env.EXPO_PUBLIC_API_URL || 'http://localhost:3001/api')
    : (process.env.EXPO_PUBLIC_API_URL || 'https://your-production-api.com/api'),

  TIMEOUT: 10000,
};

export const createApiUrl = (endpoint: string) => {
  return `${API_CONFIG.BASE_URL}${endpoint}`;
};
