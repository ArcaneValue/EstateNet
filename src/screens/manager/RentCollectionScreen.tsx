import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '../../theme/ThemeContext';
import { Ionicons } from '@expo/vector-icons';

export const RentCollectionScreen: React.FC<any> = ({ navigation }) => {
    const { colors, spacing, typography } = useTheme();

    return (
        <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }}>
            <View style={{ padding: spacing.base, flex: 1 }}>
                {/* Header with Back Button */}
                <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: spacing.lg }}>
                    <TouchableOpacity
                        onPress={() => navigation.goBack()}
                        style={{ marginRight: spacing.md }}
                    >
                        <Ionicons name="arrow-back" size={24} color={colors.text} />
                    </TouchableOpacity>
                    <View style={{ flex: 1 }}>
                        <Text style={[typography.h2, { color: colors.text }]}>
                            Rent Collection
                        </Text>
                        <Text style={[typography.body, { color: colors.textSecondary, marginTop: spacing.sm }]}>
                            Track rent collected by property
                        </Text>
                    </View>
                </View>

                {/* Coming Soon Content */}
                <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
                    <View
                        style={{
                            backgroundColor: colors.primary + '20',
                            width: 120,
                            height: 120,
                            borderRadius: 60,
                            alignItems: 'center',
                            justifyContent: 'center',
                            marginBottom: spacing.lg,
                        }}
                    >
                        <Ionicons name="cash" size={60} color={colors.primary} />
                    </View>
                    <Text style={[typography.h3, { color: colors.text, marginBottom: spacing.md }]}>
                        Coming Soon
                    </Text>
                    <Text style={[typography.body, { color: colors.textSecondary, textAlign: 'center', marginBottom: spacing.lg }]}>
                        This feature is under development.
                    </Text>
                    <Text style={[typography.bodySmall, { color: colors.textSecondary, textAlign: 'center', marginBottom: spacing.xl }]}>
                        Real data wiring is coming next.
                    </Text>

                    {/* Financial Reports Navigation */}
                    <View style={{ width: '100%', paddingHorizontal: spacing.lg }}>
                        <Text style={[typography.h4, { color: colors.text, textAlign: 'center', marginBottom: spacing.md }]}>
                            Financial Reports
                        </Text>

                        <TouchableOpacity
                            onPress={() => navigation.navigate('IncomeStatement')}
                            style={{
                                backgroundColor: colors.surface,
                                padding: spacing.md,
                                borderRadius: 12,
                                marginBottom: spacing.sm,
                                borderWidth: 1,
                                borderColor: colors.border,
                            }}
                        >
                            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                                    <Ionicons name="document-text-outline" size={20} color={colors.primary} style={{ marginRight: spacing.md }} />
                                    <Text style={[typography.body, { color: colors.text }]}>Income Statement</Text>
                                </View>
                                <Ionicons name="chevron-forward" size={16} color={colors.textSecondary} />
                            </View>
                        </TouchableOpacity>

                        <TouchableOpacity
                            onPress={() => navigation.navigate('FinancialPosition')}
                            style={{
                                backgroundColor: colors.surface,
                                padding: spacing.md,
                                borderRadius: 12,
                                marginBottom: spacing.sm,
                                borderWidth: 1,
                                borderColor: colors.border,
                            }}
                        >
                            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                                    <Ionicons name="analytics-outline" size={20} color={colors.primary} style={{ marginRight: spacing.md }} />
                                    <Text style={[typography.body, { color: colors.text }]}>Financial Position</Text>
                                </View>
                                <Ionicons name="chevron-forward" size={16} color={colors.textSecondary} />
                            </View>
                        </TouchableOpacity>

                        <TouchableOpacity
                            onPress={() => navigation.navigate('CashflowStatement')}
                            style={{
                                backgroundColor: colors.surface,
                                padding: spacing.md,
                                borderRadius: 12,
                                marginBottom: spacing.sm,
                                borderWidth: 1,
                                borderColor: colors.border,
                            }}
                        >
                            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                                    <Ionicons name="cash-outline" size={20} color={colors.primary} style={{ marginRight: spacing.md }} />
                                    <Text style={[typography.body, { color: colors.text }]}>Cashflow Statement</Text>
                                </View>
                                <Ionicons name="chevron-forward" size={16} color={colors.textSecondary} />
                            </View>
                        </TouchableOpacity>
                    </View>
                </View>
            </View>
        </SafeAreaView>
    );
};
