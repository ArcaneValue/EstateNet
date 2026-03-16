import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '../../theme/ThemeContext';
import { useAuth, UserRole } from '../../context/AuthContext';
import { Button } from '../../components/Button';
import { BrandColors } from '../../theme/brandColors';
import { Ionicons } from '@expo/vector-icons';

export const TermsScreen: React.FC<any> = ({ navigation, route }) => {
    const { spacing, typography } = useTheme();
    const [accepted, setAccepted] = useState(false);
    const role = route.params?.role || 'manager';

    const ownerTerms = `
1. AGREEMENT TO TERMS
By accessing and using EstateNet as a Property Owner, you agree to be bound by these Terms and Conditions.

2. PROPERTY OWNER RESPONSIBILITIES
2.1. You are responsible for the accuracy of all property information you provide
2.2. You must comply with all local property ownership and rental regulations
2.3. You agree to handle manager and tenant data with appropriate care and confidentiality
2.4. You are responsible for maintaining valid property insurance and licenses

3. MANAGER INVITATIONS
3.1. You may invite property managers to manage your properties
3.2. You retain ultimate authority over all property decisions
3.3. You may revoke manager access at any time
3.4. Managers act on your behalf within the scope of permissions you grant

4. DATA AND PRIVACY
4.1. EstateNet stores property, manager, and tenant information securely
4.2. You grant EstateNet permission to process data for service delivery
4.3. You must obtain proper consent from managers and tenants before adding their information

5. PAYMENT AND FEES
5.1. Service fees will be charged according to your subscription plan
5.2. You are responsible for all property-related financial transactions
5.3. Payment terms must be clearly communicated to managers and tenants

6. LIABILITY
6.1. EstateNet is not liable for disputes between owners and managers/tenants
6.2. You indemnify EstateNet against claims arising from your use of the service
6.3. EstateNet is not responsible for property damage, rental losses, or management disputes

7. TERMINATION
7.1. Either party may terminate this agreement with 30 days notice
7.2. Upon termination, you retain access to your data for 90 days
7.3. Manager and tenant access to your properties ends upon termination

8. GOVERNING LAW
These terms are governed by the laws of Uganda and applicable East African regulations.
`;

    const managerTerms = `
1. AGREEMENT TO TERMS
By accessing and using EstateNet as a Property Manager, you agree to be bound by these Terms and Conditions.

2. PROPERTY MANAGER RESPONSIBILITIES
2.1. You are responsible for the accuracy of all property information you provide
2.2. You must comply with all local property management regulations
2.3. You agree to handle tenant data with appropriate care and confidentiality
2.4. You are responsible for timely rent collection and property maintenance

3. DATA AND PRIVACY
3.1. EstateNet stores property and tenant information securely
3.2. You grant EstateNet permission to process data for service delivery
3.3. You must obtain proper consent from tenants before adding their information

4. PAYMENT AND FEES
4.1. Service fees will be charged according to your subscription plan
4.2. You are responsible for all transaction fees related to rent collection
4.3. Payment terms must be clearly communicated to tenants

5. LIABILITY
5.1. EstateNet is not liable for disputes between managers and tenants
5.2. You indemnify EstateNet against claims arising from your use of the service
5.3. EstateNet is not responsible for property damage or rental losses

6. TERMINATION
6.1. Either party may terminate this agreement with 30 days notice
6.2. Upon termination, you retain access to your data for 90 days

7. GOVERNING LAW
These terms are governed by the laws of Uganda and applicable East African regulations.
`;

    const tenantTerms = `
1. AGREEMENT TO TERMS
By accessing and using EstateNet as a Tenant, you agree to be bound by these Terms and Conditions.

2. TENANT RESPONSIBILITIES
2.1. You agree to provide accurate personal information
2.2. You must pay rent on time as specified in your lease agreement
2.3. You agree to report maintenance issues promptly
2.4. You will use the property responsibly and follow property rules

3. TENANT ID SYSTEM
3.1. You will receive a unique Tenant ID upon registration
3.2. This ID is your identifier across the EstateNet platform
3.3. Property managers will use your ID to link you to properties
3.4. Keep your Tenant ID secure and share only with authorized managers

4. DATA AND PRIVACY
4.1. EstateNet stores your personal information securely
4.2. Your data will be shared with your property manager only
4.3. You have the right to access and correct your information

5. PAYMENTS
5.1. Rent payments made through EstateNet are tracked and recorded
5.2. You are responsible for ensuring timely payment
5.3. Payment confirmation receipts will be provided
5.4. Late payment penalties may apply as per your lease agreement

6. COMMUNICATION
6.1. You agree to receive notifications about rent, maintenance, and property updates
6.2. You can communicate with your property manager through the platform
6.3. Emergency communications should follow property-specific protocols

7. TERMINATION
7.1. You may deactivate your account at any time
7.2. Your rental obligations continue per your lease agreement
7.3. Access to property information ends when tenancy ends

8. GOVERNING LAW
These terms are governed by the laws of Uganda and applicable East African regulations.
`;

    const terms = role === 'owner' ? ownerTerms : role === 'manager' ? managerTerms : tenantTerms;

    return (
        <SafeAreaView style={styles.safeArea}>
            <View style={[styles.container, { padding: spacing.base }]}>
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
                <View style={[styles.header, { marginBottom: spacing.lg }]}>
                    <Text style={[typography.h2, styles.title]}>
                        Terms & Conditions
                    </Text>
                    <View style={styles.roleBadge}>
                        <Text style={styles.roleBadgeText}>
                            {role === 'owner' ? 'Property Owner' : role === 'manager' ? 'Property Manager' : 'Tenant'}
                        </Text>
                    </View>
                </View>

                {/* Terms Content */}
                <ScrollView
                    style={styles.termsContainer}
                    contentContainerStyle={styles.termsContent}
                    showsVerticalScrollIndicator={true}
                >
                    <Text style={styles.termsText}>
                        {terms}
                    </Text>
                </ScrollView>

                {/* Acceptance Section */}
                <View style={styles.acceptanceContainer}>
                    <Button
                        title={accepted ? "✓ Terms Accepted" : "I Accept the Terms & Conditions"}
                        onPress={() => setAccepted(!accepted)}
                        variant={accepted ? "primary" : "outline"}
                        size="large"
                        style={{ marginBottom: spacing.md }}
                    />

                    {accepted && (
                        <Button
                            title="Continue"
                            onPress={() => navigation.navigate('SignUp', { role })}
                            variant="primary"
                            size="large"
                        />
                    )}

                    <Button
                        title="Back"
                        onPress={() => navigation.goBack()}
                        variant="ghost"
                        size="medium"
                        style={{ marginTop: spacing.sm }}
                    />
                </View>
            </View>
        </SafeAreaView>
    );
};

const styles = StyleSheet.create({
    safeArea: {
        flex: 1,
        backgroundColor: BrandColors.premiumBg,
    },
    container: {
        flex: 1,
    },
    logoContainer: {
        alignItems: 'center',
        marginTop: 16,
        marginBottom: 16,
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
        marginTop: 8,
        borderWidth: 1,
        borderColor: BrandColors.orange,
    },
    roleBadgeText: {
        color: BrandColors.orange,
        fontSize: 14,
        fontWeight: '600',
    },
    termsContainer: {
        flex: 1,
        maxHeight: '60%',
        backgroundColor: BrandColors.white,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: BrandColors.lightGray,
    },
    termsContent: {
        padding: 16,
    },
    termsText: {
        color: BrandColors.darkGray,
        fontSize: 14,
        lineHeight: 22,
    },
    acceptanceContainer: {
        paddingVertical: 8,
    },
});
