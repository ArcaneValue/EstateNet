import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '../../theme/ThemeContext';
import { Button } from '../../components/Button';
import { BrandColors } from '../../theme/brandColors';
import { Ionicons } from '@expo/vector-icons';

interface WelcomeScreenProps {
    navigation: any;
}

export const WelcomeScreen: React.FC<WelcomeScreenProps> = ({ navigation }) => {
    const { spacing, typography } = useTheme();

    return (
        <SafeAreaView style={styles.safeArea}>
            <View style={[styles.container, { padding: spacing['2xl'] }]}>
                {/* Logo/Brand Area */}
                <View style={styles.header}>
                    {/* EN Monogram Logo */}
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

                    <Text style={[typography.h1, styles.appName]}>
                        EstateNet
                    </Text>
                    <Text style={[typography.bodyLarge, styles.tagline]}>
                        Manage Smarter
                    </Text>
                </View>

                {/* Features */}
                <View style={[styles.features, { marginTop: spacing['3xl'] }]}>
                    <FeatureItem
                        icon="checkmark-circle"
                        text="Verified rent payments & tracking"
                        spacing={spacing}
                        typography={typography}
                    />
                    <FeatureItem
                        icon="shield-checkmark"
                        text="Secure property management"
                        spacing={spacing}
                        typography={typography}
                    />
                    <FeatureItem
                        icon="people"
                        text="Seamless owner-manager-tenant flow"
                        spacing={spacing}
                        typography={typography}
                    />
                </View>

                {/* CTA Buttons */}
                <View style={[styles.footer, { marginTop: 'auto' }]}>
                    <Button
                        title="Get Started"
                        onPress={() => navigation.navigate('RoleSelection')}
                        variant="primary"
                        size="large"
                        style={styles.primaryButton}
                    />
                    <Button
                        title="Sign In"
                        onPress={() => navigation.navigate('SignIn')}
                        variant="outline"
                        size="large"
                        style={styles.outlineButton}
                    />
                </View>
            </View>
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
    <View style={[styles.featureItem, { marginBottom: spacing.lg }]}>
        <View style={styles.featureIconContainer}>
            <Ionicons name={icon} size={24} color={BrandColors.orange} />
        </View>
        <Text style={[typography.body, styles.featureText]}>
            {text}
        </Text>
    </View>
);

const styles = StyleSheet.create({
    safeArea: {
        flex: 1,
        backgroundColor: BrandColors.premiumBg,
    },
    container: {
        flex: 1,
        backgroundColor: BrandColors.premiumBg,
    },
    header: {
        alignItems: 'center',
        marginTop: 60,
    },
    logoContainer: {
        width: 100,
        height: 100,
        alignItems: 'center',
        justifyContent: 'center',
    },
    logoMark: {
        width: 80,
        height: 80,
        position: 'relative',
    },
    // Letter E
    letterE: {
        position: 'absolute',
        left: 0,
        top: 0,
        width: 36,
        height: 80,
    },
    eVertical: {
        position: 'absolute',
        left: 0,
        top: 0,
        width: 10,
        height: 80,
        backgroundColor: BrandColors.navy,
    },
    eLine: {
        position: 'absolute',
        left: 0,
        height: 10,
        backgroundColor: BrandColors.navy,
    },
    eTop: {
        top: 0,
        width: 36,
    },
    eMiddle: {
        top: 35,
        width: 30,
    },
    eBottom: {
        bottom: 0,
        width: 36,
    },
    // Letter N
    letterN: {
        position: 'absolute',
        right: 0,
        top: 0,
        width: 36,
        height: 80,
    },
    nLeft: {
        position: 'absolute',
        left: 0,
        top: 0,
        width: 10,
        height: 80,
        backgroundColor: BrandColors.navy,
    },
    nRight: {
        position: 'absolute',
        right: 0,
        top: 0,
        width: 10,
        height: 80,
        backgroundColor: BrandColors.navy,
    },
    nDiagonal: {
        position: 'absolute',
        left: 6,
        top: 0,
        width: 12,
        height: 80,
        backgroundColor: BrandColors.navy,
        transform: [{ skewX: '-20deg' }],
    },
    // Orange accent
    orangeAccent: {
        position: 'absolute',
        right: 6,
        top: 16,
        width: 6,
        height: 28,
        backgroundColor: BrandColors.orange,
        transform: [{ rotate: '-25deg' }],
        borderRadius: 2,
    },
    appName: {
        color: BrandColors.navy,
        fontSize: 36,
        fontWeight: '700',
        marginTop: 24,
        letterSpacing: -0.5,
    },
    tagline: {
        color: BrandColors.orange,
        fontSize: 18,
        fontWeight: '600',
        marginTop: 8,
        letterSpacing: 0.3,
    },
    features: {
        width: '100%',
    },
    featureItem: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    featureIconContainer: {
        width: 48,
        height: 48,
        borderRadius: 24,
        backgroundColor: BrandColors.white,
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: 16,
        shadowColor: BrandColors.navy,
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.08,
        shadowRadius: 4,
        elevation: 2,
    },
    featureText: {
        flex: 1,
        color: BrandColors.darkGray,
        fontSize: 16,
        lineHeight: 24,
    },
    footer: {
        width: '100%',
        paddingBottom: 20,
    },
    primaryButton: {
        width: '100%',
        backgroundColor: BrandColors.navy,
        borderRadius: 12,
    },
    outlineButton: {
        width: '100%',
        marginTop: 16,
        borderColor: BrandColors.navy,
        borderWidth: 2,
        borderRadius: 12,
    },
});
