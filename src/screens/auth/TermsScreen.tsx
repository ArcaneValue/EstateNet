import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '../../theme/ThemeContext';
import { useAuth, UserRole } from '../../context/AuthContext';
import { Button } from '../../components/Button';
import { Ionicons } from '@expo/vector-icons';

export const TermsScreen: React.FC<any> = ({ navigation, route }) => {
    const { colors, spacing, typography } = useTheme();
    const [accepted, setAccepted] = useState(false);
    const role = route.params?.role || 'manager';

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

    const terms = role === 'manager' ? managerTerms : tenantTerms;

    return (
        <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }}>
            <View style={[styles.container, { padding: spacing.base }]}>
                {/* Header */}
                <View style={[styles.header, { marginBottom: spacing.lg }]}>
                    <Ionicons name="document-text" size={48} color={colors.primary} />
                    <Text style={[typography.h2, { color: colors.text, marginTop: spacing.md }]}>
                        Terms & Conditions
                    </Text>
                    <Text
                        style={[
                            typography.body,
                            { color: colors.textSecondary, textAlign: 'center', marginTop: spacing.sm },
                        ]}
                    >
                        {role === 'manager' ? 'For Property Managers' : 'For Tenants'}
                    </Text>
                </View>

                {/* Terms Content */}
                <ScrollView
                    style={[
                        styles.termsContainer,
                        {
                            backgroundColor: colors.surface,
                            borderRadius: 12,
                            padding: spacing.base,
                            marginBottom: spacing.lg,
                        },
                    ]}
                    showsVerticalScrollIndicator={true}
                >
                    <Text style={[typography.bodySmall, { color: colors.text, lineHeight: 20 }]}>
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
                            onPress={() => navigation.navigate('SignUp')}
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
    container: {
        flex: 1,
    },
    header: {
        alignItems: 'center',
    },
    termsContainer: {
        flex: 1,
        maxHeight: '60%',
    },
    acceptanceContainer: {
        paddingVertical: 8,
    },
});
