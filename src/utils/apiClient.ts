import { createApiUrl } from '../config/api';

export type EnforcementAction = 'ACCEPT_TERMS' | 'PAY_INVOICE';

export type EnforcementInfo = {
  action: EnforcementAction;
  message?: string;
  graceUntil?: string;
};

export type ApiResult<TJson = any> = {
  status: number;
  json: TJson;
  enforcement?: EnforcementInfo;
};

// Reuse AsyncStorage access pattern from PaymentContext
const getAsyncStorage = () => {
  try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    return require('@react-native-async-storage/async-storage').default;
  } catch {
    return null;
  }
};

const extractEnforcement = (status: number, json: any): EnforcementInfo | undefined => {
  if (status !== 402) return undefined;
  const action = json?.requiresAction;
  if (action !== 'ACCEPT_TERMS' && action !== 'PAY_INVOICE') return undefined;

  return {
    action,
    message: typeof json?.message === 'string' ? json.message : undefined,
    graceUntil: typeof json?.graceUntil === 'string' ? json.graceUntil : undefined,
  };
};


export const apiPatch = async (endpoint: string, body?: any): Promise<ApiResult> => {
  const token = await getAuthToken();
  const res = await fetch(createApiUrl(endpoint), {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  const text = await res.text();
  const json = text ? safeParseJson(text) : null;

  // Handle authentication errors - only logout on 401 (unauthorized)
  // 403 (forbidden) might just mean user doesn't have permission for specific resource
  if (res.status === 401) {
    console.warn('Authentication error (401) - logging out');
    const AsyncStorage = getAsyncStorage();
    if (AsyncStorage) {
      await AsyncStorage.multiRemove(['authToken', 'user']);
    }
    // Force reload to clear authentication state
    if (typeof window !== 'undefined') {
      window.location.reload();
    }
  }

  return { status: res.status, json, enforcement: extractEnforcement(res.status, json) };
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

export const apiGet = async (endpoint: string): Promise<ApiResult> => {
  const token = await getAuthToken();
  const res = await fetch(createApiUrl(endpoint), {
    headers: token ? { Authorization: `Bearer ${token}` } : undefined,
  });
  const text = await res.text();
  const json = text ? safeParseJson(text) : null;

  // Handle authentication errors - only logout on 401 (unauthorized)
  // 403 (forbidden) might just mean user doesn't have permission for specific resource
  if (res.status === 401) {
    console.warn('Authentication error (401) - logging out');
    const AsyncStorage = getAsyncStorage();
    if (AsyncStorage) {
      await AsyncStorage.multiRemove(['authToken', 'user']);
    }
    // Force reload to clear authentication state
    if (typeof window !== 'undefined') {
      window.location.reload();
    }
  }

  return { status: res.status, json, enforcement: extractEnforcement(res.status, json) };
};

export const apiPost = async (endpoint: string, body?: any): Promise<ApiResult> => {
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

  // Handle authentication errors - only logout on 401 (unauthorized)
  // 403 (forbidden) might just mean user doesn't have permission for specific resource
  if (res.status === 401) {
    console.warn('Authentication error (401) - logging out');
    const AsyncStorage = getAsyncStorage();
    if (AsyncStorage) {
      await AsyncStorage.multiRemove(['authToken', 'user']);
    }
    // Force reload to clear authentication state
    if (typeof window !== 'undefined') {
      window.location.reload();
    }
  }

  return { status: res.status, json, enforcement: extractEnforcement(res.status, json) };
};

export const apiDelete = async (endpoint: string): Promise<ApiResult> => {
  const token = await getAuthToken();
  const res = await fetch(createApiUrl(endpoint), {
    method: 'DELETE',
    headers: token ? { Authorization: `Bearer ${token}` } : undefined,
  });
  const text = await res.text();
  const json = text ? safeParseJson(text) : null;

  // Handle authentication errors - only logout on 401 (unauthorized)
  // 403 (forbidden) might just mean user doesn't have permission for specific resource
  if (res.status === 401) {
    console.warn('Authentication error (401) - logging out');
    const AsyncStorage = getAsyncStorage();
    if (AsyncStorage) {
      await AsyncStorage.multiRemove(['authToken', 'user']);
    }
    // Force reload to clear authentication state
    if (typeof window !== 'undefined') {
      window.location.reload();
    }
  }

  return { status: res.status, json, enforcement: extractEnforcement(res.status, json) };
};
