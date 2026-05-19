import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { createApiUrl } from '../config/api';
import * as SecureStore from 'expo-secure-store';

let AsyncStorage: any;
try {
    AsyncStorage = require('@react-native-async-storage/async-storage').default;
} catch (e) {
    AsyncStorage = {
        getItem: async () => null,
        setItem: async () => { },
        removeItem: async () => { },
        multiRemove: async () => { },
    };
}

// Secure storage wrapper for sensitive data
const SecureStorage = {
    async setItem(key: string, value: string): Promise<void> {
        try {
            await SecureStore.setItemAsync(key, value);
        } catch (error) {
            console.error(`SecureStore setItem failed for ${key}:`, error);
            await AsyncStorage.setItem(key, value);
        }
    },
    async getItem(key: string): Promise<string | null> {
        try {
            return await SecureStore.getItemAsync(key);
        } catch (error) {
            console.error(`SecureStore getItem failed for ${key}:`, error);
            return await AsyncStorage.getItem(key);
        }
    },
    async removeItem(key: string): Promise<void> {
        try {
            await SecureStore.deleteItemAsync(key);
        } catch (error) {
            console.error(`SecureStore removeItem failed for ${key}:`, error);
            await AsyncStorage.removeItem(key);
        }
    },
}

export type UserRole = 'OWNER' | 'MANAGER' | 'TENANT';

interface User {
    id: string;
    name: string;
    email: string;
    role: UserRole;
    phoneNumber?: string;
    tenantId?: string;
    profileImage?: string;
    createdAt?: string;
    // Manager payout fields
    payoutPhoneNumber?: string;
    payoutNetwork?: string;
    // Optional notification preferences persisted on backend
    notificationPrefs?: {
        payments?: boolean;
        messages?: boolean;
        invitations?: boolean;
    };
    // Tutorial flags for persistent tutorial tracking
    tutorialFlags?: {
        [key: string]: boolean;
    };
    // Admin fields
    isAdmin?: boolean;
    adminPermissions?: {
        isSuperAdmin?: boolean;
        canManagePosts?: boolean;
        canManageUsers?: boolean;
        canViewAnalytics?: boolean;
    };
}

// Test credentials
const TEST_CREDENTIALS = {
    email: 'muculezi@gmail.com',
    password: 'Ak47grave',
    tenantId: 'QW12ER34TY',
};

// Utility function to generate unique 10-character alphanumeric tenant ID
export const generateTenantId = (): string => {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let id = '';
    for (let i = 0; i < 10; i++) {
        id += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return id;
};

interface AuthContextType {
    user: User | null;
    token: string | null;
    isAuthenticated: boolean;
    isLoading: boolean;
    signIn: (email: string, password: string) => Promise<void>;
    signUp: (userData: Partial<User>, password: string, role?: UserRole) => Promise<void>;
    signOut: () => Promise<void>;
    setUserRole: (role: UserRole) => void;
    refreshMe: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

interface AuthProviderProps {
    children: ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
    const [user, setUser] = useState<User | null>(null);
    const [token, setToken] = useState<string | null>(null);
    const [selectedRole, setSelectedRole] = useState<UserRole>('MANAGER');
    const [isLoading, setIsLoading] = useState(true);

    // Load persisted user on app launch
    useEffect(() => {
        const loadPersistedUser = async () => {
            try {
                const storedUser = await SecureStorage.getItem('user');
                const storedToken = await SecureStorage.getItem('authToken');

                if (storedUser && storedToken) {
                    // Validate token by making a test API call
                    try {
                        const response = await fetch(createApiUrl('/users/me'), {
                            headers: {
                                'Content-Type': 'application/json',
                                Authorization: `Bearer ${storedToken}`,
                            },
                        });

                        if (response.ok) {
                            const userData = JSON.parse(storedUser);
                            // Keep role as-is (uppercase from backend)
                            setUser(userData);
                            setToken(storedToken);
                        } else {
                            // Token is invalid, clear storage
                            await SecureStorage.removeItem('authToken');
                            await SecureStorage.removeItem('user');
                        }
                    } catch (error) {
                        console.error('Token validation failed:', error);
                        // Clear invalid token
                        await SecureStorage.removeItem('authToken');
                        await SecureStorage.removeItem('user');
                    }
                }
            } catch (error) {
                console.error('Failed to load persisted user:', error);
            } finally {
                setIsLoading(false);
            }
        };

        loadPersistedUser();
    }, []);

    const signIn = async (email: string, password: string) => {
        try {
            const body = `email=${encodeURIComponent(email)}&password=${encodeURIComponent(password)}`;

            const response = await fetch(createApiUrl('/auth/login'), {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded',
                },
                body: body,
            });

            const data = await response.json();

            if (!data.success) {
                throw new Error(data.message || 'Login failed');
            }

            const { user: userData, token } = data.data;

            // Use role directly from backend (now uppercase)
            const normalizedUser: User = {
                ...userData,
                role: userData.role as UserRole
            };

            // Store token securely
            await SecureStorage.setItem('authToken', token);
            setToken(token);

            setUser(normalizedUser);
            // Persist user to SecureStorage
            await SecureStorage.setItem('user', JSON.stringify(normalizedUser));
        } catch (error) {
            console.error('Login error:', error);
            throw error;
        }
    };

    const signUp = async (userData: Partial<User>, password: string, role?: UserRole) => {
        try {
            const userRole = role || selectedRole;
            let endpoint: string;

            if (userRole === 'OWNER') {
                endpoint = '/auth/register-owner';
            } else if (userRole === 'MANAGER') {
                endpoint = '/auth/register/manager';
            } else {
                endpoint = '/auth/register-tenant';
            }

            const body = `name=${encodeURIComponent(userData.name || '')}&email=${encodeURIComponent(userData.email || '')}&phoneNumber=${encodeURIComponent(userData.phoneNumber || '')}&password=${encodeURIComponent(password)}`;

            const response = await fetch(createApiUrl(endpoint), {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded',
                },
                body: body,
            });

            const data = await response.json();

            if (!data.success) {
                const error: any = new Error(data.message || 'Registration failed');
                error.status = response.status;
                error.rawBody = JSON.stringify(data);
                throw error;
            }

            const { user: newUser, token } = data.data;

            // Use role directly from backend (now uppercase)
            const normalizedUser: User = {
                ...newUser,
                role: newUser.role as UserRole
            };

            // Store token securely
            await SecureStorage.setItem('authToken', token);
            setToken(token);

            setUser(normalizedUser);
            // Persist user to SecureStorage
            await SecureStorage.setItem('user', JSON.stringify(normalizedUser));
        } catch (error) {
            console.error('Registration error:', error);
            throw error;
        }
    };

    const signOut = async () => {
        setUser(null);
        setToken(null);
        // Clear persisted user and token from SecureStorage
        await SecureStorage.removeItem('user');
        await SecureStorage.removeItem('authToken');
        // Clear admin session to prevent it from persisting across account switches
        await AsyncStorage.removeItem('adminSession');
    };

    const setUserRole = (role: UserRole) => {
        setSelectedRole(role);
    };

    const refreshMe = async () => {
        try {
            const storedToken = await SecureStorage.getItem('authToken');
            if (!storedToken) {
                setUser(null);
                await SecureStorage.removeItem('user');
                return;
            }

            const response = await fetch(createApiUrl('/users/me'), {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${storedToken}`,
                },
            });

            const data = await response.json();

            if (!data.success) {
                throw new Error(data.message || 'Failed to refresh user');
            }

            const { user: freshUser } = data.data;
            const normalizedUser: User = {
                ...freshUser,
                role: freshUser.role as UserRole,
            };

            setUser(normalizedUser);
            await SecureStorage.setItem('user', JSON.stringify(normalizedUser));
        } catch (error) {
            console.error('Failed to refresh current user:', error);
        }
    };

    const value: AuthContextType = {
        user,
        token,
        isAuthenticated: !!user,
        isLoading,
        signIn,
        signUp,
        signOut,
        setUserRole,
        refreshMe,
    };

    return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = (): AuthContextType => {
    const context = useContext(AuthContext);
    if (!context) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
};
