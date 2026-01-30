import React from 'react';
import { View, Text, StyleSheet, Image } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '../../theme/ThemeContext';
import { Button } from '../../components/Button';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';

interface WelcomeScreenProps {
    navigation: any;
}

export const WelcomeScreen: React.FC<WelcomeScreenProps> = ({ navigation }) => {
    const { colors, spacing, typography } = useTheme();

    return (
        <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }}>
            <LinearGradient
                colors={[colors.primary, colors.primaryDark]}
                style={styles.gradient}
            >
                <View style={[styles.container, { padding: spacing['2xl'] }]}>
                    {/* Logo/Brand Area */}
                    <View style={styles.header}>
                        <View style={[styles.logoContainer, { backgroundColor: colors.accent }]}>
                            <Ionicons name="business" size={48} color="#1A1A1A" />
                        </View>
                        <Text
                            style={[
                                typography.h1,
                                {
                                    color: '#FFFFFF',
                                    marginTop: spacing.lg,
                                    textAlign: 'center',
                                },
                            ]}
                        >
                            EstateNet
                        </Text>
                        <Text
                            style={[
                                typography.bodyLarge,
                                {
                                    color: '#FFFFFF',
                                    opacity: 0.9,
                                    marginTop: spacing.md,
                                    textAlign: 'center',
                                },
                            ]}
                        >
                            Professional Property Management for East Africa
                        </Text>
                    </View>

                    {/* Features */}
                    <View style={[styles.features, { marginTop: spacing['3xl'] }]}>
                        <FeatureItem
                            icon="checkmark-circle"
                            text="Clear rent tracking & reminders"
                            spacing={spacing}
                            typography={typography}
                        />
                        <FeatureItem
                            icon="shield-checkmark"
                            text="Transparent payment breakdowns"
                            spacing={spacing}
                            typography={typography}
                        />
                        <FeatureItem
                            icon="people"
                            text="Seamless landlord-tenant communication"
                            spacing={spacing}
                            typography={typography}
                        />
                    </View>

                    {/* CTA Buttons */}
                    <View style={[styles.footer, { marginTop: 'auto' }]}>
                        <Button
                            title="Get Started"
                            onPress={() => navigation.navigate('RoleSelection')}
                            variant="secondary"
                            size="large"
                            style={{ width: '100%' }}
                        />
                        <Button
                            title="Sign In"
                            onPress={() => navigation.navigate('SignIn')}
                            variant="outline"
                            size="large"
                            style={{
                                width: '100%',
                                marginTop: spacing.md,
                                borderColor: '#FFFFFF',
                            }}
                            textStyle={{ color: '#FFFFFF' }}
                        />
                    </View>
                </View>
            </LinearGradient>
        </SafeAreaView>
    );
};

interface FeatureItemProps {
    icon: any;
    text: string;
    spacing: any;
    typography: any;
}

const FeatureItem: React.FC<FeatureItemProps> = ({ icon, text, spacing, typography }) => (
    <View style={[styles.featureItem, { marginBottom: spacing.base }]}>
        <Ionicons name={icon} size={24} color="#FFFFFF" />
        <Text
            style={[
                typography.body,
                {
                    color: '#FFFFFF',
                    marginLeft: spacing.md,
                    flex: 1,
                },
            ]}
        >
            {text}
        </Text>
    </View>
);

const styles = StyleSheet.create({
    gradient: {
        flex: 1,
    },
    container: {
        flex: 1,
    },
    header: {
        alignItems: 'center',
        marginTop: 40,
    },
    logoContainer: {
        width: 100,
        height: 100,
        borderRadius: 50,
        alignItems: 'center',
        justifyContent: 'center',
    },
    features: {
        width: '100%',
    },
    featureItem: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    footer: {
        width: '100%',
        paddingBottom: 20,
    },
});
