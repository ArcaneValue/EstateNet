import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, Alert } from 'react-native';
import { useTheme } from '../../theme/ThemeContext';
import { useAuth } from '../../context/AuthContext';
import { apiPost } from '../../utils/apiClient';
import { Button } from '../../components/Button';
import { Card } from '../../components/Card';
import { Ionicons } from '@expo/vector-icons';

// AsyncStorage import for direct use
let AsyncStorage: any;
try {
    AsyncStorage = require('@react-native-async-storage/async-storage').default;
} catch (e) {
    // Fallback for development
    AsyncStorage = {
        getItem: async () => null,
        setItem: async () => { },
        removeItem: async () => { },
    };
}

interface ManagerTermsScreenProps {
    navigation: any;
}

export const ManagerTermsScreen: React.FC<ManagerTermsScreenProps> = ({ navigation }) => {
    const { colors, spacing, typography, borderRadius } = useTheme();
    const { user, refreshMe } = useAuth();
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const handleAcceptTerms = async () => {
        setLoading(true);
        setError(null);

        try {
            const { status, json } = await apiPost('/manager/terms/accept', {});

            if (status === 200 && json?.success) {
                if (json?.data?.token) {
                    await AsyncStorage.setItem('authToken', json.data.token);
                }
                await refreshMe();

                Alert.alert(
                    'Terms Accepted',
                    'Thank you for accepting the EstateNet Manager Terms and Conditions.',
                    [
                        {
                            text: 'Continue',
                            onPress: () => {
                                navigation.goBack();
                            }
                        }
                    ]
                );
            } else {
                setError(json?.message || 'Failed to accept terms');
            }
        } catch (error) {
            console.error('Accept terms error:', error);
            setError('Network error. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    const handleDecline = () => {
        Alert.alert(
            'Terms Required',
            'You must accept the Terms and Conditions to use the EstateNet Manager app.',
            [
                {
                    text: 'Accept Terms',
                    onPress: handleAcceptTerms,
                    style: 'default'
                },
                {
                    text: 'Cancel',
                    style: 'cancel'
                }
            ]
        );
    };

    return (
        <ScrollView style={{ flex: 1, backgroundColor: colors.background }}>
            <View style={{ padding: spacing.lg }}>
                {/* Header */}
                <View style={{ alignItems: 'center', marginBottom: spacing.xl }}>
                    <Ionicons name="document-text-outline" size={64} color={colors.primary} />
                    <Text style={[typography.h2, { color: colors.text, marginTop: spacing.md }]}>
                        EstateNet Manager
                    </Text>
                    <Text style={[typography.body, { color: colors.textSecondary, marginTop: spacing.xs }]}>
                        Terms and Conditions
                    </Text>
                </View>

                {/* Terms Content */}
                <Card style={{ marginBottom: spacing.lg }}>
                    <View style={{ padding: spacing.lg }}>
                        <Text style={[typography.h3, { color: colors.text, marginBottom: spacing.md }]}>
                            Manager Agreement
                        </Text>

                        <Text style={[typography.body, { color: colors.text, marginBottom: spacing.md }]}>
                            By using the EstateNet Manager application, you agree to the following terms:
                        </Text>

                        {/* Billing Terms */}
                        <View style={{ marginBottom: spacing.lg }}>
                            <Text style={[typography.h4, { color: colors.text, marginBottom: spacing.sm }]}>
                                💰 Billing Terms
                            </Text>
                            <Text style={[typography.body, { color: colors.text, marginBottom: spacing.sm }]}>
                                • EstateNet charges 3.99% of monthly rent amount per occupied unit
                            </Text>
                            <Text style={[typography.body, { color: colors.text, marginBottom: spacing.sm }]}>
                                • Fee is charged to the Manager, not the tenant
                            </Text>
                            <Text style={[typography.body, { color: colors.text, marginBottom: spacing.sm }]}>
                                • Applies whether tenant pays cash, mobile money, or bank transfer
                            </Text>
                            <Text style={[typography.body, { color: colors.text, marginBottom: spacing.sm }]}>
                                • Non-payment results in restricted access to manager features
                            </Text>
                        </View>

                        {/* Service Terms */}
                        <View style={{ marginBottom: spacing.lg }}>
                            <Text style={[typography.h4, { color: colors.text, marginBottom: spacing.sm }]}>
                                🏢 Service Terms
                            </Text>
                            <Text style={[typography.body, { color: colors.text, marginBottom: spacing.sm }]}>
                                • EstateNet provides property management tools and tenant communication
                            </Text>
                            <Text style={[typography.body, { color: colors.text, marginBottom: spacing.sm }]}>
                                • Manager is responsible for property operations and tenant relations
                            </Text>
                            <Text style={[typography.body, { color: colors.text, marginBottom: spacing.sm }]}>
                                • All payments between tenants and managers are handled outside the app
                            </Text>
                        </View>

                        {/* Data & Privacy */}
                        <View style={{ marginBottom: spacing.lg }}>
                            <Text style={[typography.h4, { color: colors.text, marginBottom: spacing.sm }]}>
                                🔒 Data & Privacy
                            </Text>
                            <Text style={[typography.body, { color: colors.text, marginBottom: spacing.sm }]}>
                                • We protect your data and comply with applicable privacy laws
                            </Text>
                            <Text style={[typography.body, { color: colors.text, marginBottom: spacing.sm }]}>
                                • Your information is used to provide and improve our services
                            </Text>
                        </View>

                        {/* Enforcement Notice */}
                        <View style={{
                            backgroundColor: colors.warning + '20',
                            padding: spacing.md,
                            borderRadius: borderRadius.md,
                            borderLeftWidth: 4,
                            borderLeftColor: colors.warning
                        }}>
                            <Text style={[typography.bodySmall, { color: colors.warning, fontWeight: '600' }]}>
                                ⚠️ Important: Access to tenant invitation and property management features will be restricted if billing becomes overdue.
                            </Text>
                        </View>
                    </View>
                </Card>

                {/* Error Display */}
                {error && (
                    <Card style={{
                        backgroundColor: colors.error + '10',
                        borderColor: colors.error,
                        borderWidth: 1,
                        marginBottom: spacing.lg
                    }}>
                        <View style={{ padding: spacing.md }}>
                            <Text style={[typography.bodySmall, { color: colors.error }]}>
                                {error}
                            </Text>
                        </View>
                    </Card>
                )}

                {/* Action Buttons */}
                <View style={{ gap: spacing.md }}>
                    <Button
                        title={loading ? 'Processing...' : 'Accept Terms & Conditions'}
                        onPress={handleAcceptTerms}
                        variant="primary"
                        loading={loading}
                        disabled={loading}
                        style={{
                            height: 50,
                            borderRadius: borderRadius.lg
                        }}
                    />

                    <Button
                        title="Decline"
                        onPress={handleDecline}
                        variant="outline"
                        style={{
                            height: 50,
                            borderRadius: borderRadius.lg
                        }}
                    />
                </View>

                {/* Footer */}
                <View style={{ alignItems: 'center', marginTop: spacing.xl }}>
                    <Text style={[typography.bodySmall, { color: colors.textSecondary }]}>
                        Version 1.0 • Last Updated: February 2026
                    </Text>
                    <Text style={[typography.bodySmall, { color: colors.textSecondary, marginTop: spacing.xs }]}>
                        By accepting, you agree to pay 3.99% per occupied unit per month based on configured rent.
                    </Text>
                </View>
            </View>
        </ScrollView>
    );
};
