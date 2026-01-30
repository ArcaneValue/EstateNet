import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '../../theme/ThemeContext';
import { useAuth } from '../../context/AuthContext';
import { Ionicons } from '@expo/vector-icons';

interface RoleSelectionScreenProps {
    navigation: any;
}

export const RoleSelectionScreen: React.FC<RoleSelectionScreenProps> = ({ navigation }) => {
    const { colors, spacing, typography, borderRadius, shadows } = useTheme();
    const { setUserRole } = useAuth();

    const selectRole = (role: 'manager' | 'tenant') => {
        setUserRole(role);
        // Navigate to Terms & Conditions screen with role parameter
        navigation.navigate('Terms', { role });
    };

    return (
        <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }}>
            <ScrollView
                contentContainerStyle={[styles.container, { padding: spacing['2xl'] }]}
                showsVerticalScrollIndicator={false}
            >
                {/* Header */}
                <View style={styles.header}>
                    <Text
                        style={[
                            typography.h1,
                            {
                                color: colors.text,
                                textAlign: 'center',
                            },
                        ]}
                    >
                        Choose Your Role
                    </Text>
                    <Text
                        style={[
                            typography.body,
                            {
                                color: colors.textSecondary,
                                marginTop: spacing.md,
                                textAlign: 'center',
                            },
                        ]}
                    >
                        Select how you'll be using EstateNet
                    </Text>
                </View>

                {/* Role Cards */}
                <View style={[styles.rolesContainer, { marginTop: spacing['4xl'] }]}>
                    {/* Manager Card */}
                    <TouchableOpacity
                        onPress={() => selectRole('manager')}
                        activeOpacity={0.8}
                        style={[
                            styles.roleCard,
                            {
                                backgroundColor: colors.surface,
                                borderRadius: borderRadius.lg,
                                padding: spacing.xl,
                                marginBottom: spacing.lg,
                            },
                            shadows.lg,
                        ]}
                    >
                        <View
                            style={[
                                styles.iconContainer,
                                {
                                    backgroundColor: colors.primary,
                                    borderRadius: borderRadius.md,
                                },
                            ]}
                        >
                            <Ionicons name="briefcase" size={36} color="#FFFFFF" />
                        </View>

                        <Text
                            style={[
                                typography.h2,
                                {
                                    color: colors.text,
                                    marginTop: spacing.lg,
                                },
                            ]}
                        >
                            Property Manager
                        </Text>

                        <Text
                            style={[
                                typography.body,
                                {
                                    color: colors.textSecondary,
                                    marginTop: spacing.md,
                                    lineHeight: 22,
                                },
                            ]}
                        >
                            Manage properties, track rent payments, communicate with tenants, and maintain vendor relationships.
                        </Text>

                        <View style={[styles.features, { marginTop: spacing.lg }]}>
                            <FeatureTag text="Multiple Properties" colors={colors} spacing={spacing} />
                            <FeatureTag text="Tenant Management" colors={colors} spacing={spacing} />
                            <FeatureTag text="Financial Tracking" colors={colors} spacing={spacing} />
                        </View>

                        <View style={[styles.arrow, { marginTop: spacing.lg }]}>
                            <Ionicons name="arrow-forward" size={24} color={colors.primary} />
                        </View>
                    </TouchableOpacity>

                    {/* Tenant Card */}
                    <TouchableOpacity
                        onPress={() => selectRole('tenant')}
                        activeOpacity={0.8}
                        style={[
                            styles.roleCard,
                            {
                                backgroundColor: colors.surface,
                                borderRadius: borderRadius.lg,
                                padding: spacing.xl,
                            },
                            shadows.lg,
                        ]}
                    >
                        <View
                            style={[
                                styles.iconContainer,
                                {
                                    backgroundColor: colors.accent,
                                    borderRadius: borderRadius.md,
                                },
                            ]}
                        >
                            <Ionicons name="person" size={36} color="#1A1A1A" />
                        </View>

                        <Text
                            style={[
                                typography.h2,
                                {
                                    color: colors.text,
                                    marginTop: spacing.lg,
                                },
                            ]}
                        >
                            Tenant
                        </Text>

                        <Text
                            style={[
                                typography.body,
                                {
                                    color: colors.textSecondary,
                                    marginTop: spacing.md,
                                    lineHeight: 22,
                                },
                            ]}
                        >
                            View rent details, make payments, receive reminders, and communicate with your landlord.
                        </Text>

                        <View style={[styles.features, { marginTop: spacing.lg }]}>
                            <FeatureTag text="Easy Payments" colors={colors} spacing={spacing} />
                            <FeatureTag text="Rent Tracking" colors={colors} spacing={spacing} />
                            <FeatureTag text="Transparent Fees" colors={colors} spacing={spacing} />
                        </View>

                        <View style={[styles.arrow, { marginTop: spacing.lg }]}>
                            <Ionicons name="arrow-forward" size={24} color={colors.accent} />
                        </View>
                    </TouchableOpacity>
                </View>
            </ScrollView>
        </SafeAreaView>
    );
};

interface FeatureTagProps {
    text: string;
    colors: any;
    spacing: any;
}

const FeatureTag: React.FC<FeatureTagProps> = ({ text, colors, spacing }) => (
    <View
        style={{
            paddingHorizontal: spacing.md,
            paddingVertical: spacing.xs,
            backgroundColor: colors.primaryLight + '20',
            borderRadius: 16,
            marginRight: spacing.sm,
            marginBottom: spacing.sm,
        }}
    >
        <Text
            style={{
                fontSize: 12,
                color: colors.primary,
                fontWeight: '600',
            }}
        >
            {text}
        </Text>
    </View>
);

const styles = StyleSheet.create({
    container: {
        flexGrow: 1,
        paddingBottom: 40,
    },
    header: {
        alignItems: 'center',
        marginTop: 20,
    },
    rolesContainer: {
        flex: 1,
    },
    roleCard: {
        position: 'relative',
    },
    iconContainer: {
        width: 72,
        height: 72,
        alignItems: 'center',
        justifyContent: 'center',
    },
    features: {
        flexDirection: 'row',
        flexWrap: 'wrap',
    },
    arrow: {
        position: 'absolute',
        top: 24,
        right: 24,
    },
});
