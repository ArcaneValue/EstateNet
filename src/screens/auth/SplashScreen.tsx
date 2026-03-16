import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Animated } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '../../theme/ThemeContext';
import { LinearGradient } from 'expo-linear-gradient';
import { BrandColors } from '../../theme/brandColors';

interface SplashScreenProps {
    navigation: any;
}

export const SplashScreen: React.FC<SplashScreenProps> = ({ navigation }) => {
    const { typography } = useTheme();
    const fadeAnim = useRef(new Animated.Value(0)).current;
    const scaleAnim = useRef(new Animated.Value(0.8)).current;
    const slideAnim = useRef(new Animated.Value(30)).current;

    useEffect(() => {
        // Surprise animation sequence
        Animated.parallel([
            Animated.timing(fadeAnim, {
                toValue: 1,
                duration: 800,
                useNativeDriver: true,
            }),
            Animated.spring(scaleAnim, {
                toValue: 1,
                tension: 50,
                friction: 7,
                useNativeDriver: true,
            }),
            Animated.timing(slideAnim, {
                toValue: 0,
                duration: 600,
                delay: 200,
                useNativeDriver: true,
            }),
        ]).start();

        // Navigate to Welcome screen after 2.5 seconds
        const timer = setTimeout(() => {
            navigation.replace('Welcome');
        }, 2500);

        return () => clearTimeout(timer);
    }, [navigation]);

    return (
        <SafeAreaView style={{ flex: 1, backgroundColor: BrandColors.navyDark }}>
            <LinearGradient
                colors={[BrandColors.navyDark, BrandColors.navy, BrandColors.navyLight]}
                style={styles.gradient}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
            >
                <View style={styles.container}>
                    {/* Animated Logo Container */}
                    <Animated.View
                        style={[
                            styles.logoContainer,
                            {
                                opacity: fadeAnim,
                                transform: [{ scale: scaleAnim }],
                            },
                        ]}
                    >
                        {/* EN Monogram - Simplified representation */}
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
                            {/* Orange accent slash */}
                            <View style={styles.orangeAccent} />
                        </View>
                    </Animated.View>

                    {/* App Name */}
                    <Animated.Text
                        style={[
                            typography.h1,
                            styles.appName,
                            {
                                opacity: fadeAnim,
                                transform: [{ translateY: slideAnim }],
                            },
                        ]}
                    >
                        EstateNet
                    </Animated.Text>

                    {/* Tagline */}
                    <Animated.Text
                        style={[
                            typography.body,
                            styles.tagline,
                            {
                                opacity: fadeAnim,
                                transform: [{ translateY: slideAnim }],
                            },
                        ]}
                    >
                        Manage Smarter
                    </Animated.Text>

                    {/* Subtle loading indicator */}
                    <Animated.View
                        style={[
                            styles.loadingDots,
                            { opacity: fadeAnim },
                        ]}
                    >
                        <View style={[styles.dot, { backgroundColor: BrandColors.orange }]} />
                        <View style={[styles.dot, { backgroundColor: BrandColors.orangeLight }]} />
                        <View style={[styles.dot, { backgroundColor: BrandColors.orange }]} />
                    </Animated.View>
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
        width: 140,
        height: 140,
        alignItems: 'center',
        justifyContent: 'center',
    },
    logoMark: {
        width: 100,
        height: 100,
        position: 'relative',
    },
    // Letter E
    letterE: {
        position: 'absolute',
        left: 0,
        top: 0,
        width: 45,
        height: 100,
    },
    eVertical: {
        position: 'absolute',
        left: 0,
        top: 0,
        width: 12,
        height: 100,
        backgroundColor: BrandColors.white,
    },
    eLine: {
        position: 'absolute',
        left: 0,
        height: 12,
        backgroundColor: BrandColors.white,
    },
    eTop: {
        top: 0,
        width: 45,
    },
    eMiddle: {
        top: 44,
        width: 38,
    },
    eBottom: {
        bottom: 0,
        width: 45,
    },
    // Letter N
    letterN: {
        position: 'absolute',
        right: 0,
        top: 0,
        width: 45,
        height: 100,
    },
    nLeft: {
        position: 'absolute',
        left: 0,
        top: 0,
        width: 12,
        height: 100,
        backgroundColor: BrandColors.white,
    },
    nRight: {
        position: 'absolute',
        right: 0,
        top: 0,
        width: 12,
        height: 100,
        backgroundColor: BrandColors.white,
    },
    nDiagonal: {
        position: 'absolute',
        left: 8,
        top: 0,
        width: 14,
        height: 100,
        backgroundColor: BrandColors.white,
        transform: [{ skewX: '-20deg' }],
    },
    // Orange accent
    orangeAccent: {
        position: 'absolute',
        right: 8,
        top: 20,
        width: 8,
        height: 35,
        backgroundColor: BrandColors.orange,
        transform: [{ rotate: '-25deg' }],
        borderRadius: 2,
    },
    appName: {
        color: BrandColors.white,
        fontSize: 40,
        fontWeight: '700',
        marginTop: 32,
        letterSpacing: -0.5,
    },
    tagline: {
        color: BrandColors.orange,
        fontSize: 18,
        fontWeight: '600',
        marginTop: 8,
        letterSpacing: 0.5,
    },
    loadingDots: {
        flexDirection: 'row',
        marginTop: 40,
        gap: 8,
    },
    dot: {
        width: 8,
        height: 8,
        borderRadius: 4,
    },
});
