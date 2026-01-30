import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, KeyboardAvoidingView, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '../../theme/ThemeContext';
import { useAuth } from '../../context/AuthContext';
import { Input } from '../../components/Input';
import { Button } from '../../components/Button';
import { Ionicons } from '@expo/vector-icons';

interface SignInScreenProps {
    navigation: any;
}

export const SignInScreen: React.FC<SignInScreenProps> = ({ navigation }) => {
    const { colors, spacing, typography } = useTheme();
    const { signIn } = useAuth();

    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    const handleSignIn = async () => {
        if (!email || !password) {
            setError('Please fill in all fields');
            return;
        }

        setLoading(true);
        setError('');

        try {
            await signIn(email, password);
            // Navigation handled by App.tsx based on auth state
        } catch (err) {
            setError('Invalid credentials. Please try again.');
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
                            Welcome Back
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
                            Sign in to continue to EstateNet
                        </Text>
                    </View>

                    {/* Form */}
                    <View style={[styles.form, { marginTop: spacing['3xl'] }]}>
                        <Input
                            label="Email"
                            placeholder="Enter your email"
                            value={email}
                            onChangeText={setEmail}
                            keyboardType="email-address"
                            autoCapitalize="none"
                            icon={<Ionicons name="mail-outline" size={20} color={colors.textSecondary} />}
                        />

                        <Input
                            label="Password"
                            placeholder="Enter your password"
                            value={password}
                            onChangeText={setPassword}
                            secureTextEntry={!showPassword}
                            icon={<Ionicons name="lock-closed-outline" size={20} color={colors.textSecondary} />}
                        />

                        {error ? (
                            <Text
                                style={[
                                    typography.bodySmall,
                                    {
                                        color: colors.error,
                                        marginTop: spacing.sm,
                                    },
                                ]}
                            >
                                {error}
                            </Text>
                        ) : null}

                        <Button
                            title="Sign In"
                            onPress={handleSignIn}
                            loading={loading}
                            style={{ marginTop: spacing.xl }}
                        />
                    </View>

                    {/* Footer */}
                    <View style={[styles.footer, { marginTop: spacing['2xl'] }]}>
                        <Text
                            style={[
                                typography.body,
                                {
                                    color: colors.textSecondary,
                                    textAlign: 'center',
                                },
                            ]}
                        >
                            Don't have an account?{' '}
                            <Text
                                style={{ color: colors.primary, fontWeight: '600' }}
                                onPress={() => navigation.navigate('RoleSelection')}
                            >
                                Sign Up
                            </Text>
                        </Text>
                    </View>
                </ScrollView>
            </KeyboardAvoidingView>
        </SafeAreaView>
    );
};

const styles = StyleSheet.create({
    container: {
        flexGrow: 1,
    },
    header: {
        marginTop: 40,
    },
    form: {
        flex: 1,
    },
    footer: {
        marginBottom: 20,
    },
});
