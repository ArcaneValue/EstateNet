import React, { useState } from 'react';
import { View, Text, StyleSheet, Platform } from 'react-native';
import { useTheme } from '../../theme/ThemeContext';
import { useAuth } from '../../context/AuthContext';
import { Input } from '../../components/Input';
import { Button } from '../../components/Button';
import { KeyboardSafeContainer } from '../../components/KeyboardSafeContainer';

interface SignInScreenProps {
    navigation: any;
}

export const SignInScreen: React.FC<SignInScreenProps> = ({ navigation }) => {
    const { colors, spacing, typography } = useTheme();
    const { signIn } = useAuth();

    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
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
        } catch (err: any) {
            // Show actual error message from backend or network
            const errorMessage = err.message || 'Unknown error occurred';
            const status = err.status;
            const message = err.message;
            const rawBody = err.rawBody;

            console.error(`Sign in failed. Status: ${status}. Message: ${message}. Raw: ${rawBody}`);

            // Check for network connectivity issues
            if (message.includes('fetch') || message.includes('network') || message.includes('Network')) {
                setError('Cannot connect to server. Please check:\n1. Backend server is running on port 3001\n2. Your device is on the same network as your PC\n3. API_BASE_URL is configured correctly in src/config/api.ts');
            } else {
                setError(`Sign in failed (Status: ${status}): ${message}`);
            }
        } finally {
            setLoading(false);
        }
    };

    return (
        <View style={[styles.container, { backgroundColor: colors.background }]}>
            <KeyboardSafeContainer contentContainerStyle={{ padding: spacing['2xl'] }}>
                <Text style={[typography.h1, { color: colors.text, marginTop: 40 }]}>
                    Welcome Back
                </Text>
                <Text style={[typography.body, { color: colors.textSecondary, marginTop: spacing.sm }]}>
                    Sign in to continue to EstateNet
                </Text>

                <View style={{ marginTop: spacing['3xl'] }}>
                    <Input
                        label="Email"
                        placeholder="Enter your email"
                        value={email}
                        onChangeText={setEmail}
                        keyboardType="email-address"
                        autoCapitalize="none"
                        autoCorrect={false}
                        {...(Platform.OS === 'ios' && {
                            textContentType: 'emailAddress',
                            autoComplete: 'email',
                        })}
                    />

                    <Input
                        label="Password"
                        placeholder="Enter your password"
                        value={password}
                        onChangeText={setPassword}
                        secureTextEntry
                        {...(Platform.OS === 'ios' && {
                            textContentType: 'password',
                            autoComplete: 'password',
                        })}
                    />

                    {error ? (
                        <Text style={{ color: colors.error, marginTop: spacing.sm }}>
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

                <View style={{ marginTop: spacing['2xl'] }}>
                    <Text style={{ color: colors.textSecondary, textAlign: 'center' }}>
                        Don't have an account?{' '}
                        <Text
                            style={{ color: colors.primary, fontWeight: '600' }}
                            onPress={() => navigation.navigate('RoleSelection')}
                        >
                            Sign Up
                        </Text>
                    </Text>
                </View>
            </KeyboardSafeContainer>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
});
