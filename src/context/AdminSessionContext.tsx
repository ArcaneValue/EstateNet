import React, { createContext, useContext, useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useAuth } from './AuthContext';

interface AdminSessionContextType {
    isAdminAuthenticated: boolean;
    adminPermissions: {
        isSuperAdmin?: boolean;
        canManagePosts?: boolean;
        canManageUsers?: boolean;
        canViewAnalytics?: boolean;
    } | null;
    adminUserRole: string | null;
    setAdminSession: (permissions: any, userRole: string) => Promise<void>;
    clearAdminSession: () => Promise<void>;
    validateAdminSession: (currentRole: string) => boolean;
}

const AdminSessionContext = createContext<AdminSessionContextType | undefined>(undefined);

export const AdminSessionProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [isAdminAuthenticated, setIsAdminAuthenticated] = useState(false);
    const [adminPermissions, setAdminPermissions] = useState<any>(null);
    const [adminUserRole, setAdminUserRole] = useState<string | null>(null);
    const { user } = useAuth();

    useEffect(() => {
        loadAdminSession();
    }, []);

    const loadAdminSession = async () => {
        try {
            const sessionData = await AsyncStorage.getItem('adminSession');
            if (sessionData) {
                const { permissions, userRole } = JSON.parse(sessionData);
                setAdminPermissions(permissions);
                setAdminUserRole(userRole);
                setIsAdminAuthenticated(true);
            }
        } catch (error) {
            console.error('Failed to load admin session:', error);
        }
    };

    const setAdminSession = async (permissions: any, userRole: string) => {
        try {
            const sessionData = {
                permissions,
                userRole
            };
            await AsyncStorage.setItem('adminSession', JSON.stringify(sessionData));
            setAdminPermissions(permissions);
            setAdminUserRole(userRole);
            setIsAdminAuthenticated(true);
        } catch (error) {
            console.error('Failed to save admin session:', error);
        }
    };

    const clearAdminSession = async () => {
        try {
            await AsyncStorage.removeItem('adminSession');
            setAdminPermissions(null);
            setAdminUserRole(null);
            setIsAdminAuthenticated(false);
        } catch (error) {
            console.error('Failed to clear admin session:', error);
        }
    };

    const validateAdminSession = (currentRole: string): boolean => {
        if (!isAdminAuthenticated || !adminUserRole) {
            return false;
        }
        return adminUserRole === currentRole;
    };

    return (
        <AdminSessionContext.Provider
            value={{
                isAdminAuthenticated,
                adminPermissions,
                adminUserRole,
                setAdminSession,
                clearAdminSession,
                validateAdminSession
            }}
        >
            {children}
        </AdminSessionContext.Provider>
    );
};

export const useAdminSession = () => {
    const context = useContext(AdminSessionContext);
    if (!context) {
        throw new Error('useAdminSession must be used within AdminSessionProvider');
    }
    return context;
};
