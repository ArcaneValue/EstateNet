import React, { useEffect, useRef, useState } from 'react';
import {
    View,
    Text,
    StyleSheet,
    Animated,
    TouchableOpacity,
    ActivityIndicator,
    Clipboard,
    Alert,
} from 'react-native';
import { useTheme } from '../theme/ThemeContext';
import { Ionicons } from '@expo/vector-icons';
import * as Sentry from '@sentry/react-native';

interface OTAUpdateScreenProps {
    status: 'checking' | 'available' | 'downloading' | 'ready' | 'success' | 'error' | 'current';
    errorDetails?: {
        code?: string;
        message?: string;
        stack?: string;
    };
    updateInfo?: {
        currentVersion?: string;
        newVersion?: string;
        releaseNotes?: string[];
        downloadSize?: string;
    };
    downloadProgress?: number;
    onUpdateNow?: () => void;
    onSkipUpdate?: () => void;
    onRetry?: () => void;
    onContinue?: () => void;
}

export const OTAUpdateScreen: React.FC<OTAUpdateScreenProps> = ({
    status,
    errorDetails,
    updateInfo,
    downloadProgress = 0,
    onUpdateNow,
    onSkipUpdate,
    onRetry,
    onContinue,
}) => {
    const { colors, typography, spacing, borderRadius } = useTheme();
    const fadeAnim = useRef(new Animated.Value(0)).current;
    const scaleAnim = useRef(new Animated.Value(0.9)).current;
    const pulseAnim = useRef(new Animated.Value(1)).current;
    const shakeAnim = useRef(new Animated.Value(0)).current;
    const [countdown, setCountdown] = useState(3);

    useEffect(() => {
        // Fade in animation
        Animated.parallel([
            Animated.timing(fadeAnim, {
                toValue: 1,
                duration: 300,
                useNativeDriver: true,
            }),
            Animated.spring(scaleAnim, {
                toValue: 1,
                damping: 15,
                stiffness: 150,
                useNativeDriver: true,
            }),
        ]).start();

        // Pulsing animation for "available" state
        if (status === 'available') {
            Animated.loop(
                Animated.sequence([
                    Animated.timing(pulseAnim, {
                        toValue: 1.1,
                        duration: 1000,
                        useNativeDriver: true,
                    }),
                    Animated.timing(pulseAnim, {
                        toValue: 1,
                        duration: 1000,
                        useNativeDriver: true,
                    }),
                ])
            ).start();
        }

        // Shake animation for error state
        if (status === 'error') {
            Animated.sequence([
                Animated.timing(shakeAnim, { toValue: 10, duration: 100, useNativeDriver: true }),
                Animated.timing(shakeAnim, { toValue: -10, duration: 100, useNativeDriver: true }),
                Animated.timing(shakeAnim, { toValue: 10, duration: 100, useNativeDriver: true }),
                Animated.timing(shakeAnim, { toValue: 0, duration: 100, useNativeDriver: true }),
            ]).start();
        }

        // Countdown for success state
        if (status === 'success') {
            const timer = setInterval(() => {
                setCountdown((prev) => {
                    if (prev <= 1) {
                        clearInterval(timer);
                        return 0;
                    }
                    return prev - 1;
                });
            }, 1000);
            return () => clearInterval(timer);
        }
    }, [status]);

    const copyErrorToClipboard = () => {
        const errorText = `
EstateNet Update Error Report
=============================
Error Code: ${errorDetails?.code || 'Unknown'}
Error Message: ${errorDetails?.message || 'No message available'}
Timestamp: ${new Date().toISOString()}

Stack Trace:
${errorDetails?.stack || 'No stack trace available'}
        `.trim();

        Clipboard.setString(errorText);
        Alert.alert('Copied', 'Error details copied to clipboard');
    };

    const getErrorMessage = (code?: string): { title: string; description: string; suggestion: string } => {
        switch (code) {
            case 'ERR_UPDATES_DISABLED':
                return {
                    title: 'Updates Disabled',
                    description: 'Updates are currently disabled in development mode.',
                    suggestion: 'This is expected behavior during development.',
                };
            case 'ERR_UPDATES_FETCH':
                return {
                    title: 'Download Failed',
                    description: 'Unable to download the update.',
                    suggestion: 'Please check your internet connection and try again.',
                };
            case 'MANIFEST_PARSE_ERROR':
                return {
                    title: 'Update Corrupted',
                    description: 'The update package appears to be corrupted.',
                    suggestion: 'Please try again later or contact support.',
                };
            case 'RUNTIME_VERSION_MISMATCH':
                return {
                    title: 'Version Incompatible',
                    description: 'This update requires a newer app version.',
                    suggestion: 'Please update EstateNet from the app store.',
                };
            default:
                return {
                    title: 'Update Failed',
                    description: errorDetails?.message || 'An unexpected error occurred.',
                    suggestion: 'Please try again or contact support if the issue persists.',
                };
        }
    };

    const renderContent = () => {
        switch (status) {
            case 'checking':
                return (
                    <View style={styles.contentContainer}>
                        <ActivityIndicator size="large" color={colors.primary} style={styles.icon} />
                        <Text style={[typography.h2, { color: colors.text, marginTop: spacing.lg }]}>
                            Checking for Updates
                        </Text>
                        <Text style={[typography.body, { color: colors.textSecondary, marginTop: spacing.sm, textAlign: 'center' }]}>
                            Please wait while we check for new updates...
                        </Text>
                    </View>
                );

            case 'available':
                return (
                    <View style={styles.contentContainer}>
                        <Animated.View style={{ transform: [{ scale: pulseAnim }] }}>
                            <Ionicons name="cloud-download-outline" size={80} color={colors.primary} />
                        </Animated.View>
                        <Text style={[typography.h2, { color: colors.text, marginTop: spacing.lg }]}>
                            New Update Available
                        </Text>
                        {updateInfo?.currentVersion && updateInfo?.newVersion && (
                            <Text style={[typography.body, { color: colors.textSecondary, marginTop: spacing.sm }]}>
                                Version {updateInfo.currentVersion} → {updateInfo.newVersion}
                            </Text>
                        )}

                        {updateInfo?.releaseNotes && updateInfo.releaseNotes.length > 0 && (
                            <View style={[styles.releaseNotesContainer, { backgroundColor: colors.surface2, borderRadius: borderRadius.lg, marginTop: spacing.lg }]}>
                                <Text style={[typography.bodySmall, { color: colors.text, fontWeight: '600', marginBottom: spacing.sm }]}>
                                    What's New:
                                </Text>
                                {updateInfo.releaseNotes.map((note, index) => (
                                    <View key={index} style={styles.releaseNoteItem}>
                                        <Text style={[typography.bodySmall, { color: colors.primary }]}>•</Text>
                                        <Text style={[typography.bodySmall, { color: colors.textSecondary, marginLeft: spacing.sm, flex: 1 }]}>
                                            {note}
                                        </Text>
                                    </View>
                                ))}
                            </View>
                        )}

                        <TouchableOpacity
                            style={[styles.primaryButton, { backgroundColor: colors.primary, borderRadius: borderRadius.lg, marginTop: spacing.xl }]}
                            onPress={onUpdateNow}
                        >
                            <Text style={[typography.body, { color: colors.textOnPrimary, fontWeight: '600' }]}>
                                Update Now {updateInfo?.downloadSize && `(${updateInfo.downloadSize})`}
                            </Text>
                        </TouchableOpacity>

                        <TouchableOpacity style={styles.secondaryButton} onPress={onSkipUpdate}>
                            <Text style={[typography.body, { color: colors.textSecondary }]}>
                                Skip for Now
                            </Text>
                        </TouchableOpacity>
                    </View>
                );

            case 'downloading':
                return (
                    <View style={styles.contentContainer}>
                        <ActivityIndicator size="large" color={colors.primary} style={styles.icon} />
                        <Text style={[typography.h2, { color: colors.text, marginTop: spacing.lg }]}>
                            Downloading Update
                        </Text>
                        <Text style={[typography.body, { color: colors.textSecondary, marginTop: spacing.sm }]}>
                            {downloadProgress > 0 ? `${Math.round(downloadProgress)}%` : 'Please wait...'}
                        </Text>
                        {downloadProgress > 0 && (
                            <View style={[styles.progressBar, { backgroundColor: colors.border, borderRadius: borderRadius.full, marginTop: spacing.lg }]}>
                                <View
                                    style={[
                                        styles.progressFill,
                                        { width: `${downloadProgress}%`, backgroundColor: colors.primary, borderRadius: borderRadius.full },
                                    ]}
                                />
                            </View>
                        )}
                    </View>
                );

            case 'ready':
                return (
                    <View style={styles.contentContainer}>
                        <Ionicons name="checkmark-circle" size={80} color={colors.success} />
                        <Text style={[typography.h2, { color: colors.text, marginTop: spacing.lg }]}>
                            Update Ready
                        </Text>
                        <Text style={[typography.body, { color: colors.textSecondary, marginTop: spacing.sm, textAlign: 'center' }]}>
                            The update has been downloaded. The app will restart now.
                        </Text>
                    </View>
                );

            case 'success':
                return (
                    <View style={styles.contentContainer}>
                        <Ionicons name="checkmark-circle" size={80} color={colors.success} />
                        <Text style={[typography.h2, { color: colors.text, marginTop: spacing.lg }]}>
                            Update Complete!
                        </Text>
                        <Text style={[typography.body, { color: colors.textSecondary, marginTop: spacing.sm, textAlign: 'center' }]}>
                            Your app has been updated{updateInfo?.newVersion && ` to version ${updateInfo.newVersion}`}
                        </Text>
                        <Text style={[typography.bodySmall, { color: colors.textTertiary, marginTop: spacing.lg }]}>
                            Restarting in {countdown} seconds...
                        </Text>
                        <TouchableOpacity
                            style={[styles.primaryButton, { backgroundColor: colors.primary, borderRadius: borderRadius.lg, marginTop: spacing.xl }]}
                            onPress={onContinue}
                        >
                            <Text style={[typography.body, { color: colors.textOnPrimary, fontWeight: '600' }]}>
                                Continue Now
                            </Text>
                        </TouchableOpacity>
                    </View>
                );

            case 'error':
                const errorInfo = getErrorMessage(errorDetails?.code);
                return (
                    <Animated.View style={[styles.contentContainer, { transform: [{ translateX: shakeAnim }] }]}>
                        <Ionicons name="alert-circle" size={80} color={colors.error} />
                        <Text style={[typography.h2, { color: colors.text, marginTop: spacing.lg }]}>
                            {errorInfo.title}
                        </Text>
                        <Text style={[typography.body, { color: colors.textSecondary, marginTop: spacing.sm, textAlign: 'center' }]}>
                            {errorInfo.description}
                        </Text>

                        {errorDetails?.code && (
                            <View style={[styles.errorDetailsBox, { backgroundColor: colors.errorLight, borderRadius: borderRadius.lg, marginTop: spacing.lg }]}>
                                <Text style={[typography.bodySmall, { color: colors.error, fontWeight: '600' }]}>
                                    Error Code: {errorDetails.code}
                                </Text>
                                {errorDetails.message && (
                                    <Text style={[typography.bodySmall, { color: colors.textSecondary, marginTop: spacing.xs }]}>
                                        {errorDetails.message}
                                    </Text>
                                )}
                            </View>
                        )}

                        <Text style={[typography.bodySmall, { color: colors.textTertiary, marginTop: spacing.lg, textAlign: 'center' }]}>
                            {errorInfo.suggestion}
                        </Text>

                        <TouchableOpacity
                            style={[styles.primaryButton, { backgroundColor: colors.primary, borderRadius: borderRadius.lg, marginTop: spacing.xl }]}
                            onPress={onRetry}
                        >
                            <Ionicons name="refresh" size={20} color={colors.textOnPrimary} style={{ marginRight: spacing.sm }} />
                            <Text style={[typography.body, { color: colors.textOnPrimary, fontWeight: '600' }]}>
                                Retry Update
                            </Text>
                        </TouchableOpacity>

                        <TouchableOpacity style={styles.secondaryButton} onPress={onContinue}>
                            <Text style={[typography.body, { color: colors.textSecondary }]}>
                                Continue with Current Version
                            </Text>
                        </TouchableOpacity>

                        <TouchableOpacity style={[styles.secondaryButton, { marginTop: spacing.sm }]} onPress={copyErrorToClipboard}>
                            <Ionicons name="copy-outline" size={16} color={colors.textTertiary} style={{ marginRight: spacing.xs }} />
                            <Text style={[typography.bodySmall, { color: colors.textTertiary }]}>
                                Copy Error Details
                            </Text>
                        </TouchableOpacity>
                    </Animated.View>
                );

            case 'current':
                return (
                    <View style={styles.contentContainer}>
                        <Ionicons name="checkmark-circle" size={80} color={colors.success} />
                        <Text style={[typography.h2, { color: colors.text, marginTop: spacing.lg }]}>
                            App is Up to Date
                        </Text>
                        <Text style={[typography.body, { color: colors.textSecondary, marginTop: spacing.sm, textAlign: 'center' }]}>
                            You're running the latest version of EstateNet
                        </Text>
                    </View>
                );

            default:
                return null;
        }
    };

    return (
        <Animated.View
            style={[
                styles.container,
                { backgroundColor: colors.background, opacity: fadeAnim, transform: [{ scale: scaleAnim }] },
            ]}
        >
            <View style={styles.logoContainer}>
                <Text style={[typography.h1, { color: colors.primary, fontWeight: 'bold' }]}>
                    EstateNet
                </Text>
            </View>
            {renderContent()}
        </Animated.View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        paddingHorizontal: 24,
    },
    logoContainer: {
        position: 'absolute',
        top: 80,
        alignItems: 'center',
    },
    contentContainer: {
        alignItems: 'center',
        maxWidth: 400,
        width: '100%',
    },
    icon: {
        marginVertical: 20,
    },
    releaseNotesContainer: {
        padding: 16,
        width: '100%',
    },
    releaseNoteItem: {
        flexDirection: 'row',
        marginBottom: 8,
        alignItems: 'flex-start',
    },
    primaryButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 16,
        paddingHorizontal: 32,
        width: '100%',
    },
    secondaryButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 12,
        marginTop: 16,
    },
    progressBar: {
        width: '100%',
        height: 8,
        overflow: 'hidden',
    },
    progressFill: {
        height: '100%',
    },
    errorDetailsBox: {
        padding: 12,
        width: '100%',
    },
});
