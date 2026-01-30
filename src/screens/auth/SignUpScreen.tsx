import React, { useState, useEffect } from 'react';
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
}

export const SignUpScreen: React.FC<SignUpScreenProps> = ({ navigation }) => {
    const { colors, spacing, typography } = useTheme();
    const { signUp, user } = useAuth();

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

        try {
            await signUp({ name, email, phoneNumber }, password);
            // Show tenant ID modal after signup - will be shown when user state updates
            setTimeout(() => setShowTenantIdModal(true), 300);
        } catch (err) {
            setErrors({ general: 'Registration failed. Please try again.' });
        } finally {
            setLoading(false);
        }
    };

    return (
        <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }}>
            <KeyboardAvoidingView
                behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                style={{ flex: 1 }}
            >
                <ScrollView
                    contentContainerStyle={[styles.container, { padding: spacing['2xl'] }]}
                    keyboardShouldPersistTaps="handled"
                >
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
                            Join EstateNet today
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
                            icon={<Ionicons name="person-outline" size={20} color={colors.textSecondary} />}
                        />

                        <Input
                            label="Email"
                            placeholder="Enter your email"
                            value={email}
                            onChangeText={setEmail}
                            keyboardType="email-address"
                            autoCapitalize="none"
                            error={errors.email}
                            icon={<Ionicons name="mail-outline" size={20} color={colors.textSecondary} />}
                        />

                        <Input
                            label="Phone Number (Optional)"
                            placeholder="Enter your phone number"
                            value={phoneNumber}
                            onChangeText={setPhoneNumber}
                            keyboardType="phone-pad"
                            icon={<Ionicons name="call-outline" size={20} color={colors.textSecondary} />}
                        />

                        <Input
                            label="Password"
                            placeholder="Create a password"
                            value={password}
                            onChangeText={setPassword}
                            secureTextEntry
                            error={errors.password}
                            icon={<Ionicons name="lock-closed-outline" size={20} color={colors.textSecondary} />}
                        />

                        <Input
                            label="Confirm Password"
                            placeholder="Confirm your password"
                            value={confirmPassword}
                            onChangeText={setConfirmPassword}
                            secureTextEntry
                            error={errors.confirmPassword}
                            icon={<Ionicons name="lock-closed-outline" size={20} color={colors.textSecondary} />}
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
                </ScrollView>
            </KeyboardAvoidingView>

            {/* Welcome Modal with Tenant ID */}
            {user && user.role === 'tenant' && user.tenantId && (
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
