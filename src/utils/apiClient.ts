import { createApiUrl } from '../config/api';

// Reuse AsyncStorage access pattern from PaymentContext
const getAsyncStorage = () => {
  try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    return require('@react-native-async-storage/async-storage').default;
  } catch {
    return null;
  }
};

export const apiPatch = async (endpoint: string, body?: any) => {
  const token = await getAuthToken();

  try {
    const response = await fetch(createApiUrl(endpoint), {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: body ? JSON.stringify(body) : undefined,
    });

    let json: any = null;
    try {
      json = await response.json();
    } catch {
      // Ignore JSON parse errors
    }

    return { status: response.status, json };
  } catch (error) {
    console.error('API PATCH error:', error);
    return { status: 0, json: null };
  }
};

export const getAuthToken = async (): Promise<string | null> => {
  const AsyncStorage = getAsyncStorage();
  if (AsyncStorage) {
    return await AsyncStorage.getItem('authToken');
  }
  return null;
};

const safeParseJson = (text: string) => {
  try {
    return JSON.parse(text);
  } catch {
    return { success: false, message: 'Non-JSON response' };
  }
};

export const apiGet = async (endpoint: string) => {
  const token = await getAuthToken();
  const res = await fetch(createApiUrl(endpoint), {
    headers: token ? { Authorization: `Bearer ${token}` } : undefined,
  });
  const text = await res.text();
  const json = text ? safeParseJson(text) : null;
  return { status: res.status, json };
};

export const apiPost = async (endpoint: string, body?: any) => {
  const token = await getAuthToken();
  const res = await fetch(createApiUrl(endpoint), {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
  const text = await res.text();
  const json = text ? safeParseJson(text) : null;
  return { status: res.status, json };
};

export const apiDelete = async (endpoint: string) => {
  const token = await getAuthToken();
  const res = await fetch(createApiUrl(endpoint), {
    method: 'DELETE',
    headers: token ? { Authorization: `Bearer ${token}` } : undefined,
  });
  const text = await res.text();
  const json = text ? safeParseJson(text) : null;
  return { status: res.status, json };
};
