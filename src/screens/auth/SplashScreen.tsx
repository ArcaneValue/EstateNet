import React, { useEffect } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '../../theme/ThemeContext';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';

interface SplashScreenProps {
    navigation: any;
}

export const SplashScreen: React.FC<SplashScreenProps> = ({ navigation }) => {
    const { colors, typography } = useTheme();

    useEffect(() => {
        // Navigate to Welcome screen after 2 seconds
        const timer = setTimeout(() => {
            navigation.replace('Welcome');
        }, 2000);

        return () => clearTimeout(timer);
    }, [navigation]);

    return (
        <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }}>
            <LinearGradient
                colors={[colors.primary, colors.primaryDark]}
                style={styles.gradient}
            >
                <View style={styles.container}>
                    {/* Logo */}
                    <View style={[styles.logoContainer, { backgroundColor: colors.accent }]}>
                        <Ionicons name="business" size={64} color="#1A1A1A" />
                    </View>

                    {/* App Name */}
                    <Text
                        style={[
                            typography.h1,
                            {
                                color: '#FFFFFF',
                                fontSize: 36,
                                fontWeight: '700',
                                marginTop: 24,
                            },
                        ]}
                    >
                        EstateNet
                    </Text>

                    {/* Tagline */}
                    <Text
                        style={[
                            typography.body,
                            {
                                color: '#FFFFFF',
                                opacity: 0.9,
                                marginTop: 12,
                                textAlign: 'center',
                            },
                        ]}
                    >
                        Professional Property Management
                    </Text>
                </View>
            </LinearGradient>
        </SafeAreaView>
    );
};

const styles = StyleSheet.create({
    gradient: {
        flex: 1,
    },
    container: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
    },
    logoContainer: {
        width: 120,
        height: 120,
        borderRadius: 60,
        alignItems: 'center',
        justifyContent: 'center',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
        elevation: 8,
    },
});
