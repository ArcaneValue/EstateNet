import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, KeyboardAvoidingView, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '../../theme/ThemeContext';
import { useAuth } from '../../context/AuthContext';
import { Input } from '../../components/Input';
import { Button } from '../../components/Button';
import { Modal } from '../../components/Modal';
import { Ionicons } from '@expo/vector-icons';

interface SignUpScreenProps {
    navigation: any;
    route: any;
}

export const SignUpScreen: React.FC<SignUpScreenProps> = ({ navigation, route }) => {
    const { colors, spacing, typography } = useTheme();
    const { signUp, user } = useAuth();

    // Get role from navigation params (passed from Terms screen)
    const role = route.params?.role || 'manager';

    // Role display names
    const roleNames: Record<string, string> = {
        owner: 'Property Owner',
        manager: 'Property Manager',
        tenant: 'Tenant'
    };

    const [name, setName] = useState('');
    const [email, setEmail] = useState('');
    const [phoneNumber, setPhoneNumber] = useState('');
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [errors, setErrors] = useState<Record<string, string>>({});
    const [showTenantIdModal, setShowTenantIdModal] = useState(false);

    const validate = () => {
        const newErrors: Record<string, string> = {};

        if (!name) newErrors.name = 'Name is required';
        if (!email) newErrors.email = 'Email is required';
        if (!password) newErrors.password = 'Password is required';
        if (password !== confirmPassword) newErrors.confirmPassword = 'Passwords do not match';
        if (password && password.length < 6) newErrors.password = 'Password must be at least 6 characters';

        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const handleSignUp = async () => {
        if (!validate()) return;

        setLoading(true);
        setErrors({}); // Clear previous errors

        try {
            // Convert frontend role to uppercase for backend
            const backendRole = role.toUpperCase() as 'OWNER' | 'MANAGER' | 'TENANT';
            await signUp({ name, email, phoneNumber }, password, backendRole);

            // Only show tenant ID modal for tenants (role from AuthContext is UPPERCASE)
            if (role === 'TENANT') {
                setTimeout(() => setShowTenantIdModal(true), 300);
            }
        } catch (err: any) {
            // Extract backend error message and status
            const status = err.status || '?';
            const message = err.message || 'Registration failed';
            const rawBody = err.rawBody || '';

            console.error(`Registration failed. Status: ${status}. Message: ${message}. Raw: ${rawBody}`);

            // Check for network connectivity issues
            if (message.includes('fetch') || message.includes('network') || message.includes('Network')) {
                setErrors({
                    general: 'Cannot connect to server. Please check:\n1. Backend server is running on port 3001\n2. Your device is on the same network as your PC\n3. API_BASE_URL is configured correctly in src/config/api.ts'
                });
            } else {
                setErrors({
                    general: `Registration failed (Status: ${status}): ${message}`
                });
            }
        } finally {
            setLoading(false);
        }
    };

    // Render form content - shared between iOS and Android
    const renderFormContent = () => (
        <>
            {/* Header */}
            <View style={styles.header}>
                <Text
                    style={[
                        typography.h1,
                        {
                            color: colors.text,
                        },
                    ]}
                >
                    Create Account
                </Text>
                <Text
                    style={[
                        typography.body,
                        {
                            color: colors.textSecondary,
                            marginTop: spacing.sm,
                        },
                    ]}
                >
                    Register as {roleNames[role] || 'User'}
                </Text>
            </View>

            {/* Form */}
            <View style={[styles.form, { marginTop: spacing['2xl'] }]}>
                <Input
                    label="Full Name"
                    placeholder="Enter your full name"
                    value={name}
                    onChangeText={setName}
                    error={errors.name}
                    autoCorrect={false}
                    // Only include these props on iOS to avoid Android autofill issues
                    {...(Platform.OS === 'ios' && {
                        textContentType: 'name',
                        autoComplete: 'name',
                    })}
                />

                <Input
                    label="Email"
                    placeholder="Enter your email"
                    value={email}
                    onChangeText={setEmail}
                    keyboardType="email-address"
                    autoCapitalize="none"
                    autoCorrect={false}
                    error={errors.email}
                    {...(Platform.OS === 'ios' && {
                        textContentType: 'emailAddress',
                        autoComplete: 'email',
                    })}
                />

                <Input
                    label="Phone Number (Optional)"
                    placeholder="Enter your phone number"
                    value={phoneNumber}
                    onChangeText={setPhoneNumber}
                    keyboardType="phone-pad"
                    {...(Platform.OS === 'ios' && {
                        textContentType: 'telephoneNumber',
                        autoComplete: 'tel',
                    })}
                />

                <Input
                    label="Password"
                    placeholder="Create a password"
                    value={password}
                    onChangeText={setPassword}
                    secureTextEntry
                    error={errors.password}
                    {...(Platform.OS === 'ios' && {
                        textContentType: 'password',
                        autoComplete: 'password',
                    })}
                />

                <Input
                    label="Confirm Password"
                    placeholder="Confirm your password"
                    value={confirmPassword}
                    onChangeText={setConfirmPassword}
                    secureTextEntry
                    error={errors.confirmPassword}
                    {...(Platform.OS === 'ios' && {
                        textContentType: 'password',
                        autoComplete: 'password',
                    })}
                />

                {errors.general && (
                    <Text
                        style={[
                            typography.bodySmall,
                            {
                                color: colors.error,
                                marginTop: spacing.sm,
                            },
                        ]}
                    >
                        {errors.general}
                    </Text>
                )}

                <Button
                    title="Create Account"
                    onPress={handleSignUp}
                    loading={loading}
                    style={{ marginTop: spacing.xl }}
                />
            </View>

            {/* Footer */}
            <View style={[styles.footer, { marginTop: spacing.lg }]}>
                <Text
                    style={[
                        typography.body,
                        {
                            color: colors.textSecondary,
                            textAlign: 'center',
                        },
                    ]}
                >
                    Already have an account?{' '}
                    <Text
                        style={{ color: colors.primary, fontWeight: '600' }}
                        onPress={() => navigation.navigate('SignIn')}
                    >
                        Sign In
                    </Text>
                </Text>
            </View>
        </>
    );

    return (
        <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }}>
            {Platform.OS === 'ios' ? (
                <KeyboardAvoidingView
                    behavior="padding"
                    style={{ flex: 1 }}
                >
                    <ScrollView
                        style={[styles.container, { backgroundColor: colors.background }]}
                        contentContainerStyle={{ padding: spacing['2xl'] }}
                        keyboardShouldPersistTaps="handled"
                    >
                        {renderFormContent()}
                    </ScrollView>
                </KeyboardAvoidingView>
            ) : (
                <View style={{ flex: 1 }}>
                    <ScrollView
                        style={[styles.container, { backgroundColor: colors.background }]}
                        contentContainerStyle={{ padding: spacing['2xl'] }}
                        keyboardShouldPersistTaps="handled"
                    >
                        {renderFormContent()}
                    </ScrollView>
                </View>
            )}
            {/* Welcome Modal with Tenant ID */}
            {user && user.role === 'TENANT' && user.tenantId && (
                <Modal
                    visible={showTenantIdModal}
                    onClose={() => setShowTenantIdModal(false)}
                    title="Welcome to EstateNet!"
                    size="medium"
                >
                    <View style={{ alignItems: 'center', paddingVertical: spacing.lg }}>
                        <View
                            style={{
                                backgroundColor: colors.primary + '20',
                                width: 80,
                                height: 80,
                                borderRadius: 40,
                                alignItems: 'center',
                                justifyContent: 'center',
                                marginBottom: spacing.lg,
                            }}
                        >
                            <Ionicons name="checkmark-circle" size={48} color={colors.primary} />
                        </View>

                        <Text style={[typography.h3, { color: colors.text, textAlign: 'center' }]}>
                            Your Account is Ready
                        </Text>

                        <Text
                            style={[
                                typography.body,
                                {
                                    color: colors.textSecondary,
                                    textAlign: 'center',
                                    marginTop: spacing.md,
                                    lineHeight: 20,
                                },
                            ]}
                        >
                            Here is your unique Tenant ID. Property managers will use this ID to link you to properties.
                        </Text>

                        <View
                            style={{
                                backgroundColor: colors.surface,
                                borderWidth: 2,
                                borderColor: colors.primary,
                                borderRadius: 12,
                                padding: spacing.lg,
                                marginTop: spacing.lg,
                                width: '100%',
                            }}
                        >
                            <Text
                                style={[
                                    typography.caption,
                                    { color: colors.textSecondary, textAlign: 'center' },
                                ]}
                            >
                                Your Tenant ID
                            </Text>
                            <Text
                                style={[
                                    typography.h1,
                                    {
                                        color: colors.primary,
                                        textAlign: 'center',
                                        marginTop: spacing.xs,
                                        letterSpacing: 2,
                                    },
                                ]}
                            >
                                {user.tenantId}
                            </Text>
                        </View>

                        <Text
                            style={[
                                typography.bodySmall,
                                {
                                    color: colors.textSecondary,
                                    textAlign: 'center',
                                    marginTop: spacing.md,
                                    fontStyle: 'italic',
                                },
                            ]}
                        >
                            Keep this ID safe. Share it only with your property manager.
                        </Text>

                        <Button
                            title="Got it!"
                            onPress={() => setShowTenantIdModal(false)}
                            variant="primary"
                            size="large"
                            style={{ marginTop: spacing.xl, width: '100%' }}
                        />
                    </View>
                </Modal>
            )}
        </SafeAreaView>
    );
};

const styles = StyleSheet.create({
    container: {
        flexGrow: 1,
    },
    header: {
        marginTop: 20,
    },
    form: {
        flex: 1,
    },
    footer: {
        marginBottom: 20,
    },
});
