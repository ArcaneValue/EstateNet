import React, { useState } from 'react';
import { View, Text, StyleSheet, Platform, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../theme/ThemeContext';
import { useAuth } from '../../context/AuthContext';
import { Input } from '../../components/Input';
import { Button } from '../../components/Button';
import { KeyboardSafeContainer } from '../../components/KeyboardSafeContainer';
import { BrandColors } from '../../theme/brandColors';

interface SignInScreenProps {
    navigation: any;
}

export const SignInScreen: React.FC<SignInScreenProps> = ({ navigation }) => {
    const { spacing, typography } = useTheme();
    const { signIn } = useAuth();

    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [showPassword, setShowPassword] = useState(false);

    const handleSignIn = async () => {
        if (!email || !password) {
            setError('Please enter both email and password to continue.');
            return;
        }

        setLoading(true);
        setError('');

        try {
            await signIn(email, password);
        } catch (err: any) {
            const status = err.status;
            const message = err.message;
            const rawBody = err.rawBody;

            console.error(`Sign in failed. Status: ${status}. Message: ${message}. Raw: ${rawBody}`);

            // Network/connection errors
            if (message.includes('fetch') || message.includes('network') || message.includes('Network')) {
                setError('⚠️ Cannot connect to server\n\nPlease check:\n• Backend server is running on port 3001\n• Your device is on the same network\n• API configuration is correct');
            }
            // Invalid credentials (401 Unauthorized)
            else if (status === 401 || message.toLowerCase().includes('invalid') || message.toLowerCase().includes('credentials') || message.toLowerCase().includes('unauthorized')) {
                setError('❌ Invalid email or password\n\nThe credentials you entered are incorrect. Please double-check and try again.\n\nTip: Make sure Caps Lock is off.');
            }
            // User not found
            else if (status === 404 || message.toLowerCase().includes('not found')) {
                setError('❌ Account not found\n\nNo account exists with this email address. Please check your email or sign up for a new account.');
            }
            // Account locked or disabled
            else if (status === 403 || message.toLowerCase().includes('forbidden') || message.toLowerCase().includes('disabled')) {
                setError('🔒 Account access restricted\n\nYour account may be locked or disabled. Please contact support for assistance.');
            }
            // Generic server error
            else if (status >= 500) {
                setError('⚠️ Server error\n\nSomething went wrong on our end. Please try again in a moment.');
            }
            // Fallback for other errors
            else {
                setError(`❌ Sign in failed\n\n${message || 'An unexpected error occurred. Please try again.'}`);
            }
        } finally {
            setLoading(false);
        }
    };

    return (
        <View style={styles.container}>
            <KeyboardSafeContainer contentContainerStyle={{ padding: spacing['2xl'] }}>
                {/* Logo */}
                <View style={styles.logoContainer}>
                    <View style={styles.logoMark}>
                        <View style={styles.letterE}>
                            <View style={[styles.eLine, styles.eTop]} />
                            <View style={[styles.eLine, styles.eMiddle]} />
                            <View style={[styles.eLine, styles.eBottom]} />
                            <View style={styles.eVertical} />
                        </View>
                        <View style={styles.letterN}>
                            <View style={styles.nLeft} />
                            <View style={styles.nDiagonal} />
                            <View style={styles.nRight} />
                        </View>
                        <View style={styles.orangeAccent} />
                    </View>
                </View>

                {/* Header */}
                <Text style={[typography.h1, styles.title]}>
                    Welcome Back
                </Text>
                <Text style={[typography.body, styles.subtitle]}>
                    Sign in to continue to EstateNet
                </Text>

                {/* Form */}
                <View style={{ marginTop: spacing['2xl'] }}>
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
                        secureTextEntry={!showPassword}
                        rightIcon={
                            <TouchableOpacity onPress={() => setShowPassword(!showPassword)}>
                                <Ionicons
                                    name={showPassword ? 'eye-off-outline' : 'eye-outline'}
                                    size={20}
                                    color="#666"
                                />
                            </TouchableOpacity>
                        }
                        {...(Platform.OS === 'ios' && {
                            textContentType: 'password',
                            autoComplete: 'password',
                        })}
                    />

                    {error ? (
                        <View style={styles.errorContainer}>
                            <Text style={styles.errorText}>{error}</Text>
                        </View>
                    ) : null}

                    <Button
                        title="Sign In"
                        onPress={handleSignIn}
                        loading={loading}
                        style={styles.signInButton}
                    />
                </View>

                {/* Sign Up Link */}
                <View style={styles.signUpContainer}>
                    <Text style={styles.signUpText}>
                        Don't have an account?{' '}
                    </Text>
                    <TouchableOpacity onPress={() => navigation.navigate('RoleSelection')}>
                        <Text style={styles.signUpLink}>Sign Up</Text>
                    </TouchableOpacity>
                </View>
            </KeyboardSafeContainer>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: BrandColors.premiumBg,
    },
    logoContainer: {
        alignItems: 'center',
        marginTop: 20,
        marginBottom: 32,
    },
    logoMark: {
        width: 60,
        height: 60,
        position: 'relative',
    },
    // Letter E
    letterE: {
        position: 'absolute',
        left: 0,
        top: 0,
        width: 27,
        height: 60,
    },
    eVertical: {
        position: 'absolute',
        left: 0,
        top: 0,
        width: 7,
        height: 60,
        backgroundColor: BrandColors.navy,
    },
    eLine: {
        position: 'absolute',
        left: 0,
        height: 7,
        backgroundColor: BrandColors.navy,
    },
    eTop: {
        top: 0,
        width: 27,
    },
    eMiddle: {
        top: 26,
        width: 22,
    },
    eBottom: {
        bottom: 0,
        width: 27,
    },
    // Letter N
    letterN: {
        position: 'absolute',
        right: 0,
        top: 0,
        width: 27,
        height: 60,
    },
    nLeft: {
        position: 'absolute',
        left: 0,
        top: 0,
        width: 7,
        height: 60,
        backgroundColor: BrandColors.navy,
    },
    nRight: {
        position: 'absolute',
        right: 0,
        top: 0,
        width: 7,
        height: 60,
        backgroundColor: BrandColors.navy,
    },
    nDiagonal: {
        position: 'absolute',
        left: 5,
        top: 0,
        width: 9,
        height: 60,
        backgroundColor: BrandColors.navy,
        transform: [{ skewX: '-20deg' }],
    },
    // Orange accent
    orangeAccent: {
        position: 'absolute',
        right: 5,
        top: 12,
        width: 5,
        height: 21,
        backgroundColor: BrandColors.orange,
        transform: [{ rotate: '-25deg' }],
        borderRadius: 1.5,
    },
    title: {
        color: BrandColors.navy,
        fontSize: 32,
        fontWeight: '700',
        marginTop: 8,
    },
    subtitle: {
        color: BrandColors.mediumGray,
        fontSize: 16,
        marginTop: 8,
    },
    errorContainer: {
        backgroundColor: BrandColors.white,
        borderLeftWidth: 3,
        borderLeftColor: '#DC2626',
        padding: 12,
        borderRadius: 8,
        marginTop: 12,
    },
    errorText: {
        color: '#DC2626',
        fontSize: 14,
        lineHeight: 20,
    },
    signInButton: {
        marginTop: 24,
        backgroundColor: BrandColors.navy,
        borderRadius: 12,
        height: 52,
    },
    signUpContainer: {
        flexDirection: 'row',
        justifyContent: 'center',
        alignItems: 'center',
        marginTop: 24,
    },
    signUpText: {
        color: BrandColors.mediumGray,
        fontSize: 15,
    },
    signUpLink: {
        color: BrandColors.navy,
        fontSize: 15,
        fontWeight: '600',
    },
});
