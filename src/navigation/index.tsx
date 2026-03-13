import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';
import { Platform } from 'react-native';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../theme/ThemeContext';
import { Header } from '../components/Header';

// Auth Screens
import { SplashScreen } from '../screens/auth/SplashScreen';
import { WelcomeScreen } from '../screens/auth/WelcomeScreen';
import { RoleSelectionScreen } from '../screens/auth/RoleSelectionScreen';
import { TermsScreen } from '../screens/auth/TermsScreen';
import { SignInScreen } from '../screens/auth/SignInScreen';
import { SignUpScreen } from '../screens/auth/SignUpScreen';

// Manager Screens
import { ManagerDashboard } from '../screens/manager/ManagerDashboard';
import { PropertiesScreen } from '../screens/manager/PropertiesScreen';
import { TenantsScreen } from '../screens/manager/TenantsScreen';
import { OutstandingRentScreen } from '../screens/manager/OutstandingRentScreen';
import { RentCollectionScreen } from '../screens/manager/RentCollectionScreen';
import { ManagerPaymentsScreen } from '../screens/manager/ManagerPaymentsScreen';
import { ManagerTermsScreen } from '../screens/manager/ManagerTermsScreen';
import { ManagerBillingScreen } from '../screens/manager/ManagerBillingScreen';
import { ManagerPaymentClaimsScreen } from '../screens/manager/ManagerPaymentClaimsScreen';
import { IncomeStatementScreen } from '../screens/manager/IncomeStatementScreen';
import { FinancialPositionScreen } from '../screens/manager/FinancialPositionScreen';
import { CashflowStatementScreen } from '../screens/manager/CashflowStatementScreen';
import { ProfileScreen } from '../screens/manager/ProfileScreen';

// Owner Screens
import {
    OwnerDashboardScreen,
    OwnerPropertiesScreen,
    OwnerInvitationsScreen,
    OwnerManagersScreen,
    OwnerPropertyDetailScreen,
    OwnerProfileScreen,
} from '../screens/owner';

// Owner Mode Screens (legacy)
import { ManageAccessScreen } from '../screens/manager/ManageAccessScreen';
import { ApprovalsScreen } from '../screens/manager/ApprovalsScreen';
import { OwnerFinancialScreen } from '../screens/manager/OwnerFinancialScreen';
import { OwnerSettingsScreen as LegacyOwnerSettingsScreen } from '../screens/owner/OwnerSettingsScreen';
import { OwnerOutstandingScreen } from '../screens/manager/OwnerOutstandingScreen';
import { OwnerRegistryScreen } from '../screens/manager/OwnerRegistryScreen';

// Tenant Screens
import { TenantDashboard } from '../screens/tenant/TenantDashboard';
import { TenantHomeScreen } from '../screens/tenant/TenantHomeScreen';
import { PaymentsScreen } from '../screens/tenant/PaymentsScreen';
import { MessagesScreen } from '../screens/tenant/MessagesScreen';
import { TenantProfileScreen } from '../screens/tenant/TenantProfileScreen';
import { TenantInvitationsScreen } from '../screens/tenant/TenantInvitationsScreen';

const Stack = createNativeStackNavigator();
const Tab = createBottomTabNavigator();

// Manager Tab Navigator
const ManagerTabs = () => {
    const { colors } = useTheme();

    return (
        <Tab.Navigator
            screenOptions={{
                headerShown: false,
                tabBarStyle: {
                    backgroundColor: colors.surface,
                    paddingBottom: Platform.OS === 'android' ? 55 : 8,
                    paddingTop: 8,
                    height: Platform.OS === 'android' ? 115 : 64,
                    borderTopWidth: 0,
                    elevation: 0,
                    shadowOpacity: 0,
                },
                tabBarActiveTintColor: colors.primary,
                tabBarInactiveTintColor: colors.textSecondary,
                tabBarLabelStyle: {
                    fontSize: 12,
                    fontWeight: '600',
                },
            }}
        >
            <Tab.Screen
                name="Dashboard"
                component={ManagerDashboard}
                options={{
                    tabBarIcon: ({ color, size }) => <Ionicons name="grid" size={size} color={color} />,
                }}
            />
            <Tab.Screen
                name="Properties"
                component={PropertiesScreen}
                options={{
                    tabBarIcon: ({ color, size }) => <Ionicons name="business" size={size} color={color} />,
                }}
            />
            <Tab.Screen
                name="Tenants"
                component={TenantsScreen}
                options={{
                    tabBarIcon: ({ color, size }) => <Ionicons name="people" size={size} color={color} />,
                }}
            />
            <Tab.Screen
                name="Billing"
                component={ManagerBillingScreen}
                options={{
                    tabBarIcon: ({ color, size }) => <Ionicons name="receipt" size={size} color={color} />,
                }}
            />
            <Tab.Screen
                name="Profile"
                component={ProfileScreen}
                options={{
                    tabBarIcon: ({ color, size }) => <Ionicons name="person" size={size} color={color} />,
                }}
            />
        </Tab.Navigator>
    );
};

// Manager Stack with Tabs and additional screens
const ManagerStack = () => {
    return (
        <Stack.Navigator screenOptions={{ headerShown: false }}>
            <Stack.Screen name="ManagerTabs" component={ManagerTabs} />
            <Stack.Screen name="OutstandingRent" component={OutstandingRentScreen} />
            <Stack.Screen name="RentCollection" component={RentCollectionScreen} />
            <Stack.Screen name="ManagerPayments" component={ManagerPaymentsScreen} />
            <Stack.Screen name="ManagerPaymentClaims" component={ManagerPaymentClaimsScreen} />
            <Stack.Screen name="ManagerTerms" component={ManagerTermsScreen} />
            <Stack.Screen name="ManagerBilling" component={ManagerBillingScreen} />
            <Stack.Screen name="IncomeStatement" component={IncomeStatementScreen} />
            <Stack.Screen name="FinancialPosition" component={FinancialPositionScreen} />
            <Stack.Screen name="CashflowStatement" component={CashflowStatementScreen} />
        </Stack.Navigator>
    );
};

// Owner Tab Navigator
const OwnerTabs = () => {
    const { colors } = useTheme();

    return (
        <Tab.Navigator
            screenOptions={{
                headerShown: false,
                tabBarStyle: {
                    backgroundColor: colors.surface,
                    paddingBottom: Platform.OS === 'android' ? 55 : 8,
                    paddingTop: 8,
                    height: Platform.OS === 'android' ? 115 : 64,
                },
                tabBarActiveTintColor: colors.primary,
                tabBarInactiveTintColor: colors.textSecondary,
                tabBarLabelStyle: {
                    fontSize: 12,
                    fontWeight: '600',
                },
            }}
        >
            <Tab.Screen
                name="Dashboard"
                component={OwnerDashboardScreen}
                options={{
                    tabBarIcon: ({ color, size }) => <Ionicons name="grid" size={size} color={color} />,
                }}
            />
            <Tab.Screen
                name="Properties"
                component={OwnerPropertiesScreen}
                options={{
                    tabBarIcon: ({ color, size }) => <Ionicons name="business" size={size} color={color} />,
                }}
            />
            <Tab.Screen
                name="Invitations"
                component={OwnerInvitationsScreen}
                options={{
                    tabBarIcon: ({ color, size }) => <Ionicons name="mail" size={size} color={color} />,
                }}
            />
            <Tab.Screen
                name="Managers"
                component={OwnerManagersScreen}
                options={{
                    tabBarIcon: ({ color, size }) => <Ionicons name="people" size={size} color={color} />,
                }}
            />
            <Tab.Screen
                name="Profile"
                component={OwnerProfileScreen}
                options={{
                    tabBarIcon: ({ color, size }) => <Ionicons name="person" size={size} color={color} />,
                }}
            />
        </Tab.Navigator>
    );
};

// Owner Stack with Tabs and additional screens
const OwnerStack = () => {
    return (
        <Stack.Navigator screenOptions={{ headerShown: false }}>
            <Stack.Screen name="OwnerTabs" component={OwnerTabs} />
            <Stack.Screen name="ManageAccess" component={ManageAccessScreen} />
            <Stack.Screen name="Approvals" component={ApprovalsScreen} />
            <Stack.Screen name="OwnerFinancial" component={OwnerFinancialScreen} />
            <Stack.Screen name="OwnerSettings" component={LegacyOwnerSettingsScreen} />
            <Stack.Screen name="OwnerProperties" component={OwnerPropertiesScreen} />
            <Stack.Screen name="OwnerInvitations" component={OwnerInvitationsScreen} />
            <Stack.Screen name="OwnerPropertyDetail" component={OwnerPropertyDetailScreen} />
            <Stack.Screen name="OwnerManagers" component={OwnerManagersScreen} />
            <Stack.Screen name="OwnerOutstanding" component={OwnerOutstandingScreen} />
            <Stack.Screen name="OwnerRegistry" component={OwnerRegistryScreen} />
            <Stack.Screen name="OutstandingRent" component={OutstandingRentScreen} />
            <Stack.Screen name="RentCollection" component={RentCollectionScreen} />
        </Stack.Navigator>
    );
};

// Tenant Tab Navigator
const TenantTabs = () => {
    const { colors, typography } = useTheme();

    return (
        <Tab.Navigator
            screenOptions={{
                headerShown: false,
                tabBarStyle: {
                    backgroundColor: colors.surface,
                    paddingBottom: Platform.OS === 'android' ? 55 : 8,
                    paddingTop: 8,
                    height: Platform.OS === 'android' ? 115 : 64,
                    borderTopWidth: 0,
                    elevation: 0,
                    shadowOpacity: 0,
                },
                tabBarActiveTintColor: colors.accent,
                tabBarInactiveTintColor: colors.textMuted,
                tabBarLabelStyle: {
                    ...typography.caption,
                    fontWeight: '600',
                },
            }}
        >
            <Tab.Screen
                name="Home"
                component={TenantHomeScreen}
                options={{
                    tabBarIcon: ({ color, size }) => <Ionicons name="home" size={size} color={color} />,
                }}
            />
            <Tab.Screen
                name="Invitations"
                component={TenantInvitationsScreen}
                options={{
                    tabBarLabel: 'Invites',
                    tabBarIcon: ({ color, size }) => <Ionicons name="mail" size={size} color={color} />,
                }}
            />
            <Tab.Screen
                name="Payments"
                component={PaymentsScreen}
                options={{
                    tabBarIcon: ({ color, size }) => <Ionicons name="card" size={size} color={color} />,
                }}
            />
            <Tab.Screen
                name="Messages"
                component={MessagesScreen}
                options={{
                    tabBarLabel: 'Inbox',
                    tabBarIcon: ({ color, size }) => <Ionicons name="mail" size={size} color={color} />,
                }}
            />
            <Tab.Screen
                name="Profile"
                component={TenantProfileScreen}
                options={{
                    tabBarIcon: ({ color, size }) => <Ionicons name="person" size={size} color={color} />,
                }}
            />
        </Tab.Navigator>
    );
};

// Auth Stack Navigator
const AuthStack = () => {
    return (
        <Stack.Navigator screenOptions={{ headerShown: false }}>
            <Stack.Screen name="Splash" component={SplashScreen} />
            <Stack.Screen name="Welcome" component={WelcomeScreen} />
            <Stack.Screen name="RoleSelection" component={RoleSelectionScreen} />
            <Stack.Screen name="Terms" component={TermsScreen} />
            <Stack.Screen name="SignIn" component={SignInScreen} />
            <Stack.Screen name="SignUp" component={SignUpScreen} />
        </Stack.Navigator>
    );
};

// Main Navigation Component
export const Navigation = () => {
    const { isAuthenticated, user } = useAuth();

    return (
        <NavigationContainer>
            {!isAuthenticated ? (
                <AuthStack />
            ) : user?.role === 'OWNER' ? (
                <OwnerStack />
            ) : user?.role === 'MANAGER' ? (
                <ManagerStack />
            ) : (
                <TenantTabs />
            )}
        </NavigationContainer>
    );
};
