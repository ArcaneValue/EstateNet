import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '../theme/ThemeContext';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';

interface ComingSoonScreenProps {
    title: string;
    subtitle?: string;
    showBack?: boolean;
    icon?: string;
}

export const ComingSoonScreen: React.FC<ComingSoonScreenProps> = ({
    title,
    subtitle = "Real data wiring is in progress.",
    showBack = true,
    icon = "construct-outline"
}) => {
    const { colors, spacing, typography } = useTheme();
    const navigation = useNavigation();

    return (
        <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }}>
            <View style={{ padding: spacing.base, flex: 1 }}>
                {/* Header with Back Button */}
                {showBack && (
                    <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: spacing.lg }}>
                        <TouchableOpacity
                            onPress={() => navigation.goBack()}
                            style={{ marginRight: spacing.md }}
                        >
                            <Ionicons name="arrow-back" size={24} color={colors.text} />
                        </TouchableOpacity>
                        <View style={{ flex: 1 }}>
                            <Text style={[typography.h2, { color: colors.text }]}>
                                {title}
                            </Text>
                        </View>
                    </View>
                )}

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
                        <Ionicons name={icon as any} size={60} color={colors.primary} />
                    </View>
                    <Text style={[typography.h3, { color: colors.text, marginBottom: spacing.md }]}>
                        Coming Soon
                    </Text>
                    <Text style={[typography.body, { color: colors.textSecondary, textAlign: 'center', marginBottom: spacing.lg }]}>
                        This feature is under development.
                    </Text>
                    <Text style={[typography.bodySmall, { color: colors.textSecondary, textAlign: 'center' }]}>
                        {subtitle}
                    </Text>
                </View>
            </View>
        </SafeAreaView>
    );
};
