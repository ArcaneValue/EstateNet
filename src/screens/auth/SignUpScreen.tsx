import React, { useState } from 'react';
import { View, Text, StyleSheet, Platform, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '../../theme/ThemeContext';
import { useAuth } from '../../context/AuthContext';
import { Input } from '../../components/Input';
import { Button } from '../../components/Button';
import { Modal } from '../../components/Modal';
import { KeyboardSafeContainer } from '../../components/KeyboardSafeContainer';
import { BrandColors } from '../../theme/brandColors';
import { Ionicons } from '@expo/vector-icons';

interface SignUpScreenProps {
    navigation: any;
    route: any;
}

export const SignUpScreen: React.FC<SignUpScreenProps> = ({ navigation, route }) => {
    const { spacing, typography } = useTheme();
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
    const [passwordFocused, setPasswordFocused] = useState(false);
    const [showPassword, setShowPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);

    // Password validation states
    const hasMinLength = password.length >= 8;
    const hasUppercase = /[A-Z]/.test(password);
    const hasLowercase = /[a-z]/.test(password);
    const hasNumber = /\d/.test(password);
    const [showTenantIdModal, setShowTenantIdModal] = useState(false);

    const validate = () => {
        const newErrors: Record<string, string> = {};

        if (!name) newErrors.name = 'Name is required';
        if (!email) newErrors.email = 'Email is required';
        if (!phoneNumber) newErrors.phoneNumber = 'Phone number is required';
        if (!password) newErrors.password = 'Password is required';
        if (password !== confirmPassword) newErrors.confirmPassword = 'Passwords do not match';

        // Match backend validation requirements
        if (password && password.length < 8) newErrors.password = 'Password must be at least 8 characters';
        if (password && !hasUppercase) newErrors.password = 'Password must contain an uppercase letter';
        if (password && !hasLowercase) newErrors.password = 'Password must contain a lowercase letter';
        if (password && !hasNumber) newErrors.password = 'Password must contain a number';

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
            <View style={styles.header}>
                <Text style={[typography.h1, styles.title]}>
                    Create Account
                </Text>
                <View style={styles.roleBadge}>
                    <Text style={styles.roleBadgeText}>
                        {roleNames[role] || 'User'}
                    </Text>
                </View>
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
                    label="Phone Number"
                    placeholder="Enter your phone number"
                    value={phoneNumber}
                    onChangeText={setPhoneNumber}
                    keyboardType="phone-pad"
                    error={errors.phoneNumber}
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
                    onFocus={() => setPasswordFocused(true)}
                    onBlur={() => setPasswordFocused(false)}
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
                    error={errors.password}
                    {...(Platform.OS === 'ios' && {
                        textContentType: 'password',
                        autoComplete: 'password',
                    })}
                />

                {/* Password Requirements */}
                {(passwordFocused || password.length > 0) && (
                    <View style={styles.passwordRequirements}>
                        <Text style={styles.requirementsTitle}>Password must contain:</Text>

                        <View style={styles.requirementRow}>
                            <Ionicons
                                name={hasMinLength ? "checkmark-circle" : "ellipse-outline"}
                                size={20}
                                color={hasMinLength ? BrandColors.navy : BrandColors.mediumGray}
                            />
                            <Text style={[styles.requirementText, hasMinLength && styles.requirementMet]}>
                                At least 8 characters
                            </Text>
                        </View>

                        <View style={styles.requirementRow}>
                            <Ionicons
                                name={hasUppercase ? "checkmark-circle" : "ellipse-outline"}
                                size={20}
                                color={hasUppercase ? BrandColors.navy : BrandColors.mediumGray}
                            />
                            <Text style={[styles.requirementText, hasUppercase && styles.requirementMet]}>
                                One uppercase letter (A-Z)
                            </Text>
                        </View>

                        <View style={styles.requirementRow}>
                            <Ionicons
                                name={hasLowercase ? "checkmark-circle" : "ellipse-outline"}
                                size={20}
                                color={hasLowercase ? BrandColors.navy : BrandColors.mediumGray}
                            />
                            <Text style={[styles.requirementText, hasLowercase && styles.requirementMet]}>
                                One lowercase letter (a-z)
                            </Text>
                        </View>

                        <View style={styles.requirementRow}>
                            <Ionicons
                                name={hasNumber ? "checkmark-circle" : "ellipse-outline"}
                                size={20}
                                color={hasNumber ? BrandColors.navy : BrandColors.mediumGray}
                            />
                            <Text style={[styles.requirementText, hasNumber && styles.requirementMet]}>
                                One number (0-9)
                            </Text>
                        </View>
                    </View>
                )}

                <Input
                    label="Confirm Password"
                    placeholder="Confirm your password"
                    value={confirmPassword}
                    onChangeText={setConfirmPassword}
                    secureTextEntry={!showConfirmPassword}
                    rightIcon={
                        <TouchableOpacity onPress={() => setShowConfirmPassword(!showConfirmPassword)}>
                            <Ionicons
                                name={showConfirmPassword ? 'eye-off-outline' : 'eye-outline'}
                                size={20}
                                color="#666"
                            />
                        </TouchableOpacity>
                    }
                    error={errors.confirmPassword}
                    {...(Platform.OS === 'ios' && {
                        textContentType: 'password',
                        autoComplete: 'password',
                    })}
                />

                {errors.general && (
                    <View style={styles.errorContainer}>
                        <Text style={styles.errorText}>
                            {errors.general}
                        </Text>
                    </View>
                )}

                <Button
                    title="Create Account"
                    onPress={handleSignUp}
                    loading={loading}
                    style={styles.createButton}
                />
            </View>

            {/* Footer */}
            <View style={styles.footer}>
                <Text style={styles.footerText}>
                    Already have an account?{' '}
                </Text>
                <TouchableOpacity onPress={() => navigation.navigate('SignIn')}>
                    <Text style={styles.footerLink}>Sign In</Text>
                </TouchableOpacity>
            </View>
        </>
    );

    return (
        <SafeAreaView style={styles.container}>
            <KeyboardSafeContainer contentContainerStyle={{ padding: spacing['2xl'] }}>
                {renderFormContent()}
            </KeyboardSafeContainer>

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
                                backgroundColor: BrandColors.navy + '20',
                                width: 80,
                                height: 80,
                                borderRadius: 40,
                                alignItems: 'center',
                                justifyContent: 'center',
                                marginBottom: spacing.lg,
                            }}
                        >
                            <Ionicons name="checkmark-circle" size={48} color={BrandColors.navy} />
                        </View>

                        <Text style={[typography.h3, { color: BrandColors.navy, textAlign: 'center' }]}>
                            Your Account is Ready
                        </Text>

                        <Text
                            style={[
                                typography.body,
                                {
                                    color: BrandColors.mediumGray,
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
                                backgroundColor: BrandColors.white,
                                borderWidth: 2,
                                borderColor: BrandColors.navy,
                                borderRadius: 12,
                                padding: spacing.lg,
                                marginTop: spacing.lg,
                                width: '100%',
                            }}
                        >
                            <Text
                                style={[
                                    typography.caption,
                                    { color: BrandColors.mediumGray, textAlign: 'center' },
                                ]}
                            >
                                Your Tenant ID
                            </Text>
                            <Text
                                style={[
                                    typography.h1,
                                    {
                                        color: BrandColors.navy,
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
                                    color: BrandColors.mediumGray,
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
        flex: 1,
        backgroundColor: BrandColors.premiumBg,
    },
    logoContainer: {
        alignItems: 'center',
        marginTop: 20,
        marginBottom: 24,
    },
    logoMark: {
        width: 50,
        height: 50,
        position: 'relative',
    },
    // Letter E
    letterE: {
        position: 'absolute',
        left: 0,
        top: 0,
        width: 22,
        height: 50,
    },
    eVertical: {
        position: 'absolute',
        left: 0,
        top: 0,
        width: 6,
        height: 50,
        backgroundColor: BrandColors.navy,
    },
    eLine: {
        position: 'absolute',
        left: 0,
        height: 6,
        backgroundColor: BrandColors.navy,
    },
    eTop: {
        top: 0,
        width: 22,
    },
    eMiddle: {
        top: 22,
        width: 18,
    },
    eBottom: {
        bottom: 0,
        width: 22,
    },
    // Letter N
    letterN: {
        position: 'absolute',
        right: 0,
        top: 0,
        width: 22,
        height: 50,
    },
    nLeft: {
        position: 'absolute',
        left: 0,
        top: 0,
        width: 6,
        height: 50,
        backgroundColor: BrandColors.navy,
    },
    nRight: {
        position: 'absolute',
        right: 0,
        top: 0,
        width: 6,
        height: 50,
        backgroundColor: BrandColors.navy,
    },
    nDiagonal: {
        position: 'absolute',
        left: 4,
        top: 0,
        width: 7,
        height: 50,
        backgroundColor: BrandColors.navy,
        transform: [{ skewX: '-20deg' }],
    },
    // Orange accent
    orangeAccent: {
        position: 'absolute',
        right: 4,
        top: 10,
        width: 4,
        height: 18,
        backgroundColor: BrandColors.orange,
        transform: [{ rotate: '-25deg' }],
        borderRadius: 1,
    },
    header: {
        marginTop: 8,
        alignItems: 'center',
    },
    title: {
        color: BrandColors.navy,
        fontSize: 28,
        fontWeight: '700',
    },
    roleBadge: {
        backgroundColor: BrandColors.white,
        paddingHorizontal: 16,
        paddingVertical: 6,
        borderRadius: 20,
        marginTop: 12,
        borderWidth: 1,
        borderColor: BrandColors.orange,
    },
    roleBadgeText: {
        color: BrandColors.orange,
        fontSize: 14,
        fontWeight: '600',
    },
    form: {
        flex: 1,
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
    createButton: {
        marginTop: 24,
        backgroundColor: BrandColors.navy,
        borderRadius: 12,
        height: 52,
    },
    footer: {
        flexDirection: 'row',
        justifyContent: 'center',
        alignItems: 'center',
        marginTop: 16,
        marginBottom: 20,
    },
    footerText: {
        color: BrandColors.mediumGray,
        fontSize: 15,
    },
    footerLink: {
        color: BrandColors.navy,
        fontSize: 15,
        fontWeight: '600',
    },
    passwordRequirements: {
        backgroundColor: BrandColors.white,
        borderRadius: 8,
        padding: 12,
        marginTop: 8,
        borderWidth: 1,
        borderColor: BrandColors.lightGray,
    },
    requirementsTitle: {
        fontSize: 13,
        fontWeight: '600',
        color: BrandColors.navy,
        marginBottom: 8,
    },
    requirementRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginVertical: 4,
    },
    requirementText: {
        fontSize: 13,
        color: BrandColors.mediumGray,
        marginLeft: 8,
    },
    requirementMet: {
        color: BrandColors.navy,
        fontWeight: '500',
    },
});
